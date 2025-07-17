import React from "react";

const MessageInput = ({ onSendMessage, newMessage, setNewMessage, streaming }) => (
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
    <div
      style={{
        display: "flex",
        gap: "12px",
        maxWidth: "800px",
        margin: "0 auto"
      }}
    >
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
        placeholder="Type your message..."
        style={{
          flex: 1,
          padding: "12px 16px",
          border: "1.5px solid #a48fc6",
          borderRadius: "8px",
          fontSize: "14px",
          outline: "none",
          background: "#404b54",
          color: "#f8fafc"
        }}
      />
      <button
        onClick={onSendMessage}
        disabled={streaming}
        style={{
          padding: "12px 24px",
          background: streaming ? "#bba6d6" : "#a48fc6",
          color: "#37424a",
          border: "none",
          borderRadius: "8px",
          cursor: streaming ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "500",
          opacity: streaming ? 0.6 : 1,
          boxShadow: "0 2px 8px rgba(164, 143, 198, 0.10)"
        }}
      >
        Send
      </button>
    </div>
  </div>
);

export default MessageInput;
