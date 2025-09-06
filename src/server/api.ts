import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { DeckProfile, DeckButtonCommand } from '../types';

// Helper to get commands from profile (handles both buttons and commands arrays)
function getCommands(profile: DeckProfile): DeckButtonCommand[] {
  return profile.commands || profile.buttons || [];
}

// Helper to set commands in profile (sets both for compatibility)
function setCommands(profile: DeckProfile, commands: DeckButtonCommand[]): void {
  profile.commands = commands;
  profile.buttons = commands;
}

interface DeckStateSchemaV1 {
  schemaVersion: 1;
  activeProfileId: string;
  profiles: DeckProfile[];
  directoryProfiles?: Record<string, string>;
  concurrencyPolicy?: 'parallel' | 'single-per-button' | 'single-global';
  locale?: string;
}

const CONFIG_DIR = join(homedir(), '.config', 'termdeck');
const CONFIG_FILE = join(CONFIG_DIR, 'deck.json');
const USER_SHELL = process.env.TERMDECK_SHELL || process.env.SHELL || '/bin/bash';

let state: DeckStateSchemaV1;
const runningChildren: Record<string, any> = {};
const runStartTimes: Record<string, number> = {};
const timedOut: Record<string, boolean> = {};

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
          commands: [],
          rootDir: process.cwd()
        }
      ],
      directoryProfiles: {},
      concurrencyPolicy: 'single-per-button',
      locale: 'en'
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
}

function saveConfig(newState: DeckStateSchemaV1) {
  state = newState;
  writeFileSync(CONFIG_FILE, JSON.stringify(state, null, 2));
}

