import React from "react";
import { FaEllipsisV } from "react-icons/fa";

// Helper for date formatting (copy from main file or import if shared)
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

const ConversationListItem = ({ conv, selected, onSelect, openMenuId, setOpenMenuId, handleDeleteConversation }) => (
  <div style={{ position: "relative" }}>
    <div
      onClick={onSelect}
      style={{
        padding: "12px",
        margin: "8px 0",
        background: selected ? "#46525c" : "#404b54",
        cursor: "pointer",
        borderRadius: "8px",
        border: selected ? "2px solid #a48fc6" : "1px solid #46525c",
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
);

export default ConversationListItem;
