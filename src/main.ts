interface Abstraction {
	param: string;
	body: Term;
}
type Term = Application | Abstraction | string;
type Application = [Term, Term];

/*

(((@x.x)a)b)
( ((@x.x)a) b)
(( a )b)


(
	(
		(
			@x.x
		)
		a
	)
	b
)

(
	a
	b
)

*/

class SyntaxTree {
	_tree: Term;
	constructor(code: string) {
		this._tree = parseString(code);
	}

	/** Perform one step of beta reduction */
	betaReduce(tree?: Term) {
		if (!tree) {
			// Beta-reductions need to swap out items one level above it, so this just enables that
			// in situations where the tree is an application and is immediately reducible
			// ie. [ (@x.x)a -> a ] , all occuring at top-level
			const reduct = this.betaReduce(this._tree);
			if (reduct) this._tree = reduct;
			return;
		}

		// Quick escape for strings
		if (typeof tree === "string") return;

		if (tree instanceof Array) {
			// Dealing with application
			const first = tree[0];

			if (typeof first !== "string") {
				if (first instanceof Array) {
					// Reductions only occur inside an application so to update itself on the tree
					// it needs to communicate a change one level above
					const reduct = this.betaReduce(first);
					if (reduct) tree[0] = reduct;
				} else {
					// Actual beta-reduction step
					return this._substitute(first.body, first.param, tree[1]);
				}

				return;
			}

			this.betaReduce(tree[1]);
		} else {
			// Dealing with function
			this.betaReduce(tree.body);
		}
	}

	_substitute(tree: Term, from: string, to: Term): Term {
		// Quick escape for strings
		if (tree === from) return to;
		if (typeof tree === "string") return tree;

		let sub: Term;
		if (tree instanceof Array) {
			// Dealing with application
			const [a, b] = tree;

			sub = [this._substitute(a, from, to), this._substitute(b, from, to)];
		} else if (tree.param !== from) {
			// Dealing with function
			sub = {
				param: tree.param,
				body: this._substitute(tree.body, from, to),
			};
		} else {
			// Is function, but shadows the term that we are trying to substitute
			sub = tree;
		}

		return sub;
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
function stringifyTree(tree: Term): string {
	let str = "";
	if (typeof tree === "string") str = tree;
	else if (tree instanceof Array) {
		// Dealing with application
		for (const term of tree) {
			if (typeof term === "string") str += term;
			else str += stringifyTree(term as Abstraction);
		}
	} else {
		// Dealing with function
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

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const IF = "@f.@x.@y.fxy";
const NOT = "@f.@x.@y.fyx";
const OR = "@f.@g.@x.@y.fxgxy";
const AND = "@f.@g.@x.@y.fgxyy";

const syntaxTree = new SyntaxTree(`(${IF})(${TRUE})ab`);
console.log(syntaxTree.toString());
syntaxTree.betaReduce();
console.log(syntaxTree.toString());
syntaxTree.betaReduce();
console.log(syntaxTree.toString());
syntaxTree.betaReduce();
console.log(syntaxTree.toString());
syntaxTree.betaReduce();
console.log(syntaxTree.toString());
syntaxTree.betaReduce();
console.log(syntaxTree.toString());
