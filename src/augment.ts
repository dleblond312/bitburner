import { NS } from '@ns';

const LOG_PORT = 1;
const HACKING_SKILL_PORT = 4;
const RATE_SCRIPT = 'rate.js';
const NULL_PORT_DATA = 'NULL PORT DATA';
const RESTART_SCRIPT = 'v5.js';
const FORCE_AUGMENT_PORT = 5;
const NEUROFLUX_INFINITE = 'NeuroFlux Governor';
const FORMULAS_EXE = 'Formulas.exe';
const RESET_THRESHOLD = 1e13;
const HACK_MODE = 1;
const REP_MODE = 2;
const currency_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4, style: 'currency', currency: 'USD' });
const number_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4 });

const FINAL_FACTION = 'Daedalus';
const WORLD_DAEMON = 'w0r1d_d43m0n';

export class Faction {
    public name: string;
    public auto_join: boolean;
}

export class Augment {
    public faction: string;
    public name: string;
    public price: number;
    public rep_required: number;
	/**
	 * @param {string} faction
	 * @param {string} name
	 * @param {number} price
	 * @param {number} rep_required
	 */
	constructor(faction: string, name: string, price: number, rep_required: number) {
		this.faction = faction;
		this.name = name;
		this.price = price;
		this.rep_required = rep_required;
	}
}

/** 
 * @param {NS} ns 
 */
export async function main(ns: NS): Promise<void> {
	ns.disableLog('ALL');
	ns.enableLog('purchaseAugmentation');

	while (true) {
		//var faction_sets = [["CyberSec"], ["Sector-12"], ["Tian Di Hui", "Chongqing"], ["NiteSec", "New Tokyo"], ["The Black Hand"], ["BitRunners"], [FINAL_FACTION]];
		const faction_sets: Faction[][] = [
			[{ name: 'CyberSec', auto_join: true }],
			[{ name: 'Sector-12', auto_join: false }],
			[{ name: 'Tian Di Hui', auto_join: false }, { name: 'Chongqing', auto_join: false }],
			[{ name: 'NiteSec', auto_join: true }, { name: 'New Tokyo', auto_join: false }],
			[{ name: 'The Black Hand', auto_join: true }],
			[{ name: 'BitRunners', auto_join: true }],
			[{ name: FINAL_FACTION, auto_join: true }],
		];

		// Join any faction we care about
		const factions = [].concat(...faction_sets);
		for (let i = 0; i < factions.length; i++) {
			const faction = factions[i];
			if (faction.auto_join && ns.singularity.joinFaction(faction.name)) {
				ns.tprint(`Joined faction ${faction.name}!`);
				await ns.writePort(LOG_PORT, `Joined faction ${faction.name}!`);
			}

		}


		// In final phase
		if (ns.getPlayer().factions.some((f) => { return f == FINAL_FACTION; })) {
			const final_augments = ns.singularity.getAugmentationsFromFaction(FINAL_FACTION).filter((augment_name) => { return augment_name != NEUROFLUX_INFINITE; });
			const is_finished = ns.singularity.getOwnedAugmentations(true).some((owned) => { return !final_augments.some((final) => { return final == owned; }); });

			if (is_finished) {
				await process_final_phase(ns);
			}
		}

		await purchase_next_augment(ns, faction_sets);

		await ns.sleep(60 * 1000);
	}
}

/** 
 * @param {NS} ns 
 */
async function process_final_phase(ns: NS): Promise<void> {
    let purchased = false;
	const port_data = ns.readPort(FORCE_AUGMENT_PORT);
	if (port_data != NULL_PORT_DATA) {
		do {
			ns.print(`Increasing multiplier via ${FINAL_FACTION} spam of ${NEUROFLUX_INFINITE}`);
			if (ns.singularity.getAugmentationRepReq(NEUROFLUX_INFINITE) > ns.singularity.getFactionRep(FINAL_FACTION)) {
				ns.singularity.workForFaction(FINAL_FACTION, 'Hacking Contracts', false);
				ns.singularity.donateToFaction(FINAL_FACTION, 1e12);
			}
			purchased = ns.singularity.purchaseAugmentation(FINAL_FACTION, NEUROFLUX_INFINITE);
		} while (purchased);
		if (ns.singularity.getAugmentationPrice(NEUROFLUX_INFINITE) > RESET_THRESHOLD && ns.singularity.getOwnedAugmentations(true).length - ns.singularity.getOwnedAugmentations().length > 5) {
			await install_and_exit(ns);
		}

	}

	const node_list = await crawl_network(ns, 'home', {}, 0);
	if (node_list.some((node) => { return node == WORLD_DAEMON; })) {
		ns.exec(RATE_SCRIPT, 'home', 1, HACK_MODE, ns.getServerRequiredHackingLevel(WORLD_DAEMON));
	}
}

