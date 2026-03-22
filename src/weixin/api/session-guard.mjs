const SESSION_EXPIRED_ERRCODE = -14;
const SESSION_PAUSE_DURATION_MS = 60 * 60 * 1000;
const pauseUntilByAccount = new Map();

export { SESSION_EXPIRED_ERRCODE };

export function pauseSession(accountId) {
  pauseUntilByAccount.set(accountId, Date.now() + SESSION_PAUSE_DURATION_MS);
}

export function getRemainingPauseMs(accountId) {
  const pauseUntil = pauseUntilByAccount.get(accountId);
  if (!pauseUntil) {
    return 0;
  }

  const remaining = pauseUntil - Date.now();
  if (remaining <= 0) {
    pauseUntilByAccount.delete(accountId);
    return 0;
  }

  return remaining;
}

export function assertSessionActive(accountId) {
  const remaining = getRemainingPauseMs(accountId);
  if (remaining > 0) {
    throw new Error(`session paused for account ${accountId}, ${Math.ceil(remaining / 60000)} min remaining`);
  }
}
