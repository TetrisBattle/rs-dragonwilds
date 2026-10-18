import { Box, Stack, Typography } from '@mui/material'
import { getItemData, type ItemData } from './itemData'

interface ItemDetailsTooltipProps {
	itemId: string
	name: string
	powerLevel?: number | string | null
	/** Current durability from the save; the max comes from the item dataset. */
	durability?: number | null
}

interface StatRow {
	label: string
	value: string
}

function buildStats(
	data: ItemData | undefined,
	powerLevel: number | string | null,
	currentDurability: number | null,
): StatRow[] {
	const stats: StatRow[] = []
	if (powerLevel !== null && powerLevel !== undefined && powerLevel !== '') {
		stats.push({ label: 'Power level', value: String(powerLevel) })
	}
	if (data?.tier) stats.push({ label: 'Tier', value: String(data.tier) })
	if (data?.skill) stats.push({ label: 'Skill', value: data.skill })
	if (data?.damageType) stats.push({ label: 'Damage', value: data.damageType })
	if (data?.armorWeight)
		stats.push({ label: 'Armour', value: data.armorWeight })
	if (typeof data?.weight === 'number')
		stats.push({ label: 'Weight', value: String(data.weight) })
	if (typeof data?.maxStack === 'number' && data.maxStack > 1) {
		stats.push({ label: 'Stack size', value: String(data.maxStack) })
	}
	const maxDurability =
		typeof data?.durability === 'number' && data.durability > 0
			? data.durability
			: null
	if (currentDurability !== null && maxDurability !== null) {
		stats.push({
			label: 'Durability',
			value: `${currentDurability} / ${maxDurability}`,
		})
	} else if (maxDurability !== null) {
		stats.push({ label: 'Durability', value: String(maxDurability) })
	} else if (currentDurability !== null) {
		stats.push({ label: 'Durability', value: String(currentDurability) })
	}
	if (typeof data?.health === 'number')
		stats.push({ label: 'Health', value: String(data.health) })
	if (typeof data?.hydration === 'number')
		stats.push({ label: 'Hydration', value: String(data.hydration) })
	if (typeof data?.sustenance === 'number')
		stats.push({ label: 'Sustenance', value: String(data.sustenance) })
	if (data?.duration) stats.push({ label: 'Duration', value: data.duration })
	return stats
}

export function ItemDetailsTooltip({
	itemId,
	name,
	powerLevel,
	durability,
}: ItemDetailsTooltipProps) {
	const data = getItemData(itemId)
	const resolvedPowerLevel = powerLevel ?? data?.powerLevel ?? null
	const stats = buildStats(data, resolvedPowerLevel, durability ?? null)

	return (
		<Box sx={{ maxWidth: 300 }}>
			<Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 700 }}>
				{name}
			</Typography>
			{data?.category && (
				<Typography
					sx={{
						mt: 0.2,
						color: 'text.secondary',
						fontSize: 10,
						fontWeight: 700,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
					}}
				>
					{data.category}
				</Typography>
			)}
			{data?.description && (
				<Typography
					sx={{
						mt: 0.8,
						color: 'text.secondary',
						fontSize: 11.5,
						fontStyle: 'italic',
						lineHeight: 1.55,
					}}
				>
					{data.description}
				</Typography>
			)}
			{stats.length > 0 && (
				<Stack spacing={0.2} sx={{ mt: 1 }}>
					{stats.map((stat) => (
						<Stack
							key={stat.label}
							direction='row'
							spacing={2}
							sx={{ justifyContent: 'space-between' }}
						>
							<Typography sx={{ color: 'text.secondary', fontSize: 11 }}>
								{stat.label}
							</Typography>
							<Typography
								sx={{ color: 'text.primary', fontSize: 11, fontWeight: 600 }}
							>
								{stat.value}
							</Typography>
						</Stack>
					))}
				</Stack>
			)}
		</Box>
	)
}
