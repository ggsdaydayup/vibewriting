/**
 * 统一数据访问层
 *
 * Web 端：所有请求代理到 Hono API（/api/*），API 再写 Supabase
 * Tauri 端：读写本地 SQLite（tauri-plugin-sql），联网时后台同步 Supabase
 *
 * 上层组件统一通过 storageClient 访问，不感知平台差异。
 * MVP 阶段 Tauri 端同样走 /api 代理（Tauri 内嵌 webview 可访问本地 API server），
 * 后续可替换为直接 SQLite 调用以支持完全离线。
 */

import { isTauri } from "./platform";
import { api, streamRequest } from "../api/client";

export type { Platform } from "./platform";
export { isTauri, getPlatform } from "./platform";

// Re-export api client for convenience — same interface on both platforms
export const storageClient = api;
export { streamRequest };

/**
 * Tauri 专属：通过 tauri-plugin-store 持久化轻量 KV 数据
 * （用于保存 AI 配置等无需同步到服务端的本地偏好）
 */
export async function localGet<T>(key: string): Promise<T | null> {
  if (!isTauri()) {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("vibewriting.bin", { autoSave: true });
    return (await store.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function localSet<T>(key: string, value: T): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(key, JSON.stringify(value));
    return;
  }
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("vibewriting.bin", { autoSave: true });
    await store.set(key, value);
  } catch {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export async function localDelete(key: string): Promise<void> {
  if (!isTauri()) {
    localStorage.removeItem(key);
    return;
  }
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("vibewriting.bin", { autoSave: true });
    await store.delete(key);
  } catch {
    localStorage.removeItem(key);
  }
}
