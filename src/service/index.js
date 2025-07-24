// Export Apollo client
export { default as client } from "./apollo";

// Export GraphQL service
export { default as GraphQLService, graphQLService } from "./graphqlService";

// Export React hook
export { useGraphQL } from "./useGraphQL";

// Export common queries and mutations
export { GET_MESSAGES, GET_CONVERSATIONS, SEND_MESSAGE, CREATE_CONVERSATION } from "./graphqlService";

// Export Image Upload services
export { default as ImageUploadService, imageUploadService } from "./imageUploadService";
export { default as ImageHashService, imageHashService } from "./imageHashService";
export { default as ImageValidationService, imageValidationService } from "./imageValidationService";
