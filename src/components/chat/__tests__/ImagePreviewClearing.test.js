import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPanel from '../ChatPanel';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the useImageUpload hook
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
    streamingMessages: [],
    setStreamingMessages: jest.fn(),
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
    onAutoScrollStateChange: jest.fn(),
    setStreaming: jest.fn(),
    setCurrentSessionId: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears both text input and images after successfully sending message with images', async () => {
    // Mock successful fetch response
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn().mockResolvedValue({
            done: true,
            value: new Uint8Array([100, 97, 116, 97, 58, 32, 123, 34, 116, 111, 107, 101, 110, 34, 58, 32, 34, 72, 101, 108, 108, 111, 34, 125, 10, 10, 101, 118, 101, 110, 116, 58, 32, 101, 110, 100, 10, 100, 97, 116, 97, 58, 32, 123, 125, 10, 10])
          })
        })
      }
    };
    mockFetch.mockResolvedValue(mockResponse);
    
    render(<ChatPanel {...defaultProps} />);
    
    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);

    await waitFor(() => {
      // Verify that fetch was called with the correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://localhost:3443/api/stream-message',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
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
    const errorMessage = 'Network request failed';
    mockFetch.mockRejectedValueOnce(new Error(errorMessage));
    
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