import AddIcon from '@mui/icons-material/Add'
import BuildIcon from '@mui/icons-material/Build'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import RemoveIcon from '@mui/icons-material/Remove'
import UndoIcon from '@mui/icons-material/Undo'
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop'
import {
	Box,
	IconButton,
	Paper,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useEffect, useRef, useState } from 'react'
import { getItemData } from './itemData'
import { getItemIcon } from './itemIcons'
import { getItemMaxStack, getItemName } from './itemNames'
import {
	canUpgradeItemPowerLevel,
	getItemBasePowerLevel,
	MAX_POWER_LEVEL,
} from './itemPowerLevels'
import { MissingItemImage } from './MissingItemImage'
import { getSlotLabel } from './model'
import type { EditableItemField, InventoryEntry } from './types'

interface InventoryTableProps {
	entries: InventoryEntry[]
	/** Absolute [start, end) slot range owned by the current tab. */
	slotRange: [number, number]
	onUpdateItem: (
		slot: string,
		field: EditableItemField,
		value: number | null,
	) => void
	onRemoveItem: (slot: string) => void
	onMoveItem: (
		fromSlot: string,
		toSlot: string,
		position?: 'before' | 'after',
	) => void
	showEmptySlots: boolean
	loadoutMode?: boolean
	allowRemove?: boolean
	allowReorder?: boolean
}

interface InventoryGridRow {
	id: string
	slot: string
	/** 1-based slot number displayed in the UI; `slot` stays the raw id. */
	slotLabel: string
	itemId: string | null
	itemName: string
	itemIcon: string | undefined
	isKnownItem: boolean
	isEmpty: boolean
	loadoutMode?: boolean
	field: EditableItemField | null
	value: string | null
	countMax: number | null
	durability: number | null
	durabilityMax: number | null
	canRepairDurability?: boolean
	canMaxCount?: boolean
	basePowerLevel: number | null
	powerLevel: number | null
	canUpgradePowerLevel: boolean
	canDecreasePowerLevel?: boolean
	canIncreasePowerLevel?: boolean
	onSelectForDrag?: () => void
	onStartDrag?: () => void
	onQuantityChange?: (field: EditableItemField, value: string) => void
	onQuantityBlur?: (field: EditableItemField, value: string) => void
	onPowerLevelDecrease?: () => void
	onPowerLevelIncrease?: () => void
	onRepairDurability?: () => void
	onRevertDurability?: () => void
	onMaxCount?: () => void
	onRevertCount?: () => void
	onRemove?: () => void
	canDrag?: boolean
}

function renderSlotCell(row: InventoryGridRow) {
	return (
		<Stack
			direction='row'
			spacing={0.5}
			sx={{
				width: '100%',
				alignItems: 'center',
			}}
		>
			{row.isEmpty || !row.canDrag ? (
				<Box sx={{ width: 26, flexShrink: 0 }} />
			) : (
				<IconButton
					size='small'
					draggable
					aria-label={`Drag item from slot ${row.slotLabel}`}
					onClick={(event) => {
						event.stopPropagation()
						row.onSelectForDrag?.()
					}}
					onDragStart={(event) => {
						row.onStartDrag?.()
						row.onSelectForDrag?.()
						event.dataTransfer.setData('text/plain', row.slot)
						event.dataTransfer.effectAllowed = 'move'
						const rowElement = event.currentTarget.closest('.MuiDataGrid-row')
						if (rowElement) {
							const bounds = rowElement.getBoundingClientRect()
							event.dataTransfer.setDragImage(
								rowElement,
								event.clientX - bounds.left,
								event.clientY - bounds.top,
							)
						}
					}}
					sx={{
						p: 0.25,
						color: 'text.secondary',
						cursor: 'grab',
						flexShrink: 0,
					}}
				>
					<DragIndicatorIcon fontSize='small' />
				</IconButton>
			)}
			<Typography
				sx={{
					color: 'text.secondary',
					fontSize: 11,
					fontFamily: 'Consolas, monospace',
					lineHeight: 1,
				}}
			>
				{row.slotLabel}
			</Typography>
		</Stack>
	)
}