/** 
 * @param {NS} ns 
 */
// eslint-disable-next-line @typescript-eslint/require-await
async function install_and_exit(ns: NS): Promise<void> {
    let purchased = false;
	if (ns.getPlayer().has4SData && ns.getPlayer().hasWseAccount && ns.getPlayer().has4SData && ns.getPlayer().has4SDataTixApi) {
		const symbols = ns.stock.getSymbols();
		for (let i = 0; i < symbols.length; i++) {
			ns.stock.sell(symbols[i], ns.stock.getPosition(symbols[i])[0]);
		}
	}
	const factions = ns.getPlayer().factions;
	for (let i = factions.length - 1; i >= 0; i--) {
		const faction = factions[i];
		do {
			const favor = ns.singularity.getFactionFavor(faction);
			if (favor > ns.getFavorToDonate()) {
				const delta_rep = ns.singularity.getAugmentationRepReq(NEUROFLUX_INFINITE) - ns.singularity.getFactionRep(faction);
				if (delta_rep > 0) {
					const cost_to_skip = delta_rep * ns.getPlayer().faction_rep_mult * 1e6;
					const cost = Math.min(ns.getPlayer().money, Math.ceil(cost_to_skip));
					ns.singularity.donateToFaction(faction, cost);
				}
			}
			purchased = ns.singularity.purchaseAugmentation(faction, NEUROFLUX_INFINITE);
		} while (purchased);
	}

	ns.singularity.installAugmentations(RESTART_SCRIPT);
}

/**
 * @param {NS} ns 
 * @param {string} node
 * @param {*} node_list
 * @param {number} depth
 * @returns {Promise<Array<string>>}
*/
async function crawl_network(ns: NS, node: string, node_list: Record<string, unknown>, depth: number): Promise<string[]> {
	const hosts = ns.scan(node);
	for (let i = 0; i < hosts.length; i++) {
		const host = hosts[i];
		if (!node_list[host]) {
			node_list[host] = true;
			await crawl_network(ns, host, node_list, depth++);
		}
	}
	return Object.keys(node_list);
}

/** 
 * @param {NS} ns 
 * @param {Array<Array<{*}>>} faction_sets
 */
async function purchase_next_augment(ns: NS, faction_sets: Faction[][]): Promise<void> {
	// Process augments
	let did_augment_entire_faction: boolean;
	while (faction_sets.length > 0) {
		const faction_set = faction_sets.shift();
		const augment_list = get_factions_of_interest(ns, faction_set).sort((a, b) => { return b.price - a.price; });
		if (augment_list.length > 0) {
			const faction = augment_list[0].faction;
			if (ns.singularity.joinFaction(faction)) {
				ns.tprint(`Joined faction ${faction}!`);
				await ns.writePort(LOG_PORT, `Joined faction ${faction}!`);
			}
			while (!ns.getRunningScript(RATE_SCRIPT, 'home', REP_MODE, faction) && !ns.exec(RATE_SCRIPT, 'home', 1, REP_MODE, faction)) {
				await ns.sleep(20);
			}
			did_augment_entire_faction = await process_augments(ns, augment_list, true);

			if (did_augment_entire_faction) {
				await install_and_exit(ns);
			}

			return;
		}
	}
}

function generate_augment(ns: NS, faction: string, aug_name: string): Augment {
	const owned_augments = ns.singularity.getOwnedAugmentations(true);
	if (owned_augments.some((owned) => { return owned == aug_name; })) {
		return null;
	}
	const rep_required = ns.singularity.getAugmentationRepReq(aug_name);
	const price = ns.singularity.getAugmentationPrice(aug_name);

	const augment = new Augment(faction, aug_name, price, rep_required);
	return augment;
}


