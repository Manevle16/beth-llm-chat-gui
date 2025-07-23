import { SCROLL_POSITION, AUTO_SCROLL_CONFIG } from '../types/autoScroll';

/**
 * Utility functions for scroll position calculations and auto-scroll logic
 * Optimized for performance to prevent typing lag
 */

/**
 * Calculate if the scroll container is at the bottom
 * @param {number} scrollTop - Current scroll top position
 * @param {number} scrollHeight - Total scrollable content height
 * @param {number} clientHeight - Visible container height
 * @returns {boolean} - True if at bottom
 */
export const isAtBottom = (scrollTop, scrollHeight, clientHeight) => {
  const threshold = AUTO_SCROLL_CONFIG.SCROLL_THRESHOLD;
  return scrollHeight - scrollTop - clientHeight <= threshold;
};

/**
 * Calculate if the scroll container is at the top
 * @param {number} scrollTop - Current scroll top position
 * @returns {boolean} - True if at top
 */
export const isAtTop = (scrollTop) => {
  return scrollTop <= 0;
};

/**
 * Determine scroll position state based on current scroll metrics
 * @param {number} scrollTop - Current scroll top position
 * @param {number} scrollHeight - Total scrollable content height
 * @param {number} clientHeight - Visible container height
 * @param {number} lastScrollTop - Previous scroll top position
 * @returns {string} - Scroll position state
 */
export const getScrollPositionState = (scrollTop, scrollHeight, clientHeight, lastScrollTop) => {
  if (isAtBottom(scrollTop, scrollHeight, clientHeight)) {
    return SCROLL_POSITION.AT_BOTTOM;
  }
  
  if (scrollTop < lastScrollTop) {
    return SCROLL_POSITION.SCROLLING_DOWN;
  }
  
  return SCROLL_POSITION.SCROLLED_UP;
};

/**
 * Check if user has manually scrolled up (not auto-scroll)
 * @param {number} scrollTop - Current scroll top position
 * @param {number} lastScrollTop - Previous scroll top position
 * @param {boolean} isAutoScrolling - Whether this scroll was triggered by auto-scroll
 * @returns {boolean} - True if user manually scrolled up
 */
export const hasUserScrolledUp = (scrollTop, lastScrollTop, isAutoScrolling) => {
  // If we're not at the very bottom and scroll position decreased, user likely scrolled up
  // We need to be more lenient during streaming to catch user scrolls
  const scrollDifference = lastScrollTop - scrollTop;
  const significantScroll = scrollDifference > 10; // Minimum scroll distance to consider intentional
  
  // User scrolled up if:
  // 1. Scroll position decreased significantly, OR
  // 2. We're not auto-scrolling and scroll position decreased
  return significantScroll || (!isAutoScrolling && scrollTop < lastScrollTop);
};

/**
 * Optimized debounce function for scroll events
 * Uses requestAnimationFrame for better performance
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  let animationFrameId;
  
  return (...args) => {
    // Clear existing timeout and animation frame
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Use requestAnimationFrame for immediate execution, then debounce
    animationFrameId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        func.apply(null, args);
      }, delay);
    });
  };
};

/**
 * Throttled debounce function for high-frequency events
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, delay) => {
  let lastCall = 0;
  let timeoutId;
  
  return (...args) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(null, args);
    } else {
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Schedule call for remaining time
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func.apply(null, args);
      }, delay - (now - lastCall));
    }
  };
};

/**
 * Smooth scroll to bottom of container
 * Optimized to use requestAnimationFrame
 * @param {HTMLElement} element - Element to scroll
 * @param {string} behavior - Scroll behavior ('smooth' or 'auto')
 */
export const scrollToBottom = (element, behavior = 'smooth') => {
  if (element) {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: behavior
      });
    });
  }
};

/**
 * Get scroll metrics from an element
 * Optimized to cache DOM queries
 * @param {HTMLElement} element - Element to get metrics from
 * @returns {Object} - Scroll metrics object
 */
export const getScrollMetrics = (element) => {
  if (!element) {
    return {
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0
    };
  }
  
  // Cache the properties to avoid multiple DOM queries
  const scrollTop = element.scrollTop;
  const scrollHeight = element.scrollHeight;
  const clientHeight = element.clientHeight;
  
  return {
    scrollTop,
    scrollHeight,
    clientHeight
  };
};

/**
 * Check if scroll event should be processed
 * Optimized to skip unnecessary processing
 * @param {Event} event - Scroll event
 * @param {number} lastScrollTop - Previous scroll top position
 * @returns {boolean} - True if event should be processed
 */
export const shouldProcessScrollEvent = (event, lastScrollTop) => {
  if (!event || !event.target) return false;
  
  const currentScrollTop = event.target.scrollTop;
  
  // Skip if scroll position hasn't changed significantly
  return Math.abs(currentScrollTop - lastScrollTop) > 1;
}; 