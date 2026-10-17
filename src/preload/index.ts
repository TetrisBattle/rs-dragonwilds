import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

const api = {
	ping: () => ipcRenderer.send('ping'),
	listSaves: () => ipcRenderer.invoke('saves:list'),
	readSave: (fileName: string) => ipcRenderer.invoke('saves:read', fileName),
	writeSave: (fileName: string, save: Record<string, unknown>) =>
		ipcRenderer.invoke('saves:write', fileName, save),
}

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('electron', electronAPI)
		contextBridge.exposeInMainWorld('api', api)
	} catch (error) {
		console.error(error)
	}
} else {
	// @ts-expect-error (defined in dts)
	window.electron = electronAPI
	// @ts-expect-error (defined in dts)
	window.api = api
}
