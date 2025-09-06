export interface DeckButtonCommand {
  id: string;
  label: string;
  command: string;
  cwd?: string; // directory context
  icon?: { pack: string; name: string } | null; // icon descriptor
  color?: string;
  confirm?: boolean;
  timeoutMs?: number;
  readonly?: boolean;
  concurrency?: 'allow' | 'block' | 'terminate';
  notifyOn?: 'off' | 'fail' | 'always' | 'success' | 'error' | 'both';
  parameters?: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'select';
    options?: string[];
    required?: boolean;
    defaultValue?: string;
  }>;
}

export interface DeckProfile {
  id: string;
  name: string;
  path?: string; // for client-server compatibility
  rows?: number; // for main.ts compatibility
  cols?: number; // for main.ts compatibility
  rootDir?: string; // directory associated (optional)
  buttons: DeckButtonCommand[]; // up to rows*cols
  commands?: DeckButtonCommand[]; // alias for server compatibility
}

export interface DeckStateSchemaV1 {
  schemaVersion: 1;
  activeProfileId: string;
  profiles: DeckProfile[];
  directoryProfiles?: Record<string, string>; // normalized path -> profileId
  concurrencyPolicy?: 'parallel' | 'single-per-button' | 'single-global';
  locale?: string; // persisted UI locale (e.g. 'en', 'pt')
}

export interface AppConfig {
  version: string;
  profiles: DeckProfile[];
  settings: {
    locale: string;
    theme: string;
    autoSave: boolean;
  };
}

export interface LogEntry {
  command: string;
  type: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

export interface CommandExecution {
  command: string;
  startTime: number;
  endTime?: number;
  exitCode?: number;
  isRunning: boolean;
}

export interface PromptRequest {
  command: string;
  prompt: string;
  isPassword: boolean;
}

export interface NotificationRequest {
  title: string;
  body: string;
  command: string;
}