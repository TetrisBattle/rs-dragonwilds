import type {
	EditableItemField,
	PersonalChestEntry,
	PersonalChestItem,
	SaveData,
} from './types'

export function isPersonalChestItem(
	value: unknown,
): value is PersonalChestItem {
	return (
		typeof value === 'object' &&
		value !== null &&
		'ItemData' in value &&
		typeof value.ItemData === 'string'
	)
}

export function getPersonalChest(
	save: SaveData | null,
): Record<string, unknown> {
	const progress = save?.GameProgress
	if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
		return {}
	}

	const personalInventory = (progress as Record<string, unknown>)
		.PersonalInventory
	return personalInventory &&
		typeof personalInventory === 'object' &&
		!Array.isArray(personalInventory)
		? (personalInventory as Record<string, unknown>)
		: {}
}

export function getPersonalChestEntries(
	personalInventory: Record<string, unknown>,
): PersonalChestEntry[] {
	return Object.entries(personalInventory)
		.filter((entry): entry is PersonalChestEntry =>
			isPersonalChestItem(entry[1]),
		)
		.sort(([left], [right]) => Number(left) - Number(right))
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
	if (
		!personalInventory ||
		typeof personalInventory !== 'object' ||
		Array.isArray(personalInventory)
	) {
		return { save, changed: false }
	}

	const inventory = personalInventory as Record<string, unknown>
	let changed = false
	const updatedInventory = Object.fromEntries(
		Object.entries(inventory).map(([slot, value]) => {
			if (!isPersonalChestItem(value)) return [slot, value]

			if (typeof value.Count === 'number') return [slot, value]

			changed = true
			return [slot, { ...value, Count: 1 }]
		}),
	)

	if (!changed) return { save, changed }

	return {
		save: {
			...save,
			GameProgress: {
				...gameProgress,
				PersonalInventory: updatedInventory,
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
	const progress = save.GameProgress as Record<string, unknown>
	const personalInventory = progress.PersonalInventory as Record<
		string,
		unknown
	>
	const item = personalInventory[slot] as PersonalChestItem
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
			PersonalInventory: {
				...personalInventory,
				[slot]: updatedItem,
			},
		},
	}
}

export function updatePersonalChestItemData(
	save: SaveData,
	slot: string,
	itemId: string,
): SaveData {
	const progress = save.GameProgress as Record<string, unknown>
	const personalInventory = progress.PersonalInventory as Record<
		string,
		unknown
	>
	const item = personalInventory[slot] as PersonalChestItem

	return {
		...save,
		GameProgress: {
			...progress,
			PersonalInventory: {
				...personalInventory,
				[slot]: { ...item, ItemData: itemId },
			},
		},
	}
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

	const existingGuids = new Set(
		Object.values(personalInventory)
			.filter(
				(value): value is Record<string, unknown> =>
					typeof value === 'object' && value !== null && !Array.isArray(value),
			)
			.map((item) => item.GUID)
			.filter((guid): guid is string => typeof guid === 'string'),
	)
	let guid: string
	do {
		const bytes = crypto.getRandomValues(new Uint8Array(16))
		guid = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
			.join('')
			.slice(0, 22)
	} while (existingGuids.has(guid))

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
