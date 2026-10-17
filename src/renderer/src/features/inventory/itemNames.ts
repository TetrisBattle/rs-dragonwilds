import { itemCatalog } from './itemCatalog'
import type { PersonalChestItem } from './types'

const itemNames = new Map(itemCatalog.map(([id, name]) => [id, name] as const))
const itemMaxStacks = new Map(
	itemCatalog.map(([id, , maxStack]) => [id, maxStack] as const),
)
const knownItems = itemCatalog
	.map(([id, name]) => ({ id, name }))
	.sort((left, right) => left.name.localeCompare(right.name))

export function getKnownItems(): Array<{ id: string; name: string }> {
	return knownItems
}

export function getItemName(itemId: string): string | undefined {
	return itemNames.get(itemId)
}

export function getItemMaxStack(
	itemId: string,
	item: Pick<PersonalChestItem, 'Count'>,
): number | null {
	if (item.Count === undefined) return 1
	return itemMaxStacks.get(itemId) ?? null
}
