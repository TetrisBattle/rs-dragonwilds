import { type ItemData, itemData } from './itemData.generated'

export type { ItemCategorySource } from './itemData.generated'
export type { ItemData }

// Preferred display/sort order for the canonical categories produced by
// scripts/import-item-data.mjs. Categories are grouped by role: weapons,
// armour, consumables, tools, materials, then misc.
export const ITEM_CATEGORY_ORDER: readonly string[] = [
	'Melee Weapon',
	'Ranged Weapon',
	'Magic Weapon',
	'Ammo',
	'Rune',
	'Melee Armour',
	'Ranged Armour',
	'Mage Armour',
	'Armour',
	'Shield',
	'Cape',
	'Ring',
	'Amulet',
	'Trinket',
	'Food',
	'Potion',
	'Drink',
	'Consumable',
	'Tool',
	'Seed',
	'Resource',
	'Basic Material',
	'Processed Material',
	'Raw Ingredient',
	'Special Material',
	'Component',
	'Bar',
	'Ore',
	'Herb',
	'Building Material',
	'Quest Item',
	'Tome',
	'Container',
	'Boss Soul',
	'Fuel',
	'Basic Item',
]

const categoryRanks = new Map(
	ITEM_CATEGORY_ORDER.map((category, index) => [category, index] as const),
)

export function getItemData(itemId: string): ItemData | undefined {
	return Object.hasOwn(itemData, itemId) ? itemData[itemId] : undefined
}

export function getItemCategory(itemId: string): string | undefined {
	return getItemData(itemId)?.category
}

export function compareItemCategories(
	left: string | undefined,
	right: string | undefined,
): number {
	const leftRank = left
		? (categoryRanks.get(left) ?? Number.MAX_SAFE_INTEGER)
		: Number.MAX_SAFE_INTEGER
	const rightRank = right
		? (categoryRanks.get(right) ?? Number.MAX_SAFE_INTEGER)
		: Number.MAX_SAFE_INTEGER
	if (leftRank !== rightRank) return leftRank - rightRank
	return (left ?? '').localeCompare(right ?? '')
}
