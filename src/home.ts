const date_format = Intl.DateTimeFormat('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric' });
const EVENT_PORT = 1;

export async function main(ns: NS): Promise<void> {
	const success = ns.singularity.upgradeHomeRam();
	if(success) {
		const msg = `${date_format.format(Date.now())}: Upgraded home RAM to ${ns.getServerMaxRam('home')}GB`;
		ns.tprint(msg);
		await ns.writePort(EVENT_PORT, msg);
	}
}