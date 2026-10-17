import type { SaveData } from '../../../../shared/save'

export interface InventoryItem extends Record<string, unknown> {
	ItemData: string
	Count?: number
	Durability?: number
}

export type InventoryEntry = [slot: string, item: InventoryItem]
export type PersonalChestItem = InventoryItem
export type PersonalChestEntry = InventoryEntry
export type EditableItemField = 'Count' | 'Durability'
export type InventoryView = 'personal-chest' | 'inventory'

export type { SaveData }
