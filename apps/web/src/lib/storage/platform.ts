/**
 * 平台检测工具
 * 判断当前运行在 Tauri 桌面端还是普通 Web 浏览器
 */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export type Platform = "tauri" | "web";

export function getPlatform(): Platform {
  return isTauri() ? "tauri" : "web";
}
