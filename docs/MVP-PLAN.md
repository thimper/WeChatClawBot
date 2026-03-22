# wxclawbot-cc-codex MVP Plan

## 1) Project Background

This project is a new standalone Node.js service under the workspace root:

`/Users/good/Documents/100agent/molthuman/wxclawbot-cc-codex`

It is intentionally independent from:

1. `moltApp/`
2. `openclaw-main/`

We are not extending the current MoltHuman product codebase directly.
We are also not building on top of OpenClaw runtime as the final architecture.

Instead, we are creating a separate gateway/service that can:

1. connect to Tencent's Weixin bot access flow,
2. receive direct Weixin messages,
3. forward them to Claude Code first,
4. return the final result back to Weixin.

The long-term direction may include Codex support, but that is not part of the first execution batch.

## 2) Why This Project Exists

The business goal is:

Allow our own Claude Code style agent workflow to talk directly with users on Weixin, so that a user can chat on Weixin, Claude Code can execute a task, and the result can be returned back to the same Weixin conversation.

The important architectural constraint is:

We do not want to depend on OpenClaw as the long-term production runtime for this specific capability.

However, we already verified that Tencent's Weixin OpenClaw plugin source is readable and operational, so the fastest route is:

1. reuse the Weixin protocol-facing logic,
2. remove OpenClaw-specific runtime glue,
3. replace it with our own standalone gateway and Claude Code adapter.

## 3) Current Verified Facts

The following facts have already been validated locally in the current workspace:

1. Tencent's `openclaw-weixin` plugin source is readable TypeScript/ESM, not an encrypted or obfuscated black box.
2. QR code generation works.
3. Different Weixin accounts can scan and complete login.
4. Successful scans produce new account files on disk.
5. Gateway restart can auto-load persisted accounts.
6. The plugin currently has no hot-mount support after scan; restart is required.
7. Token expiry is a real P0 risk: `errcode -14` currently pauses an account for one hour.

Important implications:

1. The protocol path is technically usable.
2. The hard part is not basic code generation.
3. The main engineering risk is upstream Weixin behavior and long-running stability.

## 4) What This MVP Must Achieve

The first milestone is not a full production daemon.

The first milestone is a minimum usable manual-run validation:

1. operator starts the local gateway manually,
2. operator generates a QR code,
3. one Weixin user scans and links successfully,
4. the linked Weixin user sends one direct text message,
5. the service forwards the message to Claude Code,
6. Claude Code returns a text answer,
7. the service sends that answer back to the same Weixin user.

This is the first real success condition.

If this loop does not work, no other "service" or "platform" feature matters yet.

## 5) Why We Start With Claude Code Only

We will support Claude Code first.

We will not build Codex support in the first execution batch.

Reason:

1. The first failure risk is channel integration, not model diversity.
2. The first version must prove the Weixin -> backend -> Weixin loop.
3. Adding Codex too early increases scope without improving the first validation.
4. Once the backend adapter boundary is correct, Codex can be added later with much lower risk.

Execution rule:

Claude Code first.
Codex later.

## 6) Why Node.js Is the Required Technical Route

This project must use Node.js.

Reasons:

1. The existing Tencent Weixin plugin source is already in TypeScript/ESM.
2. The protocol, fetch, file persistence, long-poll loops, and process management all fit Node.js well.
3. Packaging as a cross-platform npm CLI/service is straightforward.
4. We want the eventual operator experience to be compatible with:
   - macOS
   - Windows
   - npm installation

Target packaging direction:

1. install via npm,
2. run as a local CLI/service process,
3. later add a simple supervisor mode if needed.

## 7) Project Goal Statement

This is the goal that every engineering decision must optimize for:

Make Claude Code able to talk directly with users through Weixin by means of our own standalone gateway/service, so that a user chats on Weixin, Claude Code can execute the requested task, and the result is returned to the same Weixin conversation.

Everything else is secondary.

## 8) Minimum Fastest Validation

The fastest correct validation is not a 24x7 service.

The fastest correct validation is:

1. manual process start,
2. manual QR generation,
3. one linked account,
4. one direct-text message in,
5. one Claude Code reply out.

This is the correct MVP boundary.

Only after this works should we add:

1. restart recovery,
2. better logging,
3. longer-running process supervision,
4. multi-account support,
5. Codex support.

## 9) Explicitly Out of Scope for the First Batch

Do not build these in the first batch:

1. Codex adapter
2. media upload/download
3. group chat support
4. multi-account orchestration
5. admin UI
6. cloud deployment
7. 24-hour daemon hardening
8. advanced task routing
9. retry orchestration beyond simple basic safety

If any implementation drifts into these, cut scope back immediately.

## 10) Reusable Resources

The new project should reuse knowledge and code structure from Tencent's readable Weixin plugin where useful.

Primary reusable resources in the current workspace:

1. Weixin QR login flow:
   - `/Users/good/Documents/100agent/molthuman/openclaw-main/extensions/openclaw-weixin/src/auth/login-qr.ts`
2. Weixin API wrapper:
   - `/Users/good/Documents/100agent/molthuman/openclaw-main/extensions/openclaw-weixin/src/api/api.ts`
3. Account persistence:
   - `/Users/good/Documents/100agent/molthuman/openclaw-main/extensions/openclaw-weixin/src/auth/accounts.ts`
