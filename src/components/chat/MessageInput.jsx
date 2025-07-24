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

  // Memoize the placeholder text
  const placeholderText = useMemo(() => {
    return streaming ? "Streaming in progress... (you can type your next message)" : "Type your message...";
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
