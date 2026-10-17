import ascensionCore4Icon from './assets/ascension-cores/ascension-core-4.png'
import ascensionCore5Icon from './assets/ascension-cores/ascension-core-5.webp'
import ascensionCore6Icon from './assets/ascension-cores/ascension-core-6.webp'
import ascensionCore7Icon from './assets/ascension-cores/ascension-core-7.png'
import ascensionCore8Icon from './assets/ascension-cores/ascension-core-8.webp'
import ferociousInfusionIcon from './assets/drinks/ferocious-infusion.webp'
import monkfishSkewersIcon from './assets/food/monkfish-skewers.webp'
import enchantedRuneBoltIcon from './assets/gear/arrows/enchanted-rune-bolt.png'
import dragonfireShieldIcon from './assets/gear/dragonfire-shield.png'
import dragonkinMageHoodIcon from './assets/gear/dragonkin-mage-hood.png'
import fabricThatHumsWithYouIcon from './assets/resources/fabric-that-hums-with-you.png'
import stoneIcon from './assets/resources/stone.webp'
import airRuneIcon from './assets/runes/air-rune.webp'
import astralRuneIcon from './assets/runes/astral-rune.webp'
import earthRuneIcon from './assets/runes/earth-rune.webp'
import fireRuneIcon from './assets/runes/fire-rune.webp'
import lawRuneIcon from './assets/runes/law-rune.webp'
import natureRuneIcon from './assets/runes/nature-rune.webp'
import runeEssenceIcon from './assets/runes/rune-essence.webp'
import waterRuneIcon from './assets/runes/water-rune.webp'
import vaultCoreIcon from './assets/vault/vault-core.webp'
import vaultShardIcon from './assets/vault/vault-shard.webp'
import { getItemName } from './itemNames'

const itemIcons: Record<string, string> = {
	'52QCB0uSNJD0UoC21lRJvA': vaultCoreIcon,
	nU6Fg0T66QR19Q66XKbv8Q: ascensionCore4Icon,
	b1LuN0tOkAVnfz2UuoqgSQ: ascensionCore5Icon,
	h3u7Rk41zjjzfq6u0_n7Ug: ascensionCore6Icon,
	wg4KnETWmNL1cbO6KKgs7A: ascensionCore7Icon,
	o6DnPkaZXSenA3eEK7bxgw: ascensionCore8Icon,
	qOY004ZJaEaR8DmcDqB2KA: runeEssenceIcon,
	_R44FI_bhEm8Gx61swlzpA: stoneIcon,
	De872kEe6CpKWdafSj_p0w: monkfishSkewersIcon,
	'_-zeJ0RSQCE_woyqHO_XBg': ferociousInfusionIcon,
}

const itemIconsByName: Record<string, string> = {
	'Air Rune': airRuneIcon,
	'Astral Rune': astralRuneIcon,
	'Earth Rune': earthRuneIcon,
	'Fire Rune': fireRuneIcon,
	'Law Rune': lawRuneIcon,
	'Nature Rune': natureRuneIcon,
	'Water Rune': waterRuneIcon,
	'Vault Shard': vaultShardIcon,
	'Dragonfire Shield': dragonfireShieldIcon,
	'Dragonkin Mage Hood': dragonkinMageHoodIcon,
	'Enchanted Rune Bolt': enchantedRuneBoltIcon,
	'Fabric That Hums With You': fabricThatHumsWithYouIcon,
}

export function getItemIcon(itemId: string): string | undefined {
	return itemIcons[itemId] ?? itemIconsByName[getItemName(itemId) ?? '']
}
