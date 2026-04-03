import { Display } from "./display.js";
import { Graph } from "./graph.js";
import { findReductionPoints, parseLambda, performReduction, stringifyLambda } from "./lambda.js";
import { Network } from "./networkVisualizer.js";
import { constructDiagram, transitionSVG } from "./tromp.js";

export class Transformer
{
	public display: Display;
	private currentTerm: string;
	private currentSVG: SVGElement;

	constructor(
		container: HTMLElement,
		graph: Graph,
		network: Network,
	)
	{
		this.display = new Display(container, true);

		network.display.onClick = (e) =>
		{
			const { scale, pos } = network.display;
			const x = e.x * scale + pos.x;
			const y = e.y * scale + pos.y;
			const node = network.findNodeAtPosition(x, y);
			if (!node) return;

			const reduxIndex = graph.getReduxPt(this.currentTerm, node.key);
			if (reduxIndex !== -1) this.evaluateTo(reduxIndex);
		}
	}

	public use(term: string): void
	{
		this.currentTerm = term;
		this.currentSVG = constructDiagram(parseLambda(term));
		this.display.replaceElements(this.currentSVG);
	}

	public evaluateTo(reduxIndex: number): void
	{
		const currentLambda = parseLambda(this.currentTerm);
		const reduxPt = findReductionPoints(currentLambda)[reduxIndex];
		const [nextLambda, traceMap] = performReduction(currentLambda, reduxPt);
		const nextSVG = constructDiagram(nextLambda);

		// REMEMBER TO DELETE; TESTING ONLY
		this.display.addElement(nextSVG);
		nextSVG.setAttribute("y", "100");

		transitionSVG(this.currentSVG, nextSVG, traceMap);
		this.currentTerm = stringifyLambda(nextLambda);
		this.currentSVG = nextSVG;
	}
}