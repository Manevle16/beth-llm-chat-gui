import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createImageData,
  createImageUploadState,
  UPLOAD_STATES,
  IMAGE_ERROR_TYPES,
  IMAGE_UPLOAD_ACTIONS,
  createImageError
} from '../types/imageUpload';
import { imageUploadService, imageHashService, imageValidationService, graphQLService } from '../service';

/**
 * Custom hook for image upload state management and operations
 * Handles image selection, validation, upload, and state management
 */
export const useImageUpload = () => {
  // Main state
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadState, setUploadState] = useState(UPLOAD_STATES.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [lastUploadTime, setLastUploadTime] = useState(null);
  
  // Refs for tracking
  const uploadAbortController = useRef(null);
  const imageCache = useRef(new Map()); // hash -> preview URL
  const uploadQueue = useRef([]);

  /**
   * Select images from file input
   * @param {FileList|File[]} files - Files to select
   */
  const selectImages = useCallback(async (files) => {
    try {
      setUploadError(null);
      setUploadState(UPLOAD_STATES.VALIDATING);

      // Convert FileList to array if needed
      const fileArray = Array.from(files || []);
      
      if (fileArray.length === 0) {
        setUploadState(UPLOAD_STATES.IDLE);
        return;
      }

      // Validate all files
      const validationResults = imageValidationService.validateFiles(fileArray);
      
      if (validationResults.invalid.length > 0) {
        const error = validationResults.errors[0];
        setUploadError(error.error);
        setUploadState(UPLOAD_STATES.ERROR);
        return;
      }

      // Create image data objects
      const newImageData = await Promise.all(
        validationResults.valid.map(async (file) => {
          const imageData = createImageData(file);
          
          try {
            // Generate preview
            imageData.preview = await imageUploadService.generatePreview(file);
            
            // Generate hash
            imageData.hash = await imageHashService.generateHash(file);
            
            // Cache the preview
            imageCache.current.set(imageData.hash, imageData.preview);
            
            return imageData;
          } catch (error) {
            console.error('Error processing image:', error);
            imageData.error = error.message;
            return imageData;
          }
        })
      );

      // Filter out images with errors
      const validImages = newImageData.filter(img => !img.error);
      const errorImages = newImageData.filter(img => img.error);

      if (errorImages.length > 0) {
        setUploadError(`Failed to process ${errorImages.length} image(s): ${errorImages[0].error}`);
      }

      setSelectedImages(prev => [...prev, ...validImages]);
      setUploadState(UPLOAD_STATES.IDLE);

    } catch (error) {
      console.error('Error selecting images:', error);
      setUploadError(error.message);
      setUploadState(UPLOAD_STATES.ERROR);
    }
  }, []);

  /**
   * Remove an image from selection
   * @param {number} index - Index of image to remove
   */
  const removeImage = useCallback((index) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      const removedImage = newImages.splice(index, 1)[0];
      
      // Clean up cache if image had a hash
      if (removedImage.hash && imageCache.current.has(removedImage.hash)) {
        imageCache.current.delete(removedImage.hash);
      }
      
      return newImages;
    });
    
    setUploadError(null);
  }, []);

  /**
   * Clear all selected images
   */
  const clearImages = useCallback(() => {
    setSelectedImages([]);
    setUploadError(null);
    setUploadState(UPLOAD_STATES.IDLE);
    setUploadProgress(0);
    
    // Clear cache
    imageCache.current.clear();
  }, []);

  /**
   * Upload images with message
   * @param {string} conversationId - Conversation ID
   * @param {string} message - Text message
   * @param {string} model - LLM model name
   * @returns {Promise<Object>} Upload result
   */
  const uploadImages = useCallback(async (conversationId, message, model) => {
    if (selectedImages.length === 0) {
      throw new Error('No images selected for upload');
    }

    try {
      setUploadError(null);
      setUploadState(UPLOAD_STATES.UPLOADING);
      setUploadProgress(0);

      // Create abort controller for cancellation
      uploadAbortController.current = new AbortController();

      // Extract files from image data
      const files = selectedImages.map(img => img.file);

      // Start upload
      const response = await imageUploadService.uploadImages(
        files, 
        conversationId, 
        message, 
        model
      );

      if (response.success) {
        setUploadState(UPLOAD_STATES.SUCCESS);
        setUploadProgress(100);
        setLastUploadTime(new Date());
        
        // Clear images after successful upload
        clearImages();
        
        return {
          success: true,
          messageId: response.messageId,
          imageHashes: response.imageHashes,
          responseTime: response.responseTime
        };
      } else {
        throw new Error(response.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.name === 'AbortError') {
        setUploadError('Upload was cancelled');
      } else {
        setUploadError(error.message);
      }
      
      setUploadState(UPLOAD_STATES.ERROR);
      setUploadProgress(0);
      
      return {
        success: false,
        error: error.message
      };
    }
  }, [selectedImages, clearImages]);

  /**
   * Cancel current upload
   */
  const cancelUpload = useCallback(() => {
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
      uploadAbortController.current = null;
    }
    
    setUploadState(UPLOAD_STATES.IDLE);
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  /**
   * Retry failed upload
   * @param {string} conversationId - Conversation ID
   * @param {string} message - Text message
   * @param {string} model - LLM model name
   */
  const retryUpload = useCallback(async (conversationId, message, model) => {
    if (uploadState !== UPLOAD_STATES.ERROR) {
      return;
    }
    
    return await uploadImages(conversationId, message, model);
  }, [uploadState, uploadImages]);

  /**
   * Get cached image preview
   * @param {string} hash - Image hash
   * @returns {string|null} Preview URL or null
   */
  const getCachedPreview = useCallback((hash) => {
    return imageCache.current.get(hash) || null;
  }, []);

  /**
   * Add image to cache
   * @param {string} hash - Image hash
   * @param {string} previewUrl - Preview URL
   */
  const cacheImagePreview = useCallback((hash, previewUrl) => {
    imageCache.current.set(hash, previewUrl);
  }, []);

  /**
   * Clear image cache
   */
  const clearImageCache = useCallback(() => {
    imageCache.current.clear();
  }, []);

  /**
   * Get upload statistics
   * @returns {Object} Upload statistics
   */
  const getUploadStats = useCallback(() => {
    return {
      selectedCount: selectedImages.length,
      totalSize: selectedImages.reduce((sum, img) => sum + img.size, 0),
      averageSize: selectedImages.length > 0 
        ? selectedImages.reduce((sum, img) => sum + img.size, 0) / selectedImages.length 
        : 0,
      lastUploadTime,
      uploadState,
      uploadProgress,
      hasError: !!uploadError
    };
  }, [selectedImages, lastUploadTime, uploadState, uploadProgress, uploadError]);

  /**
   * Check if upload is in progress
   * @returns {boolean} True if uploading
   */
  const isUploading = useCallback(() => {
    return uploadState === UPLOAD_STATES.UPLOADING;
  }, [uploadState]);

  /**
   * Check if upload can be performed
   * @returns {boolean} True if upload is possible
   */
  const canUpload = useCallback(() => {
    return selectedImages.length > 0 && 
           uploadState !== UPLOAD_STATES.UPLOADING && 
           uploadState !== UPLOAD_STATES.VALIDATING;
  }, [selectedImages.length, uploadState]);

  /**
   * Send message with images using GraphQL service
   * @param {string} conversationId - Conversation ID
   * @param {string} text - Message text
   * @param {string} llmModel - LLM model to use
   * @param {string} password - Optional password
   * @returns {Promise} Stream response
   */
  const sendMessageWithImages = useCallback(async (conversationId, text, llmModel = null, password = null) => {
    try {
      setUploadState(UPLOAD_STATES.UPLOADING);
      setUploadError(null);

      // Capture current selectedImages to avoid stale closure
      const currentSelectedImages = selectedImages;

      // Use the GraphQL service to send message with images
      const response = await graphQLService.streamMessageWithImages(
        conversationId,
        text,
        currentSelectedImages,
        llmModel,
        password
      );

      // Clear images after successful send
      clearImages();
      setUploadState(UPLOAD_STATES.IDLE);
      setLastUploadTime(new Date().toISOString());

      return response;

    } catch (error) {
      console.error('Error sending message with images:', error);
      setUploadError(error.message);
      setUploadState(UPLOAD_STATES.ERROR);
      throw error;
    }
  }, [selectedImages, clearImages]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cancel any ongoing upload
      if (uploadAbortController.current) {
        uploadAbortController.current.abort();
      }
      
      // Clear cache
      imageCache.current.clear();
    };
  }, []);

  return {
    // State
    selectedImages,
    uploadState,
    uploadProgress,
    uploadError,
    lastUploadTime,
    
    // Actions
    selectImages,
    removeImage,
    clearImages,
    uploadImages,
    cancelUpload,
    retryUpload,
    sendMessageWithImages,
    
    // Cache management
    getCachedPreview,
    cacheImagePreview,
    clearImageCache,
    
    // Utilities
    getUploadStats,
    isUploading,
    canUpload,
    
    // Constants
    UPLOAD_STATES,
    IMAGE_ERROR_TYPES
  };
}; 