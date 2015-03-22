core.check
==========

[![Build status](https://img.shields.io/travis/folktale/core.check/master.svg?style=flat)](https://travis-ci.org/folktale/core.check)
[![NPM version](https://img.shields.io/npm/v/core.check.svg?style=flat)](https://npmjs.org/package/core.check)
[![Dependencies status](https://img.shields.io/david/folktale/core.check.svg?style=flat)](https://david-dm.org/folktale/core.check)
![Licence](https://img.shields.io/npm/l/core.check.svg?style=flat&label=licence)
![Experimental](https://img.shields.io/badge/stability-experimental-orange.svg?style=flat)


Interface checking for JS values


## Example

```js
// In Sweet.js
$contract{ Any | Array<Any> -> Array<Any> } :: function(a) {
  return Array.isArray(a)? a : [a]
}

// In JS
c.contract([c.Union(c.Any, c.Array(c.Any))], c.Array(c.Any))(function(a) {
  return Array.isArray(a)? a : [a]
}
```


## Installing

The easiest way is to grab it from NPM. If you're running in a Browser
environment, you can use [Browserify][]

    $ npm install core.check


### Using with CommonJS

If you're not using NPM, [Download the latest release][release], and require
the `core.check.umd.js` file:

```js
var Check = require('core.check')
```


### Using with AMD

[Download the latest release][release], and require the `core.check.umd.js`
file:

```js
require(['core.check'], function(Check) {
  ( ... )
})
```


### Using without modules

[Download the latest release][release], and load the `core.check.umd.js`
file. The properties are exposed in the global `Folktale.Core.Check` object:

```html
<script src="/path/to/core.check.umd.js"></script>
```


### Compiling from source

If you want to compile this library from the source, you'll need [Git][],
[Make][], [Node.js][], and run the following commands:

    $ git clone git://github.com/folktale/core.check.git
    $ cd core.check
    $ npm install
    $ make bundle
    
This will generate the `dist/core.check.umd.js` file, which you can load in
any JavaScript environment.

    
## Documentation

You can [read the documentation online][docs] or build it yourself:

    $ git clone git://github.com/folktale/core.check.git
    $ cd core.check
    $ npm install
    $ make documentation

Then open the file `docs/index.html` in your browser.


## Platform support

This library assumes an ES5 environment, but can be easily supported in ES3
platforms by the use of shims. Just include [es5-shim][] :)


## Licence

Copyright (c) 2014 Quildreen Motta.

Released under the [MIT licence](https://github.com/folktale/core.check/blob/master/LICENCE).

<!-- links -->
[Fantasy Land]: https://github.com/fantasyland/fantasy-land
[Browserify]: http://browserify.org/
[Git]: http://git-scm.com/
[Make]: http://www.gnu.org/software/make/
[Node.js]: http://nodejs.org/
[es5-shim]: https://github.com/kriskowal/es5-shim
[docs]: http://folktale.github.io/core.check
<!-- [release: https://github.com/folktale/core.check/releases/download/v$VERSION/core.check-$VERSION.tar.gz] -->
[release]: https://github.com/folktale/core.check/releases/download/v0.1.1/core.check-0.1.1.tar.gz
<!-- [/release] -->
