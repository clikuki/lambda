import { SyntaxTree, code } from "./lambda.js";
import { constructDiagram, renderDiagram } from "./tromp.js";

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
let prevDiagram = constructDiagram(syntaxTree);
document.body.appendChild(renderDiagram(prevDiagram));

document.body.addEventListener("click", () => {
	syntaxTree.betaReduce();
	const diagram = constructDiagram(syntaxTree);
	document.body.replaceChildren(renderDiagram(diagram));
	prevDiagram = diagram;
});
