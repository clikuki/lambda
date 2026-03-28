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

	// Layout
	layer: number;
}

export class Network
{
	public worldSVG: SVGElement;
	public edgePathsSVG: SVGElement;

	public scale = 1;
	public fullView: Vector;
	public view: Vector;

	public constants = {
		epsilon: 0.0001,
		// idealNodeDist: 6,
		idealNodeDist: 50,
		springCoef: 0.3,
		dampingCoef: 0.8,
	}

	private nodeMap = new Map<string, NodeData>();
	private pos = Vector.zero();

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
		this.fullView = new Vector(innerWidth, innerHeight);
		this.view = Vector.div(this.fullView, this.scale);

		this.worldSVG = createSVG("svg", {
			width: innerWidth,
			height: innerHeight,
			viewBox: `${this.pos.x} ${this.pos.y} ${this.view.x} ${this.view.y}`,
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
		for (const [nodeStr] of this.graph.getAllConnections())
		{
			let node = this.nodeMap.get(nodeStr);
			if (!node)
			{
				const term = parseLambda(nodeStr);
				const svg = constructDiagram(term);
				const width = +svg.getAttribute("width")!;
				const height = +svg.getAttribute("height")!;
				const radius = Math.hypot(width, height);
				const vel = Vector.zero();
				const acc = Vector.zero();

				// Place node close to its adjacents
				// Randomness required to avoid axis explosion
				const offset = Vector.from(
					// Bias expansions downwards
					Math.random() * Math.PI / 4 + Math.PI * 3 / 8,
					100
				);

				// const offset = new Vector(Math.random(), 50);
				let pos = new Vector(innerWidth / 2, innerHeight / 2);
				pos = Vector.add(pos, offset);

				node = {
					radius, pos, vel, acc, svg,
					layer: -1,
				};
				this.nodeMap.set(nodeStr, node);
				this.worldSVG.append(node.svg);
			}
		}

		// Layout
		this.minimizeLayers();

		// for dev only
		for (const [, node] of this.nodeMap)
		{
			node.pos.x = 100;
			node.pos.y = node.layer * 100;
		}

		this.updateNode();
		this.updateEdges();
	}

	public update(): void
	{
	}

	public moveBy(dp: Vector): void
	{
		this.pos = Vector.sub(this.pos, Vector.mult(dp, this.scale));
		this.worldSVG.setAttribute(
			"viewBox",
			`${this.pos.x} ${this.pos.y} ${this.view.x} ${this.view.y}`,
		);
	}

	public scaleBy(ds: number, center: Vector): void
	{
		this.scale = Math.max(0.1, this.scale + ds);

		const oldView = this.view;
		this.view = Vector.mult(this.fullView, this.scale);

		const proportion = Vector.sub(this.fullView, center);
		proportion.x /= this.fullView.x;
		proportion.y /= this.fullView.y;

		const offset = Vector.sub(this.view, oldView);
		offset.x *= 1 - proportion.x;
		offset.y *= 1 - proportion.y;

		this.pos = Vector.sub(this.pos, offset);

		this.worldSVG.setAttribute(
			"viewBox",
			`${this.pos.x} ${this.pos.y} ${this.view.x} ${this.view.y}`,
		);
	}

	private minimizeLayers(): void
	{
		// clear old layer values
		for (const node of this.nodeMap.values())
		{
			node.layer = -1;
		}

		const sourceKey = this.findSourceNodeKey();
		const source = this.nodeMap.get(sourceKey)!;
		source.layer = 0;


		this.updateLayerIndex(sourceKey);
	}

	private updateLayerIndex(nodeKey: string): void
	{

		const node = this.nodeMap.get(nodeKey)!;
		for (const connKey of this.graph.getConnectionsOf(nodeKey))
		{

			const conn = this.nodeMap.get(connKey)!;
			if (conn.layer < node.layer + 1)
			{
				conn.layer = node.layer + 1;
				this.updateLayerIndex(connKey);
			}
		}
	}

	private findSourceNodeKey(): string
	{
		const nodeKeys = this.graph.getAllConnections();
		main: for (const [nodeKey, connKeys] of nodeKeys)
		{
			for (const connKey of connKeys)
			{
				if (this.graph.isConnected(connKey, nodeKey))
				{
					continue main;
				}
			}

			return nodeKey;
		}

		throw new Error("Source node not found");
	}

	private updateNode(): void
	{
		for (const [, a] of this.nodeMap)
		{
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
					Vector.setMag(distVec, a.radius),
					a.pos,
				);
				const bEdge = Vector.add(
					Vector.setMag(distVec, -b.radius),
					b.pos,
				);
				edgePath += `M${aEdge.x} ${aEdge.y} L${bEdge.x} ${bEdge.y}`;
			}
		}

		this.edgePathsSVG.setAttribute("d", edgePath);
	}
}
