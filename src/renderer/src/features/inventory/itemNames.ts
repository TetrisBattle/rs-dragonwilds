const itemNames: Record<string, string> = {
	'52QCB0uSNJD0UoC21lRJvA': 'Vault Core',
	nU6Fg0T66QR19Q66XKbv8Q: 'Ascension Core 4',
	b1LuN0tOkAVnfz2UuoqgSQ: 'Ascension Core 5',
	h3u7Rk41zjjzfq6u0_n7Ug: 'Ascension Core 6',
	wg4KnETWmNL1cbO6KKgs7A: 'Ascension Core 7',
	o6DnPkaZXSenA3eEK7bxgw: 'Ascension Core 8',
	qOY004ZJaEaR8DmcDqB2KA: 'Rune Essence',
	_R44FI_bhEm8Gx61swlzpA: 'Stone',
	De872kEe6CpKWdafSj_p0w: 'Monkfish Skewers',
	'_-zeJ0RSQCE_woyqHO_XBg': 'Cooling Ferocious Infusion',
}

export function getKnownItems(): Array<{ id: string; name: string }> {
	return Object.entries(itemNames)
		.map(([id, name]) => ({ id, name }))
		.sort((left, right) => left.name.localeCompare(right.name))
}

export function getItemName(itemId: string): string | undefined {
	return itemNames[itemId]
}
