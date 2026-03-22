import { MessageItemType } from "../api/types.mjs";

function bodyFromTextItem(item) {
  if (item.type === MessageItemType.TEXT && item.text_item?.text != null) {
    return String(item.text_item.text).trim();
  }

  if (item.type === MessageItemType.VOICE && item.voice_item?.text) {
    return String(item.voice_item.text).trim();
  }

  return "";
}

export function extractInboundText(message) {
  for (const item of message.item_list ?? []) {
    const text = bodyFromTextItem(item);
    if (text) {
      return text;
    }
  }

  return "";
}
