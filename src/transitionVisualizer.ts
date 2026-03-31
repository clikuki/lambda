import { Display } from "./display.js";
import { Application, parseLambda, performReduction, stringifyLambda } from "./lambda.js";
import { constructDiagram, transitionSVG } from "./tromp.js";

export class Transition
{
	public display: Display;
	private currentTerm: string;
	private currentSVG: SVGElement;

	constructor(container: HTMLElement)
	{
		this.display = new Display(container, true);
	}

	public use(term: string): void
	{
		this.currentTerm = term;
		this.currentSVG = constructDiagram(parseLambda(term));
		this.display.svg.replaceChildren(this.currentSVG);
	}

	public evaluateTo(reduxPt: Application): void
	{
		const currentLambda = parseLambda(this.currentTerm);
		const [nextLambda, replacer] = performReduction(currentLambda, reduxPt);
		const nextSVG = constructDiagram(nextLambda);
		transitionSVG(this.currentSVG, nextSVG, replacer);
		this.currentTerm = stringifyLambda(nextLambda);
		this.currentSVG = nextSVG;
	}
}