export function createServerApp(port = 3001) {
  state = ensureConfig();
  
  const app = express();
  const server = createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
  });

  app.use(cors());
  app.use(express.json());

  // REST API
  app.get('/api/state', (req, res) => {
    const launchCwd = req.query.cwd as string || process.cwd();
    const norm = launchCwd.replace(/\\/g, '/').toLowerCase();
    
    let profileId = state.directoryProfiles?.[norm];
    if (!profileId) {
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
      if (!state.directoryProfiles) state.directoryProfiles = {};
      state.directoryProfiles[norm] = profileId;
      state.activeProfileId = profileId;
      saveConfig(state);
    }
    
    res.json({ ...state, launchCwd });
  });

  app.post('/api/profiles', (req, res) => {
    const { name, rows, cols } = req.body;
    const profile: DeckProfile = {
      id: uuid(),
      name: name || `Profile ${state.profiles.length + 1}`,
      rows: rows && rows > 0 ? rows : 3,
      cols: cols && cols > 0 ? cols : 5,
      buttons: [],
      rootDir: undefined
    };
    state.profiles.push(profile);
    state.activeProfileId = profile.id;
    saveConfig(state);
    res.json(profile);
  });

  app.put('/api/profiles/:id', (req, res) => {
    const idx = state.profiles.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Profile not found' });
    
    state.profiles[idx] = { ...state.profiles[idx], ...req.body };
    saveConfig(state);
    res.json(state.profiles[idx]);
  });

  app.delete('/api/profiles/:id', (req, res) => {
    if (state.profiles.length === 1) {
      return res.status(400).json({ error: 'Cannot delete the only profile' });
    }
    
    const idx = state.profiles.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Profile not found' });
    
    const deletingActive = state.activeProfileId === req.params.id;
    if (state.directoryProfiles) {
      for (const k of Object.keys(state.directoryProfiles)) {
        if (state.directoryProfiles[k] === req.params.id) delete state.directoryProfiles[k];
      }
    }
    state.profiles.splice(idx, 1);
    if (deletingActive) state.activeProfileId = state.profiles[0].id;
    saveConfig(state);
    res.json({ deleted: true, activeProfileId: state.activeProfileId });
  });

  app.post('/api/profiles/:profileId/buttons', (req, res) => {
    const profile = state.profiles.find(p => p.id === req.params.profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const button: DeckButtonCommand = {
      id: uuid(),
      label: req.body.label || 'New',
      command: req.body.command || 'echo "hello"',
      cwd: req.body.cwd || profile.rootDir || process.cwd(),
      icon: req.body.icon || null,
      color: req.body.color || '#222',
      confirm: !!req.body.confirm,
      timeoutMs: req.body.timeoutMs || 0,
      readonly: !!req.body.readonly,
      notifyOn: req.body.notifyOn || 'off'
    };
    const commands = getCommands(profile);
    commands.push(button);
    setCommands(profile, commands);
    saveConfig(state);
    res.json(button);
  });

  app.put('/api/profiles/:profileId/buttons/:buttonId', (req, res) => {
    const profile = state.profiles.find(p => p.id === req.params.profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const commands = getCommands(profile);
    const idx = commands.findIndex(b => b.id === req.params.buttonId);
    if (idx === -1) return res.status(404).json({ error: 'Button not found' });
    
    const current = commands[idx];
    const updated = { ...current, ...req.body, id: current.id };
    if (!updated.notifyOn) updated.notifyOn = 'off';
    commands[idx] = updated;
    setCommands(profile, commands);
    saveConfig(state);
    res.json(updated);
  });

  app.delete('/api/profiles/:profileId/buttons/:buttonId', (req, res) => {
    const profile = state.profiles.find(p => p.id === req.params.profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const commands = getCommands(profile);
    const before = commands.length;
    const filtered = commands.filter(b => b.id !== req.params.buttonId);
    setCommands(profile, filtered);
    if (filtered.length === before) {
      return res.status(404).json({ error: 'Button not found' });
    }
    saveConfig(state);
    res.json({ removed: true });
  });

  app.post('/api/buttons/:buttonId/run', (req, res) => {
    const button = findButtonById(req.params.buttonId);
    if (!button) return res.status(404).json({ error: 'Button not found' });

    const policy = state.concurrencyPolicy || 'single-per-button';
    if (policy === 'single-global' && Object.keys(runningChildren).length > 0) {
      return res.json({ busy: 'global' });
    }
    if (policy === 'single-per-button' && runningChildren[button.id]) {
      return res.json({ busy: 'button' });
    }

    const child = spawn(USER_SHELL, ['-i', '-c', button.command], { 
      cwd: button.cwd, 
      env: { ...process.env, PS1: '', TERMDECK: '1' } 
    });

    runningChildren[button.id] = child;
    runStartTimes[button.id] = Date.now();
    delete timedOut[button.id];

    const room = `button:${button.id}`;
    
    if (child.stdout) child.stdout.on('data', d => {
      io.to(room).emit('output', { type: 'stdout', data: d.toString() });
    });
    
    if (child.stderr) child.stderr.on('data', d => {
      io.to(room).emit('output', { type: 'stderr', data: d.toString() });
      // Prompt detection
      scanForPrompt(d.toString(), button, room);
    });

    child.on('close', code => {
      io.to(room).emit('output', { type: 'close', code });
      delete runningChildren[button.id];
      
      // Notifications
      const durationMs = runStartTimes[button.id] ? Date.now() - runStartTimes[button.id] : 0;
      delete runStartTimes[button.id];
      const notifyPolicy = button.notifyOn || 'off';
      const failed = timedOut[button.id] || (typeof code === 'number' && code !== 0);
      const shouldNotify = notifyPolicy === 'always' || (notifyPolicy === 'fail' && failed);
      
      if (shouldNotify) {
        const locale = state.locale || 'en';
        const seconds = (durationMs/1000).toFixed(1);
        let title: string, body: string;
        if (locale.startsWith('pt')) {
          title = failed ? `Falhou: ${button.label}` : `Concluído: ${button.label}`;
          body = timedOut[button.id] ? `Timeout após ${button.timeoutMs}ms` : 
                 failed ? `Exit code ${code} • ${seconds}s` : `${seconds}s`;
        } else {
          title = failed ? `Failed: ${button.label}` : `Done: ${button.label}`;
          body = timedOut[button.id] ? `Timeout after ${button.timeoutMs}ms` : 
                 failed ? `Exit code ${code} • ${seconds}s` : `${seconds}s`;
        }
        
        io.to(room).emit('notification', { 
          buttonId: button.id, 
          label: button.label, 
          title, 
          body, 
          failed 
        });
      }
      delete timedOut[button.id];
    });

    if (button.timeoutMs && button.timeoutMs > 0) {
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGTERM');
          timedOut[button.id] = true;
          io.to(room).emit('output', { type: 'timeout' });
        }
      }, button.timeoutMs);
    }

    res.json({ pid: child.pid });
  });

  app.post('/api/buttons/:buttonId/stop', (req, res) => {
    const child = runningChildren[req.params.buttonId];
    if (child && !child.killed) {
      child.kill('SIGTERM');
      delete runningChildren[req.params.buttonId];
      res.json({ stopped: true });
    } else {
      res.json({ stopped: false });
    }
  });

  app.post('/api/buttons/:buttonId/input', (req, res) => {
    const child = runningChildren[req.params.buttonId];
    if (!child) return res.json({ sent: false, reason: 'not-running' });
    if (!child.stdin) return res.json({ sent: false, reason: 'no-stdin' });
    
    try {
      child.stdin.write(req.body.value + '\n');
      res.json({ sent: true });
    } catch (e: any) {
      res.json({ sent: false, error: e?.message });
    }
  });

  app.put('/api/settings/concurrency', (req, res) => {
    state.concurrencyPolicy = req.body.policy;
    saveConfig(state);
    res.json({ concurrencyPolicy: state.concurrencyPolicy });
  });

  app.put('/api/settings/locale', (req, res) => {
    state.locale = req.body.locale;
    saveConfig(state);
    res.json({ locale: state.locale });
  });

  app.put('/api/settings/active-profile', (req, res) => {
    if (!state.profiles.find(p => p.id === req.body.profileId)) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    state.activeProfileId = req.body.profileId;
    saveConfig(state);
    res.json({ activeProfileId: state.activeProfileId });
  });

  // WebSocket
  io.on('connection', (socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);
    
    socket.on('subscribe', (buttonId: string) => {
      socket.join(`button:${buttonId}`);
    });
    
    socket.on('unsubscribe', (buttonId: string) => {
      socket.leave(`button:${buttonId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Server] Client disconnected: ${socket.id}`);
    });
  });

  function findButtonById(buttonId: string): DeckButtonCommand | null {
    for (const profile of state.profiles) {
      const commands = getCommands(profile);
      const button = commands.find(b => b.id === buttonId);
      if (button) return button;
    }
    return null;
  }

  function scanForPrompt(chunk: string, button: DeckButtonCommand, room: string) {
    const trimmed = chunk.trimEnd();
    const passwordRgx = /(enter\s+password[: ]*$|password[: ]*$|passphrase[: ]*$)/i;
    const inputRgx = /(enter\s+.+[:?]$|continue\?\s*\(y\/n\)[: ]*$|overwrite file\? \(y\/n\)[: ]*$)/i;
    
    let matchType: 'password' | 'input' | null = null;
    if (passwordRgx.test(trimmed)) matchType = 'password';
    else if (inputRgx.test(trimmed)) matchType = 'input';
    
    if (matchType) {
      io.to(room).emit('prompt', {
        buttonId: button.id,
        buttonLabel: button.label,
        type: matchType,
        text: trimmed
      });
    }
  }

  server.listen(port, () => {
    console.log(`[Server] Termdeck server running on port ${port}`);
    console.log(`[Server] API: http://localhost:${port}/api`);
    console.log(`[Server] WebSocket: ws://localhost:${port}`);
  });

  return { app, server, io };
}