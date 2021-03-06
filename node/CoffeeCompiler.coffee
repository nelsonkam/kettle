path = require 'path'
fs = require 'fs'
fse = require 'fs-extra'
extend = require('util')._extend
coffeeScript = require 'coffee-script'
uglifyjs = require 'uglify-js'

#require './node_modules.js'
# Reads options at the head of a file
#   E.g.: # out: index.js
#
# @param [String] content input from which options are read.
readOptions = (content) ->
  firstLine = content[0...content.indexOf '\n']
  match = /^\s*\#\s*(.+)/.exec firstLine
  options = {}
  return options unless match?
  for item in match[1].split ','
    i = item.indexOf ':'
    break if i < 0
    key = item[0...i].trim()
    value = item[i + 1...].trim()
    if value.match /^(true|false|undefined|null|[0-9]+)$/
      value = eval value
    options[key] = value
  options

# Compiles coffee-script file
# @param [String] coffeeFile path of coffeescript file
# @param [(err: Error) -> void] callback Handles errors
compile = (coffeeFile, callback) ->
  fs.readFile coffeeFile, (err, buffer) ->
    callback err if err?
    content = buffer.toString()
    options = extend {}, readOptions content
    coffeePath = path.dirname coffeeFile
    # Do not compile if out is none or false
    if options.out is 'none' or options.out is false
      return
    if options.out
      jsFilename = options.out
      if path.extname jsFilename is ''
        jsFilename += '.js'
        delete options.out
    else
      jsFilename = path.basename coffeeFile
      baseNameLenght = jsFilename.length - path.extname(jsFilename).length
      jsFilename = jsFilename[0...baseNameLenght] + '.js'
    jsFile = path.resolve coffeePath, jsFilename
    # Source map
    if options.sourceMap
      options.sourceMap = {}
      options.sourceMapRoot ?= path.basename jsFile
      options.sourceMapSources = [coffeeFile]
      # sets sourcmap filename
      if options.sourceMapFilename?
        options.sourceMapFilename =
          path.resolve coffeePath, options.sourceMapFilename
      else
        options.sourceMapFilename = jsFile + '.map'
        options.sourceMapURL ?=
          path.relative "#{jsFile + path.sep}..", options.sourceMapFilename
    try
      js = coffeeScript.compile content
      fse.outputFile jsFile, js, (err) ->
        callback err if err?
    catch err
      callback err
      console.log err.message
    if options.sourceMapFilename
      try
        map = coffeeScript.compile content, {
          sourceMap: true
          filename: options.sourceMapFilename
        }
        fse.outputFile options.sourceMapFilename,
          map.v3SourceMap, (err) ->
            callback err if err?
      catch err
        callback err
        console.log err.message
    callback null, {}

exports.init = (DomainManager) ->
  unless DomainManager.hasDomain 'CoffeeCompiler'
    DomainManager.registerDomain 'CoffeeCompiler', {
      major: 1
      minor: 0
    }
    DomainManager.registerCommand 'CoffeeCompiler', 'compile', compile, true,
      'Compiles a coffee-script file'
