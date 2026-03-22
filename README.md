# WXClawbot-cc-codex

[简体中文](./README.zh-CN.md)

Standalone gateway built on [WeChat ClawBot](https://github.com/nicepkg/wechat-clawbot) protocol, extending it to support **Claude Code** as the AI backend.

Scan WeChat QR -> Chat on WeChat -> Get Claude Code replies.

> Extracts the WeChat ClawBot protocol layer, re-implemented as a standalone Node.js service. No ClawBot runtime dependency required.

<!-- TODO: Add a demo screenshot here -->

## Features

- WeChat QR login with local account persistence
- Direct text message receive/reply loop via WeChat
- Claude Code as the AI backend (multi-turn session support)
- Per-user persistent Claude sessions across restarts
- Echo adapter for protocol-only testing
- Pure Node.js, no native dependencies

## Quick Start

### Prerequisites

- Node.js >= 22
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

### Install & Run

```bash
git clone https://github.com/anthropics/wxclawbot-cc-codex.git
cd wxclawbot-cc-codex
npm install

# Step 1: Login — scan the QR code with WeChat
npx wxclawbot-cc-codex login

# Step 2: Start — messages from WeChat will be forwarded to Claude Code
npx wxclawbot-cc-codex start --cwd /path/to/your/project
```

That's it. Send a message on WeChat, Claude Code will reply.

### Test without Claude (echo mode)

```bash
npx wxclawbot-cc-codex start --adapter echo
```

## CLI Reference

```
Commands:
  login       Generate a WeChat QR and link one account
  start       Start the gateway (forwards messages to Claude Code)
  accounts    List saved WeChat accounts

Options:
  --adapter <claude|echo>     AI backend (default: claude)
  --cwd <dir>                 Working directory for Claude Code
  --login                     Login before starting
  --account-id <id>           Use a specific saved account
  --claude-model <model>      Claude model override
  --claude-timeout-ms <ms>    Response timeout (default: 300000)
```

## How It Works

```
WeChat User
    |
    v
[WeChat ClawBot Protocol]
    |
    v
wxclawbot-cc-codex gateway (this project)
    |
    v
Claude Code CLI (local)
    |
    v
Reply back to WeChat
```

1. Reuses the WeChat ClawBot QR login and message protocol
2. Runs as a standalone Node.js process — no ClawBot runtime needed
3. Routes inbound WeChat messages to Claude Code via CLI
4. Returns Claude's response to the same WeChat conversation

## Roadmap

- [ ] Codex backend adapter
- [ ] Group chat (@bot mode)
- [ ] Media message support
- [ ] npm global install (`npm i -g wxclawbot-cc-codex`)
- [ ] Multi-account orchestration

## Environment Variables

| Variable | Description |
|----------|-------------|
| `WXCLAWBOT_STATE_DIR` | State directory (default: `~/.wxclawbot-cc-codex`) |
| `WXCLAWBOT_WEIXIN_BASE_URL` | WeChat API base URL |
| `WXCLAWBOT_ROUTE_TAG` | Route tag override |
| `WXCLAWBOT_WORKDIR` | Working directory for Claude Code |
| `WXCLAWBOT_CLAUDE_BIN` | Claude CLI binary (default: `claude`) |
| `WXCLAWBOT_CLAUDE_MODEL` | Claude model |
| `WXCLAWBOT_CLAUDE_PERMISSION_MODE` | Permission mode |

## License

MIT
