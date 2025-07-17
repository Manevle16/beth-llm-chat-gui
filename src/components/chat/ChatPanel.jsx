import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

const ChatPanel = ({
  messages,
  loadingMessages,
  streaming,
  error,
  onSendMessage,
  newMessage,
  setNewMessage,
  messagesEndRef,
  selectedConversation,
  deleteMessagesAfter,
  loadMessages,
  setError
}) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#404b54",
      minWidth: 0,
      minHeight: 0, // allow flex children to shrink
      height: "100%"
    }}
  >
    {selectedConversation ? (
      <>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <MessageList
            messages={messages}
            loadingMessages={loadingMessages}
            streaming={streaming}
            messagesEndRef={messagesEndRef}
            selectedConversation={selectedConversation}
            deleteMessagesAfter={deleteMessagesAfter}
            loadMessages={loadMessages}
            setError={setError}
          />
        </div>
        <MessageInput
          onSendMessage={onSendMessage}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          streaming={streaming}
        />
      </>
    ) : (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          color: "#e5e7eb",
          fontSize: "16px"
        }}
      >
        Select a conversation to start chatting
      </div>
    )}
  </div>
);

export default ChatPanel;
