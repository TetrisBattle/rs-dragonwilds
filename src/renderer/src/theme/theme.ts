import { createTheme, type ThemeOptions } from '@mui/material'
import { deepmerge } from '@mui/utils'
import { defaultTheme } from './defaultTheme'

const customTheme: ThemeOptions = {
	palette: {
		mode: 'dark',
		primary: {
			main: '#d5a660',
			contrastText: '#1a1712',
		},
		background: {
			default: '#0d100f',
			paper: '#141917',
		},
		text: {
			primary: '#eef2ee',
			secondary: '#89958e',
		},
		divider: '#2a332f',
		surfaceRaised: '#1a201d',
		surfaceHeader: '#111513',
		surfaceSelected: '#28251e',
		surfaceHover: '#1b211e',
		surfaceInput: '#101412',
		surfaceAccent: '#3a3021',
		borderAccent: '#625035',
		borderSubtle: '#343a36',
		textMuted: '#748078',
		textSubtle: '#758078',
		textItem: '#d9dfdb',
		textDisabled: '#78817b',
		scrollbarThumb: '#39433d',
		errorSurface: '#311f1e',
		errorText: '#ffd4cf',
		successSurface: '#1d2b23',
		successText: '#d8f2df',
	},
}

export const theme = createTheme(deepmerge(defaultTheme, customTheme))
