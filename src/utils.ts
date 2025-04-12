export interface ID {
	str: string;
}
export function* getID(): Generator<ID, ID, null> {
	let i = 0;
	while (true) {
		yield { str: "id-" + (i++).toString().padStart(4, "0") };
	}
}

export function setAttributes(elem: Element, attr: Record<string, any>) {
	for (const key in attr) {
		elem.setAttribute(key, attr[key]);
	}
}

export function createSVG(tag: string, attr?: Record<string, any>) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", tag);
	if (attr) setAttributes(svg, attr);
	return svg;
}
