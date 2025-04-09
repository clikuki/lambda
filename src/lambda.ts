export interface Abstraction {
	param: Variable;
	body: Term;
}
export type Variable = symbol;
export type Application = [Term, Term];
export type Term = Application | Abstraction | Variable;

export function isVariable(tree: Term): tree is Variable {
	return typeof tree === "symbol";
}

export function isApplication(tree: Term): tree is Application {
	return Array.isArray(tree);
}

export function isAbstraction(tree: Term): tree is Abstraction {
	return !isVariable(tree) && !isApplication(tree);
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
		do {
			reduced = attemptNominal
				? this._greedyReductionStep(this._tree)
				: this._shallowReductionStep(this._tree);
			if (reduced) this._tree = reduced;
		} while (attemptNominal && reduced && --steps > 0);
	}

	/** Performs as much reduction as possible in a single step */
	_greedyReductionStep(tree: Term): Term | null {
		// No reduction for strings
		if (isVariable(tree)) return null;

		if (isApplication(tree)) {
			// Reduce application
			const [fn, arg] = tree;

			const fnReduct = this._greedyReductionStep(fn) ?? fn;
			const argReduct = this._greedyReductionStep(arg) ?? arg;
			if (!isApplication(fn) && !isVariable(fn)) {
				return this._substitute(fn.body, fn.param, arg);
			} else {
				return [fnReduct, argReduct];
			}
		} else {
			// Reduce abstraction body
			const fnBodyReduct = this._greedyReductionStep(tree.body);
			if (fnBodyReduct) {
				return {
					param: tree.param,
					body: fnBodyReduct,
				};
			}
		}

		return null;
	}

	/** Perform one step of beta reduction */
	_shallowReductionStep(tree: Term): Term | null {
		// No reduction for strings
		if (isVariable(tree)) return null;

		if (isApplication(tree)) {
			// Reduce application
			const [fn, arg] = tree;

			if (!isApplication(fn) && !isVariable(fn)) {
				return this._substitute(fn.body, fn.param, arg);
			}

			const fnReduct = this._shallowReductionStep(fn);
			if (fnReduct) return [fnReduct, arg];

			const argReduct = this._shallowReductionStep(arg);
			if (argReduct) return [fn, argReduct];
		} else {
			// Reduce abstraction body
			const fnBodyReduct = this._shallowReductionStep(tree.body);
			if (fnBodyReduct)
				return {
					param: tree.param,
					body: fnBodyReduct,
				};
		}

		return null;
	}

	_substitute(tree: Term, from: Variable, to: Term): Term {
		// Quick escape for strings
		if (tree === from) return this._copy(to);
		if (isVariable(tree)) return tree;

		let sub: Term;
		if (isApplication(tree)) {
			// Dealing with application
			const [a, b] = tree;

			sub = [this._substitute(a, from, to), this._substitute(b, from, to)];
		} else if (tree.param !== from) {
			// Dealing with abstraction
			sub = {
				param: tree.param,
				body: this._substitute(tree.body, from, to),
			};
		} else {
			// Is abstraction, but shadows the term that we are trying to substitute
			sub = tree;
		}

		return sub;
	}

	_copy(tree: Term): Term {
		if (isVariable(tree)) return tree;
		else if (isApplication(tree))
			return [this._copy(tree[0]), this._copy(tree[1])];
		else
			return {
				param: tree.param,
				body: this._copy(tree.body),
			};
	}

	toString() {
		return stringifyTree(this._tree);
	}
}

export const func_char = "@";
export function parseString(
	code: string,
	mapping = new Map<string, Variable>()
): Term {
	let a: Term | null = null;
	let b: Term | null = null;
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
				param,
				body,
			};

			if (!a) a = abstraction;
			else b = abstraction;

			i = end;
		} else if (char === "(") {
			// Perform parse within bracket group, this usually occurs before abstraction declarations
			const start = i + 1;
			const end = findBracketPair(code, i);

			let term = parseString(code.slice(start, end), mapping);
			if (!a) a = term;
			else b = term;

			i = end;
		} else {
			// Get correspnding symbol of variable
			const sym = mapping.get(char) ?? Symbol(char);
			if (!mapping.has(char)) mapping.set(char, sym);

			// Add single character as variable
			if (!a) a = sym;
			else b = sym;
		}

		if (b) {
			// Group a and b into an application
			a = [a, b];
			b = null;
		}
	}

	if (!a) throw "Cannot parse empty string";
	return a;
}
export function stringifyTree(tree: Term): string {
	let str = "";
	if (isVariable(tree)) {
		// Is this a dangerous assumption?
		str = tree.description!;
	} else if (isApplication(tree)) {
		// Dealing with application
		const [a, b] = tree;

		str += stringifyTree(a);

		// If the second term is an application itself, then explicitly parenthesize
		if (isApplication(b)) str += `(${stringifyTree(b)})`;
		else str += `${stringifyTree(b)}`;
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
