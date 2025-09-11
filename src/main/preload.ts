import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('termdeck', {
  load: () => ipcRenderer.invoke('deck:load'),
  addButton: (profileId: string, button: any) => ipcRenderer.invoke('deck:addButton', profileId, button),
  updateButton: (profileId: string, buttonId: string, patch: any) => ipcRenderer.invoke('deck:updateButton', profileId, buttonId, patch),
  removeButton: (profileId: string, buttonId: string) => ipcRenderer.invoke('deck:removeButton', profileId, buttonId),
  updateProfile: (profile: any) => ipcRenderer.invoke('deck:updateProfile', profile),
  run: (buttonId: string, listener: (msg: any) => void) => {
    ipcRenderer.invoke('deck:run', buttonId);
    const channel = `deck:run:stream:${buttonId}`;
    const handler = (_event: any, data: any) => listener(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  runWithParams: (buttonId: string, params: Record<string, string>, listener: (msg: any) => void) => {
    ipcRenderer.invoke('deck:runWithParams', buttonId, params);
    const channel = `deck:run:stream:${buttonId}`;
    const handler = (_event: any, data: any) => listener(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  stop: (buttonId: string) => ipcRenderer.invoke('deck:stop', buttonId)
  ,createProfile: (data: any) => ipcRenderer.invoke('deck:createProfile', data)
  ,setActiveProfile: (profileId: string) => ipcRenderer.invoke('deck:setActiveProfile', profileId)
  ,renameProfile: (profileId: string, name: string) => ipcRenderer.invoke('deck:renameProfile', profileId, name)
  ,deleteProfile: (profileId: string) => ipcRenderer.invoke('deck:deleteProfile', profileId)
  ,setConcurrencyPolicy: (policy: string) => ipcRenderer.invoke('deck:setConcurrencyPolicy', policy)
  ,setLocale: (locale: string) => ipcRenderer.invoke('deck:setLocale', locale)
  ,sendInput: (buttonId: string, value: string) => ipcRenderer.invoke('deck:sendInput', buttonId, value)
  ,onPrompt: (handler: (p: { buttonId: string; buttonLabel: string; type: 'input' | 'password'; text: string }) => void) => {
    const h = (_e: any, payload: any) => handler(payload);
    ipcRenderer.on('deck:prompt', h);
    return () => ipcRenderer.removeListener('deck:prompt', h);
  }
  ,onNotifyFallback: (handler: (n: { buttonId: string; label: string; title: string; body: string; failed: boolean }) => void) => {
    const h = (_e: any, payload: any) => handler(payload);
    ipcRenderer.on('deck:notify-fallback', h);
    return () => ipcRenderer.removeListener('deck:notify-fallback', h);
  }
  ,getMode: () => ipcRenderer.invoke('deck:getMode')
});

declare global {
  interface Window {
    termdeck: {
      load: () => Promise<any>;
      addButton: (profileId: string, button: any) => Promise<any>;
  updateButton: (profileId: string, buttonId: string, patch: any) => Promise<any>;
  removeButton: (profileId: string, buttonId: string) => Promise<any>;
  updateProfile: (profile: any) => Promise<any>;
      run: (buttonId: string, listener: (msg: any) => void) => () => void;
  runWithParams: (buttonId: string, params: Record<string,string>, listener: (msg: any) => void) => () => void;
  stop: (buttonId: string) => Promise<any>;
  createProfile: (data: { name?: string; rows?: number; cols?: number }) => Promise<any>;
  setActiveProfile: (profileId: string) => Promise<any>;
  renameProfile: (profileId: string, name: string) => Promise<any>;
  deleteProfile: (profileId: string) => Promise<any>;
  setConcurrencyPolicy: (policy: 'parallel' | 'single-per-button' | 'single-global') => Promise<any>;
  setLocale: (locale: string) => Promise<any>;
      sendInput: (buttonId: string, value: string) => Promise<{ sent: boolean; error?: string; reason?: string }>;
      onPrompt: (handler: (p: { buttonId: string; buttonLabel: string; type: 'input' | 'password'; text: string }) => void) => () => void;
      onNotifyFallback: (handler: (n: { buttonId: string; label: string; title: string; body: string; failed: boolean }) => void) => () => void;
      getMode: () => Promise<{ mode: string }>;
    }
  }
}
