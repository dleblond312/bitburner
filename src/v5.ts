import { NS } from '@ns';

const HACK_SCRIPT = 'hack';
const GROW_SCRIPT = 'grow';
const WEAK_SCRIPT = 'weak';

const TOR_SCRIPT = 'tor.js';
const HOME_UPGRADE_SCRIPT = 'home.js';
const PURCHASE_PROGRAM_SCRIPT = 'purchase_program.js';
const PURCHASE_SERVER_SCRIPT = 'purchase_server.js';
const FACTION_SCRIPT = 'factions.js';
const AUGMENT_SCRIPT = 'augment.js';
const MONITOR_SCRIPT = 'monitor.js';
const TRAVEL_SCRIPT = 'travel.js';
const STOCK_SCRIPT = 'stock.js';
const STOCK_PURCHASE_SCRIPT = 'stock_upgrade.js';
const BACKDOOR_SCRIPT = 'backdoor.js';

const EXIT_SERVER = 'w0r1d_d43m0n';
const EVENT_PORT = 1;
const SCHEDULING_PORT = 2;
const STOP_SCALING_PORT = 6;
const PURCHASE_SERVER_PORT = 7;
const NULL_PORT_DATA = 'NULL PORT DATA';
const time_delta = 200;

const programs: {name: string, level: number, ports: number}[] = [
	{ name: 'Formulas.exe', level: 750, ports: 0 },
	{ name: 'SQLInject.exe', level: 750, ports: 1 },
	{ name: 'HTTPWorm.exe', level: 500, ports: 1 },
	{ name: 'relaySMTP.exe', level: 250, ports: 1 },
	{ name: 'FTPCrack.exe', level: 100, ports: 1 },
	{ name: 'BruteSSH.exe', level: 50, ports: 1 },
	{ name: 'DeepscanV2.exe', level: 400, ports: 0 },
	{ name: 'ServerProfiler.exe', level: 75, ports: 0 },
	{ name: 'DeepscanV1.exe', level: 75, ports: 0 },
	{ name: 'AutoLink.exe', level: 25, ports: 0 }];

export class Threads {
	public hack: number;
	public grow: number;
	public weak: number;
	public available_threads?: number;
}

export class NodeInfo {
	public isRooted: boolean;
	public isOwned: boolean;
	public hostname: string;
	public total_ram: number;
	public can_schedule: boolean;
	public threads: Threads;
	public available_money: number;
	public delta_security_level: number;
	public max_money: number;
}

export class Operation {
	public script: string;
	public target: string;
	public hostname: string;
	public threads: number;
	public end_time: number;

	constructor(script: string, target: string, hostname: string, threads: number, end_time: number) {
		this.script = script;
		this.target = target;
		this.hostname = hostname;
		this.threads = threads;
		this.end_time = end_time;
	}
}

export class FutureOperation {
	public node: NodeInfo;
	public script: 'hack' | 'grow' | 'weak';
	public threads: number;
	public execute_after: number;
	
}

let future_operations: FutureOperation[] = [];

let total_scheduled_threads: Threads = new Threads();

let time_functions: {
	hack: (s: string) => number,
	grow: (s: string) => number,
	weak: (s: string) => number,
};

let operations: Array<Operation> = [];

let pservers: Array<string>;

let max_script_cost: number;

