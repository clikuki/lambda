import { Graph } from "./graph.js";
import { parseLambda } from "./lambda.js";
import { constructDiagram } from "./tromp.js";
import { createSVG } from "./utils.js";
import { Vector } from "./vector.js";

interface NodeData
{
	svg: SVGElement;
	mass: number;
	pos: Vector;
	vel: Vector;
	acc: Vector;
}

export class Network
{
	public worldSVG: SVGElement;

	private nodeMap = new Map<string, NodeData>();

	private repulsionConst = 1;
	private attractionConst = 20;
	private attractionEqui = 50;

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
				const mass = 10;
				const pos = Vector.add(
					new Vector(innerWidth / 2, innerHeight / 2),
					Vector.from(Math.random() * Math.PI * 2, 50),
				);
				const vel = Vector.zero();
				const acc = Vector.zero();
				const svg = createSVG("circle", {
					r: radius,
					cx: pos.x,
					cy: pos.y,
					fill: nodeStr,
					"stroke-width": 0,
				});

				node = { pos, vel, acc, svg, mass };
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

	public updateNodes(): void
	{
		for (const [aStr, a] of this.nodeMap)
		{
			for (const [bStr, b] of this.nodeMap)
			{
				if (a === b) continue;

				if (this.graph.isConnected(aStr, bStr))
				{
					const distVec = Vector.sub(b.pos, a.pos);
					const dist = Vector.mag(distVec);
					const offset = Math.abs(dist - this.attractionEqui);
					const springMag = -this.attractionConst * offset;
					const springForce = Vector.setMag(distVec, springMag);
					this.applyForce(a, springForce);
					springForce.x *= -1;
					springForce.y *= -1;
					// this.applyForce(b, springForce);
				}
				else
				{
					const distVec = Vector.sub(a.pos, b.pos);
					const distSqr = Vector.magSqr(distVec);
					const repelMag = this.repulsionConst * a.mass * b.mass / distSqr;
					const repelForce = Vector.mult(Vector.normalize(distVec), repelMag);
					this.applyForce(a, repelForce);
					repelForce.x *= -1;
					repelForce.y *= -1;
					this.applyForce(b, repelForce);
				}
			}
		}

		// const center = this.getCenterOfMass();
		for (const [, a] of this.nodeMap)
		{
			// const distVec = Vector.sub(center, a.pos);
			// const distSqr = Vector.magSqr(distVec);
			// const attractMag = this.attractConst * a.mass / distSqr;
			// const attractForce = Vector.mult(Vector.normalize(distVec), attractMag);
			// this.applyForce(a, attractForce);

			a.vel = Vector.add(a.vel, a.acc);
			a.pos = Vector.add(a.pos, a.vel);
			a.acc = Vector.zero();

			a.svg.setAttribute("cx", String(a.pos.x));
			a.svg.setAttribute("cy", String(a.pos.y));
		}
	}

	public applyForce(node: NodeData, force: Vector): void
	{
		node.acc = Vector.add(
			Vector.div(force, node.mass),
			node.acc,
		);
	}

	private getCenterOfMass(): Vector
	{
		let totalMass = 0, xNumerator = 0, yNumerator = 0;

		for (const [, a] of this.nodeMap)
		{
			totalMass += a.mass;
			xNumerator += a.mass * a.pos.x;
			yNumerator += a.mass * a.pos.y;
		}

		return new Vector(
			xNumerator / totalMass,
			yNumerator / totalMass,
		);
	}
}
