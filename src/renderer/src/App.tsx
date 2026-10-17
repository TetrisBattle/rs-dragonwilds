import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { DiscardChangesDialog } from './components/DiscardChangesDialog'
import { InventoryWorkspace } from './features/inventory/InventoryWorkspace'
import type { InventoryView } from './features/inventory/types'
import { CharacterSidebar } from './features/saves/CharacterSidebar'
import { useSaveEditor } from './features/saves/useSaveEditor'

export const App = () => {
	const editor = useSaveEditor()
	const selectedSave = editor.saves.find(
		(save) => save.fileName === editor.selectedFile,
	)
	const [inventoryView, setInventoryView] =
		useState<InventoryView>('personal-chest')

	return (
		<Box
			sx={(theme) => ({
				display: 'flex',
				height: '100vh',
				minHeight: 620,
				flexDirection: 'column',
				bgcolor: theme.palette.background.default,
				color: theme.palette.text.primary,
				fontFamily: 'Inter, "Segoe UI", sans-serif',
				overflow: 'hidden',
			})}
		>
			<AppHeader
				loadingSaves={editor.loadingSaves}
				saving={editor.saving}
				dirty={editor.dirty}
				hasSaveData={editor.saveData !== null}
				onRefresh={editor.requestRefresh}
				onSave={() => void editor.saveChanges()}
			/>

			<Box
				sx={{
					display: 'flex',
					flex: 1,
					minHeight: 0,
					minWidth: 0,
				}}
			>
				<CharacterSidebar
					saves={editor.saves}
					selectedFile={editor.selectedFile}
					loading={editor.loadingSaves}
					onSelect={editor.selectSave}
				/>

				<Box
					sx={{
						display: 'flex',
						flex: 1,
						minWidth: 0,
						minHeight: 0,
						flexDirection: 'column',
					}}
				>
					<InventoryWorkspace
						view={inventoryView}
						onViewChange={setInventoryView}
						selectedFile={editor.selectedFile}
						saveData={editor.saveData}
						loadingFile={editor.loadingFile}
						error={editor.error}
						notice={editor.notice}
						onCloseError={editor.closeError}
						onCloseNotice={editor.closeNotice}
						onUpdateItem={editor.updateItem}
						onUpdateInventoryItem={editor.updatePlayerInventoryItem}
						onUpdateLoadoutItem={editor.updateLoadoutItem}
						onAddItem={editor.addItem}
						onRemoveItem={editor.removeItem}
						onRemoveInventoryItem={editor.removePlayerInventoryItem}
						onMoveItem={editor.moveItem}
						onMoveInventoryItem={editor.movePlayerInventoryItem}
					/>

					<Box
						component='footer'
						sx={(theme) => ({
							height: 32,
							flexShrink: 0,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							px: 2.5,
							borderTop: `1px solid ${theme.palette.divider}`,
							bgcolor: theme.palette.surfaceHeader,
						})}
					>
						<Typography
							sx={(theme) => ({
								color: theme.palette.text.secondary,
								fontSize: 9,
							})}
						>
							LOCAL SAVE EDITOR · FILES STAY ON THIS DEVICE
						</Typography>
						<Typography
							sx={(theme) => ({
								color: editor.dirty
									? theme.palette.primary.main
									: theme.palette.text.secondary,
								fontSize: 9,
							})}
						>
							{editor.dirty ? 'UNSAVED CHANGES' : 'READY'}
						</Typography>
					</Box>
				</Box>
			</Box>

			<DiscardChangesDialog
				currentCharacter={selectedSave?.characterName}
				pendingSave={editor.pendingSave}
				pendingRefresh={editor.pendingRefresh}
				onClose={editor.closePendingAction}
				onConfirm={editor.confirmPendingAction}
			/>
		</Box>
	)
}
