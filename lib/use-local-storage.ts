"use client";

import * as React from "react";

import { dateKey } from "./date-utils";

/**
 * localStorage-backed state that never calls setState inside an effect.
 *
 * Reads go through `useSyncExternalStore` (server snapshot = `initial`), so the
 * server render and the first client render agree, and React swaps in the
 * stored value right after hydration. Writes happen in event handlers.
 */
const subscriptions = new Map<string, Set<() => void>>();
const caches = new Map<string, { raw: string | null; value: unknown }>();

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(key: string, callback: () => void) {
  let set = subscriptions.get(key);
  if (!set) {
    set = new Set();
    subscriptions.set(key, set);
  }
  set.add(callback);
  return () => {
    set?.delete(callback);
  };
}

function getSnapshot<T>(key: string, initial: T): T {
  const raw = readRaw(key);
  const cached = caches.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value: T = initial;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = initial;
    }
  }
  caches.set(key, { raw, value });
  return value;
}

function commit<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — keep it in memory only
  }
  caches.set(key, { raw: readRaw(key), value });
  subscriptions.get(key)?.forEach((cb) => cb());
}

export function useLocalStorageState<T>(
  key: string,
  initial: T
): [T, (next: T | ((prev: T) => T)) => void] {
  const value = React.useSyncExternalStore(
    React.useCallback((cb) => subscribe(key, cb), [key]),
    React.useCallback(() => getSnapshot(key, initial), [key, initial]),
    React.useCallback(() => initial, [initial])
  );

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = getSnapshot(key, initial);
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      commit(key, resolved);
    },
    [key, initial]
  );

  return [value, setValue];
}

/** True after the first client render — safe hydration-guard replacement. */
export function useMounted(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function subscribeToToday(callback: () => void) {
  const updateAtMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(() => {
      callback();
      updateAtMidnight();
    }, midnight.getTime() - now.getTime());
    return timer;
  };

  let timer = updateAtMidnight();
  const refresh = () => {
    callback();
    window.clearTimeout(timer);
    timer = updateAtMidnight();
  };

  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

/**
 * Today's date key (yyyy-MM-dd).
 *
 * Reading the clock during render would freeze the value into the prerendered
 * shell, so the server snapshot is an empty string and React swaps in the
 * real value right after hydration — same pattern as `useMounted`.
 */
export function useTodayKey(): string {
  return React.useSyncExternalStore(
    subscribeToToday,
    () => dateKey(new Date()),
    () => ""
  );
}
