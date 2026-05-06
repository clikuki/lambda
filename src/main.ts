import { Graph } from "./graph.js";
import { Network } from "./networkVisualizer.js";
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
import { Transformer } from "./transformVisualizer.js";
import { updateDisplaysWithKeyboard } from "./display.js";

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

const graph = new Graph();
const seed = //
	// code`${Expr.ADD}${Expr.numeral(1)}${Expr.numeral(1)}`;
	// code`${Expr.EXP}${Expr.numeral(2)}${Expr.numeral(2)}`;
	code`${Expr.PRED}${Expr.numeral(2)}`;
// code`${Expr.TRUE} (@ 0) (@@ 0)`;
// code`(@@ 0)(@@ 0)`;
// code`${Expr.SUB}${Expr.numeral(4)}${Expr.numeral(2)}`;
// "(@@ 1) (@0) (@0)";
// "(@0 0 0)(@0 0 0)";
// "@@@@@1(2 4)@3(1 0)5";

const terms = [parseLambda(seed)];
const firstTerm = stringifyLambda(terms[0]);
graph.add(firstTerm);

const network = new Network(document.body, graph);
document.body.prepend(network.display.svg);

const displayContainer = document.querySelector(".display") as HTMLDivElement;
const transition = new Transformer(displayContainer, graph, network);
transition.use(firstTerm);
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

		const reduxPts = findReductionPoints(term);
		for (let i = 0; i < reduxPts.length; i++)
		{
			const reduxPt = reduxPts[i];
			const [reduxed, traceMap] = performReduction(term, reduxPt);
			const bStr = stringifyLambda(reduxed);

			console.log(term);
			console.log(reduxed);
			for (const [from, to] of traceMap.entries())
			{
				console.log(from, " : ");
				to.forEach(t => console.log(t));
			}
			console.log("=========")

			graph.add(bStr);
			graph.connect(aStr, bStr, i);
			newTerms.push(parseLambda(bStr));
		}
	}

	terms.length = 0;
	terms.push(...newTerms);
	network.renewStateFromGraph();
	return true;
}

// PANEL
document.querySelector(".eval_all")!.addEventListener("click", lambdaExpander);


// LOOP
try
{
	requestAnimationFrame(function loop()
	{
		updateDisplaysWithKeyboard();
		requestAnimationFrame(loop);
	})
} catch (error)
{
	throw error;
}

// @ts-expect-error
window.network = network;