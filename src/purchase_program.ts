const EVENT_PORT = 1;

export async function main(ns: NS): Promise<void> {
	const program = <string>ns.args[0];
	const purchased = ns.singularity.purchaseProgram(program);
	if(purchased) {
		const msg = `Purchased ${program} from darkweb!`;
		ns.tprintf(msg);
		await ns.writePort(EVENT_PORT, msg);
	}
}