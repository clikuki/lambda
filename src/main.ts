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
for (const color of colors)
{
	graph.add(color);
}

let paired = 0;
while (paired < colors.length)
{
	const a = colors[Math.floor(Math.random() * colors.length)];
	const b = colors[Math.floor(Math.random() * colors.length)];
	graph.biconnect(a, b);
	paired += 1;
}

const network = new Network(
	document.body,
	graph,
);

requestAnimationFrame(function loop()
{
	requestAnimationFrame(loop);

	network.update();
})

// @ts-expect-error
window.network = network;