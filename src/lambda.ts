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

export const func_char = "@";

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
	...values: string[]
): string
{
	let str = "";
	for (let i = 0; i < values.length; i++)
	{
		str += strings[i];
		str += `(${values[i]})`;
	}
	str += strings.at(-1);
	return str.replaceAll(" ", "");
}

// // TODO: Fix lambda stringifier
// // Disabled due to difficulties supporting with variable naming
// export function stringifyLambda(
// 	tree: Term,
// 	combineParameters = false,
// 	localMapping = new Map<ID, number>()
// ): string
// {
// 	let str = "";
// 	if (tree.type === "VARIABLE")
// 	{
// 		// TODO: use map for names
// 		str = tree.id.str;
// 	} else if (tree.type === "APPLICATION")
// 	{
// 		// Dealing with application
// 		const { left, right } = tree;

// 		str += stringifyLambda(left, combineParameters);

// 		// If the second term is an application itself, then explicitly parenthesize
// 		if (right.type === "APPLICATION")
// 			str += `(${stringifyLambda(right, combineParameters)})`;
// 		else str += `${stringifyLambda(right, combineParameters)}`;
// 	} else
// 	{
// 		// Dealing with abstraction
// 		// Shorthand: Collect parameters of consecutively nested abstractions
// 		let node: Term = tree.body;
// 		let parameters = tree.param.str!;
// 		while (combineParameters && node.type === "ABSTRACTION")
// 		{
// 			parameters += node.param.str;
// 			node = node.body;
// 		}
// 		str = `(${func_char}${parameters}.${stringifyLambda(node, combineParameters)})`;
// 	}
// 	return str;
// }

export function parseLambda(
	code: string,
	mapping = new Map<string, ID>(),
	IDGen = getID(),
): Term
{
	let left: Term | null = null;
	let right: Term | null = null;
	for (let i = 0; i < code.length; i++)
	{
		const char = code[i];
		if (char === " ") throw SyntaxError("No spaces allowed in code string");
		if (char === func_char)
		{
			// abstraction declaration
			const start = i + 3;
			const end = code.length;

			const paramChar = code[i + 1];
			const param = IDGen();
			const localMapping = new Map(mapping);
			localMapping.set(paramChar, param);

			// All characters at this point must be consumed
			const body = parseLambda(code.slice(start, end), localMapping);
			const abstraction: Abstraction = {
				type: "ABSTRACTION",
				param,
				body,
				id: IDGen(),
			};

			if (!left) left = abstraction;
			else right = abstraction;

			i = end;
		} else if (char === "(")
		{
			// Perform parse within bracket group, this usually occurs before abstraction declarations
			const start = i + 1;
			const end = findBracketPair(code, i);

			let term = parseLambda(code.slice(start, end), mapping);
			if (!left) left = term;
			else right = term;

			i = end;
		} else
		{
			// Get corresponding ID of variable
			const id = mapping.get(char) ?? IDGen();
			if (!mapping.has(char)) mapping.set(char, id);

			// Add single character as variable
			const variable: Term = {
				type: "VARIABLE",
				id,
			};
			if (!left) left = variable;
			else right = variable;
		}

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
	}

	if (!left) throw "Cannot parse empty string";
	return left;
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
