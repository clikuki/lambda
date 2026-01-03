import { Graph } from "./graph.js";
import { parseLambda } from "./lambda.js";
import { constructDiagram } from "./tromp.js";
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
		idealNodeDist: 6,
		springCoef: 0.3,
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
		this.edgePathsSVG = createSVG("path", {
			stroke: "gray",
		});

		this.worldSVG.append(this.edgePathsSVG);
		container.append(this.worldSVG);

		this.renewStateFromGraph();
	}

	public renewStateFromGraph(): void
	{
		// const totalCenter = this.getBarycenter();
		for (const [nodeStr, conn] of this.graph.getAllConnections())
		{
			let node = this.nodeMap.get(nodeStr);
			if (!node)
			{
				const term = parseLambda(nodeStr);
				const svg = constructDiagram(term);
				const width = +svg.getAttribute("width")!;
				const height = +svg.getAttribute("height")!;
				const radius = Math.max(width, height);
				const vel = Vector.zero();
				const acc = Vector.zero();

				// Place node close to its adjacents
				const brownian = Vector.from(Math.random() * Math.PI * 2, 20);
				let pos;
				if (conn.size)
				{
					const strings = Array.from(conn);
					const nodes = strings.map(s => this.nodeMap.get(s)!);
					const adjCenter = this.getBarycenter(nodes);
					pos = adjCenter;
				}
				else
				{
					pos = new Vector(innerWidth / 2, innerHeight / 2);
				}

				pos = Vector.add(pos, brownian);

				node = { radius, pos, vel, acc, svg };
				this.nodeMap.set(nodeStr, node);
				this.worldSVG.append(node.svg);
			}
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
			const [aTerm, a] = nodes[i];
			for (let j = i + 1; j < nodes.length; j++)
			{
				const [bTerm, b] = nodes[j];

				const distVec = Vector.sub(a.pos, b.pos);
				const dist = Math.max(Vector.mag(distVec), epsilon);
				const dir = Vector.div(distVec, dist);
				let force = Vector.mult(dir, idealNodeDist * idealNodeDist / dist);

				if (this.graph.isConnected(aTerm, bTerm))
				{
					const stretch = dist - a.radius - b.radius - idealNodeDist;
					// const stretch = dist - idealNodeDist;
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

			a.svg.setAttribute("x", String(a.pos.x));
			a.svg.setAttribute("y", String(a.pos.y));
		}
	}

	private updateEdges(): void
	{
		let edgePath = "";
		for (const [aTerm, a] of this.nodeMap)
		{
			for (const bTerm of this.graph.getConnectionsOf(aTerm))
			{
				const b = this.nodeMap.get(bTerm)!;
				if (a.pos.x > b.pos.x) continue;
				const distVec = Vector.sub(b.pos, a.pos);
				const aEdge = Vector.add(
					Vector.setMag(distVec, a.radius * 0.5),
					a.pos,
				);
				const bEdge = Vector.add(
					Vector.setMag(distVec, -b.radius * 0.5),
					b.pos,
				);
				edgePath += `M${aEdge.x} ${aEdge.y} L${bEdge.x} ${bEdge.y}`;
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

	private getBarycenter(
		nodes: NodeData[] = Array.from(this.nodeMap.values())
	): Vector
	{
		let xNumerator = 0, yNumerator = 0;

		for (const a of nodes)
		{
			xNumerator += a.pos.x;
			yNumerator += a.pos.y;
		}

		return new Vector(
			xNumerator / nodes.length,
			yNumerator / nodes.length,
		);
	}
}
