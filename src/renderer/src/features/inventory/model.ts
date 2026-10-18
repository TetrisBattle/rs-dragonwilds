import { getItemData } from './itemData'
import { getItemMaxStack } from './itemNames'
import type {
	EditableItemField,
	InventoryCategory,
	InventoryEntry,
	InventoryItem,
	PersonalChestEntry,
	PersonalChestItem,
	SaveData,
} from './types'

export const PERSONAL_CHEST_SLOT_COUNT = 20

export const QUICK_ACCESS_SLOT_COUNT = 8
export const INVENTORY_SLOT_COUNT = 8 * 4
export const ITEMS_SLOT_START = QUICK_ACCESS_SLOT_COUNT
export const RUNES_SLOT_START = ITEMS_SLOT_START + INVENTORY_SLOT_COUNT
export const ARROWS_SLOT_START = RUNES_SLOT_START + INVENTORY_SLOT_COUNT
export const QUEST_ITEMS_SLOT_START = ARROWS_SLOT_START + INVENTORY_SLOT_COUNT

export function getInventoryCategorySlotRange(
	category: InventoryCategory,
): [start: number, end: number] | null {
	switch (category) {
		case 'quick-access':
			return [0, ITEMS_SLOT_START]
		case 'items':
			return [ITEMS_SLOT_START, RUNES_SLOT_START]
		case 'runes':
			return [RUNES_SLOT_START, ARROWS_SLOT_START]
		case 'arrows':
			return [ARROWS_SLOT_START, QUEST_ITEMS_SLOT_START]
		case 'quest-items':
			return [
				QUEST_ITEMS_SLOT_START,
				QUEST_ITEMS_SLOT_START + INVENTORY_SLOT_COUNT,
			]
		default:
			return null
	}
}

/**
 * Slot number shown in the UI. Slots are 1-based and relative to the first
 * slot of the current tab, so the last row of a tab is its capacity. The
 * absolute slot stored in the save is never modified; slots outside the
 * current tab keep their raw id.
 */
export function getSlotLabel(slot: string, rangeStart: number): string {
	const absoluteSlot = Number(slot)
	const displaySlot = Number.isSafeInteger(absoluteSlot)
		? absoluteSlot - rangeStart + 1
		: Number.NaN
	return (displaySlot >= 1 ? String(displaySlot) : slot).padStart(2, '0')
}

export function isInventoryItem(value: unknown): value is InventoryItem {
	return (
		typeof value === 'object' &&
		value !== null &&
		'ItemData' in value &&
		typeof value.ItemData === 'string'
	)
}

export const isPersonalChestItem = isInventoryItem

function getInventoryAt(
	save: SaveData | null,
	key: 'Inventory' | 'PersonalInventory',
): Record<string, unknown> {
	const progress = save?.GameProgress
	if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
		return {}
	}

	const inventory = (progress as Record<string, unknown>)[key]
	return inventory && typeof inventory === 'object' && !Array.isArray(inventory)
		? (inventory as Record<string, unknown>)
		: {}
}

export function getPersonalChest(save: SaveData | null) {
	return getInventoryAt(save, 'PersonalInventory')
}

export function getPlayerInventory(save: SaveData | null) {
	return getInventoryAt(save, 'Inventory')
}

