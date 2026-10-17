import { ipcMain } from 'electron'
import { listSaves, readSave, writeSave } from '../services/saveService'

export function registerSaveHandlers(): void {
	ipcMain.handle('saves:list', () => listSaves())
	ipcMain.handle('saves:read', (_event, fileName: unknown) =>
		readSave(fileName),
	)
	ipcMain.handle('saves:write', (_event, fileName: unknown, save: unknown) =>
		writeSave(fileName, save),
	)
}
