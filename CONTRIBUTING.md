# Contributing to Agents Monitor

Thanks for helping improve Agents Monitor.

## Before You Start

Agents Monitor is a local-first monitoring tool. Please never include private Codex or Claude Code session data, prompt content, credentials, access tokens, or screenshots containing sensitive information in issues or pull requests.

## Development Setup

Requirements:

- Windows
- Node.js 20 or newer

Clone the repository and install dependencies:

```bash
git clone https://github.com/Nardpoe/Agents-Monitor.git
cd Agents-Monitor
npm ci
```

Start the app:

```bash
npm start
```

## Before Opening a Pull Request

Run:

```bash
npm test
npm run check
```

Keep changes focused and explain:

- what changed
- why it changed
- how you tested it
- any limitations or follow-up work

## Reporting Bugs

Please include:

- Windows version
- Node.js version
- steps to reproduce
- expected behavior
- actual behavior
- relevant logs with private information removed

Do not include prompt text, task names, personal file paths, API keys, tokens, or private session content.

## Feature Requests

Describe the problem or workflow you want to improve before proposing a specific implementation. Screenshots or mockups are welcome when they do not contain private data.

## Pull Requests

Small, focused pull requests are easier to review. Add or update tests when behavior changes.

By contributing, you agree that your contribution may be distributed under the repository's MIT License.

## Code of Conduct

Please follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
