import { createTheme, type ThemeOptions } from '@mui/material'
import { deepmerge } from '@mui/utils'
import { defaultTheme } from './defaultTheme'

const customTheme: ThemeOptions = {
	palette: {
		mode: 'dark',
		// primary: {
		// 	main: '#BB85FC',
		// },
		// secondary: {
		// 	main: '#10DAC6',
		// },
	},
}

export const theme = createTheme(deepmerge(defaultTheme, customTheme))
