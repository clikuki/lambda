import { Lambda, code } from "./lambda.js";
import { Tromp } from "./tromp.js";

// TODO: Add undo

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

const container = document.querySelector("main")!;
const lambdaInput = document.querySelector("#lambda") as HTMLTextAreaElement;
lambdaInput.addEventListener("change", () => {
	console.log(lambdaInput.value);
});

const tromp = new Tromp(
	code`${ADD}${getNumeral(4)}${getNumeral(3)}`
	// code`${getNumeral(4)}${SUCC}${getNumeral(3)}`
	// code`${MULT}${getNumeral(4)}${getNumeral(3)}`
	// code`${EXP}${getNumeral(5)}${getNumeral(4)}`
	// code`${PRED}${getNumeral(5)}`
	// code`${SUB}${getNumeral(20)}${getNumeral(20)}`

	// code`${OR}(${NOT}(${OR}${FALSE}${TRUE}))(${AND}${TRUE}${TRUE})`
	// code`(@x.x)${TRUE}`
	// "(@x.xx)(@x.xx)"
	// code`(@z.@y.y(z(@a.@b.ba)))(@y.y${TRUE}${FALSE})`
);
container.appendChild(tromp.svg);
lambdaInput.value = tromp.lambdaTree.toString();

let diagramScale = 1;
let reductionBuffer = 0;
let undoBuffer = 0;
(function loop() {
	requestAnimationFrame(loop);

	if (tromp.svg.querySelector("animate")) return;

	if (undoBuffer > 0) {
		undoBuffer--;
		tromp.undo();
		lambdaInput.value = tromp.lambdaTree.toString();
	} else if (reductionBuffer > 0) {
		reductionBuffer--;
		tromp.reduce();
		lambdaInput.value = tromp.lambdaTree.toString();
	}
})();

lambdaInput.addEventListener("change", () => {
	tromp.use(lambdaInput.value.replaceAll(" ", ""));
	tromp.svg.style.scale = diagramScale.toString();
});
container.addEventListener("click", () => reductionBuffer++);
container.addEventListener("keydown", (e) => {
	if (tromp.svg.querySelector("animate")) return;
	if (e.ctrlKey && e.key === "z") {
		undoBuffer++;
		reductionBuffer = 0;
	}
});
container.addEventListener(
	"wheel",
	(e) => {
		diagramScale = Math.max(diagramScale + e.deltaY * 0.002, 0.1);
		tromp.svg.style.scale = diagramScale.toString();
	},
	{ passive: true }
);
