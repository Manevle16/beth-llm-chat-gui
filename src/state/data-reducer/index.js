import { 
  AUTO_SCROLL_ACTIONS, 
  createAutoScrollState 
} from '../../types/autoScroll';

// Initial state
export const dataState = {
  // Add your state properties here
  autoScroll: createAutoScrollState()
};

// Reducer function
const dataReducer = (state = dataState, action) => {
  switch (action?.type) {
    // Auto-scroll actions
    case AUTO_SCROLL_ACTIONS.SET_AUTO_SCROLL_ENABLED:
      return {
        ...state,
        autoScroll: {
          ...state.autoScroll,
          autoScrollEnabled: action.payload
        }
      };

    case AUTO_SCROLL_ACTIONS.SET_USER_SCROLLED_UP:
      return {
        ...state,
        autoScroll: {
          ...state.autoScroll,
          userHasScrolledUp: action.payload
        }
      };

    case AUTO_SCROLL_ACTIONS.SET_SCROLL_POSITION:
      return {
        ...state,
        autoScroll: {
          ...state.autoScroll,
          scrollPosition: action.payload
        }
      };

    case AUTO_SCROLL_ACTIONS.UPDATE_SCROLL_POSITION:
      return {
        ...state,
        autoScroll: {
          ...state.autoScroll,
          lastScrollTop: action.payload.scrollTop,
          scrollContainerHeight: action.payload.containerHeight,
          scrollContentHeight: action.payload.contentHeight
        }
      };

    case AUTO_SCROLL_ACTIONS.RESET_AUTO_SCROLL_STATE:
      return {
        ...state,
        autoScroll: createAutoScrollState()
      };

    // Add your action cases here
    default:
      return state;
  }
};

export default dataReducer;
