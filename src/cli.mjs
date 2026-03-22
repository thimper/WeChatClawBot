#!/usr/bin/env node

import path from "node:path";

import { createClaudeCodeAdapter } from "./adapters/claude-code/adapter.mjs";
import { createEchoAdapter } from "./adapters/echo/adapter.mjs";
import { createGateway } from "./core/gateway.mjs";
import { createLogger } from "./logging/logger.mjs";
import { listAccounts, loadAccount, saveAccount } from "./state/accounts-store.mjs";
import { resolveStateDir, DEFAULT_WEIXIN_BASE_URL } from "./state/paths.mjs";
import { startWeixinLoginWithQr, waitForWeixinLogin } from "./weixin/auth/login-qr.mjs";

const logger = createLogger("cli");

function printHelp() {
  process.stdout.write(`wxclawbot-cc-codex

Commands:
  login       Generate a Weixin QR flow and persist one linked account
  start       Start the local gateway and forward direct messages to an adapter
  accounts    List saved Weixin accounts
  help        Show this help

Common options:
  --state-dir <dir>
  --base-url <url>
  --route-tag <tag>
  --account-id <id>

Start options:
  --adapter <claude|echo>
  --cwd <dir>
  --login
  --claude-bin <command>
  --claude-model <model>
  --claude-permission-mode <mode>
  --claude-timeout-ms <ms>
`);
}

function parseArgv(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }

    const nextToken = argv[index + 1];
    if (!nextToken || nextToken.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = nextToken;
    index += 1;
  }

  return {
    command: positional[0] || "start",
    options,
  };
}

function getStringOption(options, key, envKey, fallbackValue) {
  const value = options[key] ?? process.env[envKey];
  if (value == null || value === true || `${value}`.trim() === "") {
    return fallbackValue;
  }
  return `${value}`.trim();
}

function getNumberOption(options, key, envKey, fallbackValue) {
  const rawValue = getStringOption(options, key, envKey, undefined);
  if (rawValue == null) {
    return fallbackValue;
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`Invalid numeric value for ${key}: ${rawValue}`);
  }

  return numericValue;
}

async function runLogin(options) {
  const stateDir = resolveStateDir(options.stateDir);
  const baseUrl = getStringOption(options, "baseUrl", "WXCLAWBOT_WEIXIN_BASE_URL", DEFAULT_WEIXIN_BASE_URL);
  const routeTag = getStringOption(options, "routeTag", "WXCLAWBOT_ROUTE_TAG", undefined);
  const timeoutMs = getNumberOption(options, "timeoutMs", "WXCLAWBOT_LOGIN_TIMEOUT_MS", 480_000);
  const requestedAccountId = getStringOption(options, "accountId", "WXCLAWBOT_ACCOUNT_ID", undefined);

  const startResult = await startWeixinLoginWithQr({
    apiBaseUrl: baseUrl,
    routeTag,
    accountId: requestedAccountId,
  });

  process.stdout.write(`QR code URL:\n${startResult.qrcodeUrl}\n\n`);
  process.stdout.write("Scan the URL in Weixin and wait for confirmation.\n");

  const waitResult = await waitForWeixinLogin({
    apiBaseUrl: baseUrl,
    routeTag,
    sessionKey: startResult.sessionKey,
    timeoutMs,
    logger,
  });

  if (!waitResult.connected) {
    throw new Error(waitResult.message);
  }

  const account = saveAccount(stateDir, {
    accountId: waitResult.accountId,
    baseUrl: waitResult.baseUrl || baseUrl,
    routeTag,
    token: waitResult.botToken,
    userId: waitResult.userId,
  });

  process.stdout.write(`Linked account: ${account.accountId}\n`);
  if (account.userId) {
    process.stdout.write(`Allowed user: ${account.userId}\n`);
  }

  return account;
}

function buildAdapter(options, cwd) {
  const adapterName = getStringOption(options, "adapter", "WXCLAWBOT_ADAPTER", "claude");

  if (adapterName === "echo") {
    return createEchoAdapter();
  }

  return createClaudeCodeAdapter({
    command: getStringOption(options, "claudeBin", "WXCLAWBOT_CLAUDE_BIN", "claude"),
    model: getStringOption(options, "claudeModel", "WXCLAWBOT_CLAUDE_MODEL", undefined),
    permissionMode: getStringOption(
      options,
      "claudePermissionMode",
      "WXCLAWBOT_CLAUDE_PERMISSION_MODE",
      undefined,
    ),
    allowedTools: getStringOption(options, "claudeAllowedTools", "WXCLAWBOT_CLAUDE_ALLOWED_TOOLS", undefined),
    timeoutMs: getNumberOption(options, "claudeTimeoutMs", "WXCLAWBOT_CLAUDE_TIMEOUT_MS", 300_000),
    cwd,
  });
}

function resolveAccountsForStart(stateDir, options) {
  const requestedAccountId = getStringOption(options, "accountId", "WXCLAWBOT_ACCOUNT_ID", undefined);
  if (requestedAccountId) {
    const account = loadAccount(stateDir, requestedAccountId);
    if (!account) {
      throw new Error(`Unknown account: ${requestedAccountId}`);
    }
    return [account];
  }

  return listAccounts(stateDir);
}

async function runStart(options) {
  const stateDir = resolveStateDir(options.stateDir);
  const cwd = path.resolve(getStringOption(options, "cwd", "WXCLAWBOT_WORKDIR", process.cwd()));

  let accounts = resolveAccountsForStart(stateDir, options);
  if (accounts.length === 0 || options.login === true) {
    const account = await runLogin(options);
    accounts = [account];
  }

  if (accounts.length === 0) {
    throw new Error("No saved accounts. Run `wxclawbot-cc-codex login` first.");
  }

  const routeTagOverride = getStringOption(options, "routeTag", "WXCLAWBOT_ROUTE_TAG", undefined);
  const baseUrlOverride = getStringOption(options, "baseUrl", "WXCLAWBOT_WEIXIN_BASE_URL", undefined);
  const normalizedAccounts = accounts.map((account) => ({
    ...account,
    routeTag: routeTagOverride ?? account.routeTag,
    baseUrl: baseUrlOverride ?? account.baseUrl ?? DEFAULT_WEIXIN_BASE_URL,
  }));

  const adapter = buildAdapter(options, cwd);
  const gateway = createGateway({
    stateDir,
    adapter,
    cwd,
    logger,
  });

  const controller = new AbortController();
  const shutdown = () => controller.abort();
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  process.stdout.write(`State dir: ${stateDir}\n`);
  process.stdout.write(`Workdir: ${cwd}\n`);
  process.stdout.write(`Adapter: ${adapter.id}\n`);
  process.stdout.write(`Accounts: ${normalizedAccounts.map((account) => account.accountId).join(", ")}\n`);

  await gateway.start(normalizedAccounts, controller.signal);
}

function runAccounts(options) {
  const stateDir = resolveStateDir(options.stateDir);
  const accounts = listAccounts(stateDir);

  if (accounts.length === 0) {
    process.stdout.write("No accounts saved.\n");
    return;
  }

  for (const account of accounts) {
    process.stdout.write(
      `${account.accountId}\tbaseUrl=${account.baseUrl}\tuserId=${account.userId ?? "-"}\tsavedAt=${account.savedAt ?? "-"}\n`,
    );
  }
}

async function main() {
  const { command, options } = parseArgv(process.argv.slice(2));

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "login") {
    await runLogin(options);
    return;
  }

  if (command === "accounts") {
    runAccounts(options);
    return;
  }

  if (command === "start") {
    await runStart(options);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  logger.error("command failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
