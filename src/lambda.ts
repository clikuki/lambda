import { getID, ID } from "./utils.js";

const id = getID();

export interface Abstraction {
	type: "ABSTRACTION";
	param: symbol;
	body: Term;
	id: ID;
}
export interface Application {
	type: "APPLICATION";
	left: Term;
	right: Term;
	id: ID;
}
export interface Variable {
	type: "VARIABLE";
	symbol: symbol;
	id: ID;
}
export type Term = Application | Abstraction | Variable;
export interface Replacer {
	by?: Term;
	at: Term[];
}

const REDUCTION_STEP_LIMIT = 10000;
export class SyntaxTree {
	_tree: Term;
	constructor(code: string) {
		this._tree = parseString(code);
	}

	betaReduce(attemptNominal = false) {
		let reduced: Term | null;
		let steps = REDUCTION_STEP_LIMIT;
		const replaced: Replacer = { at: [] };

		do {
			reduced = attemptNominal
				? this._greedyReductionStep(this._tree)
				: this._shallowReductionStep(this._tree, replaced);
			if (reduced) this._tree = reduced;
		} while (attemptNominal && reduced && --steps > 0);

		return replaced;
	}

	/** Performs as much reduction as possible in a single step */
	_greedyReductionStep(tree: Term): Term | null {
		switch (tree.type) {
			case "APPLICATION":
				// Reduce application
				const { left, right } = tree;

				const leftReduct = this._greedyReductionStep(left) ?? left;
				const rightReduct = this._greedyReductionStep(right) ?? right;
				if (left.type === "ABSTRACTION") {
					return this._substitute(left.body, left.param, right);
				} else {
					return {
						id: tree.id,
						type: "APPLICATION",
						left: leftReduct,
						right: rightReduct,
					};
				}

			case "ABSTRACTION":
				// Reduce abstraction body
				const bodyReduct = this._greedyReductionStep(tree.body);
				if (bodyReduct) {
					return {
						id: tree.id,
						type: "ABSTRACTION",
						param: tree.param,
						body: bodyReduct,
					};
				}
		}

		return null;
	}

	/** Perform one step of beta reduction */
	_shallowReductionStep(tree: Term, replaced: Replacer): Term | null {
		switch (tree.type) {
			case "APPLICATION":
				// Reduce application
				const { left, right } = tree;

				if (left.type === "ABSTRACTION") {
					replaced.by = right;
					return this._substitute(left.body, left.param, right, replaced);
				}

				const leftReduct = this._shallowReductionStep(left, replaced);
				if (leftReduct) {
					return {
						id: tree.id,
						type: "APPLICATION",
						left: leftReduct,
						right,
					};
				}

				const rightReduct = this._shallowReductionStep(right, replaced);
				if (rightReduct) {
					return {
						id: tree.id,
						type: "APPLICATION",
						left,
						right: rightReduct,
					};
				}
				break;

			case "ABSTRACTION":
				// Reduce abstraction body
				const bodyReduct = this._shallowReductionStep(tree.body, replaced);
				if (bodyReduct) {
					return {
						id: tree.id,
						type: "ABSTRACTION",
						param: tree.param,
						body: bodyReduct,
					};
				}
		}

		return null;
	}

	_substitute(tree: Term, from: symbol, to: Term, replaced?: Replacer): Term {
		// Quick escape for strings
		if (tree.type === "VARIABLE") {
			if (tree.symbol === from) {
				const copy = this._copy(to);
				replaced?.at!.push(copy);
				return copy;
			}
			return tree;
		}

		let sub: Term;
		if (tree.type === "APPLICATION") {
			// Dealing with application
			const { left, right } = tree;

			sub = {
				id: tree.id,
				type: "APPLICATION",
				left: this._substitute(left, from, to, replaced),
				right: this._substitute(right, from, to, replaced),
			};
		} else if (tree.param !== from) {
			// Dealing with abstraction
			sub = {
				id: tree.id,
				type: "ABSTRACTION",
				param: tree.param,
				body: this._substitute(tree.body, from, to, replaced),
			};
		} else {
			// Is abstraction, but shadows the term that we are trying to substitute
			sub = tree;
		}

		return sub;
	}

