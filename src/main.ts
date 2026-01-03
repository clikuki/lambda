import { Graph } from "./graph.js";
import { Network } from "./networkVisualizer.js";
import { Expr } from "./presetExpressions.js";
import
{
	code,
	LambdaEval,
	parseLambda,
	stringifyLambda,
	Term
} from "./lambda.js";

const graph = new Graph<string>();
const LE = new LambdaEval();
const seed = //
	code`${Expr.ADD}${Expr.numeral(1)}${Expr.numeral(1)}`;
// "(@@ 1) (@0) (@0)";
// "(@0 0)(((((@0 0)))))";
// "@@@@@1(2 4)@3(1 0)5";

/*
# LEFT-SIDE REDUX
(@@@@ 3 1 (2 1 0)) (@@ 1 0) (@@ 1 0)
(@@@ (@@ 1 0) 1 (2 1 0)) (@@ 1 0)
(@@@ (@ 2 0) (2 1 0)) (@@ 1 0)
(@@@ 1 (2 1 0)) (@@ 1 0)
(@@ 1 ((@@ 1 0) 1 0))
(@@ 1 ((@ 2 0) 0))
(@@ 1 (1 0))
*/

const terms = [parseLambda(seed)];
graph.add(stringifyLambda(terms[0]));

function lambdaExpander(): boolean
{
	if (!terms.length) return false;

	const newTerms: Term[] = [];
	for (const term of terms)
	{
		const aStr = stringifyLambda(term);
		graph.add(aStr);

		const reduxes = LE.findReductionPoints(term);
		for (const redux of reduxes)
		{
			const reduxed = LE.performReduction(term, redux);
			const bStr = stringifyLambda(reduxed);
			graph.biconnect(aStr, bStr);
			newTerms.push(reduxed);
		}
	}

	terms.length = 0;
	terms.push(...newTerms);
	network.renewStateFromGraph();
	return true;
}

// console.table([...graph.getAllConnections()]
// 	.reduce((acc, [a, b]) => ({
// 		...acc,
// 		[a]: [...b]
// 	}), {} as Record<string, string[]>))

const network = new Network(
	document.body,
	graph,
);

try
{
	requestAnimationFrame(function loop()
	{
		network.update();
		requestAnimationFrame(loop);
	})
} catch (error)
{
	throw error;
}

(function continualExpander()
{
	lambdaExpander() && setTimeout(() => continualExpander(), 1000);
})()
// lambdaExpander();

// @ts-expect-error
window.network = network;

// @ts-expect-error
window.expand = lambdaExpander;