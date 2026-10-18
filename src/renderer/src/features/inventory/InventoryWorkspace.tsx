import BuildIcon from '@mui/icons-material/Build'
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop'
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	FormControlLabel,
	IconButton,
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
import { ItemDetailsTooltip } from './ItemDetailsTooltip'
import { getItemCategory, getItemData } from './itemData'
import { getItemIcon } from './itemIcons'
import { getItemMaxStack, getItemName, getKnownItems } from './itemNames'
import { MissingItemImage } from './MissingItemImage'
import {
	ARROWS_SLOT_START,
	getInventoryCategorySlotRange,
	getInventoryEntries,
	getLoadout,
	getLoadoutEntries,
	getLoadoutSlotCount,
	getPersonalChest,
	getPersonalChestEntries,
	getPlayerInventory,
	getPlayerInventorySlotCount,
	getSlotLabel,
	INVENTORY_SLOT_COUNT,
	ITEMS_SLOT_START,
	PERSONAL_CHEST_SLOT_COUNT,
	QUEST_ITEMS_SLOT_START,
	QUICK_ACCESS_SLOT_COUNT,
	RUNES_SLOT_START,
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
	onAddInventoryItem: (itemId: string, category: InventoryCategory) => void
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
	slotRangeStart: number,
): InventoryEntry[] {
	const normalizedQuery = query.trim().toLowerCase()
	if (!normalizedQuery) return entries

	return entries.filter(
		([slot, item]) =>
			slot.toLowerCase().includes(normalizedQuery) ||
			getSlotLabel(slot, slotRangeStart)
				.toLowerCase()
				.includes(normalizedQuery) ||
			item.ItemData.toLowerCase().includes(normalizedQuery) ||
			(getItemName(item.ItemData)?.toLowerCase().includes(normalizedQuery) ??
				false),
	)
}

