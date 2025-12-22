import { LambdaEval, stringifyLambda, parseString } from "./lambda.js";

const lEval = new LambdaEval();
const l1 = parseString("(@b.(@c.(@d.(@e.(eeeee))(dddd))(ccc))(bb))a");
console.log(stringifyLambda(l1));

const l1Reduxes = lEval.findReductionPoints(l1);
for (let i = 0; i < l1Reduxes.length; i++)
{
	const l1Redux = l1Reduxes[i];
	const l2 = lEval.performReduction(l1, l1Redux);
	console.log(i, ": ", stringifyLambda(l2));
}