import type { OpenClawConfig } from "openclaw/plugin-sdk/core";

export type WeixinDemoServiceConfig = {
  enabled: boolean;
  bind: string;
  port: number;
  restartCommand: string;
};

const DEFAULT_CONFIG: WeixinDemoServiceConfig = {
  enabled: true,
  bind: "127.0.0.1",
  port: 19120,
  restartCommand: "openclaw gateway restart",
};

export function resolveWeixinDemoServiceConfig(config: OpenClawConfig): WeixinDemoServiceConfig {
  const channels = (config as Record<string, unknown>).channels as Record<string, unknown> | undefined;
  const section = channels?.["openclaw-weixin"] as Record<string, unknown> | undefined;
  const demoService = section?.demoService as Record<string, unknown> | undefined;

  return {
    enabled: typeof demoService?.enabled === "boolean" ? demoService.enabled : DEFAULT_CONFIG.enabled,
    bind: typeof demoService?.bind === "string" && demoService.bind.trim()
      ? demoService.bind.trim()
      : DEFAULT_CONFIG.bind,
    port:
      typeof demoService?.port === "number" &&
      Number.isInteger(demoService.port) &&
      demoService.port > 0 &&
      demoService.port <= 65535
        ? demoService.port
        : DEFAULT_CONFIG.port,
    restartCommand:
      typeof demoService?.restartCommand === "string" && demoService.restartCommand.trim()
        ? demoService.restartCommand.trim()
        : DEFAULT_CONFIG.restartCommand,
  };
}
