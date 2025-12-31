import { Graph } from "./graph.js";
import { createSVG } from "./utils.js";
import { Vector } from "./vector.js";

interface NodeData
{
	svg: SVGElement;
	radius: number;
	pos: Vector;
	vel: Vector;
	acc: Vector;
}

export class Network
{
	public worldSVG: SVGElement;
	public edgePathsSVG: SVGElement;

	public constants = {
		epsilon: 0.0001,
		idealNodeDist: 20,
		springCoef: 0.1,
		dampingCoef: 0.8,
	}

	private nodeMap = new Map<string, NodeData>();

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
		this.worldSVG = createSVG("svg", {
			width: innerWidth,
			height: innerHeight,
			viewBox: `0 0 ${innerWidth} ${innerHeight}`,
			stroke: "black",
			"stroke-width": this.style.linewidth,
			"stroke-linecap": "butt",
		});
		this.edgePathsSVG = createSVG("path");

		this.worldSVG.append(this.edgePathsSVG);
		container.append(this.worldSVG);

		this.renewStateFromGraph();
	}

	public renewStateFromGraph(): void
	{
		for (const [nodeStr,] of this.graph.getAllConnections())
		{
			let node = this.nodeMap.get(nodeStr);
			if (!node)
			{
				const radius = 30;
				const pos = Vector.add(
					new Vector(innerWidth / 2, innerHeight / 2),
					Vector.from(Math.random() * Math.PI * 2, Math.random() * 50),
				);
				const vel = Vector.zero();
				const acc = Vector.zero();
				const svg = createSVG("circle", {
					r: radius,
					cx: pos.x,
					cy: pos.y,
					// transform: `translate(${pos.x}, ${pos.y})`,
					fill: nodeStr,
					"stroke-width": 0,
				});

				node = { radius, pos, vel, acc, svg };
				this.nodeMap.set(nodeStr, node);
				this.worldSVG.append(node.svg);
			}

			// let lambda = this.lambdaDataMap.get(termStr);
			// if (!lambda)
			// {
			// 	lambda = {
			// 		str: termStr,
			// 		pos: { x: 200, y: 200 },
			// 		svg: constructDiagram(parseLambda(termStr)),
			// 	}

			// 	this.lambdaDataMap.set(termStr, lambda);
			// 	this.worldSVG.append(lambda.svg);
			// }
		}
	}

	public update(): void
	{
		this.handleInterForces();
		this.updateNode();
		this.updateEdges();
	}

	private handleInterForces(): void
	{
		const nodes = Array.from(this.nodeMap.entries());
		const { springCoef, idealNodeDist, epsilon } = this.constants;

		for (let i = 0; i < nodes.length; i++)
		{
			const [aStr, a] = nodes[i];
			for (let j = i + 1; j < nodes.length; j++)
			{
				const [bStr, b] = nodes[j];

				const distVec = Vector.sub(a.pos, b.pos);
				const dist = Math.max(Vector.mag(distVec), epsilon);
				const dir = Vector.div(distVec, dist);
				let force = Vector.mult(dir, idealNodeDist * idealNodeDist / dist);

				if (this.graph.isConnected(aStr, bStr))
				{
					const stretch = dist - a.radius - b.radius - idealNodeDist;
					const springMag = -springCoef * stretch;
					force = Vector.add(force,
						Vector.mult(dir, springMag)
					);

					// Possible: experiment with fructer using target pos
					// force = Vector.add(force,
					// 	Vector.mult(dir, dist * dist / -idealNodeDist)
					// );
				}

				// if (!Number.isNaN(force.x + force.y))
				// {
				// 	console.log(force.x, force.y);
				// }

				this.applyForce(a, force);
				force.x *= -1;
				force.y *= -1;
				this.applyForce(b, force);
			}
		}
	}

	private updateNode(): void
	{
		const { dampingCoef } = this.constants;
		for (const [, a] of this.nodeMap)
		{
			a.vel = Vector.mult(Vector.add(a.vel, a.acc), dampingCoef);
			a.pos = Vector.add(a.pos, a.vel);
			a.acc = Vector.zero();

			a.svg.setAttribute("r", String(a.radius));
			a.svg.setAttribute("cx", String(a.pos.x));
			a.svg.setAttribute("cy", String(a.pos.y));
			// a.svg.setAttribute("transform", `translate(${a.pos.x},${a.pos.y})`);
		}
	}

	private updateEdges(): void
	{
		let edgePath = "";
		for (const [aStr, a] of this.nodeMap)
		{
			for (const bStr of this.graph.getConnectionsOf(aStr))
			{
				const b = this.nodeMap.get(bStr)!;
				if (a.pos.x > b.pos.x) continue;
				edgePath += `M${a.pos.x} ${a.pos.y} L${b.pos.x} ${b.pos.y}`;
			}
		}

		this.edgePathsSVG.setAttribute("d", edgePath);
	}

	private applyForce(node: NodeData, force: Vector): void
	{
		node.acc = Vector.add(
			force,
			node.acc,
		);
	}
}
