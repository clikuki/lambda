interface Abstraction {
	param: string;
	body: Term;
}
type Term = Application | Abstraction | string;
type Application = [Term, Term];

class Program {
	_tree: Term;
	constructor(code: string) {
		this._tree = parseString(code);
	}

	betaReduce(syntax: Term = this._tree) {
		// TODO: Finish implementation of beta-reduction
		if (syntax instanceof Array) {
			// Dealing with application
			let func: Abstraction | null = null;
			for (let i = 0; i < syntax.length; i++) {
				const term = syntax[i];

				if (!func) {
					// Find first occurence of a function
					if (typeof term !== "string") func = term;
				} else {
					// Substitute all instances of param with current term
					this.alphaConversion(func.body, func.param);
					syntax.splice(i - 1, i, ...func.body);
				}
			}
		} else {
			// Dealing with function
			this.betaReduce(syntax.body);
		}
	}

	// TODO: Finish implementation of alpha-conversion
	alphaConversion(syntax: Application, term: Abstraction | string): Application {
		return syntax;
	}

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
		if (char === func_char) {
			// Function declaration
			const start = i + 3;
			const end = code.length;

			// All characters at this point will be consumed
			const abstraction = {
				param: code[i + 1],
				body: parseString(code.slice(start, end)),
			} satisfies Abstraction;

			if (!a) a = abstraction;
			else b = abstraction;

			i = end;
		} else if (char === "(") {
			// Perform parse within bracket group, this usually occurs before function declarations
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
function stringifyTree(syntax: Term): string {
	let str = "";
	if (typeof syntax === "string") str = syntax;
	else if (syntax instanceof Array) {
		// Dealing with application
		for (const term of syntax) {
			if (typeof term === "string") str += term;
			else str += stringifyTree(term as Abstraction);
		}
	} else {
		// Dealing with function
		const body = stringifyTree(syntax.body);
		str = `(${func_char}${syntax.param}.${body})`;
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

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const IF = "@f.@x.@y.fxy";
const NOT = "@f.@x.@y.fyx";
const OR = "@f.@g.@x.@y.fxgxy";
const AND = "@f.@g.@x.@y.fgxyy";

const program = new Program(`(${IF})(${TRUE})xy`);
// program.betaReduce();
console.log(program.toString());
