import { randomUUID } from 'node:crypto'
import { constants, type Dirent } from 'node:fs'
import {
	copyFile,
	readdir,
	readFile,
	rename,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import type { SaveData, SaveSummary } from '../../shared/save'

function getSaveDirectory(): string {
	const localAppData =
		process.env.LOCALAPPDATA ?? join(app.getPath('home'), 'AppData', 'Local')
	return join(localAppData, 'RSDragonwilds', 'Saved', 'SaveCharacters')
}

function isSaveFileName(fileName: unknown): fileName is string {
	return (
		typeof fileName === 'string' &&
		fileName === fileName.split(/[\\/]/).at(-1) &&
		fileName.toLowerCase().endsWith('.json') &&
		!fileName.toLowerCase().includes('.backup')
	)
}

function getCharacterName(save: SaveData, fileName: string): string {
	const metadata = save.meta_data
	const characterName =
		metadata && typeof metadata === 'object' && !Array.isArray(metadata)
			? (metadata as Record<string, unknown>).char_name
			: undefined

	return typeof characterName === 'string' && characterName.length > 0
		? characterName
		: fileName.replace(/\.json$/i, '')
}

function parseSave(contents: string): SaveData {
	const parsed: unknown = JSON.parse(contents.replace(/^\uFEFF/, ''))
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('The save file must contain a JSON object.')
	}
	return parsed as SaveData
}

function hasPersonalInventory(save: SaveData): boolean {
	const gameProgress = save.GameProgress
	if (
		!gameProgress ||
		typeof gameProgress !== 'object' ||
		Array.isArray(gameProgress)
	) {
		return false
	}

	const personalInventory = (gameProgress as Record<string, unknown>)
		.PersonalInventory
	return Boolean(
		personalInventory &&
			typeof personalInventory === 'object' &&
			!Array.isArray(personalInventory),
	)
}

async function getAvailableSaveFile(fileName: unknown): Promise<string> {
	if (!isSaveFileName(fileName)) {
		throw new Error('Invalid save file name.')
	}

	const saves = await listSaves()
	if (!saves.some((save) => save.fileName === fileName)) {
		throw new Error(
			'That save file is not available in the Dragonwilds save folder.',
		)
	}

	return join(getSaveDirectory(), fileName)
}

export async function listSaves(): Promise<SaveSummary[]> {
	let files: Dirent[]
	try {
		files = await readdir(getSaveDirectory(), { withFileTypes: true })
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return []
		}
		throw error
	}

	const saves = await Promise.all(
		files
			.filter(
				(file) =>
					file.isFile() &&
					file.name.toLowerCase().endsWith('.json') &&
					!file.name.toLowerCase().includes('.backup'),
			)
			.map(async (file) => {
				const filePath = join(getSaveDirectory(), file.name)
				const [contents, fileStats] = await Promise.all([
					readFile(filePath, 'utf8'),
					stat(filePath),
				])
				const save = parseSave(contents)

				return {
					fileName: file.name,
					characterName: getCharacterName(save, file.name),
					lastModified: fileStats.mtime.toISOString(),
					size: fileStats.size,
				}
			}),
	)

	return saves.sort((left, right) =>
		left.characterName.localeCompare(right.characterName),
	)
}

export async function readSave(fileName: unknown): Promise<SaveData> {
	const filePath = await getAvailableSaveFile(fileName)
	return parseSave(await readFile(filePath, 'utf8'))
}

export async function writeSave(
	fileName: unknown,
	save: unknown,
): Promise<void> {
	if (!save || typeof save !== 'object' || Array.isArray(save)) {
		throw new Error('The edited save data is invalid.')
	}

	const saveData = save as SaveData
	if (!hasPersonalInventory(saveData)) {
		throw new Error(
			'The save data does not contain a valid personal inventory.',
		)
	}

	const filePath = await getAvailableSaveFile(fileName)
	const serialized = `${JSON.stringify(saveData, null, 2)}\n`
	const backupPath = `${filePath}.editor-backup-${Date.now()}`
	const temporaryPath = `${filePath}.${randomUUID()}.tmp`

	await copyFile(filePath, backupPath, constants.COPYFILE_EXCL)
	try {
		await writeFile(temporaryPath, serialized, {
			encoding: 'utf8',
			flag: 'wx',
		})
		await rename(temporaryPath, filePath)
	} finally {
		await rm(temporaryPath, { force: true })
	}
}
