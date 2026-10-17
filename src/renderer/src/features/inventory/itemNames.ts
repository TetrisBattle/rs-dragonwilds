import { itemCatalog } from './itemCatalog'

const itemNames = new Map(itemCatalog)
const knownItems = itemCatalog
	.map(([id, name]) => ({ id, name }))
	.sort((left, right) => left.name.localeCompare(right.name))

export function getKnownItems(): Array<{ id: string; name: string }> {
	return knownItems
}

export function getItemName(itemId: string): string | undefined {
	return itemNames.get(itemId)
}
