import type { SaveData } from '../../../../shared/save'

export interface PersonalChestItem extends Record<string, unknown> {
	ItemData: string
	Count?: number
	Durability?: number
}

export type PersonalChestEntry = [slot: string, item: PersonalChestItem]
export type EditableItemField = 'Count' | 'Durability'

export type { SaveData }
