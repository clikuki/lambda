import { getID, ID } from "./utils.js";

interface LambdaNode
{
	type: string;
	id: ID;
}
export interface Abstraction extends LambdaNode
{
	type: "ABSTRACTION";
	param: ID;
	body: Term;
}
export interface Application extends LambdaNode
{
	type: "APPLICATION";
	left: Term;
	right: Term;
}
export interface Variable extends LambdaNode
{
	type: "VARIABLE";
}
export type Term = Application | Abstraction | Variable;
export type TraceMap = Map<ID, ID[]>;

export const FUNC_CHAR = "@";

export function findReductionPoints(
	term: Term,
	reduxPts: Application[] = [],
): Application[]
{
	switch (term.type)
	{
		case "VARIABLE":
			break;

		case "APPLICATION":
			if (term.left.type === "ABSTRACTION")
			{
				reduxPts.push(term);
			}
			findReductionPoints(term.left, reduxPts);
			findReductionPoints(term.right, reduxPts);
			break;

		case "ABSTRACTION":
			findReductionPoints(term.body, reduxPts);
			break;
	}

	return reduxPts;
}

export function performReduction(root: Term, reduxPt: Application): [Term, TraceMap]
{
	const traceMap: TraceMap = new Map();
	return [
		cloner(root, reduxPt, null, undefined, undefined, traceMap),
		traceMap
	];
}

function groupLog<T>(data: any, cb: () => T): T
{
	data
	// console.log(data);
	// console.group(data);
	const res = cb();
	// console.groupEnd();
	return res;
}
function cloner(
	term: Term,
	reduxPt: Application | null = null,
	sub: [ID, Term] | null = null,
	mapping = new Map<ID, ID>(),
	IDGen = getID(),
	traceMap?: TraceMap,
): Term
{
	if (term === reduxPt)
	{
		const { left, right } = reduxPt;
		if (left.type !== "ABSTRACTION") throw new Error(
			"Left side of application must be an abstraction"
		);

		if (traceMap)
		{
			// signal to destroy element
			traceMap.set(left.id, []);
			traceMap.set(term.id, []);
			addTreeEmpty(traceMap, right);
		}

		return groupLog("REDUX", () => cloner(
			left.body, null, [left.param, right], mapping, IDGen, traceMap
		));
	}

	if (term.type === "VARIABLE")
	{
		if (sub && term.id === sub[0])
		{
			// signal to destroy element
			if (traceMap) traceMap.set(term.id, []);

			return groupLog("SUB", () => cloner(
				sub[1], null, null, mapping, IDGen, traceMap
			));
		}

		let newID = mapping.get(term.id);
		if (!newID)
		{
			mapping.set(term.id, newID = IDGen());
			if (traceMap) addToMapList(traceMap, term.id, newID);
		}

		console.log("VARIABLE");
		return {
			type: "VARIABLE",
			id: newID,
		};
	}
	else if (term.type === "APPLICATION")
	{
		const newID = IDGen();
		if (traceMap) addToMapList(traceMap, term.id, newID);
		return groupLog("APPLICATION", () => ({
			type: "APPLICATION",
			id: newID,
			left: groupLog("LEFT", () => cloner(term.left, reduxPt, sub, mapping, IDGen, traceMap)),
			right: groupLog("RIGHT", () => cloner(term.right, reduxPt, sub, mapping, IDGen, traceMap)),
		}));
	}
	else
	{
		let newParamID = mapping.get(term.param);
		if (!newParamID)
		{
			mapping.set(term.param, newParamID = IDGen());
			// console.log(term.param, newParamID)
			if (traceMap) addToMapList(traceMap, term.param, newParamID);
		}

		const newID = IDGen();
		if (traceMap) addToMapList(traceMap, term.id, newID);

		return {
			type: "ABSTRACTION",
			id: newID,
			param: newParamID,
			body: groupLog("ABSTRACTION", () => cloner(term.body, reduxPt, sub, mapping, IDGen, traceMap)),
		};
	}
}

function addToMapList(map: Map<ID, ID[]>, key: ID, entry: ID): void
{
	const list = map.get(key);
	if (list) list.push(entry);
	else map.set(key, [entry]);
}
function addTreeEmpty(map: Map<ID, ID[]>, term: Term): void
{
	map.set(term.id, []);
	switch (term.type)
	{
		case "APPLICATION":
			addTreeEmpty(map, term.left);
			addTreeEmpty(map, term.right);
			break;
		case "ABSTRACTION":
			addTreeEmpty(map, term.body);
			break;
	}
}

