import { code, LambdaEval, stringifyLambda, parseString } from "./lambda.js";

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

const lEval = new LambdaEval();
const l1 = parseString("(@x.(@y.(@a.(@b.b)a)y)x)z");
console.log(stringifyLambda(l1));

const l1Reduxes = lEval.findReductionPoints(l1);
console.log(l1Reduxes);
for (let i = 0; i < l1Reduxes.length; i++)
{
	const l1Redux = l1Reduxes[i];
	console.log(i, " : ", l1Redux);

	const l2 = lEval.performReduction(l1, l1Redux);
	console.log(stringifyLambda(l2));
}