const date_format = Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', fractionalSecondDigits: 3 });
const currency_format = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 4, style: 'currency', currency: 'USD' });

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.disableLog('ALL');
	ns.clearLog();

	time_functions = {
		hack: ns.getHackTime,
		weak: ns.getWeakenTime,
		grow: ns.getGrowTime,
	};

	let root_list: NodeInfo[] = [];
	let home_list: NodeInfo[] = [];
	
	const future_list: NodeInfo[] = [];

	let has_traveled = false;

	await ns.writePort(EVENT_PORT, `--- SCRIPT START: ${date_format.format(new Date())}---`);
	ns.tail();
	do {
		max_script_cost = Math.max(ns.getScriptRam(HACK_SCRIPT+'.js', 'home'), ns.getScriptRam(GROW_SCRIPT+'.js', 'home'), ns.getScriptRam(WEAK_SCRIPT+'.js', 'home'));
		let target_list: NodeInfo[] = [];
		const op_list: NodeInfo[] = [];

		const total_tracked = {
			hack: 0,
			weak: 0,
			grow: 0,
		};

		total_scheduled_threads = {
			hack: 0,
			weak: 0,
			grow: 0,
		};

		pservers = ns.scan('home').filter((server) => { return server.indexOf('pserv') > -1; });

		// Generate list of hosts by crawling the network
		const hosts = await crawl_network(ns, 'home', {}, 0);

		// Generate maximum port count we can compromise
		const port_count = programs.reduce((accumulator, program) => {
			return accumulator + (ns.fileExists(program.name, 'home') ? program.ports : 0);
		}, 0);

		// Run analysis of every server in the network
		root_list = [];
		home_list = [];
		for (let i = 0; i < hosts.length; i++) {
			const host = hosts[i];
			const server_info = analyze_server(ns, host);

			if (server_info.isRooted) {
				if (!server_info.isOwned) {
					if (server_info.max_money > 0 && server_info.available_money > 0) {
						if(calc_security_delta(ns, server_info.hostname) <= 1) {
							if(!future_list.some((s) => { return s.hostname == server_info.hostname;})) {
								future_list.push(server_info);
							}
						} else {
							target_list.push(server_info);
						}
					}
				}

				// All nodes with root access
				op_list.push(server_info);
				if(server_info.hostname == 'home') {
					home_list.push(server_info);
				} else {
					root_list.push(server_info);
				}
			} else {
				if (ns.getPlayer().hacking >= ns.getServer(host).requiredHackingSkill && ns.getServer(host).numOpenPortsRequired <= port_count) {
					await schedule_breach(ns, [server_info]);
				}
			}
		}

		if (ns.getServerMaxRam('home') > 32) {
			ns.exec(MONITOR_SCRIPT, 'home', 1, 1);
			ns.exec(MONITOR_SCRIPT, 'home', 1, 2);
		}

		if (ns.singularity.getDarkwebPrograms().length > 0) {
			for(let i = 0; i < programs.length; i++) {
				const program = programs[i];
				if (program && !ns.fileExists(program.name, 'home') && ns.singularity.getDarkwebProgramCost(program.name) < ns.getPlayer().money && !ns.scriptRunning(PURCHASE_PROGRAM_SCRIPT, 'home')) {
					if(ns.exec(PURCHASE_PROGRAM_SCRIPT, 'home', 1, program.name)) {
						await ns.sleep(20);
						break;
					}
				}
			}
		} else {
			if (ns.getPlayer().money > 2e5 && !ns.getPlayer().tor && ns.exec(TOR_SCRIPT, 'home', 1)) {
				await ns.sleep(20);
			}
		}

		// Automate factions and augments
		if (ns.singularity.getUpgradeHomeRamCost() < ns.getPlayer().money) {
			if (ns.exec(HOME_UPGRADE_SCRIPT, 'home', 1)) {
				await ns.sleep(20);
			}
		}
		if (ns.getServerMaxRam('home') < 64) {
			if(ns.exec(FACTION_SCRIPT, 'home', 1)) {
				await ns.sleep(20);
			}
		} else {
			if (!has_traveled) {
				has_traveled = has_traveled || !!ns.exec(TRAVEL_SCRIPT, 'home', 1);
				await ns.sleep(20);
			}
			if (ns.exec(AUGMENT_SCRIPT, 'home', 1)) {
				await ns.sleep(20);
			}

			if (ns.getPlayer().has4SData && ns.getPlayer().hasWseAccount && ns.getPlayer().has4SData && ns.getPlayer().has4SDataTixApi) {
				if (ns.exec(STOCK_SCRIPT, 'home', 1)) {
					await ns.sleep(20);
				}
			} else {
				// 32 billion needed
				if (ns.getPlayer().money > 3.2e10) {
					if (ns.exec(STOCK_PURCHASE_SCRIPT, 'home', 1)) {
						await ns.sleep(10);
					}
				}
			}
		}

		// Stop scaling for last hour before augment
		if (ns.peek(STOP_SCALING_PORT) == NULL_PORT_DATA) {
			await scale_out_nodes(ns, op_list);
		}

		target_list = target_list.sort((a, b) => { return a.delta_security_level - b.delta_security_level; });
		root_list = root_list.filter((node) => { return node.can_schedule; }).sort((a, b) => { return b.total_ram - a.total_ram; });

		// Track all operations in progress
		operations = operations.filter((operation) => { return operation.end_time - Date.now() >= 0; });
		operations.forEach((operation) => {
			const op_node = op_list.filter((node) => { return node.hostname == operation.target; });
			if (op_node.length > 0 && Number.isFinite(operation.threads)) {
				op_node[0].threads[operation.script] = Math.max(0, op_node[0].threads[operation.script] - operation.threads);
				total_tracked[operation.script] += operation.threads;
			}
		});


		if(pservers.length == ns.getPurchasedServerLimit() && ns.getServerMaxRam('home') >= 65536) {
			// execute a future scheduled node
			const reducer_results = future_operations.reduce((results, future_op) => {
				const n = Date.now();
				if(future_op.execute_after < n) {
					results.execute_list.push(future_op);
				} else {
					results.future_operations.push(future_op);
				}
				return results;
			}, { future_operations: <FutureOperation[]>[], execute_list: <FutureOperation[]>[]});
			future_operations = reducer_results.future_operations;

			reducer_results.execute_list = reducer_results.execute_list.sort((a, b) => { return b.execute_after - a.execute_after; });
			for(let i = 0; i < reducer_results.execute_list.length; i++) {
				const f_op = reducer_results.execute_list[i];
				const target = Object.assign({}, f_op.node);
				target.threads = {
					grow: f_op.script == GROW_SCRIPT ? f_op.threads : 0,
					weak: f_op.script == WEAK_SCRIPT ? f_op.threads : 0,
					hack: f_op.script == HACK_SCRIPT ? f_op.threads : 0,
				};
				const future_target_list = [target];

				await schedule_script(ns, [f_op.script], root_list, future_target_list);
				if(future_target_list.length != 0) {
					future_operations.push(reducer_results.execute_list[i]);
				}
			}

			await schedule_script(ns, [GROW_SCRIPT, WEAK_SCRIPT], home_list, target_list);
			const available_threads = root_list.reduce((sum, node) => {
				return sum + node.threads.available_threads;
			}, 0);

			const future_queued_threads = future_operations.reduce((sum, future_op) => {
				return sum + future_op.threads;
			},0);

			// plan future nodes based on available memory
			for(let i = 0; i < future_list.length; i++) {
				const node = future_list[i];
				const available_money_ratio = 0.1;
				const grow_multiplier = 1 / available_money_ratio;
				const grow_threads = Math.ceil(ns.growthAnalyze(node.hostname, grow_multiplier));
				const grow_weak_threads = Math.ceil(Math.max(grow_threads / 0.05, 0));
				const hack_threads = Math.floor(ns.hackAnalyzeThreads(node.hostname, node.max_money*(1-available_money_ratio)));
				const hack_weak_threads = Math.ceil(Math.max(hack_threads / 0.05, 0));

				const grow_duration = ns.getGrowTime(node.hostname);
				const hack_duration = ns.getHackTime(node.hostname);
				const weak_duration = ns.getWeakenTime(node.hostname);
				const max_duration = Math.max(grow_duration, hack_duration, weak_duration);
				const min_duration = Math.min(grow_duration, hack_duration, weak_duration);
				const now = Date.now();

				const new_future_threads = grow_threads + grow_weak_threads + hack_threads + hack_weak_threads;

				const n = Date.now();
				if(future_operations.some((f_op) => { return f_op.node.hostname == node.hostname && n + min_duration + (time_delta*5) < f_op.execute_after; })) {
					continue;
				}

				if(new_future_threads + future_queued_threads < available_threads*0.9 && max_duration < 2*60*1000 && new_future_threads < (available_threads-future_queued_threads)*0.25) {
					future_operations.push({
						node: node,
						script: GROW_SCRIPT,
						threads: grow_threads,
						execute_after: now + max_duration - grow_duration + time_delta,
					});
					future_operations.push({
						node: node,
						script: WEAK_SCRIPT,
						threads: grow_weak_threads,
						execute_after: now + max_duration - weak_duration + (time_delta*2),
					});
					future_operations.push({
						node: node,
						script: HACK_SCRIPT,
						threads: hack_threads,
						execute_after: now + max_duration - hack_duration + (time_delta*3),
					});
					future_operations.push({
						node: node,
						script: WEAK_SCRIPT,
						threads: hack_weak_threads,
						execute_after: now + max_duration - weak_duration + (time_delta*4),
					});
				} else {
					await schedule_script(ns, [HACK_SCRIPT, GROW_SCRIPT, WEAK_SCRIPT], home_list, [node]);
				}
			}
		} else {
			// low resources mode
			await schedule_script(ns, [HACK_SCRIPT, GROW_SCRIPT, WEAK_SCRIPT], root_list.concat(home_list), future_list.concat(target_list));
		}


		if (total_scheduled_threads[HACK_SCRIPT] > 0 || total_scheduled_threads[WEAK_SCRIPT] > 0 || total_scheduled_threads[GROW_SCRIPT] > 0) {
			ns.print(`Prev: {H:${total_tracked[HACK_SCRIPT].toFixed()} (+${total_scheduled_threads[HACK_SCRIPT]}), W:${total_tracked[WEAK_SCRIPT].toFixed()} (+${total_scheduled_threads[WEAK_SCRIPT]}), G:${total_tracked[GROW_SCRIPT].toFixed()} (+${total_scheduled_threads[GROW_SCRIPT]})}`);
		}

		await ns.sleep(20);
		
	} while (true);
}

