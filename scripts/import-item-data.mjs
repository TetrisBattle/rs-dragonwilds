import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// import-item-data.mjs
//
// One-shot, re-runnable importer that builds the inventory item dataset from:
//   1. wiki   - dragonwilds.runescape.wiki item pages (authoritative category)
//   2. gaming - xgamingserver.com/tools/dragonwilds/items.json (stats)
//   3. game   - Elleandria/RS-Dragonwilds-Editor data/ItemID.json (GUIDs)
// and reorganizes assets/wiki/<slug>.<ext> into assets/wiki/<category>/<slug>.<ext>.
//
// Usage:
//   node scripts/import-item-data.mjs              # everything
//   node scripts/import-item-data.mjs --data-only  # skip asset download/moves
// ---------------------------------------------------------------------------

const projectRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)
const inventoryRoot = path.join(
	projectRoot,
	'src',
	'renderer',
	'src',
	'features',
	'inventory',
)
const assetsRoot = path.join(inventoryRoot, 'assets')
const wikiAssetsRoot = path.join(assetsRoot, 'wiki')
const catalogPath = path.join(inventoryRoot, 'itemCatalog.ts')
const wikiDataPath = path.join(inventoryRoot, 'wiki-item-data.json')
const itemDataPath = path.join(inventoryRoot, 'itemData.generated.ts')
const iconMapPath = path.join(inventoryRoot, 'wikiItemIcons.generated.ts')
const imageSourcesPath = path.join(
	inventoryRoot,
	'wiki-item-image-sources.json',
)
const cacheDir = path.join(projectRoot, '.cache', 'item-data')

const wikiOrigin = 'https://dragonwilds.runescape.wiki'
const apiEndpoint = `${wikiOrigin}/api.php`
const userAgent =
	'rs-dragonwilds-item-importer/2.0 (local data + asset bundler)'
const gamingUrl = 'https://xgamingserver.com/tools/dragonwilds/items.json'
const gameUrl =
	'https://raw.githubusercontent.com/Elleandria/RS-Dragonwilds-Editor/main/data/ItemID.json'

