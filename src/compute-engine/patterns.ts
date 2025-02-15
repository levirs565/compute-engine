import {
  getDictionary,
  getFunctionHead,
  getFunctionName,
  getNumberValue,
  getStringValue,
  getSymbolName,
  getTail,
} from '../common/utils';
import { Expression, Substitution } from '../math-json/math-json-format';
import { NUMERICAL_TOLERANCE } from './numeric';
import { Numeric } from '../math-json/compute-engine-interface';
import { hasWildcards } from './utils';

function captureWildcard<T extends number = number>(
  wildcard: string,
  expr: Expression<T> | null,
  substitution: Substitution<T>
): Substitution<T> | null {
  if (expr === null) return null;

  const name = getWildcardName(wildcard);

  // If this is a universal wildcard, it matches and no need to add it
  // to the substitution record.
  if (name === '') return substitution;

  if (substitution[name]) {
    // There was already a match, make sure this one is identical
    if (match(expr, substitution[name]) === null) return null;
    return substitution;
  } else {
    substitution[name] = expr;
  }
  return substitution;
}

export function matchRecursive(
  expr: Expression<Numeric>,
  pattern: Expression<Numeric>,
  substitution: Substitution<Numeric>,
  options: { numericTolerance: number }
): Substitution<Numeric> | null {
  //
  // Match a number
  //
  const val = getNumberValue(pattern);
  if (val !== null) {
    // Two numbers are considered the same if they are close in value
    // (< 10^(-10) by default).
    if (
      Math.abs(val - (getNumberValue(expr) ?? NaN)) <= options.numericTolerance
    ) {
      return substitution;
    }
    return null;
  }

  //
  // Match a string
  //

  const str = getStringValue(pattern);
  if (str !== null) {
    if (getStringValue(expr) === str) return substitution;
    return null;
  }

  //
  // Match a dictionary
  //
  const dict = getDictionary(pattern);
  if (dict !== null) {
    const keys = Object.keys(dict);
    const exprDict = getDictionary(expr);
    if (exprDict === null) return null;
    if (Object.keys(exprDict).length !== keys.length) return null;
    for (const key of keys) {
      const r = matchRecursive(exprDict[key], dict[key], substitution, options);
      if (r === null) return null;
      substitution = r;
    }
    return substitution;
  }

  //
  // Match a symbol or capture symbol
  //
  const symbol = getSymbolName(pattern);
  if (symbol !== null) {
    if (symbol.startsWith('_'))
      return captureWildcard(symbol, expr, substitution);

    if (symbol === getSymbolName(expr)) {
      if (
        typeof pattern === 'object' &&
        typeof expr === 'object' &&
        'wikidata' in pattern &&
        'wikidata' in expr &&
        pattern.wikidata !== expr.wikidata
      ) {
        // The symbols match, but they have a different wikidata: they don't match
        return null;
      }
      return substitution;
    }

    if (
      typeof pattern === 'object' &&
      typeof expr === 'object' &&
      'wikidata' in pattern &&
      'wikidata' in expr &&
      pattern.wikidata === expr.wikidata
    ) {
      return substitution;
    }

    return null;
  }

  //
  // Match a function
  //
  const head = getFunctionHead(pattern);
  if (head === null) return null;

  // Match the function head
  if (typeof head === 'string' && head.startsWith('_')) {
    return captureWildcard(head, getFunctionHead(expr), substitution);
  } else {
    const exprHead = getFunctionHead(expr);
    if (exprHead === null) return null;
    if (match(head, exprHead, options) === null) return null;
  }

  // Match the arguments
  const args = getTail(pattern);
  const exprArgs = getTail(expr);
  const count = args.length;
  if (count !== exprArgs.length) return null;
  let result: Substitution | null = { ...substitution };
  let i = 0; // Index in pattern
  while (i < count) {
    const arg = args[i];
    const argName = getSymbolName(arg);
    if (argName !== null) {
      if (argName.startsWith('__')) {
        // Match 0 or more expressions (__) or 1 or more (___)
        let j = 0; // Index in subject
        if (args[i + 1] === undefined) {
          // No more args after, go till the end
          j = exprArgs.length + 1;
        } else {
          // Capture till the next matching arg
          let found = false;
          while (!found && j < exprArgs.length) {
            found = match(args[i + 1], exprArgs[j], options) !== null;
            j += 1;
          }
          if (!found) return null;
        }
        if (!argName.startsWith('___') && j <= 1) return null;
        result = captureWildcard(
          argName,
          ['Sequence', ...exprArgs.splice(0, j - 1)],
          result!
        );
      } else if (argName.startsWith('_')) {
        result = captureWildcard(argName, exprArgs.shift()!, result);
      } else {
        const sub = match(exprArgs.shift()!, arg, options);
        if (sub === null) return null;
        result = { ...result, ...sub! };
      }
    } else {
      const sub = match(exprArgs.shift()!, arg, options);
      if (sub === null) return null;
      result = { ...result, ...sub! };
    }

    if (result === null) return null;
    i += 1;
  }

  return result;
}

