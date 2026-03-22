import { homedir } from "node:os";
import path from "node:path";

export const DEFAULT_WEIXIN_BASE_URL = "https://ilinkai.weixin.qq.com";

export function resolveStateDir(overrideValue) {
  if (overrideValue?.trim()) {
    return path.resolve(overrideValue.trim());
  }

  if (process.env.WXCLAWBOT_STATE_DIR?.trim()) {
    return path.resolve(process.env.WXCLAWBOT_STATE_DIR.trim());
  }

  return path.join(homedir(), ".wxclawbot-cc-codex");
}

export function resolveAccountsDir(stateDir) {
  return path.join(stateDir, "accounts");
}

export function resolveSyncBufDir(stateDir) {
  return path.join(stateDir, "sync-bufs");
}

export function resolveSessionsDir(stateDir) {
  return path.join(stateDir, "sessions");
}
