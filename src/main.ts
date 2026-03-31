import { Graph } from "./graph.js";
import { Network, NodeData } from "./networkVisualizer.js";
import { Expr } from "./presetExpressions.js";
import
{
	code,
	findReductionPoints,
	parseLambda,
	performReduction,
	stringifyLambda,
	Term
} from "./lambda.js";
import { Transition } from "./transitionVisualizer.js";

/*
# LEFT-SIDE REDUX OF `ADD 1 1`
(@@@@ 3 1 (2 1 0)) (@@ 1 0) (@@ 1 0)
(@@@ (@@ 1 0) 1 (2 1 0)) (@@ 1 0)
(@@@ (@ 2 0) (2 1 0)) (@@ 1 0)
(@@@ 1 (2 1 0)) (@@ 1 0)
(@@ 1 ((@@ 1 0) 1 0))
(@@ 1 ((@ 2 0) 0))
(@@ 1 (1 0))
*/

const graph = new Graph<string>();
const seed = //
	// code`${Expr.ADD}${Expr.numeral(1)}${Expr.numeral(1)}`;
	// code`${Expr.EXP}${Expr.numeral(2)}${Expr.numeral(2)}`;
	code`${Expr.PRED}${Expr.numeral(2)}`;
// code`${Expr.TRUE} (@ 0) (@@ 0)`;
// code`${Expr.SUB}${Expr.numeral(4)}${Expr.numeral(2)}`;
// "(@@ 1) (@0) (@0)";
// "(@0 0 0)(@0 0 0)";
// "@@@@@1(2 4)@3(1 0)5";

const terms = [parseLambda(seed)];
graph.add(stringifyLambda(terms[0]));

const network = new Network(document.body, graph);
document.body.prepend(network.display.svg);

const displayContainer = document.querySelector(".display") as HTMLDivElement;
const transition = new Transition(displayContainer);
transition.use(seed);
displayContainer.append(transition.display.svg);

// const reductionIndex

function lambdaExpander(): boolean
{
	console.log("expand")
	if (!terms.length) return false;

	const newTerms: Term[] = [];
	for (const term of terms)
	{
		const aStr = stringifyLambda(term);
		graph.add(aStr);

		const reduxes = findReductionPoints(term);
		for (const redux of reduxes)
		{
			const [reduxed] = performReduction(term, redux);
			const bStr = stringifyLambda(reduxed);
			graph.add(bStr);
			graph.connect(aStr, bStr);
			newTerms.push(parseLambda(bStr));
		}
	}

	terms.length = 0;
	terms.push(...newTerms);
	network.renewStateFromGraph();
	return true;
}

function findOverlappedNode(x: number, y: number): NodeData | null
{
	for (const [, node] of network.nodeMap)
	{
		const hw = node.width / 2;
		const hh = node.height / 2;
		if (x < node.pos.x - hw) continue;
		if (x > node.pos.x + hw) continue;
		if (y < node.pos.y - hh) continue;
		if (y > node.pos.y + hh) continue;
		return node;
	}

	return null;
}

network.display.svg.addEventListener("mousedown", (e) =>
{
	const { scale, pos } = network.display;
	const x = e.x * scale + pos.x;
	const y = e.y * scale + pos.y;
	const node = findOverlappedNode(x, y);
	if (node)
	{
		console.log(node);
	}
});

// PANEL
document.querySelector(".eval_all")!.addEventListener("click", lambdaExpander);


// LOOP
try
{
	requestAnimationFrame(function loop()
	{
		network.display.listenToKeys();
		transition.display.listenToKeys();
		requestAnimationFrame(loop);
	})
} catch (error)
{
	throw error;
}

// @ts-expect-error
window.network = network;