import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { MuiThemeProvider } from '@/theme/MuiThemeProvider'

const rootElement = document.getElementById('root')

if (!rootElement) {
	throw new Error('Root element was not found')
}

createRoot(rootElement).render(
	<StrictMode>
		<MuiThemeProvider>
			<App />
		</MuiThemeProvider>
	</StrictMode>,
)
