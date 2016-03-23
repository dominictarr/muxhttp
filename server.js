
var http = require('http')
var URL = require('url')
var qs = require('querystring')
var toPull = require('stream-to-pull-stream')
var pull = require('pull-stream')

function isString (s) {
  return 'string' === typeof s
}

var isBuffer = Buffer.isBuffer

function isObject (o) {
  return o && 'object' === typeof o
}

function getPath (path, object) {
  if(path.length > 1)
    return getPath(path.slice(1), object[path[0]])
  return object[path[0]]
}

module.exports = function (manifest, api) {

  return http.createServer(function (req, res) {
    console.log(req.method, req.headers.host + req.url)
    var url = URL.parse(req.headers.host + req.url)
    var name = url.pathname.split('/').slice(1)
    var opts = qs.parse(url.query)
    var type = getPath(name, manifest)
    console.log(type, name, opts)
    var call = getPath(name, api)
    if(!call) throw new Error('not implemented')

    function cb (err, value) {
      if(err) {
        res.writeHead(500)
        res.end(err.stack)
    
      }
      else if(isBuffer(value) || isString(value)) {
        res.setHeader('Content-Type', 'text/plain')
        res.end(value)
      }
      else if(isObject(value)) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(value, null, 2))
      }
      else res.end()
    }

    if(type === 'source')
      pull(call(opts), pull.map(function (e) {
        return e + '\n'
      }), toPull.sink(res))
    else if(type === 'sink')
      pull(toPull.source(req), call(opts, cb))
    else if(type === 'duplex')
      pull(toPull.source(req), call(opts), toPull.sink(res))
    else if(type == 'async') {
      try { call(opts, cb) }
      catch (err) { return cb(err) }
    }
    else if(type == 'sync') {
      var value
      try { value = call(opts) }
      catch (err) { return cb(err) }
      return cb(null, value)
    }

  })
}


