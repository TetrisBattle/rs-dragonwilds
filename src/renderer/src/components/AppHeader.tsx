import { Box, Button, Stack, Typography } from '@mui/material'
import type { SaveSummary } from '../../../shared/save'

interface AppHeaderProps {
	selectedSave?: SaveSummary
	loadingSaves: boolean
	saving: boolean
	dirty: boolean
	hasSaveData: boolean
	onRefresh: () => void
	onSave: () => void
}

export function AppHeader({
	selectedSave,
	loadingSaves,
	saving,
	dirty,
	hasSaveData,
	onRefresh,
	onSave,
}: AppHeaderProps) {
	return (
		<Box
			component='header'
			sx={(theme) => ({
				height: 70,
				flexShrink: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				px: 3.5,
				borderBottom: `1px solid ${theme.palette.divider}`,
				bgcolor: theme.palette.surfaceHeader,
			})}
		>
			<Box>
				<Typography
					sx={(theme) => ({
						color: theme.palette.text.secondary,
						fontSize: 10,
						letterSpacing: 1.4,
					})}
				>
					SAVE WORKSHOP / PERSONAL CHEST
				</Typography>
				<Typography sx={{ mt: 0.4, fontWeight: 650, fontSize: 14 }}>
					{selectedSave?.characterName ?? 'Choose a character'}
				</Typography>
			</Box>
			<Stack direction='row' spacing={1.2} sx={{ alignItems: 'center' }}>
				<Button
					variant='outlined'
					onClick={onRefresh}
					disabled={loadingSaves || saving}
					sx={(theme) => ({
						color: theme.palette.text.secondary,
						borderColor: theme.palette.divider,
						fontSize: 12,
						'&:hover': { borderColor: theme.palette.text.secondary },
					})}
				>
					Refresh
				</Button>
				<Button
					onClick={onSave}
					disabled={!dirty || saving || !hasSaveData}
					sx={(theme) => ({
						bgcolor: dirty
							? theme.palette.primary.main
							: theme.palette.borderSubtle,
						color: dirty
							? theme.palette.primary.contrastText
							: theme.palette.textDisabled,
						fontWeight: 700,
						fontSize: 12,
						'&:hover': { bgcolor: theme.palette.primary.light },
						'&.Mui-disabled': {
							bgcolor: theme.palette.borderSubtle,
							color: theme.palette.textDisabled,
						},
					})}
				>
					{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
				</Button>
			</Stack>
		</Box>
	)
}
