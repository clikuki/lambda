import { code, LambdaEval, stringifyLambda, parseString } from "./lambda.js";
import { constructDiagram } from "./tromp.js";

class Expr
{
	// Church Boolean
	static TRUE = "@x.@y.x";
	static FALSE = "@x.@y.y";
	static NOT = code`@f.f${this.FALSE}${this.TRUE}`;
	static OR = "@f.@g.ffg";
	static AND = "@f.@g.fgf";

	// Church Numerals
	static numeral(n: number): string
	{
		if (n < 0) throw new Error("n must be a nonnegative number");

		let start = "";
		let end = "";
		for (let i = n; i > 0; i--)
		{
			// Don't parenthesize inner most application
			if (i === 1) start += "f";
			else
			{
				start += "f(";
				end += ")";
			}
		}

		return `@f.@x.${start}x${end}`;
	}
	static SUCC = "@n.@f.@x.f(nfx)";
	static ADD = "@m.@n.@f.@x.mf(nfx)";
	static MULT = "@m.@n.@f.m(nf)";
	static EXP = "@b.@n.nb";
	static PRED = "@n.@f.@x.n(@g.@h.h(gf))(@u.x)(@u.u)";
	static SUB = code`@m.@n.n${this.PRED}m`;
}

const mainEl = document.querySelector("main")!;

const lEval = new LambdaEval();
const l1Cont = document.createElement("div");
const l1 = parseString("(@b.(@c.(@d.(@e.(eeeee))(dddd))(ccc))(bb))a");
console.log(stringifyLambda(l1));
l1Cont.append(constructDiagram(l1));
mainEl.append(l1Cont);

const l1Reduxes = lEval.findReductionPoints(l1);
const l2Cont = document.createElement("div");
console.log(l1Reduxes);
for (let i = 0; i < l1Reduxes.length; i++)
{
	const l1Redux = l1Reduxes[i];
	// console.log(i, ": ", l1Redux);

	const l2 = lEval.performReduction(l1, l1Redux);
	console.log(i, ": ", stringifyLambda(l2));
	l2Cont.append(constructDiagram(l2));
}
mainEl.append(l2Cont);