/**
 * The function attempts to match a [pattern](http://cortexjs.io/compute-engine/guides/patterns-and-rules/)
 * with a subject expression.
 *
 * If the match is successful, it returns a `Substitution` indicating how to
 * transform the pattern to become the subject.
 *
 * If the pattern is not a match, it returns `null`.
 *
 * This function attempts the match purely structurally, without any
 * knowledge about commutative and associative properties of functions.
 *
 * In most cases, you'll want to account for these properties. To do so,
 * use the `ce.match()` function instead.
 *
 */
export function match<T extends number = number>(
  subject: Expression<T>,
  pattern: Expression<T>,
  options?: { numericTolerance?: number }
): Substitution<T> | null {
  console.assert(!hasWildcards(subject) || hasWildcards(pattern));
  return matchRecursive(
    subject,
    pattern,
    {},
    { numericTolerance: options?.numericTolerance ?? NUMERICAL_TOLERANCE }
  );
}

export function match1(
  expr: Expression,
  pattern: Expression,
  options: { numericTolerance: number }
): Expression | null {
  const result = match(pattern, expr, options);
  if (result === null) return null;
  const keys = Object.keys(result);
  if (keys.length !== 1) return null;
  return result[keys[0]];
}

export function count(
  exprs: Iterable<Expression>,
  pattern: Expression,
  options: { numericTolerance: number }
): number {
  let result = 0;
  for (const expr of exprs) {
    if (match(expr, pattern, options) !== null) result += 1;
  }
  return result;
}

export function matchList(
  exprs: Iterable<Expression>,
  pattern: Expression,
  options: { numericTolerance: number }
): Substitution[] {
  const result: Substitution[] = [];
  for (const expr of exprs) {
    const r = match(expr, pattern, options);
    if (r !== null) result.push(r);
  }

  return result;
}

export function substitute<T extends number = Numeric>(
  expr: Expression<T>,
  substitution: Substitution<T>
): Expression<T> {
  //
  // Symbol
  //
  const symbol = getSymbolName(expr);
  if (symbol !== null) {
    if (symbol.startsWith('_')) {
      return substitution[getWildcardName(symbol)] ?? expr;
    }
    return expr;
  }

  //
  // Dictionary
  //
  const dict = getDictionary(expr);
  if (dict !== null) {
    const result = {};
    for (const key of Object.keys(dict)) {
      result[key] = substitute(dict[key], substitution);
    }
    return { dict: result };
  }

  //
  // Function
  //
  const head = getFunctionHead(expr);
  if (head !== null) {
    let result: Expression<T> = [substitute(head, substitution)];
    for (const arg of getTail(expr)) {
      const symbol = getSymbolName(arg);
      if (symbol !== null && symbol.startsWith('__')) {
        // Wildcard sequence: `__` or `___`
        const seq = substitution[getWildcardName(symbol)];
        if (seq === undefined || getFunctionName(seq) !== 'Sequence') {
          result.push(symbol);
        } else {
          result = result.concat(getTail(seq));
        }
      } else {
        result.push(substitute(arg, substitution));
      }
    }

    return result;
  }

  return expr;
}

function getWildcardName(s: string): string {
  const m = s.match(/^__?_?([a-zA-Z0-9]+)/);
  if (m === null) return '';
  return m[1];
}
