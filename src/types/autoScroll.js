/**
 * Auto-scroll control types and interfaces
 */

// Auto-scroll state interface
export const AUTO_SCROLL_STATE = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  RESETTING: 'resetting'
};

// Scroll position tracking interface
export const SCROLL_POSITION = {
  AT_BOTTOM: 'at_bottom',
  SCROLLED_UP: 'scrolled_up',
  SCROLLING_DOWN: 'scrolling_down'
};

// Auto-scroll configuration interface
export const AUTO_SCROLL_CONFIG = {
  SCROLL_THRESHOLD: 50, // pixels from bottom to consider "at bottom"
  DEBOUNCE_DELAY: 8, // ms to debounce scroll events (reduced for maximum responsiveness)
  ANIMATION_DURATION: 300 // ms for smooth scroll animations
};

// Action types for auto-scroll state management
export const AUTO_SCROLL_ACTIONS = {
  SET_AUTO_SCROLL_ENABLED: 'SET_AUTO_SCROLL_ENABLED',
  SET_USER_SCROLLED_UP: 'SET_USER_SCROLLED_UP',
  SET_SCROLL_POSITION: 'SET_SCROLL_POSITION',
  RESET_AUTO_SCROLL_STATE: 'RESET_AUTO_SCROLL_STATE',
  UPDATE_SCROLL_POSITION: 'UPDATE_SCROLL_POSITION'
};

// Auto-scroll state interface
export const createAutoScrollState = () => ({
  autoScrollEnabled: true,
  userHasScrolledUp: false,
  scrollPosition: SCROLL_POSITION.AT_BOTTOM,
  lastScrollTop: 0,
  scrollContainerHeight: 0,
  scrollContentHeight: 0
}); 