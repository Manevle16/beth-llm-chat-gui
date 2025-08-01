import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ApolloProvider } from "@apollo/client";
import client from "./service/apollo";
import WidgetContext from "./context/widget-context";
import { useGraphQL } from "./service/useGraphQL";
import Sidebar from "./components/sidebar/Sidebar";
import ChatPanel from "./components/chat/ChatPanel";
import NewConversationModal from "./components/modals/NewConversationModal";
import ErrorBanner from "./components/shared/ErrorBanner";
import Loader from "./components/shared/Loader";
import "./App.scss";

function App() {
  // GraphQL hooks
  const {
    loading: gqlLoading,
    error: gqlError,
    getConversations,
    getMessages,
    createConversation,
    deleteConversation,
    deleteMessagesAfter,
    terminateStream,
    getAvailableModels,
    clearError: clearGQLError
  } = useGraphQL();

  // State
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [streamingMessages, setStreamingMessages] = useState([]); // Track streaming messages separately
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalModel, setModalModel] = useState("");
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  
  // Optimize setNewMessage to prevent unnecessary re-renders
  const handleSetNewMessage = useCallback((value) => {
    setNewMessage(value);
  }, []);
  const messagesEndRef = useRef(null);
  
  // Auto-scroll state from MessageList component
  const [autoScrollState, setAutoScrollState] = useState({
    autoScrollEnabled: true,
    userHasScrolledUp: false,
    scrollPosition: 'at_bottom',
    shouldShowDownArrow: false
  });

  // Handle auto-scroll state changes from MessageList
  const handleAutoScrollStateChange = useCallback((newState) => {
    setAutoScrollState(newState);
  }, []);

  // Fetch conversations
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await getConversations();
      setConversations(data.conversations.conversations || []);
    } catch (err) {
      setError("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [getConversations]);

  // Fetch messages for selected conversation
  const loadMessages = useCallback(async (conversationId = selectedConversation) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const data = await getMessages(conversationId);
      const dbMessages = data.messages || [];
      
      // Merge database messages with any active streaming messages for this conversation
      const activeStreamingMessages = streamingMessages.filter(msg => msg.conversationId === conversationId);
      const mergedMessages = [...dbMessages, ...activeStreamingMessages];
      
      // Sort by timestamp to maintain proper order
      mergedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setMessages(mergedMessages);
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedConversation, getMessages]); // Removed streamingMessages from dependencies

  // Fetch available models for modal
  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setModelsError(null);
    try {
      const data = await getAvailableModels();
      const models = data.availableModels.models || [];
      setAvailableModels(models);
      // Default to llama3.1:8b if available
      setModalModel(models.includes("llama3.1:8b") ? "llama3.1:8b" : models[0] || "");
    } catch (err) {
      setModelsError("Failed to load models");
    } finally {
      setLoadingModels(false);
    }
  }, [getAvailableModels]);

  // Initial load
  useEffect(() => {
    loadConversations();
    loadModels();
  }, [loadConversations, loadModels]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, loadMessages]);

  // Update messages when streaming messages change (without triggering loading state)
  useEffect(() => {
    if (selectedConversation) {
      // Get current database messages (without triggering a reload)
      setMessages(prevMessages => {
        // Filter out any streaming messages from previous state
        const dbMessages = prevMessages.filter(msg => 
          !streamingMessages.some(streamMsg => streamMsg.id === msg.id)
        );
        
        // Add current streaming messages
        const activeStreamingMessages = streamingMessages.filter(msg => msg.conversationId === selectedConversation);
        const mergedMessages = [...dbMessages, ...activeStreamingMessages];
        
        // Sort by timestamp to maintain proper order
        mergedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return mergedMessages;
      });
    }
  }, [streamingMessages, selectedConversation]);

  // Handlers
  const handleSelectConversation = useCallback((id) => {
    // Do not clear streaming messages on conversation switch
    setSelectedConversation(id);
    setOpenMenuId(null);
    setError(null);
  }, [selectedConversation]);

  const handleNewConversation = useCallback(() => {
    setModalTitle("");
    setShowModal(true);
    setError(null);
  }, []);

  const handleCreateConversation = useCallback(async () => {
    if (!modalTitle.trim() || !modalModel) return;
    try {
      const id = Date.now().toString();
      const data = await createConversation(id, modalTitle, modalModel);
      setShowModal(false);
      setModalTitle("");
      setModalModel(availableModels.includes("llama3.1:8b") ? "llama3.1:8b" : availableModels[0] || "");
      await loadConversations();
      setSelectedConversation(data.createConversation.conversation.id);
    } catch (err) {
      setError("Failed to create conversation");
    }
  }, [modalTitle, modalModel, availableModels, createConversation, loadConversations]);

  const handleDeleteConversation = useCallback(async (id) => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(id);
      // Clear any streaming messages for this conversation
      setStreamingMessages(prev => prev.filter(msg => msg.conversationId !== id));
      await loadConversations();
      if (selectedConversation === id) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError("Failed to delete conversation");
    }
  }, [deleteConversation, loadConversations, selectedConversation]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const conversation = conversations.find((c) => c.id === selectedConversation);
    if (!conversation) {
      setError("Conversation not found");
      return;
    }
    const model = conversation.llmModel;
    setStreaming(true);
    setCurrentSessionId(null);
    setError(null);

    const userMsg = {
      id: `user-${Date.now()}`,
      conversationId: selectedConversation,
      text: newMessage,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    // Add user message to database messages (this will be saved to DB)
    setMessages((prev) => [...prev, userMsg]);
    setNewMessage("");
    
    const assistantMsg = {
      id: `llm-${Date.now()}`,
      conversationId: selectedConversation,
      text: "...",
      sender: "llm",
      timestamp: new Date().toISOString()
    };
    
    // Add assistant message to streaming messages (temporary until completed)
    setStreamingMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await fetch("https://localhost:3443/api/stream-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          message: userMsg.text,
          conversationId: selectedConversation
        })
      });
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      let done = false;
      let buffer = "";
      let assistantText = "";
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          buffer += new TextDecoder().decode(value);
          // Split on double newlines (SSE event format)
          const events = buffer.split("\n\n");
          buffer = events.pop(); // last may be incomplete
          for (const event of events) {
            if (event.startsWith("data: ")) {
              const data = JSON.parse(event.slice(6));
              if (data.token) {
                assistantText += data.token;
                // Update assistant message in streaming messages
                setStreamingMessages((prev) =>
                  prev.map((msg) => (msg.id === assistantMsg.id ? { ...msg, text: assistantText || "..." } : msg))
                );
              }
            } else if (event.startsWith("event: session")) {
              const data = JSON.parse(event.split("data: ")[1] || "{}");
              setCurrentSessionId(data.sessionId);
            } else if (event.startsWith("event: end")) {
              done = true;
            } else if (event.startsWith("event: error")) {
              const data = JSON.parse(event.split("data: ")[1] || "{}");
              setError(data.error || "Streaming error");
              done = true;
            }
          }
        }
      }
    } catch (err) {
      setError("Failed to send or stream message");
    } finally {
      setStreaming(false);
      setCurrentSessionId(null);
      // Remove the streaming message since it's now completed and saved to DB
      setStreamingMessages((prev) => prev.filter(msg => msg.id !== assistantMsg.id));
    }
  }, [newMessage, selectedConversation, conversations]);

  const handleTerminateStream = useCallback(async () => {
    if (!currentSessionId || !selectedConversation) return;
    
    try {
      const result = await terminateStream(currentSessionId, selectedConversation);
      if (result.terminateStream.success) {
        setStreaming(false);
        setCurrentSessionId(null);
        // Optionally show a success message or update the UI
        console.log("Stream terminated successfully:", result.terminateStream.message);
      } else {
        setError("Failed to terminate stream: " + (result.terminateStream.error || "Unknown error"));
      }
    } catch (err) {
      setError("Failed to terminate stream");
    }
  }, [currentSessionId, selectedConversation, terminateStream]);

  const handleDeleteMessagesAfter = useCallback(async (conversationId, messageId) => {
    try {
      await deleteMessagesAfter(conversationId, messageId);
      // Clear any streaming messages for this conversation since we're deleting messages
      setStreamingMessages(prev => prev.filter(msg => msg.conversationId !== conversationId));
      await loadMessages(conversationId);
    } catch (err) {
      setError("Failed to delete messages");
    }
  }, [deleteMessagesAfter, loadMessages]);

  const handleClearError = useCallback(() => {
    setError(null);
    clearGQLError();
  }, [clearGQLError]);

  return (
    <ApolloProvider client={client}>
      <WidgetContext.Provider value={{}}>
        <div className="App" style={{ display: "flex", height: "100vh", background: "#232b33" }}>
          <Sidebar
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            loadingConversations={loadingConversations}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            handleDeleteConversation={handleDeleteConversation}
          />
                      <ChatPanel
              messages={messages}
              setMessages={setMessages}
              streamingMessages={streamingMessages}
              setStreamingMessages={setStreamingMessages}
              loadingMessages={loadingMessages}
              streaming={streaming}
              error={error}
              onSendMessage={handleSendMessage}
              newMessage={newMessage}
              setNewMessage={handleSetNewMessage}
              messagesEndRef={messagesEndRef}
              selectedConversation={selectedConversation}
              currentConversation={conversations.find(c => c.id === selectedConversation)}
              deleteMessagesAfter={handleDeleteMessagesAfter}
              loadMessages={loadMessages}
              setError={setError}
              onTerminateStream={handleTerminateStream}
              currentSessionId={currentSessionId}
              onAutoScrollStateChange={handleAutoScrollStateChange}
              setStreaming={setStreaming}
              setCurrentSessionId={setCurrentSessionId}
            />
          {showModal && (
            <NewConversationModal
              show={showModal}
              onClose={() => setShowModal(false)}
              modalTitle={modalTitle}
              setModalTitle={setModalTitle}
              modalModel={modalModel}
              setModalModel={setModalModel}
              availableModels={availableModels}
              loadingModels={loadingModels}
              modelsError={modelsError}
              onCreate={handleCreateConversation}
            />
          )}
          {error && <ErrorBanner error={error} onClear={handleClearError} />}
          {gqlLoading && <Loader />}
        </div>
      </WidgetContext.Provider>
    </ApolloProvider>
  );
}

export default App;