function renderItemCell(row: InventoryGridRow) {
	const content = (
		<Stack
			direction='row'
			spacing={1}
			sx={{
				alignItems: 'center',
				minWidth: 0,
				width: '100%',
			}}
		>
			{!row.isEmpty &&
				(row.itemIcon ? (
					<Box
						component='img'
						src={row.itemIcon}
						alt=''
						aria-hidden='true'
						sx={{
							width: 30,
							height: 30,
							objectFit: 'contain',
							flexShrink: 0,
						}}
					/>
				) : (
					<MissingItemImage size={30} />
				))}
			<Typography
				sx={(theme) => ({
					flex: 1,
					minWidth: 0,
					color: row.isEmpty
						? theme.palette.textSubtle
						: theme.palette.textItem,
					fontFamily: row.isKnownItem ? 'inherit' : 'Consolas, monospace',
					fontSize: 11,
					fontStyle: row.isEmpty ? 'italic' : 'normal',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
				})}
			>
				{row.isEmpty ? 'Empty slot' : row.itemName}
			</Typography>
		</Stack>
	)

	return content
}

function renderDurabilityCell(row: InventoryGridRow) {
	const durabilityMax = row.durabilityMax
	const canRepair = row.canRepairDurability === true
	const canRevert = row.onRevertDurability !== undefined
	return (
		<Stack
			direction='row'
			spacing={0.5}
			sx={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'baseline',
					justifyContent: 'flex-end',
					gap: 0.25,
					minWidth: 76,
				}}
			>
				<Typography
					sx={{
						color: 'text.primary',
						fontSize: 12,
						fontVariantNumeric: 'tabular-nums',
					}}
				>
					{row.durability}
				</Typography>
				{durabilityMax !== null && (
					<Typography
						sx={{
							color: 'text.secondary',
							fontSize: 10,
							fontVariantNumeric: 'tabular-nums',
						}}
					>
						/{durabilityMax}
					</Typography>
				)}
			</Box>
			{durabilityMax !== null &&
				(canRevert ? (
					<Tooltip title='Revert durability change' arrow>
						<IconButton
							size='small'
							aria-label={`Revert durability for ${row.itemName}`}
							onClick={row.onRevertDurability}
							sx={{ p: 0.4, color: 'text.secondary' }}
						>
							<UndoIcon sx={{ fontSize: 16 }} />
						</IconButton>
					</Tooltip>
				) : (
					<IconButton
						size='small'
						disabled={!canRepair}
						aria-label={`Repair ${row.itemName} to full durability`}
						onClick={row.onRepairDurability}
						sx={{
							p: 0.4,
							color: canRepair ? 'primary.main' : 'text.disabled',
						}}
					>
						<BuildIcon sx={{ fontSize: 16 }} />
					</IconButton>
				))}
		</Stack>
	)
}

function renderCountCell(row: InventoryGridRow) {
	const countMax = row.countMax
	const canMax = row.canMaxCount === true
	const canRevert = row.onRevertCount !== undefined
	return (
		<Stack
			direction='row'
			spacing={0.5}
			sx={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'baseline',
					justifyContent: 'flex-end',
					gap: 0.25,
					minWidth: 76,
				}}
			>
				<Typography
					sx={{
						color: 'text.primary',
						fontSize: 12,
						fontVariantNumeric: 'tabular-nums',
					}}
				>
					{row.value}
				</Typography>
				{countMax !== null && (
					<Typography
						sx={{
							color: 'text.secondary',
							fontSize: 10,
							fontVariantNumeric: 'tabular-nums',
						}}
					>
						/{countMax}
					</Typography>
				)}
			</Box>
			{countMax !== null &&
				(canRevert ? (
					<Tooltip title='Revert stack change' arrow>
						<IconButton
							size='small'
							aria-label={`Revert stack for ${row.itemName}`}
							onClick={row.onRevertCount}
							sx={{ p: 0.4, color: 'text.secondary' }}
						>
							<UndoIcon sx={{ fontSize: 16 }} />
						</IconButton>
					</Tooltip>
				) : (
					<IconButton
						size='small'
						disabled={!canMax || row.onMaxCount === undefined}
						aria-label={`Max stack of ${row.itemName}`}
						onClick={row.onMaxCount}
						sx={{
							p: 0.4,
							color: canMax ? 'primary.main' : 'text.disabled',
						}}
					>
						<VerticalAlignTopIcon sx={{ fontSize: 16 }} />
					</IconButton>
				))}
		</Stack>
	)
}

