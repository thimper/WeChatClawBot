# MoltHuman Weixin Demo Plugin

Single-package Weixin demo plugin for `openclaw-main`.

## Scope

- Registers the Weixin channel internally.
- Starts a local HTTP/H5 control surface.
- Creates QR login sessions.
- Shows account status, cooldown visibility for `errcode = -14`, and recent warnings/errors.
- Returns a manual Gateway restart command after scan success.

This package does not bridge into `moltApp` billing, orders, or settlement.

## Install

```bash
npm install molthuman-oc-plugin-wx
```

OpenClaw plugin entry:

```json
{
  "session": {
    "dmScope": "per-account-channel-peer"
  },
  "plugins": {
    "entries": {
      "molthuman-oc-plugin-wx": {
        "enabled": true,
        "package": "molthuman-oc-plugin-wx"
      }
    }
  },
  "channels": {
    "openclaw-weixin": {
      "baseUrl": "https://ilinkai.weixin.qq.com",
      "demoService": {
        "enabled": true,
        "bind": "127.0.0.1",
        "port": 19120,
        "restartCommand": "openclaw gateway restart"
      }
    }
  }
}
```

## Local Control Page

Default URL:

```text
http://127.0.0.1:19120/
```

Available endpoints:

- `GET /`
- `GET /api/health`
- `POST /api/qr/create`
- `GET /api/qr/:sessionKey/status`
- `GET /api/accounts`
- `POST /api/accounts/:accountId/relogin`
- `GET /api/errors`
- `POST /api/gateway/restart`

## MVP Flow

1. Open the local control page.
2. Create a QR code.
3. Scan with Weixin and complete confirmation.
4. Restart Gateway with the command shown by the page.
5. Send one first message from the Weixin user to establish the `context_token`.
6. Wait for replies from the agent.

## Isolation

- First-release recommendation: keep a single agent, but set `session.dmScope` to `per-account-channel-peer`.
- This isolates DM session history per Weixin account and per sender without introducing one-agent-per-account management overhead.

## Known Limits

- Gateway restart is manual in MVP.
- `errcode = -14` cooldown is visible but not auto-recovered.
- The plugin vendors the current verified Weixin implementation; do not assume upstream package compatibility.
