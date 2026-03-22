import { randomUUID } from "node:crypto";

import { fetchQrCode, fetchQrStatus } from "../api/api.mjs";

const ACTIVE_LOGIN_TTL_MS = 5 * 60_000;
const MAX_QR_REFRESH_COUNT = 3;
const activeLogins = new Map();

function isFresh(login) {
  return Date.now() - login.startedAt < ACTIVE_LOGIN_TTL_MS;
}

function pruneExpiredLogins() {
  for (const [sessionKey, login] of activeLogins.entries()) {
    if (!isFresh(login)) {
      activeLogins.delete(sessionKey);
    }
  }
}

export async function startWeixinLoginWithQr({ apiBaseUrl, routeTag, botType = "3", force = false, accountId }) {
  pruneExpiredLogins();

  const sessionKey = accountId || randomUUID();
  const existing = activeLogins.get(sessionKey);

  if (!force && existing && isFresh(existing)) {
    return {
      sessionKey,
      qrcodeUrl: existing.qrcodeUrl,
      message: "QR code is already active.",
    };
  }

  const qrCode = await fetchQrCode({
    baseUrl: apiBaseUrl,
    routeTag,
    botType,
  });

  activeLogins.set(sessionKey, {
    sessionKey,
    qrcode: qrCode.qrcode,
    qrcodeUrl: qrCode.qrcode_img_content,
    startedAt: Date.now(),
  });

  return {
    sessionKey,
    qrcodeUrl: qrCode.qrcode_img_content,
    message: "Scan the QR code URL in Weixin to finish linking.",
  };
}

export async function waitForWeixinLogin({ apiBaseUrl, routeTag, sessionKey, timeoutMs = 480_000, logger }) {
  let login = activeLogins.get(sessionKey);
  if (!login || !isFresh(login)) {
    activeLogins.delete(sessionKey);
    return {
      connected: false,
      message: "No active QR login session.",
    };
  }

  const deadline = Date.now() + timeoutMs;
  let refreshCount = 1;

  while (Date.now() < deadline) {
    const status = await fetchQrStatus({
      baseUrl: apiBaseUrl,
      routeTag,
      qrCode: login.qrcode,
    });

    if (status.status === "wait" || status.status === "scaned") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    if (status.status === "expired") {
      refreshCount += 1;
      if (refreshCount > MAX_QR_REFRESH_COUNT) {
        activeLogins.delete(sessionKey);
        return {
          connected: false,
          message: "QR code expired too many times.",
        };
      }

      const refreshed = await fetchQrCode({
        baseUrl: apiBaseUrl,
        routeTag,
      });

      login = {
        ...login,
        qrcode: refreshed.qrcode,
        qrcodeUrl: refreshed.qrcode_img_content,
        startedAt: Date.now(),
      };
      activeLogins.set(sessionKey, login);
      logger?.info("QR code refreshed", { qrcodeUrl: login.qrcodeUrl });
      continue;
    }

    if (status.status === "confirmed") {
      activeLogins.delete(sessionKey);
      return {
        connected: true,
        accountId: status.ilink_bot_id || sessionKey,
        botToken: status.bot_token,
        baseUrl: status.baseurl || apiBaseUrl,
        userId: status.ilink_user_id,
        message: "Weixin account linked.",
      };
    }
  }

  activeLogins.delete(sessionKey);
  return {
    connected: false,
    message: "QR login timed out.",
  };
}