export function getLoadout(save: SaveData | null): Record<string, unknown> {
	const rootLoadout = save?.Loadout
	const progress = save?.GameProgress
	const progressLoadout =
		progress && typeof progress === 'object' && !Array.isArray(progress)
			? (progress as Record<string, unknown>).Loadout
			: undefined
	const loadout = isRecord(rootLoadout) ? rootLoadout : progressLoadout
	return isRecord(loadout) ? loadout : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getLoadoutSlotCount(loadout: Record<string, unknown>): number {
	const maxSlotIndex = loadout.MaxSlotIndex
	if (typeof maxSlotIndex === 'number' && Number.isSafeInteger(maxSlotIndex)) {
		return Math.max(0, maxSlotIndex + 1)
	}

	return Object.keys(loadout)
		.map(Number)
		.filter((slot) => Number.isSafeInteger(slot) && slot >= 0)
		.reduce((maxSlot, slot) => Math.max(maxSlot, slot + 1), 0)
}

export function getLoadoutEntries(save: SaveData | null): InventoryEntry[] {
	const loadout = getLoadout(save)
	const inventory = getPlayerInventory(save)
	return Object.entries(loadout)
		.flatMap(([slot, value]): InventoryEntry[] => {
			if (!['0', '1', '2', '3', '4', '11'].includes(slot)) return []
			if (isInventoryItem(value)) return [[slot, value]]
			if (
				typeof value !== 'object' ||
				value === null ||
				!('PlayerInventoryItemIndex' in value) ||
				typeof value.PlayerInventoryItemIndex !== 'number' ||
				!Number.isSafeInteger(value.PlayerInventoryItemIndex) ||
				value.PlayerInventoryItemIndex < 0
			) {
				return []
			}

			const item = inventory[String(value.PlayerInventoryItemIndex)]
			return isInventoryItem(item) ? [[slot, item]] : []
		})
		.sort(([left], [right]) => Number(left) - Number(right))
}

export function updateLoadoutItem(
	save: SaveData,
	slot: string,
	field: EditableItemField,
	value: number | null,
): SaveData {
	const loadout = getLoadout(save)
	const loadoutEntry = loadout[slot]
	if (isInventoryItem(loadoutEntry)) {
		if (save.Loadout === loadout) {
			return {
				...save,
				Loadout: {
					...loadout,
					[slot]: updateItemFields(loadoutEntry, field, value),
				},
			}
		}

		const progress = save.GameProgress
		if (!isRecord(progress)) return save
		return {
			...save,
			GameProgress: {
				...progress,
				Loadout: {
					...loadout,
					[slot]: updateItemFields(loadoutEntry, field, value),
				},
			},
		}
	}

	if (
		typeof loadoutEntry !== 'object' ||
		loadoutEntry === null ||
		!('PlayerInventoryItemIndex' in loadoutEntry) ||
		typeof loadoutEntry.PlayerInventoryItemIndex !== 'number' ||
		!Number.isSafeInteger(loadoutEntry.PlayerInventoryItemIndex) ||
		loadoutEntry.PlayerInventoryItemIndex < 0
	) {
		return save
	}

	const progress = save.GameProgress
	if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
		return save
	}
	const gameProgress = progress as Record<string, unknown>
	const inventory = gameProgress.Inventory
	if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
		return save
	}
	const playerInventory = inventory as Record<string, unknown>
	const inventorySlot = String(loadoutEntry.PlayerInventoryItemIndex)
	const inventoryItem = playerInventory[inventorySlot]
	if (!isInventoryItem(inventoryItem)) return save

	return {
		...save,
		GameProgress: {
			...gameProgress,
			Inventory: {
				...playerInventory,
				[inventorySlot]: updateItemFields(inventoryItem, field, value),
			},
		},
	}
}

function updateItemFields(
	item: InventoryItem,
	field: EditableItemField,
	value: number | null,
): InventoryItem {
	const updatedItem = { ...item }
	if (value === null || value === 0) {
		delete updatedItem[field]
	} else {
		updatedItem[field] = value
	}
	return updatedItem
}

export function getInventoryEntries(
	inventory: Record<string, unknown>,
): InventoryEntry[] {
	return Object.entries(inventory)
		.filter((entry): entry is InventoryEntry => isInventoryItem(entry[1]))
		.sort(([left], [right]) => Number(left) - Number(right))
}

export function getPersonalChestEntries(
	personalInventory: Record<string, unknown>,
): PersonalChestEntry[] {
	return getInventoryEntries(personalInventory)
}

