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
import { Vector } from "./vector.js";

const graph = new Graph<string>();
const LE = new LambdaEval();
const seed = //
	// code`${Expr.ADD}${Expr.numeral(1)}${Expr.numeral(1)}`;
	// code`${Expr.EXP}${Expr.numeral(2)}${Expr.numeral(2)}`;
	code`${Expr.PRED}${Expr.numeral(2)}`;
// code`${Expr.SUB}${Expr.numeral(4)}${Expr.numeral(2)}`;
// "(@@ 1) (@0) (@0)";
// "(@0 0 0)(@0 0 0)";
// "@@@@@1(2 4)@3(1 0)5";

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

const terms = [parseLambda(seed)];
graph.add(stringifyLambda(terms[0]));

// let tripped = false;
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
			// console.log(Array(20).fill("=").join(""))
			const bStr = stringifyLambda(reduxed);
			// if (!tripped && bStr.includes("-2"))
			// {
			// 	console.log(JSON.stringify(term, null, 1));
			// 	console.log(JSON.stringify(reduxed, null, 1));
			// }
			graph.biconnect(aStr, bStr);
			newTerms.push(parseLambda(bStr));
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

const mouse = {
	buttons: {
		mid: 4,
	},

	pos: Vector.zero(),
	prevPos: Vector.zero(),
	pressed: 0,

	pxWheelScale: 0.001,
	lineWheelScale: 0.2,

	isDown(btn: number): boolean
	{
		return (this.pressed & btn) !== 0;
	}
}
network.worldSVG.addEventListener("mousedown", (e) => { mouse.pressed = e.buttons; });
network.worldSVG.addEventListener("mouseup", (e) => { mouse.pressed = e.buttons; });
network.worldSVG.addEventListener("mousemove", (e) =>
{
	const pos = network.worldSVG.getBoundingClientRect();
	mouse.prevPos = mouse.pos;
	mouse.pos = Vector.sub(new Vector(e.x, e.y), pos);

	if (mouse.isDown(mouse.buttons.mid))
	{
		const dp = Vector.sub(mouse.pos, mouse.prevPos);
		network.moveBy(dp);
	}
});
network.worldSVG.addEventListener("wheel", (e) =>
{
	let ds;
	switch (e.deltaMode)
	{
		case 0x00:
			ds = e.deltaY * mouse.pxWheelScale;
			break;
		case 0x01:
		case 0x02:
		default:
			ds = Math.sign(e.deltaY) * mouse.lineWheelScale;
			break;
	}

	network.scaleBy(ds, mouse.pos);
})

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
	lambdaExpander() && setTimeout(() => continualExpander(), 100);
})()

// @ts-expect-error
window.network = network;

// @ts-expect-error
window.expand = lambdaExpander;