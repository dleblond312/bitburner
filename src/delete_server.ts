// eslint-disable-next-line @typescript-eslint/require-await
export async function main(ns: NS): Promise<void> {
	ns.deleteServer(<string>ns.args[0]);
}