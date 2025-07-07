import { useContext } from "react";
import WidgetContext, { WidgetProvider } from "./widget-context";

export default function useWidgetContext() {
  return useContext(WidgetContext);
}

// Hook to access the Redux store
export function useStore() {
  const { store } = useWidgetContext();
  return store;
}

// Hook to access Redux state
export function useSelector(selector) {
  const store = useStore();
  return selector(store.getState());
}

// Hook to dispatch actions
export function useDispatch() {
  const store = useStore();
  return store.dispatch;
}

export { WidgetProvider };
