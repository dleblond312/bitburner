const EVENT_PORT = 1;
const factions_of_interest = ['CyberSec', 'NiteSec', 'The Black Hand', 'BitRunners'];

export async function main(ns: NS): Promise<void> {
	for(let i = 0; i < factions_of_interest.length; i++) {
		const faction = factions_of_interest[i];
		if (ns.singularity.joinFaction(faction)) {
			const msg = `Joined faction ${faction}!`;
			ns.tprint(msg);
			await ns.writePort(EVENT_PORT, msg);
			
			if(faction == 'CyberSec') {
				ns.singularity.workForFaction('CyberSec', 'Hacking Contracts', false);
			}
		}
	}
}