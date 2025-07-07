# GraphQL Service Documentation

This directory contains a complete Apollo GraphQL service setup for the chat GUI application.

## Files Overview

- `apollo.js` - Apollo Client configuration with error handling and authentication
- `graphqlService.js` - Service class with GraphQL operations and queries/mutations
- `useGraphQL.js` - React hook for easy GraphQL integration
- `index.js` - Export file for all services
- `GraphQLExample.jsx` - Example component showing usage

## Setup

1. **Environment Variables**: Set your GraphQL endpoint in `.env`:
   ```
   REACT_APP_GRAPHQL_URL=http://localhost:4000/graphql
   ```

2. **Authentication**: The service automatically handles Bearer token authentication from localStorage:
   ```javascript
   // Set auth token
   graphQLService.setAuthToken('your-jwt-token');
   
   // Clear auth token
   graphQLService.setAuthToken(null);
   ```

## Usage Examples

### Using the React Hook (Recommended)

```jsx
import React from 'react';
import { useGraphQL } from '../service/useGraphQL';

const MyComponent = () => {
  const { 
    loading, 
    error, 
    getMessages, 
    sendMessage,
    clearError 
  } = useGraphQL();

  const handleSendMessage = async () => {
    try {
      const result = await sendMessage('conversation-id', 'Hello world!');
      console.log('Message sent:', result);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
};
```

### Using the Service Directly

```javascript
import { graphQLService } from '../service/graphqlService';

// Query data
const conversations = await graphQLService.getConversations();

// Send mutation
const newMessage = await graphQLService.sendMessage('conversation-id', 'Hello!');

// Custom query
import { gql } from '@apollo/client';

const CUSTOM_QUERY = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

const userData = await graphQLService.query(CUSTOM_QUERY, { id: 'user-123' });
```

### Using Apollo Client Directly

```javascript
import { client } from '../service/apollo';
import { gql } from '@apollo/client';

const QUERY = gql`
  query GetData {
    someData {
      id
      name
    }
  }
`;

// Query
const { data } = await client.query({ query: QUERY });

// Mutation
const MUTATION = gql`
  mutation UpdateData($id: ID!, $name: String!) {
    updateData(id: $id, name: $name) {
      id
      name
    }
  }
`;

const { data } = await client.mutate({ 
  mutation: MUTATION, 
  variables: { id: '123', name: 'New Name' } 
});
```

## Available Queries and Mutations

The service includes predefined operations for common chat functionality:

### Queries
- `GET_MESSAGES(conversationId)` - Get messages for a conversation
- `GET_CONVERSATIONS()` - Get all conversations

### Mutations
- `SEND_MESSAGE(conversationId, content)` - Send a new message
- `CREATE_CONVERSATION(title)` - Create a new conversation

## Error Handling

The service includes comprehensive error handling:

- GraphQL errors are logged to console
- Network errors are handled gracefully
- React hook provides error state management
- Error clearing functionality

## Caching

Apollo Client provides automatic caching. You can:

- Clear the cache: `graphQLService.clearCache()`
- Configure cache policies in `apollo.js`
- Use `fetchPolicy` options for different caching strategies

## Customization

### Adding New Queries/Mutations

1. Add the GraphQL operation to `graphqlService.js`:
   ```javascript
   export const NEW_QUERY = gql`
     query NewQuery($param: String!) {
       someData(param: $param) {
         id
         name
       }
     }
   `;
   ```

2. Add a method to the GraphQLService class:
   ```javascript
   async newQuery(param) {
     return this.query(NEW_QUERY, { param });
   }
   ```

3. Add to the React hook:
   ```javascript
   newQuery: useCallback(async (param) => {
     return executeQuery(graphQLService.newQuery, { param });
   }, [executeQuery]),
   ```

### Configuration

Modify `apollo.js` to:
- Change the GraphQL endpoint
- Add custom headers
- Configure cache policies
- Add middleware for logging, etc.

## Testing

The service is designed to be easily testable:

```javascript
import GraphQLService from '../service/graphqlService';

// Create a test instance
const testService = new GraphQLService();

// Mock the Apollo client for testing
jest.mock('./apollo', () => ({
  query: jest.fn(),
  mutate: jest.fn(),
}));
``` 