	_copy(tree: Term): Term {
		switch (tree.type) {
			case "VARIABLE":
				return {
					id: id.next().value,
					type: "VARIABLE",
					symbol: tree.symbol,
				};
			case "APPLICATION":
				return {
					id: id.next().value,
					type: "APPLICATION",
					left: this._copy(tree.left),
					right: this._copy(tree.right),
				};
			case "ABSTRACTION":
				return {
					id: id.next().value,
					type: "ABSTRACTION",
					param: tree.param,
					body: this._copy(tree.body),
				};
		}
	}

	toString() {
		return stringifyTree(this._tree);
	}
}

export const func_char = "@";
export function parseString(
	code: string,
	mapping = new Map<string, symbol>()
): Term {
	let left: Term | null = null;
	let right: Term | null = null;
	for (let i = 0; i < code.length; i++) {
		const char = code[i];
		if (char === " ") throw SyntaxError("No spaces allowed in code string");
		if (char === func_char) {
			// abstraction declaration
			const start = i + 3;
			const end = code.length;

			const paramChar = code[i + 1];
			const param = Symbol(paramChar);
			const localMapping = new Map(mapping);
			localMapping.set(paramChar, param);

			// All characters at this point must be consumed
			const body = parseString(code.slice(start, end), localMapping);
			const abstraction: Abstraction = {
				type: "ABSTRACTION",
				param,
				body,
				id: id.next().value,
			};

			if (!left) left = abstraction;
			else right = abstraction;

			i = end;
		} else if (char === "(") {
			// Perform parse within bracket group, this usually occurs before abstraction declarations
			const start = i + 1;
			const end = findBracketPair(code, i);

			let term = parseString(code.slice(start, end), mapping);
			if (!left) left = term;
			else right = term;

			i = end;
		} else {
			// Get correspnding symbol of variable
			const sym = mapping.get(char) ?? Symbol(char);
			if (!mapping.has(char)) mapping.set(char, sym);

			// Add single character as variable
			const variable: Term = {
				type: "VARIABLE",
				symbol: sym,
				id: id.next().value,
			};
			if (!left) left = variable;
			else right = variable;
		}

		if (right) {
			// Group a and b into an application
			left = { type: "APPLICATION", left, right, id: id.next().value };
			right = null;
		}
	}

	if (!left) throw "Cannot parse empty string";
	return left;
}
export function stringifyTree(tree: Term): string {
	let str = "";
	if (tree.type === "VARIABLE") {
		// Is this a dangerous assumption?
		str = tree.symbol.description!;
	} else if (tree.type === "APPLICATION") {
		// Dealing with application
		const { left, right } = tree;

		str += stringifyTree(left);

		// If the second term is an application itself, then explicitly parenthesize
		if (right.type === "APPLICATION") str += `(${stringifyTree(right)})`;
		else str += `${stringifyTree(right)}`;
	} else {
		// Dealing with abstraction
		const body = stringifyTree(tree.body);
		str = `(${func_char}${tree.param.description}.${body})`;
	}
	return str;
}

function findBracketPair(str: string, at: number): number {
	let count = 1;
	for (let i = at + 1; i < str.length; i++) {
		const char = str[i];
		if (char === "(") count++;
		else if (char === ")" && !--count) return i;
	}
	return -1;
}

export function code(
	strings: TemplateStringsArray,
	...values: string[]
): string {
	let str = "";
	for (let i = 0; i < values.length; i++) {
		str += strings[i];
		str += `(${values[i]})`;
	}
	str += strings.at(-1);
	return str.replaceAll(" ", "");
}
