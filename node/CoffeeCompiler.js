(function() {
  var coffeeScript, compile, extend, fs, fse, path, readOptions, uglifyjs;

  path = require('path');

  fs = require('fs');

  fse = require('fs-extra');

  extend = require('util')._extend;

  coffeeScript = require('coffee-script');

  uglifyjs = require('uglify-js');

  readOptions = function(content) {
    var firstLine, i, item, j, key, len, match, options, ref, value;
    firstLine = content.slice(0, content.indexOf('\n'));
    match = /^\s*\#\s*(.+)/.exec(firstLine);
    options = {};
    if (match == null) {
      return options;
    }
    ref = match[1].split(',');
    for (j = 0, len = ref.length; j < len; j++) {
      item = ref[j];
      i = item.indexOf(':');
      if (i < 0) {
        break;
      }
      key = item.slice(0, i).trim();
      value = item.slice(i + 1).trim();
      if (value.match(/^(true|false|undefined|null|[0-9]+)$/)) {
        value = eval(value);
      }
      options[key] = value;
    }
    return options;
  };

  compile = function(coffeeFile, callback) {
    return fs.readFile(coffeeFile, function(err, buffer) {
      var baseNameLenght, coffeePath, content, js, jsFile, jsFilename, map, options;
      if (err != null) {
        callback(err);
      }
      content = buffer.toString();
      options = extend({}, readOptions(content));
      coffeePath = path.dirname(coffeeFile);
      if (options.out === 'none' || options.out === false) {
        return;
      }
      if (options.out) {
        jsFilename = options.out;
        if (path.extname(jsFilename === '')) {
          jsFilename += '.js';
          delete options.out;
        }
      } else {
        jsFilename = path.basename(coffeeFile);
        baseNameLenght = jsFilename.length - path.extname(jsFilename).length;
        jsFilename = jsFilename.slice(0, baseNameLenght) + '.js';
      }
      jsFile = path.resolve(coffeePath, jsFilename);
      if (options.sourceMap) {
        options.sourceMap = {};
        if (options.sourceMapRoot == null) {
          options.sourceMapRoot = path.basename(jsFile);
        }
        options.sourceMapSources = [coffeeFile];
        if (options.sourceMapFilename != null) {
          options.sourceMapFilename = path.resolve(coffeePath, options.sourceMapFilename);
        } else {
          options.sourceMapFilename = jsFile + '.map';
          if (options.sourceMapURL == null) {
            options.sourceMapURL = path.relative((jsFile + path.sep) + "..", options.sourceMapFilename);
          }
        }
      }
      try {
        js = coffeeScript.compile(content);
        fse.outputFile(jsFile, js, function(err) {
          if (err != null) {
            return callback(err);
          }
        });
      } catch (_error) {
        err = _error;
        callback(err);
        console.log(err.message);
      }
      if (options.sourceMapFilename) {
        try {
          map = coffeeScript.compile(content, {
            sourceMap: true,
            filename: options.sourceMapFilename
          });
          fse.outputFile(options.sourceMapFilename, map.v3SourceMap, function(err) {
            if (err != null) {
              return callback(err);
            }
          });
        } catch (_error) {
          err = _error;
          callback(err);
          console.log(err.message);
        }
      }
      return callback(null, {});
    });
  };

  exports.init = function(DomainManager) {
    if (!DomainManager.hasDomain('CoffeeCompiler')) {
      DomainManager.registerDomain('CoffeeCompiler', {
        major: 1,
        minor: 0
      });
      return DomainManager.registerCommand('CoffeeCompiler', 'compile', compile, true, 'Compiles a coffee-script file');
    }
  };

}).call(this);
