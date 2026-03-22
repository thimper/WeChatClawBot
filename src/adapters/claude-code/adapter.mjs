import { spawn } from "node:child_process";

function runClaudeCommand({ command, args, cwd, env, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        child.kill("SIGTERM");
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      finished = true;
      reject(error);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      finished = true;

      if (code === 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code,
        });
        return;
      }

      const error = new Error(
        `claude failed with code=${code ?? "null"} signal=${signal ?? "none"} stderr=${stderr.trim() || "(empty)"} stdout=${stdout.trim() || "(empty)"}`,
      );
      reject(error);
    });
  });
}

export function createClaudeCodeAdapter(options) {
  return {
    id: "claude-code",
    async sendMessage({ sessionId, resumeSession, userId, text, cwd }) {
      const args = [
        "-p",
        "--output-format",
        "text",
        "--input-format",
        "text",
        "--add-dir",
        cwd,
        "--append-system-prompt",
        "Reply in plain text suitable for Weixin. Keep formatting simple and concise unless the user asks for detail.",
      ];

      if (resumeSession) {
        args.push("--resume", sessionId);
      } else {
        args.push("--session-id", sessionId);
      }

      if (options.permissionMode) {
        args.push("--permission-mode", options.permissionMode);
      }

      if (options.model) {
        args.push("--model", options.model);
      }

      if (options.allowedTools) {
        args.push("--allowedTools", options.allowedTools);
      }

      args.push(text);

      const result = await runClaudeCommand({
        command: options.command,
        args,
        cwd,
        env: {
          ...process.env,
        },
        timeoutMs: options.timeoutMs,
      });

      return {
        text: result.stdout || `Claude returned no text for user ${userId}.`,
        raw: result,
      };
    },
  };
}
