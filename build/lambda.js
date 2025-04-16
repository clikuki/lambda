import { getID } from "./utils.js";
const id = getID();
const REDUCTION_STEP_LIMIT = 10000;
export class Lambda {
    tree;
    constructor(code) {
        this.tree = parseString(code);
    }
    betaReduce(attemptNominal = false) {
        let reduced;
        let steps = REDUCTION_STEP_LIMIT;
        const replaced = { at: [] };
        do {
            reduced = attemptNominal
                ? this._greedyReductionStep(this.tree)
                : this._shallowReductionStep(this.tree, replaced);
            if (reduced)
                this.tree = reduced;
        } while (attemptNominal && reduced && --steps > 0);
        return replaced;
    }
    /** Performs as much reduction as possible in a single step */
    _greedyReductionStep(tree) {
        switch (tree.type) {
            case "APPLICATION":
                // Reduce application
                const { left, right } = tree;
                const leftReduct = this._greedyReductionStep(left) ?? left;
                const rightReduct = this._greedyReductionStep(right) ?? right;
                if (left.type === "ABSTRACTION") {
                    return this._substitute(left.body, left.param, right);
                }
                else {
                    return {
                        id: tree.id,
                        type: "APPLICATION",
                        left: leftReduct,
                        right: rightReduct,
                    };
                }
            case "ABSTRACTION":
                // Reduce abstraction body
                const bodyReduct = this._greedyReductionStep(tree.body);
                if (bodyReduct) {
                    return {
                        id: tree.id,
                        type: "ABSTRACTION",
                        param: tree.param,
                        body: bodyReduct,
                    };
                }
        }
        return null;
    }
    /** Perform one step of beta reduction */
    _shallowReductionStep(tree, replaced) {
        switch (tree.type) {
            case "APPLICATION":
                // Reduce application
                const { left, right } = tree;
                if (left.type === "ABSTRACTION") {
                    replaced.by = right;
                    return this._substitute(left.body, left.param, right, replaced);
                }
                const leftReduct = this._shallowReductionStep(left, replaced);
                if (leftReduct) {
                    return {
                        id: tree.id,
                        type: "APPLICATION",
                        left: leftReduct,
                        right,
                    };
                }
                const rightReduct = this._shallowReductionStep(right, replaced);
                if (rightReduct) {
                    return {
                        id: tree.id,
                        type: "APPLICATION",
                        left,
                        right: rightReduct,
                    };
                }
                break;
            case "ABSTRACTION":
                // Reduce abstraction body
                const bodyReduct = this._shallowReductionStep(tree.body, replaced);
                if (bodyReduct) {
                    return {
                        id: tree.id,
                        type: "ABSTRACTION",
                        param: tree.param,
                        body: bodyReduct,
                    };
                }
        }
        return null;
    }
    _substitute(tree, from, to, replaced) {
        // Quick escape for strings
        if (tree.type === "VARIABLE") {
            if (tree.symbol === from) {
                const copy = this.copy(to);
                replaced?.at.push(copy);
                return copy;
            }
            return tree;
        }
        let sub;
        if (tree.type === "APPLICATION") {
            // Dealing with application
            const { left, right } = tree;
            sub = {
                id: tree.id,
                type: "APPLICATION",
                left: this._substitute(left, from, to, replaced),
                right: this._substitute(right, from, to, replaced),
            };
        }
        else if (tree.param !== from) {
            // Dealing with abstraction
            sub = {
                id: tree.id,
                type: "ABSTRACTION",
                param: tree.param,
                body: this._substitute(tree.body, from, to, replaced),
            };
        }
        else {
            // Is abstraction, but shadows the term that we are trying to substitute
            sub = tree;
        }
        return sub;
    }
    copy(tree, changeID = true) {
        switch (tree.type) {
            case "VARIABLE":
                return {
                    id: changeID ? id.next().value : tree.id,
                    type: "VARIABLE",
                    symbol: tree.symbol,
                };
            case "APPLICATION":
                return {
                    id: changeID ? id.next().value : tree.id,
                    type: "APPLICATION",
                    left: this.copy(tree.left, changeID),
                    right: this.copy(tree.right, changeID),
                };
            case "ABSTRACTION":
                return {
                    id: changeID ? id.next().value : tree.id,
                    type: "ABSTRACTION",
                    param: tree.param,
                    body: this.copy(tree.body, changeID),
                };
        }
    }
    toString(collectParameters = false) {
        return stringifyTree(this.tree, collectParameters);
    }
}
export const func_char = "@";
export function parseString(code, mapping = new Map()) {
    let left = null;
    let right = null;
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (char === " ")
            throw SyntaxError("No spaces allowed in code string");
        if (char === func_char) {
            // abstraction declaration
            const start = i + 3;
            const end = code.length;
            const paramChar = code[i + 1];
            const param = Symbol(paramChar);
            const localMapping = new Map(mapping);
            localMapping.set(paramChar, param);
            // All characters at this point must be consumed
            const body = parseString(code.slice(start, end), localMapping);
            const abstraction = {
                type: "ABSTRACTION",
                param,
                body,
                id: id.next().value,
            };
            if (!left)
                left = abstraction;
            else
                right = abstraction;
            i = end;
        }
        else if (char === "(") {
            // Perform parse within bracket group, this usually occurs before abstraction declarations
            const start = i + 1;
            const end = findBracketPair(code, i);
            let term = parseString(code.slice(start, end), mapping);
            if (!left)
                left = term;
            else
                right = term;
            i = end;
        }
        else {
            // Get correspnding symbol of variable
            const sym = mapping.get(char) ?? Symbol(char);
            if (!mapping.has(char))
                mapping.set(char, sym);
            // Add single character as variable
            const variable = {
                type: "VARIABLE",
                symbol: sym,
                id: id.next().value,
            };
            if (!left)
                left = variable;
            else
                right = variable;
        }
        if (right) {
            // Group a and b into an application
            left = { type: "APPLICATION", left, right, id: id.next().value };
            right = null;
        }
    }
    if (!left)
        throw "Cannot parse empty string";
    return left;
}
export function stringifyTree(tree, combineParameters = false) {
    let str = "";
    if (tree.type === "VARIABLE") {
        // Is this a dangerous assumption?
        str = tree.symbol.description;
    }
    else if (tree.type === "APPLICATION") {
        // Dealing with application
        const { left, right } = tree;
        str += stringifyTree(left, combineParameters);
        // If the second term is an application itself, then explicitly parenthesize
        if (right.type === "APPLICATION")
            str += `(${stringifyTree(right, combineParameters)})`;
        else
            str += `${stringifyTree(right, combineParameters)}`;
    }
    else {
        // Dealing with abstraction
        // Shorthand: Collect parameters of consecutively nested abstractions
        let node = tree.body;
        let parameters = tree.param.description;
        while (combineParameters && node.type === "ABSTRACTION") {
            parameters += node.param.description;
            node = node.body;
        }
        str = `(${func_char}${parameters}.${stringifyTree(node, combineParameters)})`;
    }
    return str;
}
function findBracketPair(str, at) {
    let count = 1;
    for (let i = at + 1; i < str.length; i++) {
        const char = str[i];
        if (char === "(")
            count++;
        else if (char === ")" && !--count)
            return i;
    }
    return -1;
}
export function code(strings, ...values) {
    let str = "";
    for (let i = 0; i < values.length; i++) {
        str += strings[i];
        str += `(${values[i]})`;
    }
    str += strings.at(-1);
    return str.replaceAll(" ", "");
}
//# sourceMappingURL=lambda.js.map