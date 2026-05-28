import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  getName: (): Promise<string> => ipcRenderer.invoke('app:name'),
  printer: {
    printPromissoria: (payload: unknown): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('printer:promissoria', payload),
    printRecibo: (payload: unknown): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('printer:recibo', payload),
    test: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('printer:test'),
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  ;(window as unknown as { electron: typeof electronAPI; api: typeof api }).electron = electronAPI
  ;(window as unknown as { electron: typeof electronAPI; api: typeof api }).api = api
}

export type ExposedApi = typeof api