function get_factions_of_interest(ns: NS, factions: Faction[]): Augment[] {
	const augment_list: Augment[] = [];
	factions.forEach((faction: Faction) => {
		const augments = ns.singularity.getAugmentationsFromFaction(faction.name).filter((augment_name: string) => { return augment_name != 'NeuroFlux Governor'; });
		for (let i = 0; i < augments.length; i++) {
			const augment = generate_augment(ns, faction.name, augments[i]);
			if (augment) {
				augment_list.push(augment);
			}
		}
		// ns.print(`Augments: ${JSON.stringify(augments)}`);
	});
	return augment_list;
}

/** 
 * @param {NS} ns 
 * @param {Array<Augment>} augment_list
 * @param {boolean} should_recurse
 */
async function process_augments(ns: NS, augment_list: Augment[], should_recurse: boolean): Promise<boolean> {
	while (augment_list.length > 0) {
		const next_augment = augment_list[0];
		if (next_augment.rep_required < ns.singularity.getFactionRep(next_augment.faction)) {
			if (ns.getServerMoneyAvailable('home') > next_augment.price) {
				const prereq_augs = ns.singularity.getAugmentationPrereq(next_augment.name);
				for (let i = 0; i < prereq_augs.length; i++) {
					const prereq_augmentation = generate_augment(ns, next_augment.faction, prereq_augs[i]);
					if (prereq_augmentation) {
						await ns.writePort(LOG_PORT, `Pre-req required for ${next_augment.name} of ${prereq_augmentation.name}`);
						await process_augments(ns, [prereq_augmentation], false);
					}
				}
				const purchased = ns.singularity.purchaseAugmentation(next_augment.faction, next_augment.name);
				if (purchased) {
					augment_list.shift();
					await ns.writePort(LOG_PORT, `Purchased augment ${next_augment.name} from ${next_augment.faction} for ${currency_format.format(next_augment.price)}`);
					if (augment_list.length == 0) {
						return true;
					}
				} else {
					await ns.writePort(LOG_PORT, 'Unexpected failed to purchase augmentation');
					return false;
				}

			} else {
				ns.print(`Waiting for funds to be ${currency_format.format(next_augment.price)}`);
				return false;
			}
		} else {
			let msg = '';
			const favor = ns.singularity.getFactionFavor(next_augment.faction);
			const delta_rep = next_augment.rep_required - ns.singularity.getFactionRep(next_augment.faction);
			if (favor > ns.getFavorToDonate()) {
				const cost_to_skip = delta_rep * 1e6 / ns.getPlayer().faction_rep_mult;
				const cost = Math.min(ns.getPlayer().money, Math.ceil(cost_to_skip));
				msg = `donate ${currency_format.format(cost_to_skip)}`;
				ns.singularity.donateToFaction(next_augment.faction, cost);
			} else if (delta_rep > 1e5 && favor < 15) {
				if (ns.singularity.getFactionRep(next_augment.faction) > next_augment.rep_required * 0.15 && should_recurse) {
					augment_list.shift();
					return await process_augments(ns, augment_list, false);
				} else {
					msg = `low favor ${favor}, augmenting at ${next_augment.rep_required * 0.15}`;
				}
			} else if (ns.fileExists(FORMULAS_EXE, 'home')) {
				const rep_needed_to_donate = ns.formulas.reputation.calculateFavorToRep(ns.getFavorToDonate());
				if (ns.singularity.getFactionRep(next_augment.faction) > rep_needed_to_donate) {
					return true;
				} else if (rep_needed_to_donate < next_augment.rep_required) {
					msg = `${number_format.format(rep_needed_to_donate - ns.singularity.getFactionRep(next_augment.faction))} to donate`;
				}
			} else {
				msg = '{missing formulas.exe}';
			}

			ns.print(`Target ${ns.singularity.getFactionRep(next_augment.faction).toFixed(0)}/${next_augment.rep_required} ${next_augment.faction} - ${msg}`);
			return false;
		}
	}
    return false;
}