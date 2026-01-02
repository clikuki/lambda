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
export interface Replacer
{
	by?: Term;
	at: Term[];
}

export const FUNC_CHAR = "@";

export class LambdaEval
{
	public findReductionPoints(
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
				this.findReductionPoints(term.left, reduxPts);
				this.findReductionPoints(term.right, reduxPts);
				break;

			case "ABSTRACTION":
				this.findReductionPoints(term.body, reduxPts);
				break;
		}

		return reduxPts;
	}

	public performReduction(root: Term, reduxPt: Application): Term
	{
		const { left, right } = reduxPt;
		if (left.type !== "ABSTRACTION") throw new Error(
			"Left side of application must be an abstraction"
		);

		const newPart = this.substitute(left.body, left.param, right);
		return this.cloneWithSwap(root, reduxPt, newPart);
	}

	private substitute(
		term: Term,
		id: ID,
		to: Term,
	): Term
	{
		if (term.type === "VARIABLE")
		{
			if (term.id === id) return this.clone(to);
			return {
				type: "VARIABLE",
				id: term.id,
			};
		}
		else if (term.type === "APPLICATION")
		{
			return {
				type: "APPLICATION",
				id: term.id,
				left: this.substitute(term.left, id, to),
				right: this.substitute(term.right, id, to),
			};
		}
		else if (term.param !== id)
		{
			return {
				type: "ABSTRACTION",
				id: term.id,
				param: term.param,
				body: this.substitute(term.body, id, to),
			};
		}
		// Is abstraction, but shadows the term that we are trying to substitute
		else return this.clone(term);
	}

	private clone(term: Term): Term
	{
		switch (term.type)
		{
			case "VARIABLE":
				return {
					id: term.id,
					type: "VARIABLE",
				};
			case "APPLICATION":
				return {
					id: term.id,
					type: "APPLICATION",
					left: this.clone(term.left),
					right: this.clone(term.right),
				};
			case "ABSTRACTION":
				return {
					id: term.id,
					type: "ABSTRACTION",
					param: term.param,
					body: this.clone(term.body),
				};
			default:
				throw new Error("Invalid node type")
		}
	}

	private cloneWithSwap(
		term: Term,
		at: Term,
		part: Term,
	): Term
	{
		// Assume use-case refers to only one ref occurence in tree
		if (term === at) return part;

		switch (term.type)
		{
			case "VARIABLE":
				return {
					id: term.id,
					type: "VARIABLE",
				};
			case "APPLICATION":
				return {
					id: term.id,
					type: "APPLICATION",
					left: this.cloneWithSwap(term.left, at, part),
					right: this.cloneWithSwap(term.right, at, part),
				};
			case "ABSTRACTION":
				return {
					id: term.id,
					type: "ABSTRACTION",
					param: term.param,
					body: this.cloneWithSwap(term.body, at, part),
				};
			default:
				throw new Error("Invalid node type")
		}
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
	mapping = new Map<ID, string>(),
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
				mapping.set(t.param, String(innerDep++));
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
			let char = mapping.get(term.id);
			if (!char)
			{
				char = "-1";
				mapping.set(term.id, char);
			}
			return char;
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
	while (i < to)
	{
		if (lim-- < 0) throw new Error("Could not escape outer loop ");
		// console.log(i, `: "${code[i]}" | OUTER`)
		let char = code[i++];
		if (char === " ") continue;
		if (char === FUNC_CHAR)
		{
			const param = IDGen();
			const localList = Array.from(paramList);
			localList.push(param);

			const body = parseLambda(code, i, to, depth + 1, localList, IDGen);
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
			let term = parseLambda(code, i, end, depth, paramList, IDGen);

			if (!left) left = term;
			else right = term;

			i = end + 1;
		} else
		{
			// Start of variable reference, search ahead
			let varStr = char;
			while (i <= to)
			{
				// console.log(i, `: ${code[i]} | INNER`);
				char = code[i++];
				if (Number.isNaN(+char) || char === " ") break;
				varStr += char;
			}

			// Avoid skipping last char in outer loop
			if (char !== " ") i--;

			const varDep = +varStr;
			if (!Number.isInteger(varDep)) throw new Error("Invalid variable reference");
			const id = paramList[varDep] ?? IDGen();
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
				left,
				right,
				id: IDGen(),
			};
			right = null;
		}
		// console.log("AFTER", left, right);
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
		if (char === "(") count++;
		else if (char === ")" && !--count) return i;
	}
	return -1;
}
