import {
  getOrCreateConversationSession,
  markConversationSessionStarted,
  touchConversationSession,
} from "../state/session-store.mjs";
import { markdownToPlainText, truncateText } from "../util/text.mjs";
import { sendTextMessage } from "../weixin/runtime/send-text.mjs";
import { monitorWeixinAccount } from "../weixin/runtime/monitor.mjs";

export function createGateway({ stateDir, adapter, logger, cwd }) {
  const inflightByConversation = new Map();

  async function handleMessage(event) {
    const conversationKey = `${event.account.accountId}:${event.userId}`;
    const previous = inflightByConversation.get(conversationKey) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const session = getOrCreateConversationSession(stateDir, event.account.accountId, event.userId);
        logger.info("dispatching inbound text", {
          accountId: event.account.accountId,
          userId: event.userId,
          resumeSession: Boolean(session.startedAt),
          textPreview: event.text.slice(0, 120),
        });

        const result = await adapter.sendMessage({
          sessionId: session.adapterSessionId,
          resumeSession: Boolean(session.startedAt),
          userId: event.userId,
          text: event.text,
          cwd,
        });

        const outboundText = truncateText(markdownToPlainText(result.text || ""));
        if (!outboundText) {
          throw new Error("adapter returned empty text");
        }

        logger.info("adapter reply ready", {
          accountId: event.account.accountId,
          userId: event.userId,
          textPreview: outboundText.slice(0, 120),
        });

        await sendTextMessage({
          account: event.account,
          toUserId: event.userId,
          contextToken: event.contextToken,
          text: outboundText,
        });

        logger.info("reply sent to weixin", {
          accountId: event.account.accountId,
          userId: event.userId,
        });

        markConversationSessionStarted(stateDir, event.account.accountId, event.userId);
        touchConversationSession(stateDir, event.account.accountId, event.userId);
      })
      .catch(async (error) => {
        logger.error("message dispatch failed", {
          accountId: event.account.accountId,
          userId: event.userId,
          error: error instanceof Error ? error.message : String(error),
        });

        try {
          await sendTextMessage({
            account: event.account,
            toUserId: event.userId,
            contextToken: event.contextToken,
            text: "Backend execution failed. Check local logs and retry.",
          });
        } catch (replyError) {
          logger.error("failed to send error reply", {
            accountId: event.account.accountId,
            userId: event.userId,
            error: replyError instanceof Error ? replyError.message : String(replyError),
          });
        }
      })
      .finally(() => {
        if (inflightByConversation.get(conversationKey) === next) {
          inflightByConversation.delete(conversationKey);
        }
      });

    inflightByConversation.set(conversationKey, next);
    return next;
  }

  return {
    async start(accounts, signal) {
      await Promise.all(
        accounts.map((account) =>
          monitorWeixinAccount({
            stateDir,
            account,
            signal,
            logger: logger.child("monitor"),
            onTextMessage: handleMessage,
          }),
        ),
      );
    },
  };
}
