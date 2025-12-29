import { Graph } from "./graph.js";
import { LambdaEval, parseLambda } from "./lambda.js";
import { Network } from "./networkVisualizer.js";

// const lEval = new LambdaEval();
// const graph = new Graph<string>();

// const l1s = "(@b.(@c.(@d.(@e.(eeeee))(dddd))(ccc))(bb))a";
// const l1 = parseString(l1s);
// graph.add(l1s);

const testGraph = new Graph<string>();
testGraph.add("green");
testGraph.add("red");
testGraph.add("blue");
testGraph.biconnect("green", "red")

const network = new Network(
	document.body,
	testGraph,
);

requestAnimationFrame(function loop()
{
	requestAnimationFrame(loop);

	network.updateNodes();
})

// @ts-expect-error
window.network = network;