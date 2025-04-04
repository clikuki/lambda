import { SyntaxTree, code } from "./lambda.js";

const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const NOT = code`@f.f${FALSE}${TRUE}`;
const OR = "@f.@g.@x.@y.fx(gxy)";
const AND = "@f.@g.@x.@y.f(gxy)y";

const syntaxTree = new SyntaxTree(code`${AND}`);
console.log(syntaxTree.toString());
syntaxTree.betaReduce(true);
console.log(syntaxTree.toString());
