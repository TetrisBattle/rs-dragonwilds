import {
	Alert,
	Box,
	Button,
	CircularProgress,
	FormControlLabel,
	InputAdornment,
	Menu,
	MenuItem,
	Paper,
	Stack,
	Switch,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { InventoryTable } from './InventoryTable'
import { InventoryUiPreview } from './InventoryUiPreview'
import { getItemIcon } from './itemIcons'
import { getItemName, getKnownItems } from './itemNames'
import { MissingItemImage } from './MissingItemImage'
import {
	getInventoryEntries,
	getLoadout,
	getLoadoutEntries,
	getLoadoutSlotCount,
	getPersonalChest,
	getPersonalChestEntries,
	getPlayerInventory,
	getPlayerInventorySlotCount,
	PERSONAL_CHEST_SLOT_COUNT,
} from './model'
import type {
	EditableItemField,
	InventoryCategory,
	InventoryEntry,
	InventoryView,
	SaveData,
} from './types'

interface InventoryWorkspaceProps {
	view: InventoryView
	onViewChange: (view: InventoryView) => void
	selectedFile: string | null
	saveData: SaveData | null
	loadingFile: boolean
	error: string | null
	notice: string | null
	onCloseError: () => void
	onCloseNotice: () => void
	onUpdateItem: (
		slot: string,
		field: EditableItemField,
		value: number | null,
	) => void
	onUpdateInventoryItem: (
		slot: string,
		field: EditableItemField,
		value: number | null,
	) => void
	onUpdateLoadoutItem: (
		slot: string,
		field: EditableItemField,
		value: number | null,
	) => void
	onAddItem: (itemId: string) => void
	onRemoveItem: (slot: string) => void
	onRemoveInventoryItem: (slot: string) => void
	onMoveItem: (
		fromSlot: string,
		toSlot: string,
		position?: 'before' | 'after',
	) => void
	onMoveInventoryItem: (
		fromSlot: string,
		toSlot: string,
		position?: 'before' | 'after',
	) => void
}

function filterInventoryEntries(
	entries: InventoryEntry[],
	query: string,
): InventoryEntry[] {
	const normalizedQuery = query.trim().toLowerCase()
	if (!normalizedQuery) return entries

	return entries.filter(
		([slot, item]) =>
			slot.toLowerCase().includes(normalizedQuery) ||
			item.ItemData.toLowerCase().includes(normalizedQuery) ||
			(getItemName(item.ItemData)?.toLowerCase().includes(normalizedQuery) ??
				false),
	)
}

const QUICK_ACCESS_ITEM_COUNT = 8
const INVENTORY_SLOT_COUNT = 8 * 4
const ITEMS_START = QUICK_ACCESS_ITEM_COUNT
const RUNES_START = ITEMS_START + INVENTORY_SLOT_COUNT
const ARROWS_START = RUNES_START + INVENTORY_SLOT_COUNT
const QUEST_ITEMS_START = ARROWS_START + INVENTORY_SLOT_COUNT

function getInventoryCategory(slot: string, itemId: string): InventoryCategory {
	const slotIndex = Number(slot)
	if (Number.isSafeInteger(slotIndex)) {
		if (slotIndex >= 0 && slotIndex < QUICK_ACCESS_ITEM_COUNT)
			return 'quick-access'
		if (
			slotIndex >= ITEMS_START &&
			slotIndex < ITEMS_START + INVENTORY_SLOT_COUNT
		) {
			return 'items'
		}
		if (
			slotIndex >= RUNES_START &&
			slotIndex < RUNES_START + INVENTORY_SLOT_COUNT
		) {
			return 'runes'
		}
		if (
			slotIndex >= ARROWS_START &&
			slotIndex < ARROWS_START + INVENTORY_SLOT_COUNT
		) {
			return 'arrows'
		}
		if (
			slotIndex >= QUEST_ITEMS_START &&
			slotIndex < QUEST_ITEMS_START + INVENTORY_SLOT_COUNT
		) {
			return 'quest-items'
		}
	}

	const name = getItemName(itemId)
	if (!name) return 'items'

	if (name.endsWith(' Rune') || name === 'Rune Essence') return 'runes'

	if (
		name === 'Ghostspeak Amulet' ||
		name === 'The Pride of the Avernic' ||
		name === "Tainted King's Token" ||
		name === 'Missing Letter' ||
		name === 'Letter' ||
		name === 'The Binding of Ib' ||
		name === 'Coclear Malificarum' ||
		name === 'Corrupted Essence Sample' ||
		name.startsWith('Curse Fragment ') ||
		name === 'Challenge Horn' ||
		name === "Velgar's Head" ||
		name === 'Aetheric Fundamentals, a Primordial Primer'
	) {
		return 'quest-items'
	}

	return 'items'
}

function EmptyCharacterState() {
	return (
		<Paper
			elevation={0}
			sx={(theme) => ({
				minHeight: 260,
				display: 'grid',
				placeItems: 'center',
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: 3,
				bgcolor: theme.palette.background.paper,
			})}
		>
			<Box sx={{ textAlign: 'center', px: 3, py: 4 }}>
				<Typography sx={{ color: 'primary.main', fontSize: 28, lineHeight: 1 }}>
					✦
				</Typography>
				<Typography sx={{ mt: 1.5, fontSize: 16, fontWeight: 650 }}>
					Choose your character
				</Typography>
				<Typography
					sx={{
						mt: 0.8,
						color: 'text.secondary',
						fontSize: 12,
						lineHeight: 1.7,
						maxWidth: 390,
					}}
				>
					Select a character save from the left to view its inventory. Your
					original save is backed up automatically when you save changes.
				</Typography>
			</Box>
		</Paper>
	)
}

export function InventoryWorkspace({
	view,
	onViewChange,
	selectedFile,
	saveData,
	loadingFile,
	error,
	notice,
	onCloseError,
	onCloseNotice,
	onUpdateItem,
	onUpdateInventoryItem,
	onUpdateLoadoutItem,
	onAddItem,
	onRemoveItem,
	onRemoveInventoryItem,
	onMoveItem,
	onMoveInventoryItem,
}: InventoryWorkspaceProps) {
	const [search, setSearch] = useState('')
	const [inventoryCategory, setInventoryCategory] =
		useState<InventoryCategory>('items')
	const [showEmptySlots, setShowEmptySlots] = useState(false)
	const [addItemSearch, setAddItemSearch] = useState('')
	const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
	const isLoadoutView = view === 'inventory' && inventoryCategory === 'loadout'
	const personalChest = useMemo(() => getPersonalChest(saveData), [saveData])
	const playerInventory = useMemo(
		() => getPlayerInventory(saveData),
		[saveData],
	)
	const loadout = useMemo(() => getLoadout(saveData), [saveData])
	const allEntries = useMemo(
		() =>
			view === 'personal-chest'
				? getPersonalChestEntries(personalChest)
				: isLoadoutView
					? getLoadoutEntries(saveData)
					: getInventoryEntries(playerInventory),
		[isLoadoutView, personalChest, playerInventory, saveData, view],
	)
	const slotCount =
		view === 'personal-chest'
			? PERSONAL_CHEST_SLOT_COUNT
			: isLoadoutView
				? getLoadoutSlotCount(loadout)
				: getPlayerInventorySlotCount(playerInventory)
	const categoryEntries =
		view === 'inventory' && !isLoadoutView
			? allEntries.filter(
					([slot, item]) =>
						getInventoryCategory(slot, item.ItemData) === inventoryCategory,
				)
			: allEntries
	const knownItems = useMemo(() => getKnownItems(), [])
	const filteredKnownItems = useMemo(() => {
		const normalizedQuery = addItemSearch.trim().toLowerCase()
		if (!normalizedQuery) return knownItems

		return knownItems.filter(
			(item) =>
				item.name.toLowerCase().includes(normalizedQuery) ||
				item.id.toLowerCase().includes(normalizedQuery),
		)
	}, [addItemSearch, knownItems])
	const visibleEntries = useMemo(
		() => filterInventoryEntries(categoryEntries, search),
		[categoryEntries, search],
	)

	return (
		<Box
			sx={{
				flex: 1,
				overflow: 'auto',
				minHeight: 0,
				display: 'flex',
				flexDirection: 'column',
				px: { xs: 2, md: 4 },
				py: 3.2,
			}}
		>
			<Box
				sx={{
					width: '100%',
					maxWidth: 1120,
					mx: 'auto',
					flex: 1,
					minHeight: 0,
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{error && (
					<Alert
						severity='error'
						onClose={onCloseError}
						sx={{
							mb: 2.2,
							bgcolor: 'errorSurface',
							color: 'errorText',
						}}
					>
						{error}
					</Alert>
				)}
				{notice && (
					<Alert
						severity='success'
						onClose={onCloseNotice}
						sx={{
							mb: 2.2,
							bgcolor: 'successSurface',
							color: 'successText',
						}}
					>
						{notice}
					</Alert>
				)}

				<Tabs
					value={view}
					onChange={(_, nextView: InventoryView) => onViewChange(nextView)}
					aria-label='Workspace views'
					sx={{ mb: 2 }}
				>
					<Tab value='personal-chest' label='Personal Chest' />
					<Tab value='inventory' label='Inventory' />
					<Tab value='ui' label='UI' />
				</Tabs>
				{view === 'inventory' && (
					<Tabs
						value={inventoryCategory}
						onChange={(_, nextCategory: InventoryCategory) =>
							setInventoryCategory(nextCategory)
						}
						aria-label='Inventory categories'
						sx={{ mb: 2 }}
					>
						<Tab value='quick-access' label='Quick Access' />
						<Tab value='items' label='Items' />
						<Tab value='runes' label='Runes' />
						<Tab value='arrows' label='Arrows' />
						<Tab value='quest-items' label='Quest Items' />
						<Tab value='loadout' label='Armour' />
					</Tabs>
				)}

				{view === 'ui' ? (
					<InventoryUiPreview saveData={saveData} />
				) : !selectedFile && !loadingFile ? (
					<EmptyCharacterState />
				) : loadingFile ? (
					<Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
						<CircularProgress size={28} color='primary' />
					</Box>
				) : (
					<>
						<Stack
							direction={{ xs: 'column', sm: 'row' }}
							spacing={1.5}
							sx={{
								mb: 1.5,
								alignItems: { sm: 'center' },
								justifyContent: 'space-between',
							}}
						>
							<Typography sx={{ color: 'text.secondary', fontSize: 11 }}>
								{view === 'personal-chest'
									? `${visibleEntries.length} of ${slotCount} personal chest items`
									: isLoadoutView
										? `${visibleEntries.length} equipped items`
										: `${visibleEntries.length} ${
												inventoryCategory === 'quest-items'
													? 'quest items'
													: inventoryCategory === 'quick-access'
														? 'quick access items'
														: inventoryCategory === 'arrows'
															? 'arrows'
															: inventoryCategory === 'runes'
																? 'runes'
																: 'items'
											}`}
							</Typography>
							<FormControlLabel
								hidden={
									isLoadoutView ||
									(view === 'inventory' && inventoryCategory !== 'items')
								}
								control={
									<Switch
										size='small'
										checked={showEmptySlots}
										onChange={(event) =>
											setShowEmptySlots(event.target.checked)
										}
									/>
								}
								label='Show empty slots'
								sx={{
									mx: 0,
									color: 'text.secondary',
									'& .MuiFormControlLabel-label': { fontSize: 11 },
								}}
							/>
							{view === 'personal-chest' && (
								<Button
									variant='outlined'
									onClick={(event) => {
										setAddItemSearch('')
										setAddMenuAnchor(event.currentTarget)
									}}
									disabled={!saveData}
									sx={(theme) => ({
										width: { xs: '100%', sm: 200 },
										color: theme.palette.text.primary,
										borderColor: theme.palette.divider,
										fontSize: 12,
									})}
								>
									Add item
								</Button>
							)}
							{view === 'personal-chest' && (
								<Menu
									anchorEl={addMenuAnchor}
									open={Boolean(addMenuAnchor)}
									onClose={() => {
										setAddMenuAnchor(null)
										setAddItemSearch('')
									}}
									slotProps={{
										paper: {
											sx: { maxHeight: 420, minWidth: 280 },
										},
										list: {
											autoFocusItem: false,
										},
									}}
								>
									<Box
										sx={{
											position: 'sticky',
											top: 0,
											zIndex: 1,
											p: 1,
											bgcolor: 'background.paper',
										}}
									>
										<TextField
											autoFocus
											fullWidth
											size='small'
											placeholder='Search items by name or ID'
											value={addItemSearch}
											onChange={(event) => setAddItemSearch(event.target.value)}
											onKeyDown={(event) => {
												if (event.key !== 'Escape') event.stopPropagation()
											}}
											slotProps={{
												htmlInput: {
													'aria-label': 'Search items to add',
												},
											}}
										/>
									</Box>
									{filteredKnownItems.length ? (
										filteredKnownItems.map((item) => (
											<Tooltip
												key={item.id}
												title={item.name}
												arrow
												placement='right'
												enterDelay={500}
											>
												<MenuItem
													onClick={() => {
														onAddItem(item.id)
														setAddMenuAnchor(null)
														setAddItemSearch('')
													}}
												>
													<Stack
														direction='row'
														spacing={1}
														sx={{ alignItems: 'center' }}
													>
														{getItemIcon(item.id) ? (
															<Box
																component='img'
																src={getItemIcon(item.id)}
																alt=''
																aria-hidden='true'
																sx={{
																	width: 24,
																	height: 24,
																	objectFit: 'contain',
																	flexShrink: 0,
																}}
															/>
														) : (
															<MissingItemImage size={24} />
														)}
														{item.name}
													</Stack>
												</MenuItem>
											</Tooltip>
										))
									) : (
										<MenuItem disabled>No matching items</MenuItem>
									)}
								</Menu>
							)}
							<TextField
								placeholder='Search item name, ID or slot'
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								sx={(theme) => ({
									width: { xs: '100%', sm: 280 },
									'& .MuiOutlinedInput-root': {
										bgcolor: theme.palette.background.paper,
										color: theme.palette.text.primary,
										fontSize: 12,
										'& fieldset': {
											borderColor: theme.palette.divider,
										},
									},
									'& input::placeholder': {
										color: theme.palette.text.secondary,
										opacity: 1,
									},
								})}
								slotProps={{
									input: {
										startAdornment: (
											<InputAdornment position='start'>
												<Typography
													sx={{ color: 'text.secondary', fontSize: 16 }}
												>
													⌕
												</Typography>
											</InputAdornment>
										),
									},
								}}
							/>
						</Stack>
						<InventoryTable
							entries={visibleEntries}
							slotCount={slotCount}
							onUpdateItem={
								view === 'personal-chest'
									? onUpdateItem
									: isLoadoutView
										? onUpdateLoadoutItem
										: onUpdateInventoryItem
							}
							onRemoveItem={
								view === 'personal-chest' ? onRemoveItem : onRemoveInventoryItem
							}
							onMoveItem={
								view === 'personal-chest' ? onMoveItem : onMoveInventoryItem
							}
							showEmptySlots={!isLoadoutView && showEmptySlots}
							loadoutMode={isLoadoutView}
							allowRemove={!isLoadoutView}
							allowReorder={!isLoadoutView}
						/>
					</>
				)}
			</Box>
		</Box>
	)
}
