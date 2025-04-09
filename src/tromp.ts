import {
	isAbstraction,
	isApplication,
	isVariable,
	Variable,
	type Abstraction,
	type Term,
} from "./lambda.js";

interface SimpleAbstraction {
	type: "ABSTRACTION";
	parameters: Variable[];
	body: SimpleApplication | SimpleVariable;
}
interface SimpleApplication {
	type: "APPLICATION";
	left: SimpleTerm;
	right: SimpleTerm;
}
interface SimpleVariable {
	type: "VARIABLE";
	symbol: symbol;
}
type SimpleTerm = SimpleAbstraction | SimpleApplication | SimpleVariable;

function simplifyTree(tree: Term): SimpleTerm {
	if (isVariable(tree))
		return {
			type: "VARIABLE",
			symbol: tree,
		};
	else if (isApplication(tree))
		return {
			type: "APPLICATION",
			left: simplifyTree(tree[0]),
			right: simplifyTree(tree[1]),
		};
	else {
		const parameters: symbol[] = [];

		// Find all parameters until first non-abstraction is hit
		const trueBody = (function findParameters(tree: Abstraction) {
			parameters.push(tree.param);
			if (isAbstraction(tree.body)) return findParameters(tree.body);
			else return tree.body;
		})(tree);

		return {
			type: "ABSTRACTION",
			parameters,
			body: simplifyTree(trueBody) as SimpleApplication | SimpleVariable,
		};
	}
}

// TODO: Make customizable?
const style = {
	edgePad: 5,
	ColGap: 10,
	rowGap: 15,
	linewidth: 4,
};

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

function ConstructDiagram(tree: Term) {
	const simpleTree = simplifyTree(tree);
	const svg = createSVG("svg");

	switch (simpleTree.type) {
		case "VARIABLE":
			break;
		case "APPLICATION":
			break;
		case "ABSTRACTION":
			// const { parameters, body } = constructAbstractionDiagram(simpleTree);
			break;
	}

	return svg;
}

function constructAbstractionDiagram(tree: SimpleAbstraction) {
	const svg = createSVG("svg");
	const parameters: [symbol, SVGElement][] = tree.parameters.map((p) => {
		const yCoord = style.linewidth / 2 + parameters.length * style.ColGap;
		return [
			p,
			createSVG("line", {
				x1: "0",
				x2: "0",
				y1: `${yCoord}`,
				y2: `${yCoord}`,
			}),
		];
	});

	// Hand off control to next constructor
	let body: SVGElement[];
	if (typeof tree.body === "symbol") {
		body = [initVariablePath(parameters, tree.body)];
	} else {
		body = constructApplicationDiagram(parameters, tree.body);
	}

	return {
		parameters,
		body,
	};
}

function constructApplicationDiagram(..._: any): SVGElement[] {
	// TODO: Implement application construction
	return [];
}

function initVariablePath(
	parameters: [symbol, SVGElement][],
	variable: symbol
) {
	const [, lastLine] = parameters.at(-1)!;
	const [, varLine] = parameters.find(([sym]) => sym === variable)!;
	const varY = +(varLine ?? lastLine).getAttribute("y1")!;
	const path = createSVG("path");
	path.setAttribute("d", `M ${style.edgePad} ${varY}`);
	return path;
}
