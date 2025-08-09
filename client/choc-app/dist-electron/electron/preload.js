import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('blinkAPI', {
    // 깜빡임 카운트를 메인 프로세스에 전송
    updateBlinkCount: (count) => {
        ipcRenderer.send('update-blink-count', count);
    },
    // 현재 깜빡임 카운트 가져오기
    getBlinkCount: () => {
        return ipcRenderer.invoke('get-blink-count');
    },
    // 이후 Python IPC 붙일 때 여기로 메서드 추가
});
