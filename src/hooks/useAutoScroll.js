import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  SCROLL_POSITION, 
  AUTO_SCROLL_CONFIG 
} from '../types/autoScroll';
import { 
  isAtBottom, 
  getScrollPositionState, 
  hasUserScrolledUp, 
  debounce,
  getScrollMetrics 
} from '../utils/scrollUtils';

/**
 * Custom hook for auto-scroll state management and scroll detection
 * Optimized for performance to prevent typing lag
 */
export const useAutoScroll = () => {
  // Auto-scroll state - use refs for values that don't need to trigger re-renders
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(SCROLL_POSITION.AT_BOTTOM);
  const [error, setError] = useState(null);
  
  // Scroll tracking refs - these don't trigger re-renders
  const lastScrollTop = useRef(0);
  const isAutoScrolling = useRef(false);
  const scrollContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isProcessingScroll = useRef(false);
  const lastStateUpdate = useRef(0);
  const scrollIntervalRef = useRef(null);

  /**
   * Clear any pending timeouts and intervals
   */
  const clearScrollTimeout = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  /**
   * Throttled state update to prevent excessive re-renders
   */
  const throttledStateUpdate = useCallback((updater) => {
    const now = Date.now();
    if (now - lastStateUpdate.current > 8) { // Reduced from 16ms to 8ms for much better responsiveness
      updater();
      lastStateUpdate.current = now;
    }
  }, []);

  /**
   * Update scroll position state based on current scroll metrics
   * Optimized to minimize state updates
   */
  const updateScrollPosition = useCallback((element) => {
    if (!element) return;

    try {
      const metrics = getScrollMetrics(element);
      const { scrollTop, scrollHeight, clientHeight } = metrics;
      
      // Validate scroll metrics
      if (scrollHeight <= 0 || clientHeight <= 0) {
        return;
      }
      
      // Determine scroll position state
      const newScrollPosition = getScrollPositionState(
        scrollTop, 
        scrollHeight, 
        clientHeight, 
        lastScrollTop.current
      );
      
      // Only update state if position actually changed
      if (newScrollPosition !== scrollPosition) {
        throttledStateUpdate(() => {
          setScrollPosition(newScrollPosition);
        });
      }
      
      // Check if user has scrolled back to bottom
      if (isAtBottom(scrollTop, scrollHeight, clientHeight)) {
        if (userHasScrolledUp) {
          // Immediate state update for scroll detection
          setUserHasScrolledUp(false);
          setAutoScrollEnabled(true);
        }
      }
      
      // Update last scroll position
      lastScrollTop.current = scrollTop;
      
      // Clear any previous errors
      if (error) {
        setError(null);
      }
    } catch (err) {
      console.error('Error updating scroll position:', err);
      setError('Failed to update scroll position');
    }
  }, [scrollPosition, userHasScrolledUp, error, throttledStateUpdate]);

  /**
   * Optimized debounced scroll handler with better performance
   */
  const debouncedScrollHandler = useCallback(
    debounce((event) => {
      if (isProcessingScroll.current) return;
      
      isProcessingScroll.current = true;
      try { 
        const element = event.target;
        const metrics = getScrollMetrics(element);
        const { scrollTop, scrollHeight, clientHeight } = metrics;
        
        // Check for user scroll up immediately and stop continuous scrolling
        // This needs to happen BEFORE any other processing
        const scrollDifference = lastScrollTop.current - scrollTop;
        const significantScroll = scrollDifference > 10; // Minimum scroll distance to consider intentional
        
        // User scrolled up if scroll position decreased significantly
        if (significantScroll && scrollTop < lastScrollTop.current) {
          console.log('User scroll detected! scrollTop:', scrollTop, 'lastScrollTop:', lastScrollTop.current, 'difference:', scrollDifference);
          
          // Stop continuous scrolling immediately
          if (scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
          
          // Update state immediately
          if (!userHasScrolledUp) {
            console.log('Setting userHasScrolledUp to true');
            setUserHasScrolledUp(true);
            setAutoScrollEnabled(false);
          }
        }
        
        updateScrollPosition(element);
      } catch (err) {
        console.error('Error in scroll handler:', err);
        setError('Scroll handler error');
      } finally {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          isProcessingScroll.current = false;
        });
      }
    }, AUTO_SCROLL_CONFIG.DEBOUNCE_DELAY),
    [updateScrollPosition, userHasScrolledUp]
  );

  /**
   * Handle scroll events with error handling
   * Optimized to prevent excessive calls
   */
  const handleScroll = useCallback((event) => {
    if (!event || !event.target) {
      return;
    }
    
    // IMMEDIATE scroll detection - bypass debouncing for user scroll detection
    try {
      const element = event.target;
      const metrics = getScrollMetrics(element);
      const { scrollTop, scrollHeight, clientHeight } = metrics;
      
      // Check for user scroll up immediately (before debouncing)
      const scrollDifference = lastScrollTop.current - scrollTop;
      const significantScroll = scrollDifference > 5; // Lower threshold for immediate detection
      
      // User scrolled up if scroll position decreased significantly
      if (significantScroll && scrollTop < lastScrollTop.current) {
        console.log('IMMEDIATE User scroll detected! scrollTop:', scrollTop, 'lastScrollTop:', lastScrollTop.current, 'difference:', scrollDifference);
        
        // Stop continuous scrolling immediately
        if (scrollIntervalRef.current) {
          cancelAnimationFrame(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
        
        // Update state immediately
        if (!userHasScrolledUp) {
          console.log('IMMEDIATE Setting userHasScrolledUp to true');
          setUserHasScrolledUp(true);
          setAutoScrollEnabled(false);
        }
      }
      
      // Update last scroll position for next comparison
      lastScrollTop.current = scrollTop;
    } catch (err) {
      console.error('Error in immediate scroll detection:', err);
    }
    
    // Use passive event listener for better performance
    try {
      debouncedScrollHandler(event);
    } catch (err) {
      console.error('Error handling scroll event:', err);
      setError('Failed to handle scroll event');
    }
  }, [debouncedScrollHandler, userHasScrolledUp]);

  /**
   * Enable auto-scroll and scroll to bottom with error handling
   * Optimized to reduce state updates
   */
  const enableAutoScroll = useCallback(() => {
    try {
      // Batch state updates
      throttledStateUpdate(() => {
        setAutoScrollEnabled(true);
        setUserHasScrolledUp(false);
        setScrollPosition(SCROLL_POSITION.AT_BOTTOM);
      });
      
      // Scroll to bottom
      if (scrollContainerRef.current) {
        isAutoScrolling.current = true;
        
        // Clear any existing timeout
        clearScrollTimeout();
        
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        });
        
        // Reset auto-scrolling flag after animation
        scrollTimeoutRef.current = setTimeout(() => {
          isAutoScrolling.current = false;
        }, AUTO_SCROLL_CONFIG.ANIMATION_DURATION);
      }
      
      // Clear any previous errors
      if (error) {
        setError(null);
      }
    } catch (err) {
      console.error('Error enabling auto-scroll:', err);
      setError('Failed to enable auto-scroll');
    }
  }, [error, clearScrollTimeout, throttledStateUpdate]);

  /**
   * Disable auto-scroll when user scrolls up
   * Optimized to batch state updates
   */
  const disableAutoScroll = useCallback(() => {
    try {
      throttledStateUpdate(() => {
        setAutoScrollEnabled(false);
        setUserHasScrolledUp(true);
        setScrollPosition(SCROLL_POSITION.SCROLLED_UP);
      });
    } catch (err) {
      console.error('Error disabling auto-scroll:', err);
      setError('Failed to disable auto-scroll');
    }
  }, [throttledStateUpdate]);

  /**
   * Reset auto-scroll state (e.g., when switching conversations)
   * Optimized to clear all timeouts and intervals
   */
  const resetAutoScrollState = useCallback(() => {
    try {
      throttledStateUpdate(() => {
        setAutoScrollEnabled(true);
        setUserHasScrolledUp(false);
        setScrollPosition(SCROLL_POSITION.AT_BOTTOM);
      });
      
      lastScrollTop.current = 0;
      isAutoScrolling.current = false;
      isProcessingScroll.current = false;
      
      // Clear any pending timeouts and intervals
      clearScrollTimeout();
      
      // Clear any previous errors
      if (error) {
        setError(null);
      }
    } catch (err) {
      console.error('Error resetting auto-scroll state:', err);
      setError('Failed to reset auto-scroll state');
    }
  }, [error, clearScrollTimeout, throttledStateUpdate]);

  /**
   * Check if should show the down arrow
   * Simplified to show whenever user has scrolled up, regardless of auto-scroll state
   */
  const shouldShowDownArrow = useCallback(() => {
    try {
      // Show down arrow if user has scrolled up, regardless of auto-scroll state
      // This makes it more reliable and user-friendly
      const shouldShow = userHasScrolledUp;
      return shouldShow;
    } catch (err) {
      console.error('Error checking down arrow visibility:', err);
      return false;
    }
  }, [userHasScrolledUp]);

  /**
   * Auto-scroll to bottom (called when new messages arrive)
   * Optimized to use requestAnimationFrame
   */
  const autoScrollToBottom = useCallback(() => {
    // IMMEDIATE check - don't scroll if auto-scroll is disabled
    if (!autoScrollEnabled || !scrollContainerRef.current) {
      console.log('Auto-scroll disabled, not scrolling to bottom');
      return;
    }
    
    try { 
      isAutoScrolling.current = true;
      
      // Clear any existing timeout
      clearScrollTimeout();
      
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
      
      // Reset auto-scrolling flag after animation
      scrollTimeoutRef.current = setTimeout(() => {
        isAutoScrolling.current = false;
      }, AUTO_SCROLL_CONFIG.ANIMATION_DURATION);
    } catch (err) {
      console.error('Error auto-scrolling to bottom:', err);
      setError('Failed to auto-scroll to bottom');
    }
  }, [autoScrollEnabled, clearScrollTimeout]);

  /**
   * Start continuous auto-scroll during streaming
   * Optimized to use requestAnimationFrame instead of setInterval
   */
  const startContinuousScroll = useCallback(() => {
    if (scrollIntervalRef.current) return; // Already running
    
    const scrollFrame = () => {
      // Check if auto-scroll is still enabled before continuing
      if (!autoScrollEnabled || !scrollContainerRef.current) {
        // Stop continuous scrolling if auto-scroll is disabled
        if (scrollIntervalRef.current) {
          cancelAnimationFrame(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
        return;
      }
      
      // Only auto-scroll if we're still enabled
      autoScrollToBottom();
      scrollIntervalRef.current = requestAnimationFrame(scrollFrame);
    };
    
    scrollIntervalRef.current = requestAnimationFrame(scrollFrame);
  }, [autoScrollEnabled, autoScrollToBottom]);

  /**
   * Stop continuous auto-scroll
   */
  const stopContinuousScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle scroll events during loading states
   * Optimized to use refs instead of state
   */
  const handleScrollDuringLoading = useCallback((isLoading) => {
    if (isLoading) {
      // During loading, be more conservative with scroll detection
      // Don't disable auto-scroll for small scroll movements
      isProcessingScroll.current = true;
    } else {
      // When loading completes, resume normal scroll detection
      isProcessingScroll.current = false;
    }
  }, []);

  /**
   * Cleanup function for component unmount
   * Optimized to clear all resources
   */
  const cleanup = useCallback(() => {
    clearScrollTimeout();
    stopContinuousScroll();
    isAutoScrolling.current = false;
    isProcessingScroll.current = false;
  }, [clearScrollTimeout, stopContinuousScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    autoScrollEnabled,
    userHasScrolledUp,
    scrollPosition,
    shouldShowDownArrow,
    error,
    
    // Refs
    scrollContainerRef,
    
    // Actions
    handleScroll,
    enableAutoScroll,
    disableAutoScroll,
    resetAutoScrollState,
    autoScrollToBottom,
    startContinuousScroll,
    stopContinuousScroll,
    handleScrollDuringLoading,
    cleanup,
    
    // Internal state for testing
    isAutoScrolling: isAutoScrolling.current
  };
}; 