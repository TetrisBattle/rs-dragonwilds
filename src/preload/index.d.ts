import type { ElectronAPI } from '@electron-toolkit/preload'
import type { SaveData, SaveSummary } from '../shared/save'

declare global {
	interface Window {
		electron: ElectronAPI
		api: {
			ping: () => void
			listSaves: () => Promise<SaveSummary[]>
			readSave: (fileName: string) => Promise<SaveData>
			writeSave: (fileName: string, save: SaveData) => Promise<void>
		}
	}
}
