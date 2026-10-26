"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL, TOKEN_KEY, api } from "./api";
import type { Me } from "./types";

type AuthState = {
  user: Me | null;
  ready: boolean;
  badges: { notifications: number; messages: number };
  setSession: (token: string, user: Me) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshBadges: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [badges, setBadges] = useState({ notifications: 0, messages: 0 });

  async function refreshBadges() {
    const next = await api<{ notifications: number; messages: number }>("/api/badges");
    setBadges(next);
  }

  async function refreshUser() {
    const data = await api<{ user: Me }>("/api/auth/me");
    setUser(data.user);
  }

  function connect(token: string) {
    socket?.disconnect();
    socket = io(API_URL || undefined, { auth: { token } });
    socket.on("notification:new", () => {
      setBadges((current) => ({ ...current, notifications: current.notifications + 1 }));
    });
    socket.on("inbox:update", () => {
      refreshBadges().catch(() => undefined);
    });
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }
    api<{ user: Me }>("/api/auth/me")
      .then((data) => {
        setUser(data.user);
        connect(token);
        return api<{ notifications: number; messages: number }>("/api/badges");
      })
      .then((next) => {
        if (next) setBadges(next);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));

    const onUnauthorized = () => {
      setUser(null);
      socket?.disconnect();
      socket = null;
    };
    window.addEventListener("finazza:unauthorized", onUnauthorized);
    return () => window.removeEventListener("finazza:unauthorized", onUnauthorized);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      badges,
      setSession: (token, next) => {
        localStorage.setItem(TOKEN_KEY, token);
        setUser(next);
        connect(token);
        api<{ notifications: number; messages: number }>("/api/badges")
          .then(setBadges)
          .catch(() => undefined);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setBadges({ notifications: 0, messages: 0 });
        socket?.disconnect();
        socket = null;
      },
      refreshUser,
      refreshBadges,
    }),
    [user, ready, badges],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
