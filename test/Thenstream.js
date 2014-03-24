'use strict';

var Readable = require('stream').Readable;
var PassThrough = require('stream').PassThrough;

var Thenstream = require('../').Thenstream;

describe('Thenstream', function() {
  it('extends Readable', function() {
    assert.instanceOf(new Thenstream({ then: function() {} }), Readable);
  });

  describe('when called without `new`', function() {
    it('returns an instance', function() {
      /*jshint newcap:false*/
      assert.instanceOf(Thenstream({ then: function() {} }), Thenstream);
    });

    it('instance streams as expected', function() {
      var pt = new PassThrough({ objectMode: true });
      pt.end(sentinels.foo);

      /*jshint newcap:false*/
      var ts = Thenstream({
        then: function(setSource) {
          setSource(pt);
        }
      });

      assert.matchingSentinels(ts.read(), sentinels.foo);
    });
  });
});
