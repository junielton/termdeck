# TermDeck

TermDeck is a Stream Deck–like desktop app for launching terminal commands from a clean, button-based UI. It’s built with Electron (main), a secure preload bridge, and a Vue 3 renderer.

## Highlights

- Visual grid of customizable command buttons
- Per-directory profiles (auto-selected based on the current working directory)
- Real-time logs with ANSI color support and timestamps
- Interactive commands (detects prompts like “password:” and lets you send input)
- Concurrency policies: parallel, single-per-button, single-global
- Optional notifications on command completion (native when available, in-app fallback)
- Customization: labels, colors, and Lucide icons with quick search
- Flexible layout: vertical (log on the right) or horizontal (log at the bottom)
- Internationalization: English and Portuguese

## Installation

Global install via npm (recommended for end users):

```bash
npm install -g termdeck
termdeck
```

From source (development):

```bash
git https://github.com/junielton/termdeck.git
cd termdeck
npm install
npm run dev
```

Notes
- The CLI entry point is `termdeck` (provided by `bin/termdeck.js`).
- The app stores state under your home folder (see Configuration below).
- Since this is an Electron app, the global install will download Electron as a dependency.

## Usage

1) Launch TermDeck from any project directory:

```bash
termdeck
```

2) Create your first button with the + button in the top bar.

3) Configure the command (label, shell command, optional icon/color, concurrency/notifications).

4) Click the button to run. Output is streamed live; you can stop, copy, or clear logs.

Parameters and placeholders
- Commands may include placeholders like `${name}`.
- When present, the app will ask you to fill them before executing (with a preview of the final command).

Interactive input
- Common prompts (e.g., `password:`) are detected; the app opens an input modal and sends your response to the running process stdin.

Concurrency
- Choose between `parallel`, `single-per-button`, or `single-global` to prevent overlapping runs.

Safety
- You can enable per-button confirmation.
- The app includes a basic heuristic to warn on obviously destructive commands.

## Configuration

User configuration and profiles are stored here:

- Linux/macOS: `~/.config/termdeck/deck.json`
- Windows: `%APPDATA%\termdeck\deck.json`

The file contains:
- `profiles` (with buttons, layout, and optional `rootDir`)
- `activeProfileId`
- `directoryProfiles` (maps normalized directories to profile IDs)
- `concurrencyPolicy`
- `locale`

You may edit the file manually while the app is closed; a backup is created if the existing file is invalid.

## How it works

- Main process (Electron):
	- Spawns commands using your interactive shell (`$SHELL` on POSIX, `shell: true` on Windows)
	- Streams stdout/stderr to the renderer via IPC channels
	- Detects common prompts and requests input via the preload bridge
	- Enforces concurrency policy and timeouts
	- Persists configuration on disk

- Preload bridge: exposes a small, typed API on `window.termdeck` for the renderer (no Node.js globals in the UI).

- Renderer (Vue 3 + Vite + Tailwind): grid UI, logs with ANSI colors, profile & button editors, i18n.

Optional server mode
- The repository also contains a lightweight HTTP/WebSocket API server (Node.js) for advanced setups (e.g., WSL or remote execution). See `src/server/api.ts`. This is optional and not required for normal desktop usage.

## Development

```bash
# Install deps
npm install

# Run dev (Vite + TS watch + Electron)
npm run dev

# Production build
npm run build

# Lint / format / typecheck / tests
npm run lint
npm run format
npm run typecheck
npm test
```

Project layout (selected)
- `src/main` – Electron main process and preload
- `src/renderer` – Vue 3 application
- `src/server` – Optional REST/WS server
- `src/api` – Optional client for server mode
- `src/types` – Shared types

## Internationalization

Languages available:
- English (`en`)
- Portuguese (`pt`)

Translations live under `src/renderer/locales/`. Contributions welcome.

## Security notes

- TermDeck executes arbitrary commands you configure. Review and confirm commands carefully.
- For sensitive environments, consider enabling confirmations and timeouts.
- Do not expose the optional server to untrusted networks without proper authentication and isolation.

## Roadmap (abridged)

- Script library and reusable templates
- Rich parameter forms for commands
- Profile import/export and sharing
- Plugin hooks (before/after run)
- Better ANSI rendering and log tools (filters, search)

See Issues/Discussions for the current plan and community requests.

## Contributing

1. Fork the repo and create a topic branch
2. Run `npm run lint && npm run typecheck` locally
3. Add tests for behavior changes where applicable
4. Open a PR with a clear description and screenshots when UI changes are involved

Coding notes
- Keep the preload surface minimal and typed
- Prefer async/await and early returns for clarity
- Avoid large dependencies unless tree-shakeable

## License

MIT — see [LICENSE](LICENSE).
