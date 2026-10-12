const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('atip', {
  getClient: () => ipcRenderer.invoke('client:get'),
  newClient: () => ipcRenderer.invoke('client:new'),
  getLog: () => ipcRenderer.invoke('log:get'),
  copyLog: () => ipcRenderer.invoke('log:copy'),
  clearLog: () => ipcRenderer.invoke('log:clear'),
  start: () => ipcRenderer.invoke('run:start'),
  stop: () => ipcRenderer.invoke('run:stop'),
  goHome: () => ipcRenderer.invoke('nav:home'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  onLog: on('log'),
  onState: on('run:state'),
  onPage: on('page'),
  onClient: on('client'),
});
