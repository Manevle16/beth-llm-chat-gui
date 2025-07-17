import React, { useState, useEffect, useRef } from "react";
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
    sendMessage,
    createConversation,
    deleteConversation,
    deleteMessagesAfter,
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
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalModel, setModalModel] = useState("");
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const shouldScrollRef = useRef(true);

  // Fetch conversations
  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = await getConversations();
      setConversations(data.conversations.conversations || []);
    } catch (err) {
      setError("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  };

  // Fetch messages for selected conversation
  const loadMessages = async (conversationId = selectedConversation) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const data = await getMessages(conversationId);
      setMessages(data.messages || []);
      shouldScrollRef.current = true; // Set scroll flag to true after messages are loaded
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch available models for modal
  const loadModels = async () => {
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
  };

  // Initial load
  useEffect(() => {
    loadConversations();
    loadModels();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && shouldScrollRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (messagesEndRef.current && shouldScrollRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 0);
    }
  }, [messages]);

  // Reset scroll flag when conversation changes
  useEffect(() => {
    shouldScrollRef.current = true;
  }, [selectedConversation]);

  // Handlers
  const handleSelectConversation = (id) => {
    setSelectedConversation(id);
    setOpenMenuId(null);
    setError(null);
  };

  const handleNewConversation = () => {
    setModalTitle("");
    setShowModal(true);
    setError(null);
  };

  const handleCreateConversation = async () => {
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
  };

  const handleDeleteConversation = async (id) => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(id);
      await loadConversations();
      if (selectedConversation === id) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError("Failed to delete conversation");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const conversation = conversations.find((c) => c.id === selectedConversation);
    if (!conversation) {
      setError("Conversation not found");
      return;
    }
    const model = conversation.llmModel;
    setStreaming(true);
    setError(null);
    shouldScrollRef.current = true; // Ensure we scroll for new messages

    const userMsg = {
      id: `user-${Date.now()}`,
      conversationId: selectedConversation,
      text: newMessage,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    // Optimistically add user message
    setMessages((prev) => [...prev, userMsg]);
    setNewMessage("");
    let assistantText = "";
    let assistantMsg = null;
    // Add a placeholder for the assistant message immediately after user message
    assistantMsg = {
      id: `llm-${Date.now()}`,
      conversationId: selectedConversation,
      text: "...",
      sender: "llm",
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, assistantMsg]);
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
                // Update assistant message in UI
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === assistantMsg.id ? { ...msg, text: assistantText || "..." } : msg))
                );
              }
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
    }
  };

  const handleDeleteMessagesAfter = async (conversationId, messageId) => {
    try {
      await deleteMessagesAfter(conversationId, messageId);
      await loadMessages(conversationId);
    } catch (err) {
      setError("Failed to delete messages");
    }
  };

  const handleClearError = () => {
    setError(null);
    clearGQLError();
  };

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
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <ErrorBanner error={error || gqlError} onClear={handleClearError} />
            {(gqlLoading || loadingConversations) && <Loader />}
            <ChatPanel
              messages={messages}
              loadingMessages={loadingMessages}
              streaming={streaming}
              error={error}
              onSendMessage={handleSendMessage}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              messagesEndRef={messagesEndRef}
              selectedConversation={selectedConversation}
              deleteMessagesAfter={handleDeleteMessagesAfter}
              loadMessages={loadMessages}
              setError={setError}
            />
          </div>
          <NewConversationModal
            show={showModal}
            onClose={() => setShowModal(false)}
            onCreate={handleCreateConversation}
            modalTitle={modalTitle}
            setModalTitle={setModalTitle}
            modalModel={modalModel}
            setModalModel={setModalModel}
            availableModels={availableModels}
            loadingModels={loadingModels}
            modelsError={modelsError}
          />
        </div>
      </WidgetContext.Provider>
    </ApolloProvider>
  );
}

export default App;
