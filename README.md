# Electron

An Electron application with React and TypeScript

## Application Structure

- `src/main/index.ts` starts Electron and registers app-level behavior.
- `src/main/services/` contains save-file operations and validation.
- `src/main/ipc/` registers renderer-to-main save handlers.
- `src/main/createWindow.ts` owns the main browser window setup.
- `src/preload/` exposes the typed, limited API to the renderer.
- `src/shared/save.ts` defines save-related types used across processes.
- `src/renderer/src/features/saves/` contains character selection and save-editor state.
- `src/renderer/src/features/inventory/` contains personal chest data helpers and UI.
- `src/renderer/src/components/` contains shared application-level UI.

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
