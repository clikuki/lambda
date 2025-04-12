import { SyntaxTree, type Abstraction, type Term } from "./lambda.js";
import { createSVG, ID, setAttributes } from "./utils.js";

interface Parameter {
	symbol: symbol;
	y: number;
	id: ID;
}
interface DiagramAbstraction {
	type: "ABSTRACTION";
	parameters: [symbol, ID][];
	body: DiagramApplication | DiagramVariable;
	parent?: DiagramTerm;
	id: ID;

	x1?: number;
	x2?: number;
	y1?: number;
	y2?: number;
	paramLines?: Map<symbol, Parameter>;
}
interface DiagramApplication {
	type: "APPLICATION";
	left: DiagramTerm;
	right: DiagramTerm;
	parent?: DiagramTerm;
	id: ID;

	x1?: number;
	x2?: number;
	y?: number;
}
interface DiagramVariable {
	type: "VARIABLE";
	symbol: symbol;
	parent?: DiagramTerm;
	id: ID;

	x?: number;
	y1?: number;
	y2?: number;
}
type DiagramTerm = DiagramAbstraction | DiagramApplication | DiagramVariable;

function rebuildTree(tree: Term): DiagramTerm {
	if (tree.type === "VARIABLE")
		return {
			type: "VARIABLE",
			symbol: tree.symbol,
			id: tree.id,
		};
	else if (tree.type === "APPLICATION") {
		const left = rebuildTree(tree.left);
		const right = rebuildTree(tree.right);
		const node: DiagramApplication = {
			type: "APPLICATION",
			left,
			right,
			id: tree.id,
		};
		left.parent = node;
		right.parent = node;
		return node;
	} else {
		// Find all parameters until first non-abstraction is hit
		const parameters: [symbol, ID][] = [];
		const trueBody = (function findParameters(node = tree): Term {
			parameters.push([node.param, node.id]);
			if (node.body.type === "ABSTRACTION") return findParameters(node.body);
			else return node.body;
		})();

		const node: DiagramAbstraction = {
			type: "ABSTRACTION",
			parameters,
			body: rebuildTree(trueBody) as DiagramVariable,
			id: tree.id,
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

function findRelevantAbstraction(node: DiagramTerm, sym: symbol) {
	let binding: DiagramAbstraction | null = null;
	let current: DiagramTerm | undefined = node;

	while (current) {
		if (current.type === "ABSTRACTION") {
			if (current.paramLines?.has(sym)) {
				binding = current;
				break; // Stop once we find the binding abstraction
			}
		}
		current = current.parent;
	}

	return binding;
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

function hasAbstractionAtExtreme(
	node: DiagramTerm,
	direction: "LEFT" | "RIGHT"
): boolean {
	switch (node.type) {
		case "ABSTRACTION":
			return true;
		case "APPLICATION":
			const child = direction === "LEFT" ? node.left : node.right;
			return hasAbstractionAtExtreme(child, direction);
		case "VARIABLE":
			return false;
	}
}

function computeHeights(t: DiagramTerm, y = 0) {
	switch (t.type) {
		case "ABSTRACTION":
			t.y1 = y;
			t.paramLines = new Map(
				t.parameters.map(([p, id]) => {
					const lineY = y + style.linewidth / 2;
					y += style.paramLineGap;
					return [p, { symbol: p, y: lineY, id }];
				})
			);

			computeHeights(t.body, y);

			t.y2 = findExtremeTerm(t.body, "LEFT").y2;
			break;

		case "APPLICATION":
			computeHeights(t.left, y);
			computeHeights(t.right, y);

			const stem = findExtremeTerm(t.left, "LEFT");
			const branch = findExtremeTerm(t.right, "LEFT");

			t.y = branch.y2 = Math.max(stem.y2!, branch.y2!);
			stem.y2 = Math.max(stem.y2!, branch.y2 + style.paramLineGap);
			break;

		case "VARIABLE":
			const binding = findRelevantAbstraction(t, t.symbol);
			const line = binding?.paramLines?.get(t.symbol);
			t.y1 = line?.y ?? y + style.applicationRowGap / 2;
			t.y2 = y + style.applicationRowGap;
			break;
	}
}

function computeWidths(t: DiagramTerm, x = 0) {
	switch (t.type) {
		case "ABSTRACTION":
			t.x1 = x;
			if (!hasAbstractionAtExtreme(t.body, "LEFT")) {
				// Avoids compounding left paddings with separate inner abstractions
				x += style.applicationColGap;
			}

			computeWidths(t.body, x);

			// Abstraction/parameter line width
			const variable = findExtremeTerm(t.body, "RIGHT");
			t.x2 = variable.x! + style.applicationColGap;
			break;
		case "APPLICATION":
			computeWidths(t.left, x);

			// Update x to new position
			x = findExtremeTerm(t.left, "RIGHT").x! + style.applicationColGap;
			if (hasAbstractionAtExtreme(t.left, "RIGHT")) x += style.pad;

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

function getTreeSize(tree: DiagramTerm): [number, number] {
	const height = findExtremeTerm(tree, "LEFT").y2 ?? 0;

	let width = 0;
	if (tree.type === "ABSTRACTION") {
		width = tree.x2! - tree.x1!;
	} else {
		let current: DiagramTerm | null = tree;
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
					break;
			}
		}
	}

	return [height, width];
}

export function constructDiagram(tree: SyntaxTree) {
	const diagramTree = rebuildTree(tree._tree);
	computeHeights(diagramTree);
	computeWidths(diagramTree);
	return diagramTree;
}

export function renderDiagram(tree: DiagramTerm, scale = 1) {
	const [height, width] = getTreeSize(tree);

	const elem = createSVG("svg", {
		viewBox: `0 0 ${width} ${height}`,
		stroke: "black",
		width: width * scale,
		height: height * scale,
		"stroke-width": style.linewidth,
		"stroke-linecap": "butt",
	});

	(function draw(node: DiagramTerm, svg = elem, ox = 0, oy = 0) {
		switch (node.type) {
			case "ABSTRACTION":
				const [subheight, subwidth] = getTreeSize(node);
				const newOx = node.x1! - ox;
				const newOy = node.y1! - oy;

				// console.trace({
				// 	// Node size
				// 	nodeWidth: node.x2! - node.x1!,
				// 	nodeHeight: node.y2! - node.y1!,
				// 	// Tree size
				// 	treeWidth: getTreeSize(node)[1],
				// 	treeHeight: getTreeSize(node)[0],
				// });

				const absSvg = createSVG("svg", {
					"lambda-id": node.id.str,
					viewBox: `${newOx} ${newOy} ${subwidth} ${subheight}`,
					x: newOx,
					y: newOy,
					width: subwidth,
					height: subheight,
					stroke: "black",
					"stroke-width": style.linewidth,
					"stroke-linecap": "butt",
				});

				for (const [sym, line] of node.paramLines!) {
					absSvg.appendChild(
						createSVG("line", {
							"lambda-id": line.id.str,
							"lambda-var": sym.description,
							x1: node.x1!,
							x2: node.x2!,
							y1: line.y,
							y2: line.y,
						})
					);
				}

				draw(node.body, absSvg, newOx, newOy);
				svg.appendChild(absSvg);
				break;

			case "APPLICATION":
				const applicationLine = createSVG("line", {
					"lambda-id": node.id.str,
					x1: node.x1!,
					x2: node.x2!,
					y1: node.y!,
					y2: node.y!,
				});
				svg.appendChild(applicationLine);

				draw(node.left, svg, ox, oy);
				draw(node.right, svg, ox, oy);
				break;

			case "VARIABLE":
				const variableLine = createSVG("line", {
					"lambda-id": node.id.str,
					x1: node.x!,
					x2: node.x!,
					y1: node.y1!,
					y2: node.y2!,
				});
				svg.appendChild(variableLine);
				break;
		}
	})(tree);

	return elem;
}

export function animateDiagram(before: SVGElement, after: SVGElement) {
	(function update(el: SVGElement) {})(before);
}
