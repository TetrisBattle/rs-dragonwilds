import { useCallback, useEffect, useState } from 'react'
import type { SaveData, SaveSummary } from '../../../../shared/save'
import {
	addPersonalChestItem as addPersonalChestItemToSave,
	addPlayerInventoryItem as addPlayerInventoryItemToSave,
	updateLoadoutItem as applyLoadoutItemUpdate,
	updatePersonalChestItem as applyPersonalChestItemUpdate,
	updatePlayerInventoryItem as applyPlayerInventoryItemUpdate,
	initializeMissingItemCounts,
	movePersonalChestItem as movePersonalChestItemInSave,
	movePlayerInventoryItem as movePlayerInventoryItemInSave,
	removePersonalChestItem as removePersonalChestItemFromSave,
	removePlayerInventoryItem as removePlayerInventoryItemFromSave,
} from '../inventory/model'
import type { EditableItemField, InventoryCategory } from '../inventory/types'

function getErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'An unexpected error occurred.'
}

type PendingAction = { type: 'open'; save: SaveSummary } | { type: 'refresh' }

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
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

	const refreshSaves = useCallback(async () => {
		setLoadingSaves(true)
		setError(null)
		try {
			const nextSaves = await window.api.listSaves()
			setSaves(nextSaves)
			return nextSaves
		} catch (loadError) {
			setError(
				`Could not read the Dragonwilds save folder. ${getErrorMessage(loadError)}`,
			)
			return null
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
			if (normalized.changed) {
				await window.api.writeSave(save.fileName, normalized.save)
				const refreshedSave = await window.api.readSave(save.fileName)
				const reNormalized = initializeMissingItemCounts(refreshedSave)
				setSaveData(reNormalized.save)
				setDirty(false)
				setNotice(
					'Auto-fixed missing item counts. A timestamped backup of the original file was created.',
				)
			} else {
				setSaveData(normalized.save)
				setDirty(false)
			}
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
				setPendingAction({ type: 'open', save })
				return
			}
			void openSave(save)
		},
		[dirty, openSave, selectedFile],
	)

	const refreshSelectedSave = useCallback(async () => {
		const refreshedSaves = await refreshSaves()
		if (!selectedFile || !refreshedSaves) return

		const selectedSave = refreshedSaves.find(
			(save) => save.fileName === selectedFile,
		)
		if (!selectedSave) {
			setError(`Could not find ${selectedFile} in the Dragonwilds save folder.`)
			return
		}

		await openSave(selectedSave)
	}, [openSave, refreshSaves, selectedFile])

	const requestRefresh = useCallback(() => {
		if (dirty && selectedFile) {
			setPendingAction({ type: 'refresh' })
			return
		}
		void refreshSelectedSave()
	}, [dirty, refreshSelectedSave, selectedFile])

	const confirmPendingAction = useCallback(() => {
		const action = pendingAction
		setPendingAction(null)
		if (action?.type === 'open') void openSave(action.save)
		if (action?.type === 'refresh') void refreshSelectedSave()
	}, [openSave, pendingAction, refreshSelectedSave])

	const closePendingAction = useCallback(() => {
		setPendingAction(null)
	}, [])

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

	const updatePlayerInventoryItem = useCallback(
		(slot: string, field: EditableItemField, value: number | null) => {
			setSaveData((current) =>
				current
					? applyPlayerInventoryItemUpdate(current, slot, field, value)
					: current,
			)
			setDirty(true)
			setNotice(null)
		},
		[],
	)

	const updateLoadoutItem = useCallback(
		(slot: string, field: EditableItemField, value: number | null) => {
			setSaveData((current) =>
				current ? applyLoadoutItemUpdate(current, slot, field, value) : current,
			)
			setDirty(true)
			setNotice(null)
		},
		[],
	)

	const addItem = useCallback((itemId: string) => {
		setSaveData((current) =>
			current ? addPersonalChestItemToSave(current, itemId) : current,
		)
		setDirty(true)
		setNotice(null)
	}, [])

	const addInventoryItem = useCallback(
		(itemId: string, category: InventoryCategory) => {
			setSaveData((current) =>
				current
					? addPlayerInventoryItemToSave(current, itemId, category)
					: current,
			)
			setDirty(true)
			setNotice(null)
		},
		[],
	)

	const removeItem = useCallback((slot: string) => {
		setSaveData((current) =>
			current ? removePersonalChestItemFromSave(current, slot) : current,
		)
		setDirty(true)
		setNotice(null)
	}, [])

	const removePlayerInventoryItem = useCallback((slot: string) => {
		setSaveData((current) =>
			current ? removePlayerInventoryItemFromSave(current, slot) : current,
		)
		setDirty(true)
		setNotice(null)
	}, [])

	const moveItem = useCallback(
		(
			fromSlot: string,
			toSlot: string,
			position: 'before' | 'after' = 'before',
		) => {
			if (fromSlot === toSlot) return
			setSaveData((current) =>
				current
					? movePersonalChestItemInSave(current, fromSlot, toSlot, position)
					: current,
			)
			setDirty(true)
			setNotice(null)
		},
		[],
	)

	const movePlayerInventoryItem = useCallback(
		(
			fromSlot: string,
			toSlot: string,
			position: 'before' | 'after' = 'before',
		) => {
			if (fromSlot === toSlot) return
			setSaveData((current) =>
				current
					? movePlayerInventoryItemInSave(current, fromSlot, toSlot, position)
					: current,
			)
			setDirty(true)
			setNotice(null)
		},
		[],
	)

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
		pendingSave: pendingAction?.type === 'open' ? pendingAction.save : null,
		pendingRefresh: pendingAction?.type === 'refresh',
		refreshSaves,
		requestRefresh,
		selectSave,
		confirmPendingAction,
		closePendingAction,
		updateItem,
		updatePlayerInventoryItem,
		updateLoadoutItem,
		addItem,
		addInventoryItem,
		removeItem,
		removePlayerInventoryItem,
		moveItem,
		movePlayerInventoryItem,
		saveChanges,
		closeError: () => setError(null),
		closeNotice: () => setNotice(null),
	}
}
