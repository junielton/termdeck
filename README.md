# TermDeck

Stream Deck-like command launcher for terminal contexts. A modern Electron application with Vue.js frontend that provides a visual interface for running terminal commands with button-based controls.

## ✨ Features

### Core Functionality
- **🎮 Stream Deck Interface**: Visual grid of customizable command buttons
- **📁 Per-Directory Profiles**: Automatic profile switching based on current directory
- **⚡ Command Execution**: Run shell commands with real-time output streaming
- **🔄 Concurrency Control**: Configure how commands run (parallel, single-per-button, single-global)
- **📝 Interactive Prompts**: Handle stdin input/password prompts with modal dialogs
- **🔔 Notifications**: Optional notifications on command completion (native + fallback)
- **🌍 Internationalization**: Multi-language support (English, Portuguese)

### Advanced Features
- **🎨 Customization**: Button colors, icons (Lucide icon pack), and labels
- **📋 Drag & Drop**: Reorder buttons with intuitive drag and drop
- **🔍 Icon Search**: Autocomplete icon picker with 1000+ Lucide icons
- **📊 Real-time Logs**: Sidebar log panel with ANSI color support and timestamps
- **⚙️ Flexible Layout**: Horizontal/vertical log panel orientation
- **💾 Persistent Settings**: UI preferences saved across sessions
- **📜 Command History**: Buffer controls and auto-scroll for log management

### Cross-Platform Architecture
- **🖥️ Native Mode**: Standard Electron app for local terminal commands
- **🔗 Client-Server Mode**: WSL/Windows split architecture (like VS Code)
  - Electron client runs on Windows
  - API server runs in WSL for Linux command execution
  - Automatic environment detection and server management
- **🔧 Server Mode**: Standalone API server for headless operation

### Script Management (Planned)
- **📜 Script Library**: Save and organize reusable command scripts
- **🔗 Script-Button Linking**: Associate saved scripts with buttons
- **📝 Parameterized Execution**: Pass parameters to commands via modal forms
- **🎯 Dynamic Parameters**: Configure buttons to prompt for parameters before execution

## 🚀 Installation

### Global Installation
```bash
npm install -g termdeck
termdeck
```

### Local Development
```bash
git clone <repository>
cd termdeck
npm install
npm run build
npm start
```

### WSL/Windows Setup
For WSL users who want the VS Code-like experience:

1. **Install on Windows** (recommended):
   ```cmd
   npm install -g termdeck
   termdeck
   ```
   The app will auto-detect WSL and start in client mode.

2. **Install in WSL** (for server mode):
   ```bash
   npm install -g termdeck
   termdeck --server
   ```

## 🎯 Usage

### Basic Usage
1. **Launch TermDeck**: Run `termdeck` from any directory
2. **Add Buttons**: Click the "+" button to create command buttons
3. **Configure Commands**: Set label, command, icon, and notification preferences
4. **Run Commands**: Click buttons to execute commands and view real-time output

### Profile Management
- **Auto-switching**: Profiles automatically switch based on current directory
- **Manual Creation**: Create profiles for specific projects or workflows
- **Button Organization**: Each profile supports customizable grid layouts
- **Directory Mapping**: Associate profiles with specific directory paths

### Command Configuration
- **Basic Setup**: Label, command, and working directory
- **Visual Customization**: Choose from 1000+ Lucide icons and custom colors
- **Concurrency Control**: Set per-button execution policies
- **Notifications**: Enable completion notifications (success, error, or both)
- **Confirmation**: Add confirmation dialogs for destructive commands

### Interactive Commands
TermDeck automatically detects when commands need input:
- **Password Prompts**: Secure password input with hidden characters
- **User Input**: Text input for interactive command prompts
- **Real-time Detection**: Automatic prompt detection and modal presentation

