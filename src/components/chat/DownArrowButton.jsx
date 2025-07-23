import React from 'react';
import { FaChevronDown } from 'react-icons/fa';

const DownArrowButton = ({ 
  visible, 
  onClick, 
  disabled = false 
}) => {
  return (
    <div
      style={{
        position: 'absolute', // Changed back to absolute for relative positioning
        bottom: '100px', // Position above the chat input box
        left: '50%', // Center horizontally within the chat area
        transform: `translateX(-50%) ${visible ? 'translateY(0)' : 'translateY(10px)'}`, // Center and animate
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: '48px', // Slightly larger for better visibility
          height: '48px',
          borderRadius: '50%',
          backgroundColor: disabled ? '#666' : '#007bff',
          border: 'none',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)', // Enhanced shadow
          transition: 'background-color 0.2s ease, transform 0.2s ease',
          fontSize: '18px' // Slightly larger icon
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.target.style.backgroundColor = '#0056b3';
            e.target.style.transform = 'scale(1.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.target.style.backgroundColor = '#007bff';
            e.target.style.transform = 'scale(1)';
          }
        }}
        title="Scroll to bottom"
      >
        <FaChevronDown />
      </button>
    </div>
  );
};

export default DownArrowButton; 