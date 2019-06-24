const path = require('path');
const TypeEnforcement = require('type-enforcement');
const PoweredFileSystem = require('pwd-fs');
const nebbia = require('nebbia');

const te = new TypeEnforcement({
  '#fwa()': {
    handler: Function,
    pwd: String
  },
  '.viewrc': {
    copy: Array,
    templates: Array
  }
});

const cwd = process.cwd();
const re = {
  dots: / *: */
};

module.exports = (handler, pwd) => {
  const err = te.validate('#fwa()', {
    handler,
    pwd
  });

  if (err) {
    throw err;
  }

  const pfs = new PoweredFileSystem(pwd);
  const exist = pfs.test('./.viewrc', {
    sync: true
  });

  const tmpls = {};

  if (exist) {
    const content = pfs.read('./.viewrc', {
      sync: true
    });

    const {copy = [], templates = []} = JSON.parse(content);

    const err = te.validate('.viewrc', {
      copy,
      templates
    });

    if (err) {
      throw err;
    }

    for (let i of copy) {
      if (typeof i !== 'string') {
        throw new Error(`Invalid value 'copy' in .viewrc. Expected 'string'`);
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
    return handler(tmpls, props);
  };
};