### Advanced Configuration
```json
{
  "schemaVersion": 1,
  "activeProfileId": "default",
  "profiles": [
    {
      "id": "default",
      "name": "Default",
      "rows": 3,
      "cols": 5,
      "buttons": [
        {
          "id": "unique-id",
          "label": "Build Project",
          "command": "npm run build",
          "cwd": "/path/to/project",
          "icon": { "pack": "lucide", "name": "hammer" },
          "color": "#10b981",
          "notifyOn": "both",
          "concurrency": "single-per-button"
        }
      ]
    }
  ],
  "concurrencyPolicy": "single-per-button",
  "locale": "en"
}
```

## 🏗️ Architecture

### Client-Server Split (WSL/Windows)
```
┌─────────────────┐    HTTP/WebSocket    ┌──────────────────┐
│   Windows Host  │ ◄─────────────────► │   WSL Instance   │
│                 │                      │                  │
│ Electron Client │                      │   API Server     │
│ (UI + State)    │                      │ (Command Exec)   │
└─────────────────┘                      └──────────────────┘
```

**Benefits:**
- **Native UI**: Full Electron interface on Windows
- **Linux Context**: Commands execute in authentic Linux environment
- **Automatic Setup**: Environment detection and server auto-start
- **Seamless Experience**: Transparent cross-system operation

### API Endpoints (Server Mode)
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create new profile
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile
- `POST /api/profiles/:id/buttons` - Add button to profile
- `PUT /api/profiles/:id/buttons/:buttonId` - Update button
- `DELETE /api/profiles/:id/buttons/:buttonId` - Delete button
- `POST /api/run` - Execute command
- `POST /api/stop` - Stop running command
- `POST /api/input` - Send input to running command
- `GET /api/state` - Get server state

### WebSocket Events
- `log` - Real-time command output
- `commandStarted` - Command execution started
- `commandEnded` - Command execution finished
- `promptRequired` - Interactive input needed
- `notification` - Command completion notification

## 🔧 Configuration

### Environment Variables
- `TERMDECK_MODE`: Force specific mode (`native`, `client`, `server`)
- `TERMDECK_PORT`: Server port (default: 3001)
- `VITE_DEV_SERVER_URL`: Development server URL

### Config File Location
- **Linux/macOS**: `~/.config/termdeck/deck.json`
- **Windows**: `%APPDATA%\termdeck\deck.json`

## 🎨 Customization

### Icons
TermDeck uses the Lucide icon pack with 1000+ icons. Icons are searchable and support autocomplete:
- Type icon names in the icon picker
- Preview icons before selection
- Responsive icon sizing

### Colors
- **Custom Colors**: Hex color codes for button backgrounds
- **Theme Support**: Consistent color schemes across UI
- **Visual Feedback**: Color-coded button states

### Layout Options
- **Grid Size**: Configure rows and columns per profile
- **Log Panel**: Toggle between horizontal and vertical layouts
- **Compact Mode**: Dense button layouts for more commands
- **Responsive Design**: Adapts to different window sizes

## 🌐 Internationalization

Supported languages:
- **English** (`en`)
- **Portuguese** (`pt`)

Add new languages by contributing translation files in `src/renderer/locales/`.

## 🔒 Security

- **Sandbox Safety**: Electron security best practices
- **CSP Compliance**: Content Security Policy enforcement
- **Input Validation**: Command injection protection
- **Process Isolation**: Secure command execution

## 🧪 Testing

```bash
# Run all tests
npm test

# Test environment detection
npm run test:env

# Lint code
npm run lint

# Type checking
npm run typecheck
```

## 📦 Building

