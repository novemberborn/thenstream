'use strict';

var Readable = require('stream').Readable;
var util = require('util');

function AssimilationState(stream) {
  this.source = null;
  this.waiting = false;
  this.encoding = stream._readableState.encoding;
}

function extractThenMethod(x) {
  if (!x || typeof x !== 'object' && typeof x !== 'function') {
    return null;
  }

  var then = x.then;
  return typeof then === 'function' ? then : null;
}

function Thenstream(thenable) {
  if (!(this instanceof Thenstream)) {
    return new Thenstream(thenable);
  }

  Readable.call(this);

  this._assimilationState = new AssimilationState(this);

  var self = this;
  function emitError(error) {
    process.nextTick(function() {
      self.emit('error', error);
    });
  }

  var then = null;
  try {
    then = extractThenMethod(thenable);
  } catch (error) {
    emitError(error);
    return;
  }

  if (!then) {
    emitError(new TypeError('Expected thenable.'));
    return;
  }

  var once = true;
  try {
    then.call(thenable,
      function(source) {
        if (once) {
          once = false;
          try {
            // Note: `source` is not necessarily set asynchronously.
            self._setSource(source);
          } catch (error) {
            emitError(error);
          }
        }
      },
      function(reason) {
        if (once) {
          once = false;
          emitError(reason);
        }
      });
  } catch (error) {
    if (once) {
      once = false;
      emitError(error);
    }
  }
}
module.exports = Thenstream;

util.inherits(Thenstream, Readable);

Thenstream.prototype.setEncoding = function(encoding) {
  this._assimilationState.encoding = encoding;
  Readable.prototype.setEncoding.call(this, encoding);
};

Thenstream.prototype._read = function() {
  if (this._assimilationState.source) {
    this._pushChunks();
  } else {
    this._assimilationState.waiting = true;
  }
};

Thenstream.prototype._setSource = function(source) {
  var self = this;

  // If it walks like a duck…
  if (
    !source || typeof source !== 'object' ||
    !source._readableState || typeof source._readableState !== 'object' ||
    typeof source.read !== 'function'
  ) {
    throw new TypeError('Thenable did not fulfill with a usable stream.');
  }

  // highWaterMark and objectMode are not configurable in the Thenstream;
  // we inherit them from the source stream.
  var sourceState = source._readableState;
  var readableState = self._readableState;
  readableState.highWaterMark = sourceState.highWaterMark;
  readableState.objectMode = sourceState.objectMode;

  // Only inherit encoding if it hasn't been set explicitly.
  if (
    sourceState.encoding !== null &&
    self._assimilationState.encoding === null
  ) {
    self.setEncoding(sourceState.encoding);
  }

  // Re-emit close and error events.
  source.on('close', self.emit.bind(self, 'close'));
  source.on('error', self.emit.bind(self, 'error'));

  // Update state
  self._assimilationState.source = source;

  // Push more chunks when data becomes available.
  function onReadable() {
    if (self._assimilationState.waiting) {
      self._assimilationState.waiting = false;
      self._pushChunks();
    }
  }
  source.on('readable', onReadable);
  source.once('end', function() {
    source.removeListener('readable', onReadable);

    if (self._assimilationState.waiting) {
      self._assimilationState.waiting = false;
      self.push(null);
    }
  });

  // Push chunks if reading started before the source was set.
  if (self._assimilationState.waiting) {
    self._assimilationState.waiting = false;
    self._pushChunks();
  }
};

Thenstream.prototype._pushChunks = function() {
  var chunk, pushAnother;
  do {
    chunk = this._assimilationState.source.read();
    if (chunk === null) {
      this._assimilationState.waiting = true;
      pushAnother = false;
    } else {
      pushAnother = (this.push(chunk) !== false);
    }
  } while (pushAnother);
};
