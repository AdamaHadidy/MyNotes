// MyNotes desktop app (Electron). It opens the same web app in a window, with its files stored on this computer.
const {app, BrowserWindow, Menu, dialog, ipcMain, protocol, net, shell, session} = require('electron');
const path = require('path');
const fs = require('fs');
const {pathToFileURL} = require('url');

// "app://" gives the page a proper, stable address so its saved notes live in one place.
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true}}]);

const ROOT = path.join(__dirname, 'app');
const stateFile = () => path.join(app.getPath('userData'), 'window.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch (e) { return {}; } };
let win = null;

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    width: st.width || 1280, height: st.height || 860, x: st.x, y: st.y, minWidth: 820, minHeight: 560,
    backgroundColor: '#23262c', title: 'MyNotes', autoHideMenuBar: true,
    webPreferences: {preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true}
  });
  if (st.maximized) win.maximize();
  win.loadURL('app://mynotes/index.html');
  win.webContents.setWindowOpenHandler(({url}) => { if (/^https?:/.test(url)) shell.openExternal(url); return {action: 'deny'}; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  const remember = () => { try { if (win && !win.isDestroyed()) fs.writeFileSync(stateFile(), JSON.stringify({...win.getNormalBounds(), maximized: win.isMaximized()})); } catch (e) {} };
  win.on('close', remember);
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const mac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{label: app.name, submenu: [{role: 'about'}, {type: 'separator'}, {role: 'hide'}, {role: 'hideOthers'}, {role: 'unhide'}, {type: 'separator'}, {role: 'quit'}]}] : []),
    {label: 'Edit', submenu: [{role: 'cut'}, {role: 'copy'}, {role: 'paste'}, {role: 'selectAll'}]},   // no Undo/Redo here: MyNotes handles Cmd/Ctrl+Z itself
    {label: 'View', submenu: [{role: 'togglefullscreen'}]},
    {label: 'Window', submenu: [{role: 'minimize'}, {role: 'zoom'}, ...(mac ? [{type: 'separator'}, {role: 'front'}] : [{role: 'close'}])]}
  ]));
}

ipcMain.handle('save-file', async (event, name, buffer) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  const safe = String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_');
  const ext = path.extname(safe).slice(1);
  const result = await dialog.showSaveDialog(owner, {defaultPath: path.join(app.getPath('documents'), safe), filters: ext ? [{name: ext.toUpperCase(), extensions: [ext]}] : []});
  if (result.canceled || !result.filePath) return {canceled: true};
  await fs.promises.writeFile(result.filePath, Buffer.from(buffer));
  return {ok: true, path: result.filePath};
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    protocol.handle('app', req => {
      let p = decodeURIComponent(new URL(req.url).pathname); if (p === '/') p = '/index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT)) return new Response('Not allowed', {status: 403});
      return net.fetch(pathToFileURL(file).toString());
    });
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => callback(['fullscreen', 'clipboard-sanitized-write', 'persistent-storage'].includes(permission)));
    buildMenu(); createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
