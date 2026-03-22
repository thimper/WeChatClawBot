function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [meta-unserializable]";
  }
}

function writeLine(level, scope, message, meta) {
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${scope}: ${message}${formatMeta(meta)}`;
  const output = level === "error" ? process.stderr : process.stdout;
  output.write(`${line}\n`);
}

export function createLogger(scope = "app") {
  return {
    debug(message, meta) {
      if (process.env.WXCLAWBOT_DEBUG === "1") {
        writeLine("debug", scope, message, meta);
      }
    },
    info(message, meta) {
      writeLine("info", scope, message, meta);
    },
    warn(message, meta) {
      writeLine("warn", scope, message, meta);
    },
    error(message, meta) {
      writeLine("error", scope, message, meta);
    },
    child(nextScope) {
      return createLogger(`${scope}/${nextScope}`);
    },
  };
}
