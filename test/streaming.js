'use strict';

var PassThrough = require('stream').PassThrough;
var sinon = require('sinon');

var Thenstream = require('../').Thenstream;

describe('Exhibits proper streaming behavior:', function() {
  var pt, ts, chunk;
  beforeEach(function() {
    pt = new PassThrough();

    ts = new Thenstream({
      then: function(resolve) {
        resolve(pt);
      }
    });

    chunk = new Buffer('foo');
  });

  it('emits `readable` when chunks become available', function() {
    var spy = sinon.spy();
    ts.on('readable', spy);

    assert.notCalled(spy);
    pt.write(chunk);
    assert.calledOnce(spy);
  });

  it('emits `end` when source stream ends', function(done) {
    var spy = sinon.spy();
    ts.on('end', spy);

    assert.notCalled(spy);
    ts.resume();
    pt.end(chunk);

    setImmediate(function() {
      assert.calledOnce(spy);
      done();
    });
  });

  it('re-emits `close` from source stream', function() {
    var spy = sinon.spy();
    ts.on('close', spy);

    assert.notCalled(spy);
    pt.emit('close', sentinels.foo);
    pt.emit('close', sentinels.bar);

    assert.calledWithExactly(spy, sentinels.foo);
    assert.calledWithExactly(spy, sentinels.bar);
  });

  it('re-emits `error` from source stream', function() {
    var spy = sinon.spy();
    ts.on('error', spy);

    assert.notCalled(spy);
    pt.emit('error', sentinels.foo);
    pt.emit('error', sentinels.bar);

    assert.calledWithExactly(spy, sentinels.foo);
    assert.calledWithExactly(spy, sentinels.bar);
  });

  it('`error` events have no effect on reading', function() {
    var spy = sinon.spy();
    ts.on('readable', spy);
    ts.on('error', function() {});

    assert.notCalled(spy);
    pt.emit('error');
    pt.write(chunk);
    assert.calledOnce(spy);
  });
});