4. Long-poll monitor loop:
   - `/Users/good/Documents/100agent/molthuman/openclaw-main/extensions/openclaw-weixin/src/monitor/monitor.ts`
5. Token expiry cooldown handling:
   - `/Users/good/Documents/100agent/molthuman/openclaw-main/extensions/openclaw-weixin/src/api/session-guard.ts`
6. Inbound context token handling:
   - `/Users/good/Documents/100agent/molthuman/openclaw-main/extensions/openclaw-weixin/src/messaging/inbound.ts`
7. Full message pipeline reference:
   - `/Users/good/Documents/100agent/molthuman/openclaw-main/extensions/openclaw-weixin/src/messaging/process-message.ts`

Important reuse rule:

Reuse protocol logic and storage logic.
Do not drag OpenClaw runtime abstractions into the new project.

## 11) Non-Reusable or Replaceable Parts

The following OpenClaw-specific integration should not be copied as architecture:

1. OpenClaw runtime registration
2. channel plugin lifecycle
3. OpenClaw route/session dispatch model
4. OpenClaw reply dispatcher glue

Those parts should be replaced by a much smaller standalone orchestration layer in this project.

## 12) Suggested Project Structure

Recommended structure:

1. `src/cli.mjs`
   - CLI entrypoint
2. `src/config/`
   - config parsing
3. `src/state/`
   - accounts, sessions, runtime cache, files
4. `src/weixin/auth/`
   - QR generation and QR wait logic
5. `src/weixin/api/`
   - HTTP protocol calls
6. `src/weixin/runtime/`
   - monitor loop and inbound/outbound flow
7. `src/adapters/claude-code/`
   - Claude Code adapter only
8. `src/core/`
   - dispatcher, session mapping, gateway orchestration
9. `src/logging/`
   - structured logging
10. `docs/`
   - plan and closeout notes

## 13) Required Adapter Boundary

Define a small backend adapter interface first.

Expected shape:

```ts
type ChatAdapter = {
  id: string;
  sendMessage(params: {
    sessionId: string;
    userId: string;
    text: string;
    cwd?: string;
  }): Promise<{
    text: string;
    raw?: unknown;
  }>;
};
```

This is important because:

1. it keeps Claude Code integration isolated,
2. it makes future Codex support cheap,
3. it prevents the Weixin layer from becoming backend-specific.

## 14) Engineering Execution Order

Execution must happen in this order:

### Step 1

Create the standalone project skeleton.

### Step 2

Copy and adapt the Weixin QR login and account persistence logic.

Success condition:

1. QR link can be generated
2. successful scan creates account files

### Step 3

Copy and adapt the long-poll `getUpdates` receive loop and outbound text send path.

Success condition:

1. one inbound text message is received
2. service can send one fixed reply

### Step 4

Implement a fixed-text or echo pipeline without Claude Code.

Success condition:

1. Weixin user sends message
2. service replies deterministically

### Step 5

Replace the fixed-text reply with a Claude Code adapter.

Success condition:

1. inbound text reaches Claude Code
2. Claude Code returns text
3. text is sent back to Weixin

### Step 6

Add clean restart recovery.

Success condition:

1. persisted account reloads
2. inbound message still works after restart

Do not reorder these steps.

## 15) Deliverables for the First Engineering Batch

The first engineering batch must produce:

1. a standalone Node.js project under `wxclawbot-cc-codex/`
2. a CLI command that can start the local service
3. a QR login flow
4. per-account persisted state
5. a one-account direct text message loop
6. a Claude Code adapter
7. an end-to-end demo script or operator instructions

## 16) Acceptance Criteria

The batch is only considered successful if all of the following are true:

1. A QR code can be generated on demand.
2. A Weixin account can scan and complete login.
3. The linked account is persisted to local state.
4. A direct Weixin text message is received by the standalone service.
5. The service forwards the text to Claude Code.
6. Claude Code returns a text reply.
7. The same Weixin user receives that reply.

If any of these are missing, the MVP is not complete.

## 17) Biggest Risk

The biggest risk is not code generation speed.

The biggest risk is Weixin-side instability and policy behavior.

Primary risk items:

1. QR refresh or repeated QR generation may be limited.
2. repeated account switching may trigger upstream restrictions.
3. `errcode -14` already proves token expiry/cooldown is a real operational risk.
4. upstream protocol behavior may change without notice.

Secondary risk:

Claude Code invocation behavior may differ by local machine, authentication mode, session reuse, or CLI output shape.

## 18) Risk Priority

Priority order:

1. Weixin protocol stability
2. token/cooldown handling
3. Claude Code adapter behavior
4. restart recovery
5. service packaging

This order must drive engineering decisions.

## 19) Important Product Constraint

Every engineering tradeoff must remember the actual product objective:

We are not building a generic chat bot framework.
We are building the smallest standalone gateway that lets Weixin users directly talk to Claude Code and receive task results back in Weixin.

If a feature does not help this objective, defer it.

## 20) Final Execution Decision

Proceed immediately with:

1. standalone Node.js implementation,
2. manual-run MVP first,
3. Claude Code only,
4. direct text chat only,
5. protocol reuse from Tencent's readable Weixin plugin,
6. zero OpenClaw runtime dependency in the new architecture.

That is the correct execution path for the first batch.
