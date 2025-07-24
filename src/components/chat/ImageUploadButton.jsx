import React, { useCallback, useMemo, useRef, memo } from "react";
import { FaPlus, FaImage } from "react-icons/fa";
import { IMAGE_UPLOAD_TYPES, ALLOWED_EXTENSIONS } from "../../types/imageUpload";

const ImageUploadButton = memo(({ 
  onImageSelect, 
  disabled = false, 
  multiple = true, 
  acceptedTypes = Object.values(IMAGE_UPLOAD_TYPES),
  maxSize = 10 * 1024 * 1024, // 10MB default
  className = "",
  style = {}
}) => {
  const fileInputRef = useRef(null);

  // Memoize the button styles
  const buttonStyles = useMemo(() => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    background: disabled ? "#46525c" : "#a48fc6",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    opacity: disabled ? 0.6 : 1,
    boxShadow: "0 2px 8px rgba(164, 143, 198, 0.10)",
    transition: "all 0.2s ease",
    ...style
  }), [disabled, style]);

  // Memoize the file input styles
  const fileInputStyles = useMemo(() => ({
    display: "none"
  }), []);

  // Handle button click
  const handleButtonClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Handle file selection
  const handleFileSelect = useCallback((event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onImageSelect(files);
    }
    
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onImageSelect]);

  // Create accepted file types string
  const acceptedTypesString = useMemo(() => {
    return acceptedTypes.join(",");
  }, [acceptedTypes]);

  // Create accepted extensions string
  const acceptedExtensionsString = useMemo(() => {
    return ALLOWED_EXTENSIONS.join(",");
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        style={buttonStyles}
        className={className}
        title={disabled ? "Image upload disabled" : "Upload images"}
        aria-label="Upload images"
      >
        <FaPlus size={14} />
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={acceptedTypesString}
        onChange={handleFileSelect}
        style={fileInputStyles}
        aria-label="Select image files"
        data-testid="image-upload-input"
      />
    </div>
  );
});

ImageUploadButton.displayName = 'ImageUploadButton';

export default ImageUploadButton; 