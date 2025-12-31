import { Graph } from "./graph.js";
import { LambdaEval, parseLambda } from "./lambda.js";
import { Network } from "./networkVisualizer.js";

// const lEval = new LambdaEval();
// const graph = new Graph<string>();

// const l1s = "(@b.(@c.(@d.(@e.(eeeee))(dddd))(ccc))(bb))a";
// const l1 = parseString(l1s);
// graph.add(l1s);

const colors = [
	"aqua",
	"black",
	"blue",
	"fuchsia",
	"gray",
	"green",
	"lime",
	"maroon",
	"navy",
	"olive",
	"purple",
	"red",
	"silver",
	"teal",
];

const graph = new Graph<string>();
graph.add(colors[0])

for (let i = 1; i < colors.length; i++)
{
	const a = colors[i];
	graph.add(a);
	const nodes = Array.from(graph.getAllConnections());
	let connectionCnt = Math.floor(Math.random() * 2 + 1);
	while (connectionCnt)
	{
		const [b] = nodes[Math.floor(Math.random() * nodes.length)];
		if (a === b) continue;
		graph.biconnect(a, b);
		connectionCnt--;
	}
}

// for (const color of colors)
// {
// 	graph.add(color);
// }
// graph.biconnect(colors[0], colors[1])

// for (let i = 0, j = colors.length - 1; i < colors.length; j = i++)
// for (let i = 1, j = 0; i < colors.length; j = i++)
// {
// 	const a = colors[i];
// 	const b = colors[j];
// 	graph.biconnect(a, b);
// }
// let paired = 0;
// while (paired < colors.length)
// {
// 	const a = colors[Math.floor(Math.random() * colors.length)];
// 	const b = colors[Math.floor(Math.random() * colors.length)];
// 	graph.biconnect(a, b);
// 	paired += 1;
// }

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