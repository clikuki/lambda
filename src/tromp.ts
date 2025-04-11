import {
	isAbstraction,
	isApplication,
	isVariable,
	type Variable,
	type Abstraction,
	type Term,
	SyntaxTree,
} from "./lambda.js";

interface ParameterLine {
	symbol: Variable;
	y: number;
}
interface DiagramAbstraction {
	type: "ABSTRACTION";
	parameters: Variable[];
	body: DiagramApplication | DiagramVariable;
	parent?: DiagramTerm;

	x1?: number;
	x2?: number;
	y1?: number;
	y2?: number;
	paramLines?: Map<symbol, ParameterLine>;
}
interface DiagramApplication {
	type: "APPLICATION";
	left: DiagramTerm;
	right: DiagramTerm;
	parent?: DiagramTerm;
	leftmost?: DiagramTerm;

	x1?: number;
	x2?: number;
	y?: number;
}
interface DiagramVariable {
	type: "VARIABLE";
	symbol: Variable;
	parent?: DiagramTerm;

	x?: number;
	y1?: number;
	y2?: number;
}
type DiagramTerm = DiagramAbstraction | DiagramApplication | DiagramVariable;

function setAttributes(elem: Element, attr: Record<string, any>) {
	for (const key in attr) {
		elem.setAttribute(key, attr[key]);
	}
}
function createSVG(tag: string, attr?: Record<string, any>) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", tag);
	if (attr) setAttributes(svg, { ...attr, xmnls: "http://www.w3.org/2000/svg" });
	return svg;
}

function rebuildTree(tree: Term): DiagramTerm {
	if (isVariable(tree))
		return {
			type: "VARIABLE",
			symbol: tree,
		};
	else if (isApplication(tree)) {
		const left = rebuildTree(tree[0]);
		const right = rebuildTree(tree[1]);
		const node: DiagramApplication = {
			type: "APPLICATION",
			left,
			right,
		};
		left.parent = node;
		right.parent = node;
		return node;
	} else {
		const parameters: Variable[] = [];

		// Find all parameters until first non-abstraction is hit
		const trueBody = (function findParameters(tree: Abstraction) {
			parameters.push(tree.param);
			if (isAbstraction(tree.body)) return findParameters(tree.body);
			else return tree.body;
		})(tree);

		const node: DiagramAbstraction = {
			type: "ABSTRACTION",
			parameters,
			body: rebuildTree(trueBody) as DiagramApplication | DiagramVariable,
		};
		node.body.parent = node;
		return node;
	}
}

const style = {
	linewidth: 2,
	paramLineGap: 6,
	applicationRowGap: 10,
	applicationColGap: 10,
	pad: 2,
};
export function constructDiagram(tree: SyntaxTree) {
	const AST = rebuildTree(tree._tree);
	setUpPositionAndSizes(AST);

	let width = 0;
	let current: DiagramTerm | null = AST;
	while (current) {
		switch (current.type) {
			case "ABSTRACTION":
				width = current.x2!;
				current = null;
				break;
			case "APPLICATION":
				current = current.right;
				break;
			case "VARIABLE":
				width = current.x!;
				current = null;
		}
	}

	const height = findLeftMostTerm(AST).y2;

	const path = buildPath(AST);
	const svg = createSVG("svg", {
		viewBox: `0 0 ${width} ${height}`,
		stroke: "black",
		"stroke-width": style.linewidth,
		"stroke-linecap": "butt",
	});
	svg.append(path);
	return svg;
}

function findRelevantAbstraction(node: DiagramTerm, sym: Variable) {
	let first: DiagramAbstraction | null = null;
	let binding: DiagramAbstraction | null = null;
	let current: DiagramTerm | undefined = node;

	while (current) {
		if (current.type === "ABSTRACTION") {
			if (!first) first = current;
			if (current.paramLines?.has(sym)) {
				binding = current;
				break; // Stop once we find the binding abstraction
			}
		}
		current = current.parent;
	}

	return { first, binding };
}

function findLeftMostTerm(term: DiagramTerm) {
	let variable: DiagramTerm | null = null;
	let current: DiagramTerm | null = term;
	while (current) {
		switch (current.type) {
			case "ABSTRACTION":
				current = current.body;
				break;
			case "APPLICATION":
				current = current.left;
				break;
			case "VARIABLE":
				variable = current;
				current = null;
				break;
		}
	}

	if (!variable) throw SyntaxError("Could not find leftmost variable");

	return variable;
}

function findRightMostTerm(term: DiagramTerm) {
	let variable: DiagramTerm | null = null;
	let current: DiagramTerm | null = term;
	while (current) {
		switch (current.type) {
			case "ABSTRACTION":
				current = current.body;
				break;
			case "APPLICATION":
				current = current.right;
				break;
			case "VARIABLE":
				variable = current;
				current = null;
				break;
		}
	}

	if (!variable) throw SyntaxError("Could not find leftmost variable");

	return variable;
}

