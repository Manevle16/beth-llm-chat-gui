import React from "react";
import ConversationListItem from "./ConversationListItem";

const ConversationList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  loadingConversations,
  openMenuId,
  setOpenMenuId,
  handleDeleteConversation
}) => (
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
          <ConversationListItem
            key={conv.id}
            conv={conv}
            selected={selectedConversation === conv.id}
            onSelect={() => onSelectConversation(conv.id)}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            handleDeleteConversation={handleDeleteConversation}
          />
        ))}
      </div>
    )}
  </div>
);

export default ConversationList;
