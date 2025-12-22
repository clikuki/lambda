export class Graph<T>
{
	private map = new Map<T, Set<T>>();

	public getConnections(from: T): Set<T>
	{
		let connections = this.map.get(from);
		if (!connections) connections = new Set();
		return connections;
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
}