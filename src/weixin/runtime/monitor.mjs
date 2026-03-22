import { getUpdates } from "../api/api.mjs";
import {
  SESSION_EXPIRED_ERRCODE,
  assertSessionActive,
  getRemainingPauseMs,
  pauseSession,
} from "../api/session-guard.mjs";
import { extractInboundText } from "./message-utils.mjs";
import { loadSyncBuf, saveSyncBuf } from "../../state/sync-buf-store.mjs";

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const RETRY_DELAY_MS = 2_000;
const BACKOFF_DELAY_MS = 30_000;
const MAX_CONSECUTIVE_FAILURES = 3;

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export async function monitorWeixinAccount({
  stateDir,
  account,
  onTextMessage,
  signal,
  logger,
}) {
  const accountLogger = logger.child(account.accountId);
  let getUpdatesBuf = loadSyncBuf(stateDir, account.accountId);
  let consecutiveFailures = 0;
  let nextTimeoutMs = DEFAULT_LONG_POLL_TIMEOUT_MS;

  accountLogger.info("monitor started", { baseUrl: account.baseUrl });

  while (!signal?.aborted) {
    try {
      assertSessionActive(account.accountId);

      const response = await getUpdates({
        baseUrl: account.baseUrl,
        token: account.token,
        routeTag: account.routeTag,
        getUpdatesBuf,
        timeoutMs: nextTimeoutMs,
      });

      accountLogger.debug("getUpdates response", {
        ret: response.ret,
        errcode: response.errcode,
        msgCount: response.msgs?.length ?? 0,
        hasBuf: Boolean(response.get_updates_buf),
      });

      if (response.longpolling_timeout_ms > 0) {
        nextTimeoutMs = response.longpolling_timeout_ms;
      }

      const isApiError =
        (response.ret != null && response.ret !== 0) ||
        (response.errcode != null && response.errcode !== 0);

      if (isApiError) {
        if (response.errcode === SESSION_EXPIRED_ERRCODE || response.ret === SESSION_EXPIRED_ERRCODE) {
          pauseSession(account.accountId);
          accountLogger.warn("session expired; pausing account", {
            pauseMinutes: Math.ceil(getRemainingPauseMs(account.accountId) / 60000),
          });
          await sleep(getRemainingPauseMs(account.accountId), signal);
          continue;
        }

        throw new Error(`getUpdates failed ret=${response.ret} errcode=${response.errcode} errmsg=${response.errmsg ?? ""}`);
      }

      consecutiveFailures = 0;

      if (response.get_updates_buf) {
        getUpdatesBuf = response.get_updates_buf;
        saveSyncBuf(stateDir, account.accountId, getUpdatesBuf);
      }

      for (const rawMessage of response.msgs ?? []) {
        const userId = rawMessage.from_user_id?.trim();
        const contextToken = rawMessage.context_token?.trim();
        const text = extractInboundText(rawMessage);

        accountLogger.info("inbound update", {
          userId: userId || null,
          hasContextToken: Boolean(contextToken),
          textPreview: text.slice(0, 80),
          itemCount: rawMessage.item_list?.length ?? 0,
        });

        if (!userId || !text || !contextToken) {
          accountLogger.warn("skipping update without required fields", {
            userId: userId || null,
            hasText: Boolean(text),
            hasContextToken: Boolean(contextToken),
          });
          continue;
        }

        if (account.userId && account.userId !== userId) {
          accountLogger.warn("skipping unauthorized sender", { userId });
          continue;
        }

        await onTextMessage({
          account,
          userId,
          text,
          contextToken,
          rawMessage,
        });
      }
    } catch (error) {
      if (signal?.aborted) {
        break;
      }

      consecutiveFailures += 1;
      accountLogger.error("monitor loop failed", {
        error: error instanceof Error ? error.message : String(error),
        consecutiveFailures,
      });

      const delay = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? BACKOFF_DELAY_MS : RETRY_DELAY_MS;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        consecutiveFailures = 0;
      }

      await sleep(delay, signal);
    }
  }

  accountLogger.info("monitor stopped");
}
