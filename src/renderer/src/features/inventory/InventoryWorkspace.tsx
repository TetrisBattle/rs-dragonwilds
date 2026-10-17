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
	TextField,
	Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { PersonalChestTable } from './InventoryTable'
import { getItemIcon } from './itemIcons'
import { getItemName, getKnownItems } from './itemNames'
import {
	getPersonalChest,
	getPersonalChestEntries,
	PERSONAL_CHEST_SLOT_COUNT,
} from './model'
import type { EditableItemField, PersonalChestEntry, SaveData } from './types'

interface PersonalChestWorkspaceProps {
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
	onAddItem: (itemId: string) => void
	onRemoveItem: (slot: string) => void
	onMoveItem: (
		fromSlot: string,
		toSlot: string,
		position?: 'before' | 'after',
	) => void
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

export function PersonalChestWorkspace({
	selectedFile,
	saveData,
	loadingFile,
	error,
	notice,
	onCloseError,
	onCloseNotice,
	onUpdateItem,
	onAddItem,
	onRemoveItem,
	onMoveItem,
}: PersonalChestWorkspaceProps) {
	const [search, setSearch] = useState('')
	const [showEmptySlots, setShowEmptySlots] = useState(false)
	const [addItemSearch, setAddItemSearch] = useState('')
	const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
	const personalChest = useMemo(() => getPersonalChest(saveData), [saveData])
	const allEntries = useMemo(
		() => getPersonalChestEntries(personalChest),
		[personalChest],
	)
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
		() => filterPersonalChestEntries(allEntries, search),
		[allEntries, search],
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

				{!selectedFile && !loadingFile ? (
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
								{visibleEntries.length} of {PERSONAL_CHEST_SLOT_COUNT} personal
								chest items
							</Typography>
							<FormControlLabel
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
										<MenuItem
											key={item.id}
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
												{getItemIcon(item.id) && (
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
												)}
												{item.name}
											</Stack>
										</MenuItem>
									))
								) : (
									<MenuItem disabled>No matching items</MenuItem>
								)}
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
							onRemoveItem={onRemoveItem}
							onMoveItem={onMoveItem}
							showEmptySlots={showEmptySlots}
						/>
					</>
				)}
			</Box>
		</Box>
	)
}
