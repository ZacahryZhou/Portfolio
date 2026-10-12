const { app, BrowserWindow, WebContentsView, ipcMain, clipboard } = require('electron');
const path = require('path');
const config = require('./src/config');
const fakeClient = require('./src/fakeClient');
const { Runner } = require('./src/runner');

let win = null;
let atipView = null;
let runner = null;
let client = null;
let runState = 'idle';
const logLines = [];

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function log(message) {
  const stamp = new Date().toLocaleTimeString('en-GB');
  const line = `${stamp}  ${message}`;
  logLines.push(line);
  send('log', line);
}

function setClient(next) {
  client = next;
  log(fakeClient.describe(client, !config.TEST_MODE));
  send('client', client);
}

function layout() {
  if (!win || !atipView) return;
  const { width, height } = win.getContentBounds();
  atipView.setBounds({ x: 0, y: 0, width: Math.max(width - config.PANEL_WIDTH, 200), height });
}

function pageInfo() {
  const wc = atipView.webContents;
  return { url: wc.getURL(), title: wc.getTitle(), loading: wc.isLoading() };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'ATIP Filler',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Left half: the real ATIP web page, in its own persistent session.
  atipView = new WebContentsView({
    webPreferences: { partition: config.ATIP_PARTITION, contextIsolation: true, sandbox: true },
  });
  win.contentView.addChildView(atipView);
  layout();
  win.on('resize', layout);

  const wc = atipView.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) wc.loadURL(url);
    return { action: 'deny' };
  });
  ['did-navigate', 'did-navigate-in-page', 'did-start-loading', 'did-stop-loading', 'page-title-updated'].forEach((e) =>
    wc.on(e, () => send('page', pageInfo()))
  );
  wc.loadURL(config.ATIP_START_URL).catch((err) => log(`Could not load start page: ${err.message}`));

  // Right half: the React control panel.
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('closed', () => {
    if (runner) runner.stop();
    win = null;
    atipView = null;
  });
}

ipcMain.handle('config:get', () => ({ startUrl: config.ATIP_START_URL, testMode: config.TEST_MODE }));
ipcMain.handle('client:get', () => {
  if (!client) setClient(fakeClient.generate());
  return client;
});
ipcMain.handle('client:new', () => {
  setClient(fakeClient.generate());
  return client;
});
ipcMain.handle('log:get', () => logLines.slice());
ipcMain.handle('log:clear', () => {
  logLines.length = 0;
});
ipcMain.handle('log:copy', () => {
  clipboard.writeText(logLines.join('\n'));
  return logLines.length;
});
ipcMain.handle('nav:home', () => atipView.webContents.loadURL(config.ATIP_START_URL));
ipcMain.handle('run:start', () => {
  if (runState === 'running') return;
  if (!client) setClient(fakeClient.generate());
  runner = new Runner({
    webContents: atipView.webContents,
    log,
    onState: (state) => {
      runState = state;
      send('run:state', state);
    },
  });
  runner.start();
});
ipcMain.handle('run:stop', () => {
  if (runner) runner.stop();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
