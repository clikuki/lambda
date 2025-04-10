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
	svg?: SVGElement;
	symbol: Variable;
	y: number;
}
interface DiagramAbstraction {
	type: "ABSTRACTION";
	parameters: Variable[];
	body: DiagramApplication | DiagramVariable;
	parent?: DiagramTerm;

	x?: number;
	y?: number;
	h?: number;
	w?: number;
	paramLines?: Map<symbol, ParameterLine>;
}
interface DiagramApplication {
	type: "APPLICATION";
	left: DiagramTerm;
	right: DiagramTerm;
	parent?: DiagramTerm;

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

export function constructDiagram(tree: SyntaxTree) {
	const AST = rebuildTree(tree._tree);
	setUpPositionAndSizes(AST);

	const path = buildPath(AST);
	const svg = createSVG("svg", {
		// FIXME: replace with actual diagram size
		viewBox: "0 0 50 50",
		stroke: "black",
		"stroke-width": style.linewidth,
		"stroke-linecap": "butt",
	});
	svg.append(path);
	return svg;
}

const style = {
	linewidth: 4,
	paramLineGap: 10,
	applicationRowGap: 10,
};
function setUpPositionAndSizes(tree: DiagramTerm) {
	// Pass 1: Get Heights
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

	(function heightPass(t: DiagramTerm, y = 0): DiagramTerm {
		switch (t.type) {
			case "ABSTRACTION":
				y += style.linewidth / 2;
				t.paramLines = new Map(
					t.parameters.map((p) => {
						const lineY = y;
						y += style.paramLineGap;
						return [p, { symbol: p, y: lineY }];
					})
				);

				heightPass(t.body);
				return t;
			case "APPLICATION":
				const h1 = heightPass(t.left, y);
				const h2 = heightPass(t.right, y);
				return t;
			case "VARIABLE":
				const { first, binding } = findRelevantAbstraction(t, t.symbol);
				t.y1 = binding?.paramLines?.get(t.symbol)?.y ?? -10;
				// FIXME: Could fail if no abstraction at all, should fix that
				t.y2 = first?.paramLines?.get(first?.parameters.at(-1)!)?.y;
				t.y2! += style.applicationRowGap;
				return t;
		}
	})(tree);
}

// TODO: implement path builder
function buildPath(tree: DiagramTerm): SVGElement {
	let pathStr = "";

	// function w
	(function draw(node = tree) {
		// let x1, x2, y1, y2;
		switch (node.type) {
			case "ABSTRACTION":
				node.x ??= 0;
				node.y ??= 0;
				node.w ??= 0;
				node.h ??= 0;
				for (const [, line] of node.paramLines!) {
					line.y ??= 0;
					pathStr += `M ${node.x} ${line.y} L ${node.x + node.w} ${line.y}`;
				}

				draw(node.body);
				break;
			case "APPLICATION":
				node.x1 ??= 0;
				node.x2 ??= 0;
				node.y ??= 0;
				pathStr += `M ${node.x1} ${node.y} L ${node.x2} ${node.y}`;
				draw(node.left);
				draw(node.right);
				break;
			case "VARIABLE":
				node.x ??= 0;
				node.y1 ??= 0;
				node.y2 ??= 0;
				pathStr += `M ${node.x} ${node.y1} L ${node.x} ${node.y2}`;
				break;
		}
	})();

	const elem = createSVG("path", { d: pathStr });
	return elem;
}
