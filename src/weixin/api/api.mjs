import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createLogger } from "../../logging/logger.mjs";

const logger = createLogger("weixin/api");

function readPackageVersion() {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const packagePath = path.resolve(currentDir, "..", "..", "..", "package.json");
    return JSON.parse(fs.readFileSync(packagePath, "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const CHANNEL_VERSION = readPackageVersion();
const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const DEFAULT_API_TIMEOUT_MS = 15_000;

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function buildHeaders({ token, routeTag, body }) {
  const headers = {
    "Content-Type": "application/json",
    AuthorizationType: "ilink_bot_token",
    "Content-Length": String(Buffer.byteLength(body, "utf8")),
    "X-WECHAT-UIN": Buffer.from(String(Math.floor(Math.random() * 4_294_967_295)), "utf8").toString("base64"),
  };

  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  if (routeTag?.trim()) {
    headers.SKRouteTag = routeTag.trim();
  }

  return headers;
}

function buildBaseInfo() {
  return { channel_version: CHANNEL_VERSION };
}

async function apiFetch({ baseUrl, endpoint, token, routeTag, body, timeoutMs, label, method = "POST" }) {
  const url = new URL(endpoint, ensureTrailingSlash(baseUrl));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders({ token, routeTag, body }),
      body,
      signal: controller.signal,
    });
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`${label} ${response.status}: ${rawText}`);
    }

    return rawText;
  } finally {
    clearTimeout(timer);
  }
}

export async function getUpdates({ baseUrl, token, routeTag, getUpdatesBuf, timeoutMs }) {
  try {
    const rawText = await apiFetch({
      baseUrl,
      endpoint: "ilink/bot/getupdates",
      token,
      routeTag,
      timeoutMs: timeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS,
      label: "getUpdates",
      body: JSON.stringify({
        get_updates_buf: getUpdatesBuf ?? "",
        base_info: buildBaseInfo(),
      }),
    });

    return JSON.parse(rawText);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ret: 0, msgs: [], get_updates_buf: getUpdatesBuf ?? "" };
    }
    throw error;
  }
}

export async function sendMessage({ baseUrl, token, routeTag, body, timeoutMs }) {
  await apiFetch({
    baseUrl,
    endpoint: "ilink/bot/sendmessage",
    token,
    routeTag,
    timeoutMs: timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
    label: "sendMessage",
    body: JSON.stringify({
      ...body,
      base_info: buildBaseInfo(),
    }),
  });
}

export async function fetchQrCode({ baseUrl, routeTag, botType = "3" }) {
  const url = new URL(`ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(botType)}`, ensureTrailingSlash(baseUrl));
  const headers = routeTag?.trim() ? { SKRouteTag: routeTag.trim() } : {};
  const response = await fetch(url, { headers });
  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`get_bot_qrcode ${response.status}: ${rawText}`);
  }
  return JSON.parse(rawText);
}

export async function fetchQrStatus({ baseUrl, routeTag, qrCode, timeoutMs = 35_000 }) {
  const url = new URL(`ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrCode)}`, ensureTrailingSlash(baseUrl));
  const headers = {
    "iLink-App-ClientVersion": "1",
  };

  if (routeTag?.trim()) {
    headers.SKRouteTag = routeTag.trim();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`get_qrcode_status ${response.status}: ${rawText}`);
    }

    return JSON.parse(rawText);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { status: "wait" };
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function logResponse(label, payload) {
  logger.debug(`response ${label}`, payload);
}
