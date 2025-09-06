import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { DeckButtonCommand, DeckProfile, DeckStateSchemaV1 } from '../types';
import { detectEnvironment, TDMode } from '../utils/environment';

// Using shared types from ../types

// Zod schema for validation (extensible for future versions)
const deckButtonSchema = z.object({
  id: z.string(),
  label: z.string(),
  command: z.string(),
  cwd: z.string(),
  icon: z.object({ pack: z.string(), name: z.string() }).partial().nullish(),
  color: z.string().optional(),
  confirm: z.boolean().optional(),
  timeoutMs: z.number().nonnegative().optional(),
  readonly: z.boolean().optional(),
  notifyOn: z.enum(['off','fail','always']).optional()
});

const deckProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  buttons: z.array(deckButtonSchema),
  rootDir: z.string().optional().nullable()
});

const deckStateSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  activeProfileId: z.string(),
  profiles: z.array(deckProfileSchema),
  directoryProfiles: z.record(z.string(), z.string()).optional(),
  concurrencyPolicy: z.enum(['parallel','single-per-button','single-global']).optional(),
  locale: z.string().optional()
});

const CONFIG_DIR = join(homedir(), '.config', 'termdeck');
const CONFIG_FILE = join(CONFIG_DIR, 'deck.json');

function ensureConfig(): DeckStateSchemaV1 {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  if (!existsSync(CONFIG_FILE)) {
  const initial: DeckStateSchemaV1 = {
      schemaVersion: 1,
      activeProfileId: 'default',
      profiles: [
        {
          id: 'default',
            name: 'Default',
            rows: 3,
            cols: 5,
      buttons: [],
      rootDir: undefined
        }
    ],
    directoryProfiles: {},
  concurrencyPolicy: 'single-per-button',
  locale: 'en'
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = readFileSync(CONFIG_FILE, 'utf-8');
  const parsed = JSON.parse(raw);
  try {
    deckStateSchemaV1.parse(parsed);
  } catch (err: any) {
    const backupPath = CONFIG_FILE + '.invalid.' + Date.now();
    writeFileSync(backupPath, raw);
    const initial: DeckStateSchemaV1 = {
      schemaVersion: 1,
      activeProfileId: 'default',
      profiles: [
        { id: 'default', name: 'Recovered Default', rows: 3, cols: 5, buttons: [], rootDir: undefined }
      ],
      directoryProfiles: {},
  concurrencyPolicy: 'single-per-button',
  locale: 'en'
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  if (!parsed.directoryProfiles) parsed.directoryProfiles = {};
  if (!parsed.concurrencyPolicy) parsed.concurrencyPolicy = 'single-per-button';
  if (!parsed.locale || typeof parsed.locale !== 'string') parsed.locale = 'en';
  // Backfill rootDir for default if absent
  parsed.profiles.forEach((p: DeckProfile) => { if (!p.rootDir) p.rootDir = undefined; });
  return parsed;
}

function saveConfig(state: DeckStateSchemaV1) {
  writeFileSync(CONFIG_FILE, JSON.stringify(state, null, 2));
}

let mainWindow: BrowserWindow | null = null;
const launchCwd = process.cwd();
// Determine user shell for command execution (enables alias / rc loading)
const USER_SHELL = process.env.TERMDECK_SHELL || process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');

function normalizePath(p: string) {
  return process.platform === 'win32' ? p.replace(/\\/g, '/').toLowerCase() : p;
}

async function createWindow() {
  // In dev the watcher produces preload.js (no .cjs copy). In production build we copy to preload.cjs.
  // Choose whichever exists so hot reload gets the newest preload.
  const preloadPath = (() => {
    const cjs = join(__dirname, 'preload.cjs');
    const js = join(__dirname, 'preload.js');
    return existsSync(cjs) ? cjs : js;
  })();
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'termdeck'
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    await mainWindow.loadURL(devServer);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

let currentMode: TDMode = 'native';

async function initializeApp() {
  const envResult = await detectEnvironment();
  currentMode = envResult.mode;
  
  console.log(`[TermDeck] Mode: ${currentMode}`);
  console.log(`[TermDeck] Environment:`, envResult.suggestions);

  if (currentMode === 'server') {
    // This should not happen in Electron context
    console.error('[TermDeck] Server mode detected in Electron app - this is unexpected');
    // Could start API server here if needed
  }

  await createWindow();
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
let state = ensureConfig();
// Track running processes to allow stop
const runningChildren: Record<string, import('child_process').ChildProcess> = {};
const runStartTimes: Record<string, number> = {};
const timedOut: Record<string, boolean> = {};
// Track if a button currently has an open prompt to avoid spamming multiple modals for same logical ask
const activePromptsPerButton: Record<string, boolean> = {};

// Heuristic dangerous patterns
const DANGEROUS_RGX = /(rm\s+-rf\s+\/(?!\S)|rm\s+-rf\s+\.|git\s+push\s+--force|docker\s+(system|container|image)\s+prune)/i;

ipcMain.handle('deck:load', () => {
  const norm = normalizePath(launchCwd);
  if (!state.directoryProfiles) state.directoryProfiles = {};
  let profileId = state.directoryProfiles[norm];
  if (!profileId) {
    // Create new profile for this directory
    const name = `Dir: ${launchCwd.split(/[\\/]/).filter(Boolean).slice(-1)[0] || 'root'}`;
    profileId = uuid();
    const newProfile: DeckProfile = {
      id: profileId,
      name,
      rows: 3,
      cols: 5,
      buttons: [],
      rootDir: launchCwd
    };
    state.profiles.push(newProfile);
    state.directoryProfiles[norm] = profileId;
    state.activeProfileId = profileId;
    saveConfig(state);
  } else if (state.activeProfileId !== profileId) {
    state.activeProfileId = profileId;
  }
  return { ...state, launchCwd };
});

ipcMain.handle('deck:updateProfile', (_evt, profile: DeckProfile) => {
  const idx = state.profiles.findIndex(p => p.id === profile.id);
  if (idx !== -1) {
    state.profiles[idx] = profile;
    saveConfig(state);
  }
  return profile;
});

ipcMain.handle('deck:createProfile', (_evt, data: { name?: string; rows?: number; cols?: number }) => {
  const profile: DeckProfile = {
    id: uuid(),
    name: data.name || `Profile ${state.profiles.length + 1}`,
    rows: data.rows && data.rows > 0 ? data.rows : 3,
    cols: data.cols && data.cols > 0 ? data.cols : 5,
    buttons: [],
    rootDir: undefined
  };
  state.profiles.push(profile);
  state.activeProfileId = profile.id;
  saveConfig(state);
  return profile;
});

ipcMain.handle('deck:setActiveProfile', (_evt, profileId: string) => {
  if (!state.profiles.find(p => p.id === profileId)) throw new Error('Profile not found');
  state.activeProfileId = profileId;
  saveConfig(state);
  return { activeProfileId: state.activeProfileId };
});

ipcMain.handle('deck:renameProfile', (_evt, profileId: string, newName: string) => {
  const profile = state.profiles.find(p => p.id === profileId);
  if (!profile) throw new Error('Profile not found');
  profile.name = newName;
  saveConfig(state);
  return profile;
});

ipcMain.handle('deck:deleteProfile', (_evt, profileId: string) => {
  if (state.profiles.length === 1) throw new Error('Cannot delete the only profile');
  const idx = state.profiles.findIndex(p => p.id === profileId);
  if (idx === -1) throw new Error('Profile not found');
  const deletingActive = state.activeProfileId === profileId;
  // Remove directory mappings pointing to this profile
  if (state.directoryProfiles) {
    for (const k of Object.keys(state.directoryProfiles)) {
      if (state.directoryProfiles[k] === profileId) delete state.directoryProfiles[k];
    }
  }
  state.profiles.splice(idx, 1);
  if (deletingActive) state.activeProfileId = state.profiles[0].id;
  saveConfig(state);
  return { deleted: true, activeProfileId: state.activeProfileId };
});

ipcMain.handle('deck:addButton', (_evt, profileId: string, button: Partial<DeckButtonCommand>) => {
  const profile = state.profiles.find(p => p.id === profileId);
  if (!profile) throw new Error('Profile not found');
  const full: DeckButtonCommand = {
    id: uuid(),
    label: button.label || 'New',
    command: button.command || 'echo "hello"',
  cwd: button.cwd || profile.rootDir || process.cwd(),
  icon: button.icon || null,
    color: button.color || '#222',
    confirm: !!button.confirm,
    timeoutMs: button.timeoutMs || 0,
    readonly: !!button.readonly,
    notifyOn: (button.notifyOn as any) || 'off'
  };
  profile.buttons.push(full);
  saveConfig(state);
  return full;
});

ipcMain.handle('deck:updateButton', (_evt, profileId: string, buttonId: string, patch: Partial<DeckButtonCommand>) => {
  const profile = state.profiles.find(p => p.id === profileId);
  if (!profile) throw new Error('Profile not found');
  const idx = profile.buttons.findIndex(b => b.id === buttonId);
  if (idx === -1) throw new Error('Button not found');
  const current = profile.buttons[idx];
  const updated = { ...current, ...patch, id: current.id };
  if (!updated.notifyOn) updated.notifyOn = 'off';
  profile.buttons[idx] = updated;
  saveConfig(state);
  return updated;
});

ipcMain.handle('deck:removeButton', (_evt, profileId: string, buttonId: string) => {
  const profile = state.profiles.find(p => p.id === profileId);
  if (!profile) throw new Error('Profile not found');
  const before = profile.buttons.length;
  profile.buttons = profile.buttons.filter(b => b.id !== buttonId);
  if (profile.buttons.length === before) throw new Error('Button not found');
  saveConfig(state);
  return { removed: true };
});

ipcMain.handle('deck:run', async (evt, buttonId: string) => {
  const profile = state.profiles.find(p => p.id === state.activeProfileId);
  if (!profile) throw new Error('Active profile not found');
  const button = profile.buttons.find(b => b.id === buttonId);
  if (!button) throw new Error('Button not found');

  // concurrency enforcement server-side
  const policy = state.concurrencyPolicy || 'single-per-button';
  if (policy === 'single-global' && Object.keys(runningChildren).length > 0) {
    return { busy: 'global' };
  }
  if (policy === 'single-per-button' && runningChildren[button.id]) {
    return { busy: 'button' };
  }

  if (button.confirm || DANGEROUS_RGX.test(button.command)) {
    const res = dialog.showMessageBoxSync({
      type: 'warning',
      message: 'Confirmar execução?',
      detail: button.command,
      buttons: ['Cancelar', 'Executar'],
      defaultId: 1,
      cancelId: 0
    });
    if (res !== 1) return { aborted: true };
  }

  let child: import('child_process').ChildProcess;
  if (process.platform === 'win32') {
    // Preserve previous behavior on Windows (aliases concept differs) using default shell resolution.
    child = spawn(button.command, { cwd: button.cwd, shell: true, env: process.env });
  } else {
    // Use interactive shell so that aliases/functions from user rc files are available.
    // -i loads .bashrc / .zshrc; we blank PS1 to avoid prompt artifacts in logs.
    // TERMDECK=1 allows user conditional logic in their rc files.
    const env = { ...process.env, PS1: '', TERMDECK: '1' };
    child = spawn(USER_SHELL, ['-i', '-c', button.command], { cwd: button.cwd, env });
  }

  runningChildren[button.id] = child;
  runStartTimes[button.id] = Date.now();
  delete timedOut[button.id];

  const channel = `deck:run:stream:${button.id}`;
  if (child.stdout) child.stdout.on('data', d => evt.sender.send(channel, { type: 'stdout', data: d.toString() }));
  if (child.stderr) child.stderr.on('data', d => evt.sender.send(channel, { type: 'stderr', data: d.toString() }));

  // Basic interactive prompt detection (MVP): looks for common password/input prompts at end of chunk
  function scanForPrompt(chunk: string) {
    // Only trigger if we still have button context and process alive and not already showing a prompt
    if (!button) return;
    if (!runningChildren[button.id] || activePromptsPerButton[button.id]) return;
    const trimmed = chunk.trimEnd();
    // Patterns: password:, enter password:, passphrase, (y/n)? style can be extended later
    const passwordRgx = /(enter\s+password[: ]*$|password[: ]*$|passphrase[: ]*$)/i;
    const inputRgx = /(enter\s+.+[:?]$|continue\?\s*\(y\/n\)[: ]*$|overwrite file\? \(y\/n\)[: ]*$)/i;
    let matchType: 'password' | 'input' | null = null;
    if (passwordRgx.test(trimmed)) matchType = 'password';
    else if (inputRgx.test(trimmed)) matchType = 'input';
    if (matchType) {
      activePromptsPerButton[button.id] = true;
      evt.sender.send('deck:prompt', {
        buttonId: button.id,
        buttonLabel: button.label,
        type: matchType,
        text: trimmed
      });
    }
  }
  if (child.stdout) child.stdout.on('data', d => {
    try { scanForPrompt(d.toString()); } catch {/* ignore */}
  });
  if (child.stderr) child.stderr.on('data', d => {
    try { scanForPrompt(d.toString()); } catch {/* ignore */}
  });
  child.on('close', code => {
    evt.sender.send(channel, { type: 'close', code });
    delete runningChildren[button.id];
    delete activePromptsPerButton[button.id];
    // Notifications (after process exit)
    try {
      const durationMs = runStartTimes[button.id] ? Date.now() - runStartTimes[button.id] : 0;
      delete runStartTimes[button.id];
      const notifyPolicy = button.notifyOn || 'off';
      const failed = timedOut[button.id] || (typeof code === 'number' && code !== 0);
      const shouldNotify = notifyPolicy === 'always' || (notifyPolicy === 'fail' && failed);
      if (shouldNotify) {
        const locale = state.locale || 'en';
        const seconds = (durationMs/1000).toFixed(1);
        let title: string; let body: string;
        if (locale.startsWith('pt')) {
          title = failed ? `Falhou: ${button.label}` : `Concluído: ${button.label}`;
          if (timedOut[button.id]) body = `Timeout após ${(button.timeoutMs||0)}ms`; else body = failed ? `Exit code ${code} • ${seconds}s` : `${seconds}s`;
        } else {
          title = failed ? `Failed: ${button.label}` : `Done: ${button.label}`;
          if (timedOut[button.id]) body = `Timeout after ${(button.timeoutMs||0)}ms`; else body = failed ? `Exit code ${code} • ${seconds}s` : `${seconds}s`;
        }
        delete timedOut[button.id];
        let shownNative = false;
        try {
          if (Notification.isSupported()) {
            const n = new Notification({ title, body, silent: !failed });
            n.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
            n.show();
            shownNative = true;
          }
        } catch {/* ignore */}
        if (!shownNative) {
          // Fallback: emit IPC so renderer can show in-app toast
          try { evt.sender.send('deck:notify-fallback', { buttonId: button.id, label: button.label, title, body, failed }); } catch {/* ignore */}
        }
      }
    } catch {/* ignore */}
    delete timedOut[button.id];
  });
  if (button.timeoutMs && button.timeoutMs > 0) {
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
        evt.sender.send(channel, { type: 'timeout' });
        timedOut[button.id] = true;
      }
    }, button.timeoutMs);
  }
  return { pid: child.pid };
});

ipcMain.handle('deck:stop', (_evt, buttonId: string) => {
  const child = runningChildren[buttonId];
  if (child && !child.killed) {
    child.kill('SIGTERM');
    delete runningChildren[buttonId];
    delete activePromptsPerButton[buttonId];
    return { stopped: true };
  }
  return { stopped: false };
});

ipcMain.handle('deck:setConcurrencyPolicy', (_evt, policy: 'parallel' | 'single-per-button' | 'single-global') => {
  if (!['parallel','single-per-button','single-global'].includes(policy)) throw new Error('Invalid policy');
  state.concurrencyPolicy = policy;
  saveConfig(state);
  return { concurrencyPolicy: state.concurrencyPolicy };
});

ipcMain.handle('deck:setLocale', (_evt, locale: string) => {
  if (typeof locale !== 'string' || locale.length < 2 || locale.length > 5) throw new Error('Invalid locale');
  state.locale = locale;
  saveConfig(state);
  return { locale: state.locale };
});

// Get current app mode
ipcMain.handle('deck:getMode', () => {
  return { mode: currentMode };
});

// Receive user-provided input for an interactive prompt
ipcMain.handle('deck:sendInput', (_evt, buttonId: string, value: string) => {
  const child = runningChildren[buttonId];
  if (!child) return { sent: false, reason: 'not-running' };
  if (!child.stdin) return { sent: false, reason: 'no-stdin' };
  try {
    child.stdin.write(value + '\n');
    // Allow future prompts again after sending
    delete activePromptsPerButton[buttonId];
    return { sent: true };
  } catch (e: any) {
    return { sent: false, error: e?.message };
  }
});
