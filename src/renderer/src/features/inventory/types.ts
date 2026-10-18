import type { SaveData } from '../../../../shared/save'

export interface InventoryItem extends Record<string, unknown> {
	ItemData: string
	Count?: number
	Durability?: number
	NumUpgradesApplied?: number
}

export type InventoryEntry = [slot: string, item: InventoryItem]
export type PersonalChestItem = InventoryItem
export type PersonalChestEntry = InventoryEntry
export type EditableItemField = 'Count' | 'Durability' | 'NumUpgradesApplied'
export type InventoryView = 'inventory' | 'personal-chest' | 'ui'
export type InventoryCategory =
	| 'quick-access'
	| 'items'
	| 'runes'
	| 'arrows'
	| 'quest-items'
	| 'loadout'

export type { SaveData }
