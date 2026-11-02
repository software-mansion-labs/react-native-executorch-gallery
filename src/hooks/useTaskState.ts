import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Keeps ordinary task state until the shared model revision changes.
 * Resets before children commit, without unmounting the screen or its modal.
 * Setters from a previous revision are ignored so late results cannot restore stale data.
 */
export function useTaskState<T>(initialValue: T, revision: number) {
  const [state, setState] = useState({ revision, value: initialValue });
  if (state.revision !== revision) setState({ revision, value: initialValue });

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      setState((previous) => {
        if (previous.revision !== revision) return previous;
        const value = typeof next === 'function' ? (next as (value: T) => T)(previous.value) : next;
        return { revision, value };
      });
    },
    [revision]
  );

  return [state.revision === revision ? state.value : initialValue, setValue] as const;
}
