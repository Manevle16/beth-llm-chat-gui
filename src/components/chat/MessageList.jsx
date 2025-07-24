import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import MessageBubble from "./MessageBubble";
import { useAutoScroll } from "../../hooks/useAutoScroll";

const MessageList = memo(({
  messages,
  loadingMessages,
  streaming,
  messagesEndRef,
  selectedConversation,
  deleteMessagesAfter,
  loadMessages,
  setError,
  onAutoScrollStateChange,
  onAutoScrollFunctions
}) => {
  const {
    autoScrollEnabled,
    userHasScrolledUp,
    scrollPosition,
    shouldShowDownArrow,
    error: autoScrollError,
    scrollContainerRef,
    handleScroll,
    enableAutoScroll,
    disableAutoScroll,
    resetAutoScrollState,
    autoScrollToBottom,
    startContinuousScroll,
    stopContinuousScroll,
    handleScrollDuringLoading,
    cleanup
  } = useAutoScroll();

  // Track previous values to avoid unnecessary updates
  const prevMessageCountRef = useRef(0);
  const prevStreamingRef = useRef(false);
  const prevConversationRef = useRef(null);
  const prevLoadingRef = useRef(false);

  // Memoize auto-scroll state to prevent unnecessary parent notifications
  const autoScrollState = useMemo(() => ({
    autoScrollEnabled,
    userHasScrolledUp,
    scrollPosition,
    shouldShowDownArrow
  }), [autoScrollEnabled, userHasScrolledUp, scrollPosition, shouldShowDownArrow]);

  // Handle auto-scroll errors
  useEffect(() => {
    if (autoScrollError && setError) {
      // Don't show auto-scroll errors to user as they're not critical
      // Just log them for debugging
    }
  }, [autoScrollError, setError]);

  // Handle scroll events during loading states - optimized to only run when loading state changes
  useEffect(() => {
    if (loadingMessages !== prevLoadingRef.current) {
      handleScrollDuringLoading(loadingMessages);
      prevLoadingRef.current = loadingMessages;
    }
  }, [loadingMessages, handleScrollDuringLoading]);

  // Notify parent component of auto-scroll state changes - optimized with memoization
  useEffect(() => {
    if (onAutoScrollStateChange) {
      onAutoScrollStateChange(autoScrollState);
    }
  }, [autoScrollState, onAutoScrollStateChange]);

  // Pass auto-scroll functions to parent
  useEffect(() => {
    if (onAutoScrollFunctions) {
      onAutoScrollFunctions({
        enableAutoScroll,
        autoScrollToBottom
      });
    }
  }, [onAutoScrollFunctions, enableAutoScroll, autoScrollToBottom]);

  // Reset auto-scroll state when conversation changes - optimized to only run when conversation actually changes
  useEffect(() => {
    const conversationChanged = prevConversationRef.current !== selectedConversation;
    
    if (conversationChanged) {
      try {
        resetAutoScrollState();
        prevMessageCountRef.current = 0;
        prevStreamingRef.current = false;
        prevConversationRef.current = selectedConversation;
      } catch (err) {
        console.error('Error resetting auto-scroll state on conversation change:', err);
      }
    }
  }, [selectedConversation, resetAutoScrollState]);

  // Handle streaming state changes and auto-scroll behavior - optimized to use new continuous scroll
  useEffect(() => {
    const streamingStarted = streaming && !prevStreamingRef.current;
    const streamingStopped = !streaming && prevStreamingRef.current;
    
    try {
      // When streaming starts, ensure auto-scroll is enabled for new content
      if (streamingStarted && !autoScrollEnabled) {
        enableAutoScroll();
      }
      
      // Start/stop continuous scrolling based on streaming state AND auto-scroll enabled state
      if (streamingStarted && autoScrollEnabled) {
        startContinuousScroll();
      } else if (streamingStopped || !autoScrollEnabled) {
        // Stop continuous scrolling when streaming stops OR when auto-scroll is disabled
        stopContinuousScroll();
      }
      
      prevStreamingRef.current = streaming;
    } catch (err) {
      console.error('Error handling streaming state change:', err);
    }
  }, [streaming, autoScrollEnabled, enableAutoScroll, startContinuousScroll, stopContinuousScroll]);

  // Stop continuous scrolling when auto-scroll is disabled
  useEffect(() => {
    if (!autoScrollEnabled) {
      stopContinuousScroll();
    }
  }, [autoScrollEnabled, stopContinuousScroll]);

  // Auto-scroll when new messages arrive - optimized to reduce unnecessary calls
  useEffect(() => {
    const currentMessageCount = messages.length;
    const hasNewMessages = currentMessageCount > prevMessageCountRef.current;
    const isStreamingStarted = streaming && !prevStreamingRef.current;

    try {
      // Auto-scroll for new messages or when streaming starts
      if (autoScrollEnabled && (hasNewMessages || isStreamingStarted)) {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          autoScrollToBottom();
        });
      }

      // Update refs
      prevMessageCountRef.current = currentMessageCount;
    } catch (err) {
      console.error('Error handling auto-scroll for new messages:', err);
    }
  }, [messages, streaming, autoScrollEnabled, autoScrollToBottom]);

  // Handle message loading state - optimized to reduce unnecessary calls
  useEffect(() => {
    try {
      if (!loadingMessages && prevLoadingRef.current) {
        // When loading completes, if auto-scroll is enabled, scroll to show new messages
        if (autoScrollEnabled && messages.length > 0) {
          requestAnimationFrame(() => {
            autoScrollToBottom();
          });
        }
      }
    } catch (err) {
      console.error('Error handling message loading state:', err);
    }
  }, [loadingMessages, autoScrollEnabled, messages.length, autoScrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        cleanup();
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    };
  }, [cleanup]);

  // Memoize the MessageBubble components to prevent unnecessary re-renders
  const messageBubbles = useMemo(() => {
    return messages.map((msg) => (
      <MessageBubble
        key={msg.id}
        msg={msg}
        selectedConversation={selectedConversation}
        deleteMessagesAfter={deleteMessagesAfter}
        loadMessages={loadMessages}
        setError={setError}
      />
    ));
  }, [messages, selectedConversation, deleteMessagesAfter, loadMessages, setError]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 12px 24px 12px",
        backgroundColor: "#404b54",
        position: "relative"
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
          {messageBubbles}
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;
