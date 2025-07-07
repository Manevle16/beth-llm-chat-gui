import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGraphQL } from "../service/useGraphQL";
import { FaTrash, FaEllipsisV } from "react-icons/fa";

// Helper function to safely parse dates (handles ISO strings and millisecond timestamps)
const formatDate = (dateValue) => {
  if (!dateValue) return "No date";
  let date;
  if (typeof dateValue === "number" || /^\d+$/.test(dateValue)) {
    date = new Date(Number(dateValue));
  } else {
    date = new Date(dateValue);
  }
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString();
};

// Helper function to safely parse timestamps (handles ISO strings and millisecond timestamps)
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

// Streaming helper: POST to /api/stream-message and yield tokens as they arrive
async function* streamAssistantResponse({ model, message, conversationId }) {
  const response = await fetch("https://localhost:3443/api/stream-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, message, conversationId })
  });
  if (!response.body) throw new Error("No response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split("\n\n");
      buffer = lines.pop(); // last incomplete chunk
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (data.token) yield { token: data.token };
        } else if (line.startsWith("event: end")) {
          return;
        } else if (line.startsWith("event: error")) {
          throw new Error(JSON.parse(line.split("data: ")[1]).error);
        }
      }
    }
  }
}

const GraphQLExample = () => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalModel, setModalModel] = useState("");
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(null);

  const messagesEndRef = useRef(null);

  const {
    getConversations,
    getMessages,
    createConversation,
    deleteConversation,
    clearError,
    getAvailableModels,
    deleteMessagesAfter
  } = useGraphQL();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Add click-away functionality
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest(".conversation-menu-container")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId]);

  // Fetch available models when modal opens
  useEffect(() => {
    if (showModal) {
      setLoadingModels(true);
      setModelsError(null);
      getAvailableModels()
        .then((result) => {
          const models = result.availableModels.models;
          setAvailableModels(models);
          // Prefer llama3.1:8b if present
          const defaultModel = models.includes("llama3.1:8b") ? "llama3.1:8b" : models[0] || "";
          setModalModel(defaultModel);
        })
        .catch((err) => {
          setModelsError("Failed to load models");
        })
        .finally(() => setLoadingModels(false));
    }
  }, [showModal, getAvailableModels]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const result = await getConversations();
      setConversations(result.conversations.conversations || []);
    } catch (err) {
      setError("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const result = await getMessages(conversationId);
      setMessages(result.messages || []);
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateConversation = async (title, model) => {
    if (!title) return;
    try {
      const id = `conv_${Date.now()}`;
      const result = await createConversation(id, title, model);
      await loadConversations();
      setSelectedConversation(result.createConversation.conversation.id);
    } catch (err) {
      setError("Failed to create conversation");
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await deleteConversation(conversationId);
      // If the deleted conversation is selected, clear selection
      if (selectedConversation === conversationId) setSelectedConversation(null);
      await loadConversations();
    } catch (err) {
      setError("Failed to delete conversation");
    }
  };

  // Streaming send message
  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;
    setStreaming(true);
    setError(null);
    const userMsg = {
      id: `msg_${Date.now()}`,
      conversationId: selectedConversation,
      text: newMessage,
      sender: "user",
      timestamp: Date.now()
    };
    // Show user message immediately
    setMessages((prev) => [...prev, userMsg]);
    setNewMessage("");
    // Prepare conversation history for context (exclude assistant typing bubble)
    // Add assistant message placeholder
    const assistantMsg = {
      id: `msg_assistant_${Date.now()}`,
      conversationId: selectedConversation,
      text: "",
      sender: "llm",
      timestamp: Date.now(),
      llmResponseTime: null
    };
    setMessages((prev) => [...prev, assistantMsg]);
    let assistantText = "";
    const startTime = Date.now();
    try {
      for await (const { token } of streamAssistantResponse({
        model: modalModel, // Use selected model from modal
        message: userMsg.text,
        conversationId: selectedConversation
      })) {
        assistantText += token;
        setMessages((prev) => prev.map((msg) => (msg.id === assistantMsg.id ? { ...msg, text: assistantText } : msg)));
      }
      // Set the response time on the assistant message
      const endTime = Date.now();
      const durationSec = ((endTime - startTime) / 1000).toFixed(2);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === assistantMsg.id ? { ...msg, llmResponseTime: durationSec } : msg))
      );
    } catch (err) {
      setError(err.message || "Streaming error");
      // Remove the assistant message bubble if error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMsg.id));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#404b54", // swapped: main background is now lighter
        margin: 0,
        padding: 0,
        boxSizing: "border-box"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #46525c",
          backgroundColor: "#37424a" // now matches sidebar
        }}
      >
        <h2 style={{ margin: 0, color: "#f8fafc" }}>Beth LLM Chat</h2>
      </div>

      {error && (
        <div
          style={{
            background: "#f7e08c",
            color: "#a04848",
            padding: "12px 24px",
            borderBottom: "1px solid #f7e08c",
            fontSize: "14px"
          }}
        >
          Error: {error}
          <button
            onClick={clearError}
            style={{
              marginLeft: "12px",
              background: "#a04848",
              color: "#fff",
              border: "none",
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          minWidth: 0
        }}
      >
        {/* Conversations Sidebar */}
        <div
          style={{
            width: "260px",
            backgroundColor: "#37424a", // swapped: sidebar is now darker
            borderRight: "1px solid #46525c",
            borderRadius: "12px 0 0 12px",
            border: "1px solid #46525c",
            margin: 12,
            boxShadow: "0 2px 8px rgba(164, 143, 198, 0.10)",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ padding: "16px" }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#a48fc6",
                color: "#f8fafc",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                boxShadow: "0 2px 8px rgba(164, 143, 198, 0.10)",
                transition: "background 0.2s, color 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#bba6d6")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#a48fc6")}
            >
              + New Conversation
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "visible",
              padding: "0 16px 16px 16px"
            }}
          >
            {loadingConversations ? (
              <p style={{ color: "#e5e7eb", textAlign: "center" }}>Loading conversations...</p>
            ) : (
              <div>
                {conversations.map((conv) => (
                  <div key={conv.id} style={{ position: "relative" }}>
                    <div
                      onClick={() => setSelectedConversation(conv.id)}
                      style={{
                        padding: "12px",
                        margin: "8px 0",
                        background: selectedConversation === conv.id ? "#46525c" : "#404b54",
                        cursor: "pointer",
                        borderRadius: "8px",
                        border: selectedConversation === conv.id ? "2px solid #a48fc6" : "1px solid #46525c",
                        boxShadow: "0 2px 8px rgba(164, 143, 198, 0.10)",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "relative"
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#f8fafc",
                            fontSize: "14px",
                            marginBottom: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {conv.tabName}
                        </div>
                        <div style={{ fontSize: "12px", color: "#e5e7eb" }}>{formatDate(conv.createdAt)}</div>
                      </div>
                      <FaEllipsisV
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(conv.id);
                        }}
                        style={{
                          color: "#f7e08c",
                          background: "transparent",
                          borderRadius: "6px",
                          fontSize: "16px",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          marginLeft: 8,
                          transition: "background 0.2s, color 0.2s"
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#46525c")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                        title="Conversation menu"
                      />
                    </div>
                    {openMenuId === conv.id && (
                      <div
                        className="conversation-menu-container"
                        style={{
                          position: "absolute",
                          right: -30,
                          top: 48,
                          background: "#46525c",
                          border: "1px solid #a48fc6",
                          borderRadius: 6,
                          boxShadow: "0 2px 8px rgba(164, 143, 198, 0.18)",
                          zIndex: 1000
                        }}
                      >
                        <div
                          onClick={() => {
                            handleDeleteConversation(conv.id);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: "8px 16px",
                            color: "#f7e08c",
                            cursor: "pointer",
                            fontSize: 14,
                            borderRadius: 6,
                            transition: "background 0.2s"
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "#a48fc6")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "#46525c")}
                        >
                          Delete
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#404b54", // swapped
            minWidth: 0
          }}
        >
          {selectedConversation ? (
            <>
              {/* Messages Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "24px 12px 24px 12px",
                  backgroundColor: "#404b54" // swapped
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
                      <div
                        key={msg.id}
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
                    ))}
                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div
                style={{
                  padding: "16px",
                  borderTop: "1px solid #46525c",
                  backgroundColor: "#37424a", // now matches sidebar
                  margin: 12, // match sidebar margin
                  border: "1px solid #46525c", // match sidebar border
                  borderRadius: "12px" // all corners rounded
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
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
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
                    onClick={handleSendMessage}
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
      </div>

      {/* Modal for new conversation */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(55, 66, 74, 0.7)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#37424a",
              border: "1.5px solid #a48fc6",
              borderRadius: 16,
              boxShadow: "0 4px 32px rgba(164,143,198,0.18)",
              padding: 32,
              minWidth: 320,
              color: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, color: "#f8fafc", fontWeight: 600, fontSize: 20 }}>New Conversation</h3>
            <label style={{ fontSize: 14, color: "#e5e7eb", marginBottom: 4 }}>Title</label>
            <input
              type="text"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              placeholder="Enter conversation title"
              style={{
                padding: "10px 14px",
                border: "1.5px solid #a48fc6",
                borderRadius: 8,
                background: "#404b54",
                color: "#f8fafc",
                fontSize: 15,
                marginBottom: 8
              }}
              autoFocus
            />
            <label style={{ fontSize: 14, color: "#e5e7eb", marginBottom: 4 }}>LLM Model</label>
            {loadingModels ? (
              <div style={{ color: "#f7e08c", fontSize: 14 }}>Loading models...</div>
            ) : modelsError ? (
              <div style={{ color: "#dc2626", fontSize: 14 }}>{modelsError}</div>
            ) : (
              <select
                value={modalModel}
                onChange={(e) => setModalModel(e.target.value)}
                style={{
                  padding: "10px 14px",
                  border: "1.5px solid #a48fc6",
                  borderRadius: 8,
                  background: "#404b54",
                  color: "#f8fafc",
                  fontSize: 15,
                  marginBottom: 8
                }}
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                onClick={() => {
                  handleCreateConversation(modalTitle, modalModel);
                  setShowModal(false);
                  setModalTitle("");
                  setModalModel(availableModels[0] || "");
                }}
                style={{
                  background: "#a48fc6",
                  color: "#37424a",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(164,143,198,0.10)"
                }}
                disabled={!modalTitle.trim() || !modalModel}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalTitle("");
                  setModalModel(availableModels[0] || "");
                }}
                style={{
                  background: "transparent",
                  color: "#f7e08c",
                  border: "1.5px solid #a48fc6",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphQLExample;
