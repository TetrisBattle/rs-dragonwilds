---
name: update-item-images
description: "Use when adding or updating personal chest item images from C:\\Users\\thien\\Downloads\\rsdragonwilds assets, mapping inventory icons, or organizing game item assets in this project."
---

# Update Item Images

Use the user's downloaded item images to update the inventory icons in this project.

## Source and destination

- Source folder: `C:\Users\thien\Downloads\rsdragonwilds assets`
- Destination folder: `src/renderer/src/features/inventory/assets`
- Rune images belong in `src/renderer/src/features/inventory/assets/runes`.
- Ascension Core images belong in `src/renderer/src/features/inventory/assets/ascension-cores`.
- Food images belong in `src/renderer/src/features/inventory/assets/food`.
- Drink images belong in `src/renderer/src/features/inventory/assets/drinks`.
- Vault items belong in `src/renderer/src/features/inventory/assets/vault`.
- Gear and equipment images belong in `src/renderer/src/features/inventory/assets/gear`.
- Arrow images belong in `src/renderer/src/features/inventory/assets/gear/arrows`.
- Resource images, including Stone, belong in `src/renderer/src/features/inventory/assets/resources`.
- Preserve the original image format (`.png` or `.webp`) and copy files into the project; do not move or delete the user's source files.
- Do not download images from the wiki or game. Use files already present in the source folder.

## Naming convention

Use lowercase kebab-case for asset filenames, including the extension:

- Remove a leading size prefix such as `120px-` or `250px-`.
- Convert the item name to lowercase and replace spaces and underscores with single hyphens.
- Remove redundant hyphens and lowercase the extension.
- Convert `Ascension_Core_(Power_Level_N)` to `ascension-core-N`, preserving the level number.
- Examples: `250px-Vault_Core.webp` becomes `vault-core.webp`; `250px-Air_Rune.webp` becomes `runes/air-rune.webp`.
- Categorize rune assets, including Rune Essence, in the `runes` folder. Keep other images at the assets root unless an existing category folder clearly applies.
- Categorize Ascension Core images in the `ascension-cores` folder.
- Categorize food assets in `food`, drink assets in `drinks`, and Vault items in `vault`.
- Categorize equipment such as armor, weapons, shields, and ammunition in `gear`; categorize materials and crafting resources in `resources`.
- Put arrow images in the `gear/arrows` subfolder.
- Avoid duplicate copies. If the normalized destination file already exists, compare it with the source before replacing it.

## Mapping and integration

1. Inspect the source folder for all image files and compare them with existing assets and mappings.
2. Find the item's persistence ID from existing project mappings or other reliable project data. Never invent or infer an ID from an image filename.
3. Copy the image to its normalized destination and update `src/renderer/src/features/inventory/itemIcons.ts` to map the known ID to the imported image. Follow the existing import and mapping style.
4. If the image name matches an existing friendly item name but its persistence ID is not available, do not create a guessed mapping. Leave it unmapped and ask the user for an item ID or a save entry containing that item.
5. Keep icons bundled locally with the app; do not use remote image URLs.
6. Do not alter unrelated save-editing behavior or remove existing user assets.

## Verification

- Check import paths and make sure filenames match exact casing.
- Run `npx biome check src/renderer/src/features/inventory/itemIcons.ts`.
- Run `npm run build` to verify the renderer bundles the images.
- Report which images were added and which could not be mapped due to missing item IDs.
