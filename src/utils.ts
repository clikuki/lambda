export interface ID
{
	str: string;
}

export function getID()
{
	let i = 0;
	return function ()
	{
		return {
			str: "id-" + (i++).toString().padStart(4, "0"),
		};
	}
}

export function setAttributes(elem: Element, attr: Record<string, any>)
{
	for (const key in attr)
	{
		elem.setAttribute(key, attr[key]);
	}
}

export function createSVG(tag: string, attr?: Record<string, any>)
{
	const svg = document.createElementNS("http://www.w3.org/2000/svg", tag);
	if (attr) setAttributes(svg, attr);
	return svg;
}

export function pointOnRect(
	x: number,
	y: number,
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
)
{
	const midX = (minX + maxX) / 2;
	const midY = (minY + maxY) / 2;
	// if (midX - x == 0) -> m == ±Inf -> minYx/maxYx == x (because value / ±Inf = ±0)
	const m = (midY - y) / (midX - x);

	if (x <= midX)
	{ // check "left" side
		const minXy = m * (minX - x) + y;
		if (minY <= minXy && minXy <= maxY)
			return { x: minX, y: minXy };
	}

	if (x >= midX)
	{ // check "right" side
		const maxXy = m * (maxX - x) + y;
		if (minY <= maxXy && maxXy <= maxY)
			return { x: maxX, y: maxXy };
	}

	if (y <= midY)
	{ // check "top" side
		const minYx = (minY - y) / m + x;
		if (minX <= minYx && minYx <= maxX)
			return { x: minYx, y: minY };
	}

	if (y >= midY)
	{ // check "bottom" side
		const maxYx = (maxY - y) / m + x;
		if (minX <= maxYx && maxYx <= maxX)
			return { x: maxYx, y: maxY };
	}

	// edge case when finding midpoint intersection: m = 0/0 = NaN
	if (x === midX && y === midY) return { x: x, y: y };

	throw `Cannot find intersection for [${x}, ${y}] inside rectangle [${minX}, ${minY}, ${maxX}, ${maxY}].`;
}