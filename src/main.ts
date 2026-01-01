import { Graph } from "./graph.js";
import { code, LambdaEval, parseLambda, Term } from "./lambda.js";
import { Network } from "./networkVisualizer.js";
import { Expr } from "./presetExpressions.js";

const graph = new Graph<Term>();
const LE = new LambdaEval();
// const seed = "(@b.(@c.(@d.(@e.(eeeee))(dddd))(ccc))(bb))a";
// const seed = "(@x.x)(@x.x)";
const seed = code`(${Expr.ADD}${Expr.numeral(1)})${Expr.numeral(1)}`;
// const seed = "@f.@x.f((@a.@b.ab)fx)";
// const seed = "@f.@x.f((@b.fb)x)";
// const seed = "@f.@x.f(fx)";
const terms = [parseLambda(seed)];
graph.add(terms[0]);

for (let i = 0; i < 10; i++)
{
	const newTerms: Term[] = [];
	for (const term of terms)
	{
		// console.log(term);

		const reduxes = LE.findReductionPoints(term);
		for (const redux of reduxes)
		{
			const reduxed = LE.performReduction(term, redux);
			graph.biconnect(term, reduxed);
			newTerms.push(reduxed);
		}
	}

	terms.length = 0;
	terms.push(...newTerms);
	// console.log("==========================");
}
// terms.forEach(t => console.log(t));

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

// @ts-expect-error
window.network = network;