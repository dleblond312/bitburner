import { NS } from '@ns';

const LOG_PORT = 2;
const currency_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4, style: 'currency', currency: 'USD' });
const date_format = Intl.DateTimeFormat('en-US', { minute: 'numeric', second:'numeric', fractionalSecondDigits : 3});

export async function main(ns : NS) : Promise<void> {
    const start = Date.now();
	const hostname = <string>ns.args[0];
	const money_stolen = await ns.hack(hostname);
	const max_money = ns.getServerMaxMoney(hostname);
	const end = Date.now();
	await ns.writePort(LOG_PORT, `${date_format.format(end)} Hack ${currency_format.format(money_stolen)} of ${currency_format.format(ns.getServerMoneyAvailable(hostname))}/${currency_format.format(max_money)} from ${hostname} (${date_format.format(end-start)})`);
}