export function getPlayerInventorySlotCount(
	inventory: Record<string, unknown>,
): number {
	const maxSlotIndex = inventory.MaxSlotIndex
	if (typeof maxSlotIndex === 'number' && Number.isSafeInteger(maxSlotIndex)) {
		return Math.max(0, maxSlotIndex + 1)
	}

	return getInventoryEntries(inventory).reduce(
		(maxSlot, [slot]) => Math.max(maxSlot, Number(slot) + 1),
		0,
	)
}
export function initializeMissingItemCounts(save: SaveData): {
	save: SaveData
	changed: boolean
} {
	const progress = save.GameProgress
	if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
		return { save, changed: false }
	}

	const gameProgress = progress as Record<string, unknown>
	const personalInventory = gameProgress.PersonalInventory
	let changed = false
	let updatedPersonalInventory = personalInventory
	if (
		personalInventory &&
		typeof personalInventory === 'object' &&
		!Array.isArray(personalInventory)
	) {
		updatedPersonalInventory = Object.fromEntries(
			Object.entries(personalInventory as Record<string, unknown>).map(
				([slot, value]) => {
					if (!isInventoryItem(value)) return [slot, value]
					if (typeof value.Count === 'number') return [slot, value]

					changed = true
					return [slot, { ...value, Count: 1 }]
				},
			),
		)
	}

	const currentInventory = gameProgress.Inventory
	let updatedInventory = currentInventory
	if (
		currentInventory &&
		typeof currentInventory === 'object' &&
		!Array.isArray(currentInventory)
	) {
		updatedInventory = Object.fromEntries(
			Object.entries(currentInventory as Record<string, unknown>).map(
				([slot, value]) => {
					if (
						!isInventoryItem(value) ||
						typeof value.Count !== 'number' ||
						getItemMaxStack(value.ItemData, value) !== 1 ||
						value.Count === 1
					) {
						return [slot, value]
					}

					changed = true
					return [slot, { ...value, Count: 1 }]
				},
			),
		)
	}

	if (!changed) return { save, changed }

	return {
		save: {
			...save,
			GameProgress: {
				...gameProgress,
				...(updatedPersonalInventory !== personalInventory && {
					PersonalInventory: updatedPersonalInventory,
				}),
				...(updatedInventory !== currentInventory && {
					Inventory: updatedInventory,
				}),
			},
		},
		changed,
	}
}

export function updatePersonalChestItem(
	save: SaveData,
	slot: string,
	field: EditableItemField,
	value: number | null,
): SaveData {
	return updateInventoryItem(save, 'PersonalInventory', slot, field, value)
}

export function updatePlayerInventoryItem(
	save: SaveData,
	slot: string,
	field: EditableItemField,
	value: number | null,
): SaveData {
	return updateInventoryItem(save, 'Inventory', slot, field, value)
}

function updateInventoryItem(
	save: SaveData,
	inventoryKey: 'Inventory' | 'PersonalInventory',
	slot: string,
	field: EditableItemField,
	value: number | null,
): SaveData {
	const progress = save.GameProgress as Record<string, unknown>
	const inventory = progress[inventoryKey] as Record<string, unknown>
	const item = inventory[slot] as PersonalChestItem
	const updatedItem = { ...item }
	if (value === null || value === 0) {
		delete updatedItem[field]
	} else {
		updatedItem[field] = value
	}

	return {
		...save,
		GameProgress: {
			...progress,
			[inventoryKey]: { ...inventory, [slot]: updatedItem },
		},
	}
}

export function removePersonalChestItem(
	save: SaveData,
	slot: string,
): SaveData {
	return removeInventoryItem(save, 'PersonalInventory', slot, true)
}

export function removePlayerInventoryItem(
	save: SaveData,
	slot: string,
): SaveData {
	return removeInventoryItem(save, 'Inventory', slot, false)
}

