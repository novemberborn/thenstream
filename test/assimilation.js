'use strict';

var PassThrough = require('stream').PassThrough;
var sinon = require('sinon');

var Thenstream = require('../').Thenstream;

describe('Assimilates thenables along the lines of the Promise Resolution ' +
  'Procedure:',
  function() {
    var pt, pt2;
    beforeEach(function() {
      pt = new PassThrough({ objectMode: 1 });
      pt.write(sentinels.foo);

      pt2 = new PassThrough({ objectMode: 1 });
      pt2.write(sentinels.bar);
    });


    describe('2.3.3: If `thenable` is an object or a function', function() {
      describe('2.3.3.1: Let `then` be `thenable.then`', function() {
        function testAssimilation(makeThenable) {
          it('gets `then` only once', function() {
            var spy = sinon.spy(function() { return function() {}; });
            /*jshint newcap:false*/
            Thenstream(makeThenable(spy));
            assert.calledOnce(spy);
          });
        }

        describe('`thenable` is an object with null prototype', function() {
          testAssimilation(function(spy) {
            return Object.create(null, {
              then: {
                get: spy
              }
            });
          });
        });

        describe('`thenable` is an object with normal Object.prototype',
          function() {
            testAssimilation(function(spy) {
              return Object.create(Object.prototype, {
                then: {
                  get: spy
                }
              });
            });
          });

        describe('`thenable` is a function', function() {
          testAssimilation(function(spy) {
            function thenable() {}
            Object.defineProperty(thenable, 'then', {
              get: spy
            });
            return thenable;
          });
        });
      });

      describe('2.3.3.2: If retrieving the property `thenable.then` results ' +
        'in a thrown exception `e`',
        function() {
          it('`e` is emitted as an `error`', function(done) {
            var ts = new Thenstream(Object.create(Object.prototype, {
              then: {
                get: function() {
                  throw sentinels.foo;
                }
              }
            }));
            ts.on('error', function(error) {
              assert.matchingSentinels(error, sentinels.foo);
              done();
            });
          });
        });

      describe('2.3.3.3: If `then` is a function, call it with `thenable` as ' +
        '`this`, first argument `setSource`, and second argument ' +
        '`emitError`, where:',
        function() {
          it('calls with `thenable` as `this` and two function arguments',
            function() {
              var spy = sinon.spy();
              var thenable = { then: spy };
              /*jshint newcap:false*/
              Thenstream(thenable);
              assert.calledOnce(spy);
              assert.calledOn(spy, thenable);
              assert.calledWithExactly(spy, sinon.match.func, sinon.match.func);
            });

          it('uses the original value of `then`', function() {
            var spy = sinon.spy();
            var other = sinon.spy();
            var first = true;
            var thenable = Object.create(Object.prototype, {
              then: {
                get: function() {
                  if (first) {
                    first = false;
                    return spy;
                  }
                  return other;
                }
              }
            });

            /*jshint newcap:false*/
            Thenstream(thenable);
            assert.calledOnce(spy);
            assert.notCalled(other);
          });

          describe('2.3.3.3.1: If/when `setSource` is called with value `s`',
            function() {
              function testError(s) {
                it('emits `error`', function(done) {
                  var ts = new Thenstream({
                    then: function(setSource) {
                      setSource(s);
                    }
                  });
                  ts.on('error', function(error) {
                    assert.instanceOf(error, TypeError);
                    assert.propertyVal(error, 'message',
                      'Thenable did not fulfill with a usable stream.');
                    done();
                  });
                });
              }

              describe('`s` is `undefined`', function() {
                testError(undefined);
              });

              describe('`s` is `null`', function() {
                testError(null);
              });

              describe('`s` is an object without `_readableState`', function() {
                testError({});
              });

              describe('`s` is an object without `read()`', function() {
                testError({ _readableState: {} });
              });

              describe('`s` looks like a stream', function() {
                it('is consumed', function() {
                  var ts = new Thenstream({
                    then: function(setSource) {
                      setSource(pt);
                    }
                  });

                  assert.matchingSentinels(ts.read(), sentinels.foo);
                });
              });

              describe('`s` is misbehaving', function() {
                it('emits `error`', function(done) {
                  var ts = new Thenstream({
                    then: function(setSource) {
                      setSource({
                        _readableState: {},
                        read: function() {},
                        on: function() { throw sentinels.foo; }
                      });
                    }
                  });
                  ts.on('error', function(r) {
                    assert.matchingSentinels(r, sentinels.foo);
                    done();
                  });
                });
              });
            });
        });

      describe('2.3.3.3.2: If/when `emitError` is called with reason `r`',
        function() {
          it('emits `error`', function(done) {
            var ts = new Thenstream({
              then: function(_, emitError) {
                emitError(sentinels.foo);
              }
            });
            ts.on('error', function(r) {
              assert.matchingSentinels(r, sentinels.foo);
              done();
            });
          });
        });

      describe('2.3.3.3.3: If both `setSource` and `emitError` are called, ' +
        'or multiple calls to the same argument are made, the first call ' +
        'takes precedence, and any further calls are ignored.',
        function() {
          function testRead(then) {
            it('reads from source without errors', function(done) {
              var ts = new Thenstream({
                then: then
              });
              var readSpy = sinon.spy(function() {
                assert.matchingSentinels(ts.read(), sentinels.foo);
              });
              var errorSpy = sinon.spy();
              ts.on('readable', readSpy);
              ts.on('error', errorSpy);
              setTimeout(function() {
                assert.calledOnce(readSpy);
                assert.notCalled(errorSpy);
                done();
              }, 10);
            });
          }

          function testError(then) {
            it('emits `error` without reading from source', function(done) {
              var ts = new Thenstream({
                then: then
              });
              var readSpy = sinon.spy();
              var errorSpy = sinon.spy();
              ts.on('readable', readSpy);
              ts.on('error', errorSpy);
              setTimeout(function() {
                assert.calledOnce(errorSpy);
                assert.notCalled(readSpy);
                assert.isNull(ts.read());
                done();
              }, 10);
            });
          }

          describe('calling `setSource` then `emitError`, both synchronously',
            function() {
              testRead(function(setSource, emitError) {
                setSource(pt);
                emitError();
              });
            });

          describe('calling `setSource` synchronously then `emitError` ' +
            'asynchronously',
            function() {
              testRead(function(setSource, emitError) {
                setSource(pt);
                setImmediate(emitError);
              });
            });

          describe('calling `setSource` then `emitError`, both ' +
            'asynchronously',
            function() {
              testRead(function(setSource, emitError) {
                setImmediate(function() { setSource(pt); });
                setImmediate(emitError);
              });
            });

          describe('calling `emitError` then `setSource`, both synchronously',
            function() {
              testError(function(setSource, emitError) {
                emitError();
                setSource(pt);
              });
            });

          describe('calling `emitError` synchronously then `setSource` ' +
            'asynchronously',
            function() {
              testError(function(setSource, emitError) {
                emitError();
                setImmediate(function() { setSource(pt); });
              });
            });

          describe('calling `emitError` then `setSource`, both ' +
            'asynchronously',
            function() {
              testError(function(setSource, emitError) {
                setImmediate(emitError);
                setImmediate(function() { setSource(pt); });
              });
            });

          describe('calling `setSource` twice synchronously',
            function() {
              testRead(function(setSource) {
                setSource(pt);
                setSource(pt2);
              });
            });

          describe('calling `setSource` twice, first synchronously then ' +
            'asynchronously',
            function() {
              testRead(function(setSource) {
                setSource(pt);
                setImmediate(function() { setSource(pt2); });
              });
            });

          describe('calling `setSource` twice, both times asynchronously',
            function() {
              testRead(function(setSource) {
                setImmediate(function() { setSource(pt); });
                setImmediate(function() { setSource(pt2); });
              });
            });

          describe('calling `emitError` twice synchronously',
            function() {
              testError(function(_, emitError) {
                emitError();
                emitError();
              });
            });

          describe('calling `emitError` twice, first synchronously then ' +
            'asynchronously',
            function() {
              testError(function(_, emitError) {
                emitError();
                setImmediate(emitError);
              });
            });

          describe('calling `emitError` twice, both times asynchronously',
            function() {
              testError(function(_, emitError) {
                setImmediate(emitError);
                setImmediate(emitError);
              });
            });
        });

      describe('2.3.3.3.4: If calling `then` throws an exception `e`,',
        function() {
          describe('2.3.3.3.4.1: If `setSource` or `emitError` have been ' +
            'called, ignore it.',
            function() {
              function testIgnored(then) {
                it('is ignored', function(done) {
                  var e = new sentinels.Sentinel('e');
                  var ts = new Thenstream({
                    then: function(setSource, emitError) {
                      then.call(this, setSource, emitError);
                      throw e;
                    }
                  });
                  var spy = sinon.spy();
                  ts.on('error', spy);
                  setTimeout(function() {
                    assert.neverCalledWith(spy, e);
                    done();
                  }, 10);
                });
              }

              describe('`setSource` was called', function() {
                testIgnored(function(setSource) {
                  setSource(pt);
                });
              });

              describe('`emitError` was called', function() {
                testIgnored(function(_, emitError) {
                  emitError(pt);
                });
              });

              describe('`setSource` then `emitError` was called', function() {
                testIgnored(function(setSource, emitError) {
                  setSource(pt);
                  emitError();
                });
              });

              describe('`emitError` then `setSource` was called', function() {
                testIgnored(function(setSource, emitError) {
                  emitError();
                  setSource(pt);
                });
              });
            });

          describe('2.3.3.3.4.2: Otherwise, emit `error`.',
            function() {
              function testEmitted(then) {
                it('is emitted', function(done) {
                  var e = new sentinels.Sentinel('e');
                  var ts = new Thenstream({
                    then: function(setSource, emitError) {
                      then.call(this, setSource, emitError);
                      throw e;
                    }
                  });
                  var spy = sinon.spy();
                  ts.on('error', spy);
                  setTimeout(function() {
                    assert.calledOnce(spy);
                    assert.calledWithExactly(spy, e);
                    done();
                  }, 10);
                });
              }

              describe('straightforward case', function() {
                testEmitted(function() {});
              });

              describe('`setSource` is called asynchronously before the ' +
                '`throw`',
                function() {
                  testEmitted(function(setSource) {
                    setImmediate(function() { setSource(pt); });
                  });
                });

              describe('`emitError` is called asynchronously before the ' +
                '`throw`',
                function() {
                  testEmitted(function(_, emitError) {
                    setImmediate(emitError);
                  });
                });
            });
        });

      describe('2.3.3.4: If `then` is not a function, an error is emitted',
        function() {
          function testAssimilation(then) {
            it('emits `error`', function(done) {
              var ts = new Thenstream({ then: then });
              ts.on('error', function(error) {
                assert.instanceOf(error, TypeError);
                assert.propertyVal(error, 'message', 'Expected thenable.');
                done();
              });
            });
          }

          describe('`then` is `5`', function() {
            testAssimilation(5);
          });

          describe('`then` is an object', function() {
            testAssimilation({});
          });

          describe('`then` is an array containing a function', function() {
            testAssimilation([function() {}]);
          });

          describe('`then` is a regular expression', function() {
            testAssimilation(/a-b/i);
          });

          describe('`then` is an object inheriting from `Function.prototype`',
            function() {
              testAssimilation(Object.create(Function.prototype));
            });
        });
    });

    describe('2.3.4: If thenable is not an object or a function, an error is ' +
      'emitted',
      function() {
        function testAssimilation(thenable) {
          it('emits `error`', function(done) {
            var ts = new Thenstream(thenable);
            ts.on('error', function(error) {
              assert.instanceOf(error, TypeError);
              assert.propertyVal(error, 'message', 'Expected thenable.');
              done();
            });
          });
        }

        describe('the thenable is `undefined`', function() {
          testAssimilation(undefined);
        });

        describe('the thenable is `null`', function() {
          testAssimilation(null);
        });

        describe('the thenable is `false`', function() {
          testAssimilation(false);
        });

        describe('the thenable is `true`', function() {
          testAssimilation(true);
        });

        describe('the thenable is `0`', function() {
          testAssimilation(0);
        });

        describe('the thenable is `true` with `Boolean.prototype` modified ' +
          'to have a `then` method',
          function() {
            beforeEach(function() {
              Boolean.prototype.then = function() {};
            });
            afterEach(function() {
              delete Boolean.prototype.then;
            });
            testAssimilation(true);
          });

        describe('the thenable is `1` with `Number.prototype` modified to ' +
          'have a `then` method',
          function() {
            beforeEach(function() {
              Number.prototype.then = function() {};
            });
            afterEach(function() {
              delete Number.prototype.then;
            });
            testAssimilation(1);
          });
      });
  });
