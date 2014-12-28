// Copyright (c) 2014 Quildreen Motta
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation files
// (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge,
// publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/**
 * Interface checking for JS values
 *
 * @module lib/index
 */

// -- Dependencies -----------------------------------------------------
var { Success, Failure } = require('data.validation');
var { apply, flip, curry } = require('core.lambda');
var { unary, binary } = require('core.arity');
var { Base, Cata } = require('adt-simple');
var { map, ap } = require('control.monads');
var versione = require('versione');
var deepEqual = require('deep-equal');


// -- ADTs -------------------------------------------------------------
union Violation {
  Tag(String, *),
  Equality(*, *),
  Identity(*, *),
  Any(Array),
  All(Array)
} deriving (Base, Cata)

Any::concat = function(b) {
  return match (this, b) {
    (Any(xs), Any(ys)) => Violation.Any(xs +++ ys)
  }
}

All::concat = function(b) {
  return match (this, b) {
    (All(xs), All(ys)) => Violation.All(xs +++ ys)
  }
}

exports.Violation = Violation


// -- Helpers ----------------------------------------------------------

/**
 * Gets the [[Class]] of a value.
 *
 * @summary α → String
 */
var classOf = function(a) {
  return a === null?       'Null'
  :      a === undefined?  'Undefined'
  :      /* otherwise */   Object.prototype.toString.call(a).slice(8, -1)
}

/**
 * Constructs a checker that validates a single Tag.
 *
 * @summary String → α → Validation[Violation, α]
 */
function makeTagChecker(tag) {
  return function(a) {
    return classOf(a) === tag?  Success(a)
    :      /* otherwise */      Failure(Violation.Tag(tag, a))
  }
}

/**
 * Forces something to be an array.
 *
 * @summary α | Array[α] → Array[a]
 */
function forceArray(a) {
  return Array.isArray(a)? a : [a]
}

/**
 * Converts things to a list.
 *
 * @summary ArrayLike[α] → Array[α]
 */
function toList(a) {
  return Array::slice.call(a)
}

/**
 * Collects failures in a semigroup.
 *
 * @summary α, Array[Validation[Violation, α]] → Validation[Array[Violation], α]
 */
function collect(a, xs) {
  return xs.reduce(binary(ap), Success(curry(xs.length, λ[toList(arguments)])))
           .map(λ[a])
}

/**
 * Returns a list of pairs of key/value for an object.
 *
 * @summary { String → * } → [{ key: String, value: * }]
 */
function pairs(x) {
  return Object.keys(x).map(λ(k) -> ({ key: k, value: x[k] }))
}

// -- Primitive tag checkers -------------------------------------------

exports.Null      = makeTagChecker('Null');
exports.Undefined = makeTagChecker('Undefined');
exports.Boolean   = makeTagChecker('Boolean');
exports.Number    = makeTagChecker('Number');
exports.String    = makeTagChecker('String');
exports.Function  = makeTagChecker('Function');
exports.Array     = makeTagChecker('Array');
exports.Object    = makeTagChecker('Object');
exports.Any       = Success;

exports.Value = function(a) {
  return function(b) {
    return deepEqual(a, b)?  Success(b)
    :      /* otherwise */   Failure(Violation.Equality(a, b))
  }
}

exports.Identity = function(a) {
  return function(b) {
    return a === b?         Success(b)
    :      /* otherwise */  Failure(Violation.Identity(a, b))
  }
}

// -- Higher-order checkers --------------------------------------------
 
/**
 * Accepts one of the given types.
 *
 * @summary Array[α → Validation[Violation, α]] → α → Validation[Violation, α]
 */
exports.Or = function(checkers) {
  return function(a) {
    var check = unary(flip(apply)(a));
    var vals = checkers.map(check ->> λ[#.failureMap(forceArray ->> Violation.Any)]);
    var hasSuccess = vals.filter(λ[#.isSuccess]).length !== 0;

    return hasSuccess?      Success(a)
    :      /* otherwise */  collect(a, vals)
  }
}

/**
 * Succeeds if all values succeed.
 *
 * @summary Array[α → Validation[Violation, α]] → α → Validation[Violation, α]
 */
exports.And = function(checkers) {
  return function(a) {
    var check = unary(flip(apply)(a));
    return collect(a, checkers.map(check ->> λ[#.failureMap(forceArray ->> Violation.All)]))
  }
}

/**
 * Accepts a sequence of things.
 *
 * @summary
 * : Array[α₁ → Validation[Violation, α₁], α₂ → Validation[Violation, α₂], ..., αₙ → Validation[Violation, αₙ]]
 * → Array[α₁, α₂, ..., αₙ]
 * → Validation[Violation, Array[α₁, α₂, ..., αₙ]]
 */
exports.Seq = function(checkers) {
  return function(xs) {
    var vals = checkers.map(λ(f, i) -> f(xs[i]));
    return collect(xs, vals.map(λ[#.failureMap(forceArray ->> Violation.All)]))
  }
}

/**
 * Accepts an array of things.
 *
 * @summary (α → Validation[Violation, α]) → α → Validation[Violation, α]
 */
exports.ArrayOf = function(checker) {
  return function(xs) {
    var vals = xs.map(λ[checker(#)]);
    return collect(xs, vals.map(λ[#.failureMap(forceArray ->> Violation.All)]))
  }
}

/**
 * Accepts an interface of things.
 *
 * @summary { String → Validation[Violation, *] } → { String → * } → Validation[Violation, { String → * }]
 */
exports.ObjectOf = function(iface) {
  return function(x) {
    var vals = pairs(iface).map(λ(p) -> p.value(x[p.key]));
    return collect(x, vals.map(λ[#.failureMap(forceArray ->> Violation.All)]))
  }
}
