'use strict';

var PassThrough = require('stream').PassThrough;

var Thenstream = require('../').Thenstream;

describe('Given a source stream that is in object mode:', function() {
  var pt, ts;
  beforeEach(function() {
    pt = new PassThrough({ objectMode: true });

    ts = new Thenstream({
      then: function(resolve) {
        resolve(pt);
      }
    });
  });

  it('emits the same bytes', function() {
    pt.write(sentinels.foo);
    pt.write(sentinels.bar);
    pt.write(sentinels.baz);
    assert.matchingSentinels(ts.read(), sentinels.foo);
    assert.matchingSentinels(ts.read(), sentinels.bar);
    assert.matchingSentinels(ts.read(), sentinels.baz);
  });
});
