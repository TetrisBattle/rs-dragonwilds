import { createHash } from 'node:crypto'
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
const mappingPath = path.join(inventoryRoot, 'wikiItemIcons.generated.ts')
const sourcesPath = path.join(inventoryRoot, 'wiki-item-image-sources.json')
const wikiOrigin = 'https://dragonwilds.runescape.wiki'
const apiEndpoint = `${wikiOrigin}/api.php`
const userAgent = 'rs-dragonwilds-item-image-importer/1.0 (local asset bundler)'
const titleBatchSize = 50
const downloadConcurrency = 4
const retryCount = 3
const acceptedExtensions = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif'])
const pageTitleOverrides = new Map([
	['Cadaveberry Infusion', 'Cadavaberry Infusion'],
])

const delay = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds))
const sha256 = (value) =>
	createHash('sha256').update(value).digest('hex').toLowerCase()

function parseCatalog(source) {
	const records = []
	const entryPattern =
		/^\s*\[\s*(['"])([^'"]+)\1\s*,\s*(['"])(.*?)\3\s*,\s*(?:\d+|null)\s*\]\s*,?\s*$/gm

	for (const match of source.matchAll(entryPattern)) {
		records.push({
			id: match[2],
			name: match[4],
		})
	}

	if (records.length === 0) {
		throw new Error(`No item records found in ${catalogPath}`)
	}

	return records
}

function normalizeTitle(title) {
	return title
		.replaceAll('_', ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLocaleLowerCase()
}

function slugify(value) {
	const slug = value
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

	return slug || 'item'
}

function getImageExtension(sourceUrl) {
	const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase()
	if (!acceptedExtensions.has(extension)) {
		throw new Error(
			`Unsupported wiki image format "${extension}": ${sourceUrl}`,
		)
	}
	return extension
}

async function fetchJson(url) {
	for (let attempt = 0; attempt <= retryCount; attempt += 1) {
		const response = await fetch(url, {
			headers: { 'user-agent': userAgent },
		})
		if (response.ok) return response.json()

		if (
			attempt === retryCount ||
			(response.status < 500 && response.status !== 429)
		) {
			throw new Error(`Wiki API request failed (${response.status}): ${url}`)
		}

		await delay(1000 * 2 ** attempt)
	}
}

async function fetchImagePages(names) {
	const pagesByName = new Map()

	for (let offset = 0; offset < names.length; offset += titleBatchSize) {
		const batch = names.slice(offset, offset + titleBatchSize)
		const url = new URL(apiEndpoint)
		url.search = new URLSearchParams({
			action: 'query',
			titles: batch.join('|'),
			prop: 'pageimages',
			piprop: 'original',
			format: 'json',
			formatversion: '2',
		}).toString()

		const data = await fetchJson(url)
		for (const page of data.query?.pages ?? []) {
			if (page.missing || !page.original?.source) continue
			pagesByName.set(normalizeTitle(page.title), {
				title: page.title,
				pageId: page.pageid,
				imageUrl: page.original.source,
				width: page.original.width,
				height: page.original.height,
			})
		}

		if (offset + titleBatchSize < names.length) await delay(250)
	}

	return pagesByName
}

async function listFilesRecursively(directory) {
	let files = []
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name)
		if (entry.isDirectory()) {
			files = files.concat(await listFilesRecursively(entryPath))
		} else if (entry.isFile()) {
			files.push(entryPath)
		}
	}
	return files
}

async function buildExistingAssetHashMap() {
	const hashToAsset = new Map()
	for (const filePath of await listFilesRecursively(assetsRoot)) {
		if (filePath.startsWith(`${wikiAssetsRoot}${path.sep}`)) continue
		const extension = path.extname(filePath).toLowerCase()
		if (!acceptedExtensions.has(extension)) continue
		const bytes = await readFile(filePath)
		hashToAsset.set(sha256(bytes), filePath)
	}
	return hashToAsset
}

async function loadCachedImagePaths() {
	let cachedRecords
	try {
		cachedRecords = JSON.parse(await readFile(sourcesPath, 'utf8'))
	} catch (error) {
		if (error.code === 'ENOENT') return new Map()
		throw error
	}

	if (!Array.isArray(cachedRecords)) {
		throw new Error(`Invalid image provenance file: ${sourcesPath}`)
	}

	const cachedPaths = new Map()
	for (const record of cachedRecords) {
		if (
			typeof record.imageUrl !== 'string' ||
			typeof record.localFile !== 'string'
		)
			continue
		const filePath = path.resolve(projectRoot, record.localFile)
		const relativePath = path.relative(assetsRoot, filePath)
		if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new Error(
				`Cached image path is outside the assets folder: ${filePath}`,
			)
		}
		try {
			await access(filePath)
			cachedPaths.set(record.imageUrl, filePath)
		} catch (error) {
			if (error.code !== 'ENOENT') throw error
		}
	}
	return cachedPaths
}

