// Export Apollo client
export { default as client } from "./apollo";

// Export GraphQL service
export { default as GraphQLService, graphQLService } from "./graphqlService";

// Export React hook
export { useGraphQL } from "./useGraphQL";

// Export common queries and mutations
export { GET_MESSAGES, GET_CONVERSATIONS, SEND_MESSAGE, CREATE_CONVERSATION } from "./graphqlService";
