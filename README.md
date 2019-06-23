# Fwa

[![License](https://img.shields.io/npm/l/express.svg)](https://github.com/woodger/fwa/blob/master/LICENSE)
[![Build Status](https://travis-ci.com/woodger/fwa.svg?branch=master)](https://travis-ci.com/woodger/fwa)
[![Coverage Status](https://coveralls.io/repos/github/woodger/fwa/badge.svg?branch=master)](https://coveralls.io/github/woodger/fwa?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/woodger/fwa/badge.svg?targetFile=package.json)](https://snyk.io/test/github/woodger/fwa?targetFile=package.json)

`Fwa` is component view on JavaScript Template literals (Template strings). Make progressive server-side rendering. Server Side Rendering, also called `SSR`, is the ability of a JavaScript application to render on the server rather than in the browser.

Why would we ever want to do so?

- It allows your site to have a faster first page load time, which is the key to a good user experience.
- It is essential for `SEO`.

`Fwa` components can be reused and embedded into each other.

## Getting Started

### Installation

To use `fwa` in your project, run:

```bash
npm i fwa
```

[Node.js®](https://nodejs.org/) module, implemented by following the [ECMAScript® 2018 Language Specification
](https://www.ecma-international.org/ecma-262/9.0/index.html) standard.

### How is works?

![](http://yuml.me/diagram/scruffy;dir:LR/class/[Template{bg:snow}]->parse[Nebbia],[Nebbia{bg:yellowgreen}]->[Function{bg:yellow}],[Props{bg:turquoise}]->render[Function])

The module contains a single function. The function expects a handler function as a required parameter. Returns the function of the render as parameters can take any value and passes the handler to the function. Calling the render function calls the handler function.

The simplest example of creating a component:

```js
const fwa = require('fwa');

const render = fwa((tmpls, props) => {
  return tmpls['index.htm'](props);
});

const html = render('Hello World'); // <!DOCTYPE html><html><head...
```

#### File-relative configuration

Module `fwa` loads `.viewrc`  file by searching up the directory root starting from the filename being compiled. This can be powerful because it allows you to create independent configurations for subsections of a `component`. The presence of a configuration `.viewrc` file is optional.

- `copy` <[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)> Copies static file from this `component` to directory for static production. The source file and destination directory must be separated by the symbol `:`. Destination relative paths will be resolved relative to the current working directory as specified by [process.cwd()](https://nodejs.org/api/process.html#process_process_cwd).

- `templates` <[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)> List the file names that will be transferred to
JavaScript Template literals (Template strings).

**.viewrc**

```json
{
  "copy": [
    "./utils.js : ./bind",
    "./form/index.js : ./bind/form"
  ],
  "templates": [
    "style.css",
    "index.htm"
  ]
}
```

**index.js**

```js
const fwa = require('fwa');

module.exports = fwa((tmpls, props) => {

});
```
