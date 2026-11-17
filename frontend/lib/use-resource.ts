"use client";
import { useEffect, useState } from "react";
import { api, errorMessage } from "./api";
export function useResource<T>(url: string | null, revision = 0) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>({ key: "" });
  const key = `${url}:${version}:${revision}`;
  useEffect(() => {
    let cancelled = false;
    if (url === null) return;
    api<T>(url)
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ key, error: errorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [url, key]);
  return {
    data:
      url === null ? undefined : result.key === key ? result.data : undefined,
    error: url === null || result.key !== key ? undefined : result.error,
    loading: url !== null && result.key !== key,
    reload: () => setVersion((value) => value + 1),
  };
}
