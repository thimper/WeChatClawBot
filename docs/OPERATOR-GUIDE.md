# Operator Guide

## 1) Goal

Validate the shortest real loop:

1. start local CLI
2. generate QR
3. link one Weixin account
4. receive one direct text message
5. forward it to Claude Code
6. send the reply back to the same user

## 2) Prerequisites

1. Node.js 22+
2. `claude` CLI installed and already authenticated locally
3. reachable Weixin gateway base URL

## 3) First Login

```bash
cd /Users/good/Documents/100agent/molthuman/wxclawbot-cc-codex
npm run login
```

The command prints a QR code URL. Scan it in Weixin and wait until the CLI confirms the linked account.

Saved state is written under:

`~/.wxclawbot-cc-codex`

## 4) Protocol-Only Check

Use the echo adapter first if you want to validate Weixin receive/send before Claude:

```bash
npm run start -- --adapter echo
```

Expected result:

1. send a direct text message from the linked Weixin user
2. receive `Echo: <your text>` back in the same conversation

## 5) Claude Check

Run the real adapter:

```bash
npm run start -- --cwd /absolute/path/to/target/workdir
```

Recommended optional flags:

```bash
npm run start -- \
  --cwd /absolute/path/to/target/workdir \
  --claude-permission-mode bypassPermissions
```

Only use `bypassPermissions` in a trusted local workspace.

## 6) Session Behavior

1. The gateway keeps one Claude session per `Weixin account + Weixin user`.
2. Consecutive messages from the same user reuse the same Claude session.
3. Restarting the gateway preserves both Weixin account state and Claude session IDs.

## 7) Useful Commands

List saved accounts:

```bash
npm run accounts
```

Start a specific account:

```bash
npm run start -- --account-id <account-id>
```

Login and start in one shot:

```bash
npm run start -- --login
```

## 8) Current Scope Limits

Current MVP does not include:

1. media upload/download
2. group chat support
3. multi-account orchestration policies
4. cloud deployment
5. admin UI
