import { getID, ID } from "./utils.js";

interface LambdaNode
{
	type: string;
	parent: Term | null;
	id: ID;
}
export interface Abstraction extends LambdaNode
{
	type: "ABSTRACTION";
	param: symbol;
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
	symbol: symbol;
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
		// Root term param only acts in case of root-level reduction
		const { left, right, parent } = reduxPt;
		if (left.type !== "ABSTRACTION") throw new Error("Left side of application must be an abstraction");

		// Reduce to create partial lambda
		// Replace reduction point with partial lambda
		const newPart = this.substitute(left.body, left.param, right);

		if (!parent) return newPart;
		else if (parent.type === "ABSTRACTION") parent.body = newPart;
		else if (parent.type === "APPLICATION")
		{
			if (parent.left === reduxPt) parent.left = newPart;
			else parent.right = newPart;
		}
		else throw new Error("Term parent can not be a variable");

		return root;
	}

	private substitute(term: Term, sym: symbol, to: Term): Term
	{
		if (term.type === "VARIABLE")
		{
			if (term.symbol === sym) return this.copy(to);
			return term;
		}
		else if (term.type === "APPLICATION")
		{
			return {
				type: "APPLICATION",
				id: term.id,
				parent: term.parent,
				left: this.substitute(term.left, sym, to),
				right: this.substitute(term.right, sym, to),
			};
		}
		else if (term.param !== sym)
		{
			return {
				type: "ABSTRACTION",
				id: term.id,
				parent: term.parent,
				param: term.param,
				body: this.substitute(term.body, sym, to),
			};
		}
		// Is abstraction, but shadows the term that we are trying to substitute
		else return this.copy(term);
	}

	public copy(term: Term): Term
	{
		switch (term.type)
		{
			case "VARIABLE":
				return {
					id: getID(),
					parent: term.parent,
					type: "VARIABLE",
					symbol: term.symbol,
				};
			case "APPLICATION":
				return {
					id: getID(),
					parent: term.parent,
					type: "APPLICATION",
					left: this.copy(term.left),
					right: this.copy(term.right),
				};
			case "ABSTRACTION":
				return {
					id: getID(),
					parent: term.parent,
					type: "ABSTRACTION",
					param: term.param,
					body: this.copy(term.body),
				};
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

export function parseString(code: string): Term
{
	const root = buildTermTree(code);

	const nextNodes = [root];
	while (nextNodes.length)
	{
		const term = nextNodes.pop()!;

		switch (term.type)
		{
			case "APPLICATION":
				term.left.parent = term.right.parent = term;
				nextNodes.push(term.left, term.right);
				break;

			case "ABSTRACTION":
				term.body.parent = term;
				nextNodes.push(term.body);
				break;
		}
	}

	return root;
}

export function stringifyLambda(tree: Term, combineParameters = false): string
{
	let str = "";
	if (tree.type === "VARIABLE")
	{
		// Is this a dangerous assumption?
		str = tree.symbol.description!;
	} else if (tree.type === "APPLICATION")
	{
		// Dealing with application
		const { left, right } = tree;

		str += stringifyLambda(left, combineParameters);

		// If the second term is an application itself, then explicitly parenthesize
		if (right.type === "APPLICATION")
			str += `(${stringifyLambda(right, combineParameters)})`;
		else str += `${stringifyLambda(right, combineParameters)}`;
	} else
	{
		// Dealing with abstraction
		// Shorthand: Collect parameters of consecutively nested abstractions
		let node: Term = tree.body;
		let parameters = tree.param.description!;
		while (combineParameters && node.type === "ABSTRACTION")
		{
			parameters += node.param.description;
			node = node.body;
		}
		str = `(${func_char}${parameters}.${stringifyLambda(node, combineParameters)})`;
	}
	return str;
}

function buildTermTree(
	code: string,
	mapping = new Map<string, symbol>()
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
			const param = Symbol(paramChar);
			const localMapping = new Map(mapping);
			localMapping.set(paramChar, param);

			// All characters at this point must be consumed
			const body = buildTermTree(code.slice(start, end), localMapping);
			const abstraction: Abstraction = {
				type: "ABSTRACTION",
				parent: null,
				param,
				body,
				id: getID(),
			};

			if (!left) left = abstraction;
			else right = abstraction;

			i = end;
		} else if (char === "(")
		{
			// Perform parse within bracket group, this usually occurs before abstraction declarations
			const start = i + 1;
			const end = findBracketPair(code, i);

			let term = buildTermTree(code.slice(start, end), mapping);
			if (!left) left = term;
			else right = term;

			i = end;
		} else
		{
			// Get correspnding symbol of variable
			const sym = mapping.get(char) ?? Symbol(char);
			if (!mapping.has(char)) mapping.set(char, sym);

			// Add single character as variable
			const variable: Term = {
				type: "VARIABLE",
				parent: null,
				symbol: sym,
				id: getID(),
			};
			if (!left) left = variable;
			else right = variable;
		}

		if (right)
		{
			// Group a and b into an application
			left = {
				type: "APPLICATION",
				parent: null,
				left,
				right,
				id: getID()
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
