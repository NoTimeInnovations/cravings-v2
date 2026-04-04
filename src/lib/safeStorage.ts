/**
 * Safe localStorage wrapper for environments where localStorage is blocked
 * (e.g. Android private browsing, restricted WebViews, disabled cookies).
 */

const noopStorage: Storage = {
  length: 0,
  clear() {},
  getItem() { return null; },
  key() { return null; },
  removeItem() {},
  setItem() {},
};

export function getSafeStorage(): Storage {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return localStorage;
  } catch {
    return noopStorage;
  }
}
