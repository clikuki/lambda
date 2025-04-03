interface Abstraction {
	param: symbol;
	body: Term;
}
type Term = Application | Abstraction | symbol;
type Application = [Term, Term];

class SyntaxTree {
	_tree: Term;
	constructor(code: string) {
		this._tree = parseString(code);
	}

	betaReduce(attemptNominal = false) {
		let reduced: Term | null;
		do {
			reduced = this._betaReduce(this._tree);
			if (reduced) this._tree = reduced;
		} while (attemptNominal && reduced);
	}

	/** Perform one step of beta reduction */
	_betaReduce(tree: Term): Term | null {
		// No reduction for strings
		if (typeof tree === "symbol") return null;

		if (Array.isArray(tree)) {
			// Reduce application
			const [fn, arg] = tree;

			if (typeof tree !== "symbol") {
				const fnReduct = this._betaReduce(fn);
				if (fnReduct) return [fnReduct, arg];

				if (!Array.isArray(fn) && typeof fn !== "symbol") {
					return this._substitute(fn.body, fn.param, arg);
				}
			}

			const argReduct = this._betaReduce(arg);
			if (argReduct) return [fn, argReduct];
		} else {
			// Reduce abstraction body
			const fnBodyReduct = this._betaReduce(tree.body);
			if (fnBodyReduct)
				return {
					param: tree.param,
					body: fnBodyReduct,
				};
		}

		return null;
	}

	_substitute(tree: Term, from: symbol, to: Term): Term {
		// Quick escape for strings
		if (tree === from) return this._copy(to);
		if (typeof tree === "symbol") return tree;

		let sub: Term;
		if (Array.isArray(tree)) {
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
		if (typeof tree === "symbol") return tree;
		else if (Array.isArray(tree))
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

const func_char = "@";
function parseString(code: string, mapping = new Map<string, symbol>()): Term {
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
function stringifyTree(tree: Term): string {
	let str = "";
	if (typeof tree === "symbol") {
		// Is this a dangerous assumption?
		str = tree.description!;
	} else if (Array.isArray(tree)) {
		// Dealing with application
		for (const term of tree) {
			if (typeof term === "symbol") str += term.description;
			else str += stringifyTree(term);
		}
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

function code(strings: TemplateStringsArray, ...values: string[]): string {
	let str = "";
	for (let i = 0; i < values.length; i++) {
		str += strings[i];
		str += `(${values[i]})`;
	}
	str += strings.at(-1);
	return str.replaceAll(" ", "");
}

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const NOT = code`@f.f${FALSE}${TRUE}`;
const OR = "@f.@g.@x.@y.fx(gxy)";
const AND = "@f.@g.@x.@y.f(gxy)y";

const syntaxTree = new SyntaxTree(code`@f.${NOT}(${AND}f${TRUE})`);
console.log(syntaxTree.toString());
syntaxTree.betaReduce(true);
console.log(syntaxTree.toString());
