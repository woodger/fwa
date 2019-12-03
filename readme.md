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

### How is works?

![](http://yuml.me/diagram/scruffy;dir:LR/class/[Props{bg:powderblue}]-.->[Function{bg:whitesmoke}],[Fwa{bg:yellow}]->[Nebbia{bg:yellowgreen}],[Nebbia]->[Function],[.fwarc{bg:white}]-.->[Fwa],[Fwa]->[Template{bg:whitesmoke}],[Template]->[Nebbia])

Templates, as defined in the `.fwarc` (or `.fwarc.js`) configuration file, the `fwa` sends to [nebbia](https://www.npmjs.com/package/nebbia). Nebbia returns a `function` and waits for a call with a `props`.

## Getting Started

### Installation

To use `fwa` in your project, run:

```bash
npm i fwa
```

[Node.js®](https://nodejs.org/) module, implemented by following the [ECMAScript® 2018 Language Specification
](https://www.ecma-international.org/ecma-262/9.0/index.html) standard.

### API docs

#### fwa(callback)

Implements a higher-order function interface.

- `callback` <[Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> A function that is passed with the arguments `tmpls` and `props`. Template literals (Template strings) are cached in `tmpls` object when they are required. `props` can used be any type of data.
- returns: <[Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> The renderer function which proxy the function `callback` with the argument `props` from its own parameter.

The simplest example of run a component:

```js
const fwa = require('fwa');

const render = fwa((tmpls, props) => {
  return tmpls['index.htm'](props);
});

const html = render('Hello World'); // <!DOCTYPE html><html><head...
```

> NOTE `callback` can return be any type of data

#### File-relative configuration

Module `fwa` loads `.fwarc` (or `.fwarc.js`) files by searching up the directory root starting from the filename being compiled. This can be powerful because it allows you to create independent configurations for subsections of a `component`. The presence of a configuration `.fwarc` file is optional.

- `copy` <[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)> Copies static file from this `component` to directory for static production. The source file and destination directory must be separated by the symbol `:`. Destination relative paths will be resolved relative to the current working directory as specified by [process.cwd()](https://nodejs.org/api/process.html#process_process_cwd).

- `templates` <[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)> List the file names that will be transferred to
JavaScript Template literals (Template strings). Each template is parsed using the [nebbia](https://www.npmjs.com/package/nebbia) npm module.

#### File structure of component

Local `fwa` components can be imported using a relative path (e.g. `../components`, `../pages`)

**components/form**

```
.
├── index.js
├── ui
│   ├── index.html
│   └── style.css
└── .fwarc
```

**.fwarc**

```js
{
  copy: [
    './ui/style.css : ./bind/form'
  ],
  templates: [
    'ui/index.html'
  ]
}
```

**index.js**

```js
const fwa = require('fwa');

module.exports = fwa((tmpls, props) => {
  const html = tmpls['ui/index.html'](props);

  return {
    html,
    style: './bind/form/style.css'
  };
});
```

The `fwa` component reduces the document size, allows you to collect and use only the necessary js-scripts and css-styles. Don’t repeat yourself `DRY` and keep it simple stupid `KISS` in actions.
