import { io, Socket } from 'socket.io-client';
import { DeckProfile, DeckButtonCommand } from '../types';
import { detectEnvironment, ensureWSLServer, validateServerConnection } from '../utils/environment';

export interface ClientAPIEvents {
  log: (data: { command: string; type: 'stdout' | 'stderr'; data: string; timestamp: number }) => void;
  commandStarted: (data: { command: string; timestamp: number }) => void;
  commandEnded: (data: { command: string; exitCode: number; timestamp: number }) => void;
  promptRequired: (data: { command: string; prompt: string; isPassword: boolean }) => void;
  notification: (data: { title: string; body: string; command: string }) => void;
}

export class ClientAPI {
  private socket: Socket | null = null;
  private serverUrl = '';
  private connected = false;
  private eventHandlers: Partial<ClientAPIEvents> = {};

  async initialize(): Promise<void> {
    const env = await detectEnvironment();
    
    if (env.mode !== 'client') {
      throw new Error(`Client API can only be used in client mode, detected: ${env.mode}`);
    }

    this.serverUrl = env.serverUrl || await ensureWSLServer();
    
    if (!await validateServerConnection(this.serverUrl)) {
      throw new Error(`Cannot connect to WSL server at ${this.serverUrl}`);
    }

    await this.connect();
  }

  private async connect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not initialized'));

      this.socket.on('connect', () => {
        console.log('[Client API] Connected to WSL server');
        this.connected = true;
        this.setupEventHandlers();
        resolve();
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('[Client API] Connection error:', error);
        this.connected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('[Client API] Disconnected from WSL server');
        this.connected = false;
      });
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('log', (data: { command: string; type: 'stdout' | 'stderr'; data: string; timestamp: number }) => {
      this.eventHandlers.log?.(data);
    });

    this.socket.on('commandStarted', (data: { command: string; timestamp: number }) => {
      this.eventHandlers.commandStarted?.(data);
    });

    this.socket.on('commandEnded', (data: { command: string; exitCode: number; timestamp: number }) => {
      this.eventHandlers.commandEnded?.(data);
    });

    this.socket.on('promptRequired', (data: { command: string; prompt: string; isPassword: boolean }) => {
      this.eventHandlers.promptRequired?.(data);
    });

    this.socket.on('notification', (data: { title: string; body: string; command: string }) => {
      this.eventHandlers.notification?.(data);
    });
  }

  on<K extends keyof ClientAPIEvents>(event: K, handler: ClientAPIEvents[K]): void {
    this.eventHandlers[event] = handler;
  }

  async loadProfiles(): Promise<DeckProfile[]> {
    const response = await fetch(`${this.serverUrl}/api/profiles`);
    if (!response.ok) throw new Error(`Failed to load profiles: ${response.statusText}`);
    return response.json();
  }

  async saveProfile(profile: DeckProfile): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!response.ok) throw new Error(`Failed to save profile: ${response.statusText}`);
  }

  async updateProfile(profileName: string, profile: DeckProfile): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/profiles/${encodeURIComponent(profileName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!response.ok) throw new Error(`Failed to update profile: ${response.statusText}`);
  }

  async deleteProfile(profileName: string): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/profiles/${encodeURIComponent(profileName)}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete profile: ${response.statusText}`);
  }

  async addButton(profileName: string, button: DeckButtonCommand): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/profiles/${encodeURIComponent(profileName)}/buttons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(button)
    });
    if (!response.ok) throw new Error(`Failed to add button: ${response.statusText}`);
  }

  async updateButton(profileName: string, buttonId: string, button: DeckButtonCommand): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/profiles/${encodeURIComponent(profileName)}/buttons/${encodeURIComponent(buttonId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(button)
    });
    if (!response.ok) throw new Error(`Failed to update button: ${response.statusText}`);
  }

  async deleteButton(profileName: string, buttonId: string): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/profiles/${encodeURIComponent(profileName)}/buttons/${encodeURIComponent(buttonId)}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Failed to delete button: ${response.statusText}`);
  }

  async runCommand(profileName: string, buttonId: string, parameters?: Record<string, string>): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileName, buttonId, parameters })
    });
    if (!response.ok) throw new Error(`Failed to run command: ${response.statusText}`);
  }

  async stopCommand(command: string): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    if (!response.ok) throw new Error(`Failed to stop command: ${response.statusText}`);
  }

  async sendInput(command: string, input: string, isPassword = false): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, input, isPassword })
    });
    if (!response.ok) throw new Error(`Failed to send input: ${response.statusText}`);
  }

  async getState(): Promise<{ runningCommands: string[]; serverInfo: any }> {
    const response = await fetch(`${this.serverUrl}/api/state`);
    if (!response.ok) throw new Error(`Failed to get state: ${response.statusText}`);
    return response.json();
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }
}