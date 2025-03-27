interface Definition {
	param: string;
	body: Application;
}
type Application = (Definition | string)[];

class Program {
	_tree: Application;
	constructor(code: string) {
		this._tree = parseString(code);
	}

	betaReduce(syntax: Application | Definition = this._tree) {
		// TODO: Finish implementation of beta-reduction
		if (syntax instanceof Array) {
			// Dealing with application
			let func: Definition | null = null;
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
	alphaConversion(syntax: Application, term: Definition | string): Application {
		return syntax;
	}

	toString() {
		return stringifyTree(this._tree);
	}
}

const func_char = "@";
function parseString(code: string): Application {
	const applicationFrame: Application = [];
	for (let i = 0; i < code.length; i++) {
		const char = code[i];
		if (char === func_char) {
			// Function declaration
			const start = i + 3;
			const end = code.length;

			applicationFrame.push({
				param: code[i + 1],
				body: parseString(code.slice(start, end)),
			});

			// All characters at this point have been consumed
			break;
		} else if (char === "(") {
			// Perform parse within bracket group, this usually occurs before function declarations
			const start = i + 1;
			const end = findBracketPair(code, i);

			let applications = parseString(code.slice(start, end));
			applicationFrame.push(...applications);

			i = end;
		} else {
			// Add single character as variable
			applicationFrame.push(char);
		}
	}
	return applicationFrame;
}
function stringifyTree(syntax: Application | Definition): string {
	let str = "";
	if (syntax instanceof Array) {
		// Dealing with application
		for (const term of syntax) {
			if (typeof term === "string") str += term;
			else str += stringifyTree(term as Definition);
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
program.betaReduce();
console.log(program.toString());
