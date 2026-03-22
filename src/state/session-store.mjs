import { randomUUID } from "node:crypto";
import path from "node:path";

import { resolveSessionsDir } from "./paths.mjs";
import { ensureDir, readJson, sanitizeFileSegment, writeJson } from "../util/fs.mjs";

function resolveConversationFilePath(stateDir, accountId, userId) {
  return path.join(
    resolveSessionsDir(stateDir),
    sanitizeFileSegment(accountId),
    `${sanitizeFileSegment(userId)}.json`,
  );
}

export function getOrCreateConversationSession(stateDir, accountId, userId) {
  const filePath = resolveConversationFilePath(stateDir, accountId, userId);
  const existing = readJson(filePath);
  if (existing?.adapterSessionId) {
    return existing;
  }

  ensureDir(path.dirname(filePath));

  const nextSession = {
    accountId,
    userId,
    adapterSessionId: randomUUID(),
    startedAt: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  writeJson(filePath, nextSession);
  return nextSession;
}

export function touchConversationSession(stateDir, accountId, userId) {
  const session = getOrCreateConversationSession(stateDir, accountId, userId);
  writeJson(resolveConversationFilePath(stateDir, accountId, userId), {
    ...session,
    updatedAt: new Date().toISOString(),
  });
}

export function markConversationSessionStarted(stateDir, accountId, userId) {
  const session = getOrCreateConversationSession(stateDir, accountId, userId);
  writeJson(resolveConversationFilePath(stateDir, accountId, userId), {
    ...session,
    startedAt: session.startedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
