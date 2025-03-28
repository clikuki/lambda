interface Abstraction {
	param: string;
	body: Term;
}
type Term = Application | Abstraction | string;
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
		if (typeof tree === "string") return null;

		if (Array.isArray(tree)) {
			// Reduce application
			const [fn, arg] = tree;

			if (typeof fn !== "string") {
				const fnReduct = this._betaReduce(fn);
				if (fnReduct) return [fnReduct, arg];

				if (!Array.isArray(fn)) return this._substitute(fn.body, fn.param, arg);
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

	_substitute(tree: Term, from: string, to: Term): Term {
		// Quick escape for strings
		if (tree === from) return structuredClone(to);
		if (typeof tree === "string") return tree;

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

	alphaConvert(tree: Term) {}

	toString() {
		return stringifyTree(this._tree);
	}
}

const func_char = "@";
function parseString(code: string): Term {
	let a: Term | null = null;
	let b: Term | null = null;
	for (let i = 0; i < code.length; i++) {
		const char = code[i];
		if (char === " ") throw SyntaxError("No spaces allowed in code string");
		if (char === func_char) {
			// abstraction declaration
			const start = i + 3;
			const end = code.length;

			// All characters at this point must be consumed
			const abstraction = {
				param: code[i + 1],
				body: parseString(code.slice(start, end)),
			} satisfies Abstraction;

			if (!a) a = abstraction;
			else b = abstraction;

			i = end;
		} else if (char === "(") {
			// Perform parse within bracket group, this usually occurs before abstraction declarations
			const start = i + 1;
			const end = findBracketPair(code, i);

			let term = parseString(code.slice(start, end));
			if (!a) a = term;
			else b = term;

			i = end;
		} else {
			// Add single character as variable
			if (!a) a = char;
			else b = char;
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
	if (typeof tree === "string") str = tree;
	else if (Array.isArray(tree)) {
		// Dealing with application
		for (const term of tree) {
			if (typeof term === "string") str += term;
			else str += stringifyTree(term);
		}
	} else {
		// Dealing with abstraction
		const body = stringifyTree(tree.body);
		str = `(${func_char}${tree.param}.${body})`;
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
const IF = "@f.@x.@y.fxy";
const NOT = "@f.@x.@y.fyx";
const OR = "@f.@g.@x.@y.fx(gxy)";
const AND = "@f.@g.@x.@y.f(gxy)y";

const syntaxTree = new SyntaxTree(code`${IF}(${AND}${FALSE}${TRUE})ab`);
console.log(syntaxTree.toString());
syntaxTree.betaReduce(true);
console.log(syntaxTree.toString());
