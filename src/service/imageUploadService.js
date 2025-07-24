import {
  createImageData,
  createUploadResponse,
  createValidationResult,
  validateFile,
  generateImageHash,
  generateImagePreview,
  constructImageUrl,
  IMAGE_ERROR_TYPES,
  FILE_SIZE_LIMITS
} from '../types/imageUpload';

class ImageUploadService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3443';
    this.streamMessageEndpoint = '/api/stream-message';
    this.imageServeEndpoint = '/api/images';
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   */
  initialize() {
    if (this.isInitialized) return;
    
    // Set up any initialization logic here
    this.isInitialized = true;
    console.log('ImageUploadService initialized');
  }

  /**
   * Upload images with message to the stream message API
   * @param {File[]} files - Array of image files
   * @param {string} conversationId - Conversation ID
   * @param {string} message - Text message
   * @param {string} model - LLM model name
   * @returns {Promise<Object>} Upload response
   */
  async uploadImages(files, conversationId, message, model) {
    try {
      this.initialize();
      
      const response = createUploadResponse();
      const startTime = Date.now();

      // Validate all files first
      const validationResults = files.map(file => validateFile(file));
      const invalidFiles = validationResults.filter(result => !result.isValid);
      
      if (invalidFiles.length > 0) {
        response.error = invalidFiles[0].error;
        return response;
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('message', message);
      formData.append('model', model);
      
      // Add all image files
      files.forEach((file, index) => {
        formData.append('images', file);
      });

      // Make the upload request
      const uploadResponse = await fetch(`${this.baseUrl}${this.streamMessageEndpoint}`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
      }

      // Handle SSE response
      const reader = uploadResponse.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      let imageHashes = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle different response types
              if (data.type === 'message') {
                responseText += data.content || '';
              } else if (data.type === 'image_hashes') {
                imageHashes = data.hashes || [];
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Upload error');
              } else if (data.type === 'complete') {
                // Upload completed successfully
                response.success = true;
                response.messageId = data.messageId;
                response.imageHashes = imageHashes;
                response.responseTime = Date.now() - startTime;
                return response;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      // If we get here, the upload completed but didn't get a complete event
      response.success = true;
      response.imageHashes = imageHashes;
      response.responseTime = Date.now() - startTime;
      return response;

    } catch (error) {
      console.error('Image upload error:', error);
      const response = createUploadResponse();
      response.error = error.message;
      return response;
    }
  }

  /**
   * Upload with streaming support and callbacks
   * @param {FormData} formData - Form data containing message and images
   * @param {Object} options - Upload options with callbacks
   * @param {Function} options.onProgress - Progress callback
   * @param {Function} options.onError - Error callback
   * @returns {Promise<Object>} Stream response
   */
  async uploadWithStream(formData, options = {}) {
    const { onProgress, onError } = options || {};
    
    try {
      this.initialize();
      
      const startTime = Date.now();

      // Make the upload request
      const uploadResponse = await fetch(`${this.baseUrl}${this.streamMessageEndpoint}`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        const error = new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
        if (onError) onError(error);
        throw error;
      }

      // Handle SSE response
      const reader = uploadResponse.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      let imageHashes = [];
      let progress = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle different response types
              if (data.type === 'message') {
                responseText += data.content || '';
                // Update progress for message streaming
                progress = Math.min(progress + 10, 90);
                if (onProgress) onProgress(progress);
              } else if (data.type === 'image_hashes') {
                imageHashes = data.hashes || [];
              } else if (data.type === 'upload_progress') {
                progress = data.progress || progress;
                if (onProgress) onProgress(progress);
              } else if (data.type === 'error') {
                const error = new Error(data.message || 'Upload error');
                if (onError) onError(error);
                throw error;
              } else if (data.type === 'complete') {
                // Upload completed successfully
                if (onProgress) onProgress(100);
                return {
                  success: true,
                  messageId: data.messageId,
                  imageHashes: imageHashes,
                  responseText: responseText,
                  responseTime: Date.now() - startTime
                };
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      // If we get here, the upload completed but didn't get a complete event
      if (onProgress) onProgress(100);
      return {
        success: true,
        imageHashes: imageHashes,
        responseText: responseText,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Stream upload error:', error);
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * Fetch an image by its hash
   * @param {string} hash - Image hash
   * @returns {Promise<Blob>} Image blob
   */
  async fetchImage(hash) {
    try {
      this.initialize();
      
      const imageUrl = constructImageUrl(hash, `${this.baseUrl}${this.imageServeEndpoint}`);
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Image fetch error:', error);
      throw error;
    }
  }

  /**
   * Validate a single image file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateImage(file) {
    return validateFile(file);
  }

  /**
   * Generate hash for an image file
   * @param {File} file - File to hash
   * @returns {Promise<string>} SHA-256 hash
   */
  async generateHash(file) {
    try {
      return await generateImageHash(file);
    } catch (error) {
      console.error('Hash generation error:', error);
      throw error;
    }
  }

  /**
   * Generate preview URL for an image file
   * @param {File} file - File to generate preview for
   * @returns {Promise<string>} Data URL
   */
  async generatePreview(file) {
    try {
      return await generateImagePreview(file);
    } catch (error) {
      console.error('Preview generation error:', error);
      throw error;
    }
  }

  /**
   * Construct image URL from hash
   * @param {string} hash - Image hash
   * @returns {string} Full image URL
   */
  constructImageUrl(hash) {
    return constructImageUrl(hash, `${this.baseUrl}${this.imageServeEndpoint}`);
  }

  /**
   * Get service status and configuration
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      baseUrl: this.baseUrl,
      streamMessageEndpoint: this.streamMessageEndpoint,
      imageServeEndpoint: this.imageServeEndpoint,
      maxFileSize: FILE_SIZE_LIMITS.MAX_SIZE_BYTES,
      maxFileSizeMB: FILE_SIZE_LIMITS.MAX_SIZE_MB
    };
  }

  /**
   * Clear any cached data
   */
  clearCache() {
    // Clear any cached data if needed
    console.log('ImageUploadService cache cleared');
  }
}

// Create singleton instance
const imageUploadService = new ImageUploadService();

export default ImageUploadService;
export { imageUploadService }; 