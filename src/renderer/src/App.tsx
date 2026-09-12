import { Box } from '@mui/material'
import { useEffect } from 'react'

export const App = () => {
	useEffect(() => {
		window.api.ping()
	}, [])

	return <Box sx={{ p: 2 }}>Hello world</Box>
}
