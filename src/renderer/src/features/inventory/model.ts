import type {
	EditableItemField,
	PersonalChestEntry,
	PersonalChestItem,
	SaveData,
} from './types'

export const PERSONAL_CHEST_SLOT_COUNT = 20

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

export function removePersonalChestItem(
	save: SaveData,
	slot: string,
): SaveData {
	const progress = save.GameProgress as Record<string, unknown>
	const personalInventory = progress.PersonalInventory as Record<
		string,
		unknown
	>
	const updatedInventory = { ...personalInventory }
	delete updatedInventory[slot]
	const highestOccupiedSlot = Math.max(
		-1,
		...Object.keys(updatedInventory)
			.map(Number)
			.filter((index) => Number.isSafeInteger(index) && index >= 0),
	)
	updatedInventory.MaxSlotIndex = highestOccupiedSlot

	return {
		...save,
		GameProgress: {
			...progress,
			PersonalInventory: updatedInventory,
		},
	}
}

export function movePersonalChestItem(
	save: SaveData,
	fromSlot: string,
	toSlot: string,
	position: 'before' | 'after' = 'before',
): SaveData {
	const sourceIndex = Number(fromSlot)
	const targetIndex = Number(toSlot) + (position === 'after' ? 1 : 0)
	if (
		!Number.isSafeInteger(sourceIndex) ||
		!Number.isSafeInteger(targetIndex) ||
		sourceIndex < 0 ||
		targetIndex < 0 ||
		sourceIndex === targetIndex
	) {
		return save
	}

	const progress = save.GameProgress as Record<string, unknown>
	const personalInventory = progress.PersonalInventory as Record<
		string,
		unknown
	>
	if (!isPersonalChestItem(personalInventory[String(sourceIndex)])) return save

	const highestSlot = Math.max(
		sourceIndex,
		targetIndex,
		...Object.keys(personalInventory)
			.map(Number)
			.filter((index) => Number.isSafeInteger(index) && index >= 0),
	)
	const slots = Array.from(
		{ length: highestSlot + 1 },
		(_, index) => personalInventory[String(index)],
	)
	const [movedItem] = slots.splice(sourceIndex, 1)
	slots.splice(
		targetIndex > sourceIndex ? targetIndex - 1 : targetIndex,
		0,
		movedItem,
	)

	const updatedInventory = { ...personalInventory }
	for (const key of Object.keys(updatedInventory)) {
		const index = Number(key)
		if (Number.isSafeInteger(index) && index >= 0) {
			delete updatedInventory[key]
		}
	}

	slots.forEach((item, index) => {
		if (item !== undefined) updatedInventory[String(index)] = item
	})
	updatedInventory.MaxSlotIndex = Math.max(
		-1,
		...slots
			.map((item, index) => (isPersonalChestItem(item) ? index : -1))
			.filter((index) => index >= 0),
	)

	return {
		...save,
		GameProgress: {
			...progress,
			PersonalInventory: updatedInventory,
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
