// eslint-disable-next-line @typescript-eslint/require-await
export async function main(ns: NS): Promise<void> {
	ns.tail();
	ns.stock.purchaseWseAccount();
	ns.stock.purchaseTixApi();
	ns.stock.purchase4SMarketData();
	ns.stock.purchase4SMarketDataTixApi();
}