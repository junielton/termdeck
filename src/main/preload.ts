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
  stop: (buttonId: string) => ipcRenderer.invoke('deck:stop', buttonId)
  ,createProfile: (data: any) => ipcRenderer.invoke('deck:createProfile', data)
  ,setActiveProfile: (profileId: string) => ipcRenderer.invoke('deck:setActiveProfile', profileId)
  ,renameProfile: (profileId: string, name: string) => ipcRenderer.invoke('deck:renameProfile', profileId, name)
  ,deleteProfile: (profileId: string) => ipcRenderer.invoke('deck:deleteProfile', profileId)
  ,setConcurrencyPolicy: (policy: string) => ipcRenderer.invoke('deck:setConcurrencyPolicy', policy)
  ,setLocale: (locale: string) => ipcRenderer.invoke('deck:setLocale', locale)
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
  stop: (buttonId: string) => Promise<any>;
  createProfile: (data: { name?: string; rows?: number; cols?: number }) => Promise<any>;
  setActiveProfile: (profileId: string) => Promise<any>;
  renameProfile: (profileId: string, name: string) => Promise<any>;
  deleteProfile: (profileId: string) => Promise<any>;
  setConcurrencyPolicy: (policy: 'parallel' | 'single-per-button' | 'single-global') => Promise<any>;
  setLocale: (locale: string) => Promise<any>;
    }
  }
}
