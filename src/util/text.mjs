export function markdownToPlainText(text) {
  let value = text ?? "";
  value = value.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_, code) => code.trim());
  value = value.replace(/!\[[^\]]*]\([^)]*\)/g, "");
  value = value.replace(/\[([^\]]+)]\([^)]*\)/g, "$1");
  value = value.replace(/^\|[\s:|-]+\|$/gm, "");
  value = value.replace(/^\|(.+)\|$/gm, (_, inner) =>
    inner
      .split("|")
      .map((cell) => cell.trim())
      .join("  "),
  );
  value = value.replace(/^#{1,6}\s*/gm, "");
  value = value.replace(/[*_~`>]/g, "");
  value = value.replace(/\n{3,}/g, "\n\n");
  return value.trim();
}

export function truncateText(text, maxLength = 3000) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 24)}\n\n[truncated for Weixin]`;
}
