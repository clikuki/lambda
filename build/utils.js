export function* getID() {
    let i = 0;
    while (true) {
        yield { str: "id-" + (i++).toString().padStart(4, "0") };
    }
}
export function setAttributes(elem, attr) {
    for (const key in attr) {
        elem.setAttribute(key, attr[key]);
    }
}
export function createSVG(tag, attr) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attr)
        setAttributes(svg, attr);
    return svg;
}
//# sourceMappingURL=utils.js.map