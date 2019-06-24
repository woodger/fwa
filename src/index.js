const path = require('path');
const TypeEnforcement = require('type-enforcement');
const PoweredFileSystem = require('pwd-fs');
const nebbia = require('nebbia');

const te = new TypeEnforcement({
  '#fwa()': {
    callback: Function,
    pwd: String
  },
  '.fwarc': {
    copy: Array,
    templates: Array
  }
});

const cwd = process.cwd();
const re = {
  dots: / *: */
};

module.exports = (callback, pwd) => {
  const err = te.validate('#fwa()', {
    callback,
    pwd
  });

  if (err) {
    throw err;
  }

  const pfs = new PoweredFileSystem(pwd);
  const configFiles = [
    './.fwarc',
    './.fwarc.js'
  ];

  const config = configFiles.find(loc => {
    return pfs.test(loc, {
      sync: true
    });
  });

  const tmpls = {};

  if (config !== undefined) {
    const content = pfs.read(config, {
      sync: true
    });

    const {copy = [], templates = []} = JSON.parse(content);

    const err = te.validate('.fwarc', {
      copy,
      templates
    });

    if (err) {
      throw err;
    }

    for (let i of copy) {
      if (typeof i !== 'string') {
        throw new Error(`Invalid value 'copy' in .fwarc. Expected 'string'`);
      }

      const [src, dir] = i.split(re.dots);
      const dist = path.resolve(cwd, dir);

      pfs.mkdir(dist, {
        sync: true
      });

      pfs.copy(src, dist, {
        sync: true
      });
    }

    for (let loc of templates) {
      const content = pfs.read(loc, {
        sync: true
      });

      const template = nebbia(content.replace(/`/g, '\\`'));

      tmpls[loc] = new Function('_', 'return ' + template);
    }
  }

  return (props) => {
    return callback(tmpls, props);
  };
};
