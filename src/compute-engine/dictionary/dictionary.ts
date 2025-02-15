import type { Expression } from '../../math-json/math-json-format';
import type {
  Dictionary,
  FunctionDefinition,
  SymbolDefinition,
  CompiledDictionary,
  ComputeEngine,
  CollectionDefinition,
  Definition,
  Numeric,
  SetDefinition,
  Domain,
} from '../../math-json/compute-engine-interface';
import { getDomainsDictionary } from './domains';
import { ARITHMETIC_DICTIONARY } from './arithmetic';
import { CORE_DICTIONARY } from './core';
import { LOGIC_DICTIONARY } from './logic';
import { SETS_DICTIONARY } from './sets';
import { COLLECTIONS_DICTIONARY } from './collections';
import { TRIGONOMETRY_DICTIONARY } from './trigonometry';
import {
  isSymbolDefinition,
  isFunctionDefinition,
  isSetDefinition,
  isCollectionDefinition,
} from './utils';
import { MULTIPLY, POWER, getFunctionName } from '../../common/utils';
import { inferNumericDomain } from '../domains';
import { ExpressionMap } from '../../math-json/expression-map';
import { Decimal } from 'decimal.js';
import { Complex } from 'complex.js';
import { DictionaryCategory } from '../../math-json/public';

export function getDefaultDictionaries<T extends number = number>(
  categories: DictionaryCategory[] | 'all' = 'all'
): Readonly<Dictionary<T>>[] {
  if (categories === 'all') {
    // Note that the order of the dictionaries matter:
    //  earlier dictionaries cannot reference definitions in later
    //  dictionaries.
    return getDefaultDictionaries([
      'domains',
      'core',
      'collections', // Dictionary, List, Sets
      'algebra',
      'arithmetic',
      'calculus',
      'combinatorics',
      'dimensions',
      'inequalities',
      'linear-algebra',
      'logic',
      'numeric',
      'other',
      'physics',
      'polynomials',
      'relations',
      'statistics',
      'trigonometry',
      'units',
    ]);
  }
  const result: Readonly<Dictionary<T>>[] = [];
  for (const category of categories) {
    console.assert(
      DICTIONARY[category],
      'Unknown dictionary ' + DICTIONARY[category]
    );
    if (DICTIONARY[category]) result.push(DICTIONARY[category]!);
  }
  return result;
}

// export const ADD = 'Q32043';
// export const SUBTRACT = 'Q40754';
// export const NEGATE = 'Q715358'; // -x
// export const RECIPROCAL = 'Q216906'; // 1/x
// export const MULTIPLY = 'Q40276';
// export const DIVIDE = 'Q40276';
// export const POWER = 'Q33456';

// export const STRING = 'Q184754';
// export const TEXT = '';

// export const COMPLEX = 'Q11567'; // ℂ Set of complex numbers Q26851286
// export const REAL = 'Q12916'; // ℝ Set of real numbers: Q26851380
// export const RATIONAL = 'Q1244890'; // ℚ
// export const NATURAL_NUMBER = 'Q21199'; // ℕ0 (includes 0) or ℕ* (wihtout 0) Set of Q28777634
// // set of positive integers (incl 0): Q47339953
// // set of natural numbers (w/o 0): Q47007719
// export const INTEGER = 'Q12503'; // ℤ
// export const PRIME = 'Q47370614'; // set of prime numbers

// export const MATRIX = 'Q44337';
// export const FUNCTION = 'Q11348';

// export const LIST = 'Q12139612';

