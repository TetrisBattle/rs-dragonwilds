'use client'

import { CssBaseline, ThemeProvider } from '@mui/material'
import { theme } from './theme'

type MuiThemeProviderProps = {
	children: React.ReactNode
}

export const MuiThemeProvider = ({ children }: MuiThemeProviderProps) => {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</ThemeProvider>
	)
}
