import type { Expression } from './math-json-format';
import {
  NumberFormattingOptions,
  LatexString,
  SerializeLatexOptions,
  WarningSignalHandler,
} from './public';
import {
  getArg,
  getSymbolName,
  isNumberObject,
  getTail,
  isSymbolObject,
  getFunctionName,
  getArgCount,
  getFunctionHead,
  isFunctionObject,
  getStringValue,
  getDictionary,
  NOTHING,
} from '../common/utils';
import {
  IndexedLatexDictionary,
  IndexedLatexDictionaryEntry,
} from './definitions';
import { joinLatex } from './core/tokenizer';
import { serializeNumber } from '../common/serialize-number';
import { replaceLatex } from './utils';
import { ComputeEngine, Numeric } from './compute-engine-interface';

function getSymbolStyle(expr: Expression, _level: number): 'asis' | 'upright' {
  console.assert(typeof expr === 'string' || isSymbolObject(expr));
  const sym = getSymbolName(expr);
  if (sym === null) return 'asis';
  return sym.length > 1 ? 'upright' : 'asis';
}

function serializeMatchfix<T extends number = Numeric>(
  serializer: Serializer<T>,
  expr: Expression<T>,
  def: IndexedLatexDictionaryEntry<T>
): string {
  return replaceLatex(def.serialize as string, [
    serializer.serialize(getArg(expr, 1) ?? NOTHING),
  ]);
}

function serializeOperator<T extends number = Numeric>(
  serializer: Serializer<T>,
  expr: Expression<T>,
  def: IndexedLatexDictionaryEntry<T>
): string {
  let result = '';
  const count = getArgCount(expr);
  const name = getFunctionName(expr);
  if (def.kind === 'postfix') {
    if (count !== 1) {
      serializer.onError([
        {
          severity: 'warning',
          message: [
            'postfix-operator-requires-one-operand',
            serializer.serializeSymbol(name),
          ],
        },
      ]);
    }
    return replaceLatex(def.serialize as string, [
      serializer.wrap(getArg(expr, 1), def.precedence),
    ]);
  }
  if (def.kind === 'prefix') {
    if (count !== 1) {
      serializer.onError([
        {
          severity: 'warning',
          message: [
            'prefix-operator-requires-one-operand',
            serializer.serializeSymbol(name),
          ],
        },
      ]);
    }
    return replaceLatex(def.serialize as string, [
      serializer.wrap(getArg(expr, 1), def.precedence! + 1),
    ]);
  }
  if (def.kind === 'infix') {
    result = serializer.wrap(getArg(expr, 1), def.precedence);
    for (let i = 2; i < count + 1; i++) {
      const arg = getArg(expr, i);
      if (arg !== null) {
        result = replaceLatex(def.serialize as string, [
          result,
          serializer.wrap(arg, def.precedence),
        ]);
      }
    }
  }
  return result;
}

export class Serializer<T extends number = number> implements Serializer<T> {
  readonly onError: WarningSignalHandler;
  readonly options: Required<NumberFormattingOptions> &
    Required<SerializeLatexOptions>;
  readonly computeEngine?: ComputeEngine;
  readonly dictionary: IndexedLatexDictionary<T>;
  level = -1;
  constructor(
    options: Required<NumberFormattingOptions> &
      Required<SerializeLatexOptions>,
    dictionary: IndexedLatexDictionary<T>,
    computeEngine: undefined | ComputeEngine,
    onError: WarningSignalHandler
  ) {
    this.options = options;
    this.computeEngine = computeEngine;
    if (options.invisibleMultiply) {
      if (
        !/#1/.test(options.invisibleMultiply) ||
        !/#2/.test(options.invisibleMultiply)
      ) {
        onError([
          {
            severity: 'warning',
            message: ['expected-argument', 'invisibleMultiply'],
          },
        ]);
      }
    }
    this.onError = onError;
    this.dictionary = dictionary;
  }
  /**
   * Serialize the expression, and if the expression is an operator
   * of precedence less than or equal to prec, wrap it in some paren.
   * @todo: don't wrap abs
   */
  wrap(expr: Expression<T> | null, prec?: number): string {
    if (expr === null) return '';
    if (prec === undefined) {
      return '(' + this.serialize(expr) + ')';
    }
    if (
      typeof expr === 'number' ||
      isNumberObject(expr) ||
      typeof expr === 'string' ||
      isSymbolObject(expr)
    ) {
      return this.serialize(expr);
    }
    const name = getFunctionName(expr);
    if (name && name !== 'Delimiter') {
      const def = this.dictionary.name.get(name);
      if (def && def.precedence !== undefined && def.precedence < prec) {
        return this.wrapString(
          this.serialize(expr),
          this.options.applyFunctionStyle(expr, this.level)
        );
      }
    }
    return this.serialize(expr);
  }

