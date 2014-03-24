'use strict';

var PassThrough = require('stream').PassThrough;

var Thenstream = require('../').Thenstream;

describe('Given a source stream that contains string chunks:', function() {
  var pt, ts, chunks;
  beforeEach(function() {
    pt = new PassThrough();
    pt.setEncoding('utf8');

    ts = new Thenstream({
      then: function(resolve) {
        resolve(pt);
      }
    });

    chunks = {
      foo: 'foo',
      bar: 'bar',
      baz: 'baz'
    };
  });

  it('returns the same strings', function() {
    pt.write(chunks.foo);
    pt.write(chunks.bar);
    pt.write(chunks.baz);
    assert.deepEqual(ts.read(2), 'fo');
    assert.deepEqual(ts.read(4), 'obar');
    assert.deepEqual(ts.read(3), 'baz');
  });
});
