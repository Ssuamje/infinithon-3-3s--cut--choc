import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("blinkAPI", {
    // 깜빡임 카운트를 메인 프로세스에 전송
    updateBlinkCount: (count) => {
        ipcRenderer.send("update-blink-count", count);
    },
    // 현재 깜빡임 카운트 가져오기
    getBlinkCount: () => {
        return ipcRenderer.invoke("get-blink-count");
    },
    // 깜빡임 경고 상태를 메인 프로세스에 전송
    updateWarningState: (state) => {
        ipcRenderer.send("update-warning-state", state);
    },
    // 이후 Python IPC 붙일 때 여기로 메서드 추가
});
// Electron API 추가
contextBridge.exposeInMainWorld("electronAPI", {
    on: (channel, func) => {
        ipcRenderer.on(channel, func);
    },
    removeListener: (channel, func) => {
        ipcRenderer.removeListener(channel, func);
    },
    // 경고 상태 동기화 요청에 대한 응답
    sendWarningStateSync: (state) => {
        ipcRenderer.send("warning-state-sync-response", state);
    },
});
