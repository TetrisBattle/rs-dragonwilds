import {
	Alert,
	Box,
	Button,
	CircularProgress,
	InputAdornment,
	Menu,
	MenuItem,
	Paper,
	Stack,
	TextField,
	Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { SaveSummary } from '../../../../shared/save'
import { PersonalChestTable } from './InventoryTable'
import { getItemName, getKnownItems } from './itemNames'
import { getPersonalChest, getPersonalChestEntries } from './model'
import type { EditableItemField, PersonalChestEntry, SaveData } from './types'

interface PersonalChestWorkspaceProps {
	selectedFile: string | null
	selectedSave?: SaveSummary
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
	onChangeItemType: (slot: string, itemId: string) => void
	onAddItem: (itemId: string) => void
}

function filterPersonalChestEntries(
	entries: PersonalChestEntry[],
	query: string,
): PersonalChestEntry[] {
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
					Select one of your saves from the left to view its personal chest.
					Your original save is backed up automatically when you save changes.
				</Typography>
			</Box>
		</Paper>
	)
}

function PersonalChestHelp() {
	return (
		<Paper
			elevation={0}
			sx={(theme) => ({
				display: 'flex',
				alignItems: 'center',
				gap: 1.2,
				p: 1.7,
				mb: 2,
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: 2.5,
				bgcolor: theme.palette.background.paper,
			})}
		>
			<Typography sx={{ color: 'primary.main', fontSize: 15 }}>i</Typography>
			<Typography
				sx={{ color: 'text.secondary', fontSize: 11, lineHeight: 1.5 }}
			>
				Mapped item IDs show friendly names; hover over a name to see its ID.
				Unmapped items still show their ID. Close the game before editing to
				avoid it overwriting your changes.
			</Typography>
		</Paper>
	)
}

export function PersonalChestWorkspace({
	selectedFile,
	selectedSave,
	saveData,
	loadingFile,
	error,
	notice,
	onCloseError,
	onCloseNotice,
	onUpdateItem,
	onChangeItemType,
	onAddItem,
}: PersonalChestWorkspaceProps) {
	const [search, setSearch] = useState('')
	const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
	const personalChest = useMemo(() => getPersonalChest(saveData), [saveData])
	const allEntries = useMemo(
		() => getPersonalChestEntries(personalChest),
		[personalChest],
	)
	const knownItems = useMemo(() => getKnownItems(), [])
	const visibleEntries = useMemo(
		() => filterPersonalChestEntries(allEntries, search),
		[allEntries, search],
	)

	return (
		<Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, md: 4 }, py: 3.2 }}>
			<Box sx={{ maxWidth: 1120, mx: 'auto' }}>
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

				<Stack
					direction='row'
					sx={{
						mb: 2.5,
						justifyContent: 'space-between',
						alignItems: 'flex-end',
					}}
				>
					<Box>
						<Typography
							sx={{
								color: 'primary.main',
								fontSize: 10,
								fontWeight: 700,
								letterSpacing: 2,
							}}
						>
							PERSONAL CHEST
						</Typography>
						<Typography
							sx={{
								mt: 0.65,
								fontSize: 27,
								fontWeight: 650,
								letterSpacing: -0.6,
							}}
						>
							Personal Chest
						</Typography>
						<Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 12 }}>
							{selectedSave
								? `${allEntries.length} items · ${selectedSave.fileName}`
								: 'Select a character save to inspect its items.'}
						</Typography>
					</Box>
					{saveData && (
						<Typography
							sx={{
								display: { xs: 'none', sm: 'block' },
								color: 'text.secondary',
								fontSize: 10,
								textAlign: 'right',
							}}
						>
							Unsaved edits are kept in memory until you save.
						</Typography>
					)}
				</Stack>

				{!selectedFile && !loadingFile ? (
					<EmptyCharacterState />
				) : loadingFile ? (
					<Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
						<CircularProgress size={28} color='primary' />
					</Box>
				) : (
					<>
						<PersonalChestHelp />
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
								{visibleEntries.length} of {allEntries.length} personal chest
								items
							</Typography>
							<Button
								variant='outlined'
								onClick={(event) => setAddMenuAnchor(event.currentTarget)}
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
							<Menu
								anchorEl={addMenuAnchor}
								open={Boolean(addMenuAnchor)}
								onClose={() => setAddMenuAnchor(null)}
								slotProps={{
									paper: {
										sx: { maxHeight: 360, minWidth: 220 },
									},
								}}
							>
								{knownItems.map((item) => (
									<MenuItem
										key={item.id}
										onClick={() => {
											onAddItem(item.id)
											setAddMenuAnchor(null)
										}}
									>
										{item.name}
									</MenuItem>
								))}
							</Menu>
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
						<PersonalChestTable
							entries={visibleEntries}
							onUpdateItem={onUpdateItem}
							onChangeItemType={onChangeItemType}
						/>
					</>
				)}
			</Box>
		</Box>
	)
}