// Unary functions:
// https://query.wikidata.org/#PREFIX%20wd%3A%20%3Chttp%3A%2F%2Fwww.wikidata.org%2Fentity%2F%3E%0APREFIX%20wdt%3A%20%3Chttp%3A%2F%2Fwww.wikidata.org%2Fprop%2Fdirect%2F%3E%0A%0ASELECT%20DISTINCT%20%3Fitem%0AWHERE%20%7B%0A%20%20%20%20%3Fitem%20wdt%3AP31%2a%20wd%3AQ657596%0A%7D%0A
// https://query.wikidata.org/#PREFIX%20wd%3A%20%3Chttp%3A%2F%2Fwww.wikidata.org%2Fentity%2F%3E%0APREFIX%20wdt%3A%20%3Chttp%3A%2F%2Fwww.wikidata.org%2Fprop%2Fdirect%2F%3E%0A%0ASELECT%20DISTINCT%20%3Fitem%0AWHERE%20%7B%0A%20%20%20%20%3Fitem%20wdt%3AP279%2a%20wd%3AQ657596%0A%7D%0A

// Binary functions:
// https://query.wikidata.org/#PREFIX%20wd%3A%20%3Chttp%3A%2F%2Fwww.wikidata.org%2Fentity%2F%3E%0APREFIX%20wdt%3A%20%3Chttp%3A%2F%2Fwww.wikidata.org%2Fprop%2Fdirect%2F%3E%0A%0ASELECT%20DISTINCT%20%3Fitem%0AWHERE%20%7B%0A%20%20%20%20%3Fitem%20wdt%3AP31%2a%20wd%3AQ164307%0A%7D%0A

// Bindings to:
// - stdlib: https://github.com/stdlib-js/stdlib
// - mathjs
// - others...?

export const DICTIONARY: {
  [category in DictionaryCategory]?: Dictionary<Numeric>;
} = {
  'arithmetic': ARITHMETIC_DICTIONARY,
  'algebra': {
    // polynomial([0, 2, 0, 4]:list, x:symbol) -> 2x + 4x^3
    // polynomial(2x + 4x^3, x) -> {0, 2, 0, 4}
    // rational(2x + 4x^3, {3, 1}, x) -> (2x + 4x^3)/(3+x)
    // https://reference.wolfram.com/language/tutorial/AlgebraicCalculations.html
    // simplify-trig (macsyma)
    //  - trigReduce, trigExpand, trigFactor, trigToExp (mathematica)
    // Mathematica:
    // - distribute -> (a+b)(c+d) -> ac+ ad+ bc+ bd (doesn't have to be multiply,
    // f(a+b, c+d) -> f(a, c) + f(a, d) + f(b, c) + f(b, d)
    // -- distribute(expr, over=add, with=multiply)
    // https://reference.wolfram.com/language/ref/Distribute.html
    // - expand, expand-all
    // - factor
    // - simplify
  },

  'calculus': {
    // D
    // Derivative (mathematica)
    // diff (macsyma)
    // nth-diff
    // int
    // - integrate(expression, symbol)  -- indefinite integral
    // - integrate(expression, range) <range> = {symbol, min, max} -- definite integral
    // - integrate(expression, range1, range2) -- multiple integral
    // def-int
  },
  'combinatorics': {}, // fibonacci, binomial, etc...
  'core': CORE_DICTIONARY,
  'collections': { ...SETS_DICTIONARY, ...COLLECTIONS_DICTIONARY },
  'domains': getDomainsDictionary(),
  'dimensions': {
    // volume, speed, area
  },
  'logic': LOGIC_DICTIONARY,
  'inequalities': {},
  'linear-algebra': {
    // matrix
    // transpose
    // cross-product
    // outer-product
    // determinant
    // vector
    // matrix
    // rank
    // scalar-matrix
    // constant-matrix
    // identitity-matrix
  },
  'numeric': {
    // Gamma function
    // Zeta function
    // erf function
    // numerator(fraction)
    // denominator(fraction)
    // exactFloatToRational
    // N -> eval as a number
    // random
    // hash
  },
  'other': {},
  'polynomials': {
    // degree
    // expand
    // factors
    // roots
  },
  'physics': {
    'Mu-0': {
      constant: true,
      wikidata: 'Q1515261',
      domain: 'RealNumber',
      value: 1.25663706212e-6,
      unit: [MULTIPLY, 'H', [POWER, 'm', -1]],
    },
  },
  'relations': {
    // eq, lt, leq, gt, geq, neq, approx
    //     shortLogicalImplies: 52, // ➔
    // shortImplies => 51
    // implies ==> 49
    //    impliedBy: 45, // <==
    // := assign 80
    // less-than-or-equal-to: Q55935272 241
    // greater-than-or-equal: Q55935291 242
    // greater-than: Q47035128  243
    // less-than: Q52834024 245
  },
  'statistics': {
    // average
    // mean
    // variance = size(l) * stddev(l)^2 / (size(l) - 1)
    // stddev
    // median
    // quantile
  },
  'trigonometry': TRIGONOMETRY_DICTIONARY,
  'units': {},
};

