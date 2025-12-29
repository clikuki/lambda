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
	public edgePathsSVG: SVGElement;

	private nodeMap = new Map<string, NodeData>();

	private repulsionConst = 40;
	private attractionConst = -1;
	private attractionEqui = 200;
	private dampingConst = 0.95;
	private maxRepulsion = 100;

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
				const mass = 10;
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

	public update(): void
	{
		this.handleInterForces();
		this.updateNode();
		this.updateEdges();
	}

	public applyForce(node: NodeData, force: Vector): void
	{
		node.acc = Vector.add(
			Vector.div(force, node.mass),
			node.acc,
		);
	}

	private handleInterForces(): void
	{
		for (const [aStr, a] of this.nodeMap)
		{
			for (const [bStr, b] of this.nodeMap)
			{
				// Dedupe
				if (a === b || a.pos.x > b.pos.x) continue;

				if (this.graph.isConnected(aStr, bStr))
				{
					const distVec = Vector.sub(a.pos, b.pos);
					const dist = Vector.mag(distVec);
					const offset = dist - this.attractionEqui;
					const springMag = this.attractionConst * offset;
					const springForce = Vector.setMag(distVec, springMag);
					this.applyForce(a, springForce);
					springForce.x *= -1;
					springForce.y *= -1;
					this.applyForce(b, springForce);
				}
				else
				{
					const distVec = Vector.sub(a.pos, b.pos);
					const distSqr = Vector.magSqr(distVec);
					const repelMag = Math.min(
						this.repulsionConst * a.mass * b.mass / distSqr, this.maxRepulsion
					);
					const repelForce = Vector.mult(Vector.normalize(distVec), repelMag);
					this.applyForce(a, repelForce);
					repelForce.x *= -1;
					repelForce.y *= -1;
					this.applyForce(b, repelForce);
				}
			}
		}
	}

	private updateNode(): void
	{
		for (const [, a] of this.nodeMap)
		{
			a.vel = Vector.mult(Vector.add(a.vel, a.acc), this.dampingConst);
			a.pos = Vector.add(a.pos, a.vel);
			a.acc = Vector.zero();

			a.svg.setAttribute("cx", String(a.pos.x));
			a.svg.setAttribute("cy", String(a.pos.y));
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
