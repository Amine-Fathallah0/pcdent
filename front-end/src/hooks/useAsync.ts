import { useState, useCallback, useRef, useEffect } from 'react';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseAsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

interface UseAsyncActions<T> {
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export function useAsync<T>(
  asyncFn?: (...args: unknown[]) => Promise<T>,
  immediate = false
): UseAsyncState<T> & UseAsyncActions<T> {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    status: 'idle',
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args: unknown[]) => {
    if (!asyncFn) return null;
    
    setState(prev => ({
      ...prev,
      status: 'loading',
      isLoading: true,
      isError: false,
      isSuccess: false,
    }));

    try {
      const data = await asyncFn(...args);
      if (mountedRef.current) {
        setState({
          data,
          status: 'success',
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
        });
      }
      return data;
    } catch (error) {
      if (mountedRef.current) {
        setState({
          data: null,
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
          isError: true,
          isSuccess: false,
        });
      }
      return null;
    }
  }, [asyncFn]);

  const reset = useCallback(() => {
    setState({
      data: null,
      status: 'idle',
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  useEffect(() => {
    if (immediate && asyncFn) {
      execute();
    }
  }, [immediate]);

  return { ...state, execute, reset, setData };
}
