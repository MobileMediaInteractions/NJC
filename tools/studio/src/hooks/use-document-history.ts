import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

type History = { past: string[]; present: string; future: string[] };
type Action = { type: "edit"; value: string } | { type: "undo" } | { type: "redo" } | { type: "reset"; value: string };

function reducer(state: History, action: Action): History {
  if (action.type === "reset") return { past: [], present: action.value, future: [] };
  if (action.type === "edit") {
    if (action.value === state.present) return state;
    return { past: [...state.past.slice(-99), state.present], present: action.value, future: [] };
  }
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous === undefined ? state : { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
  }
  const next = state.future[0];
  return next === undefined ? state : { past: [...state.past, state.present], present: next, future: state.future.slice(1) };
}

export function useDocumentHistory(initial: string, recoveryKey: string, savedSource = initial) {
  const recovered = useMemo(() => {
    try { return localStorage.getItem(recoveryKey) ?? initial; } catch { return initial; }
  }, [initial, recoveryKey]);
  const [state, dispatch] = useReducer(reducer, { past: [], present: recovered, future: [] });
  const recoveryTimer = useRef<number | null>(null);

  useEffect(() => {
    if (state.present === savedSource) {
      try { localStorage.removeItem(recoveryKey); } catch { /* Recovery cleanup is best effort. */ }
      return;
    }
    recoveryTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(recoveryKey, state.present); } catch { /* Recovery is best effort when storage is unavailable. */ }
      recoveryTimer.current = null;
    }, 400);
    return () => {
      if (recoveryTimer.current !== null) window.clearTimeout(recoveryTimer.current);
      recoveryTimer.current = null;
    };
  }, [recoveryKey, savedSource, state.present]);

  const clearRecovery = useCallback(() => {
    if (recoveryTimer.current !== null) window.clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
    try { localStorage.removeItem(recoveryKey); } catch { /* Recovery cleanup is best effort. */ }
  }, [recoveryKey]);

  return {
    source: state.present,
    setSource: useCallback((value: string) => dispatch({ type: "edit", value }), []),
    reset: useCallback((value: string) => dispatch({ type: "reset", value }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    clearRecovery,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    historyDepth: state.past.length,
  };
}
