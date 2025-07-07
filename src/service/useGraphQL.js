import { useState, useCallback } from "react";
import {
  graphQLService,
  GET_MESSAGES,
  GET_CONVERSATIONS,
  SEND_MESSAGE,
  CREATE_CONVERSATION,
  DELETE_CONVERSATION
} from "./graphqlService";

export const useGraphQL = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeQuery = useCallback(async (query, variables = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await graphQLService.query(query, variables);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeMutation = useCallback(async (mutation, variables = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await graphQLService.mutate(mutation, variables);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    executeQuery,
    executeMutation,
    clearError,
    // Convenience methods
    getMessages: useCallback(
      async (conversationId) => {
        return executeQuery(GET_MESSAGES, { conversationId });
      },
      [executeQuery]
    ),

    getConversations: useCallback(async () => {
      return executeQuery(GET_CONVERSATIONS);
    }, [executeQuery]),

    sendMessage: useCallback(
      async (conversationId, text, sender = "user", password = null, llmModel = null) => {
        const input = {
          conversationId,
          text,
          sender,
          password,
          llmModel
        };
        return executeMutation(SEND_MESSAGE, { input });
      },
      [executeMutation]
    ),

    createConversation: useCallback(
      async (id, tabName, llmModel = null, password = null) => {
        const input = {
          id,
          tabName,
          llmModel,
          password
        };
        return executeMutation(CREATE_CONVERSATION, { input });
      },
      [executeMutation]
    ),
    deleteConversation: useCallback(async (conversationId) => {
      return graphQLService.deleteConversation(conversationId);
    }, []),
    deleteMessagesAfter: useCallback(async (conversationId, messageId) => {
      return graphQLService.deleteMessagesAfter(conversationId, messageId);
    }, []),
    getAvailableModels: useCallback(async () => {
      return graphQLService.getAvailableModels();
    }, [])
  };
};
