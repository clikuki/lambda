import { TraceMap, type Term } from "./lambda.js";
import { createSVG, ID, setAttributes } from "./utils.js";

const startTime = Date.now();

interface ParamLine
{
	absID: ID;
	paramID: ID;
	y?: number;
}
interface DiagramAbstraction
{
	type: "ABSTRACTION";
	parameters: ParamLine[];
	body: DiagramApplication | DiagramVariable;
	parent?: DiagramTerm;

	x1?: number;
	x2?: number;
	y1?: number;
	y2?: number;
}
interface DiagramApplication
{
	type: "APPLICATION";
	left: DiagramTerm;
	right: DiagramTerm;
	parent?: DiagramTerm;
	id: ID;

	x1?: number;
	x2?: number;
	y?: number;
}
interface DiagramVariable
{
	type: "VARIABLE";
	parent?: DiagramTerm;
	id: ID;

	x?: number;
	y1?: number;
	y2?: number;
}
type DiagramTerm = DiagramAbstraction | DiagramApplication | DiagramVariable;

const style = {
	linewidth: 2,
	paramLineGap: 6,
	applicationRowGap: 10,
	applicationColGap: 10,
	pad: 2,
};

function buildTree(tree: Term): DiagramTerm
{
	if (tree.type === "VARIABLE")
		return {
			type: "VARIABLE",
			id: tree.id,
		};
	else if (tree.type === "APPLICATION")
	{
		const left = buildTree(tree.left);
		const right = buildTree(tree.right);
		const node: DiagramApplication = {
			type: "APPLICATION",
			left,
			right,
			id: tree.id,
		};
		left.parent = node;
		right.parent = node;
		return node;
	} else
	{
		// Find all parameters until first non-abstraction is hit
		const parameters: ParamLine[] = [];
		const trueBody = (function findParameters(node = tree): Term
		{
			parameters.push({ paramID: node.param, absID: node.id });
			if (node.body.type === "ABSTRACTION") return findParameters(node.body);
			else return node.body;
		})();

		const node: DiagramAbstraction = {
			type: "ABSTRACTION",
			parameters,
			body: buildTree(trueBody) as DiagramVariable,
		};
		node.body.parent = node;
		return node;
	}
}

