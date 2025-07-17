import React from "react";

const ErrorBanner = ({ error, onClear }) => {
  if (!error) return null;
  return (
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
        onClick={onClear}
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
  );
};

export default ErrorBanner;
