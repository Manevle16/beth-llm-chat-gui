import React from "react";
import { FaTrash, FaTimes } from "react-icons/fa";
import Markdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'

// Helper for timestamp formatting (copy from main file or import if shared)
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "No time";
  let date;
  if (typeof timestamp === "number" || /^\d+$/.test(timestamp)) {
    date = new Date(Number(timestamp));
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date.getTime())) return "Invalid time";
  return date.toLocaleString();
};

// Helper to render images in messages
const renderImages = (images, isUserMessage = false, onImageClick) => {
  if (!images || images.length === 0) return null;

  console.log('🖼️ [MessageBubble] Rendering images:', images);
  console.log('🖼️ [MessageBubble] Is user message:', isUserMessage);

  return (
    <div
      style={{
        marginBottom: "12px",
        display: "flex",
        flexWrap: "wrap",
        gap: "8px"
      }}
    >
      {images.map((image, index) => {
        console.log('🖼️ [MessageBubble] Rendering image:', image);
        return (
          <div
            key={image.id || index}
            style={{
              position: "relative",
              borderRadius: "8px",
              overflow: "hidden",
              border: "2px solid #46525c",
              background: "#404b54",
              cursor: "pointer",
              transition: "transform 0.2s ease-in-out"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
            }}
            onClick={() => onImageClick(image)}
          >
            {image.url ? (
              <img
                src={image.url}
                alt={image.filename || `Image ${index + 1}`}
                style={{
                  maxWidth: "400px",
                  maxHeight: "400px",
                  width: "auto",
                  height: "auto",
                  display: "block",
                  objectFit: "cover"
                }}
                onLoad={() => console.log('🖼️ [MessageBubble] Image loaded successfully:', image.url)}
                onError={(e) => {
                  console.error('🖼️ [MessageBubble] Failed to load image:', image.url, e);
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
          
          {/* Fallback for failed images */}
          <div
            style={{
              display: image.url ? "none" : "flex",
              width: "200px",
              height: "200px",
              alignItems: "center",
              justifyContent: "center",
              background: "#404b54",
              color: "#e5e7eb",
              fontSize: "12px",
              textAlign: "center",
              padding: "8px"
            }}
          >
            <div>
              <div style={{ marginBottom: "4px" }}>📷</div>
              <div>{image.filename || "Image"}</div>
              <div style={{ fontSize: "10px", opacity: 0.7 }}>
                {image.error || "Failed to load"}
              </div>
            </div>
          </div>
          
        </div>
      )})}
    </div>
  );
};

const MessageBubble = ({ 
  msg, 
  selectedConversation, 
  deleteMessagesAfter, 
  loadMessages, 
  setError
}) => {
  const [previewImage, setPreviewImage] = React.useState(null);

  const handleImageClick = (image) => {
    setPreviewImage(image);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  return (
    <>
      <div
        style={{
          marginBottom: "24px",
          padding: "16px",
          background: msg.sender === "user" ? "#323a41" : "#3a424a",
          borderRadius: "12px",
          border: msg.sender === "user" ? "1.5px solid #a48fc6" : "1.5px solid #46525c",
          maxWidth: "80%",
          marginLeft: msg.sender === "user" ? "auto" : "0",
          boxShadow: "0 2px 8px rgba(164, 143, 198, 0.10)",
          position: "relative"
        }}
      >
        {msg.sender === "user" && (
          <FaTrash
            onClick={async () => {
              if (window.confirm("Delete this message and all following messages?")) {
                try {
                  await deleteMessagesAfter(selectedConversation, msg.id);
                  await loadMessages(selectedConversation);
                } catch (err) {
                  setError("Failed to delete messages");
                }
              }
            }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "#f7e08c",
              background: "transparent",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              zIndex: 2
            }}
            title="Delete this and all following messages"
          />
        )}
        <div
          style={{
            fontWeight: "600",
            color: "#f8fafc",
            marginBottom: "8px",
            fontSize: "14px"
          }}
        >
          {msg.sender === "user" ? "You" : "Assistant"}
        </div>
        
        {/* Render images if present */}
        {msg.images && renderImages(msg.images, msg.sender === "user", handleImageClick)}
        
        <div
          style={{
            color: "#f8fafc",
            lineHeight: "1.5",
            fontSize: "14px",
            textAlign: "left"
          }}
        >
          {msg.sender === "llm" ? (
            <>
              <Markdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        {...props}
                        PreTag="div"
                        language={match[1]}
                        style={dark}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code {...props} className={className}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {msg.text}
              </Markdown>
              {msg.llmResponseTime && (
                <div style={{ fontSize: "11px", color: "#f7e08c", textAlign: "right", marginTop: 4 }}>
                  ⏱️ {msg.llmResponseTime}s
                </div>
              )}
            </>
          ) : (
            msg.text
          )}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#e5e7eb",
            marginTop: "8px"
          }}
        >
          {formatTimestamp(msg.timestamp)}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={closePreview}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closePreview}
              style={{
                position: "absolute",
                top: -40,
                right: 0,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              <FaTimes />
            </button>

            {/* Image */}
            <img
              src={previewImage.url}
              alt={previewImage.filename || "Preview"}
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
              }}
            />

            {/* Image info */}
            <div
              style={{
                marginTop: "16px",
                color: "#fff",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                {previewImage.filename || "Image"}
              </div>
              <div style={{ opacity: 0.7, fontSize: "12px" }}>
                {previewImage.size && `${(previewImage.size / 1024).toFixed(1)} KB`}
                {previewImage.mimeType && ` • ${previewImage.mimeType}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageBubble;
