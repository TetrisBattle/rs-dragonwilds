import {
	MenuItem,
	Paper,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material'
import { useState } from 'react'
import { getItemName, getKnownItems } from './itemNames'
import type { EditableItemField, PersonalChestEntry } from './types'

interface PersonalChestTableProps {
	entries: PersonalChestEntry[]
	onUpdateItem: (
		slot: string,
		field: EditableItemField,
		value: number | null,
	) => void
	onChangeItemType: (slot: string, itemId: string) => void
}

function getEditableField(
	item: PersonalChestEntry[1],
): EditableItemField | null {
	if (typeof item.Count === 'number') return 'Count'
	if (typeof item.Durability === 'number') return 'Durability'
	return 'Count'
}

export function PersonalChestTable({
	entries,
	onUpdateItem,
	onChangeItemType,
}: PersonalChestTableProps) {
	const [draftValues, setDraftValues] = useState<Record<string, string>>({})
	const knownItems = getKnownItems()

	return (
		<TableContainer
			component={Paper}
			elevation={0}
			sx={(theme) => ({
				maxHeight: 'calc(100vh - 350px)',
				minHeight: 220,
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: 2.5,
				bgcolor: theme.palette.background.paper,
				'&::-webkit-scrollbar': { width: 8, height: 8 },
				'&::-webkit-scrollbar-thumb': {
					bgcolor: theme.palette.scrollbarThumb,
					borderRadius: 10,
				},
			})}
		>
			<Table stickyHeader size='small'>
				<TableHead>
					<TableRow>
						<TableCell
							sx={(theme) => ({
								width: 90,
								bgcolor: theme.palette.surfaceRaised,
								color: theme.palette.text.secondary,
								borderColor: theme.palette.divider,
								fontSize: 10,
								fontWeight: 700,
								letterSpacing: 1,
							})}
						>
							SLOT
						</TableCell>
						<TableCell
							sx={(theme) => ({
								bgcolor: theme.palette.surfaceRaised,
								color: theme.palette.text.secondary,
								borderColor: theme.palette.divider,
								fontSize: 10,
								fontWeight: 700,
								letterSpacing: 1,
							})}
						>
							ITEM REFERENCE
						</TableCell>
						<TableCell
							align='right'
							sx={(theme) => ({
								width: 190,
								bgcolor: theme.palette.surfaceRaised,
								color: theme.palette.text.secondary,
								borderColor: theme.palette.divider,
								fontSize: 10,
								fontWeight: 700,
								letterSpacing: 1,
							})}
						>
							QUANTITY / CONDITION
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{entries.map(([slot, item]) => {
						const countDraftKey = `${slot}:Count`
						const durabilityDraftKey = `${slot}:Durability`
						const field = Object.hasOwn(draftValues, countDraftKey)
							? 'Count'
							: Object.hasOwn(draftValues, durabilityDraftKey)
								? 'Durability'
								: getEditableField(item)
						const value = field
							? (draftValues[`${slot}:${field}`] ??
								item[field]?.toString() ??
								'')
							: null
						const itemName = getItemName(item.ItemData) ?? item.ItemData
						return (
							<TableRow
								key={slot}
								hover
								sx={(theme) => ({
									'&:last-child td': { borderBottom: 0 },
									'&:hover': {
										bgcolor: `${theme.palette.surfaceRaised} !important`,
									},
								})}
							>
								<TableCell
									sx={(theme) => ({
										color: theme.palette.text.secondary,
										borderColor: theme.palette.divider,
										fontSize: 11,
										fontFamily: 'Consolas, monospace',
									})}
								>
									{slot.padStart(2, '0')}
								</TableCell>
								<TableCell sx={{ borderColor: 'divider', minWidth: 200 }}>
									<Tooltip title={`Item ID: ${item.ItemData}`}>
										<Select
											value={item.ItemData}
											onChange={(event) =>
												onChangeItemType(slot, event.target.value)
											}
											size='small'
											variant='standard'
											disableUnderline
											inputProps={{ 'aria-label': `Item in slot ${slot}` }}
											sx={(theme) => ({
												width: '100%',
												color: theme.palette.textItem,
												fontFamily: getItemName(item.ItemData)
													? 'inherit'
													: 'Consolas, monospace',
												fontSize: 11,
												'& .MuiSelect-select': {
													overflow: 'hidden',
													textOverflow: 'ellipsis',
												},
											})}
										>
											{!getItemName(item.ItemData) && (
												<MenuItem value={item.ItemData}>{itemName}</MenuItem>
											)}
											{knownItems.map((knownItem) => (
												<MenuItem key={knownItem.id} value={knownItem.id}>
													{knownItem.name}
												</MenuItem>
											))}
										</Select>
									</Tooltip>
								</TableCell>
								<TableCell
									align='right'
									sx={{ borderColor: 'divider', py: 0.65 }}
								>
									{field && value !== null ? (
										<Stack
											direction='row'
											spacing={1}
											sx={{
												alignItems: 'center',
												justifyContent: 'flex-end',
											}}
										>
											<Typography
												sx={{
													color: 'text.secondary',
													fontSize: 10,
													minWidth: 58,
													textAlign: 'right',
												}}
											>
												{field === 'Count' ? 'Quantity' : 'Durability'}
											</Typography>
											<TextField
												type='number'
												value={value ?? ''}
												onChange={(event) => {
													const inputValue = event.target.value
													setDraftValues((current) => ({
														...current,
														[`${slot}:${field}`]: inputValue,
													}))
													if (inputValue === '') {
														onUpdateItem(slot, field, null)
														return
													}

													const nextValue = Number(inputValue)
													if (
														Number.isSafeInteger(nextValue) &&
														nextValue >= 0
													) {
														onUpdateItem(
															slot,
															field,
															nextValue === 0 ? null : nextValue,
														)
													}
												}}
												onBlur={(event) => {
													const key = `${slot}:${field}`
													const inputValue = event.target.value
													const nextValue = Number(inputValue)
													if (
														inputValue === '' ||
														!Number.isSafeInteger(nextValue) ||
														nextValue <= 0
													) {
														onUpdateItem(slot, field, null)
													} else {
														onUpdateItem(slot, field, nextValue)
													}
													setDraftValues((current) => {
														const next = { ...current }
														delete next[key]
														return next
													})
												}}
												slotProps={{
													htmlInput: {
														min: 0,
														step: 1,
														'aria-label': field,
													},
												}}
												sx={(theme) => ({
													width: 90,
													'& input[type=number]': {
														MozAppearance: 'textfield',
													},
													'& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
														{
															WebkitAppearance: 'none',
															margin: 0,
														},
													'& .MuiOutlinedInput-root': {
														height: 32,
														bgcolor: theme.palette.surfaceInput,
														color: theme.palette.text.primary,
														fontSize: 12,
														'& fieldset': {
															borderColor: theme.palette.divider,
														},
													},
												})}
											/>
										</Stack>
									) : (
										<Typography sx={{ color: 'textSubtle', fontSize: 10 }}>
											Unique item
										</Typography>
									)}
								</TableCell>
							</TableRow>
						)
					})}
					{entries.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={3}
								align='center'
								sx={{
									py: 6,
									color: 'text.secondary',
									borderColor: 'divider',
								}}
							>
								No matching personal chest items.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</TableContainer>
	)
}
