import { Graph } from "./graph.js";
import { parseLambda } from "./lambda.js";
import { constructDiagram } from "./tromp.js";
import { createSVG } from "./utils.js";

interface Vector
{
	x: number;
	y: number;
}

interface LambdaData
{
	str: string;
	svg: SVGElement;
	pos: Vector;
}

export class Network
{
	public worlSVG: SVGElement;

	private lambdaDataMap = new Map<string, LambdaData>();

	private style = {
		linewidth: 2,
		paramLineGap: 6,
		applicationRowGap: 10,
		applicationColGap: 10,
		pad: 2,
	};

	constructor(
		container: HTMLElement,
		private graph: Graph<string>
	)
	{
		this.worlSVG = createSVG("svg", {
			width: innerWidth,
			height: innerHeight,
			viewBox: `0 0 ${innerWidth} ${innerHeight}`,
			stroke: "black",
			"stroke-width": this.style.linewidth,
			"stroke-linecap": "butt",
		});

		container.append(this.worlSVG);

		this.updateNodes();
	}

	public updateNodes(): void
	{
		for (const [termStr,] of this.graph.getAllConnections())
		{
			let lambda = this.lambdaDataMap.get(termStr);
			if (!lambda)
			{
				lambda = {
					str: termStr,
					pos: { x: 200, y: 200 },
					svg: constructDiagram(parseLambda(termStr)),
				}

				this.lambdaDataMap.set(termStr, lambda);
				this.worlSVG.append(lambda.svg);
			}
		}
	}
}