/**
 * Return a compiled and validated version of the dictionary.
 *
 * Specifically:
 * - Expressions (for values, evaluate, domain, isElementOf, etc..) are compiled
 * when possible, put in canonical form otherwise
 * - The domain of entries is inferred and validated:
 *  - check that domains are in canonical form
 *  - check that domains are consistent with declarations (for example that
 * the signature of predicate have a `MaybeBoolean` range)
 *
 */
export function compileDictionary<T extends number = Numeric>(
  engine: ComputeEngine<T>,
  dict: Dictionary<T> | undefined
): CompiledDictionary<T> | undefined {
  if (dict === undefined) return undefined;
  const result: CompiledDictionary<T> = new Map<string, Definition<T>>();
  for (const entryName of Object.keys(dict)) {
    const [def, error] = normalizeDefinition(dict[entryName], engine);
    if (error) {
      engine.signal({
        severity: def ? 'warning' : 'error',
        message: ['invalid-dictionary-entry', error, entryName],
      });
    }
    if (def) result.set(entryName, def);
  }

  // Temporarily put this dictionary in scope.
  //
  // This is required so that compilation and validation can succeed
  // when symbols in this dictionary refer to *other* symbols from this
  // dictionary
  engine.context = {
    parentScope: engine.context,
    dictionary: result,
    assumptions: new ExpressionMap(),
  };

  // @todo: compile

  validateDictionary(engine, result);

  // Restore the original scope
  engine.context = engine.context.parentScope;

  return result;
}

