import { Box, Typography } from '@mui/material'
import { AppHeader } from './components/AppHeader'
import { DiscardChangesDialog } from './components/DiscardChangesDialog'
import { PersonalChestWorkspace } from './features/inventory/InventoryWorkspace'
import { CharacterSidebar } from './features/saves/CharacterSidebar'
import { useSaveEditor } from './features/saves/useSaveEditor'

export const App = () => {
	const editor = useSaveEditor()
	const selectedSave = editor.saves.find(
		(save) => save.fileName === editor.selectedFile,
	)

	return (
		<Box
			sx={(theme) => ({
				display: 'flex',
				height: '100vh',
				minHeight: 620,
				bgcolor: theme.palette.background.default,
				color: theme.palette.text.primary,
				fontFamily: 'Inter, "Segoe UI", sans-serif',
				overflow: 'hidden',
			})}
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
				<AppHeader
					selectedSave={selectedSave}
					loadingSaves={editor.loadingSaves}
					saving={editor.saving}
					dirty={editor.dirty}
					hasSaveData={editor.saveData !== null}
					onRefresh={editor.requestRefresh}
					onSave={() => void editor.saveChanges()}
				/>

				<PersonalChestWorkspace
					selectedFile={editor.selectedFile}
					selectedSave={selectedSave}
					saveData={editor.saveData}
					loadingFile={editor.loadingFile}
					error={editor.error}
					notice={editor.notice}
					onCloseError={editor.closeError}
					onCloseNotice={editor.closeNotice}
					onUpdateItem={editor.updateItem}
					onAddItem={editor.addItem}
					onRemoveItem={editor.removeItem}
					onMoveItem={editor.moveItem}
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
