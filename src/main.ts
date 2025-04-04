import { SyntaxTree, code } from "./lambda.js";

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const NOT = code`@f.f${FALSE}${TRUE}`;
const OR = "@f.@g.ffg";
const AND = "@f.@g.fgf";

const syntaxTree = new SyntaxTree(
	// code`${OR}(${NOT}(${AND}${TRUE}${FALSE}))(${OR}${FALSE}${FALSE})`
	code`${OR}${FALSE}${TRUE}`
);
console.log(syntaxTree.toString());
syntaxTree.betaReduce(true);
console.log(syntaxTree.toString());