const dataOnly = process.argv.includes('--data-only')
const acceptedExtensions = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif'])
const titleBatchSize = 50
const downloadConcurrency = 4
const retryCount = 3

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (v) => createHash('sha256').update(v).digest('hex').toLowerCase()
const stripBom = (s) => s.replace(/^\uFEFF/, '')
const norm = (s) =>
	(s ?? '').replaceAll('_', ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
const slugify = (value) => {
	const slug = value
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
	return slug || 'item'
}
const kebab = slugify

// Normalise the three source vocabularies (wiki item_type, xg category,
// game Category) into one canonical set. The raw values are always preserved
// on each record; this only drives grouping and the asset folder layout.
const CATEGORY_ALIASES = new Map(
	Object.entries({
		// weapons
		'melee weapon': 'Melee Weapon',
		'melee weapons': 'Melee Weapon',
		'ranged weapon': 'Ranged Weapon',
		'ranged weapons': 'Ranged Weapon',
		bows: 'Ranged Weapon',
		crossbows: 'Ranged Weapon',
		'magic weapon': 'Magic Weapon',
		'magic weapons': 'Magic Weapon',
		staves: 'Magic Weapon',
		staff: 'Magic Weapon',
		// ammunition
		ammo: 'Ammo',
		arrow: 'Ammo',
		arrows: 'Ammo',
		bolt: 'Ammo',
		bolts: 'Ammo',
		rune: 'Rune',
		runes: 'Rune',
		runecrafting: 'Rune',
		// armour & jewellery
		'melee armour': 'Melee Armour',
		'mage armour': 'Mage Armour',
		'magic armour': 'Mage Armour',
		'ranged armour': 'Ranged Armour',
		armour: 'Armour',
		helms: 'Armour',
		helm: 'Armour',
		chestplates: 'Armour',
		leggings: 'Armour',
		shield: 'Shield',
		shields: 'Shield',
		cape: 'Cape',
		capes: 'Cape',
		ring: 'Ring',
		rings: 'Ring',
		amulet: 'Amulet',
		amulets: 'Amulet',
		trinket: 'Trinket',
		trinkets: 'Trinket',
		// consumables
		food: 'Food',
		potion: 'Potion',
		potions: 'Potion',
		drink: 'Drink',
		consumable: 'Consumable',
		consumables: 'Consumable',
		// materials
		resource: 'Resource',
		resources: 'Resource',
		'resources & misc': 'Resource',
		'basic item': 'Basic Item',
		'basic material': 'Basic Material',
		'processed material': 'Processed Material',
		'raw ingredient': 'Raw Ingredient',
		'special material': 'Special Material',
		component: 'Component',
		components: 'Component',
		'building resources': 'Building Material',
		bars: 'Bar',
		ores: 'Ore',
		herbs: 'Herb',
		seed: 'Seed',
		seeds: 'Seed',
		farming: 'Seed',
		woodcutting: 'Resource',
		// misc
		tool: 'Tool',
		tools: 'Tool',
		'quest item': 'Quest Item',
		'quest items': 'Quest Item',
		tome: 'Tome',
		tombs: 'Tome',
		'tomes & journals': 'Tome',
		container: 'Container',
		containers: 'Container',
		'boss souls': 'Boss Soul',
		fuel: 'Fuel',
		trees: 'Resource',
		test: 'Basic Item',
	}),
)

function canonicalCategory(raw) {
	if (!raw) return undefined
	return CATEGORY_ALIASES.get(norm(raw)) ?? raw.trim()
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchJson(url) {
	for (let attempt = 0; attempt <= retryCount; attempt += 1) {
		try {
			const response = await fetch(url, {
				headers: { 'user-agent': userAgent },
			})
			if (response.ok) return response.json()
			if (
				attempt === retryCount ||
				(response.status < 500 && response.status !== 429)
			) {
				throw new Error(`Request failed (${response.status}): ${url}`)
			}
		} catch (error) {
			if (attempt === retryCount) throw error
		}
		await delay(1000 * 2 ** attempt)
	}
}

async function fetchCached(url, cacheName) {
	const cachePath = path.join(cacheDir, cacheName)
	try {
		return JSON.parse(stripBom(await readFile(cachePath, 'utf8')))
	} catch (error) {
		if (error.code !== 'ENOENT') throw error
	}
	const data = await fetchJson(url)
	await mkdir(cacheDir, { recursive: true })
	await writeFile(cachePath, JSON.stringify(data), 'utf8')
	return data
}

async function fetchImageBytes(imageUrl) {
	for (let attempt = 0; attempt <= retryCount; attempt += 1) {
		const response = await fetch(imageUrl, {
			headers: { 'user-agent': userAgent },
		})
		if (response.ok) return Buffer.from(await response.arrayBuffer())
		if (
			attempt === retryCount ||
			(response.status < 500 && response.status !== 429)
		) {
			throw new Error(`Image download failed (${response.status}): ${imageUrl}`)
		}
		await delay(1000 * 2 ** attempt)
	}
}

async function runWithConcurrency(items, concurrency, worker) {
	let nextIndex = 0
	const workers = Array.from(
		{ length: Math.min(concurrency, items.length) },
		async () => {
			while (nextIndex < items.length) {
				const index = nextIndex
				nextIndex += 1
				await worker(items[index], index)
			}
		},
	)
	await Promise.all(workers)
}

// ---------------------------------------------------------------------------
// Wikitext parsing
// ---------------------------------------------------------------------------

// Extract every top-level {{Template ...}} block with a brace-aware scanner.
function extractTemplates(text) {
	const templates = []
	let i = 0
	while (i < text.length) {
		const start = text.indexOf('{{', i)
		if (start === -1) break
		let depth = 0
		let j = start
		for (; j < text.length; j += 1) {
			if (text.startsWith('{{', j)) {
				depth += 1
				j += 1
			} else if (text.startsWith('}}', j)) {
				depth -= 1
				j += 1
				if (depth === 0) break
			}
		}
		const raw = text.slice(start, j + 1)
		templates.push(raw)
		i = j + 1
	}
	return templates
}

// Split a template body on top-level | while respecting nested {{ }} and [[ ]].
function splitTopLevel(body) {
	const parts = []
	let depth = 0
	let current = ''
	for (let i = 0; i < body.length; i += 1) {
		const two = body.slice(i, i + 2)
		if (two === '{{' || two === '[[') {
			depth += 1
			current += two
			i += 1
		} else if (two === '}}' || two === ']]') {
			depth -= 1
			current += two
			i += 1
		} else if (body[i] === '|' && depth === 0) {
			parts.push(current)
			current = ''
		} else {
			current += body[i]
		}
	}
	parts.push(current)
	return parts
}

function parseTemplate(raw) {
	const inner = raw.slice(2, -2)
	const parts = splitTopLevel(inner)
	const name = parts.shift().trim()
	const params = {}
	for (const part of parts) {
		const eq = part.indexOf('=')
		if (eq === -1) continue
		const key = part.slice(0, eq).trim().toLowerCase()
		const value = part.slice(eq + 1).trim()
		if (key && value !== '') params[key] = value
	}
	return { name, params }
}

function cleanWikitext(value) {
	if (value == null) return undefined
	return value
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, '$2')
		.replace(/\[\[([^\]]*)\]\]/g, '$1')
		.replace(/'''?/g, '')
		.replace(/<[^>]+>/g, '')
		.trim()
}

function findTemplate(parsed, name) {
	return parsed.find(
		(t) => t.name.toLowerCase().replace(/\s+/g, ' ') === name.toLowerCase(),
	)
}

function pickNumber(params, ...keys) {
	for (const key of keys) {
		const value = params[key]
		if (value == null) continue
		const match = String(value).match(/-?\d+(\.\d+)?/)
		if (match) return Number(match[0])
	}
	return undefined
}

function toNumber(value) {
	if (value == null) return undefined
	if (typeof value === 'number')
		return Number.isFinite(value) ? value : undefined
	const match = String(value).match(/-?\d+(\.\d+)?/)
	return match ? Number(match[0]) : undefined
}

// Parse a single item page's wikitext into a structured record.
function parseItemPage(pageTitle, wikitext) {
	const parsed = extractTemplates(wikitext).map(parseTemplate)
	const item = findTemplate(parsed, 'Infobox Item')
	if (!item) return null

	const weapon = findTemplate(parsed, 'Infobox Weapon')
	const armour = findTemplate(parsed, 'Infobox Armour')
	const trinket = findTemplate(parsed, 'Infobox Trinket')
	const tool = findTemplate(parsed, 'Infobox Tool')
	const perk = findTemplate(parsed, 'Infobox Bonus Perk')

	const categories = [...wikitext.matchAll(/\[\[Category:([^|\]]+)/gi)].map(
		(m) => m[1].trim(),
	)

	const extract = (t) =>
		t ? Object.fromEntries(Object.entries(t.params)) : undefined

	return {
		pageTitle,
		name: cleanWikitext(item.params.name) ?? pageTitle,
		itemType: cleanWikitext(item.params.item_type),
		image: item.params.image,
		release: cleanWikitext(item.params.release),
		update: cleanWikitext(item.params.update),
		description: cleanWikitext(item.params.description),
		health: pickNumber(item.params, 'health'),
		hydration: pickNumber(item.params, 'hydration'),
		sustenance: pickNumber(item.params, 'sustenance'),
		duration: cleanWikitext(item.params.duration),
		repairCost: cleanWikitext(item.params.repaircost),
		weight: pickNumber(item.params, 'weight'),
		stackLimit: pickNumber(item.params, 'stacklimit'),
		compostValue: pickNumber(item.params, 'compostvalue'),
		categories,
		// raw typed blocks, kept verbatim so nothing is lost
		item: extract(item),
		weapon: extract(weapon),
		armour: extract(armour),
		trinket: extract(trinket),
		tool: extract(tool),
		perk: extract(perk),
	}
}

// ---------------------------------------------------------------------------
// Wiki fetching
// ---------------------------------------------------------------------------

async function getAllItemTitles() {
	const titles = []
	let cmcontinue
	do {
		const url = new URL(apiEndpoint)
		url.search = new URLSearchParams({
			action: 'query',
			list: 'categorymembers',
			cmtitle: 'Category:Items',
			cmtype: 'page',
			cmlimit: '500',
			format: 'json',
			formatversion: '2',
			...(cmcontinue ? { cmcontinue } : {}),
		}).toString()
		const data = await fetchJson(url)
		titles.push(...(data.query?.categorymembers ?? []).map((m) => m.title))
		cmcontinue = data.continue?.cmcontinue
	} while (cmcontinue)
	return titles
}

async function fetchWikitext(titles) {
	const results = new Map()
	for (let offset = 0; offset < titles.length; offset += titleBatchSize) {
		const batch = titles.slice(offset, offset + titleBatchSize)
		const url = new URL(apiEndpoint)
		url.search = new URLSearchParams({
			action: 'query',
			prop: 'revisions',
			rvprop: 'content',
			rvslots: 'main',
			redirects: '1',
			titles: batch.join('|'),
			format: 'json',
			formatversion: '2',
		}).toString()
		const data = await fetchJson(url)
		for (const page of data.query?.pages ?? []) {
			const content = page.revisions?.[0]?.slots?.main?.content
			if (content) results.set(page.title, content)
		}
		if (offset % 500 === 0)
			console.log(`  fetched wikitext ${offset}/${titles.length}`)
		await delay(150)
	}
	return results
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

async function loadCatalog() {
	const source = await readFile(catalogPath, 'utf8')
	const records = []
	const entryPattern =
		/^\s*\[\s*(['"])([^'"]+)\1\s*,\s*(['"])(.*?)\3\s*,\s*(\d+|null)\s*\]\s*,?\s*$/gm
	for (const match of source.matchAll(entryPattern)) {
		records.push({
			id: match[2],
			name: match[4],
			maxStack: match[5] === 'null' ? undefined : Number(match[5]),
		})
	}
	if (records.length === 0)
		throw new Error(`No item records found in ${catalogPath}`)
	return records
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const categorySlugSynonyms = new Map([
	['capes', 'cape'],
	['melee-weapons', 'melee-weapon'],
	['ranged-weapons', 'ranged-weapon'],
	['magic-weapons', 'magic-weapon'],
	['resources-misc', 'resources-misc'],
])

function categoryToSlug(category) {
	if (!category) return 'uncategorised'
	const slug = kebab(category)
	return categorySlugSynonyms.get(slug) ?? slug
}

async function main() {
	console.log('Loading catalog…')
	const catalog = await loadCatalog()

	console.log('Fetching external sources…')
	const gameData = await fetchCached(gameUrl, 'elleandria-itemid.json')
	const gamingData = await fetchCached(gamingUrl, 'xgamingserver-items.json')

	const gameById = new Map(gameData.map((e) => [e.PersistenceID, e]))
	const gamingByName = new Map()
	for (const entry of gamingData)
		if (!gamingByName.has(norm(entry.name)))
			gamingByName.set(norm(entry.name), entry)

	console.log('Fetching wiki item pages…')
	const titles = await getAllItemTitles()
	console.log(`  ${titles.length} item pages in Category:Items`)
	const wikitextByTitle = await fetchWikitext(titles)

	const wikiRecords = []
	for (const [title, wikitext] of wikitextByTitle) {
		const record = parseItemPage(title, wikitext)
		if (record) wikiRecords.push(record)
	}
	console.log(`  parsed ${wikiRecords.length} item pages`)

	const wikiByName = new Map()
	for (const record of wikiRecords)
		if (!wikiByName.has(norm(record.name)))
			wikiByName.set(norm(record.name), record)

	// ---- merge into the app dataset, keyed by catalog GUID ----
	const merged = {}
	const categoryCounts = new Map()
	for (const { id, name, maxStack } of catalog) {
		const wiki = wikiByName.get(norm(name))
		const gaming = gamingByName.get(norm(name))
		const game = gameById.get(id)

		const rawCategory =
			wiki?.itemType ?? gaming?.category ?? game?.Category ?? undefined
		const categorySource = wiki?.itemType
			? 'wiki'
			: gaming?.category
				? 'gaming'
				: game?.Category
					? 'game'
					: 'unknown'
		const category = canonicalCategory(rawCategory)

		const weaponPower = wiki?.weapon?.power
		const armourPower = wiki?.armour?.power

		const record = {
			id,
			name,
			category,
			categorySource,
			wikiType: wiki?.itemType,
			gamingCategory: gaming?.category,
			gameCategory: game?.Category,
			description: wiki?.description ?? gaming?.description,
			weight: game?.Weight ?? wiki?.weight ?? gaming?.weight ?? undefined,
			maxStack: maxStack ?? gaming?.maxStack ?? game?.MaxStackSize ?? undefined,
			powerLevel:
				pickNumber({ p: weaponPower ?? armourPower ?? '' }, 'p') ??
				gaming?.powerLevel ??
				undefined,
			tier: gaming?.tier ?? undefined,
			skill: gaming?.skill ?? undefined,
			damageType: wiki?.weapon?.damagetype ?? gaming?.damageType ?? undefined,
			isWeapon: gaming?.isWeapon ?? (wiki?.weapon ? true : undefined),
			armorWeight: gaming?.armorWeight ?? undefined,
			relDamage: gaming?.relDamage ?? undefined,
			durability: toNumber(
				game?.BaseDurability ??
					wiki?.weapon?.durability ??
					wiki?.armour?.durability ??
					wiki?.trinket?.durability ??
					gaming?.durability,
			),
			vitalShield: game?.VitalShield ?? undefined,
			health: wiki?.health,
			hydration: wiki?.hydration,
			sustenance: wiki?.sustenance,
			duration: wiki?.duration,
			repairCost: wiki?.repairCost,
			compostValue: wiki?.compostValue,
			wikiPage: wiki?.pageTitle,
			wikiUrl: wiki
				? `${wikiOrigin}/wiki/${encodeURIComponent((wiki.pageTitle ?? name).replaceAll(' ', '_'))}`
				: undefined,
			gameIcon: game?.IconFile,
		}
		// strip undefined to keep the generated file compact
		for (const key of Object.keys(record))
			if (record[key] === undefined) delete record[key]

		merged[id] = record
		const key = category ?? '(none)'
		categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1)
	}

	// ---- write raw wiki data (the "never scrape again" artifact) ----
	wikiRecords.sort((a, b) => a.pageTitle.localeCompare(b.pageTitle))
	await writeFile(
		wikiDataPath,
		`${JSON.stringify(
			{
				generatedBy: 'scripts/import-item-data.mjs',
				wikiOrigin,
				itemCount: wikiRecords.length,
				items: wikiRecords,
			},
			null,
			2,
		)}\n`,
		'utf8',
	)
	console.log(`Wrote ${path.relative(projectRoot, wikiDataPath)}`)

	// ---- write merged dataset consumed by the app ----
	const ordered = Object.values(merged).sort(
		(a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
	)
	const lines = [
		'// Generated by scripts/import-item-data.mjs; do not edit manually.',
		'// Sources: dragonwilds.runescape.wiki (category), xgamingserver.com (stats),',
		'// Elleandria/RS-Dragonwilds-Editor (GUIDs, weight, durability, icon).',
		'',
		'export type ItemCategorySource = "wiki" | "gaming" | "game" | "unknown"',
		'',
		'export interface ItemData {',
		'  id: string',
		'  name: string',
		'  category?: string',
		'  categorySource: ItemCategorySource',
		'  description?: string',
		'  weight?: number',
		'  maxStack?: number',
		'  powerLevel?: number',
		'  tier?: number',
		'  skill?: string',
		'  damageType?: string',
		'  isWeapon?: boolean',
		'  armorWeight?: string',
		'  relDamage?: number',
		'  durability?: number',
		'  vitalShield?: number',
		'  health?: number',
		'  hydration?: number',
		'  sustenance?: number',
		'  duration?: string',
		'  repairCost?: string',
		'  compostValue?: number',
		'  wikiType?: string',
		'  gamingCategory?: string',
		'  gameCategory?: string',
		'  wikiPage?: string',
		'  wikiUrl?: string',
		'  gameIcon?: string',
		'}',
		'',
		'export const itemData: Readonly<Record<string, ItemData>> = {',
	]
	for (const record of ordered)
		lines.push(`\t${JSON.stringify(record.id)}: ${JSON.stringify(record)},`)
	lines.push('}', '')
	await writeFile(itemDataPath, lines.join('\n'), 'utf8')
	console.log(
		`Wrote ${path.relative(projectRoot, itemDataPath)} (${ordered.length} items)`,
	)

	console.log('\n=== category distribution (merged) ===')
	for (const [key, count] of [...categoryCounts.entries()].sort(
		(a, b) => b[1] - a[1],
	))
		console.log(`${String(count).padStart(5)}  ${key}`)

	if (dataOnly) {
		console.log('\n--data-only: skipping asset download/reorganisation.')
		return
	}

	await organizeAssets(merged)
}

// ---------------------------------------------------------------------------
// Assets: place images in assets/wiki/<category>/<slug>.<ext>
// ---------------------------------------------------------------------------

async function listFilesRecursively(dir) {
	let files = []
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name)
		if (entry.isDirectory()) files = files.concat(await listFilesRecursively(p))
		else if (entry.isFile()) files.push(p)
	}
	return files
}

async function fetchPageImages(titles) {
	const byTitle = new Map()
	for (let offset = 0; offset < titles.length; offset += titleBatchSize) {
		const batch = titles.slice(offset, offset + titleBatchSize)
		const url = new URL(apiEndpoint)
		url.search = new URLSearchParams({
			action: 'query',
			titles: batch.join('|'),
			prop: 'pageimages',
			piprop: 'original',
			redirects: '1',
			format: 'json',
			formatversion: '2',
		}).toString()
		const data = await fetchJson(url)
		for (const page of data.query?.pages ?? []) {
			if (page.missing || !page.original?.source) continue
			byTitle.set(page.title, {
				imageUrl: page.original.source,
				width: page.original.width,
				height: page.original.height,
			})
		}
		await delay(150)
	}
	return byTitle
}

async function organizeAssets(merged) {
	console.log('\nOrganising assets…')
	let existingSources = []
	try {
		const parsed = JSON.parse(
			stripBom(await readFile(imageSourcesPath, 'utf8')),
		)
		if (Array.isArray(parsed)) existingSources = parsed
	} catch (error) {
		if (error.code !== 'ENOENT') throw error
	}
	const oldById = new Map(existingSources.map((r) => [r.id, r]))
	const slugById = new Map(
		Object.entries(merged).map(([id, r]) => [id, categoryToSlug(r.category)]),
	)

	await mkdir(wikiAssetsRoot, { recursive: true })

	// current on-disk path per id (from existing provenance)
	const pathById = new Map()
	for (const record of existingSources) {
		if (!record.localFile || pathById.has(record.id)) continue
		pathById.set(record.id, path.resolve(projectRoot, record.localFile))
	}

	// 1. move flat images into their category folder
	const flatFiles = (await listFilesRecursively(wikiAssetsRoot)).filter(
		(file) => path.dirname(file) === wikiAssetsRoot,
	)
	const categoryByFile = new Map()
	for (const [id, file] of pathById)
		if (file && !categoryByFile.has(file))
			categoryByFile.set(file, slugById.get(id) ?? 'uncategorised')
	const relocate = new Map()
	let moved = 0
	for (const file of flatFiles) {
		const category = categoryByFile.get(file) ?? 'uncategorised'
		const target = path.join(wikiAssetsRoot, category, path.basename(file))
		if (target !== file) {
			await mkdir(path.dirname(target), { recursive: true })
			await rename(file, target)
			moved += 1
		}
		relocate.set(file, target)
		relocate.set(path.resolve(file), target)
	}
	console.log(`  moved ${moved} flat images into category folders`)

	// refresh pathById to the moved locations
	for (const [id, file] of [...pathById])
		if (relocate.has(file)) pathById.set(id, relocate.get(file))

	// 2. download images for wiki items that don't have one yet
	const missing = Object.entries(merged).filter(
		([id, record]) => record.wikiPage && !pathById.has(id),
	)
	console.log(`  ${missing.length} items still missing an image`)
	if (missing.length > 0) {
		const pages = await fetchPageImages([
			...new Set(missing.map(([, record]) => record.wikiPage)),
		])
		const hashToFile = new Map()
		for (const file of await listFilesRecursively(assetsRoot)) {
			const ext = path.extname(file).toLowerCase()
			if (!acceptedExtensions.has(ext)) continue
			hashToFile.set(sha256(await readFile(file)), file)
		}
		await runWithConcurrency(
			missing,
			downloadConcurrency,
			async ([id, record]) => {
				const page = pages.get(record.wikiPage)
				if (!page) return
				const bytes = await fetchImageBytes(page.imageUrl)
				const contentHash = sha256(bytes)
				let targetPath = hashToFile.get(contentHash)
				if (!targetPath) {
					const category = slugById.get(id) ?? 'uncategorised'
					const ext = path
						.extname(new URL(page.imageUrl).pathname)
						.toLowerCase()
					const slug = slugify(record.wikiPage)
					targetPath = path.join(wikiAssetsRoot, category, `${slug}${ext}`)
					await mkdir(path.dirname(targetPath), { recursive: true })
					try {
						const existing = await readFile(targetPath)
						if (sha256(existing) !== contentHash)
							targetPath = path.join(
								path.dirname(targetPath),
								`${slug}-${contentHash.slice(0, 8)}${ext}`,
							)
					} catch (error) {
						if (error.code !== 'ENOENT') throw error
					}
					await writeFile(targetPath, bytes, { flag: 'wx' }).catch(
						async (error) => {
							if (error.code !== 'EEXIST') throw error
						},
					)
					hashToFile.set(contentHash, targetPath)
				}
				pathById.set(id, targetPath)
			},
		)
	}

	// 3. rewrite provenance from the merged dataset + downloaded pages
	const newSources = []
	for (const [id, record] of Object.entries(merged)) {
		const file = pathById.get(id)
		if (!file) continue
		const old = oldById.get(id)
		newSources.push({
			id,
			name: record.name,
			pageTitle: record.wikiPage ?? record.name,
			pageUrl: record.wikiUrl ?? old?.pageUrl,
			imageUrl: old?.imageUrl,
			localFile: path.relative(projectRoot, file).split(path.sep).join('/'),
			width: old?.width,
			height: old?.height,
		})
	}
	newSources.sort(
		(a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
	)
	await writeFile(
		imageSourcesPath,
		`${JSON.stringify(newSources, null, 2)}\n`,
		'utf8',
	)

	// 4. write the icon map from the real on-disk paths
	const iconEntries = newSources
		.map((s) => [s.id, path.resolve(projectRoot, s.localFile)])
		.sort((a, b) => a[0].localeCompare(b[0]))
	const imports = iconEntries.map(
		([, file], index) =>
			`import itemImage${index} from ${JSON.stringify(`./${path.relative(inventoryRoot, file).split(path.sep).join('/')}`)}`,
	)
	const mappings = iconEntries.map(
		([id], index) => `\t${JSON.stringify(id)}: itemImage${index},`,
	)
	const generated = [
		'// Generated by scripts/import-item-data.mjs; do not edit manually.',
		...imports,
		'',
		'export const wikiItemIcons: Readonly<Record<string, string>> = {',
		...mappings,
		'}',
		'',
	].join('\n')
	await writeFile(iconMapPath, generated, 'utf8')
	console.log(
		`  wrote ${path.relative(projectRoot, iconMapPath)} (${iconEntries.length} images)`,
	)
	console.log(
		`  wrote ${path.relative(projectRoot, imageSourcesPath)} (${newSources.length} records)`,
	)
}

await main()
