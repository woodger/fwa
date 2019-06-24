const assert = require('assert');
const PoweredFileSystem = require('pwd-fs');
const proxyquire = require('proxyquire');
const mockFs = require('mock-fs');

describe('#fwa()', () => {
  const fwa = proxyquire('..', {
    path: {
      dirname() {
        return process.cwd();
      }
    }
  });

  describe('Interface', () => {
    it('The module must return a function', () => {
      assert(typeof fwa === 'function');
    });

    it('Throw an exception if the first argument is not Function', () => {
      try {
        fwa(null);
      }
      catch (e) {
        assert(
          e.message ===
          `Invalid value 'callback' in order '#fwa()'. Expected Function`
        );
      }
    });

    it('The cache should not be applied to the module', () => {
      const path = require.resolve('..');
      const cache = require.cache[path];

      assert(cache === undefined);
    });
  });

  describe('Run time', () => {
    const pfs = new PoweredFileSystem();

    beforeEach(() => {
      mockFs({
        '.fwarc': `
        {
          "copy": [
            "utils.js : bind/scripts"
          ],
          "templates": [
            "loader.js"
          ]
        }
        `,
        'utils.js': '',
        'loader.js': '<i>${_.content}</i>',
        bind: mockFs.directory()
      });
    });

    afterEach(() => {
      mockFs.restore();
    });

    it(`Must 'copy' the files as defined in the file '.fwarc'`, async () => {
      const render = fwa((calls, props) => {});

      assert(
        await pfs.test('./bind/scripts/utils.js')
      );
    });

    it(`If there is no file '.fwarc', the initialization must pass`, async () => {
      await pfs.remove('./.fwarc');
      const render = fwa((calls, props) => {});

      assert(
        typeof render === 'function'
      );
    });

    it(`Throw an exception if file '.fwarc' is not Object`, async () => {
      await pfs.write('./.fwarc', '');

      try {
        const render = fwa((calls, props) => {});
      }
      catch (e) {
        assert(e.message === 'Unexpected end of JSON input');
      }
    });

    const options = {
      copy: Array,
      templates: Array
    };

    for (let i of Object.keys(options)) {
      const {name} = options[i];

      it(`Throw an exception if '${i}' is not ${name} in the file '.fwarc'`, async () => {
        await pfs.write('./.fwarc', `
        {
          "${i}": ""
        }
        `);

        try {
          const render = fwa((calls, props) => {});
        }
        catch (err) {
          assert(
            err.message ===
            `Invalid value '${i}' in order '.fwarc'. Expected ${name}`
          );
        }
      });
    }

    it(`Throw an exception if value in the array 'copy' is not string ` +
    `in the file '.fwarc' `, async () => {
      await pfs.write('./.fwarc', `
      {
        "copy": [ null ]
      }
      `);

      try {
        const render = fwa((calls, props) => {});
      }
      catch (err) {
        assert(
          err.message ===
          `Invalid value 'copy' in .fwarc. Expected 'string'`
        );
      }
    });

    it(`Must create template functions as defined in the file '.fwarc'`, () => {
      const render = fwa((calls, props) => {
        assert(
          typeof calls['loader.js'] === 'function'
        );
      });

      render();
    });

    it(`The template function must pass arguments in the '_' object`, () => {
      const render = fwa((calls, props) => {
        const html = calls['loader.js']({ content: 'test' })

        assert(html === '<i>test</i>');
      });

      render();
    });

    it(`The returned function must take 'any type' of data and pass ` +
    `the second argument to the 'callback'`, () => {
      const render = fwa((calls, props) => {
        const html = calls['loader.js']({
          content: props
        })

        assert(html === '<i>test</i>');
      });

      render('test');
    });

    it(`The 'callback' can return 'any type' of data`, () => {
      const render = fwa((calls, props) => {
        return calls['loader.js']({
          content: props
        });
      });

      const html = render('test');

      assert(html === '<i>test</i>');
    });
  });
});
