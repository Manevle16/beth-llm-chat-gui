import React, { useState, useMemo, useCallback, memo } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import DownArrowButton from "./DownArrowButton";

const ChatPanel = memo(({
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
  setError,
  onTerminateStream,
  currentSessionId,
  onAutoScrollStateChange
}) => {
  // Auto-scroll state from MessageList
  const [autoScrollState, setAutoScrollState] = useState({
    autoScrollEnabled: true,
    userHasScrolledUp: false,
    scrollPosition: 'at_bottom',
    shouldShowDownArrow: false
  });

  // Track if we're currently scrolling to bottom
  const [isScrollingToBottom, setIsScrollingToBottom] = useState(false);

  // Store auto-scroll functions from MessageList
  const [autoScrollFunctions, setAutoScrollFunctions] = useState(null);

  // Handle auto-scroll state changes from MessageList and pass to App
  const handleAutoScrollStateChange = useCallback((newState) => {
    setAutoScrollState(newState);
    if (onAutoScrollStateChange) {
      onAutoScrollStateChange(newState);
    }
  }, [onAutoScrollStateChange]);

  // Handle receiving auto-scroll functions from MessageList
  const handleAutoScrollFunctions = useCallback((functions) => {
    setAutoScrollFunctions(functions);
  }, []);

  // Handle down arrow click
  const handleDownArrowClick = useCallback(() => {
    if (loadingMessages || isScrollingToBottom || !autoScrollFunctions) return;
    
    try {
      setIsScrollingToBottom(true);
      
      // Enable auto-scroll and scroll to bottom
      autoScrollFunctions.enableAutoScroll();
      
      // Reset scrolling state after animation completes
      setTimeout(() => {
        setIsScrollingToBottom(false);
      }, 300); // Match the animation duration
    } catch (err) {
      console.error('Error handling down arrow click:', err);
      setIsScrollingToBottom(false);
    }
  }, [loadingMessages, isScrollingToBottom, autoScrollFunctions]);

  // Memoize the MessageList props to prevent unnecessary re-renders
  const messageListProps = useMemo(() => ({
    messages,
    loadingMessages,
    streaming,
    messagesEndRef,
    selectedConversation,
    deleteMessagesAfter,
    loadMessages,
    setError,
    onAutoScrollStateChange: handleAutoScrollStateChange,
    onAutoScrollFunctions: handleAutoScrollFunctions
  }), [messages, loadingMessages, streaming, messagesEndRef, selectedConversation, deleteMessagesAfter, loadMessages, setError, handleAutoScrollStateChange, handleAutoScrollFunctions]);

  // Memoize the MessageInput props to prevent unnecessary re-renders
  const messageInputProps = useMemo(() => ({
    onSendMessage,
    onTerminateStream,
    newMessage,
    setNewMessage,
    streaming,
    currentSessionId
  }), [onSendMessage, onTerminateStream, newMessage, setNewMessage, streaming, currentSessionId]);

  // Memoize the down arrow visibility
  const downArrowVisible = useMemo(() => {
    return autoScrollState.userHasScrolledUp;
  }, [autoScrollState.userHasScrolledUp]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#404b54",
        minWidth: 0,
        minHeight: 0, // allow flex children to shrink
        height: "100%",
        position: "relative" // Added for absolute positioning of down arrow
      }}
    >
      {selectedConversation ? (
        <>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <MessageList {...messageListProps} />
          </div>
          <MessageInput {...messageInputProps} />
          
          {/* Down arrow button - positioned relative to ChatPanel */}
          <DownArrowButton
            visible={downArrowVisible}
            onClick={handleDownArrowClick}
            disabled={loadingMessages || isScrollingToBottom}
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
});

ChatPanel.displayName = 'ChatPanel';

export default ChatPanel;
