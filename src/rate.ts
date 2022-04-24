const date_format = Intl.DateTimeFormat('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric' });
const currency_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4, style: 'currency', currency: 'USD' });
const number_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4 });
const FORMULAS_EXE = 'Formulas.exe';
const FORCE_AUGMENT_PORT = 5;
const STOP_SCALING_PORT = 6;
const SCRIPT_TO_WATCH = 'v5.js';
const HACK_MODE = 1;
const REP_MODE = 2;
const MAX_TIME = 1 * 60 * 60 * 1000;

export async function main(ns: NS): Promise<void> {
	const mode = <number>ns.args[0];

	if (!mode) { return; }

	const hacking_mul = ns.getPlayer().hacking_mult;
	const sleep_timer = 1000 * 60;
	ns.disableLog('disableLog');
	ns.disableLog('sleep');
	ns.disableLog('workForFaction');
	ns.tail();

	while (true) {
		switch (mode) {
			case HACK_MODE: {
				const level = <number>ns.args[1];
				const start = Date.now();
				const start_xp = ns.getPlayer().hacking_exp;

				await ns.sleep(sleep_timer);

				const end = Date.now();
				const end_xp = ns.getPlayer().hacking_exp;

				const delta_time = end - start;
				const delta_xp = end_xp - start_xp;
				const xp_rate = delta_xp / delta_time;
				const needed_xp = ns.formulas.skills.calculateExp(level, hacking_mul) - end_xp;
				const time_from_now = needed_xp / xp_rate;

				//ns.print(`Gained ${delta_xp} in ${delta_time / 1000}s`);
				if (ns.scriptRunning(SCRIPT_TO_WATCH, 'home')) {
					ns.print(`Need ${number_format.format(needed_xp)} skill which will take until ${date_format.format(end + time_from_now)}`);

					// More than MAX_TIME to upgrade
					if (time_from_now > MAX_TIME) {
						ns.print(`Writing to port ${FORCE_AUGMENT_PORT} > ${MAX_TIME / 3600000}h to finish`);
						await ns.writePort(FORCE_AUGMENT_PORT, time_from_now);
					}
				}

				break;
            }
			case REP_MODE: 
			default: {
				const faction = <string>ns.args[1];

				const start = Date.now();
				ns.singularity.workForFaction(faction, 'Hacking Contracts', ns.singularity.isFocused());
				const start_rep = ns.singularity.getFactionRep(faction);

				await ns.sleep(sleep_timer);

				const end = Date.now();
				ns.singularity.workForFaction(faction, 'Hacking Contracts', ns.singularity.isFocused());
				const end_rep = ns.singularity.getFactionRep(faction);

				const delta_time = end - start;
				const delta_rep = end_rep - start_rep;
				const rep_rate = delta_rep / delta_time;

				const owned_augments = ns.singularity.getOwnedAugmentations(true);
				const augments = ns.singularity.getAugmentationsFromFaction(faction).filter((augment_name) => {
					return augment_name != 'NeuroFlux Governor' && !owned_augments.some((owned) => owned == augment_name);
				});
				const needed_rep = augments.reduce((max, augment) => {
					const augment_rep = ns.singularity.getAugmentationRepReq(augment);
					if (augment_rep > max) {
						return augment_rep;
					} else {
						return max;
					}
				}, 0);

				let time_from_now = (needed_rep - end_rep) / rep_rate;
				

				if (delta_rep) {
					ns.print(`${date_format.format(end + time_from_now)} -> ${number_format.format(end_rep)}/${number_format.format(needed_rep)}`);
					
					const favor = ns.singularity.getFactionFavor(faction);
					if(favor < 50 && delta_rep > 1e5) {
						time_from_now *= 0.15;
						ns.print(`${date_format.format(end + time_from_now)} -> Favor boost`);
					} 
					if (time_from_now > MAX_TIME && ns.fileExists(FORMULAS_EXE, 'home')) {
						time_from_now = (ns.formulas.reputation.calculateFavorToRep(ns.getFavorToDonate()) - end_rep) / rep_rate;
						ns.print(`${date_format.format(end + time_from_now)} -> Donate`);
						await ns.writePort(FORCE_AUGMENT_PORT, time_from_now);
					} else {
						ns.clearPort(FORCE_AUGMENT_PORT);
					}
					if (time_from_now < 60 * 60 * 1000) {
						ns.print('Preventing scale up');
						await ns.writePort(STOP_SCALING_PORT, time_from_now);
					}

				} else {
					ns.print('No rep gained.');
				}

				if (needed_rep - end_rep <= 0) {
					return; // end this script
				}

				break;
            }
		}
	}
}