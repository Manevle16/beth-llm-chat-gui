/**
 * Image upload types and interfaces
 */

// Supported image file types
export const IMAGE_UPLOAD_TYPES = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp'
};

// Allowed file extensions
export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_PREVIEW_SIZE: 300 * 1024 // 300KB for preview
};

// Image preview dimensions
export const IMAGE_PREVIEW_DIMENSIONS = {
  MAX_HEIGHT: 300,
  MAX_WIDTH: 200,
  THUMBNAIL_HEIGHT: 100,
  THUMBNAIL_WIDTH: 100
};

// Upload states
export const UPLOAD_STATES = {
  IDLE: 'idle',
  SELECTING: 'selecting',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
  VALIDATING: 'validating'
};

// Error types for image upload
export const IMAGE_ERROR_TYPES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  HASH_GENERATION_ERROR: 'HASH_GENERATION_ERROR',
  IMAGE_LOAD_ERROR: 'IMAGE_LOAD_ERROR'
};

// Action types for image upload state management
export const IMAGE_UPLOAD_ACTIONS = {
  SELECT_IMAGES: 'SELECT_IMAGES',
  REMOVE_IMAGE: 'REMOVE_IMAGE',
  CLEAR_IMAGES: 'CLEAR_IMAGES',
  SET_UPLOAD_STATE: 'SET_UPLOAD_STATE',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_UPLOAD_PROGRESS: 'SET_UPLOAD_PROGRESS',
  ADD_IMAGE_HASH: 'ADD_IMAGE_HASH'
};

// Image data interface
export const createImageData = (file, id = null) => ({
  id: id || crypto.randomUUID(),
  file: file,
  hash: null, // Will be generated when needed
  preview: null, // Will be generated when needed
  name: file.name,
  size: file.size,
  type: file.type,
  uploadedAt: new Date(),
  error: null,
  isLoaded: false
});

// Upload response interface
export const createUploadResponse = () => ({
  success: false,
  messageId: null,
  imageHashes: [],
  error: null,
  responseTime: null,
  timestamp: new Date()
});

// Validation result interface
export const createValidationResult = () => ({
  isValid: false,
  error: null,
  details: {
    size: 0,
    type: '',
    maxSize: FILE_SIZE_LIMITS.MAX_SIZE_BYTES,
    allowedTypes: Object.values(IMAGE_UPLOAD_TYPES)
  }
});

// Image upload state interface
export const createImageUploadState = () => ({
  selectedImages: [],
  uploadState: UPLOAD_STATES.IDLE,
  uploadProgress: 0,
  error: null,
  lastUploadTime: null,
  imageCache: new Map(), // hash -> preview URL
  uploadQueue: []
});

// Message with images interface (extends existing Message)
export const createMessageWithImages = (message = {}) => ({
  ...message,
  images: [],
  imageHashes: [],
  hasImages: false,
  imageLoadStates: {} // hash -> loading state
});

// Image display data interface
export const createImageDisplayData = (hash, url = null) => ({
  hash: hash,
  url: url,
  isLoaded: false,
  error: null,
  retryCount: 0,
  lastAttempt: null
});

// Configuration interface
export const createImageUploadConfig = () => ({
  enabled: true,
  maxFileSize: FILE_SIZE_LIMITS.MAX_SIZE_BYTES,
  allowedTypes: Object.values(IMAGE_UPLOAD_TYPES),
  maxImagesPerMessage: 5,
  previewMaxHeight: IMAGE_PREVIEW_DIMENSIONS.MAX_HEIGHT,
  previewMaxWidth: IMAGE_PREVIEW_DIMENSIONS.MAX_WIDTH,
  thumbnailHeight: IMAGE_PREVIEW_DIMENSIONS.THUMBNAIL_HEIGHT,
  thumbnailWidth: IMAGE_PREVIEW_DIMENSIONS.THUMBNAIL_WIDTH,
  retryAttempts: 3,
  retryDelay: 1000
});

// Error creation utility
export const createImageError = (type, message, details = null) => ({
  type: type,
  message: message,
  details: details,
  timestamp: new Date()
});

// Validation utilities
export const validateFileType = (file) => {
  const allowedTypes = Object.values(IMAGE_UPLOAD_TYPES);
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file) => {
  return file.size <= FILE_SIZE_LIMITS.MAX_SIZE_BYTES;
};

export const validateFile = (file) => {
  const result = createValidationResult();
  
  if (!validateFileType(file)) {
    result.error = `File type ${file.type} is not supported. Allowed types: ${Object.values(IMAGE_UPLOAD_TYPES).join(', ')}`;
    result.details.type = file.type;
    return result;
  }
  
  if (!validateFileSize(file)) {
    result.error = `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${FILE_SIZE_LIMITS.MAX_SIZE_MB}MB`;
    result.details.size = file.size;
    return result;
  }
  
  result.isValid = true;
  return result;
};

// Hash generation utility
export const generateImageHash = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    throw new Error(`Failed to generate hash: ${error.message}`);
  }
};

// Preview generation utility
export const generateImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to generate preview'));
    reader.readAsDataURL(file);
  });
};

// URL construction utility
export const constructImageUrl = (hash, baseUrl = '/api/images') => {
  return `${baseUrl}/${hash}`;
};

// Default export for convenience
export default {
  IMAGE_UPLOAD_TYPES,
  ALLOWED_EXTENSIONS,
  FILE_SIZE_LIMITS,
  IMAGE_PREVIEW_DIMENSIONS,
  UPLOAD_STATES,
  IMAGE_ERROR_TYPES,
  IMAGE_UPLOAD_ACTIONS,
  createImageData,
  createUploadResponse,
  createValidationResult,
  createImageUploadState,
  createMessageWithImages,
  createImageDisplayData,
  createImageUploadConfig,
  createImageError,
  validateFile,
  generateImageHash,
  generateImagePreview,
  constructImageUrl
}; 