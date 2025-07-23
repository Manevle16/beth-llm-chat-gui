import React from "react";

const NewConversationModal = ({
  show,
  onClose,
  onCreate,
  modalTitle = "",
  setModalTitle,
  modalModel,
  setModalModel,
  availableModels,
  loadingModels,
  modelsError
}) => {
  if (!show) return null;
  return (
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
      onClick={onClose}
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
            onClick={onCreate}
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
            disabled={!modalTitle?.trim() || !modalModel}
          >
            Create
          </button>
          <button
            onClick={onClose}
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
  );
};

export default NewConversationModal;
