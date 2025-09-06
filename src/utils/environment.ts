import { readFileSync, existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export type TDMode = 'native' | 'client' | 'server';

export interface WSLDetectionResult {
  mode: TDMode;
  isWSL: boolean;
  isWindows: boolean;
  hasWSLAccess: boolean;
  serverUrl?: string;
  suggestions: string[];
}

/**
 * Detects the optimal termdeck mode based on environment
 */
export async function detectEnvironment(): Promise<WSLDetectionResult> {
  const forced = process.env.TERMDECK_MODE as TDMode;
  if (forced && ['native', 'client', 'server'].includes(forced)) {
    return {
      mode: forced,
      isWSL: isInsideWSL(),
      isWindows: process.platform === 'win32',
      hasWSLAccess: false,
      suggestions: [`Forced mode: ${forced}`]
    };
  }

  const isWSL = isInsideWSL();
  const isWindows = process.platform === 'win32';
  const hasWSL = isWindows ? await hasWSLAvailable() : false;

  // Decision matrix
  if (isWSL) {
    // Inside WSL - prefer server mode
    return {
      mode: 'server',
      isWSL: true,
      isWindows: false,
      hasWSLAccess: false,
      suggestions: [
        'Running inside WSL - using server mode',
        'Commands will execute with native Linux context',
        'Start client from Windows: termdeck --client'
      ]
    };
  }

  if (isWindows && hasWSL) {
    // Windows with WSL available - prefer client mode
    const serverUrl = await detectWSLServer();
    return {
      mode: 'client',
      isWSL: false,
      isWindows: true,
      hasWSLAccess: true,
      serverUrl: serverUrl || undefined,
      suggestions: [
        'Windows with WSL detected - using client mode',
        serverUrl ? 'Found existing WSL server' : 'Will auto-start WSL server',
        'Commands will execute in WSL context for better compatibility'
      ]
    };
  }

  // Native mode for other platforms
  return {
    mode: 'native',
    isWSL: false,
    isWindows: isWindows,
    hasWSLAccess: false,
    suggestions: [
      'Using native mode',
      'Commands execute in current shell context'
    ]
  };
}

/**
 * Check if running inside WSL
 */
export function isInsideWSL(): boolean {
  if (process.platform !== 'linux') return false;
  
  try {
    const version = readFileSync('/proc/version', 'utf8');
    return /microsoft|wsl/i.test(version);
  } catch {
    return false;
  }
}

/**
 * Check if WSL is available on Windows
 */
export async function hasWSLAvailable(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  
  try {
    const { stdout } = await execAsync('wsl --list --quiet', { timeout: 5000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Try to detect running WSL server
 */
export async function detectWSLServer(port = 3001): Promise<string | null> {
  try {
    const response = await fetch(`http://localhost:${port}/api/state`, {
      method: 'GET',
      timeout: 2000
    } as any);
    
    if (response.ok) {
      return `http://localhost:${port}`;
    }
  } catch {
    // Server not running
  }
  
  return null;
}

/**
 * Auto-start WSL server if needed
 */
export async function ensureWSLServer(port = 3001): Promise<string> {
  const existing = await detectWSLServer(port);
  if (existing) return existing;

  console.log('[Client] Starting WSL server...');
  
  try {
    // Start termdeck in server mode inside WSL
    const serverProcess = exec(`wsl -- bash -c "cd '$(wslpath '${process.cwd()}')' && npm run server"`);

    // Wait for server to be ready
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const serverUrl = await detectWSLServer(port);
      if (serverUrl) {
        console.log(`[Client] WSL server ready at ${serverUrl}`);
        return serverUrl;
      }
      attempts++;
    }
    
    throw new Error('WSL server failed to start within 30 seconds');
  } catch (error) {
    console.error('[Client] Failed to start WSL server:', error);
    throw new Error(`Could not start WSL server: ${error}`);
  }
}

/**
 * Get WSL distribution info
 */
export async function getWSLInfo(): Promise<{ distributions: string[]; default?: string }> {
  if (process.platform !== 'win32') {
    return { distributions: [] };
  }

  try {
    const { stdout } = await execAsync('wsl --list --verbose');
    const lines = stdout.split('\n').filter(line => line.trim());
    
    const distributions: string[] = [];
    let defaultDist: string | undefined;
    
    for (const line of lines) {
      if (line.includes('NAME') || line.includes('---')) continue;
      const match = line.match(/^\s*([*\s])\s*(\S+)/);
      if (match) {
        const [, marker, name] = match;
        distributions.push(name);
        if (marker === '*') defaultDist = name;
      }
    }
    
    return { distributions, default: defaultDist };
  } catch {
    return { distributions: [] };
  }
}

/**
 * Validate server connectivity
 */
export async function validateServerConnection(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/api/state`, {
      method: 'GET',
      timeout: 5000
    } as any);
    
    return response.ok;
  } catch {
    return false;
  }
}