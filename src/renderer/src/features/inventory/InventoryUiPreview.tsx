import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { ItemDetailsTooltip } from './ItemDetailsTooltip'
import { getItemIcon } from './itemIcons'
import { getItemName } from './itemNames'
import { MissingItemImage } from './MissingItemImage'
import {
	getInventoryEntries,
	getLoadoutEntries,
	getPlayerInventory,
	getPlayerInventorySlotCount,
} from './model'
import type { InventoryEntry, SaveData } from './types'

const hotbarLabels = ['1', '2', '3', '4', 'PgU', 'PgD', 'Home', 'End']
const hotbarTints = [
	'#9a5fa8',
	'#b08a3c',
	'#568b84',
	'#7294a0',
	'#54828c',
	'#587d9b',
	'#ab8052',
	'#a15656',
]
const inventorySections = [
	{ id: 'items', label: 'Inventory', icon: '▣', start: 8 },
	{ id: 'runes', label: 'Runes', icon: '◉', start: 40 },
	{ id: 'arrows', label: 'Arrows', icon: '▤', start: 72 },
	{ id: 'quest-items', label: 'Quest Items', icon: '♜', start: 104 },
] as const
const loadoutTints = [
	'#9a5fa8',
	'#645c73',
	'#604a74',
	'#474741',
	'#904d48',
	'#6d6746',
]
function PreviewItem({
	entry,
	label,
	tint,
}: {
	entry?: InventoryEntry
	label?: string
	tint: string
}) {
	const item = entry?.[1]
	const name = item ? (getItemName(item.ItemData) ?? item.ItemData) : undefined
	const icon = item ? getItemIcon(item.ItemData) : undefined

	return (
		<Tooltip
			title={
				item ? (
					<ItemDetailsTooltip
						itemId={item.ItemData}
						name={name ?? item.ItemData}
						durability={
							typeof item.Durability === 'number' ? item.Durability : null
						}
					/>
				) : (
					''
				)
			}
			disableHoverListener={!item}
			arrow
			placement='top'
			enterDelay={300}
		>
			<Box
				sx={{
					position: 'relative',
					width: '100%',
					aspectRatio: '1',
					minWidth: 0,
					display: 'grid',
					placeItems: 'center',
					overflow: 'hidden',
					border: '1px solid rgba(226, 207, 163, 0.12)',
					borderBottom: `3px solid ${item && icon ? tint : 'rgba(226, 207, 163, 0.08)'}`,
					background: item
						? `linear-gradient(145deg, rgba(210, 192, 156, 0.10), transparent 58%), ${tint}22`
						: 'linear-gradient(145deg, rgba(0,0,0,.12), rgba(255,255,255,.012))',
					boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.4)',
				}}
			>
				{label && (
					<Typography
						sx={{
							position: 'absolute',
							top: 2,
							left: 4,
							color: 'rgba(239, 226, 199, 0.78)',
							fontFamily: 'Georgia, serif',
							fontSize: { xs: 8, sm: 10 },
							lineHeight: 1,
							textShadow: '0 1px 2px #000',
						}}
					>
						{label}
					</Typography>
				)}
				{icon ? (
					<Box
						component='img'
						src={icon}
						alt={name ?? ''}
						draggable={false}
						sx={{
							width: '74%',
							height: '74%',
							objectFit: 'contain',
							filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.8))',
						}}
					/>
				) : item ? (
					<MissingItemImage fill />
				) : null}
				{item && typeof item.Count === 'number' && item.Count > 1 && (
					<Typography
						sx={{
							position: 'absolute',
							right: 3,
							bottom: 2,
							color: '#eee4d2',
							fontFamily: 'Georgia, serif',
							fontSize: 9,
							textShadow: '0 1px 2px #000',
						}}
					>
						{item.Count}
					</Typography>
				)}
			</Box>
		</Tooltip>
	)
}

function indexEntries(entries: InventoryEntry[]): Map<string, InventoryEntry> {
	return new Map(
		entries.map((entry) => [entry[0], entry] as [string, InventoryEntry]),
	)
}

interface InventoryUiPreviewProps {
	saveData: SaveData | null
}

