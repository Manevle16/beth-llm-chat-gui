import { AUTO_SCROLL_ACTIONS, SCROLL_POSITION } from '../../types/autoScroll';

/**
 * Action creators for auto-scroll state management
 */

// Set auto-scroll enabled/disabled state
export const setAutoScrollEnabled = (enabled) => ({
  type: AUTO_SCROLL_ACTIONS.SET_AUTO_SCROLL_ENABLED,
  payload: enabled
});

// Set user has scrolled up state
export const setUserScrolledUp = (hasScrolledUp) => ({
  type: AUTO_SCROLL_ACTIONS.SET_USER_SCROLLED_UP,
  payload: hasScrolledUp
});

// Set scroll position state
export const setScrollPosition = (position) => ({
  type: AUTO_SCROLL_ACTIONS.SET_SCROLL_POSITION,
  payload: position
});

// Update scroll position tracking data
export const updateScrollPosition = (scrollData) => ({
  type: AUTO_SCROLL_ACTIONS.UPDATE_SCROLL_POSITION,
  payload: scrollData
});

// Reset auto-scroll state to initial values
export const resetAutoScrollState = () => ({
  type: AUTO_SCROLL_ACTIONS.RESET_AUTO_SCROLL_STATE
});

// Helper action to enable auto-scroll and scroll to bottom
export const enableAutoScroll = () => (dispatch) => {
  dispatch(setAutoScrollEnabled(true));
  dispatch(setUserScrolledUp(false));
  dispatch(setScrollPosition(SCROLL_POSITION.AT_BOTTOM));
};

// Helper action to disable auto-scroll when user scrolls up
export const disableAutoScroll = () => (dispatch) => {
  dispatch(setAutoScrollEnabled(false));
  dispatch(setUserScrolledUp(true));
  dispatch(setScrollPosition(SCROLL_POSITION.SCROLLED_UP));
}; 