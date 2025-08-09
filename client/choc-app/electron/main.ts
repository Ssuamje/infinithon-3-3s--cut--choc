import { app, BrowserWindow, systemPreferences } from 'electron';
import path from 'path';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let win: BrowserWindow | null = null;

async function createWindow() {
  // macOS 카메라 권한 (첫 실행 시 요청)
  if (process.platform === 'darwin') {
    await systemPreferences.askForMediaAccess('camera');
    // 마이크 쓸 거면 'microphone' 도 요청
  }

  win = new BrowserWindow({
    width: 960,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // 보안
      nodeIntegration: false, // 보안
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // 개발 모드: Vite dev server
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 프로덕션: 빌드된 파일
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
