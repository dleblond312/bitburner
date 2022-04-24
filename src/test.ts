const date_format = Intl.DateTimeFormat('en-US', { month: 'numeric', day:'numeric', hour:'numeric', minute:'numeric', second:'numeric'});
const currency_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4, style: 'currency', currency: 'USD' });
const number_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4 });

// eslint-disable-next-line @typescript-eslint/require-await
export async function main(ns: NS): Promise<void> {
	ns.disableLog('disableLog');
	ns.disableLog('sleep');

}