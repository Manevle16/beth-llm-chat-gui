# Image Upload Feature Requirements

## Introduction

This document outlines requirements for the Image Upload feature in the Beth LLM Chat GUI. The feature enables users to upload images and send them with text messages to vision-capable language models through the existing stream message API.

---

## Requirements

### Requirement 1: Image Upload Button

**User Story:**  
As a **chat user**, I want **a plus button next to the text input** so that **I can easily upload images to include in my messages**.

#### Acceptance Criteria

1. WHEN **the user is in a conversation** THEN the system SHALL **display a plus button to the left of the text input field**
2. WHEN **the plus button is clicked** THEN the system SHALL **open a file picker dialog for image selection**
3. WHEN **the file picker opens** THEN the system SHALL **filter to show only image files (PNG, JPEG, WebP)**
4. IF **no image is selected** THEN the system SHALL **return to the previous state without changes**
5. IF **an invalid file type is selected** THEN the system SHALL **show an error message and allow reselection**
6. WHEN **the system starts up** THEN it SHALL **not display any image preview until an image is selected**
7. IF **the system is restarted** THEN the system SHALL **clear any previously selected images from memory**

---

### Requirement 2: Image Preview Display

**User Story:**  
As a **chat user**, I want **to see a preview of my selected image** so that **I can confirm it's the correct image before sending**.

#### Acceptance Criteria

1. WHEN **an image is successfully selected** THEN the system SHALL **display a small preview above the text input field**
2. WHEN **the preview is displayed** THEN the system SHALL **show the image in a thumbnail format (max 300px height)**
3. WHEN **the preview is shown** THEN the system SHALL **include a remove button (X) to clear the selection**
4. WHEN **the remove button is clicked** THEN the system SHALL **clear the image from memory and hide the preview**
5. IF **the image fails to load** THEN the system SHALL **show an error message and allow reselection**
6. WHEN **the preview is displayed** THEN the system SHALL **maintain the text input functionality for typing messages**
7. IF **multiple images are selected** THEN the system SHALL **display previews for all selected images in a horizontal layout**

---

### Requirement 3: Image and Message Submission

**User Story:**  
As a **chat user**, I want **to send both my image and text message together** so that **the vision model can process the image with my question**.

#### Acceptance Criteria

1. WHEN **the send button is clicked with an image selected** THEN the system SHALL **send both the image and text message to the stream message API**
2. WHEN **the submission is successful** THEN the system SHALL **clear the image preview and remove the image from local memory**
3. WHEN **the submission is successful** THEN the system SHALL **reset the text input field to empty**
4. IF **the submission fails** THEN the system SHALL **keep the image preview and text message for retry**
5. IF **the submission fails** THEN the system SHALL **display an error message to the user**
6. WHEN **the system is streaming a response** THEN the system SHALL **still allow image upload functionality while streaming** BUT will not allow sending until stream has stopped or finished

---

### Requirement 4: API Integration

**User Story:**  
As a **chat user**, I want **my image uploads to work seamlessly with the existing chat system** so that **I can use vision models without changing my workflow**.

#### Acceptance Criteria

1. WHEN **an image is submitted** THEN the system SHALL **use the existing `/api/stream-message` endpoint with multipart form data**
2. WHEN **the API request is made** THEN the system SHALL **include the conversation ID, model, message text, and image file**
3. WHEN **the API responds** THEN the system SHALL **handle the Server-Sent Events (SSE) stream as with regular text messages**
4. IF **the API returns an error** THEN the system SHALL **display the error message and allow the user to retry**
5. IF **the vision model is not available** THEN the system SHALL **show a message indicating vision is not supported for the selected model**
6. WHEN **the image is successfully processed** THEN the system SHALL **display the response in the message list as a regular message**
7. IF **the image file is too large** THEN the system SHALL **show an error message before attempting to upload**

---

### Requirement 5: Image Display in Message List

**User Story:**  
As a **chat user**, I want **to see uploaded images in the conversation history** so that **I can reference previous images and understand the context of past conversations**.

#### Acceptance Criteria

1. WHEN **a message with an image is sent** THEN the system SHALL **display the image above the text in the message bubble**
2. WHEN **a conversation loads with image messages in its history** THEN the system SHALL **render all images in their respective message bubbles**
3. WHEN **an image is displayed in a message bubble** THEN the system SHALL **show it as a thumbnail (max 200px width)**
4. WHEN **an image is displayed** THEN the system SHALL **maintain the existing message bubble styling and layout**
5. IF **an image fails to load from the server** THEN the system SHALL **show a placeholder with an error icon**
6. WHEN **multiple images are in a single message** THEN the system SHALL **display them in a horizontal grid layout**
7. IF **the image is very large** THEN the system SHALL **provide a click-to-expand functionality for full-size viewing**

---

### Requirement 6: Image Hashing and Storage

**User Story:**  
As a **chat user**, I want **my uploaded images to be properly stored and retrieved** so that **I can access them reliably from the database**.

#### Acceptance Criteria

1. WHEN **an image is uploaded** THEN the system SHALL **generate a SHA-256 hash of the image content**
2. WHEN **the image is sent to the API** THEN the system SHALL **include the image hash in the request metadata**
3. WHEN **the API response is received** THEN the system SHALL **extract image hashes from the response for storage**
4. WHEN **a conversation loads with image messages** THEN the system SHALL **use image hashes to fetch images from the server**
5. WHEN **an image hash is received** THEN the system SHALL **construct the image URL using the hash (e.g., `/api/images/{hash}`)**
6. IF **an image hash is missing or invalid** THEN the system SHALL **show an error placeholder in the message bubble**
7. WHEN **multiple images are in a message** THEN the system SHALL **handle multiple hashes and fetch all corresponding images**

---

### Requirement 7: User Experience and Error Handling

**User Story:**  
As a **chat user**, I want **clear feedback and error handling for image uploads** so that **I understand what's happening and can resolve issues**.

#### Acceptance Criteria

1. WHEN **an image is being uploaded** THEN the system SHALL **show a loading indicator on the send button**
2. WHEN **an image upload is in progress** THEN the system SHALL **disable the send button to prevent multiple submissions**
3. IF **the image file exceeds the size limit** THEN the system SHALL **show a clear error message with the size limit**
4. IF **the image format is not supported** THEN the system SHALL **show a list of supported formats**
5. WHEN **an error occurs** THEN the system SHALL **provide actionable error messages with retry options**
6. IF **the network connection fails** THEN the system SHALL **preserve the image and message for retry when connection is restored**
7. WHEN **the user switches conversations** THEN the system SHALL **clear any selected images from the previous conversation**

---

> 🔧 Tip: The image upload feature integrates with the existing chat infrastructure and maintains backward compatibility.  
> 📌 All acceptance criteria are testable and specific to the GUI implementation.  
> ✅ The feature leverages the existing stream message API and follows the established UI patterns. 