import {
  validateFile,
  validateFileType,
  validateFileSize,
  IMAGE_UPLOAD_TYPES,
  FILE_SIZE_LIMITS,
  ALLOWED_EXTENSIONS,
  IMAGE_ERROR_TYPES,
  createValidationResult,
  createImageError
} from '../types/imageUpload';

class ImageValidationService {
  constructor() {
    this.isInitialized = false;
    this.maxFileSize = FILE_SIZE_LIMITS.MAX_SIZE_BYTES;
    this.allowedTypes = Object.values(IMAGE_UPLOAD_TYPES);
    this.allowedExtensions = ALLOWED_EXTENSIONS;
  }

  /**
   * Initialize the service
   */
  initialize() {
    if (this.isInitialized) return;
    
    // Set up any initialization logic here
    this.isInitialized = true;
    console.log('ImageValidationService initialized');
  }

  /**
   * Validate a single image file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    this.initialize();
    return validateFile(file);
  }

  /**
   * Validate file type
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFileType(file) {
    this.initialize();
    
    const result = createValidationResult();
    const isValid = validateFileType(file);
    
    if (!isValid) {
      result.error = `File type ${file.type} is not supported. Allowed types: ${this.allowedTypes.join(', ')}`;
      result.details.type = file.type;
      result.details.allowedTypes = this.allowedTypes;
    } else {
      result.isValid = true;
    }
    
    return result;
  }

  /**
   * Validate file size
   * @param {File} file - File to validate
   * @param {number} maxSize - Optional custom max size in bytes
   * @returns {Object} Validation result
   */
  validateFileSize(file, maxSize = null) {
    this.initialize();
    
    const result = createValidationResult();
    const maxSizeBytes = maxSize || this.maxFileSize;
    const isValid = file.size <= maxSizeBytes;
    
    if (!isValid) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      const maxSizeMB = (maxSizeBytes / 1024 / 1024).toFixed(2);
      result.error = `File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`;
      result.details.size = file.size;
      result.details.maxSize = maxSizeBytes;
    } else {
      result.isValid = true;
    }
    
    return result;
  }

  /**
   * Validate file extension
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFileExtension(file) {
    this.initialize();
    
    const result = createValidationResult();
    const fileName = file.name.toLowerCase();
    const hasValidExtension = this.allowedExtensions.some(ext => 
      fileName.endsWith(ext.toLowerCase())
    );
    
    if (!hasValidExtension) {
      result.error = `File extension not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`;
      result.details.allowedExtensions = this.allowedExtensions;
    } else {
      result.isValid = true;
    }
    
    return result;
  }

  /**
   * Validate multiple files
   * @param {File[]} files - Array of files to validate
   * @returns {Object} Validation results
   */
  validateFiles(files) {
    this.initialize();
    
    const results = {
      valid: [],
      invalid: [],
      errors: []
    };
    
    files.forEach((file, index) => {
      const validation = this.validateFile(file);
      
      if (validation.isValid) {
        results.valid.push(file);
      } else {
        results.invalid.push(file);
        results.errors.push({
          file: file.name,
          index: index,
          error: validation.error,
          details: validation.details
        });
      }
    });
    
    return results;
  }

  /**
   * Check if file is an image by MIME type
   * @param {File} file - File to check
   * @returns {boolean} True if file is an image
   */
  isImageFile(file) {
    this.initialize();
    return file.type.startsWith('image/');
  }

  /**
   * Get supported file types
   * @returns {Object} Supported types and extensions
   */
  getSupportedTypes() {
    this.initialize();
    return {
      mimeTypes: this.allowedTypes,
      extensions: this.allowedExtensions,
      maxSize: this.maxFileSize,
      maxSizeMB: FILE_SIZE_LIMITS.MAX_SIZE_MB
    };
  }

  /**
   * Create detailed error message for validation failures
   * @param {string} errorType - Type of error
   * @param {File} file - File that caused the error
   * @param {Object} details - Additional error details
   * @returns {Object} Detailed error object
   */
  createDetailedError(errorType, file, details = {}) {
    this.initialize();
    
    let message = '';
    switch (errorType) {
      case IMAGE_ERROR_TYPES.FILE_TOO_LARGE:
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        message = `File "${file.name}" is too large (${fileSizeMB}MB). Maximum allowed size is ${FILE_SIZE_LIMITS.MAX_SIZE_MB}MB.`;
        break;
      case IMAGE_ERROR_TYPES.INVALID_FILE_TYPE:
        message = `File "${file.name}" has an unsupported type (${file.type}). Supported types: ${this.allowedTypes.join(', ')}.`;
        break;
      case IMAGE_ERROR_TYPES.VALIDATION_ERROR:
        message = `File "${file.name}" failed validation: ${details.reason || 'Unknown error'}.`;
        break;
      default:
        message = `File "${file.name}" validation failed: ${errorType}.`;
    }
    
    return createImageError(errorType, message, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      ...details
    });
  }

  /**
   * Get validation statistics
   * @param {File[]} files - Files to analyze
   * @returns {Object} Validation statistics
   */
  getValidationStats(files) {
    this.initialize();
    
    const stats = {
      total: files.length,
      valid: 0,
      invalid: 0,
      byType: {},
      bySize: {
        small: 0,    // < 1MB
        medium: 0,   // 1-5MB
        large: 0     // > 5MB
      }
    };
    
    files.forEach(file => {
      const validation = this.validateFile(file);
      
      if (validation.isValid) {
        stats.valid++;
      } else {
        stats.invalid++;
      }
      
      // Count by type
      stats.byType[file.type] = (stats.byType[file.type] || 0) + 1;
      
      // Count by size
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB < 1) {
        stats.bySize.small++;
      } else if (sizeMB < 5) {
        stats.bySize.medium++;
      } else {
        stats.bySize.large++;
      }
    });
    
    return stats;
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      maxFileSize: this.maxFileSize,
      maxFileSizeMB: FILE_SIZE_LIMITS.MAX_SIZE_MB,
      allowedTypes: this.allowedTypes,
      allowedExtensions: this.allowedExtensions
    };
  }
}

// Create singleton instance
const imageValidationService = new ImageValidationService();

export default ImageValidationService;
export { imageValidationService }; 