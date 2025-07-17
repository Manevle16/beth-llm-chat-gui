import React from "react";
import { FaTrash } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

const MessageBubble = ({ msg, selectedConversation, deleteMessagesAfter, loadMessages, setError }) => (
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
    <div
      style={{
        color: "#f8fafc",
        lineHeight: "1.5",
        fontSize: "14px"
      }}
    >
      {msg.sender === "llm" ? (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
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
);

export default MessageBubble;
