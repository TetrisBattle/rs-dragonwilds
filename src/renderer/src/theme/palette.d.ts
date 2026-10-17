import '@mui/material/styles'

declare module '@mui/material/styles' {
	interface Palette {
		surfaceRaised: string
		surfaceHeader: string
		surfaceSelected: string
		surfaceHover: string
		surfaceInput: string
		surfaceAccent: string
		borderAccent: string
		borderSubtle: string
		textMuted: string
		textSubtle: string
		textItem: string
		textDisabled: string
		scrollbarThumb: string
		errorSurface: string
		errorText: string
		successSurface: string
		successText: string
	}

	interface PaletteOptions {
		surfaceRaised?: string
		surfaceHeader?: string
		surfaceSelected?: string
		surfaceHover?: string
		surfaceInput?: string
		surfaceAccent?: string
		borderAccent?: string
		borderSubtle?: string
		textMuted?: string
		textSubtle?: string
		textItem?: string
		textDisabled?: string
		scrollbarThumb?: string
		errorSurface?: string
		errorText?: string
		successSurface?: string
		successText?: string
	}
}