function getItemInventoryCategory(itemId: string): InventoryCategory {
	const category = getItemCategory(itemId)
	if (category === 'Rune') return 'runes'
	if (category === 'Ammo') return 'arrows'
	if (category === 'Quest Item') return 'quest-items'

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

function getInventoryCategory(slot: string, itemId: string): InventoryCategory {
	const slotIndex = Number(slot)
	if (Number.isSafeInteger(slotIndex)) {
		if (slotIndex >= 0 && slotIndex < QUICK_ACCESS_SLOT_COUNT)
			return 'quick-access'
		if (
			slotIndex >= ITEMS_SLOT_START &&
			slotIndex < ITEMS_SLOT_START + INVENTORY_SLOT_COUNT
		) {
			return 'items'
		}
		if (
			slotIndex >= RUNES_SLOT_START &&
			slotIndex < RUNES_SLOT_START + INVENTORY_SLOT_COUNT
		) {
			return 'runes'
		}
		if (
			slotIndex >= ARROWS_SLOT_START &&
			slotIndex < ARROWS_SLOT_START + INVENTORY_SLOT_COUNT
		) {
			return 'arrows'
		}
		if (
			slotIndex >= QUEST_ITEMS_SLOT_START &&
			slotIndex < QUEST_ITEMS_SLOT_START + INVENTORY_SLOT_COUNT
		) {
			return 'quest-items'
		}
	}

	return getItemInventoryCategory(itemId)
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
	onAddInventoryItem,
	onRemoveItem,
	onRemoveInventoryItem,
	onMoveItem,
	onMoveInventoryItem,
}: InventoryWorkspaceProps) {
	const [search, setSearch] = useState('')
	const [inventoryCategory, setInventoryCategory] =
		useState<InventoryCategory>('quick-access')
	const [showEmptySlots, setShowEmptySlots] = useState(false)
	const [addItemSearch, setAddItemSearch] = useState('')
	const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
	const isLoadoutView = view === 'inventory' && inventoryCategory === 'loadout'
	const canAddItems =
		view === 'personal-chest' || (view === 'inventory' && !isLoadoutView)
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
	// Absolute [start, end) slots owned by the current tab. Empty rows and the
	// slot numbers shown in the table are derived from it, so a tab only ever
	// lists its own slots and stops at its capacity.
	const slotRange: [number, number] =
		view === 'personal-chest'
			? [0, PERSONAL_CHEST_SLOT_COUNT]
			: view === 'inventory' && !isLoadoutView
				? (getInventoryCategorySlotRange(inventoryCategory) ?? [0, slotCount])
				: [0, slotCount]
	const [slotRangeStart, slotRangeEnd] = slotRange
	const slotCapacity = Math.max(0, slotRangeEnd - slotRangeStart)
	const occupiedSlotsInRange = allEntries.filter(([slot]) => {
		const slotIndex = Number(slot)
		return (
			Number.isSafeInteger(slotIndex) &&
			slotIndex >= slotRangeStart &&
			slotIndex < slotRangeEnd
		)
	}).length
	const isSlotRangeFull =
		slotCapacity > 0 && occupiedSlotsInRange >= slotCapacity
	const inventoryCategoryLabel =
		inventoryCategory === 'quest-items'
			? 'quest items'
			: inventoryCategory === 'quick-access'
				? 'quick access items'
				: inventoryCategory === 'arrows'
					? 'arrows'
					: inventoryCategory === 'runes'
						? 'runes'
						: 'items'
	const categoryEntries =
		view === 'inventory' && !isLoadoutView
			? allEntries.filter(
					([slot, item]) =>
						getInventoryCategory(slot, item.ItemData) === inventoryCategory,
				)
			: allEntries
	const knownItems = useMemo(() => getKnownItems(), [])
	const restrictAddMenuToCategory =
		view === 'inventory' &&
		!isLoadoutView &&
		inventoryCategory !== 'quick-access'
	const filteredKnownItems = useMemo(() => {
		const normalizedQuery = addItemSearch.trim().toLowerCase()

		return knownItems.filter((item) => {
			if (
				restrictAddMenuToCategory &&
				getItemInventoryCategory(item.id) !== inventoryCategory
			) {
				return false
			}

			return (
				item.name.toLowerCase().includes(normalizedQuery) ||
				item.id.toLowerCase().includes(normalizedQuery) ||
				(item.category?.toLowerCase().includes(normalizedQuery) ?? false)
			)
		})
	}, [addItemSearch, inventoryCategory, knownItems, restrictAddMenuToCategory])
	const visibleEntries = useMemo(
		() => filterInventoryEntries(categoryEntries, search, slotRangeStart),
		[categoryEntries, search, slotRangeStart],
	)
	const updateItemForView =
		view === 'personal-chest'
			? onUpdateItem
			: isLoadoutView
				? onUpdateLoadoutItem
				: onUpdateInventoryItem
	// Stackable items in the current view whose count is below their max stack.
	const stacksToMax = useMemo(() => {
		const result: Array<{ slot: string; maxStack: number }> = []
		for (const [slot, item] of visibleEntries) {
			if (typeof item.Count !== 'number') continue
			const maxStack = getItemMaxStack(item.ItemData, item)
			if (
				typeof maxStack === 'number' &&
				maxStack > 1 &&
				item.Count < maxStack
			) {
				result.push({ slot, maxStack })
			}
		}
		return result
	}, [visibleEntries])
	const handleMaxAllStacks = () => {
		for (const { slot, maxStack } of stacksToMax) {
			updateItemForView(slot, 'Count', maxStack)
		}
	}
	// Items in the current view whose durability is below its known max.
	const itemsToRepair = useMemo(() => {
		const result: Array<{ slot: string; durabilityMax: number }> = []
		for (const [slot, item] of visibleEntries) {
			if (typeof item.Durability !== 'number') continue
			const durabilityMax = getItemData(item.ItemData)?.durability
			if (
				typeof durabilityMax === 'number' &&
				durabilityMax > 0 &&
				item.Durability < durabilityMax
			) {
				result.push({ slot, durabilityMax })
			}
		}
		return result
	}, [visibleEntries])
	const handleRepairAll = () => {
		for (const { slot, durabilityMax } of itemsToRepair) {
			updateItemForView(slot, 'Durability', durabilityMax)
		}
	}

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
					<Tab value='inventory' label='Inventory' />
					<Tab value='ui' label='UI' />
					<Tab value='personal-chest' label='Personal Chest' />
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
						<Tab value='items' label='Inventory' />
						<Tab value='quick-access' label='Quick Access' />
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
									? `${occupiedSlotsInRange} of ${slotCapacity} personal chest items`
									: isLoadoutView
										? `${visibleEntries.length} equipped items`
										: `${occupiedSlotsInRange} of ${slotCapacity} ${inventoryCategoryLabel}`}
							</Typography>
							<FormControlLabel
								hidden={isLoadoutView}
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
							{canAddItems && (
								<Tooltip
									title={
										isSlotRangeFull
											? `No free slots — ${occupiedSlotsInRange}/${slotCapacity} used`
											: ''
									}
									arrow
								>
									<Box
										component='span'
										sx={{
											display: 'inline-flex',
											width: { xs: '100%', sm: 200 },
										}}
									>
										<Button
											variant='outlined'
											onClick={(event) => {
												setAddItemSearch('')
												setAddMenuAnchor(event.currentTarget)
											}}
											disabled={!saveData || isSlotRangeFull}
											sx={(theme) => ({
												width: '100%',
												color: theme.palette.text.primary,
												borderColor: theme.palette.divider,
												fontSize: 12,
											})}
										>
											Add item
										</Button>
									</Box>
								</Tooltip>
							)}
							{canAddItems && (
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
											placeholder='Search items by name, ID or category'
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
												title={
													<ItemDetailsTooltip
														itemId={item.id}
														name={item.name}
													/>
												}
												arrow
												placement='right'
												enterDelay={500}
											>
												<MenuItem
													onClick={() => {
														if (view === 'inventory') {
															onAddInventoryItem(item.id, inventoryCategory)
														} else {
															onAddItem(item.id)
														}
														setAddMenuAnchor(null)
														setAddItemSearch('')
													}}
												>
													<Stack
														direction='row'
														spacing={1}
														sx={{ alignItems: 'center', width: '100%' }}
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
														<Typography sx={{ flex: 1, minWidth: 0 }}>
															{item.name}
														</Typography>
														{item.category && (
															<Typography
																sx={{
																	color: 'text.secondary',
																	fontSize: 10,
																	letterSpacing: '0.06em',
																	textTransform: 'uppercase',
																	flexShrink: 0,
																}}
															>
																{item.category}
															</Typography>
														)}
													</Stack>
												</MenuItem>
											</Tooltip>
										))
									) : (
										<MenuItem disabled>No matching items</MenuItem>
									)}
								</Menu>
							)}
							<Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
								<Tooltip title='Repair' arrow>
									<span>
										<IconButton
											aria-label='Repair'
											onClick={handleRepairAll}
											disabled={itemsToRepair.length === 0}
											sx={(theme) => ({
												color: theme.palette.text.primary,
												border: 1,
												borderColor: theme.palette.divider,
												borderRadius: 1,
											})}
										>
											<BuildIcon sx={{ fontSize: 18 }} />
										</IconButton>
									</span>
								</Tooltip>
								{!isLoadoutView && (
									<Tooltip title='Max all stacks' arrow>
										<span>
											<IconButton
												aria-label='Max all stacks'
												onClick={handleMaxAllStacks}
												disabled={stacksToMax.length === 0}
												sx={(theme) => ({
													color: theme.palette.text.primary,
													border: 1,
													borderColor: theme.palette.divider,
													borderRadius: 1,
												})}
											>
												<VerticalAlignTopIcon sx={{ fontSize: 18 }} />
											</IconButton>
										</span>
									</Tooltip>
								)}
							</Stack>
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
							key={view}
							entries={visibleEntries}
							slotRange={slotRange}
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