export function code(
	strings: TemplateStringsArray,
	...values: (string | number)[]
): string
{
	let str = "";
	for (let i = 0; i < values.length; i++)
	{
		str += strings[i];
		str += `(${values[i]})`;
	}
	str += strings.at(-1);
	return str;
}

export function stringifyLambda(
	term: Term,
	depth = 0,
	mapping = new Map<ID, number>(),
): string
{
	switch (term.type)
	{
		case "ABSTRACTION":
			let params = "";
			let t = term as Term;
			let innerDep = depth;
			while (t.type === "ABSTRACTION")
			{
				mapping.set(t.param, innerDep++);
				params += `${FUNC_CHAR}`
				t = t.body;
			}
			const body = stringifyLambda(t, innerDep--, mapping);
			return `${params} ${body}`;
		case "APPLICATION":
			let left = stringifyLambda(term.left, depth, mapping);
			let right = stringifyLambda(term.right, depth, mapping);
			if (term.left.type === "ABSTRACTION") left = `(${left})`;
			if (term.right.type !== "VARIABLE") right = `(${right})`;
			return `${left} ${right}`;
		case "VARIABLE":
			const symDep = mapping.get(term.id) ?? -1;
			return String(depth - symDep - 1);
	}
}

export function parseLambda(
	code: string,
	from = 0,
	to = code.length,
	depth = 0,
	paramList: ID[] = [],
	IDGen = getID(),
): Term
{
	let left: Term | null = null;
	let right: Term | null = null;
	let i = from;
	let lim = 1000;
	let char;
	while (i < to)
	{
		if (lim-- < 0) throw new Error("Could not escape outer loop ");

		char = code[i];
		// console.log(i, `: "${char}" | OUTER`)

		if (char === " ") { } // Empty block to avoid nesting
		else if (char === FUNC_CHAR)
		{
			const param = IDGen();
			const localList = Array.from(paramList);
			localList.push(param);

			const body = parseLambda(code, i + 1, to, depth + 1, localList, IDGen);
			const abstraction: Abstraction = {
				type: "ABSTRACTION",
				id: IDGen(),
				param,
				body
			}

			if (!left) left = abstraction;
			else right = abstraction;

			break;
		} else if (char === "(")
		{
			// Perform parse within bracket group
			const end = findBracketPair(code, i);
			// console.log("GROUP", i, end);
			let term = parseLambda(code, i + 1, end, depth, paramList, IDGen);

			if (!left) left = term;
			else right = term;

			// console.log("RETURN", i, end);
			i = end;
		} else
		{
			// Start of variable reference, search ahead
			let varStr = char;
			let j = i + 1;

			while (j <= to && !(Number.isNaN(+code[j]) || code[j] === " "))
			{
				// console.log(i, `: ${code[i]} | INNER`);
				varStr += code[j++];
			}

			i = j - 1; // move outer index ahead

			const varDist = +varStr;
			if (!Number.isInteger(varDist)) throw new Error("Invalid variable reference");
			const id = paramList[depth - varDist - 1] ?? IDGen();
			const variable: Term = {
				type: "VARIABLE",
				id,
			};

			if (!left) left = variable;
			else right = variable;
		}

		// console.log("BEFORE", left, right);
		if (right)
		{
			// Group a and b into an application
			left = {
				type: "APPLICATION",
				left: left!,
				right,
				id: IDGen(),
			};
			right = null;
		}
		// console.log("AFTER", left, right);

		i++;
	}

	if (!left) throw "Cannot parse empty string";
	else if (right)
	{
		// Group a and b into an application
		// console.log("BEFORE", left, right);
		left = {
			type: "APPLICATION",
			left,
			right,
			id: IDGen(),
		};
		right = null;
		// console.log("AFTER", left, right);
	}
	// else console.log("FINAL", left, right);

	return left;
}

type BracketGroup = (BracketGroup | string)[];
export function bracketer(
	str: string,
): BracketGroup
{
	const rootGroup: BracketGroup = [];
	const groups = [rootGroup];
	let workingGroupIndex = 0;

	for (let i = 0; i < str.length; i++)
	{
		const char = str[i];
		if (char === "(")
		{
			const group = groups[workingGroupIndex++];
			const newGroup: BracketGroup = [];
			group.push(newGroup);
			groups.push(newGroup);
		}
		else if (char === ")")
		{
			workingGroupIndex--;
			groups.pop();
		}
		else
		{
			const group = groups[workingGroupIndex];
			group.push(char);
		}
	}

	return rootGroup;
}

function findBracketPair(str: string, at: number): number
{
	let count = 1;
	for (let i = at + 1; i < str.length; i++)
	{
		const char = str[i];
		// console.log(i, char, count);
		if (char === "(") count++;
		else if (char === ")" && !--count) return i;
	}
	return -1;
}
