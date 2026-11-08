"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type Query = Record<string, string | number | undefined | null>;

/**
 * GET `path` whenever it (or `query`) changes. Results are tagged with the request that
 * produced them, so a new query shows `loading` without resetting state inside the effect.
 * Pass `null` as path to skip.
 */
export function useApi<T>(path: string | null, query: Query = {}) {
  const queryJson = JSON.stringify(query);
  const key = path === null ? null : `${path}?${queryJson}`;
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });

  useEffect(() => {
    if (path === null) return;
    let alive = true;
    const k = `${path}?${queryJson}`;
    api<T>(path, { query: JSON.parse(queryJson) as Query })
      .then((data) => alive && setState({ key: k, data, error: null }))
      .catch((e: Error) => alive && setState({ key: k, data: null, error: e.message }));
    return () => {
      alive = false;
    };
  }, [path, queryJson, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const fresh = state.key === key;
  return {
    data: fresh ? state.data : null,
    error: fresh ? state.error : null,
    loading: key !== null && !fresh,
    reload,
  };
}
