import { Replacer, Lambda, type Term } from "./lambda.js";
import { createSVG, ID, setAttributes } from "./utils.js";

const startTime = Date.now();

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
	paramLines?: [symbol, Parameter][];
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

interface UndoData {
	prevLambdaTree: Term;
	transitions: Map<string, Record<string, string>>;
	reduction: {
		fromId: string;
		fromAttr: Record<string, string>;
		atIds: string[];
	}[];
	deleted: Record<string, string>[];
}

const style = {
	linewidth: 2,
	paramLineGap: 6,
	applicationRowGap: 10,
	applicationColGap: 10,
	pad: 2,
};

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
			id: parameters.at(-1)![1],
		};
		node.body.parent = node;
		return node;
	}
}

function findRelevantAbstraction(node: DiagramTerm, sym: symbol) {
	let binding: DiagramAbstraction | null = null;
	let current: DiagramTerm | undefined = node;

	while (current) {
		if (current.type === "ABSTRACTION") {
			if (current.paramLines?.find(([s]) => s === sym)) {
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
			t.paramLines = t.parameters.map(([p, id]) => {
				const lineY = y + style.linewidth / 2;
				y += style.paramLineGap;
				return [p, { symbol: p, y: lineY, id }];
			});

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
			const symLinePair = binding?.paramLines?.find(([s]) => s === t.symbol);
			t.y1 = symLinePair?.[1].y ?? y + style.applicationRowGap / 2;
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
			t.x = x + style.linewidth / 2;
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
					width = current.x! + style.linewidth / 2;
					current = null;
					break;
			}
		}
	}

	return [height, width];
}

function matchNodes(
	main: Term,
	sides: Term[],
	matches: [Term, Term[]][],
	b: SVGElement,
	a: SVGElement
) {
	matches.push([main, sides]);
	switch (main.type) {
		case "ABSTRACTION":
			matchNodes(
				main.body,
				sides.map((s) => {
					if (s.type !== main.type) throw Error("Side tree does not match");
					return s.body;
				}),
				matches,
				b,
				a
			);
			break;
		case "APPLICATION":
			for (const branch of ["left", "right"] as const) {
				matchNodes(
					main[branch],
					sides.map((s) => {
						if (s.type !== "APPLICATION") throw Error("Side tree does not match");
						return s[branch];
					}),
					matches,
					b,
					a
				);
			}
	}
}

function animateAttributes(
	mutations: (() => void)[],
	mainEl: SVGElement,
	sideEls: [SVGElement, ID?][],
	attributes: string[]
) {
	const oldAttr = new Map(
		attributes.map((attr) => [attr, mainEl.getAttribute(attr)!])
	);

	let isFirst = true;
	const begin = `${Date.now() - startTime}ms`;
	for (const [sideEl, newID] of sideEls) {
		const copy = isFirst ? mainEl : (mainEl.cloneNode() as SVGElement);
		isFirst = false;

		const newAttr: Record<string, string> = {};
		const animations = attributes.flatMap((attr) => {
			const newValue = sideEl.getAttribute(attr) ?? "";
			if (newValue === oldAttr.get(attr)) return [];
			newAttr[attr] = newValue;

			const animate = createSVG("animate", {
				attributeName: attr,
				to: newValue,
				dur: ".3s",
				begin,
				fill: "freeze",
			});

			animate.addEventListener("endEvent", () => {
				setAttributes(copy, newAttr);
				animate.remove();
			});
			return animate;
		});

		mutations.push(() => {
			if (newID) copy.setAttribute("lambda-id", newID.str);
			copy.append(...animations);
			if (copy !== mainEl) mainEl.parentNode!.appendChild(copy);
		});
	}

	return oldAttr;
}

function buildPath(tree: DiagramTerm): SVGElement {
	const [height, width] = getTreeSize(tree);
	const container = createSVG("svg", {
		viewBox: `0 0 ${width} ${height}`,
		stroke: "black",
		width: width,
		height: height,
		"stroke-width": style.linewidth,
		"stroke-linecap": "butt",
	});

	(function draw(node: DiagramTerm) {
		switch (node.type) {
			case "ABSTRACTION":
				for (const [, line] of node.paramLines!) {
					container.appendChild(
						createSVG("line", {
							"lambda-id": line.id.str,
							x1: node.x1,
							y1: line.y,
							x2: node.x2,
							y2: line.y,
						})
					);
				}

				draw(node.body);
				break;

			case "APPLICATION":
				container.appendChild(
					createSVG("line", {
						"lambda-id": node.id.str,
						x1: node.x1,
						y1: node.y,
						x2: node.x2,
						y2: node.y,
					})
				);
				draw(node.left);
				draw(node.right);
				break;

			case "VARIABLE":
				container.appendChild(
					createSVG("line", {
						"lambda-id": node.id.str,
						x1: node.x,
						y1: node.y1,
						x2: node.x,
						y2: node.y2,
					})
				);
				break;
		}
	})(tree);

	return container;
}

