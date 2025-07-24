import { gql } from "@apollo/client";
import client from "./apollo";
import { imageUploadService } from "./imageUploadService";

// Example queries - you can modify these based on your schema
export const GET_MESSAGES = gql`
  query GetMessages($conversationId: String!) {
    messages(conversationId: $conversationId) {
      id
      text
      sender
      timestamp
      hasImages
      images {
        id
        filename
        fileSize
        mimeType
        contentHash
        createdAt
        url
      }
    }
  }
`;

export const GET_CONVERSATIONS = gql`
  query GetConversations {
    conversations {
      conversations {
        id
        tabName
        llmModel
        isPrivate
        createdAt
        updatedAt
        messageCount
      }
      count
    }
  }
`;

export const GET_AVAILABLE_MODELS = gql`
  query GetAvailableModels {
    availableModels {
      models
      count
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($input: AddMessageInput!) {
    addMessage(input: $input) {
      message
      userMessage {
        id
        text
        sender
        timestamp
        hasImages
        images {
          id
          filename
          fileSize
          mimeType
          contentHash
          createdAt
        }
      }
      llmMessage {
        id
        text
        sender
        timestamp
        hasImages
        images {
          id
          filename
          fileSize
          mimeType
          contentHash
          createdAt
        }
      }
      llmModel
      error
      llmResponseTime
    }
  }
`;

export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($input: CreateConversationInput!) {
    createConversation(input: $input) {
      message
      conversation {
        id
        tabName
        llmModel
        isPrivate
        createdAt
        updatedAt
      }
    }
  }
`;

export const DELETE_CONVERSATION = gql`
  mutation DeleteConversation($conversationId: String!) {
    deleteConversation(conversationId: $conversationId) {
      message
      conversationId
      success
    }
  }
`;

export const DELETE_MESSAGES_AFTER = gql`
  mutation DeleteMessagesAfter($conversationId: ID!, $messageId: ID!) {
    deleteMessagesAfter(conversationId: $conversationId, messageId: $messageId) {
      message
      deletedCount
      success
    }
  }
`;

export const TERMINATE_STREAM = gql`
  mutation TerminateStream($input: TerminateStreamInput!) {
    terminateStream(input: $input) {
      success
      sessionId
      message
      partialResponse
      tokenCount
      finalStatus
      terminationReason
      error
    }
  }
`;

// Service class for GraphQL operations
class GraphQLService {
  // Generic query method
  async query(query, variables = {}) {
    try {
      const { data, error } = await client.query({
        query,
        variables,
        fetchPolicy: "network-only" // Don't use cache for real-time data
      });

      if (error) {
        throw new Error(`GraphQL Error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("GraphQL Query Error:", error);
      throw error;
    }
  }

  // Generic mutation method
  async mutate(mutation, variables = {}) {
    try {
      const { data, errors } = await client.mutate({
        mutation,
        variables
      });

      if (errors) {
        throw new Error(`GraphQL Errors: ${errors.map((e) => e.message).join(", ")}`);
      }

      return data;
    } catch (error) {
      console.error("GraphQL Mutation Error:", error);
      throw error;
    }
  }

  // Stream message with optional images using multipart form data
  async streamMessageWithImages(conversationId, text, images = [], llmModel = null, password = null) {
    try {
      // If no images, use regular GraphQL mutation
      if (!images || images.length === 0) {
        return this.sendMessage(conversationId, text, "user", password, llmModel);
      }

      // For images, use multipart form data to stream endpoint
      const formData = new FormData();
      formData.append('model', llmModel || 'qwen2.5vl:32b'); // Default to qwen2.5vl:32b for vision
      formData.append('message', text);
      formData.append('conversationId', conversationId);
      
      if (password) {
        formData.append('password', password);
      }

      // Add images to form data
      images.forEach((image, index) => {
        if (image.file) {
          formData.append('images', image.file);
        }
      });

      // Make the streaming request directly
      const response = await fetch(`${this.baseUrl}/api/stream-message`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Handle SSE response for real-time streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let sessionId = null;
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        
        if (value) {
          buffer += decoder.decode(value);
          // Split on double newlines (SSE event format)
          const events = buffer.split("\n\n");
          buffer = events.pop(); // last may be incomplete
          
          for (const event of events) {
            if (event.startsWith("data: ")) {
              try {
                const data = JSON.parse(event.slice(6));
                if (data.token) {
                  assistantText += data.token;
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            } else if (event.startsWith("event: session")) {
              try {
                const data = JSON.parse(event.split("data: ")[1] || "{}");
                sessionId = data.sessionId;
              } catch (parseError) {
                console.warn('Failed to parse session event:', parseError);
              }
            } else if (event.startsWith("event: end")) {
              done = true;
            } else if (event.startsWith("event: error")) {
              try {
                const data = JSON.parse(event.split("data: ")[1] || "{}");
                throw new Error(data.error || "Streaming error");
              } catch (parseError) {
                throw new Error("Streaming error");
              }
            }
          }
        }
      }

      return {
        success: true,
        responseText: assistantText,
        sessionId: sessionId,
        responseTime: Date.now()
      };

    } catch (error) {
      console.error("Stream Message with Images Error:", error);
      throw error;
    }
  }

  // Specific methods for your chat application
  async getMessages(conversationId) {
    return this.query(GET_MESSAGES, { conversationId });
  }

  async getConversations() {
    return this.query(GET_CONVERSATIONS);
  }

  async getAvailableModels() {
    return this.query(GET_AVAILABLE_MODELS);
  }

  async sendMessage(conversationId, text, sender = "user", password = null, llmModel = null) {
    const input = {
      conversationId,
      text,
      sender,
      password,
      llmModel
    };
    return this.mutate(SEND_MESSAGE, { input });
  }

  async createConversation(id, tabName, llmModel = null, password = null) {
    const input = {
      id,
      tabName,
      llmModel,
      password
    };
    return this.mutate(CREATE_CONVERSATION, { input });
  }

  async deleteConversation(conversationId) {
    return client.mutate({
      mutation: DELETE_CONVERSATION,
      variables: { conversationId }
    });
  }

  async deleteMessagesAfter(conversationId, messageId) {
    return this.mutate(DELETE_MESSAGES_AFTER, { conversationId, messageId });
  }

  async terminateStream(sessionId, conversationId, password = null, reason = null) {
    const input = {
      sessionId,
      conversationId,
      password,
      reason
    };
    return this.mutate(TERMINATE_STREAM, { input });
  }

  // Method to set authentication token
  setAuthToken(token) {
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }

  // Method to clear cache
  clearCache() {
    client.clearStore();
  }
}

// Export a singleton instance
export const graphQLService = new GraphQLService();

// Export the service class for testing or custom instances
export default GraphQLService;
