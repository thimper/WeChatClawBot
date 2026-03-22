# wxclawbot-cc-codex

[English](./README.md)

基于[微信小龙虾 (WeChat ClawBot)](https://github.com/nicepkg/wechat-clawbot) 协议层二次开发，扩展支持 **Claude Code** 作为 AI 后端的独立网关服务。

微信扫码 -> 微信聊天 -> Claude Code 回复

> 提取微信小龙虾的协议层，重新实现为独立的 Node.js 服务，无需 ClawBot 运行时依赖。

<!-- TODO: 在这里放一张 demo 截图 -->

## 功能

- 微信扫码登录，账号本地持久化
- 微信私聊文本消息收发
- Claude Code 作为 AI 后端（支持多轮对话）
- 每个微信用户独立的 Claude 会话，重启后自动恢复
- Echo 适配器，用于协议层测试
- 纯 Node.js，无原生依赖

## 快速开始

### 前置条件

- Node.js >= 22
- 已安装并登录 [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

### 安装运行

```bash
git clone https://github.com/anthropics/wxclawbot-cc-codex.git
cd wxclawbot-cc-codex
npm install

# 第一步：登录 — 用微信扫描终端显示的二维码
npx wxclawbot-cc-codex login

# 第二步：启动 — 微信消息将转发给 Claude Code
npx wxclawbot-cc-codex start --cwd /path/to/your/project
```

完成。在微信发消息，Claude Code 会回复。

### 不接 Claude 先测协议（echo 模式）

```bash
npx wxclawbot-cc-codex start --adapter echo
```

## 命令参考

```
命令:
  login       生成微信二维码并绑定账号
  start       启动网关（转发消息到 Claude Code）
  accounts    列出已保存的微信账号

选项:
  --adapter <claude|echo>     AI 后端（默认: claude）
  --cwd <dir>                 Claude Code 工作目录
  --login                     启动前先登录
  --account-id <id>           指定已保存的账号
  --claude-model <model>      Claude 模型
  --claude-timeout-ms <ms>    响应超时（默认: 300000）
```

## 工作原理

```
微信用户
    |
    v
[微信小龙虾协议层]
    |
    v
wxclawbot-cc-codex 网关（本项目）
    |
    v
Claude Code CLI（本地）
    |
    v
回复到微信
```

1. 复用微信小龙虾的扫码登录和消息协议
2. 独立 Node.js 进程运行，不依赖 ClawBot 运行时
3. 将微信消息通过 CLI 转发给 Claude Code
4. 将 Claude 的回复发回同一个微信对话

## 路线图

- [ ] Codex 后端适配器
- [ ] 群聊 @bot 模式
- [ ] 媒体消息支持
- [ ] npm 全局安装 (`npm i -g wxclawbot-cc-codex`)
- [ ] 多账号管理

## 环境变量

| 变量 | 说明 |
|------|------|
| `WXCLAWBOT_STATE_DIR` | 状态目录（默认: `~/.wxclawbot-cc-codex`） |
| `WXCLAWBOT_WEIXIN_BASE_URL` | 微信 API 地址 |
| `WXCLAWBOT_ROUTE_TAG` | 路由标签 |
| `WXCLAWBOT_WORKDIR` | Claude Code 工作目录 |
| `WXCLAWBOT_CLAUDE_BIN` | Claude CLI 路径（默认: `claude`） |
| `WXCLAWBOT_CLAUDE_MODEL` | Claude 模型 |
| `WXCLAWBOT_CLAUDE_PERMISSION_MODE` | 权限模式 |

## 许可证

MIT
