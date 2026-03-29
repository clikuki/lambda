export class Graph<T>
{
	private map = new Map<T, Set<T>>();

	public getAllConnections()
	{
		return this.map.entries();
	}

	public getConnectionsOf(from: T): Set<T>
	{
		let connections = this.map.get(from);
		if (!connections) connections = new Set();
		return connections;
	}

	public isConnected(from: T, to: T): boolean
	{
		const connections = this.map.get(from);
		if (connections) return connections.has(to);
		return false;
	}

	/** Add node to graph without any connections */
	public add(node: T): void
	{
		if (!this.map.has(node))
		{
			this.map.set(node, new Set());
		}
	}

	public connect(from: T, to: T): void
	{
		const connections = this.map.get(from);
		if (connections) connections.add(to);
		else this.map.set(from, new Set([to]));
	}

	public disconnect(from: T, to: T): void
	{
		const connections = this.map.get(from);
		if (connections) connections.delete(to);
	}

	public biconnect(a: T, b: T): void
	{
		this.connect(a, b);
		this.connect(b, a);
	}

	public bidisconnect(a: T, b: T): void
	{
		this.disconnect(a, b);
		this.disconnect(b, a);
	}

	public toReversedEdges(): Graph<T>
	{
		const rev = new Graph<T>();

		for (const [key, conns] of this.map)
		{
			for (const conn of conns)
			{
				rev.add(conn);
				rev.connect(conn, key);
			}
		}

		return rev;
	}
}