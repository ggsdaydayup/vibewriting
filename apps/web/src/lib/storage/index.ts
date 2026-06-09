/**
 * 统一数据访问层
 *
 * 上层组件统一通过 storageClient / streamRequest 访问，不感知平台差异。
 * Web 端 & Tauri MVP：均走 /api 代理。
 * 后续可替换 storageClient 实现为直接 SQLite（完全离线）。
 */

import { isTauri } from "./platform";

export type { Platform } from "./platform";
export { isTauri, getPlatform } from "./platform";

// Re-export unified client
export { storageClient, api, streamRequest } from "../api/client";

/**
 * Tauri 专属：通过 tauri-plugin-store 持久化轻量 KV 数据
 * （保存 AI 配置等无需同步到服务端的本地偏好）
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
