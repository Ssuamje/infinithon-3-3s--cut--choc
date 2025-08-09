import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("blinkAPI", {
// 이후 Python IPC 붙일 때 여기로 메서드 추가
});
