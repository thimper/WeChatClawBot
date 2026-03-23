import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveConfigPath } from "./accounts.js";
import { logger } from "../util/logger.js";

export type AvailableAgent = {
  id: string;
  workspace: string;
  isDefault: boolean;
};

type AgentEntry = {
  id: string;
  default?: boolean;
  workspace?: string;
};

type RouteBinding = {
  type?: string;
  agentId: string;
  match: {
    channel: string;
    accountId?: string;
  };
};

type OpenClawRawConfig = {
  agents?: {
    defaults?: { workspace?: string };
    list?: AgentEntry[];
  };
  bindings?: RouteBinding[];
};

function readConfig(): OpenClawRawConfig | null {
  const configPath = resolveConfigPath();
  try {
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as OpenClawRawConfig;
  } catch {
    return null;
  }
}

function writeConfigAtomic(cfg: OpenClawRawConfig): void {
  const configPath = resolveConfigPath();
  const tmpPath = `${configPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify(cfg, null, 2), "utf-8");
  fs.renameSync(tmpPath, configPath);
}

function defaultWorkspace(cfg: OpenClawRawConfig): string {
  return cfg.agents?.defaults?.workspace ?? path.join(os.homedir(), ".openclaw", "workspace");
}

export function listAvailableAgents(): AvailableAgent[] {
  const cfg = readConfig();
  if (!cfg) {
    return [{ id: "main", workspace: path.join(os.homedir(), ".openclaw", "workspace"), isDefault: true }];
  }

  const list = cfg.agents?.list;
  if (!Array.isArray(list) || list.length === 0) {
    return [{ id: "main", workspace: defaultWorkspace(cfg), isDefault: true }];
  }

  return list.map((entry) => ({
    id: entry.id,
    workspace: entry.workspace ?? (entry.default || entry.id === "main" ? defaultWorkspace(cfg) : path.join(os.homedir(), ".openclaw", `workspace-${entry.id}`)),
    isDefault: Boolean(entry.default) || entry.id === "main",
  }));
}

function hasBinding(bindings: RouteBinding[], accountId: string): RouteBinding | undefined {
  return bindings.find(
    (b) => b.match?.channel === "openclaw-weixin" && b.match?.accountId === accountId,
  );
}

/**
 * Provision an agent + binding for a newly scanned WeChat account.
 *
 * @param accountId - Normalized account ID (e.g. "c2c931dee47b-im-bot")
 * @param agentId - Which agent to bind to:
 *   - undefined / "main" → bind to default agent, no new agent created
 *   - existing agent ID → bind to that agent, no new agent created
 *   - "__new__" → create a new agent with auto-generated ID + workspace
 */
export function provisionAgentForAccount(accountId: string, agentId?: string): void {
  try {
    const cfg = readConfig();
    if (!cfg) {
      logger.warn(`auto-provision: openclaw.json not found, skipping`);
      return;
    }

    const isNew = agentId === "__new__";
    const targetAgentId = isNew ? `weixin-${accountId}` : (agentId || "main");

    // Ensure agents.list exists
    if (!cfg.agents) cfg.agents = {};
    if (!Array.isArray(cfg.agents.list)) {
      cfg.agents.list = [{ id: "main" }];
    }

    // Create new agent if requested
    if (isNew) {
      const exists = cfg.agents.list.some((e) => e.id === targetAgentId);
      if (exists) {
        logger.info(`auto-provision: agent ${targetAgentId} already exists, skipping agent creation`);
      } else {
        const workspacePath = path.join(os.homedir(), ".openclaw", `workspace-weixin-${accountId}`);
        cfg.agents.list.push({ id: targetAgentId, workspace: workspacePath });
        fs.mkdirSync(workspacePath, { recursive: true });
        logger.info(`auto-provision: created agent ${targetAgentId} with workspace ${workspacePath}`);
      }
    }

    // Ensure bindings array exists
    if (!Array.isArray(cfg.bindings)) {
      cfg.bindings = [];
    }

    // Add binding if not already present
    const existing = hasBinding(cfg.bindings, accountId);
    if (existing) {
      if (existing.agentId === targetAgentId) {
        logger.info(`auto-provision: binding for ${accountId} → ${targetAgentId} already exists`);
      } else {
        existing.agentId = targetAgentId;
        logger.info(`auto-provision: updated binding for ${accountId} → ${targetAgentId}`);
      }
    } else {
      cfg.bindings.push({
        type: "route",
        agentId: targetAgentId,
        match: { channel: "openclaw-weixin", accountId },
      });
      logger.info(`auto-provision: created binding ${accountId} → ${targetAgentId}`);
    }

    writeConfigAtomic(cfg);
  } catch (err) {
    logger.error(`auto-provision: failed for accountId=${accountId} err=${String(err)}`);
  }
}
