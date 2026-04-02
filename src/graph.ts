interface GraphEdge
{
	to: string,
	reduxIndex: number,
}

export class Graph
{
	private map = new Map<string, GraphEdge[]>();

	public getAllConnections()
	{
		return this.map.entries();
	}

	public getConnectionsOf(from: string): GraphEdge[]
	{
		let connections = this.map.get(from);
		if (!connections) connections = [];
		return connections;
	}

	public isConnected(from: string, to: string): boolean
	{
		const connections = this.map.get(from);
		if (connections) return connections.some((edge) => edge.to === to);
		return false;
	}

	public add(key: string): void
	{
		if (!this.map.has(key))
		{
			this.map.set(key, []);
		}
	}

	public connect(from: string, to: string, reduxIndex: number): void
	{
		const connections = this.map.get(from);
		const edge = { to, reduxIndex };
		if (connections) connections.push(edge);
		else this.map.set(from, [edge]);
	}

	public disconnect(from: string, to: string): boolean
	{
		const connections = this.map.get(from);
		if (connections)
		{
			for (let i = 0, len = connections.length, node; i < len; i++)
			{
				node = connections[i];
				if (node.to === to)
				{
					[connections[i], connections[len - 1]] = [connections[len - 1], connections[i]]
					return true;
				}
			}
		}

		return true;
	}

	public getReduxPt(from: string, to: string): number
	{
		const edges = this.map.get(from);
		if (edges)
		{
			for (const edge of edges)
			{
				if (edge.to === to) return edge.reduxIndex;
			}
		}
		return -1;
	}

	public toReversedEdges(): Graph
	{
		const rev = new Graph();

		for (const [key, edges] of this.map)
		{
			for (const edge of edges)
			{
				rev.add(edge.to);
				rev.connect(edge.to, key, edge.reduxIndex);
			}
		}

		return rev;
	}
}