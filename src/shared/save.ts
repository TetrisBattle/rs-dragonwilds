export interface SaveSummary {
	fileName: string
	characterName: string
	lastModified: string
	size: number
}

export type SaveData = Record<string, unknown>
