import { app, BrowserWindow, systemPreferences, Tray, Menu, nativeImage, screen, ipcMain, } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let win = null;
let tray = null;
let isQuitting = false;
let blinkCount = 0;
// 아이콘 캐시
let openEyeImg = null;
let closedEyeImg = null;
const isMac = process.platform === "darwin";
async function createWindow() {
    // macOS 카메라 권한 (첫 실행 시 요청)
    if (isMac) {
        try {
            await systemPreferences.askForMediaAccess("camera");
        }
        catch (e) {
            console.error(e);
        }
    }
    win = new BrowserWindow({
        width: 480, // 360에서 640으로 조정 (UI 크기에 맞춤)
        height: 800, // 460에서 700으로 조정 (UI 높이에 맞춤)
        show: true, // 초기에 화면 표시
        frame: false, // ✅ 상단바 제거 (프레임리스)
        transparent: false, // 배경 투명은 필요 시 true로
        opacity: 0.95, // 초기 투명도
        resizable: true,
        movable: true,
        alwaysOnTop: true, // 기본 항상 위 (메뉴로 토글 가능)
        skipTaskbar: true,
        fullscreenable: false,
        minimizable: false,
        maximizable: false,
        // titleBarStyle은 frame:false이면 의미 없으므로 제거
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
    }
    else {
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
    // IPC 통신 설정
    setupIPC();
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
    if (!openEyeImg || !closedEyeImg)
        loadTrayImages();
    tray = new Tray(createTrayIcon());
    updateTrayTooltip();
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
    if (!win)
        return;
    if (win.isVisible()) {
        win.hide();
    }
    else {
        positionWindowNearTray();
        win.show();
        win.focus();
    }
    updateTrayVisual();
}
function positionWindowNearTray() {
    if (!tray || !win)
        return;
    const trayBounds = tray.getBounds();
    const winBounds = win.getBounds();
    const display = screen.getDisplayNearestPoint({
        x: trayBounds.x,
        y: trayBounds.y,
    });
    const padding = 6;
    const x = Math.round(Math.min(Math.max(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2, display.workArea.x + padding), display.workArea.x + display.workArea.width - winBounds.width - padding));
    const y = isMac
        ? Math.round(trayBounds.y + trayBounds.height + 8) // 메뉴바 아래
        : Math.round(trayBounds.y - winBounds.height - 8);
    win.setPosition(x, y, false);
}
function createTrayIcon() {
    // 기본 아이콘을 사용 (Canvas는 복잡하므로 생략)
    const isVisible = win?.isVisible();
    return isVisible ? openEyeImg : closedEyeImg;
}
function updateTrayVisual() {
    if (!tray)
        return;
    try {
        // Canvas 없이 간단한 텍스트 기반 아이콘
        const icon = win?.isVisible() ? openEyeImg : closedEyeImg;
        if (icon) {
            tray.setImage(icon);
        }
        updateTrayTooltip();
    }
    catch (error) {
        console.error('트레이 아이콘 업데이트 오류:', error);
        // 오류 시 기본 아이콘 사용
        if (openEyeImg) {
            tray.setImage(openEyeImg);
        }
        updateTrayTooltip();
    }
}
function updateTrayTooltip() {
    if (!tray)
        return;
    const status = win?.isVisible() ? "실행중" : "숨김/대기";
    tray.setToolTip(`👁️ Blink App (${status}) - 깜빡임: ${blinkCount}회`);
}
// IPC 통신 설정
function setupIPC() {
    // 렌더러에서 깜빡임 카운트 업데이트 받기
    ipcMain.on('update-blink-count', (event, count) => {
        blinkCount = count;
        updateTrayVisual();
    });
    // 렌더러에서 트레이 상태 요청
    ipcMain.handle('get-blink-count', () => {
        return blinkCount;
    });
}
app.whenReady().then(async () => {
    if (isMac && app.dock)
        app.dock.hide(); // 상태바 앱 느낌
    await createWindow();
    createTray();
});
// 모든 창 닫혀도 종료하지 않음 (트레이 상주)
app.on("window-all-closed", () => {
    /* noop */
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
