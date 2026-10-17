import RefreshIcon from '@mui/icons-material/Refresh'
import SaveIcon from '@mui/icons-material/Save'
import {
	Box,
	CircularProgress,
	IconButton,
	Stack,
	Tooltip,
	Typography,
} from '@mui/material'

interface AppHeaderProps {
	loadingSaves: boolean
	saving: boolean
	dirty: boolean
	hasSaveData: boolean
	onRefresh: () => void
	onSave: () => void
}

export function AppHeader({
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
				<Typography sx={{ fontWeight: 650, fontSize: 20 }}>
					Personal Chest
				</Typography>
			</Box>
			<Stack direction='row' spacing={1.2} sx={{ alignItems: 'center' }}>
				<Tooltip title='Refresh'>
					<span>
						<IconButton
							aria-label='Refresh saves'
							onClick={onRefresh}
							disabled={loadingSaves || saving}
							sx={(theme) => ({
								color: theme.palette.text.secondary,
								border: `1px solid ${theme.palette.divider}`,
								borderRadius: 1,
								'&:hover': { borderColor: theme.palette.text.secondary },
							})}
						>
							<RefreshIcon />
						</IconButton>
					</span>
				</Tooltip>
				<Tooltip title={saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}>
					<span>
						<IconButton
							aria-label={saving ? 'Saving' : dirty ? 'Save changes' : 'Saved'}
							onClick={onSave}
							disabled={!dirty || saving || !hasSaveData}
							sx={(theme) => ({
								bgcolor: dirty
									? theme.palette.primary.main
									: theme.palette.borderSubtle,
								color: dirty
									? theme.palette.primary.contrastText
									: theme.palette.textDisabled,
								borderRadius: 1,
								'&:hover': { bgcolor: theme.palette.primary.light },
								'&.Mui-disabled': {
									bgcolor: theme.palette.borderSubtle,
									color: theme.palette.textDisabled,
								},
							})}
						>
							{saving ? (
								<CircularProgress size={20} color='inherit' />
							) : (
								<SaveIcon />
							)}
						</IconButton>
					</span>
				</Tooltip>
			</Stack>
		</Box>
	)
}
