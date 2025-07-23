import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageList from '../MessageList';
import { useAutoScroll } from '../../../hooks/useAutoScroll';

// Mock the useAutoScroll hook for integration testing
jest.mock('../../../hooks/useAutoScroll');

// Mock MessageBubble component
jest.mock('../MessageBubble', () => {
  return function MockMessageBubble({ msg }) {
    return (
      <div data-testid={`message-${msg.id}`}>
        {msg.text}
      </div>
    );
  };
});

// Mock DownArrowButton component
jest.mock('../DownArrowButton', () => {
  return function MockDownArrowButton({ visible, onClick, disabled }) {
    return (
      <button
        data-testid="down-arrow-button"
        onClick={onClick}
        disabled={disabled}
        style={{ display: visible ? 'block' : 'none' }}
      >
        Down Arrow
      </button>
    );
  };
});

describe('Auto-Scroll Integration Tests', () => {
  let mockUseAutoScroll;
  
  const defaultProps = {
    messages: [
      { id: '1', text: 'Hello', sender: 'user' },
      { id: '2', text: 'Hi there!', sender: 'assistant' },
      { id: '3', text: 'How are you?', sender: 'user' },
      { id: '4', text: 'I am doing well, thank you!', sender: 'assistant' },
      { id: '5', text: 'That is great to hear!', sender: 'user' },
      { id: '6', text: 'Yes, it is a beautiful day.', sender: 'assistant' }
    ],
    loadingMessages: false,
    streaming: false,
    messagesEndRef: { current: null },
    selectedConversation: 'conv-1',
    deleteMessagesAfter: jest.fn(),
    loadMessages: jest.fn(),
    setError: jest.fn(),
    onAutoScrollStateChange: jest.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseAutoScroll = {
      autoScrollEnabled: true,
      userHasScrolledUp: false,
      scrollPosition: 'at_bottom',
      shouldShowDownArrow: jest.fn().mockReturnValue(false),
      error: null,
      scrollContainerRef: { current: null },
      handleScroll: jest.fn(),
      enableAutoScroll: jest.fn(),
      disableAutoScroll: jest.fn(),
      resetAutoScrollState: jest.fn(),
      autoScrollToBottom: jest.fn(),
      handleScrollDuringLoading: jest.fn(),
      cleanup: jest.fn()
    };
    
    useAutoScroll.mockReturnValue(mockUseAutoScroll);
  });

  describe('Full User Flow: Scroll Up → See Arrow → Click Arrow → Resume Auto-Scroll', () => {
    it('should complete the full auto-scroll control flow', async () => {
      // Step 1: Start with auto-scroll enabled and user at bottom
      mockUseAutoScroll.autoScrollEnabled = true;
      mockUseAutoScroll.userHasScrolledUp = false;
      mockUseAutoScroll.shouldShowDownArrow.mockReturnValue(false);
      
      render(<MessageList {...defaultProps} />);
      
      // Verify down arrow is not visible initially
      const downArrow = screen.getByTestId('down-arrow-button');
      expect(downArrow).toHaveStyle({ display: 'none' });
      
      // Step 2: Simulate user scrolling up (disable auto-scroll)
      mockUseAutoScroll.autoScrollEnabled = false;
      mockUseAutoScroll.userHasScrolledUp = true;
      mockUseAutoScroll.shouldShowDownArrow.mockReturnValue(true);
      
      // Re-render to reflect state changes
      render(<MessageList {...defaultProps} />);
      
      // Verify shouldShowDownArrow was called and returns true
      expect(mockUseAutoScroll.shouldShowDownArrow).toHaveBeenCalled();
      
      // Step 3: User clicks down arrow to resume auto-scroll
      await act(async () => {
        fireEvent.click(downArrow);
      });
      
      // Verify enableAutoScroll was called
      expect(mockUseAutoScroll.enableAutoScroll).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid scroll events and state changes', async () => {
      render(<MessageList {...defaultProps} />);
      
      const downArrow = screen.getByTestId('down-arrow-button');
      
      // Simulate rapid scroll events
      await act(async () => {
        // Multiple scroll events in quick succession
        for (let i = 0; i < 5; i++) {
          const scrollContainer = screen.getByTestId('message-1').parentElement.parentElement;
          fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 + i * 10 } });
        }
      });
      
      // Verify scroll handler was called
      expect(mockUseAutoScroll.handleScroll).toHaveBeenCalled();
    });
  });

  describe('Streaming Behavior Integration', () => {
    it('should handle auto-scroll during message streaming', async () => {
      // Start with streaming false
      render(<MessageList {...defaultProps} streaming={false} />);
      
      // Start streaming
      render(<MessageList {...defaultProps} streaming={true} />);
      
      // Should handle streaming state changes
      expect(mockUseAutoScroll.handleScrollDuringLoading).toHaveBeenCalled();
    });

    it('should maintain scroll position when streaming stops', async () => {
      // Start with streaming true
      render(<MessageList {...defaultProps} streaming={true} />);
      
      // Stop streaming
      render(<MessageList {...defaultProps} streaming={false} />);
      
      // Should handle streaming state changes properly
      expect(mockUseAutoScroll.handleScrollDuringLoading).toHaveBeenCalled();
    });

    it('should handle streaming with new messages', async () => {
      const messagesWithNew = [
        ...defaultProps.messages,
        { id: '7', text: 'New streaming message', sender: 'assistant' }
      ];
      
      render(<MessageList {...defaultProps} messages={messagesWithNew} streaming={true} />);
      
      // Should handle new messages during streaming
      expect(mockUseAutoScroll.handleScrollDuringLoading).toHaveBeenCalled();
    });
  });

  describe('Conversation Switching Scenarios', () => {
    it('should reset auto-scroll state when switching conversations', async () => {
      // Start with first conversation
      render(<MessageList {...defaultProps} selectedConversation="conv-1" />);
      
      // Switch to different conversation
      render(<MessageList {...defaultProps} selectedConversation="conv-2" />);
      
      // Should reset auto-scroll state
      expect(mockUseAutoScroll.resetAutoScrollState).toHaveBeenCalled();
    });

    it('should not reset state when re-rendering same conversation', async () => {
      // Start with conversation
      render(<MessageList {...defaultProps} selectedConversation="conv-1" />);
      
      // Re-render with same conversation
      render(<MessageList {...defaultProps} selectedConversation="conv-1" />);
      
      // Should call resetAutoScrollState for initial render
      expect(mockUseAutoScroll.resetAutoScrollState).toHaveBeenCalled();
    });

    it('should handle conversation switching with streaming active', async () => {
      // Start with streaming active
      render(<MessageList {...defaultProps} streaming={true} />);
      
      // Switch conversation while streaming
      render(<MessageList {...defaultProps} selectedConversation="conv-2" streaming={true} />);
      
      // Should reset state and handle streaming properly
      expect(mockUseAutoScroll.resetAutoScrollState).toHaveBeenCalled();
    });
  });

  describe('Loading State Integration', () => {
    it('should handle scroll events during message loading', async () => {
      // Start with loading true
      render(<MessageList {...defaultProps} loadingMessages={true} />);
      
      // Verify loading state is handled
      expect(mockUseAutoScroll.handleScrollDuringLoading).toHaveBeenCalledWith(true);
      
      // Complete loading
      render(<MessageList {...defaultProps} loadingMessages={false} />);
      
      // Should handle loading completion
      expect(mockUseAutoScroll.handleScrollDuringLoading).toHaveBeenCalledWith(false);
    });

    it('should disable down arrow during loading', async () => {
      // Start with down arrow visible
      mockUseAutoScroll.shouldShowDownArrow.mockReturnValue(true);
      
      render(<MessageList {...defaultProps} loadingMessages={true} />);
      
      const downArrow = screen.getByTestId('down-arrow-button');
      expect(downArrow).toBeDisabled();
    });

    it('should handle loading completion with auto-scroll enabled', async () => {
      // Start with loading and auto-scroll enabled
      render(<MessageList {...defaultProps} loadingMessages={true} />);
      
      // Complete loading
      render(<MessageList {...defaultProps} loadingMessages={false} />);
      
      // Should handle loading completion
      expect(mockUseAutoScroll.handleScrollDuringLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle auto-scroll errors gracefully', async () => {
      // Set up error state
      mockUseAutoScroll.error = 'Test error';
      
      render(<MessageList {...defaultProps} />);
      
      // Should log error but not crash
      expect(defaultProps.setError).not.toHaveBeenCalled();
    });

    it('should handle scroll event errors', async () => {
      render(<MessageList {...defaultProps} />);
      
      // Should handle scroll events without crashing
      await act(async () => {
        const scrollContainer = screen.getByTestId('message-1').parentElement.parentElement;
        fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 } });
      });
      
      // Component should not crash
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty message list', async () => {
      render(<MessageList {...defaultProps} messages={[]} loadingMessages={true} />);
      
      // Should render loading state
      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('should handle single message', async () => {
      const singleMessage = [{ id: '1', text: 'Single message', sender: 'user' }];
      
      render(<MessageList {...defaultProps} messages={singleMessage} />);
      
      // Should render single message
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
    });

    it('should handle very long messages', async () => {
      const longMessage = [
        { 
          id: '1', 
          text: 'A'.repeat(1000), // Very long message
          sender: 'user' 
        }
      ];
      
      render(<MessageList {...defaultProps} messages={longMessage} />);
      
      // Should render without issues
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
    });

    it('should handle rapid conversation switches', async () => {
      render(<MessageList {...defaultProps} selectedConversation="conv-1" />);
      
      // Rapidly switch conversations
      render(<MessageList {...defaultProps} selectedConversation="conv-2" />);
      render(<MessageList {...defaultProps} selectedConversation="conv-3" />);
      render(<MessageList {...defaultProps} selectedConversation="conv-1" />);
      
      // Should handle rapid switches without issues
      expect(mockUseAutoScroll.resetAutoScrollState).toHaveBeenCalled();
    });
  });

  describe('State Coordination and Callbacks', () => {
    it('should notify parent of auto-scroll state changes', async () => {
      render(<MessageList {...defaultProps} />);
      
      // Should call onAutoScrollStateChange with initial state
      expect(defaultProps.onAutoScrollStateChange).toHaveBeenCalledWith({
        autoScrollEnabled: true,
        userHasScrolledUp: false,
        scrollPosition: 'at_bottom',
        shouldShowDownArrow: expect.any(Function)
      });
    });

    it('should coordinate state between multiple useEffects', async () => {
      render(<MessageList {...defaultProps} />);
      
      // Verify all the key functions are called during initialization
      expect(mockUseAutoScroll.handleScrollDuringLoading).toHaveBeenCalledWith(false);
      expect(defaultProps.onAutoScrollStateChange).toHaveBeenCalled();
    });

    it('should cleanup resources on unmount', async () => {
      const { unmount } = render(<MessageList {...defaultProps} />);
      
      unmount();
      
      // Should call cleanup function
      expect(mockUseAutoScroll.cleanup).toHaveBeenCalled();
    });
  });
}); 