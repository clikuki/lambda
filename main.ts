const func_char = "@";

interface Define {
	param: string;
	body: Apply | Define;
}
type Apply = (string | Define)[];
type SyntaxTree = Apply | Define;

class Program {
	_tree: SyntaxTree;
	constructor(code: string) {
		// TODO: Implement conversion from string to syntax tree
		this._tree = [];
	}

	betaReduce() {
		// TODO: Implement beta reduction
	}
}

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const IF = "@f.@x.@y.fxy";
const NOT = "@f.@x.@y.fyx";
const OR = "@f.@g.@x.@y.fxgxy";
const AND = "@f.@g.@x.@y.fgxyy";