  /** If this is a "short" expression (atomic), wrap it.
   *
   */
  wrapShort(expr: Expression<T> | null): string {
    if (expr === null) return '';
    const exprStr = this.serialize(expr);

    if (getFunctionName(expr) === 'Delimiter') return exprStr;

    if (
      typeof expr !== 'number' &&
      !isNumberObject(expr) &&
      !/(^(.|\\[a-zA-Z*]+))$/.test(exprStr)
    ) {
      // It's a long expression, wrap it
      return this.wrapString(
        exprStr,
        this.options.groupStyle(expr, this.level + 1)
      );
    }

    return exprStr;
  }

  wrapString(s: string, style: 'paren' | 'leftright' | 'big' | 'none'): string {
    if (style === 'none') return s;
    return '(' + s + ')';
  }

  serializeSymbol(
    expr: Expression<T>,
    def?: IndexedLatexDictionaryEntry<T>
  ): string {
    const head = getFunctionHead(expr);
    if (!head) {
      console.assert(typeof expr === 'string' || isSymbolObject(expr));
      // It's a symbol
      if (typeof def?.serialize === 'string') {
        return def.serialize;
      }

      const name = getSymbolName(expr);

      if (name === null) return '';

      switch (getSymbolStyle(expr, this.level)) {
        case 'upright':
          return '\\operatorname{' + name + '}';

        //            case 'asis':
        default:
          return name;
      }
    }
    //
    // It's a function
    //
    const args = getTail(expr);
    if (!def) {
      // We don't know anything about this function
      if (typeof head === 'string' && head.length > 0 && head[0] === '\\') {
        //
        // 1. Is is an unknown LaTeX command?
        //
        // This looks like a LaTeX command. Serialize
        // the arguments as LaTeX arguments
        let result: string = head;
        for (const arg of args) {
          result += '{' + this.serialize(arg) + '}';
        }
        return result;
      }

      //
      // 2. Is it an unknown function call?
      //
      // It's a function we don't know.
      // Maybe it came from `promoteUnknownToken`
      // Serialize the arguments as function arguments
      return `${this.serialize(head)}(${args
        .map((x) => this.serialize(x))
        .join(', ')})`;
      // return `\\operatorname{Apply}(${this.serialize(head)}, ${this.serialize([
      //   'List',
      //   ...args,
      // ])})`;
    }

    if (def.requiredLatexArg > 0) {
      //
      // 3. Is it a known LaTeX command?
      //
      // This looks like a LaTeX command. Serialize the arguments as LaTeX
      // arguments
      let optionalArg = '';
      let requiredArg = '';
      let i = 0;
      while (i < def.requiredLatexArg) {
        requiredArg += '{' + this.serialize(args[i++]) + '}';
      }
      while (
        i < Math.min(args.length, def.optionalLatexArg + def.requiredLatexArg)
      ) {
        const optValue = this.serialize(args[1 + i++]);
        if (optValue) {
          optionalArg += '[' + optValue + ']';
        }
      }
      return (def.serialize as string) + (optionalArg + requiredArg);
    }

    //
    // 4. Is it a known function?
    //
    if (typeof def.serialize === 'function') {
      return def.serialize(this, expr);
    }
    const style = this.options.applyFunctionStyle(expr, this.level);
    if (style === 'none') {
      return def.serialize + joinLatex(args.map((x) => this.serialize(x)));
    }
    return def.serialize + this.serialize(['Delimiter', ...args]);
  }

