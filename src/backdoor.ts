const EVENT_PORT = 1;
const EXIT_SERVER = 'w0r1d_d43m0n';

let pservers: string[];

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	ns.disableLog('scan');
	
	pservers = ns.scan('home').filter((server) => { return server.indexOf('pserv') > -1;}).concat(['home']);

	ns.singularity.connect('home');
	const hosts = await crawl_network(ns, 'home', {}, 0);
	ns.singularity.connect('home');
}

function is_owned(ns: NS, host: string): boolean {
	return pservers.concat(['home']).filter((owned) => { return owned == host; }).length > 0;
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
			ns.singularity.connect(node);
			ns.singularity.connect(host);
			if (ns.getPlayer().hacking > ns.getServer(host).requiredHackingSkill) {
				if (!is_owned(ns, host) && ns.hasRootAccess(host) && !ns.getServer(host).backdoorInstalled) {
					const start = Date.now();
					await ns.singularity.installBackdoor();
					const end = Date.now();
					await ns.writePort(EVENT_PORT, `Backdoor on ${host} (${(end-start)/1000}s)`);
				}
			}
			await crawl_network(ns, host, node_list, depth++);

			ns.singularity.connect(node);
		}

	}
	return Object.keys(node_list);
}