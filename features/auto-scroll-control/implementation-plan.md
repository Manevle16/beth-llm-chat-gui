Can you create a plan based of what files are missing tests and are needed and seperate them out in sections so they are listed in steps similar to the provided template?
# Auto-Scroll Control Feature Implementation Plan

**Feature Description**: Stop auto-scrolling to LLM messages when user manually scrolls up, and show a down arrow icon near the bottom to resume auto-scrolling.

---

- [x] **1. Extend data models and types**
  - Add `autoScrollEnabled` boolean state to track if auto-scroll should be active
  - Add `userHasScrolledUp` boolean state to track if user has manually scrolled
  - Add scroll position tracking state for detecting manual scroll events
  - _Linked Requirements: REQ-1 (User scroll detection), REQ-2 (Auto-scroll state management)_

- [x] **2. Implement scroll detection and state management**
  - Create scroll event handlers in MessageList component
  - Implement logic to detect when user scrolls up vs. auto-scroll behavior
  - Add state management for auto-scroll enabled/disabled status
  - Write unit tests for scroll detection logic
  - _Linked Requirements: REQ-1, REQ-2, REQ-3 (Scroll event handling)_

- [x] **3. Modify auto-scroll behavior**
  - Update existing auto-scroll logic to respect the `autoScrollEnabled` state
  - Ensure auto-scroll only triggers when enabled and new messages arrive
  - Maintain smooth scrolling behavior when re-enabled
  - _Linked Requirements: REQ-2, REQ-4 (Conditional auto-scroll)_

- [x] **4. Add down arrow UI component**
  - Create a floating down arrow button component
  - Position it near the bottom-right of the message list
  - Show/hide based on `userHasScrolledUp` and `autoScrollEnabled` states
  - Add smooth animations for appearance/disappearance
  - _Linked Requirements: REQ-5 (UI component), REQ-6 (Visual feedback)_

- [x] **5. Implement scroll-to-bottom functionality**
  - Add click handler to down arrow that scrolls to bottom
  - Re-enable auto-scroll when user clicks the arrow
  - Ensure smooth scrolling animation to bottom
  - _Linked Requirements: REQ-6, REQ-7 (User control)_

- [x] **6. Integrate with existing message streaming**
  - Ensure auto-scroll state resets appropriately when new conversations start
  - Handle auto-scroll behavior during message streaming
  - Maintain scroll position during message loading
  - _Linked Requirements: REQ-8 (Streaming integration)_

- [x] **7. Add error handling and edge cases**
  - Handle scroll events during message loading states
  - Ensure proper behavior when switching between conversations
  - Add fallback behavior for edge cases
  - _Linked Requirements: REQ-9 (Error handling)_

- [x] **8. Write integration tests**
  - Test full user flow: scroll up → see arrow → click arrow → resume auto-scroll
  - Test behavior during message streaming
  - Test conversation switching scenarios
  - _Linked Requirements: REQ-10 (Integration testing)_

---

> ✅ **Components to Modify**: 
> - `MessageList.jsx` - Add scroll detection and down arrow component
> - `ChatPanel.jsx` - Pass auto-scroll state management
> - New component: `DownArrowButton.jsx` - Floating scroll-to-bottom button
>
> 🎯 **Goal**: Provide intuitive control over auto-scroll behavior while maintaining smooth user experience during message streaming. 