function countLeaves(node: DiagramTerm): number {
	switch (node.type) {
		case "ABSTRACTION":
			return countLeaves(node.body);
		case "APPLICATION":
			return countLeaves(node.left) + countLeaves(node.right);
		case "VARIABLE":
			return 1;
	}
}

function setUpPositionAndSizes(tree: DiagramTerm) {
	console.log(tree);
	// switch (h2.type) {
	// 	case "ABSTRACTION":
	// 		break;
	// 	case "APPLICATION":
	// 		break;
	// 	case "VARIABLE":
	// 		break;
	// }

	// Pass 1: Calculate y values
	(function heightPass(t: DiagramTerm, y = style.linewidth / 2): DiagramTerm {
		switch (t.type) {
			case "ABSTRACTION":
				t.paramLines = new Map(
					t.parameters.map((p) => {
						const lineY = y;
						y += style.paramLineGap;
						return [p, { symbol: p, y: lineY }];
					})
				);

				heightPass(t.body, y);
				return t;
			case "APPLICATION":
				const h1 = heightPass(t.left, y);
				const h2 = heightPass(t.right, y);
				const stem = findLeftMostTerm(h1);
				const branch = findLeftMostTerm(h2);

				stem.y2 = branch.y2 = Math.max(stem.y2!, branch.y2!);
				t.y = branch.y2;

				// console.log(stem, stem.y2, (branch.y2 ?? 0) + style.applicationRowGap);
				stem.y2 = Math.max(
					stem.y2 ?? 0,
					(branch.y2 ?? 0) + style.applicationRowGap
				);

				return t;
			case "VARIABLE":
				// Possibly end height could be determined tracking depth?
				const { first, binding } = findRelevantAbstraction(t, t.symbol);
				t.y1 = binding?.paramLines?.get(t.symbol)?.y ?? -10;
				// FIXME: Could fail if no abstraction at all, should fix that
				t.y2 = first?.paramLines?.get(first?.parameters.at(-1)!)?.y;
				t.y2! += style.applicationRowGap;
				return t;
		}
	})(tree);

	// Pass 2: Calculate x values
	(function widthPass(t: DiagramTerm, x = 0): DiagramTerm {
		switch (t.type) {
			case "ABSTRACTION":
				t.x1 = x + (!x ? 0 : style.pad / 2);
				x += style.applicationColGap;

				widthPass(t.body, x);

				const variable = findRightMostTerm(t.body);
				t.x2 = variable.x! - style.pad / 2 + style.applicationColGap;
				return t;
			case "APPLICATION":
				const h1 = widthPass(t.left, x);

				x = findRightMostTerm(h1).x! + style.applicationColGap;
				// if (t.right.type === "ABSTRACTION") x += style.pad;
				const h2 = widthPass(t.right, x);

				const stem = findLeftMostTerm(h1);
				const branch = findLeftMostTerm(h2);

				t.x1 = stem.x! - style.linewidth / 2;
				t.x2 = branch.x! + style.linewidth / 2;
				return t;
			case "VARIABLE":
				t.x = x;
				return t;
		}
	})(tree);
}

function buildPath(tree: DiagramTerm): SVGElement {
	let pathStr = "";

	// function w
	(function draw(node = tree) {
		switch (node.type) {
			case "ABSTRACTION":
				node.x1 ??= style.linewidth / 2;
				node.x2 ??= style.linewidth / 2;
				node.y1 ??= style.linewidth / 2;
				node.y2 ??= style.linewidth / 2;
				for (const [, line] of node.paramLines!) {
					line.y ??= style.linewidth / 2;
					pathStr += `M ${node.x1} ${line.y} L ${node.x2} ${line.y}`;
				}

				draw(node.body);
				break;
			case "APPLICATION":
				node.x1 ??= style.linewidth / 2;
				node.x2 ??= style.linewidth / 2;
				node.y ??= style.linewidth / 2;
				pathStr += `M ${node.x1} ${node.y} L ${node.x2} ${node.y}`;
				// console.log(node.x1, node.x2, node.y);
				draw(node.left);
				draw(node.right);
				break;
			case "VARIABLE":
				node.x ??= style.linewidth / 2;
				node.y1 ??= style.linewidth / 2;
				node.y2 ??= style.linewidth / 2;
				// console.log(node.x, node.y1, node.y2);
				pathStr += `M ${node.x} ${node.y1} L ${node.x} ${node.y2}`;
				break;
		}
	})();

	const elem = createSVG("path", { d: pathStr });
	return elem;
}
