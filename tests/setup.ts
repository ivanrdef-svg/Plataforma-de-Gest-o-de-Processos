import { setSystemTime } from "bun:test";

// Loaded in the test runner and before domain imports in each isolated child.
const values = new Map<string, string>();
const storage: Storage = {
  get length() {
    return values.size;
  },
  clear() {
    values.clear();
  },
  getItem(key) {
    return values.get(key) ?? null;
  },
  key(index) {
    return [...values.keys()][index] ?? null;
  },
  removeItem(key) {
    values.delete(key);
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
};

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: storage },
});
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: () => {
    throw new Error("Network is forbidden in domain characterization tests.");
  },
});
setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
