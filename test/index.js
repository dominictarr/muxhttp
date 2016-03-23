

var tape = require('tape')
var muxhttp = require('../')
var pull = require('pull-stream')
var crypto = require('crypto')

var manifest = {
  get: 'async',
  read: 'source',
  upload: 'sink'
}

var api = {
  get: function (args, cb) {
    cb(null, {okay: true})
  },
  read: function (opts) {
    return pull.count(opts.n)
  },
  upload: function (opts, cb) {
    var hash = crypto.createHash('sha256')
    return pull.drain(function (data) {
      hash.update(data)
    }, function (err) {
      cb(err, hash.digest())
    })
  }
}


tape('simple server', function (t) {

  var server = muxhttp.createServer(manifest, api)
  .listen(function () {
    var client = muxhttp.createClient(manifest, {protocol: 'http:', hostname: 'localhost', port: server.address().port})
    console.log(client)
    client.get({}, function (err, value) {
      t.notOk(err)
      t.deepEqual(value, {okay: true})
      pull(client.read({n: 5}), pull.collect(function (err, ary) {
        console.log('READ', ary)
        t.notOk(err)
        t.equal(Buffer.concat(ary).toString(), [0,1,2,3,4,5].join('\n')+'\n')
        pull(pull.values([]), client.upload(function (err, hash) {
          t.deepEqual(hash, crypto.createHash('sha256').digest())
          server.close()
          t.end()
        }))
      }))
    })
  })
})