/**
 * @param {NS} ns
 * @param {Array<NodeInfo> rooted_list}
 * @returns {Promise<void>}
 */
async function scale_out_nodes(ns: NS, rooted_list: NodeInfo[]): Promise<boolean> {
	if (ns.getPurchasedServerLimit() > pservers.length) {
		if(ns.getPlayer().money > 1e5 && ns.exec(PURCHASE_SERVER_SCRIPT, 'home', 1)) {
			await ns.sleep(20);
		} 
	} else {
		let min_pserv = '';
		let min_pserv_ram = Number.MAX_VALUE;
		let max_pserv_ram = Number.MIN_VALUE;

		// Find the smallest node and the highest ram
		for (let i = 0; i < pservers.length; i++) {
			const p_serv = pservers[i];
			if (min_pserv_ram > ns.getServerMaxRam(p_serv)) {
				min_pserv = p_serv;
				min_pserv_ram = ns.getServerMaxRam(p_serv);
			}
			if (max_pserv_ram < ns.getServerMaxRam(p_serv)) {
				max_pserv_ram = ns.getServerMaxRam(p_serv);
			}
		}

		// If we can double it, buy the biggest node
		const target_ram = max_pserv_ram > ns.getServerMaxRam(min_pserv) * 2 ? max_pserv_ram : ns.getServerMaxRam(min_pserv) * 2;
		if (ns.getServerMaxRam('home') > 32 && target_ram <= ns.getPurchasedServerMaxRam() && ns.getPurchasedServerCost(target_ram) <= ns.getPlayer().money) {
			if (ns.isRunning(HACK_SCRIPT, min_pserv) || ns.isRunning(WEAK_SCRIPT, min_pserv) || ns.isRunning(GROW_SCRIPT, min_pserv)) {
				const msg = `Draining server: ${min_pserv}`;
				await ns.writePort(EVENT_PORT, msg);
				rooted_list.filter((node) => { return node.hostname == min_pserv; })[0].can_schedule = false;
				await ns.writePort(PURCHASE_SERVER_PORT, min_pserv);
			} else {
				if(ns.exec(PURCHASE_SERVER_SCRIPT, 'home', 1, min_pserv)) {
					await ns.sleep(20);
					return false;
				}				
			}
		}

	}
	return true;
}



