/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.singularity.purchaseTor();
	await ns.sleep(10000);
}