function normalizeDefinition(
  def: number | Definition<Numeric>,
  engine: ComputeEngine
): [def: null | Definition<Numeric>, error?: string] {
  //
  // 1/ Is is a number?
  //
  if (typeof def === 'number') {
    // If the dictionary entry is provided as a number, assume it's a
    // variable, and infer its domain based on its value.
    return [
      {
        domain: inferNumericDomain(def) ?? 'Number',
        constant: false,
        value: def,
      },
    ];
  }

  //
  // 2/ Is it a string?
  //
  // It's a LaTeX string defining the value of the variable
  if (typeof def === 'string') {
    const value = engine.parse(def);
    if (value === null) {
      return [def, 'string could not be parsed'];
    }
    return [
      {
        domain: engine.domain(value),
        constant: false,
        value,
      },
    ];
  }

  let domain =
    typeof def.domain !== 'function'
      ? engine.simplify(def.domain ?? null)
      : def.domain;

  //
  // 3. Is it a Symbol definition
  //
  if (isSymbolDefinition(def)) {
    let warning: string | undefined;
    if (def.domain && !domain) {
      warning = `unknown domain "${def.domain}"`;
      domain = engine.simplify(def.domain);
      domain = def.domain;
    } else if (!domain) {
      warning = 'expected a domain';
      domain = 'Anything';
    }
    def = {
      domain,
      constant: false,
      ...(def as Partial<SymbolDefinition>),
    };

    if (def.value) def.value = engine.canonical(def.value);

    if (!def.value) def.hold = true;

    return [def, warning];
  }

  //
  // 4. Is it a Collection definition
  //
  if (
    isCollectionDefinition(def) ||
    (typeof domain !== 'function' && engine.isSubsetOf(domain, 'Collection'))
  ) {
    const collectionDef = def as CollectionDefinition;
    return [
      {
        domain,
        iterable: collectionDef.iterator !== undefined,
        indexable: collectionDef.at !== undefined,
        countable: collectionDef.size !== undefined,
        ...(def as Partial<CollectionDefinition>),
      },
      undefined,
    ];
  }

  //
  // 5. Is it a Function definition
  //
  if (
    isFunctionDefinition(def) ||
    (typeof domain !== 'function' && engine.isSubsetOf(domain, 'Function'))
  ) {
    const functionDef: FunctionDefinition = {
      wikidata: '',

      scope: null,
      threadable: false,
      associative: false,
      commutative: false,
      additive: false,
      multiplicative: false,
      outtative: false,
      idempotent: false,
      involution: false,
      numeric: false,
      pure: true,

      hold: 'none',
      sequenceHold: false,

      ...(def as FunctionDefinition),

      domain,
    } as FunctionDefinition;

    if (functionDef.value) {
      let value = functionDef.value;
      if (
        typeof value !== 'number' &&
        !(value instanceof Decimal) &&
        !(value instanceof Complex)
      ) {
        value = engine.canonical(value);
      }
      functionDef.value = value;
    }
    if (def.evalDomain === undefined && def.numeric !== true)
      return [
        functionDef,
        'a "Function" should either have a "numeric" property set or an "evalDomain" method',
      ];

    return [functionDef, undefined];
  }

  if (
    isSetDefinition(def) ||
    (typeof domain !== 'function' && engine.isSubsetOf(domain, 'Function'))
  ) {
    const setDefinition = def as SetDefinition;
    // @todo: could check the validity of setDefinition.supersets
    if (setDefinition.value) {
      setDefinition.value = engine.simplify(setDefinition.value);
    }
    return [setDefinition];
  }

  if (def) {
    const symDef = def as SymbolDefinition;
    // This might be a partial definition (missing `constant` for a symbol)
    if (
      domain &&
      typeof domain !== 'function' &&
      engine.isSubsetOf(domain, 'Number')
    ) {
      if (typeof symDef.value === 'undefined') {
        return [null, 'expected "value" property in definition'];
      }
      // That's a numeric variable definition
      const inferredDomain =
        inferNumericDomain(
          typeof symDef.value === 'function'
            ? symDef.value(engine)
            : symDef.value
        ) ?? 'Anything';
      return [
        {
          domain: inferredDomain,
          constant: false,
          ...(def as Partial<SymbolDefinition>),
        },
        inferredDomain !== domain ? 'inferred domain "${inferredDomain}"' : '',
      ];
    }
    // This might be a partial definition (missing `signatures` for a Function)
    if (
      domain &&
      typeof domain !== 'function' &&
      engine.isSubsetOf(domain, 'Function')
    ) {
      return [
        {
          outputDomain: 'Anything',
          ...(def as Partial<FunctionDefinition>),
        } as FunctionDefinition,
        'a "Function" should have a "range" property in its definition',
      ];
    }
    // This might be a partial definition (missing `supersets` for a Set)
    if (
      domain &&
      typeof domain !== 'function' &&
      engine.isSubsetOf(domain, 'Set')
    ) {
      return [
        def,
        'a "Set" should have a "supersets" property in its definition',
      ];
    }
  }
  return [def, 'could not be validated'];
}

/**
 * Validate the contents of the dictionary.
 *
 * Unlike `normalizeDefinition` which only considers the properties of the
 * definition entry, `validateDictionary` will consider the entries
 * in relation to each other, for example validating that the referenced
 * domains are valid.
 */
