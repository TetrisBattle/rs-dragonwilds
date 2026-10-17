import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, ipcMain } from 'electron'
import { createMainWindow } from './createWindow'
import { registerSaveHandlers } from './ipc/registerSaveHandlers'

app.whenReady().then(() => {
	electronApp.setAppUserModelId('com.electron')

	app.on('browser-window-created', (_, window) => {
		optimizer.watchWindowShortcuts(window)
	})

	ipcMain.on('ping', () => console.log('pong'))

	registerSaveHandlers()
	createMainWindow()
})
