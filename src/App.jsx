import React, { useReducer } from "react";
import WidgetContext from "./context/widget-context";
import getRootReducer from "./state";
import "./App.scss";
import GraphQLExample from "./components/GraphQLExample";

function App() {
  console.log(getRootReducer());
  const [rootReducer, rootState] = getRootReducer();
  const [state, dispatch] = useReducer(rootReducer, rootState);

  return (
    <WidgetContext.Provider value={{ state, dispatch }}>
      <div className="App">
        <header className="App-header">
          <GraphQLExample />
        </header>
      </div>
    </WidgetContext.Provider>
  );
}

export default App;
