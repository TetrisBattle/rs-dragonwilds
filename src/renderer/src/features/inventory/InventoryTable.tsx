import DeleteIcon from '@mui/icons-material/Delete'
import {
	Box,
	IconButton,
	Paper,
	Stack,
	TextField,
	Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useRef, useState } from 'react'
import { getItemIcon } from './itemIcons'
import { getItemName } from './itemNames'
import type { EditableItemField, InventoryEntry } from './types'

interface InventoryTableProps {
	entries: InventoryEntry[]
	slotCount: number
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
}

interface InventoryGridRow {
	id: string
	slot: string
	itemName: string
	itemIcon: string | undefined
	isKnownItem: boolean
	isEmpty: boolean
	field: EditableItemField | null
	value: string | null
	onQuantityChange?: (field: EditableItemField, value: string) => void
	onQuantityBlur?: (field: EditableItemField, value: string) => void
	onRemove?: () => void
}

function getEditableField(item: InventoryEntry[1]): EditableItemField | null {
	if (typeof item.Count === 'number') return 'Count'
	if (typeof item.Durability === 'number') return 'Durability'
	return null
}

function renderSlotCell(row: InventoryGridRow) {
	return (
		<Stack
			sx={{
				width: '100%',
				height: '100%',
				justifyContent: 'center',
				cursor: row.isEmpty ? 'default' : 'grab',
			}}
		>
			<Typography
				sx={{
					color: 'text.secondary',
					fontSize: 11,
					fontFamily: 'Consolas, monospace',
					lineHeight: 1,
				}}
			>
				{row.slot.padStart(2, '0')}
			</Typography>
		</Stack>
	)
}

function renderItemCell(row: InventoryGridRow) {
	return (
		<Stack
			direction='row'
			spacing={1}
			draggable={!row.isEmpty}
			onDragStart={(event) => {
				event.dataTransfer.setData('text/plain', row.slot)
				event.dataTransfer.effectAllowed = 'move'
			}}
			sx={{
				alignItems: 'center',
				minWidth: 0,
				width: '100%',
				height: '100%',
				cursor: row.isEmpty ? 'default' : 'grab',
			}}
		>
			{row.itemIcon && (
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
			)}
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
}

function renderQuantityCell(row: InventoryGridRow) {
	if (row.isEmpty) return null
	if (!row.field || row.value === null) {
		return (
			<Typography
				sx={{ color: 'textSubtle', fontSize: 10, textAlign: 'center' }}
			>
				Unique item
			</Typography>
		)
	}

	const field = row.field
	return (
		<Stack
			direction='row'
			sx={{
				width: '100%',
				height: '100%',
				alignItems: 'center',
				justifyContent: 'center',
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
				fullWidth
				sx={(theme) => ({
					width: '100%',
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

const columns: GridColDef<InventoryGridRow>[] = [
	{
		field: 'slot',
		headerName: 'SLOT',
		width: 90,
		minWidth: 60,
		resizable: true,
		sortable: false,
		renderCell: ({ row }) => renderSlotCell(row),
	},
	{
		field: 'itemName',
		headerName: 'ITEM',
		flex: 1,
		minWidth: 200,
		resizable: true,
		sortable: false,
		renderCell: ({ row }) => renderItemCell(row),
	},
	{
		field: 'value',
		headerName: 'QUANTITY',
		width: 190,
		minWidth: 120,
		resizable: true,
		sortable: false,
		align: 'center',
		headerAlign: 'center',
		renderCell: ({ row }) => renderQuantityCell(row),
	},
	{
		field: 'remove',
		headerName: 'REMOVE',
		width: 90,
		minWidth: 70,
		resizable: true,
		sortable: false,
		align: 'center',
		headerAlign: 'center',
		renderCell: ({ row }) =>
			row.isEmpty ? null : (
				<IconButton
					color='error'
					size='small'
					aria-label={`Remove ${row.itemName} from slot ${row.slot}`}
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
	slotCount,
	onUpdateItem,
	onRemoveItem,
	onMoveItem,
	showEmptySlots,
}: InventoryTableProps) {
	const [draftValues, setDraftValues] = useState<Record<string, string>>({})
	const dropIndicatorRef = useRef<HTMLDivElement>(null)
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
		const durabilityDraftKey = `${slot}:Durability`
		const field = Object.hasOwn(draftValues, countDraftKey)
			? 'Count'
			: Object.hasOwn(draftValues, durabilityDraftKey)
				? 'Durability'
				: getEditableField(item)
		const itemName = getItemName(item.ItemData)
		const itemIcon = getItemIcon(item.ItemData)

		return {
			id: slot,
			slot,
			itemName: itemName ?? item.ItemData,
			itemIcon,
			isKnownItem: itemName !== undefined,
			isEmpty: false,
			field,
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
			onRemove: () => {
				setDraftValues((current) => {
					const next = { ...current }
					delete next[countDraftKey]
					delete next[durabilityDraftKey]
					return next
				})
				onRemoveItem(slot)
			},
		}
	})
	const occupiedSlots = new Set(occupiedRows.map((row) => row.slot))
	const emptyRows: InventoryGridRow[] = Array.from(
		{ length: slotCount },
		(_, slot) => String(slot),
	)
		.filter((slot) => !occupiedSlots.has(slot))
		.map((slot) => ({
			id: slot,
			slot,
			itemName: '',
			itemIcon: undefined,
			isKnownItem: true,
			isEmpty: true,
			field: null,
			value: null,
		}))
	const rows = [...occupiedRows, ...(showEmptySlots ? emptyRows : [])].sort(
		(left, right) => Number(left.slot) - Number(right.slot),
	)

	return (
		<Paper
			elevation={0}
			onDragOverCapture={(event) => {
				const target = (event.target as HTMLElement).closest<HTMLElement>(
					'.MuiDataGrid-row',
				)
				if (!target) return
				event.preventDefault()
				const targetSlot = target.dataset.id
				const fromSlot = event.dataTransfer.getData('text/plain')
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
				const fromSlot = event.dataTransfer.getData('text/plain')
				const target = dropTargetRef.current
				if (fromSlot && target) {
					event.preventDefault()
					onMoveItem(fromSlot, target.slot, target.position)
				}
				clearDropIndicator()
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					clearDropIndicator()
				}
			}}
			onDragEndCapture={clearDropIndicator}
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
				},
				'& .MuiDataGrid-cell[data-field="value"]': {
					px: 0,
				},
				'& .MuiDataGrid-row': {
					bgcolor: theme.palette.background.paper,
				},
				'& .MuiDataGrid-row:hover': {
					bgcolor: `${theme.palette.surfaceRaised} !important`,
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
