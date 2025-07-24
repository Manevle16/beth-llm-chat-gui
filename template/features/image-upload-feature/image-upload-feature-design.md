# Image Upload Feature Design Document

## Overview

This feature implements image upload functionality in the Beth LLM Chat GUI, enabling users to upload images and send them with text messages to vision-capable language models. The system integrates seamlessly with the existing chat infrastructure, maintaining backward compatibility while adding comprehensive image handling capabilities.

---

## Architecture

The system follows the existing React component architecture with modular services and hooks:

- **ImageUploadButton**: UI component for triggering image selection
- **ImagePreview**: Component for displaying selected images before sending
- **ImageMessageBubble**: Extended message bubble for displaying images in conversation history
- **ImageUploadService**: Service for handling image uploads and API communication
- **ImageHashService**: Service for generating and managing image hashes
- **useImageUpload**: Custom hook for managing image upload state and logic
- **ImageValidationService**: Service for validating image files and formats

---

## Components and Interfaces

### ImageUploadButton

```typescript
interface ImageUploadButtonProps {
  onImageSelect: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  acceptedTypes?: string[];
  maxSize?: number;
}
```

- Renders a plus button to the left of the text input
- Opens file picker dialog with image type filtering
- Handles file selection and validation
- Integrates with existing MessageInput component

### ImagePreview

```typescript
interface ImagePreviewProps {
  images: ImageData[];
  onRemove: (index: number) => void;
  maxHeight?: number;
  maxWidth?: number;
}
```

- Displays thumbnail previews of selected images
- Provides remove functionality for individual images
- Supports multiple image layout
- Positioned above the text input field

### ImageMessageBubble

```typescript
interface ImageMessageBubbleProps extends MessageBubbleProps {
  images?: ImageData[];
  onImageClick?: (image: ImageData) => void;
}
```

- Extends existing MessageBubble component
- Displays images above text content
- Handles image loading and error states
- Provides click-to-expand functionality

### ImageUploadService

```typescript
interface ImageUploadService {
  uploadImages(files: File[], conversationId: string, message: string, model: string): Promise<UploadResponse>;
  fetchImage(hash: string): Promise<Blob>;
  validateImage(file: File): ValidationResult;
  generateHash(file: File): Promise<string>;
}
```

- Handles multipart form data submission
- Manages image validation and processing
- Generates SHA-256 hashes for images
- Fetches images from server using hashes

### ImageHashService

```typescript
interface ImageHashService {
  generateHash(file: File): Promise<string>;
  constructImageUrl(hash: string): string;
  validateHash(hash: string): boolean;
}
```

- Generates SHA-256 hashes for image content
- Constructs image URLs for server requests
- Validates hash format and integrity

### useImageUpload

```typescript
interface UseImageUploadReturn {
  selectedImages: ImageData[];
  isUploading: boolean;
  uploadError: string | null;
  selectImages: (files: File[]) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
  uploadImages: (conversationId: string, message: string, model: string) => Promise<UploadResult>;
}
```

- Manages image selection state
- Handles upload process and error states
- Provides image manipulation functions
- Integrates with existing message sending flow

### ImageValidationService

```typescript
interface ImageValidationService {
  validateFile(file: File): ValidationResult;
  validateSize(file: File, maxSize: number): ValidationResult;
  validateType(file: File, allowedTypes: string[]): ValidationResult;
}
```

- Validates image file types (PNG, JPEG, WebP)
- Checks file size limits
- Provides detailed error messages
- Supports configurable validation rules

---

## Data Models

### ImageData

```typescript
interface ImageData {
  id: string;
  file: File;
  hash: string;
  preview: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}
```

### UploadResponse

```typescript
interface UploadResponse {
  success: boolean;
  messageId?: string;
  imageHashes?: string[];
  error?: string;
  responseTime?: number;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    size?: number;
    type?: string;
    maxSize?: number;
    allowedTypes?: string[];
  };
}
```

### MessageWithImages

```typescript
interface MessageWithImages extends Message {
  images?: ImageData[];
  imageHashes?: string[];
  hasImages: boolean;
}
```

---

## Integration Points

### MessageInput Component Integration

```typescript
// Enhanced MessageInput with image upload
const MessageInput = ({ 
  onSendMessage, 
  onImageUpload,  // New prop
  selectedImages, // New prop
  onImageSelect,  // New prop
  onImageRemove,  // New prop
  ...existingProps 
}) => {
  return (
    <div className="message-input-container">
      <ImageUploadButton 
        onImageSelect={onImageSelect}
        disabled={streaming}
        multiple={true}
      />
      <ImagePreview 
        images={selectedImages}
        onRemove={onImageRemove}
      />
      {/* Existing input and send button */}
    </div>
  );
};
```

### MessageBubble Component Extension

```typescript
// Enhanced MessageBubble with image support
const MessageBubble = ({ 
  msg, 
  images,  // New prop
  onImageClick, // New prop
  ...existingProps 
}) => {
  return (
    <div className="message-bubble">
      {images && images.length > 0 && (
        <div className="image-container">
          {images.map((image, index) => (
            <img 
              key={image.hash}
              src={image.preview}
              alt={image.name}
              onClick={() => onImageClick?.(image)}
              className="message-image"
            />
          ))}
        </div>
      )}
      {/* Existing message content */}
    </div>
  );
};
```

### GraphQL Service Integration

```typescript
// Enhanced GraphQL service with image support
const SEND_MESSAGE_WITH_IMAGES = gql`
  mutation SendMessageWithImages($input: SendMessageWithImagesInput!) {
    sendMessageWithImages(input: $input) {
      messageId
      imageHashes
      success
      error
    }
  }
