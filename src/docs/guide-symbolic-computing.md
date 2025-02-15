---
title: Symbolic Computing
permalink: /compute-engine/guides/symbolic-computing/
layout: single
date: Last Modified
sidebar:
  - nav: 'compute-engine'
---

# Symbolic Computing

The CortexJS Compute Engine essentially applies transformations to a MathJSON
expression by applying rewriting rules.

There are several kind of transformations, depending on the desired
result:

<div class=symbols-table>

| Transformation |  |
| :--- | :--- |
| **Format** | Put an expression in canonical ("standard") form, for easier sorting, comparing and computing. Typically limited to accounting for the flags `associative` `idempotent` `involution` and for sorting the arguments if `commutative`. Independent of the assumptions. | 
| **Simplify** | Apply rewriting rules specific to each function, eliminating constants and common sub-expressions. Use available assumptions to determine which rules are applicable. Limit calculations to exact results using integers. The result is in canonical format. | 
| **Evaluate** | Calculate the value of an expression and all its terms. Replace symbols with their value. Can perform approximate calculations using floating point numbers. The result is simplified and canonical. | 

</div>


Example, given `f` is \\( 2 + (\sqrt{x^2 \times 4} + 1) \\) and `x` is 3:

<div class=symbols-table>

|  |  | |
| :--- | :--- | :--- |
| `ce.format(f)` | `1 + 2 + \sqrt{4x^2}` | Arguments sorted, distributed |
| `ce.simplify(f)`| `2 + 2x` | Exact calculations of numeric constants,  simplification |
| `ce.evaluate(f)` | `8` | Evaluation of symbols |

</div>


Other operations can be performed on an expression: comparing it to a pattern, replacing part of it, and applying conditional rewrite rules.


Functions such as `ce.simplify()`, `ce.evaluate()`, `ce.is()`, `ce.N()`, 
`ce.canonical()`, etc... require a `ComputeEngine` instance which is denoted by
the `ce.` prefix.{.notice--info}

```ts
import { ComputeEngine, parse } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();
ce.simplify(ce.parse('3x^2 + 2x^2 + x + 5'));
```

## Format with a Canonical Form

The canonical form of an expression is obtained by rewriting an expression
without making assumptions about any variables in the expression.

For example:

- terms can be sorted in a specific order
- some operations may be substituted with others, for example
  substraction replaced by addition. \\(1 + 2 - 3 \longrightarrow Add(1, 2,
  -3)\\)

Canonical forms are somewhat arbitrary, and not necessarily "the simplest" way
to represent an expression. But just like the order of the letters of the
alphabet is arbitrary, the canonical forms are nonetheless convenient to sort,
search and compare expressions.

For example \\( 1 + x\\) and \\(x + 1\\) are two expressions with the same canonical form.


**To obtain the canonical form of an expression**, use the `ce.canonical()` function.

```js
console.log(ce.canonical(["Add", 2, "x", 3]);
// ➔ ["Add", 2, 3, "x"]
```


{% readmore "/compute-engine/guides/forms/" %}
Read more about <strong>Canonical Forms</strong>
{% endreadmore %}


## Simplify

**To obtain a simpler expression of a symbolic expression**, use the
`ce.simplify()` function.

The `ce.simplify()` function makes use of available assumptions about symbols
and return an exact result: there are no numerical evaluation done that could
result in a loss of precision.


{% readmore "/compute-engine/guides/simplify/" %}
Read more about <strong>Simplify</strong>
{% endreadmore %}


## Evaluate

**To apply a sequence of definitions to an expression in order to reduce,
simplify and calculate its value**, use the `ce.evaluate()` function.

An expression to be evaluated will also be simplified, evaluated numerically and put into canonical form.

When a function is evaluated, its arguments are first evaluated left to right,
the the function is applied to the arguments.

However, a function definition can specify that some or all of its arguments
should not be evaluated. This can be useful for a function that needs to 
perform symbolic manipulation of an expression: otherwise, the expression would
be evaluated without giving a chance to the function to access the symbolic 
expression.

While a function definition will usually indicate which arguments should be
evaluated or not, it is possible to override this.

**To prevent an argument from being evaluated**, use the `Hold` function.

**To force an argument to be evaluated**, use the `Evaluate` function.


## Other Symbolic Manipulation

You can compare two expressions, check if an expression match a pattern, 
apply a substitution to some elements in an expression or apply a conditional rewriting rule to an expression.


{% readmore "/compute-engine/guides/patterns-and-rules/" %}
Read more about <strong>Patterns and Rules</strong> for these operations
{% endreadmore %}
