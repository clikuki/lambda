import { SyntaxTree, code } from "./lambda.js";
import { animateDiagram, constructDiagram, renderDiagram } from "./tromp.js";

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const NOT = code`@f.f${FALSE}${TRUE}`;
const OR = "@f.@g.ffg";
const AND = "@f.@g.fgf";

const syntaxTree = new SyntaxTree(
	code`${OR}${FALSE}${TRUE}`
	// OR
	// "@f.@x.f(fx)"
	// code`${NOT}(${AND}${TRUE}${FALSE})`
	// "@x.ax"
);

// initialize svg
let prevSvg = renderDiagram(constructDiagram(syntaxTree), 5);
document.body.appendChild(prevSvg);

document.body.addEventListener("click", () => {
	syntaxTree.betaReduce();
	const diagram = constructDiagram(syntaxTree);
	const svg = renderDiagram(diagram, 5);
	document.body.appendChild(svg);
	// animateDiagram(prevSvg, svg);
	prevSvg = svg;
});
