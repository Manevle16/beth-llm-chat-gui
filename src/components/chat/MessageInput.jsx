import React, { useMemo, useCallback, memo } from "react";
import ImageUploadButton from "./ImageUploadButton";
import ImagePreview from "./ImagePreview";

const MessageInput = memo(({ 
  onSendMessage, 
  onTerminateStream, 
  newMessage, 
  setNewMessage, 
  streaming, 
  currentSessionId,
  // Image upload props
  selectedImages,
  onImageSelect,
  onImageRemove,
  onImageError,
  imageUploadState
}) => {
  // Memoize the onChange handler to prevent re-creation on every render
  const handleChange = useCallback((e) => {
    setNewMessage(e.target.value);
  }, [setNewMessage]);

  // Memoize the onKeyPress handler
  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !streaming) {
      onSendMessage();
    }
  }, [onSendMessage, streaming]);

  // Memoize the button click handler
  const handleButtonClick = useCallback(() => {
    if (streaming) {
      onTerminateStream();
    } else {
      onSendMessage();
    }
  }, [streaming, onTerminateStream, onSendMessage]);

  // Handle clipboard paste events
  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for images
      
      console.log('📋 [MessageInput] Pasting images from clipboard:', imageItems.length);
      
      for (const item of imageItems) {
        try {
          const file = item.getAsFile();
          if (file) {
            console.log('📋 [MessageInput] Processing pasted image:', file.name, file.type, file.size);
            
            // Create a unique filename for the pasted image
            const timestamp = Date.now();
            const extension = file.type.split('/')[1] || 'png';
            const filename = `pasted-image-${timestamp}.${extension}`;
            
            // Ensure we have a proper File object by creating a new one if needed
            let processedFile = file;
            if (!(file instanceof File)) {
              console.log('📋 [MessageInput] Converting clipboard data to proper File object');
              processedFile = new File([file], filename, { 
                type: file.type,
                lastModified: file.lastModified || Date.now()
              });
            }
            
            console.log('📋 [MessageInput] Using processed file:', processedFile.name, processedFile.size, processedFile.type);
            
            // Create image data object similar to what the image upload service expects
            const imageData = {
              id: `pasted_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
              file: processedFile, // Use processed file
              filename: filename,
              size: processedFile.size,
              type: processedFile.type,
              preview: URL.createObjectURL(processedFile)
            };
            
            console.log('📋 [MessageInput] Created image data for pasted image:', imageData);
            console.log('📋 [MessageInput] File object details:', {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              isFile: file instanceof File,
              isBlob: file instanceof Blob
            });
            
            // Add the pasted image to the selected images
            onImageSelect([imageData]);
          }
        } catch (error) {
          console.error('📋 [MessageInput] Error processing pasted image:', error);
          onImageError && onImageError(`Failed to process pasted image: ${error.message}`);
        }
      }
    }
  }, [onImageSelect, onImageError]);

  // Memoize the placeholder text
  const placeholderText = useMemo(() => {
    return streaming ? "Streaming in progress... (you can type your next message)" : "Type your message... (Ctrl+V to paste images)";
  }, [streaming]);

  // Memoize the button text
  const buttonText = useMemo(() => {
    return streaming ? "Stop" : "Send";
  }, [streaming]);

  // Memoize the button styles
  const buttonStyles = useMemo(() => ({
    padding: "12px 24px",
    background: streaming ? "#ef4444" : "#a48fc6",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: streaming && !currentSessionId ? "not-allowed" : "pointer",
    fontSize: "14px",
    fontWeight: "500",
    opacity: streaming && !currentSessionId ? 0.6 : 1,
    boxShadow: streaming ? "0 2px 8px rgba(239, 68, 68, 0.10)" : "0 2px 8px rgba(164, 143, 198, 0.10)",
    transition: "all 0.2s ease"
  }), [streaming, currentSessionId]);

  // Memoize the input styles - removed disabled styling
  const inputStyles = useMemo(() => ({
    flex: 1,
    padding: "12px 16px",
    border: "1.5px solid #a48fc6",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    background: "#404b54", // Always enabled background
    color: "#f8fafc", // Always enabled text color
    cursor: "text" // Always text cursor
  }), []);

  return (
    <div
      style={{
        padding: "16px",
        borderTop: "1px solid #46525c",
        backgroundColor: "#37424a",
        margin: 12,
        border: "1px solid #46525c",
        borderRadius: "12px"
      }}
    >
      {/* Image Preview Section */}
      {selectedImages && selectedImages.length > 0 && (
        <div
          style={{
            marginBottom: "12px",
            padding: "12px",
            background: "#404b54",
            borderRadius: "8px",
            border: "1px solid #46525c"
          }}
        >
          <ImagePreview
            images={selectedImages}
            onRemove={onImageRemove}
            onError={onImageError}
            uploadState={imageUploadState}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "12px",
          maxWidth: "800px",
          margin: "0 auto",
          alignItems: "flex-end"
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
          placeholder={placeholderText}
          style={inputStyles}
        />
        
        {/* Image Upload Button */}
        <ImageUploadButton
          onImageSelect={onImageSelect}
          disabled={streaming}
          uploadState={imageUploadState}
        />
        
        <button
          onClick={handleButtonClick}
          disabled={streaming && !currentSessionId}
          style={buttonStyles}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;
