// Initial state
export const dataState = {
  // Add your state properties here
};

// Reducer function
const dataReducer = (state = dataState, action) => {
  switch (action?.type) {
    // Add your action cases here
    default:
      return state;
  }
};

export default dataReducer;
