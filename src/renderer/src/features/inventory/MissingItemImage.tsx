import { Box } from '@mui/material'
import missingItemImage from './assets/no-image.jpg'

interface MissingItemImageProps {
	size?: number
	fill?: boolean
}

export function MissingItemImage({
	size = 28,
	fill = false,
}: MissingItemImageProps) {
	return (
		<Box
			component='img'
			src={missingItemImage}
			alt='Item image not available'
			title='Item image not available'
			sx={{
				position: fill ? 'absolute' : 'static',
				inset: fill ? 0 : 'auto',
				width: fill ? '100%' : size,
				height: fill ? '100%' : size,
				boxSizing: 'border-box',
				flexShrink: 0,
				objectFit: 'contain',
			}}
		/>
	)
}
