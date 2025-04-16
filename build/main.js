import { code } from "./lambda.js";
import { Tromp } from "./tromp.js";
// TODO: Add undo
class Expr {
    // Church Boolean
    static TRUE = "@x.@y.x";
    static FALSE = "@x.@y.y";
    static NOT = code `@f.f${this.FALSE}${this.TRUE}`;
    static OR = "@f.@g.ffg";
    static AND = "@f.@g.fgf";
    // Church Numerals
    static numeral(n) {
        if (n < 0)
            throw new Error("n must be a nonnegative number");
        let start = "";
        let end = "";
        for (let i = n; i > 0; i--) {
            // Don't parenthesize inner most application
            if (i === 1)
                start += "f";
            else {
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
    static SUB = code `@m.@n.n${this.PRED}m`;
}
const container = document.querySelector("main");
const lambdaInput = document.querySelector("#lambda");
lambdaInput.addEventListener("change", () => {
    console.log(lambdaInput.value);
});
const tromp = new Tromp(code `${Expr.ADD}${Expr.numeral(4)}${Expr.numeral(3)}`);
container.appendChild(tromp.svg);
lambdaInput.value = tromp.lambdaTree.toString();
let diagramScale = 1;
let reductionBuffer = 0;
let undoBuffer = 0;
(function loop() {
    requestAnimationFrame(loop);
    if (tromp.svg.querySelector("animate"))
        return;
    if (undoBuffer > 0) {
        undoBuffer--;
        tromp.undo();
        lambdaInput.value = tromp.lambdaTree.toString();
    }
    else if (reductionBuffer > 0) {
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
    if (tromp.svg.querySelector("animate"))
        return;
    if (e.ctrlKey && e.key === "z") {
        undoBuffer++;
        reductionBuffer = 0;
    }
});
container.addEventListener("wheel", (e) => {
    diagramScale = Math.max(diagramScale + e.deltaY * 0.002, 0.1);
    tromp.svg.style.scale = diagramScale.toString();
}, { passive: true });
//# sourceMappingURL=main.js.map