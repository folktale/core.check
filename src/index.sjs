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
  Tag(String),
  Equality(*, *),
  Identity(*, *),
  Optional(Violation),
  Any(Array)
} deriving (Base, Cata)

Any::concat = function(b) {
  return match (this, b) {
    (Any(xs), Any(ys)) => Violation.Any(xs +++ ys),
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
    :      /* otherwise */      Failure(Violation.Tag(tag))
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
 * Collects failures in a semigroup.
 *
 * @summary Array[Validation[Violation, α]] → Validation[Array[Violation], α]
 */
function collect(xs) {
  return xs.map(successBiasedValidation)
           .reduce(binary(ap), successBiasedValidation(Success(curry(xs.length, λ[a]))))
           .cata({ Failure: Failure, Success: Success })
}

/**
 * Applicative functor for validations with a Success bias.
 *
 * @summary Validation[Violation, α] → RValidation[Violation, α]
 */
function successBiasedValidation(v) {
  return versione(v, {
    ap: function(that) {
      return this.isSuccess && that.isSuccess?  that.map(this.value)
      :      this.isSuccess?                    this
      :      that.isSuccess?                    that
      :      /* otherwise */                    successBiasedValidation(
                                                  Failure(this.value +++ that.value)
                                                )
    }
  })
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
 * Makes a contract optional.
 *
 * @summary (α → Validation[Violation, α]) → α → Validation[Violation, α]
 */
exports.Optional = function(checker) {
  return function(a) {
    return checker(a).failureMap(λ(a) -> Violation.Optional(a));
  }
}
 
/**
 * Accepts one of the given types.
 *
 * @summary Array[α → Validation[Violation, α]] → α → Validation[Violation, α]
 */
exports.Union = function(checkers) {
  return function(a) {
    var check = unary(flip(apply)(a));
    return collect(checkers.map(check ->> λ[#.failureMap(forceArray ->> Violation.Any)]))
  }
}