function is_owned(ns: NS, host: string): boolean {
	return host == 'home' || pservers.filter((owned) => { return owned == host; }).length > 0;
}

/**
 * @param {NS} ns 
 * @param {string} node
 * @param {*} node_list
 * @param {number} depth
 * @returns {Promise<Array<string>>}
*/
async function crawl_network(ns: NS, node: string, node_list: Record<string, unknown>, depth: number): Promise<string[]> {
	const hosts = ns.scan(node);
	for (let i = 0; i < hosts.length; i++) {
		const host = hosts[i];
		if (!node_list[host]) {
			node_list[host] = true;
			if (!is_owned(ns, host) && ns.getPlayer().hacking > ns.getServer(host).requiredHackingSkill && ns.getServer(host).hasAdminRights) {
				if (!ns.getServer(host).backdoorInstalled) {
					if (ns.exec(BACKDOOR_SCRIPT, 'home', 1)) {
						await ns.sleep(10);
					}
				}
			}
			await crawl_network(ns, host, node_list, depth++);
		}
	}
	return Object.keys(node_list);
}

function analyze_server(ns: NS, host: string): NodeInfo {
	let hack_threads_required = 0;
	let grow_threads_required = 0;

	const isRooted = ns.getServer(host).hasAdminRights;
	const total_ram = ns.getServer(host).maxRam;
	const isOwned = is_owned(ns, host);

	const max_money = ns.getServer(host).moneyMax;
	const available_money = ns.getServer(host).moneyAvailable;
	const available_money_ratio = max_money ? available_money / max_money : 0;
	const delta_security_level = calc_security_delta(ns, host);
	const weak_threads_required = Math.ceil(Math.max(delta_security_level / 0.05, 0));

	if (!isOwned && available_money > 0 && delta_security_level < 2) {
		const grow_multiplier = 1 / available_money_ratio;
		grow_threads_required = grow_multiplier > 1 ? Math.ceil(ns.growthAnalyze(host, grow_multiplier)) : 0;
		hack_threads_required = Math.floor(available_money_ratio > 0 ? ns.hackAnalyzeThreads(host, max_money * (available_money_ratio * 0.9)) : 0);
	}

	const threads: Threads = {
		hack: hack_threads_required,
		grow: grow_threads_required,	
		weak: weak_threads_required,
		available_threads: Math.floor((total_ram - ns.getServer(host).ramUsed) / max_script_cost),
	};

	return {
		isRooted: isRooted,
		isOwned: isOwned,
		hostname: host,
		total_ram: total_ram,
		can_schedule: true,
		threads: threads,
		available_money: available_money,
		delta_security_level: delta_security_level,
		max_money: max_money,
	};
}

