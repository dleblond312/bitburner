const LOG_PORT = 1;

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	let augments = ns.singularity.getAugmentationsFromFaction('Sector-12');
	let owned = ns.singularity.getOwnedAugmentations(true);
	let remaining_augments = augments.filter((augment) => { return !owned.some((own_aug) => { return own_aug == augment;}); });
	if(remaining_augments.length > 0 && ns.getPlayer().location != 'Sector-12') {
		ns.singularity.travelToCity('Sector-12');
		await ns.writePort(LOG_PORT, 'Travelling to Sector-12');
	} else {
		augments = ns.singularity.getAugmentationsFromFaction('Chongqing');
		owned = ns.singularity.getOwnedAugmentations(true);
		remaining_augments = augments.filter((augment) => { return !owned.some((own_aug) => { return own_aug == augment;}); });
		if(remaining_augments.length > 0 && ns.getPlayer().location != 'Chongqing') {
			ns.singularity.travelToCity('Chongqing');
			await ns.writePort(LOG_PORT, 'Travelling to Chongqing');
		} else {
			augments = ns.singularity.getAugmentationsFromFaction('New Tokyo');
			remaining_augments = augments.filter((augment) => { return !owned.some((own_aug) => { return own_aug == augment;}); });
			if(remaining_augments.length > 0 && ns.getPlayer().location != 'New Tokyo') {
				ns.singularity.travelToCity('New Tokyo');
				await ns.writePort(LOG_PORT, 'Travelling to New Tokyo');
			}
		}
	}
}