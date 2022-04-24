const LOG_PORT = 1;
const NULL_PORT_DATA = 'NULL PORT DATA';

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.clearLog();
	ns.tail();
	const port = <number>ns.args[0] ?? LOG_PORT;
	ns.disableLog('sleep');
	while(true) {
		while(ns.peek(port) != NULL_PORT_DATA) {
			const msg = ns.readPort(port); 
			ns.print(msg);
		}
		await ns.sleep(100);
	}

}