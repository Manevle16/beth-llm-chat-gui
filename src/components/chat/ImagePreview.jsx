import React, { useCallback, useMemo, memo } from "react";
import { FaTimes, FaExclamationTriangle, FaImage } from "react-icons/fa";
import { IMAGE_PREVIEW_DIMENSIONS } from "../../types/imageUpload";

const ImagePreview = memo(({ 
  images = [], 
  onRemove, 
  maxHeight = IMAGE_PREVIEW_DIMENSIONS.MAX_HEIGHT,
  maxWidth = IMAGE_PREVIEW_DIMENSIONS.MAX_WIDTH,
  className = "",
  style = {}
}) => {
  // Memoize the container styles
  const containerStyles = useMemo(() => ({
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "8px 0",
    minHeight: images.length > 0 ? "auto" : "0",
    ...style
  }), [images.length, style]);

  // Memoize the image wrapper styles
  const imageWrapperStyles = useMemo(() => ({
    position: "relative",
    display: "inline-block",
    borderRadius: "8px",
    overflow: "hidden",
    border: "2px solid #46525c",
    background: "#404b54"
  }), []);

  // Memoize the image styles
  const imageStyles = useMemo(() => ({
    display: "block",
    maxHeight: `${maxHeight}px`,
    maxWidth: `${maxWidth}px`,
    width: "auto",
    height: "auto",
    objectFit: "cover"
  }), [maxHeight, maxWidth]);

  // Memoize the remove button styles
  const removeButtonStyles = useMemo(() => ({
    position: "absolute",
    top: "4px",
    right: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    background: "rgba(239, 68, 68, 0.9)",
    color: "#ffffff",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "10px",
    zIndex: 10,
    transition: "all 0.2s ease"
  }), []);

  // Memoize the error placeholder styles
  const errorPlaceholderStyles = useMemo(() => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: `${maxWidth}px`,
    height: `${maxHeight}px`,
    background: "#404b54",
    color: "#e5e7eb",
    fontSize: "12px",
    textAlign: "center",
    padding: "8px"
  }), [maxWidth, maxHeight]);

  // Handle image remove
  const handleRemove = useCallback((index) => {
    if (onRemove) {
      onRemove(index);
    }
  }, [onRemove]);

  // Handle image error
  const handleImageError = useCallback((event) => {
    event.target.style.display = "none";
    const errorElement = event.target.nextSibling;
    if (errorElement) {
      errorElement.style.display = "flex";
    }
  }, []);

  // Render individual image preview
  const renderImagePreview = useCallback((image, index) => {
    const hasError = image.error || !image.preview;
    
    return (
      <div key={image.id || index} style={imageWrapperStyles}>
        {!hasError ? (
          <>
            <img
              src={image.preview}
              alt={image.name}
              style={imageStyles}
              onError={handleImageError}
              data-testid={`image-preview-${index}`}
            />
            <div style={{ ...errorPlaceholderStyles, display: "none" }}>
              <FaExclamationTriangle size={16} />
              <span style={{ marginTop: "4px" }}>Failed to load</span>
            </div>
          </>
        ) : (
          <div style={errorPlaceholderStyles}>
            <FaExclamationTriangle size={16} />
            <span style={{ marginTop: "4px" }}>
              {image.error || "Failed to load"}
            </span>
          </div>
        )}
        
        <button
          type="button"
          onClick={() => handleRemove(index)}
          style={removeButtonStyles}
          title="Remove image"
          aria-label={`Remove ${image.name}`}
          data-testid={`remove-image-${index}`}
        >
          <FaTimes size={8} />
        </button>
      </div>
    );
  }, [imageWrapperStyles, imageStyles, errorPlaceholderStyles, handleImageError, handleRemove]);

  // Don't render anything if no images
  if (images.length === 0) {
    return null;
  }

  return (
    <div style={containerStyles} className={className} data-testid="image-preview-container">
      {images.map((image, index) => renderImagePreview(image, index))}
    </div>
  );
});

ImagePreview.displayName = 'ImagePreview';

export default ImagePreview; 