function findRelevantAbstraction(node: DiagramTerm, id: ID)
{
	let binding: DiagramAbstraction | null = null;
	let current: DiagramTerm | undefined = node;

	while (current)
	{
		if (current.type === "ABSTRACTION")
		{
			if (current.parameters?.find((p) => p.paramID === id))
			{
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
): DiagramVariable
{
	let current: DiagramTerm | null = term;
	let result: DiagramTerm | null = null;

	while (current)
	{
		switch (current.type)
		{
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

	if (!result || result.type !== "VARIABLE")
	{
		throw new SyntaxError(`Could not find ${direction}-most variable`);
	}
	return result;
}

function hasAbstractionAtExtreme(
	node: DiagramTerm,
	direction: "LEFT" | "RIGHT"
): boolean
{
	switch (node.type)
	{
		case "ABSTRACTION":
			return true;
		case "APPLICATION":
			const child = direction === "LEFT" ? node.left : node.right;
			return hasAbstractionAtExtreme(child, direction);
		case "VARIABLE":
			return false;
	}
}

function computeHeights(t: DiagramTerm, y = 0)
{
	switch (t.type)
	{
		case "ABSTRACTION":
			t.y1 = y;
			for (const param of t.parameters)
			{
				param.y = y + style.linewidth / 2;
				y += style.paramLineGap;
			}

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
			const binding = findRelevantAbstraction(t, t.id);
			const linePair = binding?.parameters?.find((p) => p.paramID === t.id);
			t.y1 = linePair?.y ?? y + style.applicationRowGap / 2;
			t.y2 = y + style.applicationRowGap;
			break;
	}
}

function computeWidths(t: DiagramTerm, x = 0)
{
	switch (t.type)
	{
		case "ABSTRACTION":
			t.x1 = x;
			if (!hasAbstractionAtExtreme(t.body, "LEFT"))
			{
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

// interface Extrema
// {
// 	sx: number;
// 	sy: number;
// 	lx: number;
// 	ly: number;
// }
// function findExtremas(
// 	t: DiagramTerm,
// 	ext: Extrema = {
// 		sx: Infinity,
// 		sy: Infinity,
// 		lx: -Infinity,
// 		ly: -Infinity,
// 	}
// )
// {
// 	switch (t.type)
// 	{
// 		case "ABSTRACTION":
// 			ext.sx = Math.min(ext.sx, t.x1!, t.x2!);
// 			ext.lx = Math.max(ext.lx, t.x1!, t.x2!);
// 			ext.sy = Math.min(ext.sy, t.y1!, t.y2!);
// 			ext.ly = Math.max(ext.ly, t.y1!, t.y2!);
// 			findExtremas(t.body);
// 			break;
// 		case "APPLICATION":
// 			ext.sx = Math.min(ext.sx, t.x1!, t.x2!);
// 			ext.lx = Math.max(ext.lx, t.x1!, t.x2!);
// 			ext.sy = Math.min(ext.sy, t.y!);
// 			ext.ly = Math.max(ext.ly, t.y!);
// 			findExtremas(t.left);
// 			findExtremas(t.right);
// 			break;
// 		case "VARIABLE":
// 			ext.sx = Math.min(ext.sx, t.x!);
// 			ext.lx = Math.max(ext.lx, t.x!);
// 			ext.sy = Math.min(ext.sy, t.y1!, t.y2!);
// 			ext.ly = Math.max(ext.ly, t.y1!, t.y2!);
// 			break;
// 	}

// 	return ext;
// }

function getTreeSize(tree: DiagramTerm): [number, number]
{
	const height = findExtremeTerm(tree, "LEFT").y2 ?? 0;

	let width = 0;
	if (tree.type === "ABSTRACTION")
	{
		width = tree.x2! - tree.x1!;
	} else
	{
		let current: DiagramTerm | null = tree;
		while (current)
		{
			switch (current.type)
			{
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

function animateAttributes(
	mutations: (() => Promise<any>)[],
	mainEl: SVGElement,
	sideEls: SVGElement[],
	attributes: string[]
)
{
	const oldAttr = new Map(
		attributes.map((attr) => [attr, mainEl.getAttribute(attr)!])
	);

	const oldID = mainEl.getAttribute("lambda-id");
	if (oldID) oldAttr.set("lambda-id", oldID);

	let isFirst = true;
	const begin = `${Date.now() - startTime}ms`;
	for (const sideEl of sideEls)
	{
		const newID = sideEl.getAttribute("lambda-id")!;
		console.log(oldID, " -> ", newID, sideEl)
		const copy = isFirst ? mainEl : (mainEl.cloneNode() as SVGElement);
		isFirst = false;

		const newAttr: Record<string, string> = {};
		const animationEnds: (Promise<void>)[] = [];
		const animations = attributes.flatMap((attr) =>
		{
			const newValue = sideEl.getAttribute(attr) ?? "";
			if (newValue === oldAttr.get(attr)) return [];
			newAttr[attr] = newValue;

			const animate = createSVG("animate", {
				attributeName: attr,
				to: newValue,
				dur: "0.5s",
				begin,
				fill: "freeze",
			});

			animationEnds.push(new Promise<void>(res =>
			{
				animate.addEventListener("endEvent", () =>
				{
					res();
					setAttributes(copy, newAttr);
					animate.remove();
				}, { once: true });
			}));
			return animate;
		});

		mutations.push(() =>
		{
			copy.append(...animations);
			if (copy !== mainEl) mainEl.parentNode!.appendChild(copy);
			return Promise.allSettled(animationEnds);
		});
	}

	return oldAttr;
}

function buildPath(tree: DiagramTerm): SVGElement
{
	const [height, width] = getTreeSize(tree);
	const container = createSVG("svg", {
		viewBox: `0 0 ${width} ${height}`,
		stroke: "black",
		width: width,
		height: height,
		transform: `translate(${-width / 2},${-height / 2})`,
		"stroke-width": style.linewidth,
		"stroke-linecap": "butt",
	});

	(function draw(node: DiagramTerm)
	{
		switch (node.type)
		{
			case "ABSTRACTION":
				for (const line of node.parameters!)
				{
					container.appendChild(
						createSVG("line", {
							"lambda-id": line.absID.str,
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

export function transitionSVG(
	before: SVGElement,
	after: SVGElement,
	traceMap: TraceMap,
): Promise<void>
{
	return new Promise<void>((res) =>
	{
		const mutations: (() => Promise<any>)[] = [];

		// Update container size
		animateAttributes(
			mutations,
			before,
			[after],
			["viewBox", "width", "height"]
		)

		for (const [oldID, newIDList] of traceMap)
		{
			const oldEl = before.querySelector(`[lambda-id="${oldID.str}"]`) as SVGElement;
			// TODO: Fix issue with breaking when trace has nonexistent ID
			if (!oldEl) continue; // tmp fix

			if (!newIDList.length)
			{
				// Argument not present after reducing, ex. (@x.a)b -> a
				mutations.push(() =>
				{
					return new Promise<void>((res) =>
					{
						oldEl.setAttribute("stroke", "transparent");
						oldEl.addEventListener("transitionend", () =>
						{
							oldEl.remove();
							res();
						}, { once: true });
					})
				});
			}
			else
			{
				const newEls = newIDList.map(id => after.querySelector(`[lambda-id="${id.str}"]`) as SVGElement);
				animateAttributes(mutations, oldEl, newEls, ["x1", "x2", "y1", "y2"]);
			}
		}

		Promise.allSettled(mutations.map((cb) => cb()))
			.then(() => res());
	});
}

export function constructDiagram(term: Term): SVGElement
{
	const diagramTree = buildTree(term);
	computeHeights(diagramTree);
	computeWidths(diagramTree);
	const treeSVG = buildPath(diagramTree);
	return treeSVG;
}
