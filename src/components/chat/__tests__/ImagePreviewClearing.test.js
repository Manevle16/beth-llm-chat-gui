import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPanel from '../ChatPanel';

// Mock the useImageUpload hook
const mockSendMessageWithImages = jest.fn().mockResolvedValue({ success: true });
const mockClearImages = jest.fn();

jest.mock('../../../hooks/useImageUpload', () => ({
  useImageUpload: () => ({
    selectedImages: [
      {
        id: 'img-1',
        file: { name: 'test.jpg', type: 'image/jpeg', size: 1024 },
        name: 'test.jpg',
        preview: 'data:image/jpeg;base64,test',
        size: 1024
      }
    ],
    uploadState: 'IDLE',
    selectImages: jest.fn(),
    removeImage: jest.fn(),
    sendMessageWithImages: mockSendMessageWithImages,
    clearImages: mockClearImages
  })
}));

// Mock the MessageList component
jest.mock('../MessageList', () => {
  return function MockMessageList() {
    return <div data-testid="message-list">Message List</div>;
  };
});

// Mock the MessageInput component
jest.mock('../MessageInput', () => {
  return function MockMessageInput({ onSendMessage, selectedImages }) {
    return (
      <div data-testid="message-input">
        <button onClick={onSendMessage} data-testid="send-button">
          Send
        </button>
        <div data-testid="selected-images-count">
          {selectedImages ? selectedImages.length : 0}
        </div>
      </div>
    );
  };
});

// Mock the DownArrowButton component
jest.mock('../DownArrowButton', () => {
  return function MockDownArrowButton() {
    return <div data-testid="down-arrow-button">Down Arrow</div>;
  };
});

describe('Image Preview Clearing', () => {
  const defaultProps = {
    messages: [],
    setMessages: jest.fn(),
    loadingMessages: false,
    streaming: false,
    error: null,
    onSendMessage: jest.fn(),
    newMessage: 'test message with image',
    setNewMessage: jest.fn(),
    messagesEndRef: { current: null },
    selectedConversation: 'test-conversation',
    currentConversation: { id: 'test-conversation', llmModel: 'qwen2.5vl:32b' },
    deleteMessagesAfter: jest.fn(),
    loadMessages: jest.fn(),
    setError: jest.fn(),
    onTerminateStream: jest.fn(),
    currentSessionId: null,
    onAutoScrollStateChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears both text input and images after successfully sending message with images', async () => {
    render(<ChatPanel {...defaultProps} />);
    
    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);

    await waitFor(() => {
      // Verify that sendMessageWithImages was called
      expect(mockSendMessageWithImages).toHaveBeenCalledWith(
        'test-conversation',
        'test message with image',
        'qwen2.5vl:32b'
      );
      
      // Verify that text input was cleared
      expect(defaultProps.setNewMessage).toHaveBeenCalledWith('');
      
      // Verify that images were cleared
      expect(mockClearImages).toHaveBeenCalled();
    });
  });

  it('shows correct number of selected images initially', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByTestId('selected-images-count')).toHaveTextContent('1');
  });

  it('clears text input and images immediately when sending, even if it fails', async () => {
    const errorMessage = 'Upload failed';
    mockSendMessageWithImages.mockRejectedValueOnce(new Error(errorMessage));
    
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ChatPanel {...defaultProps} />);
    
    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);

    await waitFor(() => {
      // Verify that error was set
      expect(defaultProps.setError).toHaveBeenCalledWith(errorMessage);
      
      // Verify that text input was cleared immediately (optimistic UI)
      expect(defaultProps.setNewMessage).toHaveBeenCalledWith('');
      
      // Verify that images were cleared immediately (optimistic UI)
      expect(mockClearImages).toHaveBeenCalled();
      
      // Verify that messages were added to UI
      expect(defaultProps.setMessages).toHaveBeenCalled();
    });
    
    consoleSpy.mockRestore();
  });


}); 