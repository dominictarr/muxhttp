var URL = require('url')
var qs = require('querystring')
var client = require('pull-http-client')
var URL = require('url')
var path = require('path')

function isObject (o) {
  return o && 'object' === typeof o
}

function isString (s) {
  return 'string' === typeof s
}

function clone (a) {
  var b = {}
  for(var k in a) b[k] = a[k]
  return b
}

function map(manifest, name, fn) {
  var o = {}
  for(var key in manifest) {
    var value = manifest[key]
    o[key] = (
      isString(value) ? fn(name.concat(key), value)
    : isObject(value) ? map(value, name.concat(key), fn)
    : (function () { throw new Error('invalid manifest:' + value) })()
    )
  }
  return o
}

//this is half-baked.
//the better way would be to set a mime type
//including when the client uploads.

//okay, the other thing: don't expect to serve
//_everything_ through the muxapi, if something
//needs to be served with a particular mimetype or something
//it's easy to put another server route on the side.

function maybeJSON(cb) {
  return function (err, value) {
    if(err) return cb(err)

    try {
      value = JSON.parse(value.toString())
    } catch(err) {
      return cb(null, value)
    }

    cb(null, value)
  }
}

module.exports = function (manifest, url) {

  console.log(url)
  var base = isObject(url) ? url : URL.parse(url)

  return map(manifest, [], function (name, type) {
    return function (value, cb) {
      if('function' === typeof value)
        cb = value, value = {}
      var opts = clone(base)
      console.log(opts.pathname, name)
      opts.path = 
        path.join(opts.pathname||'/', name.join('/'))
        +  '?' + (qs.stringify(value))
      console.log(URL.format(opts))

      return client[type](opts, maybeJSON(cb))
//      if(type === 'source')
//        return pull(client.source(opts), parse())
//      else if(type === 'sink')
//        return pull(encode(), client.sink(opts, cb))
//      else if(type === 'duplex')
//        return pull(encode(), client.duplex(opts), decode())
//      else if(type == 'async')
//        client.async(opts, maybeJSON(cb))
//      else if(type == 'sync')
//        client.async(opts, maybeJSON(cb))
    }
  })
}

