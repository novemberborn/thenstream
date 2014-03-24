thenstream
==========

Construct a [Readable stream](http://nodejs.org/api/stream.html#stream_class_stream_readable)
from a [thenable](http://promises-aplus.github.io/promises-spec/#terminology).
Useful if you don't have the actual stream yet.

## Installation

```js
npm install thenstream
```

## Usage

With [Legendary](https://github.com/novemberborn/legendary) installed:

```js
var Thenstream = require('thenstream');
var Promise = require('legendary').Promise;

var p = new Promise(function(resolve) {
  setTimeout(function() {
    resolve(getReadableStreamSomehow());
  }, 2000);
});

var readable = new Thenstream(p)
readable.on('readable', function() {
  var chunk;
  while (null !== (chunk = readable.read())) {
    console.log('got %d bytes of data', chunk.length);
  }
});
```

## API

`thenstream` exports a single class, `Thenstream`.

### new thenstream.Thenstream(thenable)

Subclass of `stream.Readable`. Can be called without `new`.

The returned stream is immediately readable, but no data will be available until
`thenable` fulfils with a readable stream. The thenable is assimilated along the
lines of the [Promise Resolution Procedure](http://promises-aplus.github.io/promises-spec/#the_promise_resolution_procedure).
Any error in assimilation will be emitted (*after* the constructor has returned)
as an `error` event. Similarly an `error` event will be emitted if the thenable
does not fulfil with something that looks like a readable stream.

*Note: thenables-for-thenables are not supported. If you need to handle such
thenables you should wrap them using your promise library of choice, prior to
creating the thenstream. [Legendary](https://github.com/novemberborn/legendary)
would be a great choice.*
