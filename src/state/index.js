import combineReducers from "react-combine-reducers";
import dataReducer, { dataState } from "./data-reducer";

export default function getRootReducer() {
  return combineReducers({
    data: [dataReducer, dataState]
  });
}

