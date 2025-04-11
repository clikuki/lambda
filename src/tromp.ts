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
	if (attr) setAttributes(svg, attr);
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
		// Find all parameters until first non-abstraction is hit
		const parameters: Variable[] = [];
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

function findExtremeTerm(
	term: DiagramTerm,
	direction: "LEFT" | "RIGHT"
): DiagramVariable {
	let current: DiagramTerm | null = term;
	let result: DiagramTerm | null = null;

	while (current) {
		switch (current.type) {
			case "ABSTRACTION":
				current = current.body;
				break;
			case "APPLICATION":
				current = direction === "LEFT" ? current.left : current.right;
				break;
			case "VARIABLE":
				result = current;
				current = null;
				break;
		}
	}

	if (!result || result.type !== "VARIABLE") {
		throw new SyntaxError(`Could not find ${direction}-most variable`);
	}
	return result;
}

function hasRightMostAbstraction(node: DiagramTerm): boolean {
	switch (node.type) {
		case "ABSTRACTION":
			return true;
		case "APPLICATION":
			return hasRightMostAbstraction(node.right);
		case "VARIABLE":
			return false;
	}
}

function computeHeights(t: DiagramTerm, y = style.linewidth / 2) {
	switch (t.type) {
		case "ABSTRACTION":
			t.paramLines = new Map(
				t.parameters.map((p) => {
					const lineY = y;
					y += style.paramLineGap;
					return [p, { symbol: p, y: lineY }];
				})
			);

			computeHeights(t.body, y);
			break;

		case "APPLICATION":
			computeHeights(t.left, y);
			computeHeights(t.right, y);

			const stem = findExtremeTerm(t.left, "LEFT");
			const branch = findExtremeTerm(t.right, "LEFT");

			t.y = branch.y2 = Math.max(stem.y2!, branch.y2!);
			stem.y2 = Math.max(stem.y2!, branch.y2 + style.applicationRowGap);
			break;

		case "VARIABLE":
			const { first, binding } = findRelevantAbstraction(t, t.symbol);
			t.y1 = binding?.paramLines?.get(t.symbol)?.y ?? -10;
			t.y2 = first?.paramLines?.get(first?.parameters.at(-1)!)?.y ?? 0;
			t.y2 += style.applicationRowGap;
			break;
	}
}

function computeWidths(t: DiagramTerm, x = 0) {
	switch (t.type) {
		case "ABSTRACTION":
			t.x1 = x;
			x += style.applicationColGap;

			computeWidths(t.body, x);

			// Abstraction/parameter line width
			const variable = findExtremeTerm(t.body, "RIGHT");
			t.x2 = variable.x! + style.applicationColGap;
			break;
		case "APPLICATION":
			computeWidths(t.left, x);

			// Update x to new position
			x = findExtremeTerm(t.left, "RIGHT").x! + style.applicationColGap;
			if (hasRightMostAbstraction(t.left)) x += style.pad;

			computeWidths(t.right, x);

			// Setup application line
			t.x1 = findExtremeTerm(t.left, "LEFT").x! - style.linewidth / 2;
			t.x2 = findExtremeTerm(t.right, "LEFT").x! + style.linewidth / 2;
			break;
		case "VARIABLE":
			t.x = x;
			break;
	}
}

function buildPath(tree: DiagramTerm): SVGElement {
	let pathStr = "";

	(function draw(node = tree) {
		switch (node.type) {
			case "ABSTRACTION":
				for (const [, line] of node.paramLines!) {
					line.y ??= style.linewidth / 2;
					pathStr += `M ${node.x1} ${line.y} L ${node.x2} ${line.y}`;
				}

				draw(node.body);
				break;

			case "APPLICATION":
				pathStr += `M ${node.x1} ${node.y} L ${node.x2} ${node.y}`;
				draw(node.left);
				draw(node.right);
				break;

			case "VARIABLE":
				pathStr += `M ${node.x} ${node.y1} L ${node.x} ${node.y2}`;
				break;
		}
	})();

	const elem = createSVG("path", { d: pathStr });
	return elem;
}

export function constructDiagram(tree: SyntaxTree) {
	const diagramTree = rebuildTree(tree._tree);
	computeHeights(diagramTree);
	computeWidths(diagramTree);

	let width = 0;
	let current: DiagramTerm | null = diagramTree;
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

	const height = findExtremeTerm(diagramTree, "LEFT").y2;

	const path = buildPath(diagramTree);
	const svg = createSVG("svg", {
		viewBox: `0 0 ${width} ${height}`,
		stroke: "black",
		"stroke-width": style.linewidth,
		"stroke-linecap": "butt",
	});
	svg.append(path);
	return svg;
}
