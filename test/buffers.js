'use strict';

var PassThrough = require('stream').PassThrough;

var Thenstream = require('../').Thenstream;

describe('Given a source stream that contains buffer chunks:', function() {
  var pt, ts, chunks;
  beforeEach(function() {
    pt = new PassThrough();

    ts = new Thenstream({
      then: function(resolve) {
        resolve(pt);
      }
    });

    chunks = {
      foo: new Buffer('foo'),
      bar: new Buffer('bar'),
      baz: new Buffer('baz')
    };
  });

  it('returns the same bytes', function() {
    pt.write(chunks.foo);
    pt.write(chunks.bar);
    pt.write(chunks.baz);
    assert.deepEqual(ts.read(2), new Buffer('fo'));
    assert.deepEqual(ts.read(4), new Buffer('obar'));
    assert.deepEqual(ts.read(3), chunks.baz);
  });

  it('returns strings when encoding is set', function() {
    ts.setEncoding('utf8');
    pt.write(chunks.foo);
    pt.write(chunks.bar);
    pt.write(chunks.baz);
    assert.equal(ts.read(2), 'fo');
    assert.equal(ts.read(4), 'obar');
    assert.equal(ts.read(3), 'baz');
  });
});
