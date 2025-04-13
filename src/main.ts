import { SyntaxTree, code } from "./lambda.js";
import { Tromp } from "./tromp.js";

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const NOT = code`@f.f${FALSE}${TRUE}`;
const OR = "@f.@g.ffg";
const AND = "@f.@g.fgf";

const syntaxTree = new SyntaxTree(
	// "(@x.xx)(@x.x)"
	code`${OR}${FALSE}${TRUE}`
	// OR
	// "@f.@x.f(fx)"
	// code`${NOT}(${AND}${TRUE}${FALSE})`
	// "@x.ax"
);

const tromp = new Tromp(syntaxTree, 5);
document.body.appendChild(tromp.svg);

document.body.addEventListener("click", () => {
	syntaxTree.betaReduce();
	tromp._DiagramTree = tromp.construct();
	const next = tromp.render();
	tromp.animate(tromp.svg, next);
	document.body.appendChild(next);
});
