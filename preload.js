// Gives the page one small, safe way to talk to the desktop app: saving a file with the system "Save as" dialog.
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('mynotes', {
  desktop: true,
  platform: process.platform,
  saveFile: (name, buffer) => ipcRenderer.invoke('save-file', name, buffer)
});
