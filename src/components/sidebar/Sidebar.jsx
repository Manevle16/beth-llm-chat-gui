import React from "react";
import ConversationList from "./ConversationList";

const Sidebar = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewConversation,
  loadingConversations,
  openMenuId,
  setOpenMenuId,
  handleDeleteConversation
}) => (
  <div
    style={{
      width: "260px",
      backgroundColor: "#37424a",
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
        onClick={onNewConversation}
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
    <ConversationList
      conversations={conversations}
      selectedConversation={selectedConversation}
      onSelectConversation={onSelectConversation}
      loadingConversations={loadingConversations}
      openMenuId={openMenuId}
      setOpenMenuId={setOpenMenuId}
      handleDeleteConversation={handleDeleteConversation}
    />
  </div>
);

export default Sidebar;
