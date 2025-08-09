import {
  app,
  BrowserWindow,
  systemPreferences,
  Tray,
  Menu,
  nativeImage,
  screen,
} from "electron";
import * as path from "path";
import { fileURLToPath } from "url";

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// 아이콘 캐시
let openEyeImg: Electron.NativeImage | null = null;
let closedEyeImg: Electron.NativeImage | null = null;

const isMac = process.platform === "darwin";

async function createWindow() {
  // macOS 카메라 권한 (첫 실행 시 요청)
  if (isMac) {
    try {
      await systemPreferences.askForMediaAccess("camera");
    } catch (e) {
      console.error(e);
    }
  }

  win = new BrowserWindow({
    width: 640,
    height: 900,
    show: true,
    frame: false, // true에서 false로 변경 (상단바 제거)
    transparent: true, // false에서 true로 변경 (투명 배경)
    opacity: 1,
    resizable: true,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,

    // 드래그 개선을 위한 추가 설정
    hasShadow: false,
    thickFrame: false,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 개발/프로덕션 로드
  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "../../dist/index.html");
    await win.loadFile(indexPath);
  }

  // 닫기(X) → 종료 대신 숨김
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win?.hide();
    }
  });

  // 창 표시/숨김 시 트레이 아이콘 업데이트
  win.on("show", updateTrayVisual);
  win.on("hide", updateTrayVisual);
}

function loadTrayImages() {
  const assetsPath = path.join(__dirname, "../../assets");
  const openEyePath = path.join(assetsPath, "eye-open.png");
  const closedEyePath = path.join(assetsPath, "eye-closed.png");

  openEyeImg = nativeImage.createFromPath(openEyePath);
  closedEyeImg = nativeImage.createFromPath(closedEyePath);

  // macOS 상태바 자동 반전(다크/라이트) 용
  openEyeImg.setTemplateImage(true);
  closedEyeImg.setTemplateImage(true);
}

function createTray() {
  if (tray) {
    tray.removeAllListeners();
    tray.destroy();
    tray = null;
  }

  if (!openEyeImg || !closedEyeImg) loadTrayImages();

  tray = new Tray(openEyeImg!);
  tray.setToolTip("👁️ Blink App");

  // 좌클릭 → 창 토글
  tray.on("click", toggleMainWindow);

  // 우클릭 → 트레이 전용 팝업 (창 포커스와 무관하게 뜸)
  const menu = buildContextMenu();
  // 두 방식 중 하나만 쓰면 됩니다. setContextMenu를 쓰면 자동 표시됨.
  tray.setContextMenu(menu);
  // 만약 직접 제어 원하면 아래로 교체:
  // tray.on("right-click", () => tray!.popUpContextMenu(menu));

  updateTrayVisual();
}

function buildContextMenu() {
  return Menu.buildFromTemplate([
    {
      label: "열기 / 닫기",
      click: () => toggleMainWindow(),
    },
    {
      label: "투명도",
      submenu: [
        {
          label: "100% (불투명)",
          type: "radio",
          click: () => win?.setOpacity(1.0),
        },
        {
          label: "95%",
          type: "radio",
          checked: true,
          click: () => win?.setOpacity(0.95),
        },
        { label: "90%", type: "radio", click: () => win?.setOpacity(0.9) },
        { label: "80%", type: "radio", click: () => win?.setOpacity(0.8) },
        { label: "70%", type: "radio", click: () => win?.setOpacity(0.7) },
      ],
    },
    {
      label: "항상 위에 표시",
      type: "checkbox",
      checked: true,
      click: (mi) => win?.setAlwaysOnTop(!!mi.checked),
    },
    { type: "separator" },
    {
      label: "종료",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function toggleMainWindow() {
  if (!win) return;
  if (win.isVisible()) {
    win.hide();
  } else {
    positionWindowNearTray();
    win.show();
    win.focus();
  }
  updateTrayVisual();
}

function positionWindowNearTray() {
  if (!tray || !win) return;

  const trayBounds = tray.getBounds();
  const winBounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y,
  });

  const padding = 6;
  const x = Math.round(
    Math.min(
      Math.max(
        trayBounds.x + trayBounds.width / 2 - winBounds.width / 2,
        display.workArea.x + padding
      ),
      display.workArea.x + display.workArea.width - winBounds.width - padding
    )
  );
  const y = isMac
    ? Math.round(trayBounds.y + trayBounds.height + 8) // 메뉴바 아래
    : Math.round(trayBounds.y - winBounds.height - 8);

  win.setPosition(x, y, false);
}

function updateTrayVisual() {
  if (!tray || !openEyeImg || !closedEyeImg) return;
  if (win?.isVisible()) {
    tray.setImage(openEyeImg);
    tray.setToolTip("👁️ Blink App (실행중)");
  } else {
    tray.setImage(closedEyeImg);
    tray.setToolTip("👁️ Blink App (숨김/대기)");
  }
}

app.whenReady().then(async () => {
  if (isMac && app.dock) app.dock.hide(); // 상태바 앱 느낌
  await createWindow();
  createTray();
});

// 모든 창 닫혀도 종료하지 않음 (트레이 상주)
app.on("window-all-closed", () => {
  /* noop */
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
