import { code } from "./lambda.js";

export class Expr
{
	// Church Boolean
	static TRUE = "@@ 1";
	static FALSE = "@@ 0";
	static NOT = code`@ 0 ${this.FALSE} ${this.TRUE}`;
	static OR = "@@ 1 1 0";
	static AND = "@@ 1 0 1";

	// Church Numerals
	static numeral(n: number): string
	{
		if (n < 0) throw new Error("n must be a nonnegative number");

		let start = "";
		let end = "";
		for (let i = n; i > 0; i--)
		{
			// Don't parenthesize inner most application
			if (i === 1) start += "1";
			else
			{
				start += "1(";
				end += ")";
			}
		}

		return `@@ ${start} 0 ${end}`;
	}
	static SUCC = "@@@ 1 (2 1 0)";
	static ADD = "@@@@ 3 1 (2 1 0)";
	static MULT = "@@@ 2 (1 0)";
	static EXP = "@@ 0 1";
	static PRED = "@@@ 2 (@@ 0 (1 3)) (@ 1) (@ 0)";
	static SUB = code`@@ 0 ${this.PRED} 1`;
}