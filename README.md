# Agents Monitor

A local browser-based monitor for tracking Codex and Claude Code activity in near real time.

![Agents Monitor](advanced-check.png)

## Features

- Opens in a dedicated browser window
- Dark semi-transparent interface docked to the right side of the screen
- Compact and expanded modes
- Codex monitoring:
  - 5-hour and weekly quota when `rate_limits` data is available
  - burn rate
  - tokens per minute
  - recent sessions and agents
- Claude Code monitoring:
  - session tokens
  - tokens per minute
  - recent sessions
- Reads local files only
- Does not send data to external servers
- If Codex does not provide `rate_limits`, the app displays `n/a` instead of estimating quota usage

## Data Sources

Agents Monitor reads local session files from:

- Codex: `~/.codex/sessions/**/*.jsonl`
- Claude Code: `~/.claude/projects/**/*.jsonl`

The application does not display or store prompt text.

JSONL records are only used to extract usage metadata, model information, and session structure.

## Installation

Requires:

- Windows
- Node.js 20 or newer

Clone the repository:

```bash
git clone https://github.com/Nardpoe/Agents-Monitor.git
cd Agents-Monitor
```

Install dependencies:

```bash
npm ci
```

Start Agents Monitor:

```bash
npm start
```

Agents Monitor starts a local server and automatically opens Edge or Chrome.

To start only the server:

```bash
npm run serve
```

Then open:

```text
http://127.0.0.1:4173
```

## Default Color Thresholds

### Codex burn rate

- Green: below 1 percentage point per minute
- Yellow: from 1 to below 3 percentage points per minute
- Red: 3 or more percentage points per minute

### Remaining quota

- Green: above 35%
- Yellow: 16% to 35%
- Red: 0% to 15%

These are UI thresholds and are not official OpenAI thresholds.

## Current Limitations

- Claude subscription quota is not estimated. If quota information is unavailable locally, Agents Monitor only displays token usage and activity.
- Codex sub-agent detection is heuristic because session fields may vary between client versions.
- The initial parser reads at most the last 8 MB of each file and then continues incrementally to avoid loading very large histories into memory.

## Privacy

Agents Monitor is designed to stay local.

- No telemetry
- No external APIs
- No uploads
- No prompt content collection

The server listens only on:

```text
127.0.0.1
```

This means the interface is not exposed to your local network.

## Development

Run the tests:

```bash
npm test
```

Run syntax and consistency checks:

```bash
npm run check
```

## Contributing

Issues and pull requests are welcome.

Before submitting a change, run:

```bash
npm test
npm run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## License

Distributed under the MIT License.

See [LICENSE](LICENSE).
