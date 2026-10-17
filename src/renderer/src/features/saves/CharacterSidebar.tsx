import {
	Box,
	CircularProgress,
	Divider,
	Stack,
	Typography,
} from '@mui/material'
import type { SaveSummary } from '../../../../shared/save'

interface CharacterSidebarProps {
	saves: SaveSummary[]
	selectedFile: string | null
	loading: boolean
	onSelect: (save: SaveSummary) => void
}

function formatFileSize(size: number): string {
	return `${Math.max(1, Math.round(size / 1024))} KB`
}

export function CharacterSidebar({
	saves,
	selectedFile,
	loading,
	onSelect,
}: CharacterSidebarProps) {
	return (
		<Box
			component='aside'
			sx={(theme) => ({
				display: 'flex',
				flexDirection: 'column',
				width: 280,
				flexShrink: 0,
				bgcolor: theme.palette.background.paper,
				borderRight: `1px solid ${theme.palette.divider}`,
			})}
		>
			<Stack
				direction='row'
				spacing={1.5}
				sx={(theme) => ({
					px: 2.5,
					pt: 2.7,
					pb: 2.5,
					alignItems: 'center',
					color: theme.palette.primary.main,
				})}
			>
				<Box
					sx={{
						width: 38,
						height: 38,
						borderRadius: '12px',
						display: 'grid',
						placeItems: 'center',
						bgcolor: 'surfaceAccent',
						color: 'primary.main',
						fontSize: 19,
						fontWeight: 800,
					}}
				>
					R
				</Box>
				<Box>
					<Typography
						sx={{ fontSize: 15, fontWeight: 750, letterSpacing: 0.2 }}
					>
						RUNEKEEPER
					</Typography>
					<Typography
						sx={{
							color: 'text.secondary',
							fontSize: 10,
							letterSpacing: 1.8,
						}}
					>
						DRAGONWILDS SAVE EDITOR
					</Typography>
				</Box>
			</Stack>

			<Divider sx={{ borderColor: 'divider' }} />
			<Stack
				direction='row'
				sx={{
					px: 2.5,
					pt: 2.8,
					pb: 1.4,
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Typography
					sx={{
						color: 'text.secondary',
						fontSize: 10,
						fontWeight: 700,
						letterSpacing: 1.5,
					}}
				>
					CHARACTERS
				</Typography>
				<Typography sx={{ color: 'text.secondary', fontSize: 11 }}>
					{saves.length}
				</Typography>
			</Stack>

			<Box sx={{ flex: 1, overflowY: 'auto', px: 1.3 }}>
				{loading && saves.length === 0 ? (
					<Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
						<CircularProgress size={22} color='primary' />
					</Box>
				) : saves.length === 0 ? (
					<Typography
						sx={{
							px: 1.2,
							py: 2,
							color: 'text.secondary',
							fontSize: 12,
							lineHeight: 1.6,
						}}
					>
						No character saves found in the Dragonwilds save folder.
					</Typography>
				) : (
					<Stack spacing={0.7}>
						{saves.map((save) => {
							const selected = save.fileName === selectedFile
							return (
								<Box
									key={save.fileName}
									component='button'
									onClick={() => onSelect(save)}
									sx={{
										width: '100%',
										textAlign: 'left',
										border: '1px solid',
										borderColor: selected ? 'borderAccent' : 'transparent',
										borderRadius: 2,
										bgcolor: selected
											? 'surfaceSelected'
											: 'transparent',
										color: 'text.primary',
										cursor: 'pointer',
										px: 1.4,
										py: 1.35,
										'&:hover': {
											bgcolor: selected
												? 'surfaceSelected'
												: 'surfaceHover',
										},
									}}
								>
									<Typography sx={{ fontWeight: 650, fontSize: 13 }}>
										{save.characterName}
									</Typography>
									<Typography
										sx={{
											mt: 0.45,
											color: 'text.secondary',
											fontSize: 10,
											fontFamily: 'Consolas, monospace',
										}}
									>
										{save.fileName}
									</Typography>
									<Typography
										sx={{ mt: 0.8, color: 'textMuted', fontSize: 10 }}
									>
										{formatFileSize(save.size)} ·{' '}
										{new Date(save.lastModified).toLocaleDateString()}
									</Typography>
								</Box>
							)
						})}
					</Stack>
				)}
			</Box>

			<Box sx={{ p: 1.6, borderTop: '1px solid', borderColor: 'divider' }}>
				<Typography
					sx={{ color: 'text.secondary', fontSize: 10, lineHeight: 1.6 }}
				>
					Backups and version files are hidden. Only active .json character
					saves are shown.
				</Typography>
			</Box>
		</Box>
	)
}
