import fs from "node:fs";
import path from "node:path";

import { resolveAccountsDir, DEFAULT_WEIXIN_BASE_URL } from "./paths.mjs";
import { ensureDir, readJson, sanitizeFileSegment, writeJson } from "../util/fs.mjs";

function resolveAccountFilePath(stateDir, accountId) {
  return path.join(resolveAccountsDir(stateDir), `${sanitizeFileSegment(accountId)}.json`);
}

export function listAccounts(stateDir) {
  const dirPath = resolveAccountsDir(stateDir);
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => readJson(path.join(dirPath, entry)))
    .filter((entry) => entry && entry.accountId);
}

export function loadAccount(stateDir, accountId) {
  return readJson(resolveAccountFilePath(stateDir, accountId));
}

export function saveAccount(stateDir, account) {
  ensureDir(resolveAccountsDir(stateDir));
  const nextAccount = {
    accountId: account.accountId,
    baseUrl: account.baseUrl || DEFAULT_WEIXIN_BASE_URL,
    routeTag: account.routeTag || undefined,
    token: account.token || undefined,
    userId: account.userId || undefined,
    savedAt: new Date().toISOString(),
  };
  writeJson(resolveAccountFilePath(stateDir, account.accountId), nextAccount);
  return nextAccount;
}
