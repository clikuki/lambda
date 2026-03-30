import { Graph } from "./graph.js";
import { parseLambda } from "./lambda.js";
import { constructDiagram } from "./tromp.js";
import { createSVG } from "./utils.js";
import { Vector } from "./vector.js";

interface NodeData
{
	key: string;
	svg: SVGElement;
	// radius: number;
	width: number;
	height: number;
	pos: Vector;
	vel: Vector;
	acc: Vector;

	// Layout
	layer: number;
	// order: number;
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
		gap: 100,
	}

	private revGraph = new Graph<string>();
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
			stroke: "#767676",
		});

		this.worldSVG.append(this.edgePathsSVG);

		this.renewStateFromGraph();
	}

	public renewStateFromGraph(): void
	{
		for (const [nodeKey] of this.graph.getAllConnections())
		{
			let node = this.nodeMap.get(nodeKey);
			if (!node)
			{
				const term = parseLambda(nodeKey);
				const svg = constructDiagram(term);
				const width = +svg.getAttribute("width")!;
				const height = +svg.getAttribute("height")!;
				// const radius = Math.hypot(width, height);
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
					key: nodeKey,
					// radius,
					width,
					height,
					pos, vel, acc, svg,
					layer: -1,
					// order: -1,
				};
				this.nodeMap.set(nodeKey, node);
				this.worldSVG.append(node.svg);
			}
		}

		this.revGraph = this.graph.toReversedEdges();

		// Layout
		this.setLayers();
		this.orderLayerNodes();
		this.updateNode();
		this.updateEdges();
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

	private setLayers(): void
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
		node.pos.y = node.layer * 150 + 100;

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

	/**
	 * Currently has no effect besides setting x coords
	 */
	private orderLayerNodes(): void
	{
		// Find layers
		const layers: NodeData[][] = []
		for (const node of this.nodeMap.values())
		{
			node.pos.x = -1;
			const l = node.layer;
			if (!layers[l]) layers[l] = [node];
			else layers[l].push(node);
		}

		// TODO: implement clustering nodes according to parents/children influence
		// // init root
		// layers[0][0].pos.x = innerWidth / 2;

		// // iterative passes
		// for (let i = 0; i < 4; i++)
		// {
		// 	// top down
		// 	for (let j = 1; j < layers.length; j++)
		// 	{
		// 		this.orderLayer(layers[j], this.revGraph);
		// 	}

		// 	// bottom up
		// 	for (let j = layers.length - 2; j >= 0; j--)
		// 	{
		// 		this.orderLayer(layers[j], this.graph);
		// 	}

		// 	// console.log(layers.map((a, i) => `${i}: ${a[0].order}`));
		// }


		// Center them
		const offset = innerWidth / 2;
		for (const layer of layers)
		{
			const layerLen = layer.length;
			let layerWidth = this.constants.gap * (layerLen - 1);
			for (let j = 0; j < layerLen; j++)
			{
				const node = layer[j];
				layerWidth += node.width;
				if (j === 0) layerWidth -= node.width / 2;
				if (j === layerLen - 1) layerWidth -= node.width / 2;
			}

			let x = offset - layerWidth / 2;
			for (let j = 0; j < layerLen; j++)
			{
				const node = layer[j];
				if (j) x += node.width / 2;
				node.pos.x = x;
				x += node.width / 2 + this.constants.gap;
			}
		}
	}

	private orderLayer(layer: NodeData[], incGraph: Graph<string>): void
	{
		// median ordering
		for (const node of layer)
		{
			const incoming = incGraph.getConnectionsOf(node.key);
			const incomingCnt = incoming.size;

			if (!incomingCnt) node.pos.x = 0;
			else
			{
				const incomingOrder = Array.from(incoming)
					.map(k => this.nodeMap.get(k)!.pos.x)
					.sort((a, b) => a - b);
				const mean = incomingOrder
					.reduce((acc, cur) => acc + cur / incomingCnt, 0);

				node.pos.x = mean;

				// const halfCnt = incomingCnt / 2;
				// node.order = incomingOrder[Math.floor(halfCnt)];
				// if (incomingCnt % 2 === 0)
				// {
				// 	node.order += incomingOrder[Math.ceil(halfCnt)];
				// 	node.order /= 2;
				// }
			}
		}

		// push apart overlapping nodes
		layer.sort((a, b) => a.pos.x - b.pos.x);

		const run: NodeData[] = [];
		for (let i = 0, iter = 1000; i < layer.length; i++, iter--)
		{
			if (iter < 0) throw new Error("could not layout");

			const node = layer[i];
			const front = layer[i + 1];
			run.push(node);

			if (!front || node.pos.x + node.width / 2 <= front.pos.x - front.width / 2)
			{
				if (run.length > 1)
				{
					let center = 0, runWidth = 0;
					for (let j = 0; j < run.length; j++)
					{
						const node = run[j];
						center += node.pos.x;
						runWidth += node.width + this.constants.gap;
						if (j === 0 || j === run.length - 1) runWidth -= node.width / 2;
					}
					center /= run.length;
					runWidth -= this.constants.gap;

					let x = center - runWidth / 2;
					for (let j = 0; j < run.length; j++)
					{
						const node = run[j];
						if (j) x += node.width / 2;
						node.pos.x = x;
						x += node.width / 2 + this.constants.gap;
					}

					i = 0;
				}

				run.length = 0;
			}
		}
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
				const aEdge = a.pos;
				const bEdge = b.pos;
				edgePath += `M${aEdge.x} ${aEdge.y} L${bEdge.x} ${bEdge.y}`;
			}
		}

		this.edgePathsSVG.setAttribute("d", edgePath);
	}
}
