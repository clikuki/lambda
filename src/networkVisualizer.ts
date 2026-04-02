import { Display } from "./display.js";
import { Graph } from "./graph.js";
import { parseLambda } from "./lambda.js";
import { constructDiagram } from "./tromp.js";
import { createSVG, pointOnRect } from "./utils.js";
import { Vector } from "./vector.js";

export interface NetworkNode
{
	key: string;
	svg: SVGElement;
	width: number;
	height: number;
	pos: Vector;
	layer: number;
}

export class Network
{
	public display: Display;
	public edgePathsSVG: SVGElement;

	public constants = {
		epsilon: 0.0001,
		gap: 200,
		edgePad: 20,
	}

	public nodeMap = new Map<string, NetworkNode>();

	constructor(
		container: HTMLElement,
		private graph: Graph
	)
	{
		this.display = new Display(container, false);

		this.edgePathsSVG = createSVG("path", {
			stroke: "#767676",
		});

		this.display.svg.append(this.edgePathsSVG);

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
				node = {
					key: nodeKey,
					svg: constructDiagram(term),
					width: -1,
					height: -1,
					pos: new Vector(0, 0),
					layer: -1,
				};

				node.svg.setAttribute("key", nodeKey);
				node.width = +node.svg.getAttribute("width")!
				node.height = +node.svg.getAttribute("height")!

				this.nodeMap.set(nodeKey, node);
				this.display.addElement(node.svg);
			}
		}

		// Layout
		this.setLayers();
		this.orderLayerNodes();
		this.updateNode();
		this.updateEdges();
	}

	public findNodeAtPosition(x: number, y: number): NetworkNode | null
	{
		for (const [, node] of this.nodeMap)
		{
			const hw = node.width / 2;
			const hh = node.height / 2;
			if (x < node.pos.x - hw) continue;
			if (x > node.pos.x + hw) continue;
			if (y < node.pos.y - hh) continue;
			if (y > node.pos.y + hh) continue;
			return node;
		}

		return null;
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

		for (const edge of this.graph.getConnectionsOf(nodeKey))
		{
			const conn = this.nodeMap.get(edge.to)!;
			if (conn.layer < node.layer + 1)
			{
				conn.layer = node.layer + 1;
				this.updateLayerIndex(edge.to);
			}
		}
	}

	private findSourceNodeKey(): string
	{
		const nodeKeys = this.graph.getAllConnections();
		main: for (const [nodeKey, connKeys] of nodeKeys)
		{
			for (const edge of connKeys)
			{
				if (this.graph.isConnected(edge.to, nodeKey))
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
		const layers: NetworkNode[][] = []
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
		const offset = innerWidth / 4; // hardcode for now
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

	// private orderLayer(layer: NetworkNode[], incGraph: Graph): void
	// {
	// 	// median ordering
	// 	for (const node of layer)
	// 	{
	// 		const incoming = incGraph.getConnectionsOf(node.key);
	// 		const incomingCnt = incoming.length;

	// 		if (!incomingCnt) node.pos.x = 0;
	// 		else
	// 		{
	// 			const incomingOrder = Array.from(incoming)
	// 				.map(edge => this.nodeMap.get(edge.to)!.pos.x)
	// 				.sort((a, b) => a - b);
	// 			const mean = incomingOrder
	// 				.reduce((acc, cur) => acc + cur / incomingCnt, 0);

	// 			node.pos.x = mean;

	// 			// const halfCnt = incomingCnt / 2;
	// 			// node.order = incomingOrder[Math.floor(halfCnt)];
	// 			// if (incomingCnt % 2 === 0)
	// 			// {
	// 			// 	node.order += incomingOrder[Math.ceil(halfCnt)];
	// 			// 	node.order /= 2;
	// 			// }
	// 		}
	// 	}

	// 	// push apart overlapping nodes
	// 	layer.sort((a, b) => a.pos.x - b.pos.x);

	// 	const run: NetworkNode[] = [];
	// 	for (let i = 0, iter = 1000; i < layer.length; i++, iter--)
	// 	{
	// 		if (iter < 0) throw new Error("could not layout");

	// 		const node = layer[i];
	// 		const front = layer[i + 1];
	// 		run.push(node);

	// 		if (!front || node.pos.x + node.width / 2 <= front.pos.x - front.width / 2)
	// 		{
	// 			if (run.length > 1)
	// 			{
	// 				let center = 0, runWidth = 0;
	// 				for (let j = 0; j < run.length; j++)
	// 				{
	// 					const node = run[j];
	// 					center += node.pos.x;
	// 					runWidth += node.width + this.constants.gap;
	// 					if (j === 0 || j === run.length - 1) runWidth -= node.width / 2;
	// 				}
	// 				center /= run.length;
	// 				runWidth -= this.constants.gap;

	// 				let x = center - runWidth / 2;
	// 				for (let j = 0; j < run.length; j++)
	// 				{
	// 					const node = run[j];
	// 					if (j) x += node.width / 2;
	// 					node.pos.x = x;
	// 					x += node.width / 2 + this.constants.gap;
	// 				}

	// 				i = 0;
	// 			}

	// 			run.length = 0;
	// 		}
	// 	}
	// }

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
			for (const edge of this.graph.getConnectionsOf(aTerm))
			{
				const b = this.nodeMap.get(edge.to)!;
				const aEdge = pointOnRect(
					b.pos.x, b.pos.y,
					a.pos.x - a.width * 0.5 - this.constants.edgePad,
					a.pos.y - a.height * 0.5 - this.constants.edgePad,
					a.pos.x + a.width * 0.5 + this.constants.edgePad,
					a.pos.y + a.height * 0.5 + this.constants.edgePad,
				);
				const bEdge = pointOnRect(
					a.pos.x, a.pos.y,
					b.pos.x - b.width * 0.5 - this.constants.edgePad,
					b.pos.y - b.height * 0.5 - this.constants.edgePad,
					b.pos.x + b.width * 0.5 + this.constants.edgePad,
					b.pos.y + b.height * 0.5 + this.constants.edgePad,
				);
				edgePath += `M${aEdge.x} ${aEdge.y} L${bEdge.x} ${bEdge.y}`;
			}
		}

		this.edgePathsSVG.setAttribute("d", edgePath);
	}
}
