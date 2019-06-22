/**
 * Component view on JavaScript Template literals (Template strings)
 *
 * This module for Node.js® implemented by following the ECMAScript® 2018
 * Language Specification Standard
 *
 * https://www.ecma-international.org/ecma-262/9.0/index.html
 */

const path = require('path');
const fwa = require('./src');

delete require.cache[__filename];

module.exports = (handler) => {
  const pwd = path.dirname(module.parent.filename);
  return fwa(handler, pwd);
};