`;

// Enhanced useGraphQL hook
const useGraphQL = () => {
  // ... existing code ...
  
  const sendMessageWithImages = useCallback(
    async (conversationId, text, images, model) => {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('message', text);
      formData.append('model', model);
      
      images.forEach((image, index) => {
        formData.append('images', image.file);
      });
      
      return await imageUploadService.uploadImages(formData);
    },
    []
  );
  
  return {
    // ... existing methods ...
    sendMessageWithImages
  };
};
```

---

## Error Handling

### Upload Errors

- **File Size Exceeded**: Show clear error message with size limit
- **Invalid File Type**: Display supported formats and allow reselection
- **Network Failures**: Preserve images and message for retry
- **Server Errors**: Show actionable error messages with retry options

### Display Errors

- **Image Load Failures**: Show placeholder with error icon
- **Hash Validation Errors**: Display fallback content
- **Missing Images**: Graceful degradation with error indicators

### Validation Errors

- **File Type Validation**: Real-time feedback during selection
- **Size Validation**: Immediate feedback before upload
- **Hash Generation Errors**: Retry logic with user notification

---

## State Management

### Image Upload State

```typescript
interface ImageUploadState {
  selectedImages: ImageData[];
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  lastUploadTime: Date | null;
}
```

### Conversation State Enhancement

```typescript
interface ConversationState {
  // ... existing properties ...
  messagesWithImages: MessageWithImages[];
  imageCache: Map<string, string>; // hash -> preview URL
}
```

---

## Performance Considerations

### Image Optimization

- **Thumbnail Generation**: Create previews at appropriate sizes
- **Lazy Loading**: Load images only when needed
- **Caching**: Cache image previews and fetched images
- **Compression**: Optimize image quality vs size

### Memory Management

- **File Cleanup**: Remove temporary files after upload
- **Preview Cleanup**: Clear preview URLs when no longer needed
- **Cache Limits**: Implement LRU cache for image storage

### Network Optimization

- **Concurrent Uploads**: Handle multiple images efficiently
- **Retry Logic**: Implement exponential backoff for failed uploads
- **Progress Tracking**: Show upload progress to users

---

## Security Considerations

### File Validation

- **Type Checking**: Validate MIME types and file extensions
- **Size Limits**: Enforce maximum file size restrictions
- **Content Scanning**: Basic malware scanning (if applicable)
- **Path Traversal**: Prevent directory traversal attacks

### Access Control

- **Conversation Ownership**: Verify user owns conversation before upload
- **Image Access**: Validate hash-based access to images
- **Session Validation**: Ensure valid user session for uploads

---

## Testing Strategy

### Unit Testing

- Image validation logic
- Hash generation and validation
- File type detection
- Error handling scenarios

### Component Testing

- ImageUploadButton functionality
- ImagePreview rendering
- MessageBubble with images
- Upload flow integration

### Integration Testing

- End-to-end upload process
- API integration with backend
- Error recovery scenarios
- Performance under load

### Manual Testing

- File picker functionality
- Image preview display
- Upload progress indication
- Error message clarity

---

## Implementation Notes

### File Handling

- Use `FileReader` API for preview generation
- Implement proper cleanup of object URLs
- Handle large files with streaming uploads
- Support drag-and-drop functionality

### API Integration

- Use `FormData` for multipart uploads
- Maintain existing SSE streaming for responses
- Handle both JSON and multipart responses
- Implement proper error handling for API failures

### UI/UX Considerations

- Maintain existing design patterns
- Provide clear loading states
- Show upload progress indicators
- Implement responsive image layouts

---

## Environment Configuration

### Required Environment Variables

```bash
# Image upload configuration
REACT_APP_MAX_IMAGE_SIZE_MB=10
REACT_APP_ALLOWED_IMAGE_TYPES=image/png,image/jpeg,image/webp
REACT_APP_IMAGE_PREVIEW_MAX_HEIGHT=300
REACT_APP_IMAGE_PREVIEW_MAX_WIDTH=200

# API configuration
REACT_APP_STREAM_MESSAGE_ENDPOINT=/api/stream-message
REACT_APP_IMAGE_SERVE_ENDPOINT=/api/images
```

### Feature Flags

```typescript
interface FeatureFlags {
  imageUpload: {
    enabled: boolean;
    maxFileSize: number;
    allowedTypes: string[];
    maxImagesPerMessage: number;
  };
}
```

---

## Migration Strategy

### Backward Compatibility

- Maintain existing message sending functionality
- Gracefully handle messages without images
- Preserve existing UI layout and styling
- Support gradual rollout with feature flags

### Data Migration

- No database changes required (handled by backend)
- Existing messages remain unchanged
- New image fields are optional
- Gradual adoption of image features

---

## Monitoring and Observability

### Metrics to Track

- Upload success/failure rates
- Image processing times
- File size distributions
- Error frequency by type
- User adoption rates

### Logging

- Upload attempts and results
- Validation failures
- API response times
- Error conditions with context
- Performance metrics

---

## Future Enhancements

### Potential Improvements

- **Drag and Drop**: Support drag-and-drop image uploads
- **Image Editing**: Basic image cropping and resizing
- **Batch Upload**: Multiple image selection interface
- **Image Search**: Search through uploaded images
- **Advanced Preview**: Lightbox-style image viewing

### Scalability Considerations

- **CDN Integration**: Use CDN for image serving
- **Image Optimization**: Automatic compression and resizing
- **Caching Strategy**: Implement intelligent caching
- **Load Balancing**: Distribute image processing load

---

> 🔧 Tip: This design integrates seamlessly with the existing React component architecture and maintains all existing functionality while adding comprehensive image support.
> 📌 The implementation follows established patterns in the codebase and leverages existing services where possible.
> ✅ All components are designed to be backward compatible and can be gradually adopted. 