```bash
# Development build
npm run build

# Production build with optimization
npm run build:all

# Build specific components
npm run build:main      # Main process
npm run build:renderer  # Vue frontend
npm run build:utils     # Utilities and server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines
- **TypeScript**: Strict type checking required
- **Vue 3**: Composition API preferred
- **ESLint**: Follow established linting rules
- **Testing**: Add tests for new features
- **Documentation**: Update README for significant changes

## 📝 Roadmap

### Upcoming Features
- [ ] **Script Library**: Save and manage reusable command scripts
- [ ] **Parameter Forms**: Dynamic parameter input for commands
- [ ] **Command Templates**: Pre-configured command templates
- [ ] **Export/Import**: Profile sharing and backup
- [ ] **Plugin System**: Extensible architecture for custom functionality
- [ ] **Cloud Sync**: Profile synchronization across devices
- [ ] **Advanced Scheduling**: Cron-like command scheduling
- [ ] **Performance Monitoring**: Command execution analytics

### Platform Support
- [ ] **macOS**: Native macOS application
- [ ] **Linux Native**: Direct Linux Electron app
- [ ] **Docker**: Containerized server mode
- [ ] **Remote SSH**: Execute commands on remote servers

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron**: Cross-platform desktop framework
- **Vue.js**: Progressive JavaScript framework
- **Lucide**: Beautiful icon pack
- **Tailwind CSS**: Utility-first CSS framework
- **Socket.IO**: Real-time communication
- **Zod**: TypeScript-first schema validation

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](../../issues)
- **Feature Requests**: [GitHub Discussions](../../discussions)
- **Documentation**: [GitHub Wiki](../../wiki)

---

**TermDeck** - Bringing the Stream Deck experience to terminal workflows with modern web technologies.

---

## ✨ Visão Geral

`termdeck` permite criar botões que executam comandos de terminal rapidamente, com perfis por diretório, logs enriquecidos (ANSI, timestamps), políticas de concorrência e personalização visual. A UI oferece modo vertical (log à direita) ou horizontal (log embaixo), auto‑scroll inteligente, e recursos de internacionalização (en/pt).

---

## ✅ Funcionalidades Implementadas

### Núcleo / Configuração
- Config JSON persistente em `~/.config/termdeck/deck.json` (perfis, botões, locale, política de concorrência).
- Perfis múltiplos + seleção automática por diretório (directoryProfiles).
- CRUD de perfis (criar, renomear, deletar) e de botões (label, command, color, icon, confirm, timeout, icon autocomplete).
- Reordenação de botões via drag & drop (persistida).
- Execução de comandos em shell interativo respeitando aliases do usuário (`.zshrc` / `.bashrc`).
- Timeout por botão + stop/kill manual.
- Políticas de concorrência: `parallel`, `single-per-button`, `single-global` (com bloqueio registrado no log).
- Confirmação opcional (flag confirm) para comandos sensíveis.
- Validação de schema com fallback / backup.

### Interface / UX
- Layout flexível: botão grid responsivo, tamanhos compactos, densidade ajustada recentemente.
- Orientação alternável: vertical (log lateral) ou horizontal (log inferior) com resize persistente (largura / altura).
- Painel de logs global + por botão (tabs) com: 
	- ANSI color parsing (cores básicas + 256, bold, underline, italic, reset, background). 
	- Auto‑scroll inteligente (toggle + botão “Scroll to bottom”).
	- Timestamps (HH:MM:SS + tooltip ISO). 
	- Buffer configurável (slider, persistência local). 
	- Clear / Copy (global e por botão). 
	- Coloração heurística: stderr, exit codes, timeout, blocked.
- Resizable panel (arrastar, double‑click para reset). 
- Modal de edição com color picker básico + icon autocomplete (Lucide). 
- Persistência de locale (en/pt) e UI para troca.
- Spinner + outline azul ao rodar.
- Mensagens de bloqueio de concorrência no log.
- Tratamento de carriage return (mantém atualização final de linhas de progresso).
 - Notificações por botão (configurável: off / fail / always) ao terminar execução (sucesso, falha ou timeout) focando janela ao clicar.

### CLI / Dev Experience
- Bin global `termdeck` (detecta WSL e usa `--no-sandbox` quando necessário).
- Script `scripts/dev-link.sh` para build + `npm link` + alias `tdk` automático.
- Execução usando shell de login para habilitar aliases e PATH custom.

### Internacionalização e Segurança
- i18n (en/pt) pré-compilado (CSP friendly) via `@intlify/unplugin-vue-i18n`.
- CSP sem `unsafe-eval`.

---

## 🌓 Funcionalidades Parciais / Melhoráveis
| Área | Situação |
|------|----------|
| Color picker avançado | Apenas input + picker nativo (sem paleta / recentes). |
| Highlight de linhas bloqueadas | Implementado (roxo + itálico), não configurável ainda. |
| Persistência de preferências UI | Orientation/autoFollow/buffer só em `localStorage` (não no JSON global). |
| Heurística “dangerous commands” | Só flag manual `confirm`; falta análise automática. |
| ANSI parser | Falta suporte a dim (2), invert (7), reset seletivo (39/49). |
| Otimização de bundle | Importa todo Lucide. |
| Carriage return avançado | Não agrupa progress bars em linha única viva. |

---

## 🚀 Roadmap (Próximos / Planejados)

### Em Curto Prazo
- [ ] Persistir orientation / autoFollow / logLimit em `deck.json` (sincronizável).
- [ ] Filtros de log (stdout / stderr / meta) + busca (regex simples).
- [ ] Botão “Expand log” (fullscreen overlay) / toggle de timestamps.
- [ ] Densidades (Comfort / Compact / Ultra) com toggle rápido.
- [ ] Color picker avançado (paleta, recentes, cores seguras de contraste).
- [ ] Export / Import de perfis (download / upload JSON) + duplicar perfil.
- [ ] Tree-shake de ícones (import dinâmico). 
- [ ] Hotkeys locais (1–9 para disparar botões visíveis) e globais (registrar atalho para focar app).
- [ ] Testes: config loader, executor, ANSI parser, política de concorrência (unit + smoke e2e).
- [x] Notificações por botão ao concluir (sucesso/falha/timeout) configuráveis (off / fail / always).

### Script Library & Parameterized Commands (Novo Pedido)
- [ ] Biblioteca de scripts reutilizáveis armazenada separadamente (ex: `~/.config/termdeck/scripts/`).
- [ ] Botão pode referenciar um script por ID em vez de inline command.
- [ ] Editor de script com versionamento simples (timestamp / hash) e diff rápido.
- [ ] Placeholders / template variables em comandos: `deploy {{env}} --tag {{tag}}`.
- [ ] Modal de parâmetros antes da execução se detectar placeholders não preenchidos.
- [ ] Cache de valores recentes por placeholder (ex: últimos 5 `env`).
- [ ] Validação / tipos simples: `{{env:enum=dev,staging,prod}}`, `{{port:int}}`.

### Interactive Input / Prompt Handling (Novo Pedido)
- [ ] Detecção de prompts via regex configurável (ex: `/password[: ]?$/i`, `/(enter .*):$/i`).
- [ ] Modal de input seguro (campo de senha oculto quando match em “password”).
- [ ] Envio de resposta via `child.stdin.write()` (com newline) + logging meta `(input sent)` sem exibir senha.
- [ ] Timeout para prompt (cancelar execução se usuário não responder em Xs).
- [ ] Histórico de respostas não sensíveis reutilizável.
- [ ] Modo “raw input” manual (botão “Send Input” abre prompt genérico enquanto processo estiver vivo).

### Médio Prazo
- [ ] Plugin API (hooks beforeRun / afterRun, custom renderers, integradores externos).
- [ ] Variáveis de ambiente por botão/perfil (merge incremental).
- [ ] Migrations automáticas de schema (version bump + transform). 
- [ ] Persistência de histórico de logs entre sessões (opt‑in).
- [ ] Telemetria opt‑in (contagem anônima de execuções/falhas). 
- [ ] Theming (light mode, temas custom). 
- [ ] Acessibilidade: navegação por setas / rolagem por teclado / ARIA labels.

### Longo Prazo / Ideias
- [ ] Pipeline de botões (encadear: botão A ⇒ B ⇒ C). 
- [ ] Execução remota (SSH) com perfil por host. 
- [ ] Máscara de segredos em output (regex definível). 
- [ ] Monitor de recursos por processo (CPU/RAM). 
- [ ] “Session replay” log bundling / export zip.

---

## 🧪 Abordagem Proposta (Novos Recursos)

### 1. Biblioteca de Scripts
Formato sugerido (arquivo por script ou índice JSON):
```jsonc
// ~/.config/termdeck/scripts/index.json
{
	"scripts": [
		{ "id": "deploy", "path": "deploy.sh", "description": "Deploy pipeline" },
		{ "id": "lint-all", "inline": "npm run lint && npm run typecheck" }
	]
}
```
Botão referencia: `{ "scriptId": "deploy", "params": { "env": "staging" } }`.

### 2. Placeholders / Parâmetros
Sintaxe: `{{name}}` básica ou enriquecida `{{name:type=constraint}}`.
Tipos previstos: `string` (default), `int`, `enum`, `password`.
Exemplos:
```
build:watch => npm run build -- --watch
deploy => ./deploy.sh --env {{env:enum=dev,staging,prod}} --tag {{tag}} --port {{port:int}}
login => gh auth login --hostname {{host: string}} --token {{token:password}}
```
Workflow:
1. Parse placeholders antes de rodar.
2. Se faltar valor → abre modal listando campos.
3. Valida, substitui e executa.
4. Salva últimos valores (não para senha) em cache local (ex: `~/.config/termdeck/cache.json`).

### 3. Prompt Dinâmico (stdin interativo)
Pipeline:
1. Monitorar stdout incrementalmente. 
2. Rodar regexs (prioridade configurável). 
3. Match ⇒ emitir evento `prompt:detected` com tipo (`input` | `password`).
4. Renderer abre modal; usuário digita; envia via `child.stdin.write(value + '\n')`.
5. Para senha: não logar valor; apenas nota meta `(password sent)`.
6. Timeout / cancel.

Estrutura de configuração futura (exemplo):
```jsonc
{
	"interactivePrompts": [
		{ "id": "sudo-pass", "pattern": "Password:", "type": "password" },
		{ "id": "confirm-overwrite", "pattern": "Overwrite file? (y/n)", "type": "enum", "options": ["y","n"], "default": "y" }
	]
}
```

### 4. Notificações de Execução
Objetivo: informar o usuário quando um comando terminar (especialmente se a janela perder foco).

Escopo inicial:
- Flag por botão: `notifyOn` = `"off" | "fail" | "always"` (default `off`).
- Disparo ao receber exit (ou timeout / kill) com dados: label, exitCode, duração.
- Uso de `new Notification()` no renderer (verificar permissão) ou `electron.Notification` no main (mais consistente em Linux + Windows).
- Clique na notificação: focar janela + selecionar botão / abrir tab de log.
- Debounce para evitar spam (limite global por segundo) e coalescer múltiplos (agrupar se >3 concluírem simultaneamente).
- Texto exemplo:
	- Sucesso: `✅ Build (12.4s)`
	- Falha: `❌ Tests failed (code 1, 8.2s)`
	- Timeout: `⏱ Timeout: Deploy (30000ms)`

Fases:
1. Schema: adicionar campo opcional em cada botão.
2. Main: interceptar término e decidir se notifica.
3. Canal IPC `execution:notify` → renderer (ou direto main Notification API).
4. Persistência de permissão (se o usuário negar, fallback silencioso + badge visual futuro).
5. (Futuro) Preferência global (override) + modo “silenciar por X minutos”.

---

## 📁 Estrutura de Config Atual (simplificado)
```jsonc
{
	"version": 1,
	"profiles": [
		{
			"id": "default",
			"name": "Default",
			"buttons": [
				{ "id": "uuid", "label": "List", "command": "ls -la", "color": "#1d4ed8", "icon": {"pack": "lucide", "name": "Folder"}, "confirm": false, "timeoutMs": 0 }
			]
		}
	],
	"directoryProfiles": { "/path/projeto": "default" },
	"concurrencyPolicy": "single-per-button",
	"locale": "pt"
}
```

---

## 🛠 Instalação Global

## Global Installation

1. (Optional) Sign in to npm / prepare publish (maintainers only):
	 - `npm login`
2. Build & publish (maintainers):
	 - `npm version patch|minor|major`
	 - `npm publish --access public`
3. Users install globally:
	 - `npm install -g termdeck`
4. Launch:
	 - `termdeck` (opens window)

### From Source (local dev)
```
git clone <repo>
cd termdeck
npm install
npm run dev
```
In another terminal (optional global link while developing):
```
npm link
termdeck
```

### Local Dev with helper script & alias
For convenient local iteration you can use the helper script which:
1. Builds the project
2. Runs `npm link`
3. Adds an alias `tdk` to your `~/.zshrc` and `~/.bashrc` (if not already present)

Run:
```
scripts/dev-link.sh
```
Then open a new shell (or `source ~/.zshrc`) and launch with:
```
tdk
```
To remove the global link later:
```
npm unlink -g termdeck
```

## 📄 Configuração
Arquivo: `~/.config/termdeck/deck.json` (edição manual possível – recarrega no próximo launch). Escrita é atômica.

## 💡 Dicas de Uso
- Clique no botão para executar. Logs aparecem no painel (Global ou por botão).
- Ícones: qualquer nome PascalCase do Lucide (ex: `Play`, `Folder`, `GitBranch`).
- Concurrency: use `single-per-button` para evitar sobreposição repetitiva nos mesmos jobs; `single-global` para modo “fila manual”.
- Buffer de log: aumente se precisar de histórico maior (pode impactar memória). 
- Se um comando exigir confirmação, marque `confirm` ao editar.
- Use orientação horizontal se quiser priorizar largura do grid.

## 🧱 Arquitetura (Resumo)
- Main (Electron): spawn/kill, concurrency, config IO, WSL handling.
- Preload: API segura (`window.termdeck.*`).
- Renderer (Vue 3 + Vite + Tailwind): UI, logs, i18n, parsing ANSI.
- Config JSON transparente – fácil versionar no git.
- (Futuro) Script library + plugin hooks.

## Development Scripts
- `npm run dev` : Run Vite (renderer) + TypeScript watch + Electron
- `npm run build` : Production build (renderer + main)
- `npm run lint` : ESLint
- `npm run format` : Prettier write
- `npm run typecheck` : TS type-only builds
- `npm test` : (placeholder) Vitest

## 📌 Roadmap Resumido
Veja seções acima (Curto / Médio / Longo Prazo). Este bloco substitui a lista anterior.

## 🤝 Contribuindo
PRs são bem-vindos. Recomendado:
1. Abrir issue descrevendo motivação e proposta.
2. Seguir estilo existente (Tailwind utilitário, componentes simples).
3. Rodar: `npm run lint && npm run typecheck` antes do commit.
4. Adicionar testes quando alterar lógica de execução / parsing.
5. Para features grandes (ex: plugin API) anexar diagrama / pseudo‑código.

### Guidelines Rápidas
- Manter preload minimalista (somente canais necessários).
- Evitar dependências pesadas sem tree-shake.
- Preferir async/await e early‑return para clareza.
- Logs sensíveis (futuros) devem ter máscara.

## 🧪 Scripts de Desenvolvimento
Principais:
| Script | Descrição |
|--------|-----------|
| `npm run dev` | Dev (Electron + Vite) |
| `npm run build` | Build produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript somente tipos |
| `npm test` | (placeholder) |
| `scripts/dev-link.sh` | Build + link + alias `tdk` |

---

## 🔒 Licença
MIT License.

---

## 📸 Screenshots (adicionar)
Adicionar imagens atualizadas do layout vertical e horizontal.

---

## 🗺 Próximos Passos Imediatos (Sugestão)
1. Persistir preferências (orientation / autoFollow / buffer size) no JSON central.
2. Filtro / busca de log.
3. Biblioteca de scripts + placeholders.
4. Prompt interativo (stdin).
5. Export / import de perfis.
6. Testes mínimos + tree-shake de ícones.

> Caso queira priorizar algo diferente, ajuste a ordem antes de iniciar implementações grandes.

## License
MIT License.
