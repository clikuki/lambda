import { SyntaxTree, type Abstraction, type Term } from "./lambda.js";

interface ParameterLine {
	symbol: symbol;
	y: number;
}
interface DiagramAbstraction {
	type: "ABSTRACTION";
	parameters: symbol[];
	body: DiagramApplication | DiagramVariable;
	parent?: DiagramTerm;
	id: symbol;

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
	id: symbol;

	x1?: number;
	x2?: number;
	y?: number;
}
interface DiagramVariable {
	type: "VARIABLE";
	symbol: symbol;
	parent?: DiagramTerm;
	id: symbol;

	x?: number;
	y1?: number;
	y2?: number;
}
type DiagramTerm = DiagramAbstraction | DiagramApplication | DiagramVariable;

function setAttributes(elem: Element, attr: Record<string, any>) {
	for (const key in attr) {
		// console.trace(key, attr[key]);
		elem.setAttribute(key, attr[key]);
	}
}
function createSVG(tag: string, attr?: Record<string, any>) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", tag);
	if (attr) setAttributes(svg, attr);
	return svg;
}

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
		const parameters: symbol[] = [];
		const trueBody = (function findParameters(tree: Abstraction): Term {
			parameters.push(tree.param);
			if (tree.body.type === "ABSTRACTION") return findParameters(tree.body);
			else return tree.body;
		})(tree);

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

function computeHeights(t: DiagramTerm, y = style.linewidth / 2) {
	switch (t.type) {
		case "ABSTRACTION":
			t.y1 = y;
			t.paramLines = new Map(
				t.parameters.map((p) => {
					const lineY = y;
					y += style.paramLineGap;
					return [p, { symbol: p, y: lineY }];
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

	return [height, width];
}

export function constructDiagram(tree: SyntaxTree) {
	const diagramTree = rebuildTree(tree._tree);
	computeHeights(diagramTree);
	computeWidths(diagramTree);
	return diagramTree;
}

export function renderDiagram(tree: DiagramTerm) {
	const [height, width] = getTreeSize(tree);

	const elem = createSVG("svg", {
		viewBox: `0 0 ${width} ${height}`,
		stroke: "black",
		"stroke-width": style.linewidth,
		"stroke-linecap": "butt",
	});

	const debugCircles: SVGElement[] = [];
	(function draw(node: DiagramTerm, svg = elem, ox = 0, oy = 0) {
		switch (node.type) {
			case "ABSTRACTION":
				const [subheight, subwidth] = getTreeSize(node);
				const newOx = node.x1! - ox;
				const newOy = node.y1! - oy;

				// // Debug: Show abstraction bounding box
				// svg.appendChild(
				// 	createSVG("rect", {
				// 		x: node.x1,
				// 		y: node.y1,
				// 		width: node.x2! - node.x1!,
				// 		height: node.y2! - node.y1!,
				// 		fill: "red",
				// 		stroke: "none",
				// 	})
				// );

				const absSvg = createSVG("svg", {
					viewBox: `${-newOx} ${-newOy} ${subwidth} ${subheight}`,
					width: subwidth,
					height: subheight,
					stroke: "black",
					"stroke-width": style.linewidth,
					"stroke-linecap": "butt",
				});

				console.log(node, newOx, newOy);
				for (const [, line] of node.paramLines!) {
					const clr =
						"#" + (((1 << 24) * Math.random()) | 0).toString(16).padStart(6, "0");
					debugCircles.push(
						createSVG("circle", {
							cx: node.x1,
							cy: line.y,
							r: 0.5,
							stroke: clr,
							"z-index": 1,
						})
					);
					debugCircles.push(
						createSVG("circle", {
							cx: node.x2,
							cy: line.y,
							r: 0.5,
							stroke: clr,
							"z-index": 1,
						})
					);

					const paramLine = createSVG("line", {
						x1: node.x1! - newOx,
						x2: node.x2! - newOx,
						y1: line.y - newOy,
						y2: line.y - newOy,
					});
					absSvg.appendChild(paramLine);

					elem.appendChild(
						createSVG("line", {
							x1: node.x1!,
							x2: node.x2!,
							y1: line.y,
							y2: line.y,
							stroke: "red",
						})
					);
				}

				draw(node.body, absSvg, newOx, newOy);
				svg.appendChild(absSvg);
				break;

			case "APPLICATION":
				const applicationLine = createSVG("line", {
					x1: node.x1! - ox,
					x2: node.x2! - ox,
					y1: node.y! - oy,
					y2: node.y! - oy,
				});
				svg.appendChild(applicationLine);

				draw(node.left, svg, ox, oy);
				draw(node.right, svg, ox, oy);
				break;

			case "VARIABLE":
				const variableLine = createSVG("line", {
					x1: node.x! - ox,
					x2: node.x! - ox,
					y1: node.y1! - oy,
					y2: node.y2! - oy,
				});
				svg.appendChild(variableLine);
				break;
		}
	})(tree);
	// elem.append(...debugCircles);
	// })(isAbstraction ? tree.body : tree);

	// const path = buildPath(tree);
	// svg.append(path);
	return elem;
}
