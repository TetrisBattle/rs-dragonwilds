import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from '@mui/material'
import type { SaveSummary } from '../../../shared/save'

interface DiscardChangesDialogProps {
	currentCharacter?: string
	pendingSave: SaveSummary | null
	onClose: () => void
	onConfirm: () => void
}

export function DiscardChangesDialog({
	currentCharacter,
	pendingSave,
	onClose,
	onConfirm,
}: DiscardChangesDialogProps) {
	return (
		<Dialog
			open={pendingSave !== null}
			onClose={onClose}
			slotProps={{
				paper: {
					sx: (theme) => ({
						bgcolor: theme.palette.surfaceRaised,
						color: theme.palette.text.primary,
					}),
				},
			}}
		>
			<DialogTitle sx={{ fontSize: 17, fontWeight: 650 }}>
				Discard unsaved changes?
			</DialogTitle>
			<DialogContent>
				<DialogContentText
					sx={(theme) => ({
						color: theme.palette.text.secondary,
						fontSize: 13,
					})}
				>
					Your edits to {currentCharacter ?? 'this save'} have not been saved.
					Open {pendingSave?.characterName ?? 'the selected character'} without
					saving?
				</DialogContentText>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button
					variant='text'
					onClick={onClose}
					sx={(theme) => ({ color: theme.palette.text.secondary })}
				>
					Keep editing
				</Button>
				<Button
					onClick={onConfirm}
					sx={(theme) => ({
						bgcolor: theme.palette.primary.main,
						color: theme.palette.primary.contrastText,
						fontWeight: 700,
					})}
				>
					Discard and open
				</Button>
			</DialogActions>
		</Dialog>
	)
}
