import { SyntaxTree, code } from "./lambda.js";
import { Tromp } from "./tromp.js";

// Church Boolean
const TRUE = "@x.@y.x";
const FALSE = "@x.@y.y";
const NOT = code`@f.f${FALSE}${TRUE}`;
const OR = "@f.@g.ffg";
const AND = "@f.@g.fgf";

// Church Numerals
function getNumeral(n: number): string {
	if (n < 0) throw new Error("n must be a nonnegative number");

	function build(n: number): string {
		if (n === 1) return "fx";
		return `f(${build(n - 1)})`;
	}

	return "@f.@x." + build(n);
}
const SUCC = "@n.@f.@x.f(nfx)";
const ADD = "@m.@n.@f.@x.mf(nfx)";
const MULT = "@m.@n.@f.m(nf)";
const EXP = "@b.@n.nb";
const PRED = "@n.@f.@x.n(@g.@h.h(gf))(@u.x)(@u.u)";
const SUB = code`@m.@n.n${PRED}m`;

const syntaxTree = new SyntaxTree(
	// code`${ADD}${getNumeral(4)}${getNumeral(3)}`
	// code`${getNumeral(4)}${SUCC}${getNumeral(3)}`
	// code`${MULT}${getNumeral(4)}${getNumeral(3)}`
	// code`${EXP}${getNumeral(3)}${getNumeral(5)}`
	// code`${PRED}${getNumeral(5)}`
	code`${SUB}${getNumeral(3)}${getNumeral(2)}`

	// code`${OR}(${NOT}(${OR}${FALSE}${TRUE}))(${AND}${TRUE}${TRUE})`
);

const tromp = new Tromp(syntaxTree, 1);
document.body.appendChild(tromp.svg);
console.log(syntaxTree.toString());

let queued = 0;
document.body.addEventListener("click", () => {
	queued++;

	(function loop() {
		if (tromp.svg.querySelector("animate")) {
			requestAnimationFrame(loop);
			return;
		}
		const replaced = syntaxTree.betaReduce();
		if (!replaced.by) return;

		console.log(syntaxTree.toString());

		tromp._DiagramTree = tromp.construct();
		const next = tromp.buildPath();
		tromp.transitionSVG(tromp.svg, next, replaced);
		// document.body.append(next);
		if (--queued) requestAnimationFrame(loop);
	})();
});
