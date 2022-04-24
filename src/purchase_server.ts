const EVENT_PORT = 1;
const PURCHASE_SERVER_PORT = 7;
const NULL_PORT_DATA = 'NULL PORT DATA';
const currency_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4, style: 'currency', currency: 'USD' });

export async function main(ns: NS): Promise<void> {
	ns.disableLog('disableLog');
	ns.disableLog('sleep');
	// ns.disableLog("purchaseServer");
	while(true) {
		const pserv_to_delete = <string>ns.args[0];
		if(pserv_to_delete) {
			ns.deleteServer(pserv_to_delete);
		}
		if(await buy_biggest(ns)) {
			ns.clearPort(PURCHASE_SERVER_PORT);
			return;
		}
		await ns.sleep(20);
	}
}


async function buy_biggest(ns: NS): Promise<boolean> {
	for (let i = 20; i > 0; i--) {
		const new_ram = Math.pow(2, i);
		const new_serv = ns.purchaseServer('pserv', new_ram);
		if (new_serv.indexOf('pserv') > -1) {
			await ns.writePort(EVENT_PORT, `New server ${new_ram.toLocaleString('en-US')}GB (2^${i}) for ${currency_format.format(ns.getPurchasedServerCost(new_ram))}`);
			return true;
		}
	}
	return false;
}