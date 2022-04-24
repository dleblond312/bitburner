const ROOT_PORT = 1;
const SAFE_PORT = 2;
const NULL_PORT_DATA = 'NULL PORT DATA';

export async function main(ns: NS): Promise<void> {
	ns.clearLog();
	ns.disableLog('sleep');
	while(true) {
		const breachHost = <string>ns.readPort(SAFE_PORT);
		if(breachHost != NULL_PORT_DATA) {
			if(!ns.hasRootAccess(breachHost)) {
				if(ns.getServerRequiredHackingLevel(breachHost) <= ns.getHackingLevel() && ns.getServerNumPortsRequired(breachHost) <= 2) {
					await localHack(ns, breachHost);
				}
			}
			await ns.sleep(200);
		}
		await ns.sleep(10000);
	}

}

async function localHack(ns: NS, breachHost: string): Promise<void> {
	if(ns.getServerRequiredHackingLevel(breachHost) <= ns.getHackingLevel() && ns.getServerNumPortsRequired(breachHost) <= 2) {
		ns.print('Breaching: ' + breachHost);
		ns.brutessh(breachHost);
		ns.ftpcrack(breachHost);
		ns.nuke(breachHost);
		ns.print('Found new host ROOTED: ' + breachHost);
		ns.tprint('Found new host ROOTED: ' + breachHost);
		while(!await ns.tryWritePort(ROOT_PORT, breachHost)) {
			ns.print('Port full, waiting...');
			await ns.sleep(10000);
		}
	} else {
		ns.print('Not ready to hack: ' + breachHost);
	}
}