import { SyntaxTree, code } from "./lambda.js";
import { constructDiagram, renderDiagram } from "./tromp.js";

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const NOT = code`@f.f${FALSE}${TRUE}`;
const OR = "@f.@g.ffg";
const AND = "@f.@g.fgf";

const syntaxTree = new SyntaxTree(
	// code`${OR}(${NOT}(${AND}${TRUE}yasd))(${OR}${FALSE}${FALSE})`
	code`${OR}${FALSE}${TRUE}`
	// OR
	// "@f.@x.f(fx)"
	// code`${NOT}(${AND}${TRUE}${FALSE})`
	// "@x.ax"
);
// console.log(syntaxTree.toString());
syntaxTree.betaReduce();
// syntaxTree.betaReduce();
console.log(syntaxTree.toString());

const diagram = constructDiagram(syntaxTree);
console.log(diagram);
const svg = renderDiagram(diagram);
document.body.appendChild(svg);