function validateDictionary<T extends number = number>(
  engine: ComputeEngine<T>,
  dictionary: CompiledDictionary<T>
): void {
  const wikidata = new Set<string>();
  for (const [name, def] of dictionary) {
    if (!/[A-Za-z][A-Za-z0-9-]*/.test(name) && name.length !== 1) {
      engine.signal({ severity: 'error', message: 'invalid-name', head: name });
    }
    if (def.wikidata) {
      if (wikidata.has(def.wikidata)) {
        engine.signal({
          severity: 'warning',
          message: ['duplicate-wikidata', def.wikidata],
          head: name,
        });
      }
      wikidata.add(def.wikidata);
    }
    if (isSymbolDefinition(def)) {
      // Validate domain (make sure domain exists)
      if (
        typeof def.domain !== 'function' &&
        !engine.isSubsetOf(def.domain, 'Anything')
      ) {
        engine.signal({
          severity: 'warning',
          message: ['unknown-domain', def.domain as string], //@todo might not be a string
          head: name,
        });
      }

      if (def.hold === false && !def.value) {
        engine.signal({
          severity: 'warning',
          message: [
            'invalid-dictionary-entry',
            'symbol has hold = false, but no value',
          ],
          head: name,
        });
      }

      // @todo: for numeric domain, validate them: i.e. real are at least RealNumber, etc...
      // using inferDomain
    }
    if (isCollectionDefinition(def)) {
      // @todo
    }
    if (isFunctionDefinition(def)) {
      // Validate range
      const evalDomain = def.evalDomain;
      if (
        typeof evalDomain !== 'function' &&
        !engine.isSubsetOf(evalDomain, 'Anything')
      ) {
        engine.signal({
          severity: 'warning',
          message: ['unknown-domain', evalDomain as string], //@todo might not be a string
          head: name,
        });
      }

      // Additional checks:

      // a/ if it's numeric, it can't have a 'hold' argument
      if (def.numeric && def.hold !== 'none') {
        engine.signal({
          severity: 'warning',
          message: [
            'invalid-dictionary-entry',
            'Unexpected `hold` attribute on a `numeric` function',
            name,
          ],
        });
      }

      if (def.idempotent && def.involution) {
        engine.signal({
          severity: 'warning',
          message: [
            'invalid-dictionary-entry',
            'an `idempotent` function cannot be an `involution`',
            name,
          ],
        });
      }
    }
    if (isSetDefinition(def)) {
      // Check there is at least one superset defined
      if (def.supersets.length === 0 && name !== 'Anything') {
        engine.signal({
          severity: 'warning',
          message: ['expected-supersets', name],
        });
      }
      // Check that all the parents are valid
      for (const parent of def.supersets) {
        if (!engine.isSubsetOf(parent, 'Anything')) {
          engine.signal({
            severity: 'warning',
            message: ['expected-supersets', parent, name],
          });
        }
        // Check for loops in set definition
        if (engine.isSubsetOf(parent, name as Domain)) {
          engine.signal({
            severity: 'warning',
            message: [
              'cyclic-definition',
              setParentsToString(engine, name),
              name,
            ],
          });

          // Remove entry from dictionary
          dictionary.delete(name);
        }
      }
      // @todo: could check that the domain of `isElementOf` and `isSubsetOf` is
      // MaybeBoolean
    }
  }
}

/**
 * For debugging purposes,  a textual representation of the inheritance
 * chain of sets.
 */
function setParentsToString(
  engine: ComputeEngine,
  expr: Expression,
  cycle?: string[]
): string {
  const result: string[] = [`${expr}`];

  const name = typeof expr === 'string' ? expr : getFunctionName(expr);
  if (cycle) {
    if (cycle.includes(name)) return `${name} ↩︎ `;
    cycle.push(name);
  } else {
    cycle = [name];
  }
  const def = engine.getDefinition(name);
  if (!def || !isSetDefinition(def)) return `${name}?!`;
  if (!def.supersets.length || def.supersets.length === 0) return '';

  for (const parent of def?.supersets) {
    if (typeof parent === 'string') {
      result.push(setParentsToString(engine, parent, [...cycle]));
    } else {
    }
  }
  if (result.length <= 1) {
    return result[0] ?? '';
  }
  return '[' + result.join(' ➔ ') + ']';
}