async function downloadImage(imageUrl) {
	for (let attempt = 0; attempt <= retryCount; attempt += 1) {
		const response = await fetch(imageUrl, {
			headers: { 'user-agent': userAgent },
		})
		if (response.ok) {
			return Buffer.from(await response.arrayBuffer())
		}

		if (
			attempt === retryCount ||
			(response.status < 500 && response.status !== 429)
		) {
			throw new Error(
				`Wiki image download failed (${response.status}): ${imageUrl}`,
			)
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

function relativeImportPath(filePath) {
	return `./${path.relative(inventoryRoot, filePath).split(path.sep).join('/')}`
}

async function main() {
	const catalogSource = await readFile(catalogPath, 'utf8')
	const catalog = parseCatalog(catalogSource)
	const titleByName = new Map(
		catalog.map(({ name }) => [name, pageTitleOverrides.get(name) ?? name]),
	)
	const uniqueNames = [...new Set(titleByName.values())]
	console.log(`Querying ${uniqueNames.length} unique item names from the wiki…`)

	const pagesByName = await fetchImagePages(uniqueNames)
	const matches = catalog.flatMap((item) => {
		const pageTitle = titleByName.get(item.name)
		const page = pagesByName.get(normalizeTitle(pageTitle))
		return page ? [{ ...item, page }] : []
	})
	const uniqueImageUrls = [...new Set(matches.map(({ page }) => page.imageUrl))]
	const imageResults = new Map()
	const existingHashMap = await buildExistingAssetHashMap()
	const filenameByImageUrl = new Map()
	const occupiedNames = new Map()
	const cachedPaths = await loadCachedImagePaths()
	for (const imageUrl of uniqueImageUrls) {
		const targetPath = cachedPaths.get(imageUrl)
		if (!targetPath) continue
		filenameByImageUrl.set(imageUrl, targetPath)
		imageResults.set(imageUrl, { targetPath, cached: true })
	}
	const pendingImageUrls = uniqueImageUrls.filter(
		(imageUrl) => !cachedPaths.has(imageUrl),
	)

	await mkdir(wikiAssetsRoot, { recursive: true })
	console.log(
		`Found exact page-image matches for ${matches.length}/${catalog.length} catalog entries; reusing ${imageResults.size} cached images and fetching ${pendingImageUrls.length} new images…`,
	)

	await runWithConcurrency(
		pendingImageUrls,
		downloadConcurrency,
		async (imageUrl, index) => {
			const bytes = await downloadImage(imageUrl)
			const contentHash = sha256(bytes)
			let targetPath = existingHashMap.get(contentHash)

			if (!targetPath) {
				const matchingItem = matches.find(
					({ page }) => page.imageUrl === imageUrl,
				)
				const extension = getImageExtension(imageUrl)
				const slug = slugify(matchingItem.page.title)
				let filename = `${slug}${extension}`
				const existingPath = occupiedNames.get(filename)
				if (existingPath && existingPath !== imageUrl) {
					filename = `${slug}-${sha256(imageUrl).slice(0, 8)}${extension}`
				}
				occupiedNames.set(filename, imageUrl)
				targetPath = path.join(wikiAssetsRoot, filename)

				try {
					const existingBytes = await readFile(targetPath)
					if (sha256(existingBytes) !== contentHash) {
						filename = `${slug}-${contentHash.slice(0, 8)}${extension}`
						targetPath = path.join(wikiAssetsRoot, filename)
						await writeFile(targetPath, bytes, { flag: 'wx' }).catch(
							async (error) => {
								if (error.code !== 'EEXIST') throw error
								const savedBytes = await readFile(targetPath)
								if (sha256(savedBytes) !== contentHash) throw error
							},
						)
					}
				} catch (error) {
					if (error.code === 'ENOENT') {
						await writeFile(targetPath, bytes, { flag: 'wx' })
					} else {
						throw error
					}
				}

				existingHashMap.set(contentHash, targetPath)
			}

			filenameByImageUrl.set(imageUrl, targetPath)
			imageResults.set(imageUrl, { targetPath, contentHash })
			if ((index + 1) % 50 === 0 || index + 1 === pendingImageUrls.length) {
				console.log(
					`Fetched ${index + 1}/${pendingImageUrls.length} new images`,
				)
			}
		},
	)

	const mappedItems = matches.map((item) => ({
		...item,
		filePath: filenameByImageUrl.get(item.page.imageUrl),
	}))
	const uniqueAssets = [
		...new Set(mappedItems.map(({ filePath }) => filePath)),
	].sort()
	const assetIndex = new Map(
		uniqueAssets.map((filePath, index) => [filePath, index]),
	)
	const imports = uniqueAssets.map(
		(filePath, index) =>
			`import itemImage${index} from ${JSON.stringify(relativeImportPath(filePath))}`,
	)
	const mappings = mappedItems
		.sort((left, right) => left.id.localeCompare(right.id))
		.map(
			({ id, filePath }) =>
				`\t${JSON.stringify(id)}: itemImage${assetIndex.get(filePath)},`,
		)
	const generatedSource = [
		'// Generated by scripts/import-wiki-item-images.mjs; do not edit manually.',
		...imports,
		'',
		'export const wikiItemIcons: Readonly<Record<string, string>> = {',
		...mappings,
		'}',
		'',
	].join('\n')

	const sourceRecords = mappedItems
		.sort(
			(left, right) =>
				left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
		)
		.map(({ id, name, page, filePath }) => ({
			id,
			name,
			pageTitle: page.title,
			pageUrl: `${wikiOrigin}/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`,
			imageUrl: page.imageUrl,
			localFile: path.relative(projectRoot, filePath).split(path.sep).join('/'),
			width: page.width,
			height: page.height,
		}))

	await writeFile(mappingPath, generatedSource, 'utf8')
	await writeFile(
		sourcesPath,
		`${JSON.stringify(sourceRecords, null, 2)}\n`,
		'utf8',
	)

	const matchedNames = new Set(matches.map(({ name }) => name))
	const missingNames = uniqueNames.filter((name) => !matchedNames.has(name))
	console.log(`Imported/mapped ${mappedItems.length} catalog records.`)
	console.log(
		`Processed ${new Set([...imageResults.values()].map(({ targetPath }) => targetPath)).size} unique local image files.`,
	)
	console.log(
		`No exact page image found for ${missingNames.length} unique item names.`,
	)
	for (const name of missingNames) console.log(`  - ${name}`)
}

await main()