  serializeDictionary(dict: { [key: string]: Expression<T> }): string {
    return `\\left[\\begin{array}{lll}${Object.keys(dict)
      .map((x) => {
        return `\\textbf{${x}} & \\rightarrow & ${this.serialize(dict[x])}`;
      })
      .join('\\\\')}\\end{array}\\right]`;
  }

  serialize(expr: T | Expression<T> | null): LatexString {
    if (expr === null) return '';

    this.level += 1;
    const result = (() => {
      //
      // 1. Is it a number
      //
      const numericValue = serializeNumber(expr, this.options);
      if (numericValue) return numericValue;

      //
      // 2. Is it a string?
      //
      const stringValue = getStringValue(expr);
      if (stringValue !== null) return `\\text{${stringValue}}`;

      //
      // 3. Is it a symbol?
      //
      const symbolName = getSymbolName(expr);
      if (symbolName !== null) {
        return this.serializeSymbol(expr, this.dictionary.name.get(symbolName));
      }

      //
      // 4. Is it a dictionary?
      //
      const dict = getDictionary(expr);
      if (dict !== null) return this.serializeDictionary(dict);

      //
      // 5. Is it a named function?
      //
      const fnName = getFunctionName(expr);
      if (fnName) {
        if (fnName[0] === '\\') {
          // 5.1 An unknown LaTeX command, possibly with arguments.
          // This can happen if we encountered an unrecognized LaTeX command
          // during parsing, e.g. "\foo{x + 1}"
          const args = getTail(expr);
          if (args.length === 0) return fnName;
          return (
            fnName +
            '{' +
            args
              .map((x) => this.serialize(x))
              .filter((x) => Boolean(x))
              .join('}{') +
            '}'
          );
        }
        //
        // 5.2 A function, operator or matchfix operator
        //
        const def = this.dictionary.name.get(fnName);
        if (def) {
          let result = '';
          // If there is a custom serializer function, use it.
          if (typeof def.serialize === 'function') {
            result = def.serialize(this, expr);
          }
          if (!result && def.precedence !== undefined) {
            result = serializeOperator(this, expr, def);
          }
          if (!result && def.kind === 'matchfix') {
            result = serializeMatchfix(this, expr, def);
          }
          if (!result && def.kind === 'symbol') {
            result = this.serializeSymbol(expr, def);
          }
          return result;
        }
      }

      if (Array.isArray(expr) || isFunctionObject(expr)) {
        // It's a function, but without definition.
        // It could be a [['derive', "f"], x]
        // serializeSymbol() will take care of it.
        return this.serializeSymbol(expr);
      }
      // This doesn't look like a symbol, or a function,
      // or anything we were expecting.
      // This is an invalid expression, for example an
      // object literal with no known fields, or an invalid number:
      // `{num: 'not a number'}`
      // `{foo: 'not an expression}`

      this.onError([
        {
          severity: 'warning',
          message: ['syntax-error', JSON.stringify(expr)],
        },
      ]);
    })();
    this.level -= 1;
    return result ?? '';
  }
  applyFunctionStyle(
    expr: Expression,
    level: number
  ): 'paren' | 'leftright' | 'big' | 'none' {
    return this.options.applyFunctionStyle(expr, level);
  }

  groupStyle(
    expr: Expression,
    level: number
  ): 'paren' | 'leftright' | 'big' | 'none' {
    return this.options.groupStyle(expr, level);
  }

  rootStyle(
    expr: Expression,
    level: number
  ): 'radical' | 'quotient' | 'solidus' {
    return this.options.rootStyle(expr, level);
  }

  fractionStyle(
    expr: Expression,
    level: number
  ): 'quotient' | 'inline-solidus' | 'nice-solidus' | 'reciprocal' | 'factor' {
    return this.options.fractionStyle(expr, level);
  }

  logicStyle(
    expr: Expression,
    level: number
  ): 'word' | 'boolean' | 'uppercase-word' | 'punctuation' {
    return this.options.logicStyle(expr, level);
  }

  powerStyle(expr: Expression, level: number): 'root' | 'solidus' | 'quotient' {
    return this.options.powerStyle(expr, level);
  }

  numericSetStyle(
    expr: Expression,
    level: number
  ): 'compact' | 'regular' | 'interval' | 'set-builder' {
    return this.options.numericSetStyle(expr, level);
  }
}
