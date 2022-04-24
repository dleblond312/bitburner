import { NS } from '@ns';

const LOG_PORT = 2;
const currency_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4, style: 'currency', currency: 'USD' });

export async function main(ns : NS) : Promise<void> {
    const start = Date.now();
    const hostname = <string>ns.args[0];
    const grow_rate = await ns.grow(hostname, {stock: true});
    const current_money = ns.getServerMoneyAvailable(hostname);
    const max_money = ns.getServerMaxMoney(hostname);
    const date_format = Intl.DateTimeFormat('en-US', { minute: 'numeric', second:'numeric', fractionalSecondDigits : 3});
    const end = Date.now();
    await ns.writePort(LOG_PORT, `${date_format.format(end)} Grow ${currency_format.format(current_money)}:(${grow_rate.toFixed(2)})/${currency_format.format(max_money)} on ${hostname} (${date_format.format(end-start)})`);
}