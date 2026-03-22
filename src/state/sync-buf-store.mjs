import path from "node:path";

import { resolveSyncBufDir } from "./paths.mjs";
import { ensureDir, readText, sanitizeFileSegment, writeText } from "../util/fs.mjs";

function resolveSyncBufPath(stateDir, accountId) {
  return path.join(resolveSyncBufDir(stateDir), `${sanitizeFileSegment(accountId)}.txt`);
}

export function loadSyncBuf(stateDir, accountId) {
  return readText(resolveSyncBufPath(stateDir, accountId), "");
}

export function saveSyncBuf(stateDir, accountId, value) {
  ensureDir(resolveSyncBufDir(stateDir));
  writeText(resolveSyncBufPath(stateDir, accountId), value ?? "");
}