export function InventoryUiPreview({ saveData }: InventoryUiPreviewProps) {
	const [selectedSection, setSelectedSection] =
		useState<(typeof inventorySections)[number]['id']>('items')
	const playerInventory = useMemo(
		() => getPlayerInventory(saveData),
		[saveData],
	)
	const playerInventoryEntries = useMemo(
		() => getInventoryEntries(playerInventory),
		[playerInventory],
	)
	const inventoryBySlot = useMemo(
		() => indexEntries(playerInventoryEntries),
		[playerInventoryEntries],
	)
	const loadoutBySlot = useMemo(
		() => indexEntries(getLoadoutEntries(saveData)),
		[saveData],
	)
	const inventoryCapacity = Math.max(
		136,
		getPlayerInventorySlotCount(playerInventory),
	)
	const activeSection =
		inventorySections.find((section) => section.id === selectedSection) ??
		inventorySections[0]
	const mainInventorySlots = Array.from({ length: 32 }, (_, index) =>
		String(activeSection.start + index),
	)
	const occupiedPreviewSlots = playerInventoryEntries.filter(([slot]) => {
		const slotIndex = Number(slot)
		return (
			Number.isSafeInteger(slotIndex) &&
			slotIndex >= activeSection.start &&
			slotIndex < inventoryCapacity
		)
	}).length

	return (
		<Box
			sx={{
				flex: 1,
				minHeight: 0,
				overflow: 'auto',
				pb: 2,
			}}
		>
			<Paper
				elevation={0}
				sx={{
					width: '100%',
					maxWidth: 820,
					mx: 'auto',
					p: { xs: 0.75, sm: 1.25 },
					border: '1px solid #d5a743',
					borderRadius: 0,
					background:
						'linear-gradient(135deg, #8e6525 0%, #e3bc61 12%, #815a21 50%, #e0b75a 88%, #76511f 100%)',
					boxShadow: '0 8px 24px rgba(0,0,0,.42)',
				}}
			>
				<Box
					sx={{
						position: 'relative',
						p: { xs: 1.5, sm: 2.5 },
						border: '1px solid rgba(241, 215, 154, .68)',
						outline: '1px solid rgba(29, 24, 20, .9)',
						outlineOffset: '-5px',
						backgroundColor: '#292725',
						backgroundImage:
							'radial-gradient(ellipse at 25% 20%, rgba(189, 168, 132, .10), transparent 45%), radial-gradient(ellipse at 80% 80%, rgba(145, 126, 100, .08), transparent 50%), repeating-linear-gradient(0deg, rgba(255,255,255,.012) 0 1px, transparent 1px 3px), linear-gradient(135deg, #312e2b, #222120 50%, #302d2a)',
						color: '#d8cbb4',
					}}
				>
					<Stack
						direction='row'
						spacing={{ xs: 0.5, sm: 1.25 }}
						sx={{ mb: 2, alignItems: 'stretch' }}
					>
						{hotbarLabels.map((label, index) => (
							<Box key={label} sx={{ flex: 1, minWidth: 0 }}>
								<PreviewItem
									entry={inventoryBySlot.get(String(index))}
									label={label}
									tint={hotbarTints[index]}
								/>
							</Box>
						))}
					</Stack>

					<Stack
						direction='row'
						spacing={0.8}
						sx={{
							mb: 1.6,
							pb: 1,
							justifyContent: 'center',
							borderBottom: '1px solid rgba(217, 197, 158, .2)',
						}}
					>
						{inventorySections.map((section) => (
							<Box
								key={section.id}
								component='button'
								type='button'
								title={section.label}
								aria-label={section.label}
								aria-pressed={selectedSection === section.id}
								onClick={() => setSelectedSection(section.id)}
								sx={{
									width: { xs: 36, sm: 56 },
									height: { xs: 32, sm: 40 },
									display: 'grid',
									placeItems: 'center',
									p: 0,
									cursor: 'pointer',
									color:
										selectedSection === section.id
											? '#e2d2a5'
											: 'rgba(213, 204, 184, .55)',
									fontSize: 20,
									border: '1px solid rgba(226, 208, 169, .12)',
									background:
										selectedSection === section.id
											? 'linear-gradient(145deg, rgba(208, 178, 108, .55), rgba(123, 99, 54, .35))'
											: 'rgba(255,255,255,.035)',
									boxShadow:
										selectedSection === section.id
											? '0 0 12px rgba(215, 181, 104, .24)'
											: 'none',
									'&:hover': {
										borderColor: 'rgba(226, 208, 169, .45)',
									},
								}}
							>
								{section.icon}
							</Box>
						))}
					</Stack>

					<Box
						sx={{
							display: 'grid',
							gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
							gap: { xs: 0.5, sm: 1 },
							px: { xs: 0, sm: 1 },
						}}
					>
						{mainInventorySlots.map((slot, index) => (
							<Box
								key={slot}
								sx={{
									aspectRatio: '1',
									minWidth: 0,
									display: 'grid',
									placeItems: 'center',
									border: '1px solid rgba(211, 196, 166, .035)',
									background:
										'linear-gradient(145deg, rgba(0,0,0,.12), rgba(255,255,255,.012))',
									boxShadow: 'inset 0 0 12px rgba(0,0,0,.12)',
								}}
							>
								<PreviewItem
									entry={inventoryBySlot.get(slot)}
									tint={hotbarTints[index % hotbarTints.length]}
								/>
							</Box>
						))}
					</Box>

					<Typography
						sx={{
							mt: 2.4,
							mb: 0.8,
							color: 'rgba(226, 215, 196, .82)',
							fontFamily: 'Georgia, serif',
							fontSize: 13,
							letterSpacing: 2,
						}}
					>
						ARMOUR
					</Typography>
					<Stack
						direction='row'
						spacing={{ xs: 0.6, sm: 1.1 }}
						sx={{ alignItems: 'stretch', maxWidth: 540 }}
					>
						{['0', '1', '2', '3', '4', '11'].map((slot, index) => (
							<Box key={slot} sx={{ flex: 1, minWidth: 0 }}>
								<PreviewItem
									entry={loadoutBySlot.get(slot)}
									tint={loadoutTints[index]}
								/>
							</Box>
						))}
						<Box
							sx={{
								flex: 0.75,
								minWidth: 0,
								display: 'grid',
								placeItems: 'center',
								color: '#2b2a20',
								fontSize: 18,
								fontWeight: 700,
								background:
									'radial-gradient(circle, #e9f2bb 0 35%, #9ec451 36% 58%, #566e35 59% 66%, transparent 67%)',
								textShadow: '0 1px 0 rgba(255,255,255,.45)',
							}}
						>
							8
						</Box>
					</Stack>

					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 1.2,
							mt: 2.2,
							pt: 1.2,
							borderTop: '1px solid rgba(217, 197, 158, .2)',
						}}
					>
						<Box
							aria-hidden='true'
							sx={{
								width: 26,
								height: 26,
								flexShrink: 0,
								display: 'grid',
								placeItems: 'center',
								borderRadius: '50%',
								background: 'linear-gradient(145deg, #e6c28a, #906d43)',
								color: '#35291e',
								fontSize: 14,
							}}
						>
							♟
						</Box>
						<Typography
							sx={{
								flexShrink: 0,
								fontFamily: 'Georgia, serif',
								fontSize: 12,
								letterSpacing: 2,
								color: 'rgba(232, 220, 199, .72)',
							}}
						>
							{occupiedPreviewSlots}/{inventoryCapacity}
						</Typography>
						<Box
							sx={{
								height: 12,
								flex: 1,
								maxWidth: 260,
								border: '1px solid rgba(233, 203, 134, .52)',
								background: `linear-gradient(90deg, #c99d4c 0%, #ebc86d ${(occupiedPreviewSlots / inventoryCapacity) * 100}%, rgba(0,0,0,.25) ${(occupiedPreviewSlots / inventoryCapacity) * 100}%)`,
								boxShadow: '0 0 8px rgba(221, 181, 98, .18)',
							}}
						/>
					</Box>
				</Box>
			</Paper>
		</Box>
	)
}
