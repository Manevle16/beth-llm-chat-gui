import React, { useState, useMemo, useCallback, memo } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import DownArrowButton from "./DownArrowButton";
import { useImageUpload } from "../../hooks/useImageUpload";

const ChatPanel = memo(({
  messages,
  setMessages,
  loadingMessages,
  streaming,
  error,
  onSendMessage,
  newMessage,
  setNewMessage,
  messagesEndRef,
  selectedConversation,
  currentConversation,
  deleteMessagesAfter,
  loadMessages,
  setError,
  onTerminateStream,
  currentSessionId,
  onAutoScrollStateChange,
  setStreaming,
  setCurrentSessionId
}) => {
  // Image upload hook
  const {
    selectedImages,
    uploadState: imageUploadState,
    selectImages,
    removeImage,
    clearImages
  } = useImageUpload();

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

  // Handle image selection
  const handleImageSelect = useCallback((filesOrImageData) => {
    console.log('🔧 [ChatPanel] handleImageSelect called with:', filesOrImageData);
    
    // Check if we received image data objects (from paste) or File objects (from file input)
    if (filesOrImageData && filesOrImageData.length > 0) {
      const firstItem = filesOrImageData[0];
      
      if (firstItem.file && firstItem.id) {
        // This is an array of image data objects (from paste)
        // Extract the file objects and pass them to selectImages
        console.log('🔧 [ChatPanel] Received image data objects, extracting files');
        const files = filesOrImageData.map(imgData => imgData.file);
        selectImages(files);
      } else {
        // This is an array of File objects (from file input)
        console.log('🔧 [ChatPanel] Received File objects, using selectImages');
        selectImages(filesOrImageData);
      }
    }
  }, [selectImages]);

  // Handle image removal
  const handleImageRemove = useCallback((index) => {
    removeImage(index);
  }, [removeImage]);

  // Handle image error
  const handleImageError = useCallback((error) => {
    console.error('Image error:', error);
    // The error is already handled by the hook, just log it
  }, []);

  // Handle sending message with or without images
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    try {
      if (selectedImages && selectedImages.length > 0) {
        // Set streaming state for image uploads
        setStreaming(true);
        setCurrentSessionId(null);
        setError(null);
        
        // Create user message with images
        const userMsg = {
          id: `user-${Date.now()}`,
          conversationId: selectedConversation,
          text: newMessage,
          sender: "user",
          timestamp: new Date().toISOString(),
          hasImages: true,
          images: selectedImages
        };
        
        // Create placeholder assistant message
        const assistantMsg = {
          id: `llm-${Date.now()}`,
          conversationId: selectedConversation,
          text: "...",
          sender: "llm",
          timestamp: new Date().toISOString()
        };
        
        // Optimistically add both messages to UI
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        
        // Clear the text input and images immediately
        setNewMessage("");
        clearImages();
        
        // Send message with images using the GraphQL service
        const llmModel = currentConversation?.llmModel || 'qwen2.5vl:32b'; // Default to qwen2.5vl:32b for vision
        
        try {
          // Create form data for multipart request
          const formData = new FormData();
          formData.append('model', llmModel);
          formData.append('message', newMessage);
          formData.append('conversationId', selectedConversation);
          
          // Add images to form data
          selectedImages.forEach((image, index) => {
            console.log('🔧 [ChatPanel] Processing image for formData:', image);
            console.log('🔧 [ChatPanel] Image file:', image.file);
            console.log('🔧 [ChatPanel] Image file type:', typeof image.file);
            console.log('🔧 [ChatPanel] Image file instanceof File:', image.file instanceof File);
            console.log('🔧 [ChatPanel] Image file instanceof Blob:', image.file instanceof Blob);
            
            if (image.file) {
              console.log('🔧 [ChatPanel] Appending file to formData:', image.file.name, image.file.size, image.file.type);
              formData.append('images', image.file);
            } else {
              console.error('🔧 [ChatPanel] No file found in image:', image);
            }
          });

          // Make the streaming request directly
          const response = await fetch("https://localhost:3443/api/stream-message", {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - let browser set it with boundary
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Stream request failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          // Handle SSE response for real-time streaming
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let assistantText = "";
          let sessionId = null;
          let done = false;

          while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            
            if (value) {
              buffer += decoder.decode(value);
              // Split on double newlines (SSE event format)
              const events = buffer.split("\n\n");
              buffer = events.pop(); // last may be incomplete
              
              for (const event of events) {
                if (event.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(event.slice(6));
                    if (data.token) {
                      assistantText += data.token;
                      // Update assistant message in UI in real-time
                      setMessages((prev) =>
                        prev.map((msg) => (msg.id === assistantMsg.id ? { ...msg, text: assistantText || "..." } : msg))
                      );
                    }
                  } catch (parseError) {
                    console.warn('Failed to parse SSE data:', parseError);
                  }
                } else if (event.startsWith("event: session")) {
                  try {
                    const data = JSON.parse(event.split("data: ")[1] || "{}");
                    sessionId = data.sessionId;
                    setCurrentSessionId(sessionId);
                  } catch (parseError) {
                    console.warn('Failed to parse session event:', parseError);
                  }
                } else if (event.startsWith("event: end")) {
                  done = true;
                } else if (event.startsWith("event: error")) {
                  try {
                    const data = JSON.parse(event.split("data: ")[1] || "{}");
                    throw new Error(data.error || "Streaming error");
                  } catch (parseError) {
                    throw new Error("Streaming error");
                  }
                } else if (event.startsWith("event: images")) {
                  try {
                    const data = JSON.parse(event.split("data: ")[1] || "{}");
                    console.log('🎯 [FRONTEND] Images processed event received:', data);
                    console.log('🎯 [FRONTEND] User message ID:', userMsg.id);
                    
                    // Update the user message with processed image data
                    if (data.processed > 0 && data.images) {
                      console.log('🎯 [FRONTEND] Updating user message with processed images:', data.images);
                      
                      // Convert the already uploaded images to base64
                      const convertUploadedImagesToBase64 = async () => {
                        const base64Images = [];
                        
                        // Use the original selectedImages that were uploaded
                        for (const originalImage of selectedImages) {
                          try {
                            console.log('🎯 [FRONTEND] Converting uploaded image to base64:', originalImage);
                            
                            if (originalImage.file) {
                              const reader = new FileReader();
                              
                              const base64Promise = new Promise((resolve, reject) => {
                                reader.onload = () => resolve(reader.result);
                                reader.onerror = reject;
                              });
                              
                              reader.readAsDataURL(originalImage.file);
                              const base64Data = await base64Promise;
                              
                              // Find the corresponding processed image data from backend
                              const processedImage = data.images.find(img => 
                                img.filename === originalImage.filename || 
                                img.id === originalImage.id
                              );
                              
                              base64Images.push({
                                id: processedImage?.id || originalImage.id,
                                filename: processedImage?.filename || originalImage.filename,
                                url: base64Data, // Use base64 data from uploaded file
                                size: originalImage.file.size,
                                mimeType: originalImage.file.type
                              });
                              
                              console.log('🎯 [FRONTEND] Successfully converted uploaded image to base64:', originalImage.filename);
                            } else {
                              console.warn('🎯 [FRONTEND] No file found in uploaded image:', originalImage);
                            }
                          } catch (error) {
                            console.error('🎯 [FRONTEND] Error converting uploaded image to base64:', error);
                          }
                        }
                        
                        return base64Images;
                      };
                      
                      // Convert uploaded images to base64 and update message
                      convertUploadedImagesToBase64().then(base64Images => {
                        console.log('🎯 [FRONTEND] Converted uploaded images to base64:', base64Images);
                        
                        // Update the user message with the base64 image data
                        setMessages((prev) => {
                          console.log('🎯 [FRONTEND] Current messages before update:', prev);
                          const updatedMessages = prev.map((msg) => {
                            if (msg.id === userMsg.id) {
                              const updatedMsg = {
                                ...msg, 
                                images: base64Images
                              };
                              console.log('🎯 [FRONTEND] Updated message with base64 images:', updatedMsg);
                              return updatedMsg;
                            }
                            return msg;
                          });
                          console.log('🎯 [FRONTEND] Messages after update:', updatedMessages);
                          return updatedMessages;
                        });
                      });
                    } else {
                      console.log('🎯 [FRONTEND] No processed images or invalid data:', data);
                    }
                  } catch (parseError) {
                    console.warn('🎯 [FRONTEND] Failed to parse images event:', parseError);
                  }
                }
              }
            }
          }
          
        } catch (uploadError) {
          // Remove the placeholder assistant message on error
          setMessages((prev) => prev.filter(msg => msg.id !== assistantMsg.id));
          throw uploadError;
        } finally {
          // Always reset streaming state
          setStreaming(false);
          setCurrentSessionId(null);
        }
      } else {
        // Send regular text message using the existing onSendMessage
        await onSendMessage();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
      // Reset streaming state on error
      setStreaming(false);
      setCurrentSessionId(null);
    }
  }, [newMessage, selectedConversation, currentConversation, selectedImages, onSendMessage, setError, setNewMessage, clearImages, setMessages, setStreaming, setCurrentSessionId]);

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
    onSendMessage: handleSendMessage,
    onTerminateStream,
    newMessage,
    setNewMessage,
    streaming,
    currentSessionId,
    // Image upload props
    selectedImages,
    onImageSelect: handleImageSelect,
    onImageRemove: handleImageRemove,
    onImageError: handleImageError,
    imageUploadState
  }), [handleSendMessage, onTerminateStream, newMessage, setNewMessage, streaming, currentSessionId, selectedImages, handleImageSelect, handleImageRemove, handleImageError, imageUploadState]);

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
