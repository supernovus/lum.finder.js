/**
 * Functions for filtering basic model data.
 * @module @lumjs/finder
 */
'use strict';

/**
 * Create a filter function that tests specific properties.
 *
 * The function returned by this is designed to work with an Array
 * (or a model class instance with a filter() function), and it is
 * assumed that every item in the data model will be a JS object.
 *
 * How non-object items are handled depends on the options.
 *
 * @param {object} queryFields - The individual property tests.
 *
 * Each key is a property key you want to test in each data item,
 * and each associated value will determine how the test is performed.
 *
 * If a query field value is a function, it will be assumed to be a 
 * {@link FieldQueryTest} and will be called to determine if the field
 * is valid or not.
 *
 * If the value is anything other than a function, then the test will only
 * return true if the item property value matches the query field value.
 *
 * @param {object} [options] Options.
 *
 * If being called from filterData() this will include the options passed
 * to that function. Any options not specific to makeFieldQuery() will
 * simply be ignored.
 *
 * @param {FieldQueryTest} [options.notObject] An optional test to handle
 * any data items that are not objects.
 *
 * If this is not specified, then the filter function will always return
 * false for any data item that is not an object.
 *
 * @param {boolean} [options.strict=true] Use strict comparison?
 *
 * This will determine if individual non-function property value tests
 * will use strict comparison (`===`) or loose comparison (`==`).
 *
 * It defaults to `true` and shouldn't be changed unless you have a
 * specific reason to prefer loose comparison.
 *
 * @returns {function}
 */
function makeFieldQuery(queryFields, options) {
  // Make a copy of the options, with some defaults set.
  options = Object.assign({strict: true}, options);

  let notObj = (typeof options.notObject === 'function')
    ? options.notObject
    : () => false;

  return function(item, index, data) {
    let ctx = {item, index, data, queryFields, options, key: null};

    if (typeof item !== 'object' || item === null) {
      // Non-object members are handled separately.  
      return notObj.call(ctx, item, ctx);
    }

    for (let key in queryFields) {
      let want = queryFields[key];

      if (typeof want === 'function') {
        ctx.key = key;
        if (!want.call(ctx, item[key], ctx)) {
          return false;
        }
      }
      else if (options.strict) {
        if (item[key] !== want) {
          return false;
        }
      }
      else {
        if (item[key] != want) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * Filter model data using a query.
 *
 * @param {(Array|object)} data - The model data we are filtering.
 *
 * This must be either a regular Array, or an `object` that implements a
 * filter() method compatible with the Array.prototype.filter() method.
 *
 * @param {(function|object)} query
 *
 * - If this is a function it will be passed to data.filter() directly.
 * - If this is an object, it will be passed to makeFieldQuery() to get the filter
 *   function that will be used. See makeFieldQuery() for more details.
 *
 * @param {object} [options] Options
 * @param {boolean} [options.single=false] Only return the first matching item?
 *
 * - If this is false, the `matched` value will be an Array of matching values.
 * - If this is true, the `matched` value will be `matched[0]`, which will be
 *   undefined if there were no matches found.
 *
 * @param {ValidateMatched} [options.validate] Validation callback.
 * @param {DoneCallback} [options.done] An Express-style callback function.
 * @returns {mixed} Depends on the options.
 *
 * - If `options.done` is specified, the return value will be whatever that
 *    function returns when called.
 * - If `options.single` is true, the return value will be the first
 *    matching item (or undefined if no items matched).
 * - In any other case the return value will be an array of matching items.
 *
 */
function filterData(data, query, options={}) {
  let err = null, found = null, ctx = {data, query, options};

  if (typeof query === 'object' && query) {
    query = makeFieldQuery(query, options);
  }
  
  if (typeof query === 'function') {
    found = users.filter(query);
    if (options.single) found = found[0];
  } else {
    err = new TypeError('invalid findUsers() query');
  }

  if (!err && typeof options.validate === 'function') {
    err = options.validate.call(ctx, found, ctx);
  }

  return ((typeof options.done === 'function') 
    ? options.done.call(ctx, err, found) 
    : (err ?? found));
}

module.exports = {makeFieldQuery, filterData}

/**
 * Context information from a field query function call.
 *
 * @typedef {object} FieldQueryContext
 *
 * @prop {mixed} item - The data item being tested.
 *
 * - In individual property tests this will always be a non-null object.
 * - In the `options.notObject()` test this can be any value,
 *   including null and undefined.
 *
 * @prop {(number|string)} index - The index of the item in the model data.
 * 
 * @prop {(Array|object)} data - The model data object the item is from.
 *
 * @prop {object} queryFields - The first argument passed to makeFieldQuery()
 * when generating the field query function.
 *
 * @prop {object} options - A copy of the options passed to makeFieldQuery(),
 * that merges in some default values if they weren't explicitly specified.
 *
 * @prop {?string} key - The property key being tested.
 *
 * This will be null in the `options.notObject()` test, and the name of the 
 * property being tested for individual property tests.
 *
 */

/**
 * Test an individual property value.
 *
 * @callback FieldQueryTest
 *
 * @param {mixed} value - The value being tested.
 *
 * This will be the data item for `options.notObject()` tests,
 * and the property value for individual property tests.
 *
 * @param {FieldQueryContext} ctx - Context info.
 *
 * Will also be available as `this` if the callback is a regular function,
 * and not a Closure or bound-function.
 *
 * @this {FieldQueryContext}
 * @returns {boolean}
 */

/**
 * Context information from a filterData() call.
 *
 * All of the properties in this are the original arguments passed to the
 * filterData() function. See it's docs for details.
 *
 * @typedef {object} FilterDataContext
 *
 * @prop {(Array|object)} data
 * @prop {(object|function)} query
 * @prop {object} options
 *
 */

/**
 * Validate the matched item(s) from a filterData query.
 *
 * @callback ValidateMatched
 * @param {mixed} matched - See filterData() for details on possible values.
 * @param {FilterDataContext} ctx - Context info.
 *
 * Will also be available as `this` if the callback is a regular function,
 * and not a Closure or bound-function.
 *
 * @this {FilterDataContext}
 * @returns {?Error} If the matched value was an empty array, undefined value,
 * or some other value that was not valid, return an Error, otherwise return
 * null to indicate there was no errors.
 */

/**
 * A simple callback function as used by Express/Connect apps
 * to indicate a route or middleware has finished and has either
 * and error or a value to be processed further.
 *
 * While most done() callbacks are likely to be Closures and thus
 * won't have their own `this` property, if you do use a regular
 * function, there will be context information available via `this`.
 * 
 * @callback DoneCallback
 * @param {?Error} error - An Error if applicable, null otherwise.
 * @param {mixed} matched - The matched item(s).
 * @this {FilterDataContext}
 * @returns {mixed}
 */