function removeInventoryItem(
	save: SaveData,
	inventoryKey: 'Inventory' | 'PersonalInventory',
	slot: string,
	recalculateMaxSlot: boolean,
): SaveData {
	const progress = save.GameProgress as Record<string, unknown>
	const inventory = progress[inventoryKey] as Record<string, unknown>
	const updatedInventory = { ...inventory }
	delete updatedInventory[slot]
	if (recalculateMaxSlot) {
		updatedInventory.MaxSlotIndex = Math.max(
			-1,
			...Object.keys(updatedInventory)
				.map(Number)
				.filter((index) => Number.isSafeInteger(index) && index >= 0),
		)
	}

	return {
		...save,
		GameProgress: {
			...progress,
			[inventoryKey]: updatedInventory,
		},
	}
}

export function movePersonalChestItem(
	save: SaveData,
	fromSlot: string,
	toSlot: string,
	position: 'before' | 'after' = 'before',
): SaveData {
	return moveInventoryItem(
		save,
		'PersonalInventory',
		fromSlot,
		toSlot,
		position,
		true,
	)
}

export function movePlayerInventoryItem(
	save: SaveData,
	fromSlot: string,
	toSlot: string,
	position: 'before' | 'after' = 'before',
): SaveData {
	return moveInventoryItem(save, 'Inventory', fromSlot, toSlot, position, false)
}

function moveInventoryItem(
	save: SaveData,
	inventoryKey: 'Inventory' | 'PersonalInventory',
	fromSlot: string,
	toSlot: string,
	position: 'before' | 'after',
	recalculateMaxSlot: boolean,
): SaveData {
	const sourceIndex = Number(fromSlot)
	const targetSlotIndex = Number(toSlot)
	const targetIndex = targetSlotIndex + (position === 'after' ? 1 : 0)
	if (
		!Number.isSafeInteger(sourceIndex) ||
		!Number.isSafeInteger(targetSlotIndex) ||
		!Number.isSafeInteger(targetIndex) ||
		sourceIndex < 0 ||
		targetSlotIndex < 0 ||
		targetIndex < 0 ||
		sourceIndex === targetIndex
	) {
		return save
	}

	const progress = save.GameProgress as Record<string, unknown>
	const inventory = progress[inventoryKey] as Record<string, unknown>
	if (!isInventoryItem(inventory[String(sourceIndex)])) return save

	const highestSlot = Math.max(
		sourceIndex,
		targetSlotIndex,
		...Object.keys(inventory)
			.map(Number)
			.filter((index) => Number.isSafeInteger(index) && index >= 0),
	)
	const slots = Array.from(
		{ length: highestSlot + 1 },
		(_, index) => inventory[String(index)],
	)
	const [movedItem] = slots.splice(sourceIndex, 1)
	const destinationIndex = Math.min(
		targetIndex > sourceIndex ? targetIndex - 1 : targetIndex,
		highestSlot,
	)
	slots.splice(destinationIndex, 0, movedItem)

	const updatedInventory = { ...inventory }
	for (const key of Object.keys(updatedInventory)) {
		const index = Number(key)
		if (Number.isSafeInteger(index) && index >= 0) {
			delete updatedInventory[key]
		}
	}

	slots.forEach((item, index) => {
		if (item !== undefined) updatedInventory[String(index)] = item
	})
	if (recalculateMaxSlot) {
		updatedInventory.MaxSlotIndex = Math.max(
			-1,
			...slots
				.map((item, index) => (isInventoryItem(item) ? index : -1))
				.filter((index) => index >= 0),
		)
	}

	return {
		...save,
		GameProgress: {
			...progress,
			[inventoryKey]: updatedInventory,
		},
	}
}

function createItemGuid(existingGuids: Set<string>): string {
	let guid: string
	do {
		const bytes = crypto.getRandomValues(new Uint8Array(16))
		guid = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
			.join('')
			.slice(0, 22)
	} while (existingGuids.has(guid))
	return guid
}