function calc_security_delta(ns: NS, host: string): number {
	const security_level = ns.getServerSecurityLevel(host);
	const min_security_level = ns.getServerMinSecurityLevel(host);
	const delta_security_level = security_level - min_security_level;
	return delta_security_level;
}

async function schedule_breach(ns: NS, breach_list: NodeInfo[]): Promise<void> {
	while (breach_list.length > 0) {
		const host = breach_list.shift();
		ns.fileExists('BruteSSH.exe', 'home') && ns.brutessh(host.hostname);
		ns.fileExists('FTPCrack.exe', 'home') && ns.ftpcrack(host.hostname);
		ns.fileExists('relaySMTP.exe', 'home') && ns.relaysmtp(host.hostname);
		ns.fileExists('HTTPWorm.exe', 'home') && ns.httpworm(host.hostname);
		ns.fileExists('SQLInject.exe', 'home') && ns.sqlinject(host.hostname);
		try {
			ns.nuke(host.hostname);
			ns.tprintf(`Nuked! ${host.hostname}`);
			await ns.writePort(EVENT_PORT, 'NUKED! ' + host.hostname);
		} catch { }
	}
}

/** 
 * @param {NS} ns
 * @param {Array<string>} scripts
 * @param {Array<NodeInfo>} rooted_list
 * @param {Array<NodeInfo>} target_list
 */
async function schedule_script(ns: NS, scripts: ('hack' | 'weak' | 'grow')[], rooted_list: NodeInfo[], target_list: NodeInfo[]): Promise<void> {
	let loop_scripts = [...scripts];

	while (target_list.length > 0 && rooted_list.length > 0) {
		let script_name = loop_scripts[0];
		const file_name = script_name + '.js';
		const target = target_list[0];
		const source = rooted_list[0];
		const script_ram = ns.getScriptRam(file_name);
		let num_threads: number;

		if (!ns.isRunning(file_name, source.hostname)) {
			await ns.scp(file_name, 'home', source.hostname);
		}

		const available_memory = source.total_ram - ns.getServerUsedRam(source.hostname);
		const available_threads = Math.floor(available_memory / script_ram);
		switch (script_name) {
			case WEAK_SCRIPT:
				num_threads = Math.min(Math.ceil(target.threads[script_name]), available_threads);
				break;
			case GROW_SCRIPT:
			case HACK_SCRIPT:
				num_threads = Math.min(Math.floor(target.threads[script_name]), available_threads);
				break;
			default:
				num_threads = Math.min(target.threads[script_name], Math.floor(available_threads));
				break;
		}

		if (num_threads > 0) {
			if (ns.exec(file_name, source.hostname, num_threads, target.hostname, Date.now(), num_threads)) {
				if (time_functions[script_name]) {
					operations.push(new Operation(script_name, target.hostname, source.hostname, num_threads, Date.now() + time_functions[script_name](target.hostname)));
				}
				total_scheduled_threads[script_name] += num_threads;
				target.threads[script_name] -= num_threads;
			}
		}
		if (target.threads[script_name] < 1) {
			// Next script priority
			script_name = loop_scripts.shift();

			if (loop_scripts.length == 0) {
				// done on this target
				target_list.shift();
				loop_scripts = [...scripts];
			}
		} else {
			// no memory left to schedule
			rooted_list.shift();
		}
	}
}