function transitionSVG(
	before: SVGElement,
	after: SVGElement,
	replaced: Replacer
): Omit<UndoData, "prevLambdaTree"> {
	const mutations: (() => void)[] = [];
	const children = Array.from(before.children) as SVGElement[];
	const undoData: Omit<UndoData, "prevLambdaTree"> = {
		transitions: new Map(),
		reduction: [],
		deleted: [],
	};

	const changes: [Term, Term[]][] = [];
	matchNodes(replaced.by!, replaced.at, changes, before, after);

	// Update container size
	undoData.transitions.set(
		"CONTAINER",
		Object.fromEntries(
			animateAttributes(
				mutations,
				before,
				[[after]],
				["viewBox", "width", "height"]
			)
		)
	);

	// Update reduced terms
	for (const [main, sides] of changes) {
		const mainEl = before.querySelector<SVGElement>(
			`[lambda-id="${main.id.str}"]`
		)!;
		try {
			if (sides.length > 0) {
				undoData.reduction.push({
					fromId: main.id.str,
					fromAttr: Object.fromEntries(
						animateAttributes(
							mutations,
							mainEl,
							sides.map((s) => [
								after.querySelector<SVGElement>(`[lambda-id="${s.id.str}"]`)!,
								s.id,
							]),
							["x1", "x2", "y1", "y2"]
						)
					),
					atIds: sides.map((s) => s.id.str),
				});
			} else {
				// Argument not present after reducing, ex. (@x.a)b -> a
				undoData.deleted.push({
					"lambda-id": main.id.str,
					x1: mainEl.getAttribute("x1")!,
					x2: mainEl.getAttribute("x2")!,
					y1: mainEl.getAttribute("y1")!,
					y2: mainEl.getAttribute("y2")!,
				});
				mutations.push(() => {
					mainEl.setAttribute("stroke", "transparent");
					mainEl.addEventListener("transitionend", () => mainEl.remove());
				});
			}
		} catch (err) {
			throw err;
		}
	}

	// Update shuffled or deleted terms
	for (const child of children) {
		const id = child.getAttribute("lambda-id")!;
		const match = after.querySelector<SVGElement>(`[lambda-id="${id}"]`);

		if (match)
			undoData.transitions.set(
				id!,
				Object.fromEntries(
					animateAttributes(mutations, child, [[match]], ["x1", "x2", "y1", "y2"])
				)
			);
		else if (!changes.find(([a]) => a.id.str === id)) {
			undoData.deleted.push({
				"lambda-id": id,
				x1: child.getAttribute("x1")!,
				x2: child.getAttribute("x2")!,
				y1: child.getAttribute("y1")!,
				y2: child.getAttribute("y2")!,
			});
			mutations.push(() => {
				child.setAttribute("stroke", "transparent");
				child.addEventListener("transitionend", () => child.remove());
			});
		}
	}

	mutations.forEach((cb) => cb());

	return undoData;
}

export class Tromp {
	svg: SVGElement;
	lambdaTree: Lambda;
	private undoStack: UndoData[] = [];
	constructor(code: string) {
		this.lambdaTree = new Lambda(code);
		const diagramTree = this.construct();
		this.svg = buildPath(diagramTree);
	}
	use(code: string) {
		this.lambdaTree = new Lambda(code);
		const diagramTree = this.construct();
		const newSVG = buildPath(diagramTree);

		this.svg.replaceWith(newSVG);
		this.svg = newSVG;
	}
	construct() {
		const diagramTree = rebuildTree(this.lambdaTree.tree);
		computeHeights(diagramTree);
		computeWidths(diagramTree);
		return diagramTree;
	}
	reduce() {
		const lambdaString = this.lambdaTree.copy(this.lambdaTree.tree, false);
		const replaced = this.lambdaTree.betaReduce();
		if (!replaced.by) return false;

		const diagramTree = this.construct();
		const nextSVG = buildPath(diagramTree);
		this.undoStack.push({
			...transitionSVG(this.svg, nextSVG, replaced),
			prevLambdaTree: lambdaString,
		});
		// this.svg.replaceWith(nextSVG);
		// this.svg = nextSVG;
		return true;
	}
	undo() {
		// FIXME: Seems buggy with big terms?
		const data = this.undoStack.pop();
		if (!data) return;

		// Remake lambda tree
		this.lambdaTree.tree = data.prevLambdaTree;

		const mutations: (() => void)[] = [];
		const begin = `${Date.now() - startTime}ms`;

		// Revert transitions
		for (const [id, attr] of data.transitions) {
			const elem =
				id === "CONTAINER"
					? this.svg
					: this.svg.querySelector(`[lambda-id="${id}"]`)!;

			const animations = Object.entries(attr).map(([key, val]) => {
				const animate = createSVG("animate", {
					attributeName: key,
					to: val,
					dur: ".3s",
					begin,
					fill: "freeze",
				});

				animate.addEventListener("endEvent", () => {
					setAttributes(elem, attr);
					animate.remove();
				});
				return animate;
			});

			mutations.push(() => elem.append(...animations));
		}

		// Revert reducted terms back
		for (const { fromId, fromAttr, atIds } of data.reduction) {
			const elements = atIds.map(
				(id) => this.svg.querySelector(`[lambda-id="${id}"]`)!
			);

			const animations = Object.entries(fromAttr).map(([key, val]) =>
				createSVG("animate", {
					attributeName: key,
					to: val,
					dur: ".3s",
					begin,
					fill: "freeze",
				})
			);

			let isFirst = true;
			for (const elem of elements) {
				const firstInstance = isFirst;
				const ownAnims = isFirst
					? animations
					: animations.map((a) => a.cloneNode() as SVGElement);

				for (const ownAnim of ownAnims) {
					ownAnim.addEventListener("endEvent", () => {
						if (firstInstance) {
							setAttributes(elem, { ...fromAttr, "lambda-id": fromId });
							ownAnim.remove();
						} else {
							elem.remove();
						}
					});
				}

				mutations.push(() => elem.append(...animations));
				isFirst = false;
			}
		}

		// Add back deleted terms
		const deleted = data.deleted.map((attr) => {
			const el = createSVG("line", attr);

			// Start hidden, then transition to visibility
			el.setAttribute("stroke", "transparent");
			requestAnimationFrame(() =>
				requestAnimationFrame(() => el.setAttribute("stroke", "black"))
			);

			return el;
		});
		this.svg.append(...deleted);

		mutations.forEach((cb) => cb());
	}
}
