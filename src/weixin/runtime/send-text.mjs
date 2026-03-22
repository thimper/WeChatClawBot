import { randomUUID } from "node:crypto";

import { sendMessage } from "../api/api.mjs";
import { MessageItemType, MessageState, MessageType } from "../api/types.mjs";

export async function sendTextMessage({
  account,
  toUserId,
  contextToken,
  text,
}) {
  if (!contextToken) {
    throw new Error("contextToken is required for outbound replies");
  }

  await sendMessage({
    baseUrl: account.baseUrl,
    token: account.token,
    routeTag: account.routeTag,
    body: {
      msg: {
        from_user_id: "",
        to_user_id: toUserId,
        client_id: randomUUID(),
        message_type: MessageType.BOT,
        message_state: MessageState.FINISH,
        context_token: contextToken,
        item_list: [
          {
            type: MessageItemType.TEXT,
            text_item: { text },
          },
        ],
      },
    },
  });
}
