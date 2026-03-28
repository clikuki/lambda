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
// code`${Expr.TRUE} (@ 0) (@@ 0)`;
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

// console.table([...graph.getAllConnections()]
// 	.reduce((acc, [a, b]) => ({
// 		...acc,
// 		[a]: [...b]
// 	}), {} as Record<string, string[]>))

const network = new Network(
	document.body,
	graph,
);

const inputs = {
	buttons: {
		mid: 4,
	},

	keys: new Map<string, boolean>(),

	pos: Vector.zero(),
	prevPos: Vector.zero(),
	pressed: 0,

	pxZoomScale: 0.001,
	lineZoomScale: 0.2,
	keyZoomScale: 0.1,
	keyMoveScale: 30,

	isDown(btn: number): boolean
	{
		return (this.pressed & btn) !== 0;
	}
}
network.worldSVG.addEventListener("mousedown", (e) => { inputs.pressed = e.buttons; });
network.worldSVG.addEventListener("mouseup", (e) => { inputs.pressed = e.buttons; });
network.worldSVG.addEventListener("mousemove", (e) =>
{
	const pos = network.worldSVG.getBoundingClientRect();
	inputs.prevPos = inputs.pos;
	inputs.pos = Vector.sub(new Vector(e.x, e.y), pos);

	if (inputs.isDown(inputs.buttons.mid))
	{
		const dp = Vector.sub(inputs.pos, inputs.prevPos);
		network.moveBy(dp);
	}
});
network.worldSVG.addEventListener("wheel", (e) =>
{
	let ds;
	switch (e.deltaMode)
	{
		case 0x00:
			ds = e.deltaY * inputs.pxZoomScale;
			break;
		case 0x01:
		case 0x02:
		default:
			ds = Math.sign(e.deltaY) * inputs.lineZoomScale;
			break;
	}

	network.scaleBy(ds, inputs.pos);
})

document.body.addEventListener("keydown", (e) =>
{
	inputs.keys.set(e.key, true);
})
document.body.addEventListener("keyup", (e) =>
{
	inputs.keys.set(e.key, false);
})

try
{
	requestAnimationFrame(function loop()
	{
		network.update();
		requestAnimationFrame(loop);

		// Handle keyboard controls
		const moveUp = inputs.keys.get("w") ?? false;
		const moveDown = inputs.keys.get("s") ?? false;
		const moveLeft = inputs.keys.get("a") ?? false;
		const moveRight = inputs.keys.get("d") ?? false;
		if (moveUp || moveDown || moveLeft || moveRight)
		{
			network.moveBy(Vector.mult({
				x: (+moveLeft + -moveRight),
				y: (+moveUp + -moveDown),
			}, inputs.keyMoveScale));
		}

		const scaleDown = inputs.keys.get("-") ?? inputs.keys.get("_") ?? false;
		const scaleUp = inputs.keys.get("=") ?? inputs.keys.get("+") ?? false;
		if (scaleDown || scaleUp)
		{
			network.scaleBy((+scaleDown + -scaleUp) * inputs.keyZoomScale, {
				x: innerWidth / 2,
				y: innerHeight / 2,
			});
		}
	})
} catch (error)
{
	throw error;
}

(function continualExpander()
{
	// lambdaExpander() && setTimeout(() => continualExpander(), 100);
	setTimeout(() => lambdaExpander() && continualExpander(), 200);
})()

// @ts-expect-error
window.network = network;

// @ts-expect-error
window.expand = lambdaExpander;