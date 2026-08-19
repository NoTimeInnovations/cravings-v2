"use client";

import * as React from "react";

/**
 * Accounts this browser has signed into, for the sidebar's account switcher.
 *
 * Identities ONLY — store name, email, username. Deliberately no tokens: the
 * app holds exactly one session at a time (a single httpOnly `new_auth_token`),
 * and stashing extra redeemable sessions client-side would turn a shared or
 * stolen device into a key for every partner ever signed in on it. Switching
 * therefore goes through the login page, which is a second or two of typing in
 * exchange for the device carrying nothing worth stealing.
 *
 * localStorage, not a cookie: it never needs to reach the server, and putting
 * it in a cookie would send the whole list on every request.
 */

const KEY = "mt.knownAccounts.v1";
const MAX = 6;

export interface KnownAccount {
  id: string;
  name: string;
  email: string;
  username?: string;
  /** Epoch ms, so the list can be shown most-recent-first. */
  lastSeen: number;
}

function read(): KnownAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a) => a && typeof a.id === "string" && typeof a.email === "string")
      .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
  } catch {
    return [];
  }
}

function write(list: KnownAccount[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* private mode / quota — the switcher is a convenience, not a dependency */
  }
}

/**
 * Track the signed-in account and expose the others.
 *
 * `current` is recorded on every mount so the list stays fresh (a renamed store
 * updates itself) and so the most recently used account sorts first.
 */
export function useKnownAccounts(current?: {
  id?: string;
  store_name?: string | null;
  email?: string | null;
  username?: string | null;
}) {
  const [accounts, setAccounts] = React.useState<KnownAccount[]>([]);

  const id = current?.id;
  const name = current?.store_name || "";
  const email = current?.email || "";
  const username = current?.username || "";

  React.useEffect(() => {
    if (!id || !email) {
      setAccounts(read());
      return;
    }
    const list = read().filter((a) => a.id !== id);
    const next = [
      { id, name, email, username: username || undefined, lastSeen: Date.now() },
      ...list,
    ];
    write(next);
    setAccounts(next);
  }, [id, name, email, username]);

  /** Everyone except whoever is signed in now. */
  const others = React.useMemo(
    () => accounts.filter((a) => a.id !== id),
    [accounts, id],
  );

  const forget = React.useCallback(
    (accountId: string) => {
      const next = read().filter((a) => a.id !== accountId);
      write(next);
      setAccounts(next);
    },
    [],
  );

  return { accounts, others, forget };
}