function collectGuids(inventory: Record<string, unknown>): Set<string> {
	return new Set(
		Object.values(inventory)
			.filter(
				(value): value is Record<string, unknown> =>
					typeof value === 'object' && value !== null && !Array.isArray(value),
			)
			.map((item) => item.GUID)
			.filter((guid): guid is string => typeof guid === 'string'),
	)
}

/**
 * Durability a freshly spawned item starts with. Non-durable items (and
 * unknown items) return `undefined` so the field stays absent.
 */
function getItemDefaultDurability(itemId: string): number | undefined {
	const durability = getItemData(itemId)?.durability
	return typeof durability === 'number' && durability > 0 ? durability : undefined
}

export function addPersonalChestItem(save: SaveData, itemId: string): SaveData {
	const currentProgress = save.GameProgress
	const progress =
		currentProgress &&
		typeof currentProgress === 'object' &&
		!Array.isArray(currentProgress)
			? (currentProgress as Record<string, unknown>)
			: {}
	const currentInventory = progress.PersonalInventory
	const personalInventory =
		currentInventory &&
		typeof currentInventory === 'object' &&
		!Array.isArray(currentInventory)
			? (currentInventory as Record<string, unknown>)
			: {}
	const occupiedSlots = new Set(
		Object.keys(personalInventory)
			.map(Number)
			.filter((slot) => Number.isSafeInteger(slot) && slot >= 0),
	)
	const highestOccupiedSlot = Math.max(-1, ...occupiedSlots)
	let nextSlot = 0
	while (occupiedSlots.has(nextSlot)) nextSlot += 1
	// A full chest must not grow past its capacity.
	if (nextSlot >= PERSONAL_CHEST_SLOT_COUNT) return save

	const guid = createItemGuid(collectGuids(personalInventory))
	const durability = getItemDefaultDurability(itemId)

	return {
		...save,
		GameProgress: {
			...progress,
			PersonalInventory: {
				...personalInventory,
				[String(nextSlot)]: {
					GUID: guid,
					ItemData: itemId,
					Count: 1,
					...(durability !== undefined ? { Durability: durability } : {}),
				},
				MaxSlotIndex: Math.max(
					typeof personalInventory.MaxSlotIndex === 'number'
						? personalInventory.MaxSlotIndex
						: -1,
					highestOccupiedSlot,
					nextSlot,
				),
			},
		},
	}
}

export function addPlayerInventoryItem(
	save: SaveData,
	itemId: string,
	category: InventoryCategory,
): SaveData {
	const slotRange = getInventoryCategorySlotRange(category)
	if (!slotRange) return save

	const currentProgress = save.GameProgress
	const progress =
		currentProgress &&
		typeof currentProgress === 'object' &&
		!Array.isArray(currentProgress)
			? (currentProgress as Record<string, unknown>)
			: {}
	const currentInventory = progress.Inventory
	const inventory =
		currentInventory &&
		typeof currentInventory === 'object' &&
		!Array.isArray(currentInventory)
			? (currentInventory as Record<string, unknown>)
			: {}

	let nextSlot = -1
	for (let slot = slotRange[0]; slot < slotRange[1]; slot += 1) {
		if (!isInventoryItem(inventory[String(slot)])) {
			nextSlot = slot
			break
		}
	}
	if (nextSlot === -1) return save

	const guid = createItemGuid(collectGuids(inventory))
	const durability = getItemDefaultDurability(itemId)

	return {
		...save,
		GameProgress: {
			...progress,
			Inventory: {
				...inventory,
				[String(nextSlot)]: {
					GUID: guid,
					ItemData: itemId,
					Count: 1,
					...(durability !== undefined ? { Durability: durability } : {}),
				},
				MaxSlotIndex: Math.max(
					typeof inventory.MaxSlotIndex === 'number'
						? inventory.MaxSlotIndex
						: -1,
					nextSlot,
				),
			},
		},
	}
}
