import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        set({ loading: false });
        if (!res.ok) throw new Error(data.error || "登录失败");
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      },

      register: async (email, password) => {
        set({ loading: true });
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        set({ loading: false });
        if (!res.ok) throw new Error(data.error || "注册失败");
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },

      initFromStorage: async () => {
        const { accessToken, refreshToken } = get();
        if (!accessToken) return;

        // 尝试用现有 token 获取用户信息
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const user = await res.json();
          set({ user });
          return;
        }

        // access token 过期，用 refresh token 续签
        if (refreshToken) {
          const r = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (r.ok) {
            const { accessToken: newToken } = await r.json();
            set({ accessToken: newToken });
            // 再次获取用户信息
            const me = await fetch(`${API_BASE}/api/auth/me`, {
              headers: { Authorization: `Bearer ${newToken}` },
            });
            if (me.ok) set({ user: await me.json() });
          } else {
            set({ user: null, accessToken: null, refreshToken: null });
          }
        }
      },
    }),
    {
      name: "vw-auth",
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
);

/** 给 API client 用的 token 获取函数 */
export function getAccessToken() {
  return useAuthStore.getState().accessToken;
}
