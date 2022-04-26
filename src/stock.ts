const currency_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4, style: 'currency', currency: 'USD' });

const fracL = 0.1;
const fracH = 0.2;

const comission = 100000;
const num_cycles = 2;

let total_profit = 0;

export class StockSymbol {
    public sym: string;
    public price: number;
    public shares: number;
    public buy_price: number;
    public volatility: number;
    public probability: number;
    public expected_return: number;

    constructor(sym: string, price: number, shares: number, buy_price: number, volatility: number, probability: number, expected_return: number) {
		this.sym = sym;
		this.price = price;
		this.shares = shares;
		this.buy_price = buy_price;
		this.volatility = volatility;
		this.probability = probability;
		this.expected_return = expected_return;
	}
}

export async function main(ns: NS): Promise<void> {
	ns.clearLog();
	ns.disableLog('ALL');

	let corpus = 0;
	const all_symbols = ns.stock.getSymbols();
		
	while(true) {
		const stocks = [];
		const my_stocks = [];
		corpus = refresh(ns, all_symbols, stocks, my_stocks);

		// Sell underperformers
		for(let i = 0; i < my_stocks.length; i++) {
			if(stocks[0].expected_return > my_stocks[i].expected_return) {
				sell(ns, my_stocks[i], my_stocks[i].shares);
				corpus -= comission;
			}
		}


		// Sell shares if not enough cash in hand
		for(let i = 0; i < my_stocks.length; i++) {
			if(ns.getPlayer().money < (fracL * corpus)) {
				const cash_needed = corpus * fracH - ns.getPlayer().money + comission;
				const num_shares = Math.floor(cash_needed/my_stocks[i].price);
				sell(ns, my_stocks[i], num_shares);
				corpus -= comission;
			}
		}

		// Buy shares with remaining cash in hand
		const cash_to_spend = ns.getPlayer().money - (fracH * corpus);
		const num_shares = Math.min((cash_to_spend - comission)/stocks[0].price, ns.stock.getMaxShares(stocks[0].sym));
		if((num_shares * stocks[0].expected_return * stocks[0].price * num_cycles) > comission) {
			const did_buy = buy(ns, stocks[0], num_shares);
		}

		await ns.sleep(6 * 1000 + 200);
	}
}

function refresh(ns: NS, all_symbols: string[], stocks: StockSymbol[], my_stocks: StockSymbol[]): number {
	let corpus = ns.getPlayer().money;

	for(let i = 0; i < all_symbols.length; i++) {
		const sym = all_symbols[i];
		const price = ns.stock.getPrice(sym);
		const shares = ns.stock.getPosition(sym)[0];
		const buy_price = ns.stock.getPosition(sym)[1];
		const volatility = ns.stock.getVolatility(sym);
		const probability = 2*(ns.stock.getForecast(sym)- 0.5);
		const expected_return = volatility * probability / 2;

		corpus += price * shares;

		const stock_symbol = new StockSymbol(sym, price, shares, buy_price, volatility, probability, expected_return);
		stocks.push(stock_symbol);
		if(shares > 0) {
			my_stocks.push(stock_symbol);
		}
	}

	stocks.sort((a, b) => { return b.expected_return - a.expected_return;});
	return corpus;
}

function buy(ns: NS, stock: StockSymbol, num_shares: number): boolean {
	const max_shares = Math.min(num_shares, ns.stock.getMaxShares(stock.sym)-stock.shares);
	const purchased_price = ns.stock.buy(stock.sym, max_shares);
	if(purchased_price > 0) {
		ns.print(`Bought ${stock.sym} for ${currency_format.format(max_shares * purchased_price)}`);
		return true;
	} else {
		return false;
	}
}

function sell(ns: NS, stock: StockSymbol, num_shares: number): void {
	const sold_price = ns.stock.sell(stock.sym, num_shares);
	if(sold_price > 0) {
		const share_profit = num_shares * (sold_price - stock.buy_price) - 2 * comission;
		total_profit += share_profit;
		ns.print(`Sold ${stock.sym} for profit of ${currency_format.format(share_profit)} - ${currency_format.format(total_profit)} total`);
	} else {
		//debugger;
	}
}