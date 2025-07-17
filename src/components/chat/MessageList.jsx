import React from "react";
import MessageBubble from "./MessageBubble";

const MessageList = ({
  messages,
  loadingMessages,
  streaming,
  messagesEndRef,
  selectedConversation,
  deleteMessagesAfter,
  loadMessages,
  setError
}) => (
  <div
    style={{
      flex: 1,
      overflowY: "auto",
      padding: "24px 12px 24px 12px",
      backgroundColor: "#404b54"
    }}
  >
    {loadingMessages ? (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%"
        }}
      >
        <p style={{ color: "#e5e7eb" }}>Loading messages...</p>
      </div>
    ) : (
      <div>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            selectedConversation={selectedConversation}
            deleteMessagesAfter={deleteMessagesAfter}
            loadMessages={loadMessages}
            setError={setError}
          />
        ))}
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    )}
  </div>
);

export default MessageList;
