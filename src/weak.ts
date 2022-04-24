import { NS } from '@ns';

const date_format = Intl.DateTimeFormat('en-US', { minute: 'numeric', second:'numeric', fractionalSecondDigits : 3});
const LOG_PORT = 2;

export async function main(ns : NS) : Promise<void> {
    const start = Date.now();
    const hostname = <string>ns.args[0];
    const reduced = await ns.weaken(hostname);
    const current = ns.getServerSecurityLevel(hostname);
    const min = ns.getServerMinSecurityLevel(hostname);
    const end = Date.now();
    await ns.writePort(LOG_PORT, `${date_format.format(end)} Weak ${(current + reduced).toFixed()} -> ${current.toFixed()}/${min.toFixed()} on ${hostname} (${date_format.format(end-start)})`);
}