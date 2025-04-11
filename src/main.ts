import { SyntaxTree, code } from "./lambda.js";
import { constructDiagram } from "./tromp.js";

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const NOT = code`@f.f${FALSE}${TRUE}`;
const OR = "@f.@g.ffg";
const AND = "@f.@g.fgf";

const syntaxTree = new SyntaxTree(
	// code`${OR}(${NOT}(${AND}${TRUE}${FALSE}))(${OR}${FALSE}${FALSE})`
	// code`${OR}${FALSE}${TRUE}`
	"@f.@x.f(fx)"
	// TRUE
);
console.log(syntaxTree.toString());
syntaxTree.betaReduce(true);
console.log(syntaxTree.toString());

const svg = constructDiagram(syntaxTree);
svg.style.width = "500px";
document.body.appendChild(svg);
