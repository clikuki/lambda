const func_char = "@";

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

	betaReduce() {
		// TODO: Implement beta reduction
	}
}

function parseString(code: string): Application {
	// @x.@y.x
	// @f.(@g.(@x.(@y.(fxgxy))))

	console.log(code);

	const applicationFrame: Application = [];
	for (let i = 0; i < code.length; i++) {
		const char = code[i];
		if (char === func_char) {
			// Delimit function body
			const isBracketed = code[i + 3] === "(";
			const start = i + (isBracketed ? 4 : 3);
			const end = isBracketed ? findBracketPair(code, i + 3) : code.length;

			applicationFrame.push({
				param: code[i + 1],
				body: parseString(code.slice(start, end)),
			});

			i = end;
		} else if (char === "(") {
			const start = i + 1;
			const end = findBracketPair(code, i);

			let applications = parseString(code.slice(start, end));
			applicationFrame.push(...applications);

			i = end;
		} else {
			applicationFrame.push(char);
		}
	}
	return applicationFrame;
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

// const program = new Program(`${IF}${TRUE}xy`);
// console.log(JSON.stringify(convertStringToTree(`(${IF})(${TRUE})xy`), null, 2));
console.log(JSON.stringify(parseString(`(@x.(fx)g)y`), null, 2));
