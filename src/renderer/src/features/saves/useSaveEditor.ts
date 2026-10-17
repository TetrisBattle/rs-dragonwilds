import { useCallback, useEffect, useState } from 'react'
import type { SaveData, SaveSummary } from '../../../../shared/save'
import {
	addPersonalChestItem as addPersonalChestItemToSave,
	updatePersonalChestItemData as applyPersonalChestItemDataUpdate,
	updatePersonalChestItem as applyPersonalChestItemUpdate,
	initializeMissingItemCounts,
} from '../inventory/model'
import type { EditableItemField } from '../inventory/types'

function getErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'An unexpected error occurred.'
}

export function useSaveEditor() {
	const [saves, setSaves] = useState<SaveSummary[]>([])
	const [selectedFile, setSelectedFile] = useState<string | null>(null)
	const [saveData, setSaveData] = useState<SaveData | null>(null)
	const [loadingSaves, setLoadingSaves] = useState(true)
	const [loadingFile, setLoadingFile] = useState(false)
	const [saving, setSaving] = useState(false)
	const [dirty, setDirty] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	const [pendingSave, setPendingSave] = useState<SaveSummary | null>(null)

	const refreshSaves = useCallback(async () => {
		setLoadingSaves(true)
		setError(null)
		try {
			setSaves(await window.api.listSaves())
		} catch (loadError) {
			setError(
				`Could not read the Dragonwilds save folder. ${getErrorMessage(loadError)}`,
			)
		} finally {
			setLoadingSaves(false)
		}
	}, [])

	useEffect(() => {
		void refreshSaves()
	}, [refreshSaves])

	const openSave = useCallback(async (save: SaveSummary) => {
		setSelectedFile(save.fileName)
		setSaveData(null)
		setLoadingFile(true)
		setDirty(false)
		setNotice(null)
		setError(null)
		try {
			const loadedSave = await window.api.readSave(save.fileName)
			const normalized = initializeMissingItemCounts(loadedSave)
			setSaveData(normalized.save)
			setDirty(normalized.changed)
		} catch (readError) {
			setError(`Could not open ${save.fileName}. ${getErrorMessage(readError)}`)
			setSelectedFile(null)
		} finally {
			setLoadingFile(false)
		}
	}, [])

	const selectSave = useCallback(
		(save: SaveSummary) => {
			if (save.fileName === selectedFile) return
			if (dirty) {
				setPendingSave(save)
				return
			}
			void openSave(save)
		},
		[dirty, openSave, selectedFile],
	)

	const confirmPendingSave = useCallback(() => {
		if (pendingSave) void openSave(pendingSave)
		setPendingSave(null)
	}, [openSave, pendingSave])

	const updateItem = useCallback(
		(slot: string, field: EditableItemField, value: number | null) => {
			setSaveData((current) =>
				current
					? applyPersonalChestItemUpdate(current, slot, field, value)
					: current,
			)
			setDirty(true)
			setNotice(null)
		},
		[],
	)

	const changeItemType = useCallback((slot: string, itemId: string) => {
		setSaveData((current) =>
			current
				? applyPersonalChestItemDataUpdate(current, slot, itemId)
				: current,
		)
		setDirty(true)
		setNotice(null)
	}, [])

	const addItem = useCallback((itemId: string) => {
		setSaveData((current) =>
			current ? addPersonalChestItemToSave(current, itemId) : current,
		)
		setDirty(true)
		setNotice('Item added to the next available slot. Save changes to keep it.')
	}, [])

	const saveChanges = useCallback(async () => {
		if (!saveData || !selectedFile) return
		setSaving(true)
		setError(null)
		setNotice(null)
		try {
			await window.api.writeSave(selectedFile, saveData)
			setDirty(false)
			setNotice(
				'Changes saved. A timestamped backup of the original file was created.',
			)
			await refreshSaves()
		} catch (saveError) {
			setError(`Could not save changes. ${getErrorMessage(saveError)}`)
		} finally {
			setSaving(false)
		}
	}, [refreshSaves, saveData, selectedFile])

	return {
		saves,
		selectedFile,
		saveData,
		loadingSaves,
		loadingFile,
		saving,
		dirty,
		error,
		notice,
		pendingSave,
		refreshSaves,
		selectSave,
		confirmPendingSave,
		closePendingSave: () => setPendingSave(null),
		updateItem,
		changeItemType,
		addItem,
		saveChanges,
		closeError: () => setError(null),
		closeNotice: () => setNotice(null),
	}
}
