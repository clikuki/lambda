import { Graph } from "./graph.js";
import { LambdaEval, stringifyLambda, parseString } from "./lambda.js";
import { Network } from "./networkVisualizer.js";

const lEval = new LambdaEval();
const graph = new Graph<string>();

const l1s = "(@b.(@c.(@d.(@e.(eeeee))(dddd))(ccc))(bb))a";
// const l1 = parseString(l1s);
graph.add(l1s);

const network = new Network(
	document.body,
	graph,
);