function renderQuantityCell(row: InventoryGridRow) {
	if (row.isEmpty) return null
	if (row.durability !== null) return renderDurabilityCell(row)
	// Stackable counts with a known limit are read-only ("count / max") and
	// filled with the button, mirroring the durability display. Items with an
	// unknown limit keep the editable field since there is nothing to max to.
	if (row.countMax !== null) return renderCountCell(row)
	if (!row.field || row.value === null) {
		return (
			<Typography
				sx={{ color: 'textSubtle', fontSize: 10, textAlign: 'center' }}
			>
				{row.loadoutMode ? 'Not tracked' : 'Unique item'}
			</Typography>
		)
	}

	const field = row.field
	return (
		<Stack
			direction='row'
			spacing={0.75}
			sx={{
				width: '100%',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			<TextField
				value={row.value}
				onChange={(event) => row.onQuantityChange?.(field, event.target.value)}
				onBlur={(event) => row.onQuantityBlur?.(field, event.target.value)}
				slotProps={{
					htmlInput: {
						'aria-label': field,
					},
				}}
				sx={(theme) => ({
					flex: 1,
					minWidth: 0,
					'& .MuiOutlinedInput-root': {
						height: 32,
						boxSizing: 'border-box',
						bgcolor: theme.palette.surfaceInput,
						color: theme.palette.text.primary,
						fontSize: 12,
						'& fieldset': { borderColor: theme.palette.divider },
						'&:hover:not(.Mui-focused) fieldset': {
							borderColor: theme.palette.divider,
						},
						// MUI promotes the fieldset to a 2px primary-colored border
						// on focus; out-specify that state to keep the divider look.
						'&.Mui-focused fieldset': {
							borderColor: theme.palette.divider,
							borderWidth: 1,
						},
					},
					'& .MuiInputBase-input': {
						boxSizing: 'border-box',
						height: '100%',
						padding: '0 8px',
						textAlign: 'center',
					},
				})}
			/>
		</Stack>
	)
}

function renderPowerLevelCell(row: InventoryGridRow) {
	const powerLevel = row.powerLevel
	if (row.isEmpty || row.basePowerLevel === null || powerLevel === null) {
		return null
	}

	// Non-ascendable items only show their power level.
	if (!row.canUpgradePowerLevel) {
		return (
			<Typography
				aria-label={`Power level for ${row.itemName}`}
				sx={{
					width: '100%',
					textAlign: 'center',
					fontSize: 12,
					fontVariantNumeric: 'tabular-nums',
				}}
			>
				{powerLevel}
			</Typography>
		)
	}

	const canDecrease = row.canDecreasePowerLevel === true
	const canIncrease = row.canIncreasePowerLevel === true

	return (
		<Stack
			direction='row'
			spacing={0.5}
			sx={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
		>
			<Tooltip
				title={
					canDecrease
						? `Decrease power level for ${row.itemName}`
						: `${row.itemName} is already at its base power level`
				}
				arrow
			>
				<span>
					<IconButton
						size='small'
						disabled={!canDecrease || row.onPowerLevelDecrease === undefined}
						aria-label={`Decrease power level for ${row.itemName}`}
						onClick={row.onPowerLevelDecrease}
						sx={{
							p: 0.4,
							color: canDecrease ? 'primary.main' : 'text.disabled',
						}}
					>
						<RemoveIcon sx={{ fontSize: 16 }} />
					</IconButton>
				</span>
			</Tooltip>
			<Typography
				aria-label={`Power level for ${row.itemName}`}
				sx={{
					color: 'text.primary',
					fontSize: 12,
					fontVariantNumeric: 'tabular-nums',
					minWidth: 18,
					textAlign: 'center',
				}}
			>
				{powerLevel}
			</Typography>
			<Tooltip
				title={
					canIncrease
						? `Ascend ${row.itemName} to power level ${powerLevel + 1}`
						: `${row.itemName} cannot be ascended higher`
				}
				arrow
			>
				<span>
					<IconButton
						size='small'
						disabled={!canIncrease || row.onPowerLevelIncrease === undefined}
						aria-label={`Ascend ${row.itemName} to power level ${powerLevel + 1}`}
						onClick={row.onPowerLevelIncrease}
						sx={{
							p: 0.4,
							color: canIncrease ? 'primary.main' : 'text.disabled',
						}}
					>
						<AddIcon sx={{ fontSize: 16 }} />
					</IconButton>
				</span>
			</Tooltip>
		</Stack>
	)
}

const columns: GridColDef<InventoryGridRow>[] = [
	{
		field: 'slot',
		headerName: 'SLOT',
		width: 90,
		minWidth: 60,
		display: 'flex',
		resizable: true,
		sortable: false,
		renderCell: ({ row }) => renderSlotCell(row),
	},
	{
		field: 'itemName',
		headerName: 'ITEM',
		flex: 1,
		minWidth: 200,
		display: 'flex',
		resizable: true,
		sortable: false,
		renderCell: ({ row }) => renderItemCell(row),
	},
	{
		field: 'value',
		headerName: 'QUANTITY / DURABILITY',
		width: 235,
		minWidth: 180,
		display: 'flex',
		resizable: true,
		sortable: false,
		align: 'center',
		headerAlign: 'center',
		renderCell: ({ row }) => renderQuantityCell(row),
	},
	{
		field: 'powerLevel',
		headerName: 'POWER LEVEL',
		width: 140,
		minWidth: 120,
		display: 'flex',
		resizable: true,
		sortable: false,
		align: 'center',
		headerAlign: 'center',
		renderCell: ({ row }) => renderPowerLevelCell(row),
	},
	{
		field: 'remove',
		headerName: 'REMOVE',
		width: 90,
		minWidth: 70,
		display: 'flex',
		resizable: true,
		sortable: false,
		align: 'center',
		headerAlign: 'center',
		renderCell: ({ row }) =>
			row.isEmpty ? null : (
				<IconButton
					color='error'
					size='small'
					aria-label={`Remove ${row.itemName} from slot ${row.slotLabel}`}
					onClick={row.onRemove}
					sx={{ fontSize: 18 }}
				>
					<DeleteIcon fontSize='small' />
				</IconButton>
			),
	},
]

function NoRowsOverlay() {
	return (
		<Stack
			sx={{
				height: '100%',
				alignItems: 'center',
				justifyContent: 'center',
				color: 'text.secondary',
				fontSize: 14,
			}}
		>
			No matching inventory items.
		</Stack>
	)
}

export function InventoryTable({
	entries,
	slotRange,
	onUpdateItem,
	onRemoveItem,
	onMoveItem,
	showEmptySlots,
	loadoutMode = false,
	allowRemove = true,
	allowReorder = true,
}: InventoryTableProps) {
	const [slotRangeStart, slotRangeEnd] = slotRange
	const [draftValues, setDraftValues] = useState<Record<string, string>>({})
	// Durability restored by the "revert" button, keyed by slot. Only populated
	// after the user repairs an item; cleared once they revert (or the view
	// changes and the table remounts).
		const [durabilityUndo, setDurabilityUndo] = useState<
			Record<string, number | null>
		>({})
	// Count restored by the "revert" button, keyed by slot. Only populated
	// after the user maxes a stack; cleared once they revert (or the view
	// changes and the table remounts).
	const [countUndo, setCountUndo] = useState<Record<string, number | null>>({})
		const [selectedDragSlot, setSelectedDragSlot] = useState<string | null>(null)
	const dropIndicatorRef = useRef<HTMLDivElement>(null)
	const dragSourceRef = useRef<string | null>(null)
	const dropTargetRef = useRef<{
		slot: string
		position: 'before' | 'after'
	} | null>(null)
	const clearDropIndicator = () => {
		dropTargetRef.current = null
		if (dropIndicatorRef.current) {
			dropIndicatorRef.current.style.visibility = 'hidden'
		}
	}

	const occupiedRows = entries.map(([slot, item]): InventoryGridRow => {
		const countDraftKey = `${slot}:Count`
		const itemName = getItemName(item.ItemData)
		const hasCount = typeof item.Count === 'number'
		const maxStack = getItemMaxStack(item.ItemData, item)
		// Stackable items get an editable Count field. Durability is shown
		// read-only and repaired with the buttons instead of being typed in.
		const field: EditableItemField | null =
			hasCount && !loadoutMode && maxStack !== 1 ? 'Count' : null
		// Stack limit shown after the editable count ("count / max"), mirroring
		// the durability display. Unknown limits stay hidden.
		const countMax =
			field === 'Count' && typeof maxStack === 'number' && maxStack > 1
				? maxStack
				: null
		const storedDurability =
			typeof item.Durability === 'number' ? item.Durability : null
		const rawDurabilityMax = getItemData(item.ItemData)?.durability
		const durabilityMax =
			typeof rawDurabilityMax === 'number' && rawDurabilityMax > 0
				? rawDurabilityMax
				: null
		// Saves omit Durability while an item is at full durability, so treat a
		// missing value as full whenever the item has a known maximum.
		const currentDurability = storedDurability ?? durabilityMax
		const canRepairDurability =
			storedDurability !== null &&
			durabilityMax !== null &&
			storedDurability !== durabilityMax
		const currentCount = typeof item.Count === 'number' ? item.Count : null
		const canMaxCount =
			countMax !== null && currentCount !== null && currentCount < countMax
		const itemIcon = getItemIcon(item.ItemData)
		const basePowerLevel = getItemBasePowerLevel(item.ItemData) ?? null
		const canUpgradePowerLevel = canUpgradeItemPowerLevel(item.ItemData)
		const numUpgradesApplied =
			typeof item.NumUpgradesApplied === 'number' &&
			Number.isSafeInteger(item.NumUpgradesApplied)
				? item.NumUpgradesApplied
				: 0
		let powerLevel: number | null = null
		if (basePowerLevel !== null) {
			const calculatedPowerLevel = basePowerLevel + numUpgradesApplied
			powerLevel = Number.isSafeInteger(calculatedPowerLevel)
				? Math.max(basePowerLevel, calculatedPowerLevel)
				: basePowerLevel
		}
		// Downgrading stops at the item's base power level, upgrading at the
		// highest power level the game lets you ascend to. Items that cannot be
		// ascended get neither button.
		const nextPowerLevelDown =
			canUpgradePowerLevel &&
			powerLevel !== null &&
			basePowerLevel !== null &&
			powerLevel > basePowerLevel
				? powerLevel - 1
				: null
		const nextPowerLevelUp =
			canUpgradePowerLevel &&
			powerLevel !== null &&
			powerLevel < MAX_POWER_LEVEL
				? powerLevel + 1
				: null

		return {
			id: slot,
			slot,
			slotLabel: getSlotLabel(slot, slotRangeStart),
			itemId: item.ItemData,
			itemName: itemName ?? item.ItemData,
			itemIcon,
			isKnownItem: itemName !== undefined,
			isEmpty: false,
			loadoutMode,
			canDrag: allowReorder,
			field,
			countMax,
			canMaxCount,
			onMaxCount:
				countMax !== null && canMaxCount
					? () => {
							setCountUndo((current) => ({
								...current,
								[slot]: currentCount,
							}))
							onUpdateItem(slot, 'Count', countMax)
						}
					: undefined,
			onRevertCount: Object.hasOwn(countUndo, slot)
				? () => {
						const previous = countUndo[slot]
						setCountUndo((current) => {
							const next = { ...current }
							delete next[slot]
							return next
						})
						onUpdateItem(slot, 'Count', previous ?? null)
					}
				: undefined,
			durability: currentDurability,
			durabilityMax,
			canRepairDurability,
			basePowerLevel,
			canUpgradePowerLevel,
			powerLevel,
			canDecreasePowerLevel: nextPowerLevelDown !== null,
			canIncreasePowerLevel: nextPowerLevelUp !== null,
			onSelectForDrag: allowReorder
				? () => setSelectedDragSlot(slot)
				: undefined,
			onStartDrag: allowReorder
				? () => {
						dragSourceRef.current = slot
					}
				: undefined,
			value: field
				? (draftValues[`${slot}:${field}`] ?? item[field]?.toString() ?? '')
				: null,
			onQuantityChange: (quantityField, inputValue) => {
				setDraftValues((current) => ({
					...current,
					[`${slot}:${quantityField}`]: inputValue,
				}))
				if (inputValue === '') {
					onUpdateItem(slot, quantityField, null)
					return
				}

				const nextValue = Number(inputValue)
				if (Number.isSafeInteger(nextValue) && nextValue >= 0) {
					onUpdateItem(slot, quantityField, nextValue === 0 ? null : nextValue)
				}
			},
			onQuantityBlur: (quantityField, inputValue) => {
				const key = `${slot}:${quantityField}`
				const nextValue = Number(inputValue)
				if (
					inputValue === '' ||
					!Number.isSafeInteger(nextValue) ||
					nextValue <= 0
				) {
					onUpdateItem(slot, quantityField, null)
				} else {
					onUpdateItem(slot, quantityField, nextValue)
				}
				setDraftValues((current) => {
					const next = { ...current }
					delete next[key]
					return next
				})
			},
			onPowerLevelDecrease:
				nextPowerLevelDown !== null && basePowerLevel !== null
					? () =>
							onUpdateItem(
								slot,
								'NumUpgradesApplied',
								nextPowerLevelDown - basePowerLevel,
							)
					: undefined,
			onPowerLevelIncrease:
				nextPowerLevelUp !== null && basePowerLevel !== null
					? () =>
							onUpdateItem(
								slot,
								'NumUpgradesApplied',
								nextPowerLevelUp - basePowerLevel,
							)
					: undefined,
			onRepairDurability:
				canRepairDurability && durabilityMax !== null
					? () => {
							setDurabilityUndo((current) => ({
								...current,
								[slot]: currentDurability,
							}))
							onUpdateItem(slot, 'Durability', durabilityMax)
						}
					: undefined,
			onRevertDurability: Object.hasOwn(durabilityUndo, slot)
				? () => {
						const previous = durabilityUndo[slot]
						setDurabilityUndo((current) => {
							const next = { ...current }
							delete next[slot]
							return next
						})
						onUpdateItem(slot, 'Durability', previous ?? null)
					}
				: undefined,
			onRemove: () => {
				setDraftValues((current) => {
					const next = { ...current }
					delete next[countDraftKey]
					return next
				})
				setDurabilityUndo((current) => {
					if (!Object.hasOwn(current, slot)) return current
					const next = { ...current }
					delete next[slot]
					return next
				})
				setCountUndo((current) => {
					if (!Object.hasOwn(current, slot)) return current
					const next = { ...current }
					delete next[slot]
					return next
				})
				onRemoveItem?.(slot)
			},
		}
	})
	const occupiedSlots = new Set(occupiedRows.map((row) => row.slot))
	// Only slots inside the current tab's range become empty rows, so the
	// toggle never lists slots that belong to another tab.
	const emptyRows: InventoryGridRow[] = Array.from(
		{ length: Math.max(0, slotRangeEnd - slotRangeStart) },
		(_, index) => String(slotRangeStart + index),
	)
		.filter((slot) => !occupiedSlots.has(slot))
		.map((slot) => ({
			id: slot,
			slot,
			slotLabel: getSlotLabel(slot, slotRangeStart),
			itemId: null,
			itemName: '',
			itemIcon: undefined,
			isKnownItem: true,
			isEmpty: true,
			field: null,
			value: null,
			durability: null,
			durabilityMax: null,
			countMax: null,
			canRepairDurability: false,
			basePowerLevel: null,
			powerLevel: null,
			canUpgradePowerLevel: false,
		}))
	const rows = [...occupiedRows, ...(showEmptySlots ? emptyRows : [])].sort(
		(left, right) => Number(left.slot) - Number(right.slot),
	)
	useEffect(() => {
		const entriesToClear: string[] = []
		Object.entries(durabilityUndo).forEach(([slot, previous]) => {
			const item = entries.find(([s]) => s === slot)?.[1]
			if (!item) {
				entriesToClear.push(slot)
				return
			}
			const currentDurability =
				typeof item.Durability === 'number' ? item.Durability : null
			const rawMax = getItemData(item.ItemData)?.durability
			const maxDurability =
				typeof rawMax === 'number' && rawMax > 0 ? rawMax : null
			if (maxDurability !== null && currentDurability === maxDurability) {
				entriesToClear.push(slot)
				return
			}
			if (previous !== null && currentDurability === previous) {
				entriesToClear.push(slot)
				return
			}
			if (currentDurability === null) {
				entriesToClear.push(slot)
			}
		})
		if (entriesToClear.length === 0) return
		setDurabilityUndo((current) => {
			const next = { ...current }
			for (const slot of entriesToClear) {
				delete next[slot]
			}
			return next
		})
	}, [entries, durabilityUndo])
	useEffect(() => {
		const entriesToClear: string[] = []
		Object.entries(countUndo).forEach(([slot]) => {
			const item = entries.find(([s]) => s === slot)?.[1]
			if (!item) {
				entriesToClear.push(slot)
				return
			}
			const currentCount = typeof item.Count === 'number' ? item.Count : null
			// The revert only makes sense while the stack is still maxed; once
			// it drops off the max (reverted elsewhere or changed by the user)
			// there is nothing to undo.
			const maxStack = getItemMaxStack(item.ItemData, item)
			if (maxStack === null || currentCount !== maxStack) {
				entriesToClear.push(slot)
			}
		})
		if (entriesToClear.length === 0) return
		setCountUndo((current) => {
			const next = { ...current }
			for (const slot of entriesToClear) {
				delete next[slot]
			}
			return next
		})
	}, [entries, countUndo])
	const clearDragSource = () => {
		dragSourceRef.current = null
	}

	return (
		<Paper
			elevation={0}
			onDragOverCapture={(event) => {
				const target = (event.target as HTMLElement).closest<HTMLElement>(
					'.MuiDataGrid-row',
				)
				if (!allowReorder || !target) return
				event.preventDefault()
				const targetSlot = target.dataset.id
				const fromSlot =
					dragSourceRef.current || event.dataTransfer.getData('text/plain')
				if (!targetSlot || targetSlot === fromSlot) {
					clearDropIndicator()
					return
				}
				const bounds = target.getBoundingClientRect()
				const nextDropTarget = {
					slot: targetSlot,
					position:
						event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after',
				} as const
				dropTargetRef.current = nextDropTarget
				if (dropIndicatorRef.current) {
					const paperBounds = event.currentTarget.getBoundingClientRect()
					const top =
						bounds.top -
						paperBounds.top +
						event.currentTarget.clientTop +
						(nextDropTarget.position === 'after' ? bounds.height : 0)
					dropIndicatorRef.current.style.transform = `translateY(${top - 1}px)`
					dropIndicatorRef.current.style.visibility = 'visible'
				}
			}}
			onDropCapture={(event) => {
				const fromSlot =
					dragSourceRef.current || event.dataTransfer.getData('text/plain')
				const target = dropTargetRef.current
				if (allowReorder && fromSlot && target) {
					event.preventDefault()
					onMoveItem?.(fromSlot, target.slot, target.position)
				}
				clearDropIndicator()
				clearDragSource()
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					clearDropIndicator()
				}
			}}
			onDragEndCapture={() => {
				clearDropIndicator()
				clearDragSource()
			}}
			sx={(theme) => ({
				display: 'flex',
				position: 'relative',
				flex: 1,
				minHeight: 220,
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: 2.5,
				bgcolor: theme.palette.background.paper,
				overflow: 'hidden',
				'& .MuiDataGrid-root': {
					border: 0,
					borderRadius: 0,
				},
				// MUI outlines the focused cell and column header using
				// colors.interactive.focus (derived from palette.primary). Those
				// rules are scoped under the grid root with :focus/:focus-within
				// states, so the plain .MuiDataGrid-cell overrides above lose to
				// them; matching their scope and state wins on specificity
				// without relying on injection order or !important.
				'& .MuiDataGrid-root .MuiDataGrid-cell:focus, & .MuiDataGrid-root .MuiDataGrid-cell:focus-within, & .MuiDataGrid-root .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-root .MuiDataGrid-columnHeader:focus-within':
					{
						outline: 'none',
					},
				'& .MuiDataGrid-columnHeaders': {
					bgcolor: theme.palette.surfaceHeader,
					color: theme.palette.text.secondary,
					borderBottom: `1px solid ${theme.palette.divider}`,
					fontSize: 10,
					fontWeight: 700,
					letterSpacing: '0.12em',
					textTransform: 'uppercase',
				},
				'& .MuiDataGrid-columnHeader': {
					outline: 'none',
					'&:focus': { outline: 'none' },
				},
				'& .MuiDataGrid-columnHeaderTitle': {
					fontWeight: 700,
					lineHeight: 1.2,
				},
				'& .MuiDataGrid-columnSeparator': {
					color: theme.palette.divider,
					opacity: 1,
				},
				'& .MuiDataGrid-cell': {
					borderColor: theme.palette.divider,
					outline: 'none',
					py: 0,
					boxSizing: 'border-box',
					color: theme.palette.text.primary,
					fontSize: 12,
					alignItems: 'center',
				},
				'& .MuiDataGrid-cell[data-field="value"]': {
					px: 0,
				},
				'& .MuiDataGrid-row': {
					bgcolor: theme.palette.background.paper,
				},
				'& .MuiDataGrid-row:hover:not(.drag-source-selected)': {
					bgcolor: theme.palette.surfaceRaised,
				},
				'& .MuiDataGrid-row.drag-source-selected': {
					bgcolor: theme.palette.surfaceSelected,
				},
				'& .MuiDataGrid-row.drag-source-selected:hover': {
					bgcolor: theme.palette.surfaceSelected,
				},
				'& .MuiDataGrid-virtualScroller': {
					bgcolor: theme.palette.background.paper,
				},
				'& .MuiDataGrid-scrollbar': {
					scrollbarColor: `${theme.palette.scrollbarThumb} transparent`,
				},
			})}
		>
			<Box
				ref={dropIndicatorRef}
				aria-hidden='true'
				sx={(theme) => ({
					position: 'absolute',
					zIndex: 5,
					top: 0,
					left: 0,
					right: 0,
					height: 2,
					backgroundColor: theme.palette.primary.main,
					pointerEvents: 'none',
					visibility: 'hidden',
					willChange: 'transform',
				})}
			/>
			<DataGrid
				rows={rows}
				columns={columns}
				columnVisibilityModel={{
					value: true,
					remove: allowRemove,
				}}
				getRowClassName={({ id }) =>
					String(id) === selectedDragSlot ? 'drag-source-selected' : ''
				}
				disableColumnResize={false}
				disableColumnMenu
				disableColumnFilter
				disableColumnSorting
				disableRowSelectionOnClick
				hideFooter
				rowHeight={44}
				columnHeaderHeight={36}
				density='compact'
				slots={{ noRowsOverlay: NoRowsOverlay }}
			/>
		</Paper>
	)
}
