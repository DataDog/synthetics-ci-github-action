require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 9348:
/***/ ((module) => {

// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.


module.exports = {

  newInvalidAsn1Error: function (msg) {
    var e = new Error();
    e.name = 'InvalidAsn1Error';
    e.message = msg || '';
    return e;
  }

};


/***/ }),

/***/ 194:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

var errors = __nccwpck_require__(9348);
var types = __nccwpck_require__(2473);

var Reader = __nccwpck_require__(290);
var Writer = __nccwpck_require__(3200);


// --- Exports

module.exports = {

  Reader: Reader,

  Writer: Writer

};

for (var t in types) {
  if (types.hasOwnProperty(t))
    module.exports[t] = types[t];
}
for (var e in errors) {
  if (errors.hasOwnProperty(e))
    module.exports[e] = errors[e];
}


/***/ }),

/***/ 290:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

var assert = __nccwpck_require__(2357);
var Buffer = __nccwpck_require__(5118).Buffer;

var ASN1 = __nccwpck_require__(2473);
var errors = __nccwpck_require__(9348);


// --- Globals

var newInvalidAsn1Error = errors.newInvalidAsn1Error;



// --- API

function Reader(data) {
  if (!data || !Buffer.isBuffer(data))
    throw new TypeError('data must be a node Buffer');

  this._buf = data;
  this._size = data.length;

  // These hold the "current" state
  this._len = 0;
  this._offset = 0;
}

Object.defineProperty(Reader.prototype, 'length', {
  enumerable: true,
  get: function () { return (this._len); }
});

Object.defineProperty(Reader.prototype, 'offset', {
  enumerable: true,
  get: function () { return (this._offset); }
});

Object.defineProperty(Reader.prototype, 'remain', {
  get: function () { return (this._size - this._offset); }
});

Object.defineProperty(Reader.prototype, 'buffer', {
  get: function () { return (this._buf.slice(this._offset)); }
});


/**
 * Reads a single byte and advances offset; you can pass in `true` to make this
 * a "peek" operation (i.e., get the byte, but don't advance the offset).
 *
 * @param {Boolean} peek true means don't move offset.
 * @return {Number} the next byte, null if not enough data.
 */
Reader.prototype.readByte = function (peek) {
  if (this._size - this._offset < 1)
    return null;

  var b = this._buf[this._offset] & 0xff;

  if (!peek)
    this._offset += 1;

  return b;
};


Reader.prototype.peek = function () {
  return this.readByte(true);
};


/**
 * Reads a (potentially) variable length off the BER buffer.  This call is
 * not really meant to be called directly, as callers have to manipulate
 * the internal buffer afterwards.
 *
 * As a result of this call, you can call `Reader.length`, until the
 * next thing called that does a readLength.
 *
 * @return {Number} the amount of offset to advance the buffer.
 * @throws {InvalidAsn1Error} on bad ASN.1
 */
Reader.prototype.readLength = function (offset) {
  if (offset === undefined)
    offset = this._offset;

  if (offset >= this._size)
    return null;

  var lenB = this._buf[offset++] & 0xff;
  if (lenB === null)
    return null;

  if ((lenB & 0x80) === 0x80) {
    lenB &= 0x7f;

    if (lenB === 0)
      throw newInvalidAsn1Error('Indefinite length not supported');

    if (lenB > 4)
      throw newInvalidAsn1Error('encoding too long');

    if (this._size - offset < lenB)
      return null;

    this._len = 0;
    for (var i = 0; i < lenB; i++)
      this._len = (this._len << 8) + (this._buf[offset++] & 0xff);

  } else {
    // Wasn't a variable length
    this._len = lenB;
  }

  return offset;
};


/**
 * Parses the next sequence in this BER buffer.
 *
 * To get the length of the sequence, call `Reader.length`.
 *
 * @return {Number} the sequence's tag.
 */
Reader.prototype.readSequence = function (tag) {
  var seq = this.peek();
  if (seq === null)
    return null;
  if (tag !== undefined && tag !== seq)
    throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) +
                              ': got 0x' + seq.toString(16));

  var o = this.readLength(this._offset + 1); // stored in `length`
  if (o === null)
    return null;

  this._offset = o;
  return seq;
};


Reader.prototype.readInt = function () {
  return this._readTag(ASN1.Integer);
};


Reader.prototype.readBoolean = function () {
  return (this._readTag(ASN1.Boolean) === 0 ? false : true);
};


Reader.prototype.readEnumeration = function () {
  return this._readTag(ASN1.Enumeration);
};


Reader.prototype.readString = function (tag, retbuf) {
  if (!tag)
    tag = ASN1.OctetString;

  var b = this.peek();
  if (b === null)
    return null;

  if (b !== tag)
    throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) +
                              ': got 0x' + b.toString(16));

  var o = this.readLength(this._offset + 1); // stored in `length`

  if (o === null)
    return null;

  if (this.length > this._size - o)
    return null;

  this._offset = o;

  if (this.length === 0)
    return retbuf ? Buffer.alloc(0) : '';

  var str = this._buf.slice(this._offset, this._offset + this.length);
  this._offset += this.length;

  return retbuf ? str : str.toString('utf8');
};

Reader.prototype.readOID = function (tag) {
  if (!tag)
    tag = ASN1.OID;

  var b = this.readString(tag, true);
  if (b === null)
    return null;

  var values = [];
  var value = 0;

  for (var i = 0; i < b.length; i++) {
    var byte = b[i] & 0xff;

    value <<= 7;
    value += byte & 0x7f;
    if ((byte & 0x80) === 0) {
      values.push(value);
      value = 0;
    }
  }

  value = values.shift();
  values.unshift(value % 40);
  values.unshift((value / 40) >> 0);

  return values.join('.');
};


Reader.prototype._readTag = function (tag) {
  assert.ok(tag !== undefined);

  var b = this.peek();

  if (b === null)
    return null;

  if (b !== tag)
    throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) +
                              ': got 0x' + b.toString(16));

  var o = this.readLength(this._offset + 1); // stored in `length`
  if (o === null)
    return null;

  if (this.length > 4)
    throw newInvalidAsn1Error('Integer too long: ' + this.length);

  if (this.length > this._size - o)
    return null;
  this._offset = o;

  var fb = this._buf[this._offset];
  var value = 0;

  for (var i = 0; i < this.length; i++) {
    value <<= 8;
    value |= (this._buf[this._offset++] & 0xff);
  }

  if ((fb & 0x80) === 0x80 && i !== 4)
    value -= (1 << (i * 8));

  return value >> 0;
};



// --- Exported API

module.exports = Reader;


/***/ }),

/***/ 2473:
/***/ ((module) => {

// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.


module.exports = {
  EOC: 0,
  Boolean: 1,
  Integer: 2,
  BitString: 3,
  OctetString: 4,
  Null: 5,
  OID: 6,
  ObjectDescriptor: 7,
  External: 8,
  Real: 9, // float
  Enumeration: 10,
  PDV: 11,
  Utf8String: 12,
  RelativeOID: 13,
  Sequence: 16,
  Set: 17,
  NumericString: 18,
  PrintableString: 19,
  T61String: 20,
  VideotexString: 21,
  IA5String: 22,
  UTCTime: 23,
  GeneralizedTime: 24,
  GraphicString: 25,
  VisibleString: 26,
  GeneralString: 28,
  UniversalString: 29,
  CharacterString: 30,
  BMPString: 31,
  Constructor: 32,
  Context: 128
};


/***/ }),

/***/ 3200:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

var assert = __nccwpck_require__(2357);
var Buffer = __nccwpck_require__(5118).Buffer;
var ASN1 = __nccwpck_require__(2473);
var errors = __nccwpck_require__(9348);


// --- Globals

var newInvalidAsn1Error = errors.newInvalidAsn1Error;

var DEFAULT_OPTS = {
  size: 1024,
  growthFactor: 8
};


// --- Helpers

function merge(from, to) {
  assert.ok(from);
  assert.equal(typeof (from), 'object');
  assert.ok(to);
  assert.equal(typeof (to), 'object');

  var keys = Object.getOwnPropertyNames(from);
  keys.forEach(function (key) {
    if (to[key])
      return;

    var value = Object.getOwnPropertyDescriptor(from, key);
    Object.defineProperty(to, key, value);
  });

  return to;
}



// --- API

function Writer(options) {
  options = merge(DEFAULT_OPTS, options || {});

  this._buf = Buffer.alloc(options.size || 1024);
  this._size = this._buf.length;
  this._offset = 0;
  this._options = options;

  // A list of offsets in the buffer where we need to insert
  // sequence tag/len pairs.
  this._seq = [];
}

Object.defineProperty(Writer.prototype, 'buffer', {
  get: function () {
    if (this._seq.length)
      throw newInvalidAsn1Error(this._seq.length + ' unended sequence(s)');

    return (this._buf.slice(0, this._offset));
  }
});

Writer.prototype.writeByte = function (b) {
  if (typeof (b) !== 'number')
    throw new TypeError('argument must be a Number');

  this._ensure(1);
  this._buf[this._offset++] = b;
};


Writer.prototype.writeInt = function (i, tag) {
  if (typeof (i) !== 'number')
    throw new TypeError('argument must be a Number');
  if (typeof (tag) !== 'number')
    tag = ASN1.Integer;

  var sz = 4;

  while ((((i & 0xff800000) === 0) || ((i & 0xff800000) === 0xff800000 >> 0)) &&
        (sz > 1)) {
    sz--;
    i <<= 8;
  }

  if (sz > 4)
    throw newInvalidAsn1Error('BER ints cannot be > 0xffffffff');

  this._ensure(2 + sz);
  this._buf[this._offset++] = tag;
  this._buf[this._offset++] = sz;

  while (sz-- > 0) {
    this._buf[this._offset++] = ((i & 0xff000000) >>> 24);
    i <<= 8;
  }

};


Writer.prototype.writeNull = function () {
  this.writeByte(ASN1.Null);
  this.writeByte(0x00);
};


Writer.prototype.writeEnumeration = function (i, tag) {
  if (typeof (i) !== 'number')
    throw new TypeError('argument must be a Number');
  if (typeof (tag) !== 'number')
    tag = ASN1.Enumeration;

  return this.writeInt(i, tag);
};


Writer.prototype.writeBoolean = function (b, tag) {
  if (typeof (b) !== 'boolean')
    throw new TypeError('argument must be a Boolean');
  if (typeof (tag) !== 'number')
    tag = ASN1.Boolean;

  this._ensure(3);
  this._buf[this._offset++] = tag;
  this._buf[this._offset++] = 0x01;
  this._buf[this._offset++] = b ? 0xff : 0x00;
};


Writer.prototype.writeString = function (s, tag) {
  if (typeof (s) !== 'string')
    throw new TypeError('argument must be a string (was: ' + typeof (s) + ')');
  if (typeof (tag) !== 'number')
    tag = ASN1.OctetString;

  var len = Buffer.byteLength(s);
  this.writeByte(tag);
  this.writeLength(len);
  if (len) {
    this._ensure(len);
    this._buf.write(s, this._offset);
    this._offset += len;
  }
};


Writer.prototype.writeBuffer = function (buf, tag) {
  if (typeof (tag) !== 'number')
    throw new TypeError('tag must be a number');
  if (!Buffer.isBuffer(buf))
    throw new TypeError('argument must be a buffer');

  this.writeByte(tag);
  this.writeLength(buf.length);
  this._ensure(buf.length);
  buf.copy(this._buf, this._offset, 0, buf.length);
  this._offset += buf.length;
};


Writer.prototype.writeStringArray = function (strings) {
  if ((!strings instanceof Array))
    throw new TypeError('argument must be an Array[String]');

  var self = this;
  strings.forEach(function (s) {
    self.writeString(s);
  });
};

// This is really to solve DER cases, but whatever for now
Writer.prototype.writeOID = function (s, tag) {
  if (typeof (s) !== 'string')
    throw new TypeError('argument must be a string');
  if (typeof (tag) !== 'number')
    tag = ASN1.OID;

  if (!/^([0-9]+\.){3,}[0-9]+$/.test(s))
    throw new Error('argument is not a valid OID string');

  function encodeOctet(bytes, octet) {
    if (octet < 128) {
        bytes.push(octet);
    } else if (octet < 16384) {
        bytes.push((octet >>> 7) | 0x80);
        bytes.push(octet & 0x7F);
    } else if (octet < 2097152) {
      bytes.push((octet >>> 14) | 0x80);
      bytes.push(((octet >>> 7) | 0x80) & 0xFF);
      bytes.push(octet & 0x7F);
    } else if (octet < 268435456) {
      bytes.push((octet >>> 21) | 0x80);
      bytes.push(((octet >>> 14) | 0x80) & 0xFF);
      bytes.push(((octet >>> 7) | 0x80) & 0xFF);
      bytes.push(octet & 0x7F);
    } else {
      bytes.push(((octet >>> 28) | 0x80) & 0xFF);
      bytes.push(((octet >>> 21) | 0x80) & 0xFF);
      bytes.push(((octet >>> 14) | 0x80) & 0xFF);
      bytes.push(((octet >>> 7) | 0x80) & 0xFF);
      bytes.push(octet & 0x7F);
    }
  }

  var tmp = s.split('.');
  var bytes = [];
  bytes.push(parseInt(tmp[0], 10) * 40 + parseInt(tmp[1], 10));
  tmp.slice(2).forEach(function (b) {
    encodeOctet(bytes, parseInt(b, 10));
  });

  var self = this;
  this._ensure(2 + bytes.length);
  this.writeByte(tag);
  this.writeLength(bytes.length);
  bytes.forEach(function (b) {
    self.writeByte(b);
  });
};


Writer.prototype.writeLength = function (len) {
  if (typeof (len) !== 'number')
    throw new TypeError('argument must be a Number');

  this._ensure(4);

  if (len <= 0x7f) {
    this._buf[this._offset++] = len;
  } else if (len <= 0xff) {
    this._buf[this._offset++] = 0x81;
    this._buf[this._offset++] = len;
  } else if (len <= 0xffff) {
    this._buf[this._offset++] = 0x82;
    this._buf[this._offset++] = len >> 8;
    this._buf[this._offset++] = len;
  } else if (len <= 0xffffff) {
    this._buf[this._offset++] = 0x83;
    this._buf[this._offset++] = len >> 16;
    this._buf[this._offset++] = len >> 8;
    this._buf[this._offset++] = len;
  } else {
    throw newInvalidAsn1Error('Length too long (> 4 bytes)');
  }
};

Writer.prototype.startSequence = function (tag) {
  if (typeof (tag) !== 'number')
    tag = ASN1.Sequence | ASN1.Constructor;

  this.writeByte(tag);
  this._seq.push(this._offset);
  this._ensure(3);
  this._offset += 3;
};


Writer.prototype.endSequence = function () {
  var seq = this._seq.pop();
  var start = seq + 3;
  var len = this._offset - start;

  if (len <= 0x7f) {
    this._shift(start, len, -2);
    this._buf[seq] = len;
  } else if (len <= 0xff) {
    this._shift(start, len, -1);
    this._buf[seq] = 0x81;
    this._buf[seq + 1] = len;
  } else if (len <= 0xffff) {
    this._buf[seq] = 0x82;
    this._buf[seq + 1] = len >> 8;
    this._buf[seq + 2] = len;
  } else if (len <= 0xffffff) {
    this._shift(start, len, 1);
    this._buf[seq] = 0x83;
    this._buf[seq + 1] = len >> 16;
    this._buf[seq + 2] = len >> 8;
    this._buf[seq + 3] = len;
  } else {
    throw newInvalidAsn1Error('Sequence too long');
  }
};


Writer.prototype._shift = function (start, len, shift) {
  assert.ok(start !== undefined);
  assert.ok(len !== undefined);
  assert.ok(shift);

  this._buf.copy(this._buf, start + shift, start, start + len);
  this._offset += shift;
};

Writer.prototype._ensure = function (len) {
  assert.ok(len);

  if (this._size - this._offset < len) {
    var sz = this._size * this._options.growthFactor;
    if (sz - this._offset < len)
      sz += len;

    var buf = Buffer.alloc(sz);

    this._buf.copy(buf, 0, 0, this._offset);
    this._buf = buf;
    this._size = sz;
  }
};



// --- Exported API

module.exports = Writer;


/***/ }),

/***/ 970:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

// If you have no idea what ASN.1 or BER is, see this:
// ftp://ftp.rsa.com/pub/pkcs/ascii/layman.asc

var Ber = __nccwpck_require__(194);



// --- Exported API

module.exports = {

  Ber: Ber,

  BerReader: Ber.Reader,

  BerWriter: Ber.Writer

};


/***/ }),

/***/ 6631:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright (c) 2012, Mark Cavage. All rights reserved.
// Copyright 2015 Joyent, Inc.

var assert = __nccwpck_require__(2357);
var Stream = __nccwpck_require__(2413).Stream;
var util = __nccwpck_require__(1669);


///--- Globals

/* JSSTYLED */
var UUID_REGEXP = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;


///--- Internal

function _capitalize(str) {
    return (str.charAt(0).toUpperCase() + str.slice(1));
}

function _toss(name, expected, oper, arg, actual) {
    throw new assert.AssertionError({
        message: util.format('%s (%s) is required', name, expected),
        actual: (actual === undefined) ? typeof (arg) : actual(arg),
        expected: expected,
        operator: oper || '===',
        stackStartFunction: _toss.caller
    });
}

function _getClass(arg) {
    return (Object.prototype.toString.call(arg).slice(8, -1));
}

function noop() {
    // Why even bother with asserts?
}


///--- Exports

var types = {
    bool: {
        check: function (arg) { return typeof (arg) === 'boolean'; }
    },
    func: {
        check: function (arg) { return typeof (arg) === 'function'; }
    },
    string: {
        check: function (arg) { return typeof (arg) === 'string'; }
    },
    object: {
        check: function (arg) {
            return typeof (arg) === 'object' && arg !== null;
        }
    },
    number: {
        check: function (arg) {
            return typeof (arg) === 'number' && !isNaN(arg);
        }
    },
    finite: {
        check: function (arg) {
            return typeof (arg) === 'number' && !isNaN(arg) && isFinite(arg);
        }
    },
    buffer: {
        check: function (arg) { return Buffer.isBuffer(arg); },
        operator: 'Buffer.isBuffer'
    },
    array: {
        check: function (arg) { return Array.isArray(arg); },
        operator: 'Array.isArray'
    },
    stream: {
        check: function (arg) { return arg instanceof Stream; },
        operator: 'instanceof',
        actual: _getClass
    },
    date: {
        check: function (arg) { return arg instanceof Date; },
        operator: 'instanceof',
        actual: _getClass
    },
    regexp: {
        check: function (arg) { return arg instanceof RegExp; },
        operator: 'instanceof',
        actual: _getClass
    },
    uuid: {
        check: function (arg) {
            return typeof (arg) === 'string' && UUID_REGEXP.test(arg);
        },
        operator: 'isUUID'
    }
};

function _setExports(ndebug) {
    var keys = Object.keys(types);
    var out;

    /* re-export standard assert */
    if (process.env.NODE_NDEBUG) {
        out = noop;
    } else {
        out = function (arg, msg) {
            if (!arg) {
                _toss(msg, 'true', arg);
            }
        };
    }

    /* standard checks */
    keys.forEach(function (k) {
        if (ndebug) {
            out[k] = noop;
            return;
        }
        var type = types[k];
        out[k] = function (arg, msg) {
            if (!type.check(arg)) {
                _toss(msg, k, type.operator, arg, type.actual);
            }
        };
    });

    /* optional checks */
    keys.forEach(function (k) {
        var name = 'optional' + _capitalize(k);
        if (ndebug) {
            out[name] = noop;
            return;
        }
        var type = types[k];
        out[name] = function (arg, msg) {
            if (arg === undefined || arg === null) {
                return;
            }
            if (!type.check(arg)) {
                _toss(msg, k, type.operator, arg, type.actual);
            }
        };
    });

    /* arrayOf checks */
    keys.forEach(function (k) {
        var name = 'arrayOf' + _capitalize(k);
        if (ndebug) {
            out[name] = noop;
            return;
        }
        var type = types[k];
        var expected = '[' + k + ']';
        out[name] = function (arg, msg) {
            if (!Array.isArray(arg)) {
                _toss(msg, expected, type.operator, arg, type.actual);
            }
            var i;
            for (i = 0; i < arg.length; i++) {
                if (!type.check(arg[i])) {
                    _toss(msg, expected, type.operator, arg, type.actual);
                }
            }
        };
    });

    /* optionalArrayOf checks */
    keys.forEach(function (k) {
        var name = 'optionalArrayOf' + _capitalize(k);
        if (ndebug) {
            out[name] = noop;
            return;
        }
        var type = types[k];
        var expected = '[' + k + ']';
        out[name] = function (arg, msg) {
            if (arg === undefined || arg === null) {
                return;
            }
            if (!Array.isArray(arg)) {
                _toss(msg, expected, type.operator, arg, type.actual);
            }
            var i;
            for (i = 0; i < arg.length; i++) {
                if (!type.check(arg[i])) {
                    _toss(msg, expected, type.operator, arg, type.actual);
                }
            }
        };
    });

    /* re-export built-in assertions */
    Object.keys(assert).forEach(function (k) {
        if (k === 'AssertionError') {
            out[k] = assert[k];
            return;
        }
        if (ndebug) {
            out[k] = noop;
            return;
        }
        out[k] = assert[k];
    });

    /* export ourselves (for unit tests _only_) */
    out._setExports = _setExports;

    return out;
}

module.exports = _setExports(process.env.NODE_NDEBUG);


/***/ }),

/***/ 5447:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var crypto_hash_sha512 = __nccwpck_require__(8729).lowlevel.crypto_hash;

/*
 * This file is a 1:1 port from the OpenBSD blowfish.c and bcrypt_pbkdf.c. As a
 * result, it retains the original copyright and license. The two files are
 * under slightly different (but compatible) licenses, and are here combined in
 * one file.
 *
 * Credit for the actual porting work goes to:
 *  Devi Mandiri <me@devi.web.id>
 */

/*
 * The Blowfish portions are under the following license:
 *
 * Blowfish block cipher for OpenBSD
 * Copyright 1997 Niels Provos <provos@physnet.uni-hamburg.de>
 * All rights reserved.
 *
 * Implementation advice by David Mazieres <dm@lcs.mit.edu>.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products
 *    derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * The bcrypt_pbkdf portions are under the following license:
 *
 * Copyright (c) 2013 Ted Unangst <tedu@openbsd.org>
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/*
 * Performance improvements (Javascript-specific):
 *
 * Copyright 2016, Joyent Inc
 * Author: Alex Wilson <alex.wilson@joyent.com>
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

// Ported from OpenBSD bcrypt_pbkdf.c v1.9

var BLF_J = 0;

var Blowfish = function() {
  this.S = [
    new Uint32Array([
      0xd1310ba6, 0x98dfb5ac, 0x2ffd72db, 0xd01adfb7,
      0xb8e1afed, 0x6a267e96, 0xba7c9045, 0xf12c7f99,
      0x24a19947, 0xb3916cf7, 0x0801f2e2, 0x858efc16,
      0x636920d8, 0x71574e69, 0xa458fea3, 0xf4933d7e,
      0x0d95748f, 0x728eb658, 0x718bcd58, 0x82154aee,
      0x7b54a41d, 0xc25a59b5, 0x9c30d539, 0x2af26013,
      0xc5d1b023, 0x286085f0, 0xca417918, 0xb8db38ef,
      0x8e79dcb0, 0x603a180e, 0x6c9e0e8b, 0xb01e8a3e,
      0xd71577c1, 0xbd314b27, 0x78af2fda, 0x55605c60,
      0xe65525f3, 0xaa55ab94, 0x57489862, 0x63e81440,
      0x55ca396a, 0x2aab10b6, 0xb4cc5c34, 0x1141e8ce,
      0xa15486af, 0x7c72e993, 0xb3ee1411, 0x636fbc2a,
      0x2ba9c55d, 0x741831f6, 0xce5c3e16, 0x9b87931e,
      0xafd6ba33, 0x6c24cf5c, 0x7a325381, 0x28958677,
      0x3b8f4898, 0x6b4bb9af, 0xc4bfe81b, 0x66282193,
      0x61d809cc, 0xfb21a991, 0x487cac60, 0x5dec8032,
      0xef845d5d, 0xe98575b1, 0xdc262302, 0xeb651b88,
      0x23893e81, 0xd396acc5, 0x0f6d6ff3, 0x83f44239,
      0x2e0b4482, 0xa4842004, 0x69c8f04a, 0x9e1f9b5e,
      0x21c66842, 0xf6e96c9a, 0x670c9c61, 0xabd388f0,
      0x6a51a0d2, 0xd8542f68, 0x960fa728, 0xab5133a3,
      0x6eef0b6c, 0x137a3be4, 0xba3bf050, 0x7efb2a98,
      0xa1f1651d, 0x39af0176, 0x66ca593e, 0x82430e88,
      0x8cee8619, 0x456f9fb4, 0x7d84a5c3, 0x3b8b5ebe,
      0xe06f75d8, 0x85c12073, 0x401a449f, 0x56c16aa6,
      0x4ed3aa62, 0x363f7706, 0x1bfedf72, 0x429b023d,
      0x37d0d724, 0xd00a1248, 0xdb0fead3, 0x49f1c09b,
      0x075372c9, 0x80991b7b, 0x25d479d8, 0xf6e8def7,
      0xe3fe501a, 0xb6794c3b, 0x976ce0bd, 0x04c006ba,
      0xc1a94fb6, 0x409f60c4, 0x5e5c9ec2, 0x196a2463,
      0x68fb6faf, 0x3e6c53b5, 0x1339b2eb, 0x3b52ec6f,
      0x6dfc511f, 0x9b30952c, 0xcc814544, 0xaf5ebd09,
      0xbee3d004, 0xde334afd, 0x660f2807, 0x192e4bb3,
      0xc0cba857, 0x45c8740f, 0xd20b5f39, 0xb9d3fbdb,
      0x5579c0bd, 0x1a60320a, 0xd6a100c6, 0x402c7279,
      0x679f25fe, 0xfb1fa3cc, 0x8ea5e9f8, 0xdb3222f8,
      0x3c7516df, 0xfd616b15, 0x2f501ec8, 0xad0552ab,
      0x323db5fa, 0xfd238760, 0x53317b48, 0x3e00df82,
      0x9e5c57bb, 0xca6f8ca0, 0x1a87562e, 0xdf1769db,
      0xd542a8f6, 0x287effc3, 0xac6732c6, 0x8c4f5573,
      0x695b27b0, 0xbbca58c8, 0xe1ffa35d, 0xb8f011a0,
      0x10fa3d98, 0xfd2183b8, 0x4afcb56c, 0x2dd1d35b,
      0x9a53e479, 0xb6f84565, 0xd28e49bc, 0x4bfb9790,
      0xe1ddf2da, 0xa4cb7e33, 0x62fb1341, 0xcee4c6e8,
      0xef20cada, 0x36774c01, 0xd07e9efe, 0x2bf11fb4,
      0x95dbda4d, 0xae909198, 0xeaad8e71, 0x6b93d5a0,
      0xd08ed1d0, 0xafc725e0, 0x8e3c5b2f, 0x8e7594b7,
      0x8ff6e2fb, 0xf2122b64, 0x8888b812, 0x900df01c,
      0x4fad5ea0, 0x688fc31c, 0xd1cff191, 0xb3a8c1ad,
      0x2f2f2218, 0xbe0e1777, 0xea752dfe, 0x8b021fa1,
      0xe5a0cc0f, 0xb56f74e8, 0x18acf3d6, 0xce89e299,
      0xb4a84fe0, 0xfd13e0b7, 0x7cc43b81, 0xd2ada8d9,
      0x165fa266, 0x80957705, 0x93cc7314, 0x211a1477,
      0xe6ad2065, 0x77b5fa86, 0xc75442f5, 0xfb9d35cf,
      0xebcdaf0c, 0x7b3e89a0, 0xd6411bd3, 0xae1e7e49,
      0x00250e2d, 0x2071b35e, 0x226800bb, 0x57b8e0af,
      0x2464369b, 0xf009b91e, 0x5563911d, 0x59dfa6aa,
      0x78c14389, 0xd95a537f, 0x207d5ba2, 0x02e5b9c5,
      0x83260376, 0x6295cfa9, 0x11c81968, 0x4e734a41,
      0xb3472dca, 0x7b14a94a, 0x1b510052, 0x9a532915,
      0xd60f573f, 0xbc9bc6e4, 0x2b60a476, 0x81e67400,
      0x08ba6fb5, 0x571be91f, 0xf296ec6b, 0x2a0dd915,
      0xb6636521, 0xe7b9f9b6, 0xff34052e, 0xc5855664,
      0x53b02d5d, 0xa99f8fa1, 0x08ba4799, 0x6e85076a]),
    new Uint32Array([
      0x4b7a70e9, 0xb5b32944, 0xdb75092e, 0xc4192623,
      0xad6ea6b0, 0x49a7df7d, 0x9cee60b8, 0x8fedb266,
      0xecaa8c71, 0x699a17ff, 0x5664526c, 0xc2b19ee1,
      0x193602a5, 0x75094c29, 0xa0591340, 0xe4183a3e,
      0x3f54989a, 0x5b429d65, 0x6b8fe4d6, 0x99f73fd6,
      0xa1d29c07, 0xefe830f5, 0x4d2d38e6, 0xf0255dc1,
      0x4cdd2086, 0x8470eb26, 0x6382e9c6, 0x021ecc5e,
      0x09686b3f, 0x3ebaefc9, 0x3c971814, 0x6b6a70a1,
      0x687f3584, 0x52a0e286, 0xb79c5305, 0xaa500737,
      0x3e07841c, 0x7fdeae5c, 0x8e7d44ec, 0x5716f2b8,
      0xb03ada37, 0xf0500c0d, 0xf01c1f04, 0x0200b3ff,
      0xae0cf51a, 0x3cb574b2, 0x25837a58, 0xdc0921bd,
      0xd19113f9, 0x7ca92ff6, 0x94324773, 0x22f54701,
      0x3ae5e581, 0x37c2dadc, 0xc8b57634, 0x9af3dda7,
      0xa9446146, 0x0fd0030e, 0xecc8c73e, 0xa4751e41,
      0xe238cd99, 0x3bea0e2f, 0x3280bba1, 0x183eb331,
      0x4e548b38, 0x4f6db908, 0x6f420d03, 0xf60a04bf,
      0x2cb81290, 0x24977c79, 0x5679b072, 0xbcaf89af,
      0xde9a771f, 0xd9930810, 0xb38bae12, 0xdccf3f2e,
      0x5512721f, 0x2e6b7124, 0x501adde6, 0x9f84cd87,
      0x7a584718, 0x7408da17, 0xbc9f9abc, 0xe94b7d8c,
      0xec7aec3a, 0xdb851dfa, 0x63094366, 0xc464c3d2,
      0xef1c1847, 0x3215d908, 0xdd433b37, 0x24c2ba16,
      0x12a14d43, 0x2a65c451, 0x50940002, 0x133ae4dd,
      0x71dff89e, 0x10314e55, 0x81ac77d6, 0x5f11199b,
      0x043556f1, 0xd7a3c76b, 0x3c11183b, 0x5924a509,
      0xf28fe6ed, 0x97f1fbfa, 0x9ebabf2c, 0x1e153c6e,
      0x86e34570, 0xeae96fb1, 0x860e5e0a, 0x5a3e2ab3,
      0x771fe71c, 0x4e3d06fa, 0x2965dcb9, 0x99e71d0f,
      0x803e89d6, 0x5266c825, 0x2e4cc978, 0x9c10b36a,
      0xc6150eba, 0x94e2ea78, 0xa5fc3c53, 0x1e0a2df4,
      0xf2f74ea7, 0x361d2b3d, 0x1939260f, 0x19c27960,
      0x5223a708, 0xf71312b6, 0xebadfe6e, 0xeac31f66,
      0xe3bc4595, 0xa67bc883, 0xb17f37d1, 0x018cff28,
      0xc332ddef, 0xbe6c5aa5, 0x65582185, 0x68ab9802,
      0xeecea50f, 0xdb2f953b, 0x2aef7dad, 0x5b6e2f84,
      0x1521b628, 0x29076170, 0xecdd4775, 0x619f1510,
      0x13cca830, 0xeb61bd96, 0x0334fe1e, 0xaa0363cf,
      0xb5735c90, 0x4c70a239, 0xd59e9e0b, 0xcbaade14,
      0xeecc86bc, 0x60622ca7, 0x9cab5cab, 0xb2f3846e,
      0x648b1eaf, 0x19bdf0ca, 0xa02369b9, 0x655abb50,
      0x40685a32, 0x3c2ab4b3, 0x319ee9d5, 0xc021b8f7,
      0x9b540b19, 0x875fa099, 0x95f7997e, 0x623d7da8,
      0xf837889a, 0x97e32d77, 0x11ed935f, 0x16681281,
      0x0e358829, 0xc7e61fd6, 0x96dedfa1, 0x7858ba99,
      0x57f584a5, 0x1b227263, 0x9b83c3ff, 0x1ac24696,
      0xcdb30aeb, 0x532e3054, 0x8fd948e4, 0x6dbc3128,
      0x58ebf2ef, 0x34c6ffea, 0xfe28ed61, 0xee7c3c73,
      0x5d4a14d9, 0xe864b7e3, 0x42105d14, 0x203e13e0,
      0x45eee2b6, 0xa3aaabea, 0xdb6c4f15, 0xfacb4fd0,
      0xc742f442, 0xef6abbb5, 0x654f3b1d, 0x41cd2105,
      0xd81e799e, 0x86854dc7, 0xe44b476a, 0x3d816250,
      0xcf62a1f2, 0x5b8d2646, 0xfc8883a0, 0xc1c7b6a3,
      0x7f1524c3, 0x69cb7492, 0x47848a0b, 0x5692b285,
      0x095bbf00, 0xad19489d, 0x1462b174, 0x23820e00,
      0x58428d2a, 0x0c55f5ea, 0x1dadf43e, 0x233f7061,
      0x3372f092, 0x8d937e41, 0xd65fecf1, 0x6c223bdb,
      0x7cde3759, 0xcbee7460, 0x4085f2a7, 0xce77326e,
      0xa6078084, 0x19f8509e, 0xe8efd855, 0x61d99735,
      0xa969a7aa, 0xc50c06c2, 0x5a04abfc, 0x800bcadc,
      0x9e447a2e, 0xc3453484, 0xfdd56705, 0x0e1e9ec9,
      0xdb73dbd3, 0x105588cd, 0x675fda79, 0xe3674340,
      0xc5c43465, 0x713e38d8, 0x3d28f89e, 0xf16dff20,
      0x153e21e7, 0x8fb03d4a, 0xe6e39f2b, 0xdb83adf7]),
    new Uint32Array([
      0xe93d5a68, 0x948140f7, 0xf64c261c, 0x94692934,
      0x411520f7, 0x7602d4f7, 0xbcf46b2e, 0xd4a20068,
      0xd4082471, 0x3320f46a, 0x43b7d4b7, 0x500061af,
      0x1e39f62e, 0x97244546, 0x14214f74, 0xbf8b8840,
      0x4d95fc1d, 0x96b591af, 0x70f4ddd3, 0x66a02f45,
      0xbfbc09ec, 0x03bd9785, 0x7fac6dd0, 0x31cb8504,
      0x96eb27b3, 0x55fd3941, 0xda2547e6, 0xabca0a9a,
      0x28507825, 0x530429f4, 0x0a2c86da, 0xe9b66dfb,
      0x68dc1462, 0xd7486900, 0x680ec0a4, 0x27a18dee,
      0x4f3ffea2, 0xe887ad8c, 0xb58ce006, 0x7af4d6b6,
      0xaace1e7c, 0xd3375fec, 0xce78a399, 0x406b2a42,
      0x20fe9e35, 0xd9f385b9, 0xee39d7ab, 0x3b124e8b,
      0x1dc9faf7, 0x4b6d1856, 0x26a36631, 0xeae397b2,
      0x3a6efa74, 0xdd5b4332, 0x6841e7f7, 0xca7820fb,
      0xfb0af54e, 0xd8feb397, 0x454056ac, 0xba489527,
      0x55533a3a, 0x20838d87, 0xfe6ba9b7, 0xd096954b,
      0x55a867bc, 0xa1159a58, 0xcca92963, 0x99e1db33,
      0xa62a4a56, 0x3f3125f9, 0x5ef47e1c, 0x9029317c,
      0xfdf8e802, 0x04272f70, 0x80bb155c, 0x05282ce3,
      0x95c11548, 0xe4c66d22, 0x48c1133f, 0xc70f86dc,
      0x07f9c9ee, 0x41041f0f, 0x404779a4, 0x5d886e17,
      0x325f51eb, 0xd59bc0d1, 0xf2bcc18f, 0x41113564,
      0x257b7834, 0x602a9c60, 0xdff8e8a3, 0x1f636c1b,
      0x0e12b4c2, 0x02e1329e, 0xaf664fd1, 0xcad18115,
      0x6b2395e0, 0x333e92e1, 0x3b240b62, 0xeebeb922,
      0x85b2a20e, 0xe6ba0d99, 0xde720c8c, 0x2da2f728,
      0xd0127845, 0x95b794fd, 0x647d0862, 0xe7ccf5f0,
      0x5449a36f, 0x877d48fa, 0xc39dfd27, 0xf33e8d1e,
      0x0a476341, 0x992eff74, 0x3a6f6eab, 0xf4f8fd37,
      0xa812dc60, 0xa1ebddf8, 0x991be14c, 0xdb6e6b0d,
      0xc67b5510, 0x6d672c37, 0x2765d43b, 0xdcd0e804,
      0xf1290dc7, 0xcc00ffa3, 0xb5390f92, 0x690fed0b,
      0x667b9ffb, 0xcedb7d9c, 0xa091cf0b, 0xd9155ea3,
      0xbb132f88, 0x515bad24, 0x7b9479bf, 0x763bd6eb,
      0x37392eb3, 0xcc115979, 0x8026e297, 0xf42e312d,
      0x6842ada7, 0xc66a2b3b, 0x12754ccc, 0x782ef11c,
      0x6a124237, 0xb79251e7, 0x06a1bbe6, 0x4bfb6350,
      0x1a6b1018, 0x11caedfa, 0x3d25bdd8, 0xe2e1c3c9,
      0x44421659, 0x0a121386, 0xd90cec6e, 0xd5abea2a,
      0x64af674e, 0xda86a85f, 0xbebfe988, 0x64e4c3fe,
      0x9dbc8057, 0xf0f7c086, 0x60787bf8, 0x6003604d,
      0xd1fd8346, 0xf6381fb0, 0x7745ae04, 0xd736fccc,
      0x83426b33, 0xf01eab71, 0xb0804187, 0x3c005e5f,
      0x77a057be, 0xbde8ae24, 0x55464299, 0xbf582e61,
      0x4e58f48f, 0xf2ddfda2, 0xf474ef38, 0x8789bdc2,
      0x5366f9c3, 0xc8b38e74, 0xb475f255, 0x46fcd9b9,
      0x7aeb2661, 0x8b1ddf84, 0x846a0e79, 0x915f95e2,
      0x466e598e, 0x20b45770, 0x8cd55591, 0xc902de4c,
      0xb90bace1, 0xbb8205d0, 0x11a86248, 0x7574a99e,
      0xb77f19b6, 0xe0a9dc09, 0x662d09a1, 0xc4324633,
      0xe85a1f02, 0x09f0be8c, 0x4a99a025, 0x1d6efe10,
      0x1ab93d1d, 0x0ba5a4df, 0xa186f20f, 0x2868f169,
      0xdcb7da83, 0x573906fe, 0xa1e2ce9b, 0x4fcd7f52,
      0x50115e01, 0xa70683fa, 0xa002b5c4, 0x0de6d027,
      0x9af88c27, 0x773f8641, 0xc3604c06, 0x61a806b5,
      0xf0177a28, 0xc0f586e0, 0x006058aa, 0x30dc7d62,
      0x11e69ed7, 0x2338ea63, 0x53c2dd94, 0xc2c21634,
      0xbbcbee56, 0x90bcb6de, 0xebfc7da1, 0xce591d76,
      0x6f05e409, 0x4b7c0188, 0x39720a3d, 0x7c927c24,
      0x86e3725f, 0x724d9db9, 0x1ac15bb4, 0xd39eb8fc,
      0xed545578, 0x08fca5b5, 0xd83d7cd3, 0x4dad0fc4,
      0x1e50ef5e, 0xb161e6f8, 0xa28514d9, 0x6c51133c,
      0x6fd5c7e7, 0x56e14ec4, 0x362abfce, 0xddc6c837,
      0xd79a3234, 0x92638212, 0x670efa8e, 0x406000e0]),
    new Uint32Array([
      0x3a39ce37, 0xd3faf5cf, 0xabc27737, 0x5ac52d1b,
      0x5cb0679e, 0x4fa33742, 0xd3822740, 0x99bc9bbe,
      0xd5118e9d, 0xbf0f7315, 0xd62d1c7e, 0xc700c47b,
      0xb78c1b6b, 0x21a19045, 0xb26eb1be, 0x6a366eb4,
      0x5748ab2f, 0xbc946e79, 0xc6a376d2, 0x6549c2c8,
      0x530ff8ee, 0x468dde7d, 0xd5730a1d, 0x4cd04dc6,
      0x2939bbdb, 0xa9ba4650, 0xac9526e8, 0xbe5ee304,
      0xa1fad5f0, 0x6a2d519a, 0x63ef8ce2, 0x9a86ee22,
      0xc089c2b8, 0x43242ef6, 0xa51e03aa, 0x9cf2d0a4,
      0x83c061ba, 0x9be96a4d, 0x8fe51550, 0xba645bd6,
      0x2826a2f9, 0xa73a3ae1, 0x4ba99586, 0xef5562e9,
      0xc72fefd3, 0xf752f7da, 0x3f046f69, 0x77fa0a59,
      0x80e4a915, 0x87b08601, 0x9b09e6ad, 0x3b3ee593,
      0xe990fd5a, 0x9e34d797, 0x2cf0b7d9, 0x022b8b51,
      0x96d5ac3a, 0x017da67d, 0xd1cf3ed6, 0x7c7d2d28,
      0x1f9f25cf, 0xadf2b89b, 0x5ad6b472, 0x5a88f54c,
      0xe029ac71, 0xe019a5e6, 0x47b0acfd, 0xed93fa9b,
      0xe8d3c48d, 0x283b57cc, 0xf8d56629, 0x79132e28,
      0x785f0191, 0xed756055, 0xf7960e44, 0xe3d35e8c,
      0x15056dd4, 0x88f46dba, 0x03a16125, 0x0564f0bd,
      0xc3eb9e15, 0x3c9057a2, 0x97271aec, 0xa93a072a,
      0x1b3f6d9b, 0x1e6321f5, 0xf59c66fb, 0x26dcf319,
      0x7533d928, 0xb155fdf5, 0x03563482, 0x8aba3cbb,
      0x28517711, 0xc20ad9f8, 0xabcc5167, 0xccad925f,
      0x4de81751, 0x3830dc8e, 0x379d5862, 0x9320f991,
      0xea7a90c2, 0xfb3e7bce, 0x5121ce64, 0x774fbe32,
      0xa8b6e37e, 0xc3293d46, 0x48de5369, 0x6413e680,
      0xa2ae0810, 0xdd6db224, 0x69852dfd, 0x09072166,
      0xb39a460a, 0x6445c0dd, 0x586cdecf, 0x1c20c8ae,
      0x5bbef7dd, 0x1b588d40, 0xccd2017f, 0x6bb4e3bb,
      0xdda26a7e, 0x3a59ff45, 0x3e350a44, 0xbcb4cdd5,
      0x72eacea8, 0xfa6484bb, 0x8d6612ae, 0xbf3c6f47,
      0xd29be463, 0x542f5d9e, 0xaec2771b, 0xf64e6370,
      0x740e0d8d, 0xe75b1357, 0xf8721671, 0xaf537d5d,
      0x4040cb08, 0x4eb4e2cc, 0x34d2466a, 0x0115af84,
      0xe1b00428, 0x95983a1d, 0x06b89fb4, 0xce6ea048,
      0x6f3f3b82, 0x3520ab82, 0x011a1d4b, 0x277227f8,
      0x611560b1, 0xe7933fdc, 0xbb3a792b, 0x344525bd,
      0xa08839e1, 0x51ce794b, 0x2f32c9b7, 0xa01fbac9,
      0xe01cc87e, 0xbcc7d1f6, 0xcf0111c3, 0xa1e8aac7,
      0x1a908749, 0xd44fbd9a, 0xd0dadecb, 0xd50ada38,
      0x0339c32a, 0xc6913667, 0x8df9317c, 0xe0b12b4f,
      0xf79e59b7, 0x43f5bb3a, 0xf2d519ff, 0x27d9459c,
      0xbf97222c, 0x15e6fc2a, 0x0f91fc71, 0x9b941525,
      0xfae59361, 0xceb69ceb, 0xc2a86459, 0x12baa8d1,
      0xb6c1075e, 0xe3056a0c, 0x10d25065, 0xcb03a442,
      0xe0ec6e0e, 0x1698db3b, 0x4c98a0be, 0x3278e964,
      0x9f1f9532, 0xe0d392df, 0xd3a0342b, 0x8971f21e,
      0x1b0a7441, 0x4ba3348c, 0xc5be7120, 0xc37632d8,
      0xdf359f8d, 0x9b992f2e, 0xe60b6f47, 0x0fe3f11d,
      0xe54cda54, 0x1edad891, 0xce6279cf, 0xcd3e7e6f,
      0x1618b166, 0xfd2c1d05, 0x848fd2c5, 0xf6fb2299,
      0xf523f357, 0xa6327623, 0x93a83531, 0x56cccd02,
      0xacf08162, 0x5a75ebb5, 0x6e163697, 0x88d273cc,
      0xde966292, 0x81b949d0, 0x4c50901b, 0x71c65614,
      0xe6c6c7bd, 0x327a140a, 0x45e1d006, 0xc3f27b9a,
      0xc9aa53fd, 0x62a80f00, 0xbb25bfe2, 0x35bdd2f6,
      0x71126905, 0xb2040222, 0xb6cbcf7c, 0xcd769c2b,
      0x53113ec0, 0x1640e3d3, 0x38abbd60, 0x2547adf0,
      0xba38209c, 0xf746ce76, 0x77afa1c5, 0x20756060,
      0x85cbfe4e, 0x8ae88dd8, 0x7aaaf9b0, 0x4cf9aa7e,
      0x1948c25c, 0x02fb8a8c, 0x01c36ae4, 0xd6ebe1f9,
      0x90d4f869, 0xa65cdea0, 0x3f09252d, 0xc208e69f,
      0xb74e6132, 0xce77e25b, 0x578fdfe3, 0x3ac372e6])
    ];
  this.P = new Uint32Array([
    0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344,
    0xa4093822, 0x299f31d0, 0x082efa98, 0xec4e6c89,
    0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c,
    0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917,
    0x9216d5d9, 0x8979fb1b]);
};

function F(S, x8, i) {
  return (((S[0][x8[i+3]] +
            S[1][x8[i+2]]) ^
            S[2][x8[i+1]]) +
            S[3][x8[i]]);
};

Blowfish.prototype.encipher = function(x, x8) {
  if (x8 === undefined) {
    x8 = new Uint8Array(x.buffer);
    if (x.byteOffset !== 0)
      x8 = x8.subarray(x.byteOffset);
  }
  x[0] ^= this.P[0];
  for (var i = 1; i < 16; i += 2) {
    x[1] ^= F(this.S, x8, 0) ^ this.P[i];
    x[0] ^= F(this.S, x8, 4) ^ this.P[i+1];
  }
  var t = x[0];
  x[0] = x[1] ^ this.P[17];
  x[1] = t;
};

Blowfish.prototype.decipher = function(x) {
  var x8 = new Uint8Array(x.buffer);
  if (x.byteOffset !== 0)
    x8 = x8.subarray(x.byteOffset);
  x[0] ^= this.P[17];
  for (var i = 16; i > 0; i -= 2) {
    x[1] ^= F(this.S, x8, 0) ^ this.P[i];
    x[0] ^= F(this.S, x8, 4) ^ this.P[i-1];
  }
  var t = x[0];
  x[0] = x[1] ^ this.P[0];
  x[1] = t;
};

function stream2word(data, databytes){
  var i, temp = 0;
  for (i = 0; i < 4; i++, BLF_J++) {
    if (BLF_J >= databytes) BLF_J = 0;
    temp = (temp << 8) | data[BLF_J];
  }
  return temp;
};

Blowfish.prototype.expand0state = function(key, keybytes) {
  var d = new Uint32Array(2), i, k;
  var d8 = new Uint8Array(d.buffer);

  for (i = 0, BLF_J = 0; i < 18; i++) {
    this.P[i] ^= stream2word(key, keybytes);
  }
  BLF_J = 0;

  for (i = 0; i < 18; i += 2) {
    this.encipher(d, d8);
    this.P[i]   = d[0];
    this.P[i+1] = d[1];
  }

  for (i = 0; i < 4; i++) {
    for (k = 0; k < 256; k += 2) {
      this.encipher(d, d8);
      this.S[i][k]   = d[0];
      this.S[i][k+1] = d[1];
    }
  }
};

Blowfish.prototype.expandstate = function(data, databytes, key, keybytes) {
  var d = new Uint32Array(2), i, k;

  for (i = 0, BLF_J = 0; i < 18; i++) {
    this.P[i] ^= stream2word(key, keybytes);
  }

  for (i = 0, BLF_J = 0; i < 18; i += 2) {
    d[0] ^= stream2word(data, databytes);
    d[1] ^= stream2word(data, databytes);
    this.encipher(d);
    this.P[i]   = d[0];
    this.P[i+1] = d[1];
  }

  for (i = 0; i < 4; i++) {
    for (k = 0; k < 256; k += 2) {
      d[0] ^= stream2word(data, databytes);
      d[1] ^= stream2word(data, databytes);
      this.encipher(d);
      this.S[i][k]   = d[0];
      this.S[i][k+1] = d[1];
    }
  }
  BLF_J = 0;
};

Blowfish.prototype.enc = function(data, blocks) {
  for (var i = 0; i < blocks; i++) {
    this.encipher(data.subarray(i*2));
  }
};

Blowfish.prototype.dec = function(data, blocks) {
  for (var i = 0; i < blocks; i++) {
    this.decipher(data.subarray(i*2));
  }
};

var BCRYPT_BLOCKS = 8,
    BCRYPT_HASHSIZE = 32;

function bcrypt_hash(sha2pass, sha2salt, out) {
  var state = new Blowfish(),
      cdata = new Uint32Array(BCRYPT_BLOCKS), i,
      ciphertext = new Uint8Array([79,120,121,99,104,114,111,109,97,116,105,
            99,66,108,111,119,102,105,115,104,83,119,97,116,68,121,110,97,109,
            105,116,101]); //"OxychromaticBlowfishSwatDynamite"

  state.expandstate(sha2salt, 64, sha2pass, 64);
  for (i = 0; i < 64; i++) {
    state.expand0state(sha2salt, 64);
    state.expand0state(sha2pass, 64);
  }

  for (i = 0; i < BCRYPT_BLOCKS; i++)
    cdata[i] = stream2word(ciphertext, ciphertext.byteLength);
  for (i = 0; i < 64; i++)
    state.enc(cdata, cdata.byteLength / 8);

  for (i = 0; i < BCRYPT_BLOCKS; i++) {
    out[4*i+3] = cdata[i] >>> 24;
    out[4*i+2] = cdata[i] >>> 16;
    out[4*i+1] = cdata[i] >>> 8;
    out[4*i+0] = cdata[i];
  }
};

function bcrypt_pbkdf(pass, passlen, salt, saltlen, key, keylen, rounds) {
  var sha2pass = new Uint8Array(64),
      sha2salt = new Uint8Array(64),
      out = new Uint8Array(BCRYPT_HASHSIZE),
      tmpout = new Uint8Array(BCRYPT_HASHSIZE),
      countsalt = new Uint8Array(saltlen+4),
      i, j, amt, stride, dest, count,
      origkeylen = keylen;

  if (rounds < 1)
    return -1;
  if (passlen === 0 || saltlen === 0 || keylen === 0 ||
      keylen > (out.byteLength * out.byteLength) || saltlen > (1<<20))
    return -1;

  stride = Math.floor((keylen + out.byteLength - 1) / out.byteLength);
  amt = Math.floor((keylen + stride - 1) / stride);

  for (i = 0; i < saltlen; i++)
    countsalt[i] = salt[i];

  crypto_hash_sha512(sha2pass, pass, passlen);

  for (count = 1; keylen > 0; count++) {
    countsalt[saltlen+0] = count >>> 24;
    countsalt[saltlen+1] = count >>> 16;
    countsalt[saltlen+2] = count >>>  8;
    countsalt[saltlen+3] = count;

    crypto_hash_sha512(sha2salt, countsalt, saltlen + 4);
    bcrypt_hash(sha2pass, sha2salt, tmpout);
    for (i = out.byteLength; i--;)
      out[i] = tmpout[i];

    for (i = 1; i < rounds; i++) {
      crypto_hash_sha512(sha2salt, tmpout, tmpout.byteLength);
      bcrypt_hash(sha2pass, sha2salt, tmpout);
      for (j = 0; j < out.byteLength; j++)
        out[j] ^= tmpout[j];
    }

    amt = Math.min(amt, keylen);
    for (i = 0; i < amt; i++) {
      dest = i * stride + (count - 1);
      if (dest >= origkeylen)
        break;
      key[dest] = out[i];
    }
    keylen -= i;
  }

  return 0;
};

module.exports = {
      BLOCKS: BCRYPT_BLOCKS,
      HASHSIZE: BCRYPT_HASHSIZE,
      hash: bcrypt_hash,
      pbkdf: bcrypt_pbkdf
};


/***/ }),

/***/ 9865:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

var crypto = __nccwpck_require__(6417);
var BigInteger = __nccwpck_require__(5587).BigInteger;
var ECPointFp = __nccwpck_require__(3943).ECPointFp;
var Buffer = __nccwpck_require__(5118).Buffer;
exports.ECCurves = __nccwpck_require__(1452);

// zero prepad
function unstupid(hex,len)
{
	return (hex.length >= len) ? hex : unstupid("0"+hex,len);
}

exports.ECKey = function(curve, key, isPublic)
{
  var priv;
	var c = curve();
	var n = c.getN();
  var bytes = Math.floor(n.bitLength()/8);

  if(key)
  {
    if(isPublic)
    {
      var curve = c.getCurve();
//      var x = key.slice(1,bytes+1); // skip the 04 for uncompressed format
//      var y = key.slice(bytes+1);
//      this.P = new ECPointFp(curve,
//        curve.fromBigInteger(new BigInteger(x.toString("hex"), 16)),
//        curve.fromBigInteger(new BigInteger(y.toString("hex"), 16)));      
      this.P = curve.decodePointHex(key.toString("hex"));
    }else{
      if(key.length != bytes) return false;
      priv = new BigInteger(key.toString("hex"), 16);      
    }
  }else{
    var n1 = n.subtract(BigInteger.ONE);
    var r = new BigInteger(crypto.randomBytes(n.bitLength()));
    priv = r.mod(n1).add(BigInteger.ONE);
    this.P = c.getG().multiply(priv);
  }
  if(this.P)
  {
//  var pubhex = unstupid(this.P.getX().toBigInteger().toString(16),bytes*2)+unstupid(this.P.getY().toBigInteger().toString(16),bytes*2);
//  this.PublicKey = Buffer.from("04"+pubhex,"hex");
    this.PublicKey = Buffer.from(c.getCurve().encodeCompressedPointHex(this.P),"hex");
  }
  if(priv)
  {
    this.PrivateKey = Buffer.from(unstupid(priv.toString(16),bytes*2),"hex");
    this.deriveSharedSecret = function(key)
    {
      if(!key || !key.P) return false;
      var S = key.P.multiply(priv);
      return Buffer.from(unstupid(S.getX().toBigInteger().toString(16),bytes*2),"hex");
   }     
  }
}



/***/ }),

/***/ 3943:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Basic Javascript Elliptic Curve implementation
// Ported loosely from BouncyCastle's Java EC code
// Only Fp curves implemented for now

// Requires jsbn.js and jsbn2.js
var BigInteger = __nccwpck_require__(5587).BigInteger
var Barrett = BigInteger.prototype.Barrett

// ----------------
// ECFieldElementFp

// constructor
function ECFieldElementFp(q,x) {
    this.x = x;
    // TODO if(x.compareTo(q) >= 0) error
    this.q = q;
}

function feFpEquals(other) {
    if(other == this) return true;
    return (this.q.equals(other.q) && this.x.equals(other.x));
}

function feFpToBigInteger() {
    return this.x;
}

function feFpNegate() {
    return new ECFieldElementFp(this.q, this.x.negate().mod(this.q));
}

function feFpAdd(b) {
    return new ECFieldElementFp(this.q, this.x.add(b.toBigInteger()).mod(this.q));
}

function feFpSubtract(b) {
    return new ECFieldElementFp(this.q, this.x.subtract(b.toBigInteger()).mod(this.q));
}

function feFpMultiply(b) {
    return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger()).mod(this.q));
}

function feFpSquare() {
    return new ECFieldElementFp(this.q, this.x.square().mod(this.q));
}

function feFpDivide(b) {
    return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger().modInverse(this.q)).mod(this.q));
}

ECFieldElementFp.prototype.equals = feFpEquals;
ECFieldElementFp.prototype.toBigInteger = feFpToBigInteger;
ECFieldElementFp.prototype.negate = feFpNegate;
ECFieldElementFp.prototype.add = feFpAdd;
ECFieldElementFp.prototype.subtract = feFpSubtract;
ECFieldElementFp.prototype.multiply = feFpMultiply;
ECFieldElementFp.prototype.square = feFpSquare;
ECFieldElementFp.prototype.divide = feFpDivide;

// ----------------
// ECPointFp

// constructor
function ECPointFp(curve,x,y,z) {
    this.curve = curve;
    this.x = x;
    this.y = y;
    // Projective coordinates: either zinv == null or z * zinv == 1
    // z and zinv are just BigIntegers, not fieldElements
    if(z == null) {
      this.z = BigInteger.ONE;
    }
    else {
      this.z = z;
    }
    this.zinv = null;
    //TODO: compression flag
}

function pointFpGetX() {
    if(this.zinv == null) {
      this.zinv = this.z.modInverse(this.curve.q);
    }
    var r = this.x.toBigInteger().multiply(this.zinv);
    this.curve.reduce(r);
    return this.curve.fromBigInteger(r);
}

function pointFpGetY() {
    if(this.zinv == null) {
      this.zinv = this.z.modInverse(this.curve.q);
    }
    var r = this.y.toBigInteger().multiply(this.zinv);
    this.curve.reduce(r);
    return this.curve.fromBigInteger(r);
}

function pointFpEquals(other) {
    if(other == this) return true;
    if(this.isInfinity()) return other.isInfinity();
    if(other.isInfinity()) return this.isInfinity();
    var u, v;
    // u = Y2 * Z1 - Y1 * Z2
    u = other.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(other.z)).mod(this.curve.q);
    if(!u.equals(BigInteger.ZERO)) return false;
    // v = X2 * Z1 - X1 * Z2
    v = other.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(other.z)).mod(this.curve.q);
    return v.equals(BigInteger.ZERO);
}

function pointFpIsInfinity() {
    if((this.x == null) && (this.y == null)) return true;
    return this.z.equals(BigInteger.ZERO) && !this.y.toBigInteger().equals(BigInteger.ZERO);
}

function pointFpNegate() {
    return new ECPointFp(this.curve, this.x, this.y.negate(), this.z);
}

function pointFpAdd(b) {
    if(this.isInfinity()) return b;
    if(b.isInfinity()) return this;

    // u = Y2 * Z1 - Y1 * Z2
    var u = b.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(b.z)).mod(this.curve.q);
    // v = X2 * Z1 - X1 * Z2
    var v = b.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(b.z)).mod(this.curve.q);

    if(BigInteger.ZERO.equals(v)) {
        if(BigInteger.ZERO.equals(u)) {
            return this.twice(); // this == b, so double
        }
	return this.curve.getInfinity(); // this = -b, so infinity
    }

    var THREE = new BigInteger("3");
    var x1 = this.x.toBigInteger();
    var y1 = this.y.toBigInteger();
    var x2 = b.x.toBigInteger();
    var y2 = b.y.toBigInteger();

    var v2 = v.square();
    var v3 = v2.multiply(v);
    var x1v2 = x1.multiply(v2);
    var zu2 = u.square().multiply(this.z);

    // x3 = v * (z2 * (z1 * u^2 - 2 * x1 * v^2) - v^3)
    var x3 = zu2.subtract(x1v2.shiftLeft(1)).multiply(b.z).subtract(v3).multiply(v).mod(this.curve.q);
    // y3 = z2 * (3 * x1 * u * v^2 - y1 * v^3 - z1 * u^3) + u * v^3
    var y3 = x1v2.multiply(THREE).multiply(u).subtract(y1.multiply(v3)).subtract(zu2.multiply(u)).multiply(b.z).add(u.multiply(v3)).mod(this.curve.q);
    // z3 = v^3 * z1 * z2
    var z3 = v3.multiply(this.z).multiply(b.z).mod(this.curve.q);

    return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
}

function pointFpTwice() {
    if(this.isInfinity()) return this;
    if(this.y.toBigInteger().signum() == 0) return this.curve.getInfinity();

    // TODO: optimized handling of constants
    var THREE = new BigInteger("3");
    var x1 = this.x.toBigInteger();
    var y1 = this.y.toBigInteger();

    var y1z1 = y1.multiply(this.z);
    var y1sqz1 = y1z1.multiply(y1).mod(this.curve.q);
    var a = this.curve.a.toBigInteger();

    // w = 3 * x1^2 + a * z1^2
    var w = x1.square().multiply(THREE);
    if(!BigInteger.ZERO.equals(a)) {
      w = w.add(this.z.square().multiply(a));
    }
    w = w.mod(this.curve.q);
    //this.curve.reduce(w);
    // x3 = 2 * y1 * z1 * (w^2 - 8 * x1 * y1^2 * z1)
    var x3 = w.square().subtract(x1.shiftLeft(3).multiply(y1sqz1)).shiftLeft(1).multiply(y1z1).mod(this.curve.q);
    // y3 = 4 * y1^2 * z1 * (3 * w * x1 - 2 * y1^2 * z1) - w^3
    var y3 = w.multiply(THREE).multiply(x1).subtract(y1sqz1.shiftLeft(1)).shiftLeft(2).multiply(y1sqz1).subtract(w.square().multiply(w)).mod(this.curve.q);
    // z3 = 8 * (y1 * z1)^3
    var z3 = y1z1.square().multiply(y1z1).shiftLeft(3).mod(this.curve.q);

    return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
}

// Simple NAF (Non-Adjacent Form) multiplication algorithm
// TODO: modularize the multiplication algorithm
function pointFpMultiply(k) {
    if(this.isInfinity()) return this;
    if(k.signum() == 0) return this.curve.getInfinity();

    var e = k;
    var h = e.multiply(new BigInteger("3"));

    var neg = this.negate();
    var R = this;

    var i;
    for(i = h.bitLength() - 2; i > 0; --i) {
	R = R.twice();

	var hBit = h.testBit(i);
	var eBit = e.testBit(i);

	if (hBit != eBit) {
	    R = R.add(hBit ? this : neg);
	}
    }

    return R;
}

// Compute this*j + x*k (simultaneous multiplication)
function pointFpMultiplyTwo(j,x,k) {
  var i;
  if(j.bitLength() > k.bitLength())
    i = j.bitLength() - 1;
  else
    i = k.bitLength() - 1;

  var R = this.curve.getInfinity();
  var both = this.add(x);
  while(i >= 0) {
    R = R.twice();
    if(j.testBit(i)) {
      if(k.testBit(i)) {
        R = R.add(both);
      }
      else {
        R = R.add(this);
      }
    }
    else {
      if(k.testBit(i)) {
        R = R.add(x);
      }
    }
    --i;
  }

  return R;
}

ECPointFp.prototype.getX = pointFpGetX;
ECPointFp.prototype.getY = pointFpGetY;
ECPointFp.prototype.equals = pointFpEquals;
ECPointFp.prototype.isInfinity = pointFpIsInfinity;
ECPointFp.prototype.negate = pointFpNegate;
ECPointFp.prototype.add = pointFpAdd;
ECPointFp.prototype.twice = pointFpTwice;
ECPointFp.prototype.multiply = pointFpMultiply;
ECPointFp.prototype.multiplyTwo = pointFpMultiplyTwo;

// ----------------
// ECCurveFp

// constructor
function ECCurveFp(q,a,b) {
    this.q = q;
    this.a = this.fromBigInteger(a);
    this.b = this.fromBigInteger(b);
    this.infinity = new ECPointFp(this, null, null);
    this.reducer = new Barrett(this.q);
}

function curveFpGetQ() {
    return this.q;
}

function curveFpGetA() {
    return this.a;
}

function curveFpGetB() {
    return this.b;
}

function curveFpEquals(other) {
    if(other == this) return true;
    return(this.q.equals(other.q) && this.a.equals(other.a) && this.b.equals(other.b));
}

function curveFpGetInfinity() {
    return this.infinity;
}

function curveFpFromBigInteger(x) {
    return new ECFieldElementFp(this.q, x);
}

function curveReduce(x) {
    this.reducer.reduce(x);
}

// for now, work with hex strings because they're easier in JS
function curveFpDecodePointHex(s) {
    switch(parseInt(s.substr(0,2), 16)) { // first byte
    case 0:
	return this.infinity;
    case 2:
    case 3:
	// point compression not supported yet
	return null;
    case 4:
    case 6:
    case 7:
	var len = (s.length - 2) / 2;
	var xHex = s.substr(2, len);
	var yHex = s.substr(len+2, len);

	return new ECPointFp(this,
			     this.fromBigInteger(new BigInteger(xHex, 16)),
			     this.fromBigInteger(new BigInteger(yHex, 16)));

    default: // unsupported
	return null;
    }
}

function curveFpEncodePointHex(p) {
	if (p.isInfinity()) return "00";
	var xHex = p.getX().toBigInteger().toString(16);
	var yHex = p.getY().toBigInteger().toString(16);
	var oLen = this.getQ().toString(16).length;
	if ((oLen % 2) != 0) oLen++;
	while (xHex.length < oLen) {
		xHex = "0" + xHex;
	}
	while (yHex.length < oLen) {
		yHex = "0" + yHex;
	}
	return "04" + xHex + yHex;
}

ECCurveFp.prototype.getQ = curveFpGetQ;
ECCurveFp.prototype.getA = curveFpGetA;
ECCurveFp.prototype.getB = curveFpGetB;
ECCurveFp.prototype.equals = curveFpEquals;
ECCurveFp.prototype.getInfinity = curveFpGetInfinity;
ECCurveFp.prototype.fromBigInteger = curveFpFromBigInteger;
ECCurveFp.prototype.reduce = curveReduce;
//ECCurveFp.prototype.decodePointHex = curveFpDecodePointHex;
ECCurveFp.prototype.encodePointHex = curveFpEncodePointHex;

// from: https://github.com/kaielvin/jsbn-ec-point-compression
ECCurveFp.prototype.decodePointHex = function(s)
{
	var yIsEven;
    switch(parseInt(s.substr(0,2), 16)) { // first byte
    case 0:
	return this.infinity;
    case 2:
	yIsEven = false;
    case 3:
	if(yIsEven == undefined) yIsEven = true;
	var len = s.length - 2;
	var xHex = s.substr(2, len);
	var x = this.fromBigInteger(new BigInteger(xHex,16));
	var alpha = x.multiply(x.square().add(this.getA())).add(this.getB());
	var beta = alpha.sqrt();

    if (beta == null) throw "Invalid point compression";

    var betaValue = beta.toBigInteger();
    if (betaValue.testBit(0) != yIsEven)
    {
        // Use the other root
        beta = this.fromBigInteger(this.getQ().subtract(betaValue));
    }
    return new ECPointFp(this,x,beta);
    case 4:
    case 6:
    case 7:
	var len = (s.length - 2) / 2;
	var xHex = s.substr(2, len);
	var yHex = s.substr(len+2, len);

	return new ECPointFp(this,
			     this.fromBigInteger(new BigInteger(xHex, 16)),
			     this.fromBigInteger(new BigInteger(yHex, 16)));

    default: // unsupported
	return null;
    }
}
ECCurveFp.prototype.encodeCompressedPointHex = function(p)
{
	if (p.isInfinity()) return "00";
	var xHex = p.getX().toBigInteger().toString(16);
	var oLen = this.getQ().toString(16).length;
	if ((oLen % 2) != 0) oLen++;
	while (xHex.length < oLen)
		xHex = "0" + xHex;
	var yPrefix;
	if(p.getY().toBigInteger().isEven()) yPrefix = "02";
	else                                 yPrefix = "03";

	return yPrefix + xHex;
}


ECFieldElementFp.prototype.getR = function()
{
	if(this.r != undefined) return this.r;

    this.r = null;
    var bitLength = this.q.bitLength();
    if (bitLength > 128)
    {
        var firstWord = this.q.shiftRight(bitLength - 64);
        if (firstWord.intValue() == -1)
        {
            this.r = BigInteger.ONE.shiftLeft(bitLength).subtract(this.q);
        }
    }
    return this.r;
}
ECFieldElementFp.prototype.modMult = function(x1,x2)
{
    return this.modReduce(x1.multiply(x2));
}
ECFieldElementFp.prototype.modReduce = function(x)
{
    if (this.getR() != null)
    {
        var qLen = q.bitLength();
        while (x.bitLength() > (qLen + 1))
        {
            var u = x.shiftRight(qLen);
            var v = x.subtract(u.shiftLeft(qLen));
            if (!this.getR().equals(BigInteger.ONE))
            {
                u = u.multiply(this.getR());
            }
            x = u.add(v); 
        }
        while (x.compareTo(q) >= 0)
        {
            x = x.subtract(q);
        }
    }
    else
    {
        x = x.mod(q);
    }
    return x;
}
ECFieldElementFp.prototype.sqrt = function()
{
    if (!this.q.testBit(0)) throw "unsupported";

    // p mod 4 == 3
    if (this.q.testBit(1))
    {
    	var z = new ECFieldElementFp(this.q,this.x.modPow(this.q.shiftRight(2).add(BigInteger.ONE),this.q));
    	return z.square().equals(this) ? z : null;
    }

    // p mod 4 == 1
    var qMinusOne = this.q.subtract(BigInteger.ONE);

    var legendreExponent = qMinusOne.shiftRight(1);
    if (!(this.x.modPow(legendreExponent, this.q).equals(BigInteger.ONE)))
    {
        return null;
    }

    var u = qMinusOne.shiftRight(2);
    var k = u.shiftLeft(1).add(BigInteger.ONE);

    var Q = this.x;
    var fourQ = modDouble(modDouble(Q));

    var U, V;
    do
    {
        var P;
        do
        {
            P = new BigInteger(this.q.bitLength(), new SecureRandom());
        }
        while (P.compareTo(this.q) >= 0
            || !(P.multiply(P).subtract(fourQ).modPow(legendreExponent, this.q).equals(qMinusOne)));

        var result = this.lucasSequence(P, Q, k);
        U = result[0];
        V = result[1];

        if (this.modMult(V, V).equals(fourQ))
        {
            // Integer division by 2, mod q
            if (V.testBit(0))
            {
                V = V.add(q);
            }

            V = V.shiftRight(1);

            return new ECFieldElementFp(q,V);
        }
    }
    while (U.equals(BigInteger.ONE) || U.equals(qMinusOne));

    return null;
}
ECFieldElementFp.prototype.lucasSequence = function(P,Q,k)
{
    var n = k.bitLength();
    var s = k.getLowestSetBit();

    var Uh = BigInteger.ONE;
    var Vl = BigInteger.TWO;
    var Vh = P;
    var Ql = BigInteger.ONE;
    var Qh = BigInteger.ONE;

    for (var j = n - 1; j >= s + 1; --j)
    {
        Ql = this.modMult(Ql, Qh);

        if (k.testBit(j))
        {
            Qh = this.modMult(Ql, Q);
            Uh = this.modMult(Uh, Vh);
            Vl = this.modReduce(Vh.multiply(Vl).subtract(P.multiply(Ql)));
            Vh = this.modReduce(Vh.multiply(Vh).subtract(Qh.shiftLeft(1)));
        }
        else
        {
            Qh = Ql;
            Uh = this.modReduce(Uh.multiply(Vl).subtract(Ql));
            Vh = this.modReduce(Vh.multiply(Vl).subtract(P.multiply(Ql)));
            Vl = this.modReduce(Vl.multiply(Vl).subtract(Ql.shiftLeft(1)));
        }
    }

    Ql = this.modMult(Ql, Qh);
    Qh = this.modMult(Ql, Q);
    Uh = this.modReduce(Uh.multiply(Vl).subtract(Ql));
    Vl = this.modReduce(Vh.multiply(Vl).subtract(P.multiply(Ql)));
    Ql = this.modMult(Ql, Qh);

    for (var j = 1; j <= s; ++j)
    {
        Uh = this.modMult(Uh, Vl);
        Vl = this.modReduce(Vl.multiply(Vl).subtract(Ql.shiftLeft(1)));
        Ql = this.modMult(Ql, Ql);
    }

    return [ Uh, Vl ];
}

var exports = {
  ECCurveFp: ECCurveFp,
  ECPointFp: ECPointFp,
  ECFieldElementFp: ECFieldElementFp
}

module.exports = exports


/***/ }),

/***/ 1452:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Named EC curves

// Requires ec.js, jsbn.js, and jsbn2.js
var BigInteger = __nccwpck_require__(5587).BigInteger
var ECCurveFp = __nccwpck_require__(3943).ECCurveFp


// ----------------
// X9ECParameters

// constructor
function X9ECParameters(curve,g,n,h) {
    this.curve = curve;
    this.g = g;
    this.n = n;
    this.h = h;
}

function x9getCurve() {
    return this.curve;
}

function x9getG() {
    return this.g;
}

function x9getN() {
    return this.n;
}

function x9getH() {
    return this.h;
}

X9ECParameters.prototype.getCurve = x9getCurve;
X9ECParameters.prototype.getG = x9getG;
X9ECParameters.prototype.getN = x9getN;
X9ECParameters.prototype.getH = x9getH;

// ----------------
// SECNamedCurves

function fromHex(s) { return new BigInteger(s, 16); }

function secp128r1() {
    // p = 2^128 - 2^97 - 1
    var p = fromHex("FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFF");
    var a = fromHex("FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFC");
    var b = fromHex("E87579C11079F43DD824993C2CEE5ED3");
    //byte[] S = Hex.decode("000E0D4D696E6768756151750CC03A4473D03679");
    var n = fromHex("FFFFFFFE0000000075A30D1B9038A115");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    var G = curve.decodePointHex("04"
                + "161FF7528B899B2D0C28607CA52C5B86"
		+ "CF5AC8395BAFEB13C02DA292DDED7A83");
    return new X9ECParameters(curve, G, n, h);
}

function secp160k1() {
    // p = 2^160 - 2^32 - 2^14 - 2^12 - 2^9 - 2^8 - 2^7 - 2^3 - 2^2 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFAC73");
    var a = BigInteger.ZERO;
    var b = fromHex("7");
    //byte[] S = null;
    var n = fromHex("0100000000000000000001B8FA16DFAB9ACA16B6B3");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    var G = curve.decodePointHex("04"
                + "3B4C382CE37AA192A4019E763036F4F5DD4D7EBB"
                + "938CF935318FDCED6BC28286531733C3F03C4FEE");
    return new X9ECParameters(curve, G, n, h);
}

function secp160r1() {
    // p = 2^160 - 2^31 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFF");
    var a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFC");
    var b = fromHex("1C97BEFC54BD7A8B65ACF89F81D4D4ADC565FA45");
    //byte[] S = Hex.decode("1053CDE42C14D696E67687561517533BF3F83345");
    var n = fromHex("0100000000000000000001F4C8F927AED3CA752257");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    var G = curve.decodePointHex("04"
		+ "4A96B5688EF573284664698968C38BB913CBFC82"
		+ "23A628553168947D59DCC912042351377AC5FB32");
    return new X9ECParameters(curve, G, n, h);
}

function secp192k1() {
    // p = 2^192 - 2^32 - 2^12 - 2^8 - 2^7 - 2^6 - 2^3 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFEE37");
    var a = BigInteger.ZERO;
    var b = fromHex("3");
    //byte[] S = null;
    var n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFE26F2FC170F69466A74DEFD8D");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    var G = curve.decodePointHex("04"
                + "DB4FF10EC057E9AE26B07D0280B7F4341DA5D1B1EAE06C7D"
                + "9B2F2F6D9C5628A7844163D015BE86344082AA88D95E2F9D");
    return new X9ECParameters(curve, G, n, h);
}

function secp192r1() {
    // p = 2^192 - 2^64 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFF");
    var a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFC");
    var b = fromHex("64210519E59C80E70FA7E9AB72243049FEB8DEECC146B9B1");
    //byte[] S = Hex.decode("3045AE6FC8422F64ED579528D38120EAE12196D5");
    var n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFF99DEF836146BC9B1B4D22831");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    var G = curve.decodePointHex("04"
                + "188DA80EB03090F67CBF20EB43A18800F4FF0AFD82FF1012"
                + "07192B95FFC8DA78631011ED6B24CDD573F977A11E794811");
    return new X9ECParameters(curve, G, n, h);
}

function secp224r1() {
    // p = 2^224 - 2^96 + 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000001");
    var a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFE");
    var b = fromHex("B4050A850C04B3ABF54132565044B0B7D7BFD8BA270B39432355FFB4");
    //byte[] S = Hex.decode("BD71344799D5C7FCDC45B59FA3B9AB8F6A948BC5");
    var n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFF16A2E0B8F03E13DD29455C5C2A3D");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    var G = curve.decodePointHex("04"
                + "B70E0CBD6BB4BF7F321390B94A03C1D356C21122343280D6115C1D21"
                + "BD376388B5F723FB4C22DFE6CD4375A05A07476444D5819985007E34");
    return new X9ECParameters(curve, G, n, h);
}

function secp256r1() {
    // p = 2^224 (2^32 - 1) + 2^192 + 2^96 - 1
    var p = fromHex("FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF");
    var a = fromHex("FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC");
    var b = fromHex("5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B");
    //byte[] S = Hex.decode("C49D360886E704936A6678E1139D26B7819F7E90");
    var n = fromHex("FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    var G = curve.decodePointHex("04"
                + "6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296"
		+ "4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5");
    return new X9ECParameters(curve, G, n, h);
}

// TODO: make this into a proper hashtable
function getSECCurveByName(name) {
    if(name == "secp128r1") return secp128r1();
    if(name == "secp160k1") return secp160k1();
    if(name == "secp160r1") return secp160r1();
    if(name == "secp192k1") return secp192k1();
    if(name == "secp192r1") return secp192r1();
    if(name == "secp224r1") return secp224r1();
    if(name == "secp256r1") return secp256r1();
    return null;
}

module.exports = {
  "secp128r1":secp128r1,
  "secp160k1":secp160k1,
  "secp160r1":secp160r1,
  "secp192k1":secp192k1,
  "secp192r1":secp192r1,
  "secp224r1":secp224r1,
  "secp256r1":secp256r1
}


/***/ }),

/***/ 5587:
/***/ (function(module, exports) {

(function(){

    // Copyright (c) 2005  Tom Wu
    // All Rights Reserved.
    // See "LICENSE" for details.

    // Basic JavaScript BN library - subset useful for RSA encryption.

    // Bits per digit
    var dbits;

    // JavaScript engine analysis
    var canary = 0xdeadbeefcafe;
    var j_lm = ((canary&0xffffff)==0xefcafe);

    // (public) Constructor
    function BigInteger(a,b,c) {
      if(a != null)
        if("number" == typeof a) this.fromNumber(a,b,c);
        else if(b == null && "string" != typeof a) this.fromString(a,256);
        else this.fromString(a,b);
    }

    // return new, unset BigInteger
    function nbi() { return new BigInteger(null); }

    // am: Compute w_j += (x*this_i), propagate carries,
    // c is initial carry, returns final carry.
    // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
    // We need to select the fastest one that works in this environment.

    // am1: use a single mult and divide to get the high bits,
    // max digit bits should be 26 because
    // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
    function am1(i,x,w,j,c,n) {
      while(--n >= 0) {
        var v = x*this[i++]+w[j]+c;
        c = Math.floor(v/0x4000000);
        w[j++] = v&0x3ffffff;
      }
      return c;
    }
    // am2 avoids a big mult-and-extract completely.
    // Max digit bits should be <= 30 because we do bitwise ops
    // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
    function am2(i,x,w,j,c,n) {
      var xl = x&0x7fff, xh = x>>15;
      while(--n >= 0) {
        var l = this[i]&0x7fff;
        var h = this[i++]>>15;
        var m = xh*l+h*xl;
        l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
        c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
        w[j++] = l&0x3fffffff;
      }
      return c;
    }
    // Alternately, set max digit bits to 28 since some
    // browsers slow down when dealing with 32-bit numbers.
    function am3(i,x,w,j,c,n) {
      var xl = x&0x3fff, xh = x>>14;
      while(--n >= 0) {
        var l = this[i]&0x3fff;
        var h = this[i++]>>14;
        var m = xh*l+h*xl;
        l = xl*l+((m&0x3fff)<<14)+w[j]+c;
        c = (l>>28)+(m>>14)+xh*h;
        w[j++] = l&0xfffffff;
      }
      return c;
    }
    var inBrowser = typeof navigator !== "undefined";
    if(inBrowser && j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
      BigInteger.prototype.am = am2;
      dbits = 30;
    }
    else if(inBrowser && j_lm && (navigator.appName != "Netscape")) {
      BigInteger.prototype.am = am1;
      dbits = 26;
    }
    else { // Mozilla/Netscape seems to prefer am3
      BigInteger.prototype.am = am3;
      dbits = 28;
    }

    BigInteger.prototype.DB = dbits;
    BigInteger.prototype.DM = ((1<<dbits)-1);
    BigInteger.prototype.DV = (1<<dbits);

    var BI_FP = 52;
    BigInteger.prototype.FV = Math.pow(2,BI_FP);
    BigInteger.prototype.F1 = BI_FP-dbits;
    BigInteger.prototype.F2 = 2*dbits-BI_FP;

    // Digit conversions
    var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
    var BI_RC = new Array();
    var rr,vv;
    rr = "0".charCodeAt(0);
    for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
    rr = "a".charCodeAt(0);
    for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
    rr = "A".charCodeAt(0);
    for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

    function int2char(n) { return BI_RM.charAt(n); }
    function intAt(s,i) {
      var c = BI_RC[s.charCodeAt(i)];
      return (c==null)?-1:c;
    }

    // (protected) copy this to r
    function bnpCopyTo(r) {
      for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
      r.t = this.t;
      r.s = this.s;
    }

    // (protected) set from integer value x, -DV <= x < DV
    function bnpFromInt(x) {
      this.t = 1;
      this.s = (x<0)?-1:0;
      if(x > 0) this[0] = x;
      else if(x < -1) this[0] = x+this.DV;
      else this.t = 0;
    }

    // return bigint initialized to value
    function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

    // (protected) set from string and radix
    function bnpFromString(s,b) {
      var k;
      if(b == 16) k = 4;
      else if(b == 8) k = 3;
      else if(b == 256) k = 8; // byte array
      else if(b == 2) k = 1;
      else if(b == 32) k = 5;
      else if(b == 4) k = 2;
      else { this.fromRadix(s,b); return; }
      this.t = 0;
      this.s = 0;
      var i = s.length, mi = false, sh = 0;
      while(--i >= 0) {
        var x = (k==8)?s[i]&0xff:intAt(s,i);
        if(x < 0) {
          if(s.charAt(i) == "-") mi = true;
          continue;
        }
        mi = false;
        if(sh == 0)
          this[this.t++] = x;
        else if(sh+k > this.DB) {
          this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
          this[this.t++] = (x>>(this.DB-sh));
        }
        else
          this[this.t-1] |= x<<sh;
        sh += k;
        if(sh >= this.DB) sh -= this.DB;
      }
      if(k == 8 && (s[0]&0x80) != 0) {
        this.s = -1;
        if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
      }
      this.clamp();
      if(mi) BigInteger.ZERO.subTo(this,this);
    }

    // (protected) clamp off excess high words
    function bnpClamp() {
      var c = this.s&this.DM;
      while(this.t > 0 && this[this.t-1] == c) --this.t;
    }

    // (public) return string representation in given radix
    function bnToString(b) {
      if(this.s < 0) return "-"+this.negate().toString(b);
      var k;
      if(b == 16) k = 4;
      else if(b == 8) k = 3;
      else if(b == 2) k = 1;
      else if(b == 32) k = 5;
      else if(b == 4) k = 2;
      else return this.toRadix(b);
      var km = (1<<k)-1, d, m = false, r = "", i = this.t;
      var p = this.DB-(i*this.DB)%k;
      if(i-- > 0) {
        if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
        while(i >= 0) {
          if(p < k) {
            d = (this[i]&((1<<p)-1))<<(k-p);
            d |= this[--i]>>(p+=this.DB-k);
          }
          else {
            d = (this[i]>>(p-=k))&km;
            if(p <= 0) { p += this.DB; --i; }
          }
          if(d > 0) m = true;
          if(m) r += int2char(d);
        }
      }
      return m?r:"0";
    }

    // (public) -this
    function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

    // (public) |this|
    function bnAbs() { return (this.s<0)?this.negate():this; }

    // (public) return + if this > a, - if this < a, 0 if equal
    function bnCompareTo(a) {
      var r = this.s-a.s;
      if(r != 0) return r;
      var i = this.t;
      r = i-a.t;
      if(r != 0) return (this.s<0)?-r:r;
      while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
      return 0;
    }

    // returns bit length of the integer x
    function nbits(x) {
      var r = 1, t;
      if((t=x>>>16) != 0) { x = t; r += 16; }
      if((t=x>>8) != 0) { x = t; r += 8; }
      if((t=x>>4) != 0) { x = t; r += 4; }
      if((t=x>>2) != 0) { x = t; r += 2; }
      if((t=x>>1) != 0) { x = t; r += 1; }
      return r;
    }

    // (public) return the number of bits in "this"
    function bnBitLength() {
      if(this.t <= 0) return 0;
      return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
    }

    // (protected) r = this << n*DB
    function bnpDLShiftTo(n,r) {
      var i;
      for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
      for(i = n-1; i >= 0; --i) r[i] = 0;
      r.t = this.t+n;
      r.s = this.s;
    }

    // (protected) r = this >> n*DB
    function bnpDRShiftTo(n,r) {
      for(var i = n; i < this.t; ++i) r[i-n] = this[i];
      r.t = Math.max(this.t-n,0);
      r.s = this.s;
    }

    // (protected) r = this << n
    function bnpLShiftTo(n,r) {
      var bs = n%this.DB;
      var cbs = this.DB-bs;
      var bm = (1<<cbs)-1;
      var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
      for(i = this.t-1; i >= 0; --i) {
        r[i+ds+1] = (this[i]>>cbs)|c;
        c = (this[i]&bm)<<bs;
      }
      for(i = ds-1; i >= 0; --i) r[i] = 0;
      r[ds] = c;
      r.t = this.t+ds+1;
      r.s = this.s;
      r.clamp();
    }

    // (protected) r = this >> n
    function bnpRShiftTo(n,r) {
      r.s = this.s;
      var ds = Math.floor(n/this.DB);
      if(ds >= this.t) { r.t = 0; return; }
      var bs = n%this.DB;
      var cbs = this.DB-bs;
      var bm = (1<<bs)-1;
      r[0] = this[ds]>>bs;
      for(var i = ds+1; i < this.t; ++i) {
        r[i-ds-1] |= (this[i]&bm)<<cbs;
        r[i-ds] = this[i]>>bs;
      }
      if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
      r.t = this.t-ds;
      r.clamp();
    }

    // (protected) r = this - a
    function bnpSubTo(a,r) {
      var i = 0, c = 0, m = Math.min(a.t,this.t);
      while(i < m) {
        c += this[i]-a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      if(a.t < this.t) {
        c -= a.s;
        while(i < this.t) {
          c += this[i];
          r[i++] = c&this.DM;
          c >>= this.DB;
        }
        c += this.s;
      }
      else {
        c += this.s;
        while(i < a.t) {
          c -= a[i];
          r[i++] = c&this.DM;
          c >>= this.DB;
        }
        c -= a.s;
      }
      r.s = (c<0)?-1:0;
      if(c < -1) r[i++] = this.DV+c;
      else if(c > 0) r[i++] = c;
      r.t = i;
      r.clamp();
    }

    // (protected) r = this * a, r != this,a (HAC 14.12)
    // "this" should be the larger one if appropriate.
    function bnpMultiplyTo(a,r) {
      var x = this.abs(), y = a.abs();
      var i = x.t;
      r.t = i+y.t;
      while(--i >= 0) r[i] = 0;
      for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
      r.s = 0;
      r.clamp();
      if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
    }

    // (protected) r = this^2, r != this (HAC 14.16)
    function bnpSquareTo(r) {
      var x = this.abs();
      var i = r.t = 2*x.t;
      while(--i >= 0) r[i] = 0;
      for(i = 0; i < x.t-1; ++i) {
        var c = x.am(i,x[i],r,2*i,0,1);
        if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
          r[i+x.t] -= x.DV;
          r[i+x.t+1] = 1;
        }
      }
      if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
      r.s = 0;
      r.clamp();
    }

    // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
    // r != q, this != m.  q or r may be null.
    function bnpDivRemTo(m,q,r) {
      var pm = m.abs();
      if(pm.t <= 0) return;
      var pt = this.abs();
      if(pt.t < pm.t) {
        if(q != null) q.fromInt(0);
        if(r != null) this.copyTo(r);
        return;
      }
      if(r == null) r = nbi();
      var y = nbi(), ts = this.s, ms = m.s;
      var nsh = this.DB-nbits(pm[pm.t-1]);   // normalize modulus
      if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
      else { pm.copyTo(y); pt.copyTo(r); }
      var ys = y.t;
      var y0 = y[ys-1];
      if(y0 == 0) return;
      var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
      var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
      var i = r.t, j = i-ys, t = (q==null)?nbi():q;
      y.dlShiftTo(j,t);
      if(r.compareTo(t) >= 0) {
        r[r.t++] = 1;
        r.subTo(t,r);
      }
      BigInteger.ONE.dlShiftTo(ys,t);
      t.subTo(y,y);  // "negative" y so we can replace sub with am later
      while(y.t < ys) y[y.t++] = 0;
      while(--j >= 0) {
        // Estimate quotient digit
        var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
        if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {   // Try it out
          y.dlShiftTo(j,t);
          r.subTo(t,r);
          while(r[i] < --qd) r.subTo(t,r);
        }
      }
      if(q != null) {
        r.drShiftTo(ys,q);
        if(ts != ms) BigInteger.ZERO.subTo(q,q);
      }
      r.t = ys;
      r.clamp();
      if(nsh > 0) r.rShiftTo(nsh,r); // Denormalize remainder
      if(ts < 0) BigInteger.ZERO.subTo(r,r);
    }

    // (public) this mod a
    function bnMod(a) {
      var r = nbi();
      this.abs().divRemTo(a,null,r);
      if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
      return r;
    }

    // Modular reduction using "classic" algorithm
    function Classic(m) { this.m = m; }
    function cConvert(x) {
      if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
      else return x;
    }
    function cRevert(x) { return x; }
    function cReduce(x) { x.divRemTo(this.m,null,x); }
    function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
    function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

    Classic.prototype.convert = cConvert;
    Classic.prototype.revert = cRevert;
    Classic.prototype.reduce = cReduce;
    Classic.prototype.mulTo = cMulTo;
    Classic.prototype.sqrTo = cSqrTo;

    // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
    // justification:
    //         xy == 1 (mod m)
    //         xy =  1+km
    //   xy(2-xy) = (1+km)(1-km)
    // x[y(2-xy)] = 1-k^2m^2
    // x[y(2-xy)] == 1 (mod m^2)
    // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
    // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
    // JS multiply "overflows" differently from C/C++, so care is needed here.
    function bnpInvDigit() {
      if(this.t < 1) return 0;
      var x = this[0];
      if((x&1) == 0) return 0;
      var y = x&3;       // y == 1/x mod 2^2
      y = (y*(2-(x&0xf)*y))&0xf; // y == 1/x mod 2^4
      y = (y*(2-(x&0xff)*y))&0xff;   // y == 1/x mod 2^8
      y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;    // y == 1/x mod 2^16
      // last step - calculate inverse mod DV directly;
      // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
      y = (y*(2-x*y%this.DV))%this.DV;       // y == 1/x mod 2^dbits
      // we really want the negative inverse, and -DV < y < DV
      return (y>0)?this.DV-y:-y;
    }

    // Montgomery reduction
    function Montgomery(m) {
      this.m = m;
      this.mp = m.invDigit();
      this.mpl = this.mp&0x7fff;
      this.mph = this.mp>>15;
      this.um = (1<<(m.DB-15))-1;
      this.mt2 = 2*m.t;
    }

    // xR mod m
    function montConvert(x) {
      var r = nbi();
      x.abs().dlShiftTo(this.m.t,r);
      r.divRemTo(this.m,null,r);
      if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
      return r;
    }

    // x/R mod m
    function montRevert(x) {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r;
    }

    // x = x/R mod m (HAC 14.32)
    function montReduce(x) {
      while(x.t <= this.mt2) // pad x so am has enough room later
        x[x.t++] = 0;
      for(var i = 0; i < this.m.t; ++i) {
        // faster way of calculating u0 = x[i]*mp mod DV
        var j = x[i]&0x7fff;
        var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
        // use am to combine the multiply-shift-add into one call
        j = i+this.m.t;
        x[j] += this.m.am(0,u0,x,i,0,this.m.t);
        // propagate carry
        while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
      }
      x.clamp();
      x.drShiftTo(this.m.t,x);
      if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
    }

    // r = "x^2/R mod m"; x != r
    function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

    // r = "xy/R mod m"; x,y != r
    function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

    Montgomery.prototype.convert = montConvert;
    Montgomery.prototype.revert = montRevert;
    Montgomery.prototype.reduce = montReduce;
    Montgomery.prototype.mulTo = montMulTo;
    Montgomery.prototype.sqrTo = montSqrTo;

    // (protected) true iff this is even
    function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

    // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
    function bnpExp(e,z) {
      if(e > 0xffffffff || e < 1) return BigInteger.ONE;
      var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
      g.copyTo(r);
      while(--i >= 0) {
        z.sqrTo(r,r2);
        if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
        else { var t = r; r = r2; r2 = t; }
      }
      return z.revert(r);
    }

    // (public) this^e % m, 0 <= e < 2^32
    function bnModPowInt(e,m) {
      var z;
      if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
      return this.exp(e,z);
    }

    // protected
    BigInteger.prototype.copyTo = bnpCopyTo;
    BigInteger.prototype.fromInt = bnpFromInt;
    BigInteger.prototype.fromString = bnpFromString;
    BigInteger.prototype.clamp = bnpClamp;
    BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
    BigInteger.prototype.drShiftTo = bnpDRShiftTo;
    BigInteger.prototype.lShiftTo = bnpLShiftTo;
    BigInteger.prototype.rShiftTo = bnpRShiftTo;
    BigInteger.prototype.subTo = bnpSubTo;
    BigInteger.prototype.multiplyTo = bnpMultiplyTo;
    BigInteger.prototype.squareTo = bnpSquareTo;
    BigInteger.prototype.divRemTo = bnpDivRemTo;
    BigInteger.prototype.invDigit = bnpInvDigit;
    BigInteger.prototype.isEven = bnpIsEven;
    BigInteger.prototype.exp = bnpExp;

    // public
    BigInteger.prototype.toString = bnToString;
    BigInteger.prototype.negate = bnNegate;
    BigInteger.prototype.abs = bnAbs;
    BigInteger.prototype.compareTo = bnCompareTo;
    BigInteger.prototype.bitLength = bnBitLength;
    BigInteger.prototype.mod = bnMod;
    BigInteger.prototype.modPowInt = bnModPowInt;

    // "constants"
    BigInteger.ZERO = nbv(0);
    BigInteger.ONE = nbv(1);

    // Copyright (c) 2005-2009  Tom Wu
    // All Rights Reserved.
    // See "LICENSE" for details.

    // Extended JavaScript BN functions, required for RSA private ops.

    // Version 1.1: new BigInteger("0", 10) returns "proper" zero
    // Version 1.2: square() API, isProbablePrime fix

    // (public)
    function bnClone() { var r = nbi(); this.copyTo(r); return r; }

    // (public) return value as integer
    function bnIntValue() {
      if(this.s < 0) {
        if(this.t == 1) return this[0]-this.DV;
        else if(this.t == 0) return -1;
      }
      else if(this.t == 1) return this[0];
      else if(this.t == 0) return 0;
      // assumes 16 < DB < 32
      return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
    }

    // (public) return value as byte
    function bnByteValue() { return (this.t==0)?this.s:(this[0]<<24)>>24; }

    // (public) return value as short (assumes DB>=16)
    function bnShortValue() { return (this.t==0)?this.s:(this[0]<<16)>>16; }

    // (protected) return x s.t. r^x < DV
    function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

    // (public) 0 if this == 0, 1 if this > 0
    function bnSigNum() {
      if(this.s < 0) return -1;
      else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
      else return 1;
    }

    // (protected) convert to radix string
    function bnpToRadix(b) {
      if(b == null) b = 10;
      if(this.signum() == 0 || b < 2 || b > 36) return "0";
      var cs = this.chunkSize(b);
      var a = Math.pow(b,cs);
      var d = nbv(a), y = nbi(), z = nbi(), r = "";
      this.divRemTo(d,y,z);
      while(y.signum() > 0) {
        r = (a+z.intValue()).toString(b).substr(1) + r;
        y.divRemTo(d,y,z);
      }
      return z.intValue().toString(b) + r;
    }

    // (protected) convert from radix string
    function bnpFromRadix(s,b) {
      this.fromInt(0);
      if(b == null) b = 10;
      var cs = this.chunkSize(b);
      var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
      for(var i = 0; i < s.length; ++i) {
        var x = intAt(s,i);
        if(x < 0) {
          if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
          continue;
        }
        w = b*w+x;
        if(++j >= cs) {
          this.dMultiply(d);
          this.dAddOffset(w,0);
          j = 0;
          w = 0;
        }
      }
      if(j > 0) {
        this.dMultiply(Math.pow(b,j));
        this.dAddOffset(w,0);
      }
      if(mi) BigInteger.ZERO.subTo(this,this);
    }

    // (protected) alternate constructor
    function bnpFromNumber(a,b,c) {
      if("number" == typeof b) {
        // new BigInteger(int,int,RNG)
        if(a < 2) this.fromInt(1);
        else {
          this.fromNumber(a,c);
          if(!this.testBit(a-1))	// force MSB set
            this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);
          if(this.isEven()) this.dAddOffset(1,0); // force odd
          while(!this.isProbablePrime(b)) {
            this.dAddOffset(2,0);
            if(this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a-1),this);
          }
        }
      }
      else {
        // new BigInteger(int,RNG)
        var x = new Array(), t = a&7;
        x.length = (a>>3)+1;
        b.nextBytes(x);
        if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
        this.fromString(x,256);
      }
    }

    // (public) convert to bigendian byte array
    function bnToByteArray() {
      var i = this.t, r = new Array();
      r[0] = this.s;
      var p = this.DB-(i*this.DB)%8, d, k = 0;
      if(i-- > 0) {
        if(p < this.DB && (d = this[i]>>p) != (this.s&this.DM)>>p)
          r[k++] = d|(this.s<<(this.DB-p));
        while(i >= 0) {
          if(p < 8) {
            d = (this[i]&((1<<p)-1))<<(8-p);
            d |= this[--i]>>(p+=this.DB-8);
          }
          else {
            d = (this[i]>>(p-=8))&0xff;
            if(p <= 0) { p += this.DB; --i; }
          }
          if((d&0x80) != 0) d |= -256;
          if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
          if(k > 0 || d != this.s) r[k++] = d;
        }
      }
      return r;
    }

    function bnEquals(a) { return(this.compareTo(a)==0); }
    function bnMin(a) { return(this.compareTo(a)<0)?this:a; }
    function bnMax(a) { return(this.compareTo(a)>0)?this:a; }

    // (protected) r = this op a (bitwise)
    function bnpBitwiseTo(a,op,r) {
      var i, f, m = Math.min(a.t,this.t);
      for(i = 0; i < m; ++i) r[i] = op(this[i],a[i]);
      if(a.t < this.t) {
        f = a.s&this.DM;
        for(i = m; i < this.t; ++i) r[i] = op(this[i],f);
        r.t = this.t;
      }
      else {
        f = this.s&this.DM;
        for(i = m; i < a.t; ++i) r[i] = op(f,a[i]);
        r.t = a.t;
      }
      r.s = op(this.s,a.s);
      r.clamp();
    }

    // (public) this & a
    function op_and(x,y) { return x&y; }
    function bnAnd(a) { var r = nbi(); this.bitwiseTo(a,op_and,r); return r; }

    // (public) this | a
    function op_or(x,y) { return x|y; }
    function bnOr(a) { var r = nbi(); this.bitwiseTo(a,op_or,r); return r; }

    // (public) this ^ a
    function op_xor(x,y) { return x^y; }
    function bnXor(a) { var r = nbi(); this.bitwiseTo(a,op_xor,r); return r; }

    // (public) this & ~a
    function op_andnot(x,y) { return x&~y; }
    function bnAndNot(a) { var r = nbi(); this.bitwiseTo(a,op_andnot,r); return r; }

    // (public) ~this
    function bnNot() {
      var r = nbi();
      for(var i = 0; i < this.t; ++i) r[i] = this.DM&~this[i];
      r.t = this.t;
      r.s = ~this.s;
      return r;
    }

    // (public) this << n
    function bnShiftLeft(n) {
      var r = nbi();
      if(n < 0) this.rShiftTo(-n,r); else this.lShiftTo(n,r);
      return r;
    }

    // (public) this >> n
    function bnShiftRight(n) {
      var r = nbi();
      if(n < 0) this.lShiftTo(-n,r); else this.rShiftTo(n,r);
      return r;
    }

    // return index of lowest 1-bit in x, x < 2^31
    function lbit(x) {
      if(x == 0) return -1;
      var r = 0;
      if((x&0xffff) == 0) { x >>= 16; r += 16; }
      if((x&0xff) == 0) { x >>= 8; r += 8; }
      if((x&0xf) == 0) { x >>= 4; r += 4; }
      if((x&3) == 0) { x >>= 2; r += 2; }
      if((x&1) == 0) ++r;
      return r;
    }

    // (public) returns index of lowest 1-bit (or -1 if none)
    function bnGetLowestSetBit() {
      for(var i = 0; i < this.t; ++i)
        if(this[i] != 0) return i*this.DB+lbit(this[i]);
      if(this.s < 0) return this.t*this.DB;
      return -1;
    }

    // return number of 1 bits in x
    function cbit(x) {
      var r = 0;
      while(x != 0) { x &= x-1; ++r; }
      return r;
    }

    // (public) return number of set bits
    function bnBitCount() {
      var r = 0, x = this.s&this.DM;
      for(var i = 0; i < this.t; ++i) r += cbit(this[i]^x);
      return r;
    }

    // (public) true iff nth bit is set
    function bnTestBit(n) {
      var j = Math.floor(n/this.DB);
      if(j >= this.t) return(this.s!=0);
      return((this[j]&(1<<(n%this.DB)))!=0);
    }

    // (protected) this op (1<<n)
    function bnpChangeBit(n,op) {
      var r = BigInteger.ONE.shiftLeft(n);
      this.bitwiseTo(r,op,r);
      return r;
    }

    // (public) this | (1<<n)
    function bnSetBit(n) { return this.changeBit(n,op_or); }

    // (public) this & ~(1<<n)
    function bnClearBit(n) { return this.changeBit(n,op_andnot); }

    // (public) this ^ (1<<n)
    function bnFlipBit(n) { return this.changeBit(n,op_xor); }

    // (protected) r = this + a
    function bnpAddTo(a,r) {
      var i = 0, c = 0, m = Math.min(a.t,this.t);
      while(i < m) {
        c += this[i]+a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      if(a.t < this.t) {
        c += a.s;
        while(i < this.t) {
          c += this[i];
          r[i++] = c&this.DM;
          c >>= this.DB;
        }
        c += this.s;
      }
      else {
        c += this.s;
        while(i < a.t) {
          c += a[i];
          r[i++] = c&this.DM;
          c >>= this.DB;
        }
        c += a.s;
      }
      r.s = (c<0)?-1:0;
      if(c > 0) r[i++] = c;
      else if(c < -1) r[i++] = this.DV+c;
      r.t = i;
      r.clamp();
    }

    // (public) this + a
    function bnAdd(a) { var r = nbi(); this.addTo(a,r); return r; }

    // (public) this - a
    function bnSubtract(a) { var r = nbi(); this.subTo(a,r); return r; }

    // (public) this * a
    function bnMultiply(a) { var r = nbi(); this.multiplyTo(a,r); return r; }

    // (public) this^2
    function bnSquare() { var r = nbi(); this.squareTo(r); return r; }

    // (public) this / a
    function bnDivide(a) { var r = nbi(); this.divRemTo(a,r,null); return r; }

    // (public) this % a
    function bnRemainder(a) { var r = nbi(); this.divRemTo(a,null,r); return r; }

    // (public) [this/a,this%a]
    function bnDivideAndRemainder(a) {
      var q = nbi(), r = nbi();
      this.divRemTo(a,q,r);
      return new Array(q,r);
    }

    // (protected) this *= n, this >= 0, 1 < n < DV
    function bnpDMultiply(n) {
      this[this.t] = this.am(0,n-1,this,0,0,this.t);
      ++this.t;
      this.clamp();
    }

    // (protected) this += n << w words, this >= 0
    function bnpDAddOffset(n,w) {
      if(n == 0) return;
      while(this.t <= w) this[this.t++] = 0;
      this[w] += n;
      while(this[w] >= this.DV) {
        this[w] -= this.DV;
        if(++w >= this.t) this[this.t++] = 0;
        ++this[w];
      }
    }

    // A "null" reducer
    function NullExp() {}
    function nNop(x) { return x; }
    function nMulTo(x,y,r) { x.multiplyTo(y,r); }
    function nSqrTo(x,r) { x.squareTo(r); }

    NullExp.prototype.convert = nNop;
    NullExp.prototype.revert = nNop;
    NullExp.prototype.mulTo = nMulTo;
    NullExp.prototype.sqrTo = nSqrTo;

    // (public) this^e
    function bnPow(e) { return this.exp(e,new NullExp()); }

    // (protected) r = lower n words of "this * a", a.t <= n
    // "this" should be the larger one if appropriate.
    function bnpMultiplyLowerTo(a,n,r) {
      var i = Math.min(this.t+a.t,n);
      r.s = 0; // assumes a,this >= 0
      r.t = i;
      while(i > 0) r[--i] = 0;
      var j;
      for(j = r.t-this.t; i < j; ++i) r[i+this.t] = this.am(0,a[i],r,i,0,this.t);
      for(j = Math.min(a.t,n); i < j; ++i) this.am(0,a[i],r,i,0,n-i);
      r.clamp();
    }

    // (protected) r = "this * a" without lower n words, n > 0
    // "this" should be the larger one if appropriate.
    function bnpMultiplyUpperTo(a,n,r) {
      --n;
      var i = r.t = this.t+a.t-n;
      r.s = 0; // assumes a,this >= 0
      while(--i >= 0) r[i] = 0;
      for(i = Math.max(n-this.t,0); i < a.t; ++i)
        r[this.t+i-n] = this.am(n-i,a[i],r,0,0,this.t+i-n);
      r.clamp();
      r.drShiftTo(1,r);
    }

    // Barrett modular reduction
    function Barrett(m) {
      // setup Barrett
      this.r2 = nbi();
      this.q3 = nbi();
      BigInteger.ONE.dlShiftTo(2*m.t,this.r2);
      this.mu = this.r2.divide(m);
      this.m = m;
    }

    function barrettConvert(x) {
      if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
      else if(x.compareTo(this.m) < 0) return x;
      else { var r = nbi(); x.copyTo(r); this.reduce(r); return r; }
    }

    function barrettRevert(x) { return x; }

    // x = x mod m (HAC 14.42)
    function barrettReduce(x) {
      x.drShiftTo(this.m.t-1,this.r2);
      if(x.t > this.m.t+1) { x.t = this.m.t+1; x.clamp(); }
      this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);
      this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);
      while(x.compareTo(this.r2) < 0) x.dAddOffset(1,this.m.t+1);
      x.subTo(this.r2,x);
      while(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
    }

    // r = x^2 mod m; x != r
    function barrettSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

    // r = x*y mod m; x,y != r
    function barrettMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

    Barrett.prototype.convert = barrettConvert;
    Barrett.prototype.revert = barrettRevert;
    Barrett.prototype.reduce = barrettReduce;
    Barrett.prototype.mulTo = barrettMulTo;
    Barrett.prototype.sqrTo = barrettSqrTo;

    // (public) this^e % m (HAC 14.85)
    function bnModPow(e,m) {
      var i = e.bitLength(), k, r = nbv(1), z;
      if(i <= 0) return r;
      else if(i < 18) k = 1;
      else if(i < 48) k = 3;
      else if(i < 144) k = 4;
      else if(i < 768) k = 5;
      else k = 6;
      if(i < 8)
        z = new Classic(m);
      else if(m.isEven())
        z = new Barrett(m);
      else
        z = new Montgomery(m);

      // precomputation
      var g = new Array(), n = 3, k1 = k-1, km = (1<<k)-1;
      g[1] = z.convert(this);
      if(k > 1) {
        var g2 = nbi();
        z.sqrTo(g[1],g2);
        while(n <= km) {
          g[n] = nbi();
          z.mulTo(g2,g[n-2],g[n]);
          n += 2;
        }
      }

      var j = e.t-1, w, is1 = true, r2 = nbi(), t;
      i = nbits(e[j])-1;
      while(j >= 0) {
        if(i >= k1) w = (e[j]>>(i-k1))&km;
        else {
          w = (e[j]&((1<<(i+1))-1))<<(k1-i);
          if(j > 0) w |= e[j-1]>>(this.DB+i-k1);
        }

        n = k;
        while((w&1) == 0) { w >>= 1; --n; }
        if((i -= n) < 0) { i += this.DB; --j; }
        if(is1) {	// ret == 1, don't bother squaring or multiplying it
          g[w].copyTo(r);
          is1 = false;
        }
        else {
          while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
          if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
          z.mulTo(r2,g[w],r);
        }

        while(j >= 0 && (e[j]&(1<<i)) == 0) {
          z.sqrTo(r,r2); t = r; r = r2; r2 = t;
          if(--i < 0) { i = this.DB-1; --j; }
        }
      }
      return z.revert(r);
    }

    // (public) gcd(this,a) (HAC 14.54)
    function bnGCD(a) {
      var x = (this.s<0)?this.negate():this.clone();
      var y = (a.s<0)?a.negate():a.clone();
      if(x.compareTo(y) < 0) { var t = x; x = y; y = t; }
      var i = x.getLowestSetBit(), g = y.getLowestSetBit();
      if(g < 0) return x;
      if(i < g) g = i;
      if(g > 0) {
        x.rShiftTo(g,x);
        y.rShiftTo(g,y);
      }
      while(x.signum() > 0) {
        if((i = x.getLowestSetBit()) > 0) x.rShiftTo(i,x);
        if((i = y.getLowestSetBit()) > 0) y.rShiftTo(i,y);
        if(x.compareTo(y) >= 0) {
          x.subTo(y,x);
          x.rShiftTo(1,x);
        }
        else {
          y.subTo(x,y);
          y.rShiftTo(1,y);
        }
      }
      if(g > 0) y.lShiftTo(g,y);
      return y;
    }

    // (protected) this % n, n < 2^26
    function bnpModInt(n) {
      if(n <= 0) return 0;
      var d = this.DV%n, r = (this.s<0)?n-1:0;
      if(this.t > 0)
        if(d == 0) r = this[0]%n;
        else for(var i = this.t-1; i >= 0; --i) r = (d*r+this[i])%n;
      return r;
    }

    // (public) 1/this % m (HAC 14.61)
    function bnModInverse(m) {
      var ac = m.isEven();
      if((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
      var u = m.clone(), v = this.clone();
      var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
      while(u.signum() != 0) {
        while(u.isEven()) {
          u.rShiftTo(1,u);
          if(ac) {
            if(!a.isEven() || !b.isEven()) { a.addTo(this,a); b.subTo(m,b); }
            a.rShiftTo(1,a);
          }
          else if(!b.isEven()) b.subTo(m,b);
          b.rShiftTo(1,b);
        }
        while(v.isEven()) {
          v.rShiftTo(1,v);
          if(ac) {
            if(!c.isEven() || !d.isEven()) { c.addTo(this,c); d.subTo(m,d); }
            c.rShiftTo(1,c);
          }
          else if(!d.isEven()) d.subTo(m,d);
          d.rShiftTo(1,d);
        }
        if(u.compareTo(v) >= 0) {
          u.subTo(v,u);
          if(ac) a.subTo(c,a);
          b.subTo(d,b);
        }
        else {
          v.subTo(u,v);
          if(ac) c.subTo(a,c);
          d.subTo(b,d);
        }
      }
      if(v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
      if(d.compareTo(m) >= 0) return d.subtract(m);
      if(d.signum() < 0) d.addTo(m,d); else return d;
      if(d.signum() < 0) return d.add(m); else return d;
    }

    var lowprimes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997];
    var lplim = (1<<26)/lowprimes[lowprimes.length-1];

    // (public) test primality with certainty >= 1-.5^t
    function bnIsProbablePrime(t) {
      var i, x = this.abs();
      if(x.t == 1 && x[0] <= lowprimes[lowprimes.length-1]) {
        for(i = 0; i < lowprimes.length; ++i)
          if(x[0] == lowprimes[i]) return true;
        return false;
      }
      if(x.isEven()) return false;
      i = 1;
      while(i < lowprimes.length) {
        var m = lowprimes[i], j = i+1;
        while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
        m = x.modInt(m);
        while(i < j) if(m%lowprimes[i++] == 0) return false;
      }
      return x.millerRabin(t);
    }

    // (protected) true if probably prime (HAC 4.24, Miller-Rabin)
    function bnpMillerRabin(t) {
      var n1 = this.subtract(BigInteger.ONE);
      var k = n1.getLowestSetBit();
      if(k <= 0) return false;
      var r = n1.shiftRight(k);
      t = (t+1)>>1;
      if(t > lowprimes.length) t = lowprimes.length;
      var a = nbi();
      for(var i = 0; i < t; ++i) {
        //Pick bases at random, instead of starting at 2
        a.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);
        var y = a.modPow(r,this);
        if(y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
          var j = 1;
          while(j++ < k && y.compareTo(n1) != 0) {
            y = y.modPowInt(2,this);
            if(y.compareTo(BigInteger.ONE) == 0) return false;
          }
          if(y.compareTo(n1) != 0) return false;
        }
      }
      return true;
    }

    // protected
    BigInteger.prototype.chunkSize = bnpChunkSize;
    BigInteger.prototype.toRadix = bnpToRadix;
    BigInteger.prototype.fromRadix = bnpFromRadix;
    BigInteger.prototype.fromNumber = bnpFromNumber;
    BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
    BigInteger.prototype.changeBit = bnpChangeBit;
    BigInteger.prototype.addTo = bnpAddTo;
    BigInteger.prototype.dMultiply = bnpDMultiply;
    BigInteger.prototype.dAddOffset = bnpDAddOffset;
    BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
    BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
    BigInteger.prototype.modInt = bnpModInt;
    BigInteger.prototype.millerRabin = bnpMillerRabin;

    // public
    BigInteger.prototype.clone = bnClone;
    BigInteger.prototype.intValue = bnIntValue;
    BigInteger.prototype.byteValue = bnByteValue;
    BigInteger.prototype.shortValue = bnShortValue;
    BigInteger.prototype.signum = bnSigNum;
    BigInteger.prototype.toByteArray = bnToByteArray;
    BigInteger.prototype.equals = bnEquals;
    BigInteger.prototype.min = bnMin;
    BigInteger.prototype.max = bnMax;
    BigInteger.prototype.and = bnAnd;
    BigInteger.prototype.or = bnOr;
    BigInteger.prototype.xor = bnXor;
    BigInteger.prototype.andNot = bnAndNot;
    BigInteger.prototype.not = bnNot;
    BigInteger.prototype.shiftLeft = bnShiftLeft;
    BigInteger.prototype.shiftRight = bnShiftRight;
    BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
    BigInteger.prototype.bitCount = bnBitCount;
    BigInteger.prototype.testBit = bnTestBit;
    BigInteger.prototype.setBit = bnSetBit;
    BigInteger.prototype.clearBit = bnClearBit;
    BigInteger.prototype.flipBit = bnFlipBit;
    BigInteger.prototype.add = bnAdd;
    BigInteger.prototype.subtract = bnSubtract;
    BigInteger.prototype.multiply = bnMultiply;
    BigInteger.prototype.divide = bnDivide;
    BigInteger.prototype.remainder = bnRemainder;
    BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
    BigInteger.prototype.modPow = bnModPow;
    BigInteger.prototype.modInverse = bnModInverse;
    BigInteger.prototype.pow = bnPow;
    BigInteger.prototype.gcd = bnGCD;
    BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

    // JSBN-specific extension
    BigInteger.prototype.square = bnSquare;

    // Expose the Barrett function
    BigInteger.prototype.Barrett = Barrett

    // BigInteger interfaces not implemented in jsbn:

    // BigInteger(int signum, byte[] magnitude)
    // double doubleValue()
    // float floatValue()
    // int hashCode()
    // long longValue()
    // static BigInteger valueOf(long val)

	// Random number generator - requires a PRNG backend, e.g. prng4.js

	// For best results, put code like
	// <body onClick='rng_seed_time();' onKeyPress='rng_seed_time();'>
	// in your main HTML document.

	var rng_state;
	var rng_pool;
	var rng_pptr;

	// Mix in a 32-bit integer into the pool
	function rng_seed_int(x) {
	  rng_pool[rng_pptr++] ^= x & 255;
	  rng_pool[rng_pptr++] ^= (x >> 8) & 255;
	  rng_pool[rng_pptr++] ^= (x >> 16) & 255;
	  rng_pool[rng_pptr++] ^= (x >> 24) & 255;
	  if(rng_pptr >= rng_psize) rng_pptr -= rng_psize;
	}

	// Mix in the current time (w/milliseconds) into the pool
	function rng_seed_time() {
	  rng_seed_int(new Date().getTime());
	}

	// Initialize the pool with junk if needed.
	if(rng_pool == null) {
	  rng_pool = new Array();
	  rng_pptr = 0;
	  var t;
	  if(typeof window !== "undefined" && window.crypto) {
		if (window.crypto.getRandomValues) {
		  // Use webcrypto if available
		  var ua = new Uint8Array(32);
		  window.crypto.getRandomValues(ua);
		  for(t = 0; t < 32; ++t)
			rng_pool[rng_pptr++] = ua[t];
		}
		else if(navigator.appName == "Netscape" && navigator.appVersion < "5") {
		  // Extract entropy (256 bits) from NS4 RNG if available
		  var z = window.crypto.random(32);
		  for(t = 0; t < z.length; ++t)
			rng_pool[rng_pptr++] = z.charCodeAt(t) & 255;
		}
	  }
	  while(rng_pptr < rng_psize) {  // extract some randomness from Math.random()
		t = Math.floor(65536 * Math.random());
		rng_pool[rng_pptr++] = t >>> 8;
		rng_pool[rng_pptr++] = t & 255;
	  }
	  rng_pptr = 0;
	  rng_seed_time();
	  //rng_seed_int(window.screenX);
	  //rng_seed_int(window.screenY);
	}

	function rng_get_byte() {
	  if(rng_state == null) {
		rng_seed_time();
		rng_state = prng_newstate();
		rng_state.init(rng_pool);
		for(rng_pptr = 0; rng_pptr < rng_pool.length; ++rng_pptr)
		  rng_pool[rng_pptr] = 0;
		rng_pptr = 0;
		//rng_pool = null;
	  }
	  // TODO: allow reseeding after first request
	  return rng_state.next();
	}

	function rng_get_bytes(ba) {
	  var i;
	  for(i = 0; i < ba.length; ++i) ba[i] = rng_get_byte();
	}

	function SecureRandom() {}

	SecureRandom.prototype.nextBytes = rng_get_bytes;

	// prng4.js - uses Arcfour as a PRNG

	function Arcfour() {
	  this.i = 0;
	  this.j = 0;
	  this.S = new Array();
	}

	// Initialize arcfour context from key, an array of ints, each from [0..255]
	function ARC4init(key) {
	  var i, j, t;
	  for(i = 0; i < 256; ++i)
		this.S[i] = i;
	  j = 0;
	  for(i = 0; i < 256; ++i) {
		j = (j + this.S[i] + key[i % key.length]) & 255;
		t = this.S[i];
		this.S[i] = this.S[j];
		this.S[j] = t;
	  }
	  this.i = 0;
	  this.j = 0;
	}

	function ARC4next() {
	  var t;
	  this.i = (this.i + 1) & 255;
	  this.j = (this.j + this.S[this.i]) & 255;
	  t = this.S[this.i];
	  this.S[this.i] = this.S[this.j];
	  this.S[this.j] = t;
	  return this.S[(t + this.S[this.i]) & 255];
	}

	Arcfour.prototype.init = ARC4init;
	Arcfour.prototype.next = ARC4next;

	// Plug in your RNG constructor here
	function prng_newstate() {
	  return new Arcfour();
	}

	// Pool size must be a multiple of 4 and greater than 32.
	// An array of bytes the size of the pool will be passed to init()
	var rng_psize = 256;

  BigInteger.SecureRandom = SecureRandom;
  BigInteger.BigInteger = BigInteger;
  if (true) {
    exports = module.exports = BigInteger;
  } else {}

}).call(this);


/***/ }),

/***/ 5118:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
/* eslint-disable node/no-deprecated-api */



var buffer = __nccwpck_require__(4293)
var Buffer = buffer.Buffer

var safer = {}

var key

for (key in buffer) {
  if (!buffer.hasOwnProperty(key)) continue
  if (key === 'SlowBuffer' || key === 'Buffer') continue
  safer[key] = buffer[key]
}

var Safer = safer.Buffer = {}
for (key in Buffer) {
  if (!Buffer.hasOwnProperty(key)) continue
  if (key === 'allocUnsafe' || key === 'allocUnsafeSlow') continue
  Safer[key] = Buffer[key]
}

safer.Buffer.prototype = Buffer.prototype

if (!Safer.from || Safer.from === Uint8Array.from) {
  Safer.from = function (value, encodingOrOffset, length) {
    if (typeof value === 'number') {
      throw new TypeError('The "value" argument must not be of type number. Received type ' + typeof value)
    }
    if (value && typeof value.length === 'undefined') {
      throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type ' + typeof value)
    }
    return Buffer(value, encodingOrOffset, length)
  }
}

if (!Safer.alloc) {
  Safer.alloc = function (size, fill, encoding) {
    if (typeof size !== 'number') {
      throw new TypeError('The "size" argument must be of type number. Received type ' + typeof size)
    }
    if (size < 0 || size >= 2 * (1 << 30)) {
      throw new RangeError('The value "' + size + '" is invalid for option "size"')
    }
    var buf = Buffer(size)
    if (!fill || fill.length === 0) {
      buf.fill(0)
    } else if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
    return buf
  }
}

if (!safer.kStringMaxLength) {
  try {
    safer.kStringMaxLength = process.binding('buffer').kStringMaxLength
  } catch (e) {
    // we can't determine kStringMaxLength in environments where process.binding
    // is unsupported, so let's not set it
  }
}

if (!safer.constants) {
  safer.constants = {
    MAX_LENGTH: safer.kMaxLength
  }
  if (safer.kStringMaxLength) {
    safer.constants.MAX_STRING_LENGTH = safer.kStringMaxLength
  }
}

module.exports = safer


/***/ }),

/***/ 3204:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const {
  Duplex: DuplexStream,
  Readable: ReadableStream,
  Writable: WritableStream,
} = __nccwpck_require__(2413);

const {
  CHANNEL_EXTENDED_DATATYPE: { STDERR },
} = __nccwpck_require__(6832);
const { bufferSlice } = __nccwpck_require__(9475);

const PACKET_SIZE = 32 * 1024;
const MAX_WINDOW = 2 * 1024 * 1024;
const WINDOW_THRESHOLD = MAX_WINDOW / 2;

class ClientStderr extends ReadableStream {
  constructor(channel, streamOpts) {
    super(streamOpts);

    this._channel = channel;
  }
  _read(n) {
    if (this._channel._waitChanDrain) {
      this._channel._waitChanDrain = false;
      if (this._channel.incoming.window <= WINDOW_THRESHOLD)
        windowAdjust(this._channel);
    }
  }
}

class ServerStderr extends WritableStream {
  constructor(channel) {
    super({ highWaterMark: MAX_WINDOW });

    this._channel = channel;
  }

  _write(data, encoding, cb) {
    const channel = this._channel;
    const protocol = channel._client._protocol;
    const outgoing = channel.outgoing;
    const packetSize = outgoing.packetSize;
    const id = outgoing.id;
    let window = outgoing.window;
    const len = data.length;
    let p = 0;

    if (outgoing.state !== 'open')
      return;

    while (len - p > 0 && window > 0) {
      let sliceLen = len - p;
      if (sliceLen > window)
        sliceLen = window;
      if (sliceLen > packetSize)
        sliceLen = packetSize;

      if (p === 0 && sliceLen === len)
        protocol.channelExtData(id, data, STDERR);
      else
        protocol.channelExtData(id, bufferSlice(data, p, p + sliceLen), STDERR);

      p += sliceLen;
      window -= sliceLen;
    }

    outgoing.window = window;

    if (len - p > 0) {
      if (window === 0)
        channel._waitWindow = true;
      if (p > 0)
        channel._chunkErr = bufferSlice(data, p, len);
      else
        channel._chunkErr = data;
      channel._chunkcbErr = cb;
      return;
    }

    cb();
  }
}

class Channel extends DuplexStream {
  constructor(client, info, opts) {
    const streamOpts = {
      highWaterMark: MAX_WINDOW,
      allowHalfOpen: (!opts || (opts && opts.allowHalfOpen !== false)),
      emitClose: false,
    };
    super(streamOpts);
    this.allowHalfOpen = streamOpts.allowHalfOpen;

    const server = !!(opts && opts.server);

    this.server = server;
    this.type = info.type;
    this.subtype = undefined;

    /*
      incoming and outgoing contain these properties:
      {
        id: undefined,
        window: undefined,
        packetSize: undefined,
        state: 'closed'
      }
    */
    this.incoming = info.incoming;
    this.outgoing = info.outgoing;
    this._callbacks = [];

    this._client = client;
    this._hasX11 = false;
    this._exit = {
      code: undefined,
      signal: undefined,
      dump: undefined,
      desc: undefined,
    };

    this.stdin = this.stdout = this;

    if (server)
      this.stderr = new ServerStderr(this);
    else
      this.stderr = new ClientStderr(this, streamOpts);

    // Outgoing data
    this._waitWindow = false; // SSH-level backpressure

    // Incoming data
    this._waitChanDrain = false; // Channel Readable side backpressure

    this._chunk = undefined;
    this._chunkcb = undefined;
    this._chunkErr = undefined;
    this._chunkcbErr = undefined;

    this.on('finish', onFinish)
        .on('prefinish', onFinish); // For node v0.11+

    this.on('end', onEnd).on('close', onEnd);
  }

  _read(n) {
    if (this._waitChanDrain) {
      this._waitChanDrain = false;
      if (this.incoming.window <= WINDOW_THRESHOLD)
        windowAdjust(this);
    }
  }

  _write(data, encoding, cb) {
    const protocol = this._client._protocol;
    const outgoing = this.outgoing;
    const packetSize = outgoing.packetSize;
    const id = outgoing.id;
    let window = outgoing.window;
    const len = data.length;
    let p = 0;

    if (outgoing.state !== 'open')
      return;

    while (len - p > 0 && window > 0) {
      let sliceLen = len - p;
      if (sliceLen > window)
        sliceLen = window;
      if (sliceLen > packetSize)
        sliceLen = packetSize;

      if (p === 0 && sliceLen === len)
        protocol.channelData(id, data);
      else
        protocol.channelData(id, bufferSlice(data, p, p + sliceLen));

      p += sliceLen;
      window -= sliceLen;
    }

    outgoing.window = window;

    if (len - p > 0) {
      if (window === 0)
        this._waitWindow = true;
      if (p > 0)
        this._chunk = bufferSlice(data, p, len);
      else
        this._chunk = data;
      this._chunkcb = cb;
      return;
    }

    cb();
  }

  eof() {
    if (this.outgoing.state === 'open') {
      this.outgoing.state = 'eof';
      this._client._protocol.channelEOF(this.outgoing.id);
    }
  }

  close() {
    if (this.outgoing.state === 'open' || this.outgoing.state === 'eof') {
      this.outgoing.state = 'closing';
      this._client._protocol.channelClose(this.outgoing.id);
    }
  }

  destroy() {
    this.end();
    this.close();
  }

  // Session type-specific methods =============================================
  setWindow(rows, cols, height, width) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (this.type === 'session'
        && (this.subtype === 'shell' || this.subtype === 'exec')
        && this.writable
        && this.outgoing.state === 'open') {
      this._client._protocol.windowChange(this.outgoing.id,
                                          rows,
                                          cols,
                                          height,
                                          width);
    }
  }

  signal(signalName) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (this.type === 'session'
        && this.writable
        && this.outgoing.state === 'open') {
      this._client._protocol.signal(this.outgoing.id, signalName);
    }
  }

  exit(statusOrSignal, coreDumped, msg) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (this.type === 'session'
        && this.writable
        && this.outgoing.state === 'open') {
      if (typeof statusOrSignal === 'number') {
        this._client._protocol.exitStatus(this.outgoing.id, statusOrSignal);
      } else {
        this._client._protocol.exitSignal(this.outgoing.id,
                                          statusOrSignal,
                                          coreDumped,
                                          msg);
      }
    }
  }

}

function onFinish() {
  this.eof();
  if (this.server || !this.allowHalfOpen)
    this.close();
  this.writable = false;
}

function onEnd() {
  this.readable = false;
}

function windowAdjust(self) {
  if (self.outgoing.state === 'closed')
    return;
  const amt = MAX_WINDOW - self.incoming.window;
  if (amt <= 0)
    return;
  self.incoming.window += amt;
  self._client._protocol.channelWindowAdjust(self.outgoing.id, amt);
}

module.exports = {
  Channel,
  MAX_WINDOW,
  PACKET_SIZE,
  windowAdjust,
  WINDOW_THRESHOLD,
};


/***/ }),

/***/ 9054:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Socket } = __nccwpck_require__(1631);
const { Duplex } = __nccwpck_require__(2413);
const { resolve } = __nccwpck_require__(5622);
const { readFile } = __nccwpck_require__(5747);
const { execFile, spawn } = __nccwpck_require__(3129);

const { isParsedKey, parseKey } = __nccwpck_require__(2218);

const {
  makeBufferParser,
  readUInt32BE,
  writeUInt32BE,
  writeUInt32LE,
} = __nccwpck_require__(9475);

function once(cb) {
  let called = false;
  return (...args) => {
    if (called)
      return;
    called = true;
    cb(...args);
  };
}

function concat(buf1, buf2) {
  const combined = Buffer.allocUnsafe(buf1.length + buf2.length);
  buf1.copy(combined, 0);
  buf2.copy(combined, buf1.length);
  return combined;
}

function noop() {}

const EMPTY_BUF = Buffer.alloc(0);

const binaryParser = makeBufferParser();

class BaseAgent {
  getIdentities(cb) {
    cb(new Error('Missing getIdentities() implementation'));
  }
  sign(pubKey, data, options, cb) {
    if (typeof options === 'function')
      cb = options;
    cb(new Error('Missing sign() implementation'));
  }
}

class OpenSSHAgent extends BaseAgent {
  constructor(socketPath) {
    super();
    this.socketPath = socketPath;
  }

  getStream(cb) {
    cb = once(cb);
    const sock = new Socket();
    sock.on('connect', () => {
      cb(null, sock);
    });
    sock.on('close', onFail)
        .on('end', onFail)
        .on('error', onFail);
    sock.connect(this.socketPath);

    function onFail() {
      try {
        sock.destroy();
      } catch {}

      cb(new Error('Failed to connect to agent'));
    }
  }

  getIdentities(cb) {
    cb = once(cb);
    this.getStream((err, stream) => {
      function onFail(err) {
        if (stream) {
          try {
            stream.destroy();
          } catch {}
        }
        if (!err)
          err = new Error('Failed to retrieve identities from agent');
        cb(err);
      }

      if (err)
        return onFail(err);

      const protocol = new AgentProtocol(true);
      protocol.on('error', onFail);
      protocol.pipe(stream).pipe(protocol);

      stream.on('close', onFail)
            .on('end', onFail)
            .on('error', onFail);

      protocol.getIdentities((err, keys) => {
        if (err)
          return onFail(err);
        try {
          stream.destroy();
        } catch {}
        cb(null, keys);
      });
    });
  }

  sign(pubKey, data, options, cb) {
    if (typeof options === 'function') {
      cb = options;
      options = undefined;
    } else if (typeof options !== 'object' || options === null) {
      options = undefined;
    }

    cb = once(cb);
    this.getStream((err, stream) => {
      function onFail(err) {
        if (stream) {
          try {
            stream.destroy();
          } catch {}
        }
        if (!err)
          err = new Error('Failed to sign data with agent');
        cb(err);
      }

      if (err)
        return onFail(err);

      const protocol = new AgentProtocol(true);
      protocol.on('error', onFail);
      protocol.pipe(stream).pipe(protocol);

      stream.on('close', onFail)
            .on('end', onFail)
            .on('error', onFail);

      protocol.sign(pubKey, data, options, (err, sig) => {
        if (err)
          return onFail(err);

        try {
          stream.destroy();
        } catch {}

        cb(null, sig);
      });
    });
  }
}

const PageantAgent = (() => {
  const RET_ERR_BADARGS = 10;
  const RET_ERR_UNAVAILABLE = 11;
  const RET_ERR_NOMAP = 12;
  const RET_ERR_BINSTDIN = 13;
  const RET_ERR_BINSTDOUT = 14;
  const RET_ERR_BADLEN = 15;

  const EXEPATH = __nccwpck_require__.ab + "pagent4.exe";
  const ERROR = {
    [RET_ERR_BADARGS]: new Error('Invalid pagent.exe arguments'),
    [RET_ERR_UNAVAILABLE]: new Error('Pageant is not running'),
    [RET_ERR_NOMAP]: new Error('pagent.exe could not create an mmap'),
    [RET_ERR_BINSTDIN]: new Error('pagent.exe could not set mode for stdin'),
    [RET_ERR_BINSTDOUT]: new Error('pagent.exe could not set mode for stdout'),
    [RET_ERR_BADLEN]:
      new Error('pagent.exe did not get expected input payload'),
  };

  function destroy(stream) {
    stream.buffer = null;
    if (stream.proc) {
      stream.proc.kill();
      stream.proc = undefined;
    }
  }

  class PageantSocket extends Duplex {
    constructor() {
      super();
      this.proc = undefined;
      this.buffer = null;
    }
    _read(n) {}
    _write(data, encoding, cb) {
      if (this.buffer === null) {
        this.buffer = data;
      } else {
        const newBuffer = Buffer.allocUnsafe(this.buffer.length + data.length);
        this.buffer.copy(newBuffer, 0);
        data.copy(newBuffer, this.buffer.length);
        this.buffer = newBuffer;
      }
      // Wait for at least all length bytes
      if (this.buffer.length < 4)
        return cb();

      const len = readUInt32BE(this.buffer, 0);
      // Make sure we have a full message before querying pageant
      if ((this.buffer.length - 4) < len)
        return cb();

      data = this.buffer.slice(0, 4 + len);
      if (this.buffer.length > (4 + len))
        return cb(new Error('Unexpected multiple agent requests'));
      this.buffer = null;

      let error;
      const proc = this.proc = spawn(__nccwpck_require__.ab + "pagent4.exe", [ data.length ]);
      proc.stdout.on('data', (data) => {
        this.push(data);
      });
      proc.on('error', (err) => {
        error = err;
        cb(error);
      });
      proc.on('close', (code) => {
        this.proc = undefined;
        if (!error) {
          if (error = ERROR[code])
            return cb(error);
          cb();
        }
      });
      proc.stdin.end(data);
    }
    _final(cb) {
      destroy(this);
      cb();
    }
    _destroy(err, cb) {
      destroy(this);
      cb();
    }
  }

  return class PageantAgent extends OpenSSHAgent {
    getStream(cb) {
      cb(null, new PageantSocket());
    }
  };
})();

const CygwinAgent = (() => {
  const RE_CYGWIN_SOCK = /^!<socket >(\d+) s ([A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8})/;

  return class CygwinAgent extends OpenSSHAgent {
    getStream(cb) {
      cb = once(cb);

      // The cygwin ssh-agent connection process looks like this:
      //   1. Read the "socket" as a file to get the underlying TCP port and a
      //      special "secret" that must be sent to the TCP server.
      //   2. Connect to the server listening on localhost at the TCP port.
      //   3. Send the "secret" to the server.
      //   4. The server sends back the same "secret".
      //   5. Send three 32-bit integer values of zero. This is ordinarily the
      //      pid, uid, and gid of this process, but cygwin will actually
      //      send us the correct values as a response.
      //   6. The server sends back the pid, uid, gid.
      //   7. Disconnect.
      //   8. Repeat steps 2-6, except send the received pid, uid, and gid in
      //      step 5 instead of zeroes.
      //   9. Connection is ready to be used.

      let socketPath = this.socketPath;
      let triedCygpath = false;
      readFile(socketPath, function readCygsocket(err, data) {
        if (err) {
          if (triedCygpath)
            return cb(new Error('Invalid cygwin unix socket path'));

          // Try using `cygpath` to convert a possible *nix-style path to the
          // real Windows path before giving up ...
          execFile('cygpath', ['-w', socketPath], (err, stdout, stderr) => {
            if (err || stdout.length === 0)
              return cb(new Error('Invalid cygwin unix socket path'));

            triedCygpath = true;
            socketPath = stdout.toString().replace(/[\r\n]/g, '');
            readFile(socketPath, readCygsocket);
          });
          return;
        }

        const m = RE_CYGWIN_SOCK.exec(data.toString('ascii'));
        if (!m)
          return cb(new Error('Malformed cygwin unix socket file'));

        let state;
        let bc = 0;
        let isRetrying = false;
        const inBuf = [];
        let sock;

        // Use 0 for pid, uid, and gid to ensure we get an error and also
        // a valid uid and gid from cygwin so that we don't have to figure it
        // out ourselves
        let credsBuf = Buffer.alloc(12);

        // Parse cygwin unix socket file contents
        const port = parseInt(m[1], 10);
        const secret = m[2].replace(/-/g, '');
        const secretBuf = Buffer.allocUnsafe(16);
        for (let i = 0, j = 0; j < 32; ++i, j += 2)
          secretBuf[i] = parseInt(secret.substring(j, j + 2), 16);

        // Convert to host order (always LE for Windows)
        for (let i = 0; i < 16; i += 4)
          writeUInt32LE(secretBuf, readUInt32BE(secretBuf, i), i);

        tryConnect();

        function _onconnect() {
          bc = 0;
          state = 'secret';
          sock.write(secretBuf);
        }

        function _ondata(data) {
          bc += data.length;

          if (state === 'secret') {
            // The secret we sent is echoed back to us by cygwin, not sure of
            // the reason for that, but we ignore it nonetheless ...
            if (bc === 16) {
              bc = 0;
              state = 'creds';
              sock.write(credsBuf);
            }
            return;
          }

          if (state === 'creds') {
            // If this is the first attempt, make sure to gather the valid
            // uid and gid for our next attempt
            if (!isRetrying)
              inBuf.push(data);

            if (bc === 12) {
              sock.removeListener('connect', _onconnect);
              sock.removeListener('data', _ondata);
              sock.removeListener('error', onFail);
              sock.removeListener('end', onFail);
              sock.removeListener('close', onFail);

              if (isRetrying)
                return cb(null, sock);

              isRetrying = true;
              credsBuf = Buffer.concat(inBuf);
              writeUInt32LE(credsBuf, process.pid, 0);
              sock.on('error', () => {});
              sock.destroy();

              tryConnect();
            }
          }
        }

        function onFail() {
          cb(new Error('Problem negotiating cygwin unix socket security'));
        }

        function tryConnect() {
          sock = new Socket();
          sock.on('connect', _onconnect);
          sock.on('data', _ondata);
          sock.on('error', onFail);
          sock.on('end', onFail);
          sock.on('close', onFail);
          sock.connect(port);
        }
      });
    }
  };
})();

// Format of `//./pipe/ANYTHING`, with forward slashes and backward slashes
// being interchangeable
const WINDOWS_PIPE_REGEX = /^[/\\][/\\]\.[/\\]pipe[/\\].+/;
function createAgent(path) {
  if (process.platform === 'win32' && !WINDOWS_PIPE_REGEX.test(path)) {
    return (path === 'pageant'
            ? new PageantAgent()
            : new CygwinAgent(path));
  }
  return new OpenSSHAgent(path);
}

const AgentProtocol = (() => {
  // Client->Server messages
  const SSH_AGENTC_REQUEST_IDENTITIES = 11;
  const SSH_AGENTC_SIGN_REQUEST = 13;
  // const SSH_AGENTC_ADD_IDENTITY = 17;
  // const SSH_AGENTC_REMOVE_IDENTITY = 18;
  // const SSH_AGENTC_REMOVE_ALL_IDENTITIES = 19;
  // const SSH_AGENTC_ADD_SMARTCARD_KEY = 20;
  // const SSH_AGENTC_REMOVE_SMARTCARD_KEY = 21;
  // const SSH_AGENTC_LOCK = 22;
  // const SSH_AGENTC_UNLOCK = 23;
  // const SSH_AGENTC_ADD_ID_CONSTRAINED = 25;
  // const SSH_AGENTC_ADD_SMARTCARD_KEY_CONSTRAINED = 26;
  // const SSH_AGENTC_EXTENSION = 27;
  // Server->Client messages
  const SSH_AGENT_FAILURE = 5;
  // const SSH_AGENT_SUCCESS = 6;
  const SSH_AGENT_IDENTITIES_ANSWER = 12;
  const SSH_AGENT_SIGN_RESPONSE = 14;
  // const SSH_AGENT_EXTENSION_FAILURE = 28;

  // const SSH_AGENT_CONSTRAIN_LIFETIME = 1;
  // const SSH_AGENT_CONSTRAIN_CONFIRM = 2;
  // const SSH_AGENT_CONSTRAIN_EXTENSION = 255;

  const SSH_AGENT_RSA_SHA2_256 = (1 << 1);
  const SSH_AGENT_RSA_SHA2_512 = (1 << 2);

  const ROLE_CLIENT = 0;
  const ROLE_SERVER = 1;

  // Ensures that responses get sent back in the same order the requests were
  // received
  function processResponses(protocol) {
    let ret;
    while (protocol[SYM_REQS].length) {
      const nextResponse = protocol[SYM_REQS][0][SYM_RESP];
      if (nextResponse === undefined)
        break;

      protocol[SYM_REQS].shift();
      ret = protocol.push(nextResponse);
    }
    return ret;
  }

  const SYM_TYPE = Symbol('Inbound Request Type');
  const SYM_RESP = Symbol('Inbound Request Response');
  const SYM_CTX = Symbol('Inbound Request Context');
  class AgentInboundRequest {
    constructor(type, ctx) {
      this[SYM_TYPE] = type;
      this[SYM_RESP] = undefined;
      this[SYM_CTX] = ctx;
    }
    hasResponded() {
      return (this[SYM_RESP] !== undefined);
    }
    getType() {
      return this[SYM_TYPE];
    }
    getContext() {
      return this[SYM_CTX];
    }
  }
  function respond(protocol, req, data) {
    req[SYM_RESP] = data;
    return processResponses(protocol);
  }

  function cleanup(protocol) {
    protocol[SYM_BUFFER] = null;
    if (protocol[SYM_MODE] === ROLE_CLIENT) {
      const reqs = protocol[SYM_REQS];
      if (reqs && reqs.length) {
        protocol[SYM_REQS] = [];
        for (const req of reqs)
          req.cb(new Error('No reply from server'));
      }
    }

    // Node streams hackery to make streams do the "right thing"
    try {
      protocol.end();
    } catch {}
    setImmediate(() => {
      if (!protocol[SYM_ENDED])
        protocol.emit('end');
      if (!protocol[SYM_CLOSED])
        protocol.emit('close');
    });
  }

  function onClose() {
    this[SYM_CLOSED] = true;
  }

  function onEnd() {
    this[SYM_ENDED] = true;
  }

  const SYM_REQS = Symbol('Requests');
  const SYM_MODE = Symbol('Agent Protocol Role');
  const SYM_BUFFER = Symbol('Agent Protocol Buffer');
  const SYM_MSGLEN = Symbol('Agent Protocol Current Message Length');
  const SYM_CLOSED = Symbol('Agent Protocol Closed');
  const SYM_ENDED = Symbol('Agent Protocol Ended');
  // Implementation based on:
  // https://tools.ietf.org/html/draft-miller-ssh-agent-04
  return class AgentProtocol extends Duplex {
    /*
        Notes:
          - `constraint` type consists of:
               byte                    constraint_type
               byte[]                  constraint_data
            where `constraint_type` is one of:
              * SSH_AGENT_CONSTRAIN_LIFETIME
                - `constraint_data` consists of:
                     uint32                  seconds
              * SSH_AGENT_CONSTRAIN_CONFIRM
                - `constraint_data` N/A
              * SSH_AGENT_CONSTRAIN_EXTENSION
                - `constraint_data` consists of:
                     string                  extension name
                     byte[]                  extension-specific details
    */

    constructor(isClient) {
      super({ autoDestroy: true, emitClose: false });
      this[SYM_MODE] = (isClient ? ROLE_CLIENT : ROLE_SERVER);
      this[SYM_REQS] = [];
      this[SYM_BUFFER] = null;
      this[SYM_MSGLEN] = -1;
      this.once('end', onEnd);
      this.once('close', onClose);
    }

    _read(n) {}

    _write(data, encoding, cb) {
      /*
          Messages are of the format:
            uint32                    message length
            byte                      message type
            byte[message length - 1]  message contents
      */
      if (this[SYM_BUFFER] === null)
        this[SYM_BUFFER] = data;
      else
        this[SYM_BUFFER] = concat(this[SYM_BUFFER], data);

      let buffer = this[SYM_BUFFER];
      let bufferLen = buffer.length;

      let p = 0;
      while (p < bufferLen) {
        // Wait for length + type
        if (bufferLen < 5)
          break;

        if (this[SYM_MSGLEN] === -1)
          this[SYM_MSGLEN] = readUInt32BE(buffer, p);

        // Check if we have the entire message
        if (bufferLen < (4 + this[SYM_MSGLEN]))
          break;

        const msgType = buffer[p += 4];
        ++p;

        if (this[SYM_MODE] === ROLE_CLIENT) {
          if (this[SYM_REQS].length === 0)
            return cb(new Error('Received unexpected message from server'));

          const req = this[SYM_REQS].shift();

          switch (msgType) {
            case SSH_AGENT_FAILURE:
              req.cb(new Error('Agent responded with failure'));
              break;
            case SSH_AGENT_IDENTITIES_ANSWER: {
              if (req.type !== SSH_AGENTC_REQUEST_IDENTITIES)
                return cb(new Error('Agent responded with wrong message type'));

              /*
                 byte        SSH_AGENT_IDENTITIES_ANSWER
                 uint32      nkeys

                where `nkeys` is 0 or more of:
                 string      key blob
                 string      comment
              */

              binaryParser.init(buffer, p);

              const numKeys = binaryParser.readUInt32BE();

              if (numKeys === undefined) {
                binaryParser.clear();
                return cb(new Error('Malformed agent response'));
              }

              const keys = [];
              for (let i = 0; i < numKeys; ++i) {
                let pubKey = binaryParser.readString();
                if (pubKey === undefined) {
                  binaryParser.clear();
                  return cb(new Error('Malformed agent response'));
                }

                const comment = binaryParser.readString(true);
                if (comment === undefined) {
                  binaryParser.clear();
                  return cb(new Error('Malformed agent response'));
                }

                pubKey = parseKey(pubKey);
                // We continue parsing the packet if we encounter an error
                // in case the error is due to the key being an unsupported
                // type
                if (pubKey instanceof Error)
                  continue;

                pubKey.comment = pubKey.comment || comment;

                keys.push(pubKey);
              }
              p = binaryParser.pos();
              binaryParser.clear();

              req.cb(null, keys);
              break;
            }
            case SSH_AGENT_SIGN_RESPONSE: {
              if (req.type !== SSH_AGENTC_SIGN_REQUEST)
                return cb(new Error('Agent responded with wrong message type'));

              /*
                 byte        SSH_AGENT_SIGN_RESPONSE
                 string      signature
              */

              binaryParser.init(buffer, p);
              let signature = binaryParser.readString();
              p = binaryParser.pos();
              binaryParser.clear();

              if (signature === undefined)
                return cb(new Error('Malformed agent response'));

              // We strip the algorithm from OpenSSH's output and assume it's
              // using the algorithm we specified. This makes it easier on
              // custom Agent implementations so they don't have to construct
              // the correct binary format for a (OpenSSH-style) signature.

              // TODO: verify signature type based on key and options used
              // during initial sign request
              binaryParser.init(signature, 0);
              binaryParser.readString(true);
              signature = binaryParser.readString();
              binaryParser.clear();

              if (signature === undefined)
                return cb(new Error('Malformed OpenSSH signature format'));

              req.cb(null, signature);
              break;
            }
            default:
              return cb(
                new Error('Agent responded with unsupported message type')
              );
          }
        } else {
          switch (msgType) {
            case SSH_AGENTC_REQUEST_IDENTITIES: {
              const req = new AgentInboundRequest(msgType);
              this[SYM_REQS].push(req);
              /*
                byte        SSH_AGENTC_REQUEST_IDENTITIES
              */
              this.emit('identities', req);
              break;
            }
            case SSH_AGENTC_SIGN_REQUEST: {
              /*
                byte        SSH_AGENTC_SIGN_REQUEST
                string      key_blob
                string      data
                uint32      flags
              */
              binaryParser.init(buffer, p);
              let pubKey = binaryParser.readString();
              const data = binaryParser.readString();
              const flagsVal = binaryParser.readUInt32BE();
              p = binaryParser.pos();
              binaryParser.clear();
              if (flagsVal === undefined) {
                const req = new AgentInboundRequest(msgType);
                this[SYM_REQS].push(req);
                return this.failureReply(req);
              }

              pubKey = parseKey(pubKey);
              if (pubKey instanceof Error) {
                const req = new AgentInboundRequest(msgType);
                this[SYM_REQS].push(req);
                return this.failureReply(req);
              }

              const flags = {
                hash: undefined,
              };
              let ctx;
              if (pubKey.type === 'ssh-rsa') {
                if (flagsVal & SSH_AGENT_RSA_SHA2_256) {
                  ctx = 'rsa-sha2-256';
                  flags.hash = 'sha256';
                } else if (flagsVal & SSH_AGENT_RSA_SHA2_512) {
                  ctx = 'rsa-sha2-512';
                  flags.hash = 'sha512';
                }
              }
              if (ctx === undefined)
                ctx = pubKey.type;

              const req = new AgentInboundRequest(msgType, ctx);
              this[SYM_REQS].push(req);

              this.emit('sign', req, pubKey, data, flags);
              break;
            }
            default: {
              const req = new AgentInboundRequest(msgType);
              this[SYM_REQS].push(req);
              this.failureReply(req);
            }
          }
        }

        // Get ready for next message
        this[SYM_MSGLEN] = -1;
        if (p === bufferLen) {
          // Nothing left to process for now
          this[SYM_BUFFER] = null;
          break;
        } else {
          this[SYM_BUFFER] = buffer = buffer.slice(p);
          bufferLen = buffer.length;
          p = 0;
        }
      }

      cb();
    }

    _destroy(err, cb) {
      cleanup(this);
      cb();
    }

    _final(cb) {
      cleanup(this);
      cb();
    }

    // Client->Server messages =================================================
    sign(pubKey, data, options, cb) {
      if (this[SYM_MODE] !== ROLE_CLIENT)
        throw new Error('Client-only method called with server role');

      if (typeof options === 'function') {
        cb = options;
        options = undefined;
      } else if (typeof options !== 'object' || options === null) {
        options = undefined;
      }

      let flags = 0;

      pubKey = parseKey(pubKey);
      if (pubKey instanceof Error)
        throw new Error('Invalid public key argument');

      if (pubKey.type === 'ssh-rsa' && options) {
        switch (options.hash) {
          case 'sha256':
            flags = SSH_AGENT_RSA_SHA2_256;
            break;
          case 'sha512':
            flags = SSH_AGENT_RSA_SHA2_512;
            break;
        }
      }
      pubKey = pubKey.getPublicSSH();

      /*
        byte        SSH_AGENTC_SIGN_REQUEST
        string      key_blob
        string      data
        uint32      flags
      */
      const type = SSH_AGENTC_SIGN_REQUEST;
      const keyLen = pubKey.length;
      const dataLen = data.length;
      let p = 0;
      const buf = Buffer.allocUnsafe(4 + 1 + 4 + keyLen + 4 + dataLen + 4);

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = type;

      writeUInt32BE(buf, keyLen, ++p);
      pubKey.copy(buf, p += 4);

      writeUInt32BE(buf, dataLen, p += keyLen);
      data.copy(buf, p += 4);

      writeUInt32BE(buf, flags, p += dataLen);

      if (typeof cb !== 'function')
        cb = noop;

      this[SYM_REQS].push({ type, cb });

      return this.push(buf);
    }
    getIdentities(cb) {
      if (this[SYM_MODE] !== ROLE_CLIENT)
        throw new Error('Client-only method called with server role');

      /*
        byte        SSH_AGENTC_REQUEST_IDENTITIES
      */
      const type = SSH_AGENTC_REQUEST_IDENTITIES;

      let p = 0;
      const buf = Buffer.allocUnsafe(4 + 1);

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = type;

      if (typeof cb !== 'function')
        cb = noop;

      this[SYM_REQS].push({ type, cb });

      return this.push(buf);
    }

    // Server->Client messages =================================================
    failureReply(req) {
      if (this[SYM_MODE] !== ROLE_SERVER)
        throw new Error('Server-only method called with client role');

      if (!(req instanceof AgentInboundRequest))
        throw new Error('Wrong request argument');

      if (req.hasResponded())
        return true;

      let p = 0;
      const buf = Buffer.allocUnsafe(4 + 1);

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = SSH_AGENT_FAILURE;

      return respond(this, req, buf);
    }
    getIdentitiesReply(req, keys) {
      if (this[SYM_MODE] !== ROLE_SERVER)
        throw new Error('Server-only method called with client role');

      if (!(req instanceof AgentInboundRequest))
        throw new Error('Wrong request argument');

      if (req.hasResponded())
        return true;

      /*
         byte        SSH_AGENT_IDENTITIES_ANSWER
         uint32      nkeys

        where `nkeys` is 0 or more of:
         string      key blob
         string      comment
      */

      if (req.getType() !== SSH_AGENTC_REQUEST_IDENTITIES)
        throw new Error('Invalid response to request');

      if (!Array.isArray(keys))
        throw new Error('Keys argument must be an array');

      let totalKeysLen = 4; // Include `nkeys` size

      const newKeys = [];
      for (let i = 0; i < keys.length; ++i) {
        const entry = keys[i];
        if (typeof entry !== 'object' || entry === null)
          throw new Error(`Invalid key entry: ${entry}`);

        let pubKey;
        let comment;
        if (isParsedKey(entry)) {
          pubKey = entry;
        } else if (isParsedKey(entry.pubKey)) {
          pubKey = entry.pubKey;
        } else {
          if (typeof entry.pubKey !== 'object' || entry.pubKey === null)
            continue;
          ({ pubKey, comment } = entry.pubKey);
          pubKey = parseKey(pubKey);
          if (pubKey instanceof Error)
            continue; // TODO: add debug output
        }
        comment = pubKey.comment || comment;
        pubKey = pubKey.getPublicSSH();

        totalKeysLen += 4 + pubKey.length;

        if (comment && typeof comment === 'string')
          comment = Buffer.from(comment);
        else if (!Buffer.isBuffer(comment))
          comment = EMPTY_BUF;

        totalKeysLen += 4 + comment.length;

        newKeys.push({ pubKey, comment });
      }

      let p = 0;
      const buf = Buffer.allocUnsafe(4 + 1 + totalKeysLen);

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = SSH_AGENT_IDENTITIES_ANSWER;

      writeUInt32BE(buf, newKeys.length, ++p);
      p += 4;
      for (let i = 0; i < newKeys.length; ++i) {
        const { pubKey, comment } = newKeys[i];

        writeUInt32BE(buf, pubKey.length, p);
        pubKey.copy(buf, p += 4);

        writeUInt32BE(buf, comment.length, p += pubKey.length);
        p += 4;
        if (comment.length) {
          comment.copy(buf, p);
          p += comment.length;
        }
      }

      return respond(this, req, buf);
    }
    signReply(req, signature) {
      if (this[SYM_MODE] !== ROLE_SERVER)
        throw new Error('Server-only method called with client role');

      if (!(req instanceof AgentInboundRequest))
        throw new Error('Wrong request argument');

      if (req.hasResponded())
        return true;

      /*
         byte        SSH_AGENT_SIGN_RESPONSE
         string      signature
      */

      if (req.getType() !== SSH_AGENTC_SIGN_REQUEST)
        throw new Error('Invalid response to request');

      if (!Buffer.isBuffer(signature))
        throw new Error('Signature argument must be a Buffer');

      if (signature.length === 0)
        throw new Error('Signature argument must be non-empty');

      /*
        OpenSSH agent signatures are encoded as:

          string    signature format identifier (as specified by the
                    public key/certificate format)
          byte[n]   signature blob in format specific encoding.
            - This is actually a `string` for: rsa, dss, ecdsa, and ed25519
              types
      */

      let p = 0;
      const sigFormat = req.getContext();
      const sigFormatLen = Buffer.byteLength(sigFormat);
      const buf = Buffer.allocUnsafe(
        4 + 1 + 4 + 4 + sigFormatLen + 4 + signature.length
      );

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = SSH_AGENT_SIGN_RESPONSE;

      writeUInt32BE(buf, 4 + sigFormatLen + 4 + signature.length, ++p);
      writeUInt32BE(buf, sigFormatLen, p += 4);
      buf.utf8Write(sigFormat, p += 4, sigFormatLen);
      writeUInt32BE(buf, signature.length, p += sigFormatLen);
      signature.copy(buf, p += 4);

      return respond(this, req, buf);
    }
  };
})();

const SYM_AGENT = Symbol('Agent');
const SYM_AGENT_KEYS = Symbol('Agent Keys');
const SYM_AGENT_KEYS_IDX = Symbol('Agent Keys Index');
const SYM_AGENT_CBS = Symbol('Agent Init Callbacks');
class AgentContext {
  constructor(agent) {
    if (typeof agent === 'string')
      agent = createAgent(agent);
    else if (!isAgent(agent))
      throw new Error('Invalid agent argument');
    this[SYM_AGENT] = agent;
    this[SYM_AGENT_KEYS] = null;
    this[SYM_AGENT_KEYS_IDX] = -1;
    this[SYM_AGENT_CBS] = null;
  }
  init(cb) {
    if (typeof cb !== 'function')
      cb = noop;

    if (this[SYM_AGENT_KEYS] === null) {
      if (this[SYM_AGENT_CBS] === null) {
        this[SYM_AGENT_CBS] = [cb];

        const doCbs = (...args) => {
          process.nextTick(() => {
            const cbs = this[SYM_AGENT_CBS];
            this[SYM_AGENT_CBS] = null;
            for (const cb of cbs)
              cb(...args);
          });
        };

        this[SYM_AGENT].getIdentities(once((err, keys) => {
          if (err)
            return doCbs(err);

          if (!Array.isArray(keys)) {
            return doCbs(new Error(
              'Agent implementation failed to provide keys'
            ));
          }

          const newKeys = [];
          for (let key of keys) {
            key = parseKey(key);
            if (key instanceof Error) {
              // TODO: add debug output
              continue;
            }
            newKeys.push(key);
          }

          this[SYM_AGENT_KEYS] = newKeys;
          this[SYM_AGENT_KEYS_IDX] = -1;
          doCbs();
        }));
      } else {
        this[SYM_AGENT_CBS].push(cb);
      }
    } else {
      process.nextTick(cb);
    }
  }
  nextKey() {
    if (this[SYM_AGENT_KEYS] === null
        || ++this[SYM_AGENT_KEYS_IDX] >= this[SYM_AGENT_KEYS].length) {
      return false;
    }

    return this[SYM_AGENT_KEYS][this[SYM_AGENT_KEYS_IDX]];
  }
  currentKey() {
    if (this[SYM_AGENT_KEYS] === null
        || this[SYM_AGENT_KEYS_IDX] >= this[SYM_AGENT_KEYS].length) {
      return null;
    }

    return this[SYM_AGENT_KEYS][this[SYM_AGENT_KEYS_IDX]];
  }
  pos() {
    if (this[SYM_AGENT_KEYS] === null
        || this[SYM_AGENT_KEYS_IDX] >= this[SYM_AGENT_KEYS].length) {
      return -1;
    }

    return this[SYM_AGENT_KEYS_IDX];
  }
  reset() {
    this[SYM_AGENT_KEYS_IDX] = -1;
  }

  sign(...args) {
    this[SYM_AGENT].sign(...args);
  }
}

function isAgent(val) {
  return (val instanceof BaseAgent);
}

module.exports = {
  AgentContext,
  AgentProtocol,
  BaseAgent,
  createAgent,
  CygwinAgent,
  isAgent,
  OpenSSHAgent,
  PageantAgent,
};


/***/ }),

/***/ 6063:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// TODO:
//    * add `.connected` or similar property to allow immediate connection
//      status checking
//    * add/improve debug output during user authentication phase


const {
  createHash,
  getHashes,
  randomFillSync,
} = __nccwpck_require__(6417);
const { Socket } = __nccwpck_require__(1631);
const { lookup: dnsLookup } = __nccwpck_require__(881);
const EventEmitter = __nccwpck_require__(8614);
const HASHES = getHashes();

const {
  COMPAT,
  CHANNEL_EXTENDED_DATATYPE: { STDERR },
  CHANNEL_OPEN_FAILURE,
  DEFAULT_CIPHER,
  DEFAULT_COMPRESSION,
  DEFAULT_KEX,
  DEFAULT_MAC,
  DEFAULT_SERVER_HOST_KEY,
  DISCONNECT_REASON,
  DISCONNECT_REASON_BY_VALUE,
  SUPPORTED_CIPHER,
  SUPPORTED_COMPRESSION,
  SUPPORTED_KEX,
  SUPPORTED_MAC,
  SUPPORTED_SERVER_HOST_KEY,
} = __nccwpck_require__(6832);
const { init: cryptoInit } = __nccwpck_require__(5708);
const Protocol = __nccwpck_require__(9031);
const { parseKey } = __nccwpck_require__(2218);
const { SFTP } = __nccwpck_require__(2026);
const {
  bufferCopy,
  makeBufferParser,
  makeError,
  readUInt32BE,
  sigSSHToASN1,
  writeUInt32BE,
} = __nccwpck_require__(9475);

const { AgentContext, createAgent, isAgent } = __nccwpck_require__(9054);
const {
  Channel,
  MAX_WINDOW,
  PACKET_SIZE,
  windowAdjust,
  WINDOW_THRESHOLD,
} = __nccwpck_require__(3204);
const {
  ChannelManager,
  generateAlgorithmList,
  isWritable,
  onChannelOpenFailure,
  onCHANNEL_CLOSE,
} = __nccwpck_require__(834);

const bufferParser = makeBufferParser();
const sigParser = makeBufferParser();
const RE_OPENSSH = /^OpenSSH_(?:(?![0-4])\d)|(?:\d{2,})/;
const noop = (err) => {};

class Client extends EventEmitter {
  constructor() {
    super();

    this.config = {
      host: undefined,
      port: undefined,
      localAddress: undefined,
      localPort: undefined,
      forceIPv4: undefined,
      forceIPv6: undefined,
      keepaliveCountMax: undefined,
      keepaliveInterval: undefined,
      readyTimeout: undefined,
      ident: undefined,

      username: undefined,
      password: undefined,
      privateKey: undefined,
      tryKeyboard: undefined,
      agent: undefined,
      allowAgentFwd: undefined,
      authHandler: undefined,

      hostHashAlgo: undefined,
      hostHashCb: undefined,
      strictVendor: undefined,
      debug: undefined
    };

    this._agent = undefined;
    this._readyTimeout = undefined;
    this._chanMgr = undefined;
    this._callbacks = undefined;
    this._forwarding = undefined;
    this._forwardingUnix = undefined;
    this._acceptX11 = undefined;
    this._agentFwdEnabled = undefined;
    this._remoteVer = undefined;

    this._protocol = undefined;
    this._sock = undefined;
    this._resetKA = undefined;
  }

  connect(cfg) {
    if (this._sock && isWritable(this._sock)) {
      this.once('close', () => {
        this.connect(cfg);
      });
      this.end();
      return this;
    }

    this.config.host = cfg.hostname || cfg.host || 'localhost';
    this.config.port = cfg.port || 22;
    this.config.localAddress = (typeof cfg.localAddress === 'string'
                                ? cfg.localAddress
                                : undefined);
    this.config.localPort = (typeof cfg.localPort === 'string'
                             || typeof cfg.localPort === 'number'
                             ? cfg.localPort
                             : undefined);
    this.config.forceIPv4 = cfg.forceIPv4 || false;
    this.config.forceIPv6 = cfg.forceIPv6 || false;
    this.config.keepaliveCountMax = (typeof cfg.keepaliveCountMax === 'number'
                                     && cfg.keepaliveCountMax >= 0
                                     ? cfg.keepaliveCountMax
                                     : 3);
    this.config.keepaliveInterval = (typeof cfg.keepaliveInterval === 'number'
                                     && cfg.keepaliveInterval > 0
                                     ? cfg.keepaliveInterval
                                     : 0);
    this.config.readyTimeout = (typeof cfg.readyTimeout === 'number'
                                && cfg.readyTimeout >= 0
                                ? cfg.readyTimeout
                                : 20000);
    this.config.ident = (typeof cfg.ident === 'string'
                         || Buffer.isBuffer(cfg.ident)
                         ? cfg.ident
                         : undefined);

    const algorithms = {
      kex: undefined,
      serverHostKey: undefined,
      cs: {
        cipher: undefined,
        mac: undefined,
        compress: undefined,
        lang: [],
      },
      sc: undefined,
    };
    let allOfferDefaults = true;
    if (typeof cfg.algorithms === 'object' && cfg.algorithms !== null) {
      algorithms.kex = generateAlgorithmList(cfg.algorithms.kex,
                                             DEFAULT_KEX,
                                             SUPPORTED_KEX);
      if (algorithms.kex !== DEFAULT_KEX)
        allOfferDefaults = false;

      algorithms.serverHostKey =
        generateAlgorithmList(cfg.algorithms.serverHostKey,
                              DEFAULT_SERVER_HOST_KEY,
                              SUPPORTED_SERVER_HOST_KEY);
      if (algorithms.serverHostKey !== DEFAULT_SERVER_HOST_KEY)
        allOfferDefaults = false;

      algorithms.cs.cipher = generateAlgorithmList(cfg.algorithms.cipher,
                                                   DEFAULT_CIPHER,
                                                   SUPPORTED_CIPHER);
      if (algorithms.cs.cipher !== DEFAULT_CIPHER)
        allOfferDefaults = false;

      algorithms.cs.mac = generateAlgorithmList(cfg.algorithms.hmac,
                                                DEFAULT_MAC,
                                                SUPPORTED_MAC);
      if (algorithms.cs.mac !== DEFAULT_MAC)
        allOfferDefaults = false;

      algorithms.cs.compress = generateAlgorithmList(cfg.algorithms.compress,
                                                     DEFAULT_COMPRESSION,
                                                     SUPPORTED_COMPRESSION);
      if (algorithms.cs.compress !== DEFAULT_COMPRESSION)
        allOfferDefaults = false;

      if (!allOfferDefaults)
        algorithms.sc = algorithms.cs;
    }

    if (typeof cfg.username === 'string')
      this.config.username = cfg.username;
    else if (typeof cfg.user === 'string')
      this.config.username = cfg.user;
    else
      throw new Error('Invalid username');

    this.config.password = (typeof cfg.password === 'string'
                            ? cfg.password
                            : undefined);
    this.config.privateKey = (typeof cfg.privateKey === 'string'
                              || Buffer.isBuffer(cfg.privateKey)
                              ? cfg.privateKey
                              : undefined);
    this.config.localHostname = (typeof cfg.localHostname === 'string'
                                 ? cfg.localHostname
                                 : undefined);
    this.config.localUsername = (typeof cfg.localUsername === 'string'
                                 ? cfg.localUsername
                                 : undefined);
    this.config.tryKeyboard = (cfg.tryKeyboard === true);
    if (typeof cfg.agent === 'string' && cfg.agent.length)
      this.config.agent = createAgent(cfg.agent);
    else if (isAgent(cfg.agent))
      this.config.agent = cfg.agent;
    else
      this.config.agent = undefined;
    this.config.allowAgentFwd = (cfg.agentForward === true
                                 && this.config.agent !== undefined);
    let authHandler = this.config.authHandler = (
      typeof cfg.authHandler === 'function'
      || Array.isArray(cfg.authHandler)
      ? cfg.authHandler
      : undefined
    );

    this.config.strictVendor = (typeof cfg.strictVendor === 'boolean'
                                ? cfg.strictVendor
                                : true);

    const debug = this.config.debug = (typeof cfg.debug === 'function'
                                       ? cfg.debug
                                       : undefined);

    if (cfg.agentForward === true && !this.config.allowAgentFwd) {
      throw new Error(
        'You must set a valid agent path to allow agent forwarding'
      );
    }

    let callbacks = this._callbacks = [];
    this._chanMgr = new ChannelManager(this);
    this._forwarding = {};
    this._forwardingUnix = {};
    this._acceptX11 = 0;
    this._agentFwdEnabled = false;
    this._agent = (this.config.agent ? this.config.agent : undefined);
    this._remoteVer = undefined;
    let privateKey;

    if (this.config.privateKey) {
      privateKey = parseKey(this.config.privateKey, cfg.passphrase);
      if (privateKey instanceof Error)
        throw new Error(`Cannot parse privateKey: ${privateKey.message}`);
      if (Array.isArray(privateKey)) {
        // OpenSSH's newer format only stores 1 key for now
        privateKey = privateKey[0];
      }
      if (privateKey.getPrivatePEM() === null) {
        throw new Error(
          'privateKey value does not contain a (valid) private key'
        );
      }
    }

    let hostVerifier;
    if (typeof cfg.hostVerifier === 'function') {
      const hashCb = cfg.hostVerifier;
      let hasher;
      if (HASHES.indexOf(cfg.hostHash) !== -1) {
        // Default to old behavior of hashing on user's behalf
        hasher = createHash(cfg.hostHash);
      }
      hostVerifier = (key, verify) => {
        if (hasher) {
          hasher.update(key);
          key = hasher.digest('hex');
        }
        const ret = hashCb(key, verify);
        if (ret !== undefined)
          verify(ret);
      };
    }

    const sock = this._sock = (cfg.sock || new Socket());
    let ready = false;
    let sawHeader = false;
    if (this._protocol)
      this._protocol.cleanup();
    const DEBUG_HANDLER = (!debug ? undefined : (p, display, msg) => {
      debug(`Debug output from server: ${JSON.stringify(msg)}`);
    });
    const proto = this._protocol = new Protocol({
      ident: this.config.ident,
      offer: (allOfferDefaults ? undefined : algorithms),
      onWrite: (data) => {
        if (isWritable(sock))
          sock.write(data);
      },
      onError: (err) => {
        if (err.level === 'handshake')
          clearTimeout(this._readyTimeout);
        if (!proto._destruct)
          sock.removeAllListeners('data');
        this.emit('error', err);
        try {
          sock.end();
        } catch {}
      },
      onHeader: (header) => {
        sawHeader = true;
        this._remoteVer = header.versions.software;
        if (header.greeting)
          this.emit('greeting', header.greeting);
      },
      onHandshakeComplete: (negotiated) => {
        this.emit('handshake', negotiated);
        if (!ready) {
          ready = true;
          proto.service('ssh-userauth');
        }
      },
      debug,
      hostVerifier,
      messageHandlers: {
        DEBUG: DEBUG_HANDLER,
        DISCONNECT: (p, reason, desc) => {
          if (reason !== DISCONNECT_REASON.BY_APPLICATION) {
            if (!desc) {
              desc = DISCONNECT_REASON_BY_VALUE[reason];
              if (desc === undefined)
                desc = `Unexpected disconnection reason: ${reason}`;
            }
            const err = new Error(desc);
            err.code = reason;
            this.emit('error', err);
          }
          sock.end();
        },
        SERVICE_ACCEPT: (p, name) => {
          if (name === 'ssh-userauth')
            tryNextAuth();
        },
        USERAUTH_BANNER: (p, msg) => {
          this.emit('banner', msg);
        },
        USERAUTH_SUCCESS: (p) => {
          // Start keepalive mechanism
          resetKA();

          clearTimeout(this._readyTimeout);

          this.emit('ready');
        },
        USERAUTH_FAILURE: (p, authMethods, partialSuccess) => {
          if (curAuth.type === 'agent') {
            const pos = curAuth.agentCtx.pos();
            debug && debug(`Client: Agent key #${pos + 1} failed`);
            return tryNextAgentKey();
          }

          debug && debug(`Client: ${curAuth.type} auth failed`);

          curPartial = partialSuccess;
          curAuthsLeft = authMethods;
          tryNextAuth();
        },
        USERAUTH_PASSWD_CHANGEREQ: (p, prompt) => {
          if (curAuth.type === 'password') {
            // TODO: support a `changePrompt()` on `curAuth` that defaults to
            // emitting 'change password' as before
            this.emit('change password', prompt, (newPassword) => {
              proto.authPassword(
                this.config.username,
                this.config.password,
                newPassword
              );
            });
          }
        },
        USERAUTH_PK_OK: (p) => {
          if (curAuth.type === 'agent') {
            const key = curAuth.agentCtx.currentKey();
            proto.authPK(curAuth.username, key, (buf, cb) => {
              curAuth.agentCtx.sign(key, buf, {}, (err, signed) => {
                if (err) {
                  err.level = 'agent';
                  this.emit('error', err);
                } else {
                  return cb(signed);
                }

                tryNextAgentKey();
              });
            });
          } else if (curAuth.type === 'publickey') {
            proto.authPK(curAuth.username, curAuth.key, (buf, cb) => {
              const signature = curAuth.key.sign(buf);
              if (signature instanceof Error) {
                signature.message =
                  `Error signing data with key: ${signature.message}`;
                signature.level = 'client-authentication';
                this.emit('error', signature);
                return tryNextAuth();
              }
              cb(signature);
            });
          }
        },
        USERAUTH_INFO_REQUEST: (p, name, instructions, prompts) => {
          if (curAuth.type === 'keyboard-interactive') {
            const nprompts = (Array.isArray(prompts) ? prompts.length : 0);
            if (nprompts === 0) {
              debug && debug(
                'Client: Sending automatic USERAUTH_INFO_RESPONSE'
              );
              proto.authInfoRes();
              return;
            }
            // We sent a keyboard-interactive user authentication request and
            // now the server is sending us the prompts we need to present to
            // the user
            curAuth.prompt(
              name,
              instructions,
              '',
              prompts,
              (answers) => {
                proto.authInfoRes(answers);
              }
            );
          }
        },
        REQUEST_SUCCESS: (p, data) => {
          if (callbacks.length)
            callbacks.shift()(false, data);
        },
        REQUEST_FAILURE: (p) => {
          if (callbacks.length)
            callbacks.shift()(true);
        },
        GLOBAL_REQUEST: (p, name, wantReply, data) => {
          switch (name) {
            case 'hostkeys-00@openssh.com':
              // Automatically verify keys before passing to end user
              hostKeysProve(this, data, (err, keys) => {
                if (err)
                  return;
                this.emit('hostkeys', keys);
              });
              if (wantReply)
                proto.requestSuccess();
              break;
            default:
              // Auto-reject all other global requests, this can be especially
              // useful if the server is sending us dummy keepalive global
              // requests
              if (wantReply)
                proto.requestFailure();
          }
        },
        CHANNEL_OPEN: (p, info) => {
          // Handle incoming requests from server, typically a forwarded TCP or
          // X11 connection
          onCHANNEL_OPEN(this, info);
        },
        CHANNEL_OPEN_CONFIRMATION: (p, info) => {
          const channel = this._chanMgr.get(info.recipient);
          if (typeof channel !== 'function')
            return;

          const isSFTP = (channel.type === 'sftp');
          const type = (isSFTP ? 'session' : channel.type);
          const chanInfo = {
            type,
            incoming: {
              id: info.recipient,
              window: MAX_WINDOW,
              packetSize: PACKET_SIZE,
              state: 'open'
            },
            outgoing: {
              id: info.sender,
              window: info.window,
              packetSize: info.packetSize,
              state: 'open'
            }
          };
          const instance = (
            isSFTP
            ? new SFTP(this, chanInfo, { debug })
            : new Channel(this, chanInfo)
          );
          this._chanMgr.update(info.recipient, instance);
          channel(undefined, instance);
        },
        CHANNEL_OPEN_FAILURE: (p, recipient, reason, description) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'function')
            return;

          const info = { reason, description };
          onChannelOpenFailure(this, recipient, info, channel);
        },
        CHANNEL_DATA: (p, recipient, data) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          // The remote party should not be sending us data if there is no
          // window space available ...
          // TODO: raise error on data with not enough window?
          if (channel.incoming.window === 0)
            return;

          channel.incoming.window -= data.length;

          if (channel.push(data) === false) {
            channel._waitChanDrain = true;
            return;
          }

          if (channel.incoming.window <= WINDOW_THRESHOLD)
            windowAdjust(channel);
        },
        CHANNEL_EXTENDED_DATA: (p, recipient, data, type) => {
          if (type !== STDERR)
            return;

          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          // The remote party should not be sending us data if there is no
          // window space available ...
          // TODO: raise error on data with not enough window?
          if (channel.incoming.window === 0)
            return;

          channel.incoming.window -= data.length;

          if (!channel.stderr.push(data)) {
            channel._waitChanDrain = true;
            return;
          }

          if (channel.incoming.window <= WINDOW_THRESHOLD)
            windowAdjust(channel);
        },
        CHANNEL_WINDOW_ADJUST: (p, recipient, amount) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          // The other side is allowing us to send `amount` more bytes of data
          channel.outgoing.window += amount;

          if (channel._waitWindow) {
            channel._waitWindow = false;

            if (channel._chunk) {
              channel._write(channel._chunk, null, channel._chunkcb);
            } else if (channel._chunkcb) {
              channel._chunkcb();
            } else if (channel._chunkErr) {
              channel.stderr._write(channel._chunkErr,
                                    null,
                                    channel._chunkcbErr);
            } else if (channel._chunkcbErr) {
              channel._chunkcbErr();
            }
          }
        },
        CHANNEL_SUCCESS: (p, recipient) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          this._resetKA();

          if (channel._callbacks.length)
            channel._callbacks.shift()(false);
        },
        CHANNEL_FAILURE: (p, recipient) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          this._resetKA();

          if (channel._callbacks.length)
            channel._callbacks.shift()(true);
        },
        CHANNEL_REQUEST: (p, recipient, type, wantReply, data) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          const exit = channel._exit;
          if (exit.code !== undefined)
            return;
          switch (type) {
            case 'exit-status':
              channel.emit('exit', exit.code = data);
              return;
            case 'exit-signal':
              channel.emit('exit',
                           exit.code = null,
                           exit.signal = `SIG${data.signal}`,
                           exit.dump = data.coreDumped,
                           exit.desc = data.errorMessage);
              return;
          }

          // Keepalive request? OpenSSH will send one as a channel request if
          // there is a channel open

          if (wantReply)
            p.channelFailure(channel.outgoing.id);
        },
        CHANNEL_EOF: (p, recipient) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.incoming.state !== 'open')
            return;
          channel.incoming.state = 'eof';

          if (channel.readable)
            channel.push(null);
          if (channel.stderr.readable)
            channel.stderr.push(null);
        },
        CHANNEL_CLOSE: (p, recipient) => {
          onCHANNEL_CLOSE(this, recipient, this._chanMgr.get(recipient));
        },
      },
    });

    sock.pause();

    // TODO: check keepalive implementation
    // Keepalive-related
    const kainterval = this.config.keepaliveInterval;
    const kacountmax = this.config.keepaliveCountMax;
    let kacount = 0;
    let katimer;
    const sendKA = () => {
      if (++kacount > kacountmax) {
        clearInterval(katimer);
        if (sock.readable) {
          const err = new Error('Keepalive timeout');
          err.level = 'client-timeout';
          this.emit('error', err);
          sock.destroy();
        }
        return;
      }
      if (isWritable(sock)) {
        // Append dummy callback to keep correct callback order
        callbacks.push(resetKA);
        proto.ping();
      } else {
        clearInterval(katimer);
      }
    };
    function resetKA() {
      if (kainterval > 0) {
        kacount = 0;
        clearInterval(katimer);
        if (isWritable(sock))
          katimer = setInterval(sendKA, kainterval);
      }
    }
    this._resetKA = resetKA;

    const onDone = (() => {
      let called = false;
      return () => {
        if (called)
          return;
        called = true;
        if (wasConnected && !sawHeader) {
          const err =
            makeError('Connection lost before handshake', 'protocol', true);
          this.emit('error', err);
        }
      };
    })();
    const onConnect = (() => {
      let called = false;
      return () => {
        if (called)
          return;
        called = true;

        wasConnected = true;
        debug && debug('Socket connected');
        this.emit('connect');

        cryptoInit.then(() => {
          sock.on('data', (data) => {
            try {
              proto.parse(data, 0, data.length);
            } catch (ex) {
              this.emit('error', ex);
              try {
                if (isWritable(sock))
                  sock.end();
              } catch {}
            }
          });

          // Drain stderr if we are connection hopping using an exec stream
          if (sock.stderr && typeof sock.stderr.resume === 'function')
            sock.stderr.resume();

          sock.resume();
        }).catch((err) => {
          this.emit('error', err);
          try {
            if (isWritable(sock))
              sock.end();
          } catch {}
        });
      };
    })();
    let wasConnected = false;
    sock.on('connect', onConnect)
        .on('timeout', () => {
      this.emit('timeout');
    }).on('error', (err) => {
      debug && debug(`Socket error: ${err.message}`);
      clearTimeout(this._readyTimeout);
      err.level = 'client-socket';
      this.emit('error', err);
    }).on('end', () => {
      debug && debug('Socket ended');
      onDone();
      proto.cleanup();
      clearTimeout(this._readyTimeout);
      clearInterval(katimer);
      this.emit('end');
    }).on('close', () => {
      debug && debug('Socket closed');
      onDone();
      proto.cleanup();
      clearTimeout(this._readyTimeout);
      clearInterval(katimer);
      this.emit('close');

      // Notify outstanding channel requests of disconnection ...
      const callbacks_ = callbacks;
      callbacks = this._callbacks = [];
      const err = new Error('No response from server');
      for (let i = 0; i < callbacks_.length; ++i)
        callbacks_[i](err);

      // Simulate error for any channels waiting to be opened
      this._chanMgr.cleanup(err);
    });

    // Begin authentication handling ===========================================
    let curAuth;
    let curPartial = null;
    let curAuthsLeft = null;
    const authsAllowed = ['none'];
    if (this.config.password !== undefined)
      authsAllowed.push('password');
    if (privateKey !== undefined)
      authsAllowed.push('publickey');
    if (this._agent !== undefined)
      authsAllowed.push('agent');
    if (this.config.tryKeyboard)
      authsAllowed.push('keyboard-interactive');
    if (privateKey !== undefined
        && this.config.localHostname !== undefined
        && this.config.localUsername !== undefined) {
      authsAllowed.push('hostbased');
    }

    if (Array.isArray(authHandler))
      authHandler = makeSimpleAuthHandler(authHandler);
    else if (typeof authHandler !== 'function')
      authHandler = makeSimpleAuthHandler(authsAllowed);

    let hasSentAuth = false;
    const doNextAuth = (nextAuth) => {
      if (hasSentAuth)
        return;
      hasSentAuth = true;

      if (nextAuth === false) {
        const err = new Error('All configured authentication methods failed');
        err.level = 'client-authentication';
        this.emit('error', err);
        this.end();
        return;
      }

      if (typeof nextAuth === 'string') {
        // Remain backwards compatible with original `authHandler()` usage,
        // which only supported passing names of next method to try using data
        // from the `connect()` config object

        const type = nextAuth;
        if (authsAllowed.indexOf(type) === -1)
          return skipAuth(`Authentication method not allowed: ${type}`);

        const username = this.config.username;
        switch (type) {
          case 'password':
            nextAuth = { type, username, password: this.config.password };
            break;
          case 'publickey':
            nextAuth = { type, username, key: privateKey };
            break;
          case 'hostbased':
            nextAuth = {
              type,
              username,
              key: privateKey,
              localHostname: this.config.localHostname,
              localUsername: this.config.localUsername,
            };
            break;
          case 'agent':
            nextAuth = {
              type,
              username,
              agentCtx: new AgentContext(this._agent),
            };
            break;
          case 'keyboard-interactive':
            nextAuth = {
              type,
              username,
              prompt: (...args) => this.emit('keyboard-interactive', ...args),
            };
            break;
          case 'none':
            nextAuth = { type, username };
            break;
          default:
            return skipAuth(
              `Skipping unsupported authentication method: ${nextAuth}`
            );
        }
      } else if (typeof nextAuth !== 'object' || nextAuth === null) {
        return skipAuth(
          `Skipping invalid authentication attempt: ${nextAuth}`
        );
      } else {
        const username = nextAuth.username;
        if (typeof username !== 'string') {
          return skipAuth(
            `Skipping invalid authentication attempt: ${nextAuth}`
          );
        }
        const type = nextAuth.type;
        switch (type) {
          case 'password': {
            const { password } = nextAuth;
            if (typeof password !== 'string' && !Buffer.isBuffer(password))
              return skipAuth('Skipping invalid password auth attempt');
            nextAuth = { type, username, password };
            break;
          }
          case 'publickey': {
            const key = parseKey(nextAuth.key, nextAuth.passphrase);
            if (key instanceof Error)
              return skipAuth('Skipping invalid key auth attempt');
            if (!key.isPrivateKey())
              return skipAuth('Skipping non-private key');
            nextAuth = { type, username, key };
            break;
          }
          case 'hostbased': {
            const { localHostname, localUsername } = nextAuth;
            const key = parseKey(nextAuth.key, nextAuth.passphrase);
            if (key instanceof Error
                || typeof localHostname !== 'string'
                || typeof localUsername !== 'string') {
              return skipAuth('Skipping invalid hostbased auth attempt');
            }
            if (!key.isPrivateKey())
              return skipAuth('Skipping non-private key');
            nextAuth = { type, username, key, localHostname, localUsername };
            break;
          }
          case 'agent': {
            let agent = nextAuth.agent;
            if (typeof agent === 'string' && agent.length) {
              agent = createAgent(agent);
            } else if (!isAgent(agent)) {
              return skipAuth(
                `Skipping invalid agent: ${nextAuth.agent}`
              );
            }
            nextAuth = { type, username, agentCtx: new AgentContext(agent) };
            break;
          }
          case 'keyboard-interactive': {
            const { prompt } = nextAuth;
            if (typeof prompt !== 'function') {
              return skipAuth(
                'Skipping invalid keyboard-interactive auth attempt'
              );
            }
            nextAuth = { type, username, prompt };
            break;
          }
          case 'none':
            nextAuth = { type, username };
            break;
          default:
            return skipAuth(
              `Skipping unsupported authentication method: ${nextAuth}`
            );
        }
      }
      curAuth = nextAuth;

      // Begin authentication method's process
      try {
        const username = curAuth.username;
        switch (curAuth.type) {
          case 'password':
            proto.authPassword(username, curAuth.password);
            break;
          case 'publickey':
            proto.authPK(username, curAuth.key);
            break;
          case 'hostbased':
            proto.authHostbased(username,
                                curAuth.key,
                                curAuth.localHostname,
                                curAuth.localUsername,
                                (buf, cb) => {
              const signature = curAuth.key.sign(buf);
              if (signature instanceof Error) {
                signature.message =
                  `Error while signing with key: ${signature.message}`;
                signature.level = 'client-authentication';
                this.emit('error', signature);
                return tryNextAuth();
              }

              cb(signature);
            });
            break;
          case 'agent':
            curAuth.agentCtx.init((err) => {
              if (err) {
                err.level = 'agent';
                this.emit('error', err);
                return tryNextAuth();
              }
              tryNextAgentKey();
            });
            break;
          case 'keyboard-interactive':
            proto.authKeyboard(username);
            break;
          case 'none':
            proto.authNone(username);
            break;
        }
      } finally {
        hasSentAuth = false;
      }
    };

    function skipAuth(msg) {
      debug && debug(msg);
      process.nextTick(tryNextAuth);
    }

    function tryNextAuth() {
      hasSentAuth = false;
      const auth = authHandler(curAuthsLeft, curPartial, doNextAuth);
      if (hasSentAuth || auth === undefined)
        return;
      doNextAuth(auth);
    }

    const tryNextAgentKey = () => {
      if (curAuth.type === 'agent') {
        const key = curAuth.agentCtx.nextKey();
        if (key === false) {
          debug && debug('Agent: No more keys left to try');
          debug && debug('Client: agent auth failed');
          tryNextAuth();
        } else {
          const pos = curAuth.agentCtx.pos();
          debug && debug(`Agent: Trying key #${pos + 1}`);
          proto.authPK(curAuth.username, key);
        }
      }
    };

    const startTimeout = () => {
      if (this.config.readyTimeout > 0) {
        this._readyTimeout = setTimeout(() => {
          const err = new Error('Timed out while waiting for handshake');
          err.level = 'client-timeout';
          this.emit('error', err);
          sock.destroy();
        }, this.config.readyTimeout);
      }
    };

    if (!cfg.sock) {
      let host = this.config.host;
      const forceIPv4 = this.config.forceIPv4;
      const forceIPv6 = this.config.forceIPv6;

      debug && debug(`Client: Trying ${host} on port ${this.config.port} ...`);

      const doConnect = () => {
        startTimeout();
        sock.connect({
          host,
          port: this.config.port,
          localAddress: this.config.localAddress,
          localPort: this.config.localPort
        });
        sock.setNoDelay(true);
        sock.setMaxListeners(0);
        sock.setTimeout(typeof cfg.timeout === 'number' ? cfg.timeout : 0);
      };

      if ((!forceIPv4 && !forceIPv6) || (forceIPv4 && forceIPv6)) {
        doConnect();
      } else {
        dnsLookup(host, (forceIPv4 ? 4 : 6), (err, address, family) => {
          if (err) {
            const type = (forceIPv4 ? 'IPv4' : 'IPv6');
            const error = new Error(
              `Error while looking up ${type} address for '${host}': ${err}`
            );
            clearTimeout(this._readyTimeout);
            error.level = 'client-dns';
            this.emit('error', error);
            this.emit('close');
            return;
          }
          host = address;
          doConnect();
        });
      }
    } else {
      // Custom socket passed in
      startTimeout();
      if (typeof sock.connecting === 'boolean') {
        // net.Socket

        if (!sock.connecting) {
          // Already connected
          onConnect();
        }
      } else {
        // Assume socket/stream is already "connected"
        onConnect();
      }
    }

    return this;
  }

  end() {
    if (this._sock && isWritable(this._sock)) {
      this._protocol.disconnect(DISCONNECT_REASON.BY_APPLICATION);
      this._sock.end();
    }
    return this;
  }

  destroy() {
    this._sock && isWritable(this._sock) && this._sock.destroy();
    return this;
  }

  exec(cmd, opts, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    const extraOpts = { allowHalfOpen: (opts.allowHalfOpen !== false) };

    openChannel(this, 'session', extraOpts, (err, chan) => {
      if (err) {
        cb(err);
        return;
      }

      const todo = [];

      function reqCb(err) {
        if (err) {
          chan.close();
          cb(err);
          return;
        }
        if (todo.length)
          todo.shift()();
      }

      if (this.config.allowAgentFwd === true
          || (opts
              && opts.agentForward === true
              && this._agent !== undefined)) {
        todo.push(() => reqAgentFwd(chan, reqCb));
      }

      if (typeof opts === 'object' && opts !== null) {
        if (typeof opts.env === 'object' && opts.env !== null)
          reqEnv(chan, opts.env);
        if ((typeof opts.pty === 'object' && opts.pty !== null)
            || opts.pty === true) {
          todo.push(() => reqPty(chan, opts.pty, reqCb));
        }
        if ((typeof opts.x11 === 'object' && opts.x11 !== null)
            || opts.x11 === 'number'
            || opts.x11 === true) {
          todo.push(() => reqX11(chan, opts.x11, reqCb));
        }
      }

      todo.push(() => reqExec(chan, cmd, opts, cb));
      todo.shift()();
    });

    return this;
  }

  shell(wndopts, opts, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    if (typeof wndopts === 'function') {
      cb = wndopts;
      wndopts = opts = undefined;
    } else if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (wndopts && (wndopts.x11 !== undefined || wndopts.env !== undefined)) {
      opts = wndopts;
      wndopts = undefined;
    }

    openChannel(this, 'session', (err, chan) => {
      if (err) {
        cb(err);
        return;
      }

      const todo = [];

      function reqCb(err) {
        if (err) {
          chan.close();
          cb(err);
          return;
        }
        if (todo.length)
          todo.shift()();
      }

      if (this.config.allowAgentFwd === true
          || (opts
              && opts.agentForward === true
              && this._agent !== undefined)) {
        todo.push(() => reqAgentFwd(chan, reqCb));
      }

      if (wndopts !== false)
        todo.push(() => reqPty(chan, wndopts, reqCb));

      if (typeof opts === 'object' && opts !== null) {
        if (typeof opts.env === 'object' && opts.env !== null)
          reqEnv(chan, opts.env);
        if ((typeof opts.x11 === 'object' && opts.x11 !== null)
            || opts.x11 === 'number'
            || opts.x11 === true) {
          todo.push(() => reqX11(chan, opts.x11, reqCb));
        }
      }

      todo.push(() => reqShell(chan, cb));
      todo.shift()();
    });

    return this;
  }

  subsys(name, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    openChannel(this, 'session', (err, chan) => {
      if (err) {
        cb(err);
        return;
      }

      reqSubsystem(chan, name, (err, stream) => {
        if (err) {
          cb(err);
          return;
        }

        cb(undefined, stream);
      });
    });

    return this;
  }

  forwardIn(bindAddr, bindPort, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    // Send a request for the server to start forwarding TCP connections to us
    // on a particular address and port

    const wantReply = (typeof cb === 'function');

    if (wantReply) {
      this._callbacks.push((had_err, data) => {
        if (had_err) {
          cb(had_err !== true
             ? had_err
             : new Error(`Unable to bind to ${bindAddr}:${bindPort}`));
          return;
        }

        let realPort = bindPort;
        if (bindPort === 0 && data && data.length >= 4) {
          realPort = readUInt32BE(data, 0);
          if (!(this._protocol._compatFlags & COMPAT.DYN_RPORT_BUG))
            bindPort = realPort;
        }

        this._forwarding[`${bindAddr}:${bindPort}`] = realPort;

        cb(undefined, realPort);
      });
    }

    this._protocol.tcpipForward(bindAddr, bindPort, wantReply);

    return this;
  }

  unforwardIn(bindAddr, bindPort, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    // Send a request to stop forwarding us new connections for a particular
    // address and port

    const wantReply = (typeof cb === 'function');

    if (wantReply) {
      this._callbacks.push((had_err) => {
        if (had_err) {
          cb(had_err !== true
             ? had_err
             : new Error(`Unable to unbind from ${bindAddr}:${bindPort}`));
          return;
        }

        delete this._forwarding[`${bindAddr}:${bindPort}`];

        cb();
      });
    }

    this._protocol.cancelTcpipForward(bindAddr, bindPort, wantReply);

    return this;
  }

  forwardOut(srcIP, srcPort, dstIP, dstPort, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    // Send a request to forward a TCP connection to the server

    const cfg = {
      srcIP: srcIP,
      srcPort: srcPort,
      dstIP: dstIP,
      dstPort: dstPort
    };

    if (typeof cb !== 'function')
      cb = noop;

    openChannel(this, 'direct-tcpip', cfg, cb);

    return this;
  }

  openssh_noMoreSessions(cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    const wantReply = (typeof cb === 'function');

    if (!this.config.strictVendor
        || (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
      if (wantReply) {
        this._callbacks.push((had_err) => {
          if (had_err) {
            cb(had_err !== true
               ? had_err
               : new Error('Unable to disable future sessions'));
            return;
          }

          cb();
        });
      }

      this._protocol.openssh_noMoreSessions(wantReply);
      return this;
    }

    if (!wantReply)
      return this;

    process.nextTick(
      cb,
      new Error(
        'strictVendor enabled and server is not OpenSSH or compatible version'
      )
    );

    return this;
  }

  openssh_forwardInStreamLocal(socketPath, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    const wantReply = (typeof cb === 'function');

    if (!this.config.strictVendor
        || (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
      if (wantReply) {
        this._callbacks.push((had_err) => {
          if (had_err) {
            cb(had_err !== true
               ? had_err
               : new Error(`Unable to bind to ${socketPath}`));
            return;
          }
          this._forwardingUnix[socketPath] = true;
          cb();
        });
      }

      this._protocol.openssh_streamLocalForward(socketPath, wantReply);
      return this;
    }

    if (!wantReply)
      return this;

    process.nextTick(
      cb,
      new Error(
        'strictVendor enabled and server is not OpenSSH or compatible version'
      )
    );

    return this;
  }

  openssh_unforwardInStreamLocal(socketPath, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    const wantReply = (typeof cb === 'function');

    if (!this.config.strictVendor
        || (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
      if (wantReply) {
        this._callbacks.push((had_err) => {
          if (had_err) {
            cb(had_err !== true
               ? had_err
               : new Error(`Unable to unbind from ${socketPath}`));
            return;
          }
          delete this._forwardingUnix[socketPath];
          cb();
        });
      }

      this._protocol.openssh_cancelStreamLocalForward(socketPath, wantReply);
      return this;
    }

    if (!wantReply)
      return this;

    process.nextTick(
      cb,
      new Error(
        'strictVendor enabled and server is not OpenSSH or compatible version'
      )
    );

    return this;
  }

  openssh_forwardOutStreamLocal(socketPath, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    if (typeof cb !== 'function')
      cb = noop;

    if (!this.config.strictVendor
        || (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
      openChannel(this, 'direct-streamlocal@openssh.com', { socketPath }, cb);
      return this;
    }
    process.nextTick(
      cb,
      new Error(
        'strictVendor enabled and server is not OpenSSH or compatible version'
      )
    );

    return this;
  }

  sftp(cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    openChannel(this, 'sftp', (err, sftp) => {
      if (err) {
        cb(err);
        return;
      }

      reqSubsystem(sftp, 'sftp', (err, sftp_) => {
        if (err) {
          cb(err);
          return;
        }

        function removeListeners() {
          sftp.removeListener('ready', onReady);
          sftp.removeListener('error', onError);
          sftp.removeListener('exit', onExit);
          sftp.removeListener('close', onExit);
        }

        function onReady() {
          // TODO: do not remove exit/close in case remote end closes the
          // channel abruptly and we need to notify outstanding callbacks
          removeListeners();
          cb(undefined, sftp);
        }

        function onError(err) {
          removeListeners();
          cb(err);
        }

        function onExit(code, signal) {
          removeListeners();
          let msg;
          if (typeof code === 'number')
            msg = `Received exit code ${code} while establishing SFTP session`;
          else if (signal !== undefined)
            msg = `Received signal ${signal} while establishing SFTP session`;
          else
            msg = 'Received unexpected SFTP session termination';
          const err = new Error(msg);
          err.code = code;
          err.signal = signal;
          cb(err);
        }

        sftp.on('ready', onReady)
            .on('error', onError)
            .on('exit', onExit)
            .on('close', onExit);

        sftp._init();
      });
    });

    return this;
  }
}

function openChannel(self, type, opts, cb) {
  // Ask the server to open a channel for some purpose
  // (e.g. session (sftp, exec, shell), or forwarding a TCP connection
  const initWindow = MAX_WINDOW;
  const maxPacket = PACKET_SIZE;

  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  const wrapper = (err, stream) => {
    cb(err, stream);
  };
  wrapper.type = type;

  const localChan = self._chanMgr.add(wrapper);

  if (localChan === -1) {
    cb(new Error('No free channels available'));
    return;
  }

  switch (type) {
    case 'session':
    case 'sftp':
      self._protocol.session(localChan, initWindow, maxPacket);
      break;
    case 'direct-tcpip':
      self._protocol.directTcpip(localChan, initWindow, maxPacket, opts);
      break;
    case 'direct-streamlocal@openssh.com':
      self._protocol.openssh_directStreamLocal(
        localChan, initWindow, maxPacket, opts
      );
      break;
    default:
      throw new Error(`Unsupported channel type: ${type}`);
  }
}

function reqX11(chan, screen, cb) {
  // Asks server to start sending us X11 connections
  const cfg = {
    single: false,
    protocol: 'MIT-MAGIC-COOKIE-1',
    cookie: undefined,
    screen: 0
  };

  if (typeof screen === 'function') {
    cb = screen;
  } else if (typeof screen === 'object' && screen !== null) {
    if (typeof screen.single === 'boolean')
      cfg.single = screen.single;
    if (typeof screen.screen === 'number')
      cfg.screen = screen.screen;
    if (typeof screen.protocol === 'string')
      cfg.protocol = screen.protocol;
    if (typeof screen.cookie === 'string')
      cfg.cookie = screen.cookie;
    else if (Buffer.isBuffer(screen.cookie))
      cfg.cookie = screen.cookie.hexSlice(0, screen.cookie.length);
  }
  if (cfg.cookie === undefined)
    cfg.cookie = randomCookie();

  const wantReply = (typeof cb === 'function');

  if (chan.outgoing.state !== 'open') {
    if (wantReply)
      cb(new Error('Channel is not open'));
    return;
  }

  if (wantReply) {
    chan._callbacks.push((had_err) => {
      if (had_err) {
        cb(had_err !== true ? had_err : new Error('Unable to request X11'));
        return;
      }

      chan._hasX11 = true;
      ++chan._client._acceptX11;
      chan.once('close', () => {
        if (chan._client._acceptX11)
          --chan._client._acceptX11;
      });

      cb();
    });
  }

  chan._client._protocol.x11Forward(chan.outgoing.id, cfg, wantReply);
}

function reqPty(chan, opts, cb) {
  let rows = 24;
  let cols = 80;
  let width = 640;
  let height = 480;
  let term = 'vt100';
  let modes = null;

  if (typeof opts === 'function') {
    cb = opts;
  } else if (typeof opts === 'object' && opts !== null) {
    if (typeof opts.rows === 'number')
      rows = opts.rows;
    if (typeof opts.cols === 'number')
      cols = opts.cols;
    if (typeof opts.width === 'number')
      width = opts.width;
    if (typeof opts.height === 'number')
      height = opts.height;
    if (typeof opts.term === 'string')
      term = opts.term;
    if (typeof opts.modes === 'object')
      modes = opts.modes;
  }

  const wantReply = (typeof cb === 'function');

  if (chan.outgoing.state !== 'open') {
    if (wantReply)
      cb(new Error('Channel is not open'));
    return;
  }

  if (wantReply) {
    chan._callbacks.push((had_err) => {
      if (had_err) {
        cb(had_err !== true
           ? had_err
           : new Error('Unable to request a pseudo-terminal'));
        return;
      }
      cb();
    });
  }

  chan._client._protocol.pty(chan.outgoing.id,
                             rows,
                             cols,
                             height,
                             width,
                             term,
                             modes,
                             wantReply);
}

function reqAgentFwd(chan, cb) {
  const wantReply = (typeof cb === 'function');

  if (chan.outgoing.state !== 'open') {
    wantReply && cb(new Error('Channel is not open'));
    return;
  }
  if (chan._client._agentFwdEnabled) {
    wantReply && cb(false);
    return;
  }

  chan._client._agentFwdEnabled = true;

  chan._callbacks.push((had_err) => {
    if (had_err) {
      chan._client._agentFwdEnabled = false;
      if (wantReply) {
        cb(had_err !== true
           ? had_err
           : new Error('Unable to request agent forwarding'));
      }
      return;
    }

    if (wantReply)
      cb();
  });

  chan._client._protocol.openssh_agentForward(chan.outgoing.id, true);
}

function reqShell(chan, cb) {
  if (chan.outgoing.state !== 'open') {
    cb(new Error('Channel is not open'));
    return;
  }

  chan._callbacks.push((had_err) => {
    if (had_err) {
      cb(had_err !== true ? had_err : new Error('Unable to open shell'));
      return;
    }
    chan.subtype = 'shell';
    cb(undefined, chan);
  });

  chan._client._protocol.shell(chan.outgoing.id, true);
}

function reqExec(chan, cmd, opts, cb) {
  if (chan.outgoing.state !== 'open') {
    cb(new Error('Channel is not open'));
    return;
  }

  chan._callbacks.push((had_err) => {
    if (had_err) {
      cb(had_err !== true ? had_err : new Error('Unable to exec'));
      return;
    }
    chan.subtype = 'exec';
    chan.allowHalfOpen = (opts.allowHalfOpen !== false);
    cb(undefined, chan);
  });

  chan._client._protocol.exec(chan.outgoing.id, cmd, true);
}

function reqEnv(chan, env) {
  if (chan.outgoing.state !== 'open')
    return;

  const keys = Object.keys(env || {});

  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    const val = env[key];
    chan._client._protocol.env(chan.outgoing.id, key, val, false);
  }
}

function reqSubsystem(chan, name, cb) {
  if (chan.outgoing.state !== 'open') {
    cb(new Error('Channel is not open'));
    return;
  }

  chan._callbacks.push((had_err) => {
    if (had_err) {
      cb(had_err !== true
         ? had_err
         : new Error(`Unable to start subsystem: ${name}`));
      return;
    }
    chan.subtype = 'subsystem';
    cb(undefined, chan);
  });

  chan._client._protocol.subsystem(chan.outgoing.id, name, true);
}

// TODO: inline implementation into single call site
function onCHANNEL_OPEN(self, info) {
  // The server is trying to open a channel with us, this is usually when
  // we asked the server to forward us connections on some port and now they
  // are asking us to accept/deny an incoming connection on their side

  let localChan = -1;
  let reason;

  const accept = () => {
    const chanInfo = {
      type: info.type,
      incoming: {
        id: localChan,
        window: MAX_WINDOW,
        packetSize: PACKET_SIZE,
        state: 'open'
      },
      outgoing: {
        id: info.sender,
        window: info.window,
        packetSize: info.packetSize,
        state: 'open'
      }
    };
    const stream = new Channel(self, chanInfo);
    self._chanMgr.update(localChan, stream);

    self._protocol.channelOpenConfirm(info.sender,
                                      localChan,
                                      MAX_WINDOW,
                                      PACKET_SIZE);
    return stream;
  };
  const reject = () => {
    if (reason === undefined) {
      if (localChan === -1)
        reason = CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
      else
        reason = CHANNEL_OPEN_FAILURE.CONNECT_FAILED;
    }

    if (localChan !== -1)
      self._chanMgr.remove(localChan);

    self._protocol.channelOpenFail(info.sender, reason, '');
  };
  const reserveChannel = () => {
    localChan = self._chanMgr.add();

    if (localChan === -1) {
      reason = CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
      if (self.config.debug) {
        self.config.debug(
          'Client: Automatic rejection of incoming channel open: '
            + 'no channels available'
        );
      }
    }

    return (localChan !== -1);
  };

  const data = info.data;
  switch (info.type) {
    case 'forwarded-tcpip': {
      const val = self._forwarding[`${data.destIP}:${data.destPort}`];
      if (val !== undefined && reserveChannel()) {
        if (data.destPort === 0)
          data.destPort = val;
        self.emit('tcp connection', data, accept, reject);
        return;
      }
      break;
    }
    case 'forwarded-streamlocal@openssh.com':
      if (self._forwardingUnix[data.socketPath] !== undefined
          && reserveChannel()) {
        self.emit('unix connection', data, accept, reject);
        return;
      }
      break;
    case 'auth-agent@openssh.com':
      if (self._agentFwdEnabled
          && typeof self._agent.getStream === 'function'
          && reserveChannel()) {
        self._agent.getStream((err, stream) => {
          if (err)
            return reject();

          const upstream = accept();
          upstream.pipe(stream).pipe(upstream);
        });
        return;
      }
      break;
    case 'x11':
      if (self._acceptX11 !== 0 && reserveChannel()) {
        self.emit('x11', data, accept, reject);
        return;
      }
      break;
    default:
      // Automatically reject any unsupported channel open requests
      reason = CHANNEL_OPEN_FAILURE.UNKNOWN_CHANNEL_TYPE;
      if (self.config.debug) {
        self.config.debug(
          'Client: Automatic rejection of unsupported incoming channel open '
            + `type: ${info.type}`
        );
      }
  }

  if (reason === undefined) {
    reason = CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
    if (self.config.debug) {
       self.config.debug(
        'Client: Automatic rejection of unexpected incoming channel open for: '
          + info.type
      );
    }
  }

  reject();
}

const randomCookie = (() => {
  const buffer = Buffer.allocUnsafe(16);
  return () => {
    randomFillSync(buffer, 0, 16);
    return buffer.hexSlice(0, 16);
  };
})();

function makeSimpleAuthHandler(authList) {
  if (!Array.isArray(authList))
    throw new Error('authList must be an array');

  let a = 0;
  return (authsLeft, partialSuccess, cb) => {
    if (a === authList.length)
      return false;
    return authList[a++];
  };
}

function hostKeysProve(client, keys_, cb) {
  if (!client._sock || !isWritable(client._sock))
    return;

  if (typeof cb !== 'function')
    cb = noop;

  if (!Array.isArray(keys_))
    throw new TypeError('Invalid keys argument type');

  const keys = [];
  for (const key of keys_) {
    const parsed = parseKey(key);
    if (parsed instanceof Error)
      throw parsed;
    keys.push(parsed);
  }

  if (!client.config.strictVendor
      || (client.config.strictVendor && RE_OPENSSH.test(client._remoteVer))) {
    client._callbacks.push((had_err, data) => {
      if (had_err) {
        cb(had_err !== true
           ? had_err
           : new Error('Server failed to prove supplied keys'));
        return;
      }

      // TODO: move all of this parsing/verifying logic out of the client?
      const ret = [];
      let keyIdx = 0;
      bufferParser.init(data, 0);
      while (bufferParser.avail()) {
        if (keyIdx === keys.length)
          break;
        const key = keys[keyIdx++];
        const keyPublic = key.getPublicSSH();

        const sigEntry = bufferParser.readString();
        sigParser.init(sigEntry, 0);
        const type = sigParser.readString(true);
        let value = sigParser.readString();

        let algo;
        if (type !== key.type) {
          if (key.type === 'ssh-rsa') {
            switch (type) {
              case 'rsa-sha2-256':
                algo = 'sha256';
                break;
              case 'rsa-sha2-512':
                algo = 'sha512';
                break;
              default:
                continue;
            }
          } else {
            continue;
          }
        }

        const sessionID = client._protocol._kex.sessionID;
        const verifyData = Buffer.allocUnsafe(
          4 + 29 + 4 + sessionID.length + 4 + keyPublic.length
        );
        let p = 0;
        writeUInt32BE(verifyData, 29, p);
        verifyData.utf8Write('hostkeys-prove-00@openssh.com', p += 4, 29);
        writeUInt32BE(verifyData, sessionID.length, p += 29);
        bufferCopy(sessionID, verifyData, 0, sessionID.length, p += 4);
        writeUInt32BE(verifyData, keyPublic.length, p += sessionID.length);
        bufferCopy(keyPublic, verifyData, 0, keyPublic.length, p += 4);

        if (!(value = sigSSHToASN1(value, type)))
          continue;
        if (key.verify(verifyData, value, algo) === true)
          ret.push(key);
      }
      sigParser.clear();
      bufferParser.clear();

      cb(null, ret);
    });

    client._protocol.openssh_hostKeysProve(keys);
    return;
  }

  process.nextTick(
    cb,
    new Error(
      'strictVendor enabled and server is not OpenSSH or compatible version'
    )
  );
}

module.exports = Client;


/***/ }),

/***/ 2994:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


const { Agent: HttpAgent } = __nccwpck_require__(8605);
const { Agent: HttpsAgent } = __nccwpck_require__(7211);
const { connect: tlsConnect } = __nccwpck_require__(4016);

let Client;

for (const ctor of [HttpAgent, HttpsAgent]) {
  class SSHAgent extends ctor {
    constructor(connectCfg, agentOptions) {
      super(agentOptions);

      this._connectCfg = connectCfg;
      this._defaultSrcIP = (agentOptions && agentOptions.srcIP) || 'localhost';
    }

    createConnection(options, cb) {
      const srcIP = (options && options.localAddress) || this._defaultSrcIP;
      const srcPort = (options && options.localPort) || 0;
      const dstIP = options.host;
      const dstPort = options.port;

      if (Client === undefined)
        Client = __nccwpck_require__(6063);

      const client = new Client();
      let triedForward = false;
      client.on('ready', () => {
        client.forwardOut(srcIP, srcPort, dstIP, dstPort, (err, stream) => {
          triedForward = true;
          if (err) {
            client.end();
            return cb(err);
          }
          stream.once('close', () => client.end());
          cb(null, decorateStream(stream, ctor, options));
        });
      }).on('error', cb).on('close', () => {
        if (!triedForward)
          cb(new Error('Unexpected connection close'));
      }).connect(this._connectCfg);
    }
  }

  exports[ctor === HttpAgent ? 'SSHTTPAgent' : 'SSHTTPSAgent'] = SSHAgent;
}

function noop() {}

function decorateStream(stream, ctor, options) {
  if (ctor === HttpAgent) {
    // HTTP
    stream.setKeepAlive = noop;
    stream.setNoDelay = noop;
    stream.setTimeout = noop;
    stream.ref = noop;
    stream.unref = noop;
    stream.destroySoon = stream.destroy;
    return stream;
  }

  // HTTPS
  options.socket = stream;
  const wrapped = tlsConnect(options);

  // This is a workaround for a regression in node v12.16.3+
  // https://github.com/nodejs/node/issues/35904
  const onClose = (() => {
    let called = false;
    return () => {
      if (called)
        return;
      called = true;
      if (stream.isPaused())
        stream.resume();
    };
  })();
  // 'end' listener is needed because 'close' is not emitted in some scenarios
  // in node v12.x for some unknown reason
  wrapped.on('end', onClose).on('close', onClose);

  return wrapped;
}


/***/ }),

/***/ 5869:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const {
  AgentProtocol,
  BaseAgent,
  createAgent,
  CygwinAgent,
  OpenSSHAgent,
  PageantAgent,
} = __nccwpck_require__(9054);
const {
  SSHTTPAgent: HTTPAgent,
  SSHTTPSAgent: HTTPSAgent,
} = __nccwpck_require__(2994);
const { parseKey } = __nccwpck_require__(2218);
const {
  flagsToString,
  OPEN_MODE,
  STATUS_CODE,
  stringToFlags,
} = __nccwpck_require__(2026);

module.exports = {
  AgentProtocol,
  BaseAgent,
  createAgent,
  Client: __nccwpck_require__(6063),
  CygwinAgent,
  HTTPAgent,
  HTTPSAgent,
  OpenSSHAgent,
  PageantAgent,
  Server: __nccwpck_require__(2986),
  utils: {
    parseKey,
    sftp: {
      flagsToString,
      OPEN_MODE,
      STATUS_CODE,
      stringToFlags,
    },
  },
};


/***/ }),

/***/ 9031:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
/*
  TODO:
    * Replace `buffer._pos` usage in keyParser.js and elsewhere
    * Utilize optional "writev" support when writing packets from
      cipher.encrypt()
    * Built-in support for automatic re-keying, on by default
    * Revisit receiving unexpected/unknown packets
      * Error (fatal or otherwise) or ignore or pass on to user (in some or all
        cases)?
      * Including server/client check for single directional packet types?
      * Check packets for validity or bail as early as possible?
    * Automatic re-key every 2**31 packets after the last key exchange (sent or
      received), as suggested by RFC4344. OpenSSH currently does this.
    * Automatic re-key every so many blocks depending on cipher. RFC4344:
         Because of a birthday property of block ciphers and some modes of
         operation, implementations must be careful not to encrypt too many
         blocks with the same encryption key.

         Let L be the block length (in bits) of an SSH encryption method's
         block cipher (e.g., 128 for AES).  If L is at least 128, then, after
         rekeying, an SSH implementation SHOULD NOT encrypt more than 2**(L/4)
         blocks before rekeying again.  If L is at least 128, then SSH
         implementations should also attempt to force a rekey before receiving
         more than 2**(L/4) blocks.  If L is less than 128 (which is the case
         for older ciphers such as 3DES, Blowfish, CAST-128, and IDEA), then,
         although it may be too expensive to rekey every 2**(L/4) blocks, it
         is still advisable for SSH implementations to follow the original
         recommendation in [RFC4253]: rekey at least once for every gigabyte
         of transmitted data.

         Note that if L is less than or equal to 128, then the recommendation
         in this subsection supersedes the recommendation in Section 3.1.  If
         an SSH implementation uses a block cipher with a larger block size
         (e.g., Rijndael with 256-bit blocks), then the recommendations in
         Section 3.1 may supersede the recommendations in this subsection
         (depending on the lengths of the packets).
*/



const { inspect } = __nccwpck_require__(1669);

const { bindingAvailable, NullCipher, NullDecipher } = __nccwpck_require__(5708);
const {
  COMPAT_CHECKS,
  DISCONNECT_REASON,
  MESSAGE,
  SIGNALS,
  TERMINAL_MODE,
} = __nccwpck_require__(6832);
const {
  DEFAULT_KEXINIT,
  KexInit,
  kexinit,
  onKEXPayload,
} = __nccwpck_require__(4126);
const {
  parseKey,
} = __nccwpck_require__(2218);
const MESSAGE_HANDLERS = __nccwpck_require__(172);
const {
  bufferCopy,
  bufferFill,
  bufferSlice,
  convertSignature,
  sendPacket,
  writeUInt32BE,
} = __nccwpck_require__(9475);
const {
  PacketReader,
  PacketWriter,
  ZlibPacketReader,
  ZlibPacketWriter,
} = __nccwpck_require__(6715);

const MODULE_VER = __nccwpck_require__(6447)/* .version */ .i8;

const VALID_DISCONNECT_REASONS = new Map(
  Object.values(DISCONNECT_REASON).map((n) => [n, 1])
);
const IDENT_RAW = Buffer.from(`SSH-2.0-ssh2js${MODULE_VER}`);
const IDENT = Buffer.from(`${IDENT_RAW}\r\n`);
const MAX_LINE_LEN = 8192;
const MAX_LINES = 1024;
const PING_PAYLOAD = Buffer.from([
  MESSAGE.GLOBAL_REQUEST,
  // "keepalive@openssh.com"
  0, 0, 0, 21,
    107, 101, 101, 112, 97, 108, 105, 118, 101, 64, 111, 112, 101, 110, 115,
    115, 104, 46, 99, 111, 109,
  // Request a reply
  1,
]);
const NO_TERMINAL_MODES_BUFFER = Buffer.from([ TERMINAL_MODE.TTY_OP_END ]);

function noop() {}

/*
  Inbound:
    * kexinit payload (needed only until exchange hash is generated)
    * raw ident
    * rekey packet queue
    * expected packet (implemented as separate _parse() function?)
  Outbound:
    * kexinit payload (needed only until exchange hash is generated)
    * rekey packet queue
    * kex secret (needed only until NEWKEYS)
    * exchange hash (needed only until NEWKEYS)
    * session ID (set to exchange hash from initial handshake)
*/
class Protocol {
  constructor(config) {
    const onWrite = config.onWrite;
    if (typeof onWrite !== 'function')
      throw new Error('Missing onWrite function');
    this._onWrite = (data) => { onWrite(data); };

    const onError = config.onError;
    if (typeof onError !== 'function')
      throw new Error('Missing onError function');
    this._onError = (err) => { onError(err); };

    const debug = config.debug;
    this._debug = (typeof debug === 'function'
                   ? (msg) => { debug(msg); }
                   : undefined);

    const onHeader = config.onHeader;
    this._onHeader = (typeof onHeader === 'function'
                      ? (...args) => { onHeader(...args); }
                      : noop);

    const onPacket = config.onPacket;
    this._onPacket = (typeof onPacket === 'function'
                      ? () => { onPacket(); }
                      : noop);

    let onHandshakeComplete = config.onHandshakeComplete;
    if (typeof onHandshakeComplete !== 'function')
      onHandshakeComplete = noop;
    this._onHandshakeComplete = (...args) => {
      this._debug && this._debug('Handshake completed');

      // Process packets queued during a rekey where necessary
      const oldQueue = this._queue;
      if (oldQueue) {
        this._queue = undefined;
        this._debug && this._debug(
          `Draining outbound queue (${oldQueue.length}) ...`
        );
        for (let i = 0; i < oldQueue.length; ++i) {
          const data = oldQueue[i];
          // data === payload only

          // XXX: hacky
          let finalized = this._packetRW.write.finalize(data);
          if (finalized === data) {
            const packet = this._cipher.allocPacket(data.length);
            packet.set(data, 5);
            finalized = packet;
          }

          sendPacket(this, finalized);
        }
        this._debug && this._debug('... finished draining outbound queue');
      }

      onHandshakeComplete(...args);
    };
    this._queue = undefined;

    const messageHandlers = config.messageHandlers;
    if (typeof messageHandlers === 'object' && messageHandlers !== null)
      this._handlers = messageHandlers;
    else
      this._handlers = {};

    this._onPayload = onPayload.bind(this);

    this._server = !!config.server;
    this._banner = undefined;
    let greeting;
    if (this._server) {
      if (typeof config.hostKeys !== 'object' || config.hostKeys === null)
        throw new Error('Missing server host key(s)');
      this._hostKeys = config.hostKeys;

      // Greeting displayed before the ssh identification string is sent, this
      // is usually ignored by most clients
      if (typeof config.greeting === 'string' && config.greeting.length) {
        greeting = (config.greeting.slice(-2) === '\r\n'
                    ? config.greeting
                    : `${config.greeting}\r\n`);
      }

      // Banner shown after the handshake completes, but before user
      // authentication begins
      if (typeof config.banner === 'string' && config.banner.length) {
        this._banner = (config.banner.slice(-2) === '\r\n'
                        ? config.banner
                        : `${config.banner}\r\n`);
      }
    } else {
      this._hostKeys = undefined;
    }

    let offer = config.offer;
    if (typeof offer !== 'object' || offer === null)
      offer = DEFAULT_KEXINIT;
    else if (offer.constructor !== KexInit)
      offer = new KexInit(offer);
    this._kex = undefined;
    this._kexinit = undefined;
    this._offer = offer;
    this._cipher = new NullCipher(0, this._onWrite);
    this._decipher = undefined;
    this._skipNextInboundPacket = false;
    this._packetRW = {
      read: new PacketReader(),
      write: new PacketWriter(this),
    };
    this._hostVerifier = (!this._server
                           && typeof config.hostVerifier === 'function'
                          ? config.hostVerifier
                          : undefined);

    this._parse = parseHeader;
    this._buffer = undefined;
    this._authsQueue = [];
    this._authenticated = false;
    this._remoteIdentRaw = undefined;
    let sentIdent;
    if (typeof config.ident === 'string') {
      this._identRaw = Buffer.from(`SSH-2.0-${config.ident}`);

      sentIdent = Buffer.allocUnsafe(this._identRaw.length + 2);
      sentIdent.set(this._identRaw, 0);
      sentIdent[sentIdent.length - 2] = 13; // '\r'
      sentIdent[sentIdent.length - 1] = 10; // '\n'
    } else if (Buffer.isBuffer(config.ident)) {
      const fullIdent = Buffer.allocUnsafe(8 + config.ident.length);
      fullIdent.latin1Write('SSH-2.0-', 0, 8);
      fullIdent.set(config.ident, 8);
      this._identRaw = fullIdent;

      sentIdent = Buffer.allocUnsafe(fullIdent.length + 2);
      sentIdent.set(fullIdent, 0);
      sentIdent[sentIdent.length - 2] = 13; // '\r'
      sentIdent[sentIdent.length - 1] = 10; // '\n'
    } else {
      this._identRaw = IDENT_RAW;
      sentIdent = IDENT;
    }
    this._compatFlags = 0;

    if (this._debug) {
      if (bindingAvailable)
        this._debug('Custom crypto binding available');
      else
        this._debug('Custom crypto binding not available');
    }

    process.nextTick(() => {
      this._debug && this._debug(
        `Local ident: ${inspect(this._identRaw.toString())}`
      );
      if (greeting)
        this._onWrite(greeting);
      this._onWrite(sentIdent);
    });
  }
  _destruct(reason) {
    this._packetRW.read.cleanup();
    this._packetRW.write.cleanup();
    this._cipher && this._cipher.free();
    this._decipher && this._decipher.free();
    if (typeof reason !== 'string' || reason.length === 0)
      reason = 'fatal error';
    this.parse = () => {
      throw new Error(`Instance unusable after ${reason}`);
    };
    this._onWrite = () => {
      throw new Error(`Instance unusable after ${reason}`);
    };
    this._destruct = undefined;
  }
  cleanup() {
    this._destruct && this._destruct();
  }
  parse(chunk, i, len) {
    while (i < len)
      i = this._parse(chunk, i, len);
  }

  // Protocol message API

  // ===========================================================================
  // Common/Shared =============================================================
  // ===========================================================================

  // Global
  // ------
  disconnect(reason) {
    const pktLen = 1 + 4 + 4 + 4;
    // We don't use _packetRW.write.* here because we need to make sure that
    // we always get a full packet allocated because this message can be sent
    // at any time -- even during a key exchange
    let p = this._packetRW.write.allocStartKEX;
    const packet = this._packetRW.write.alloc(pktLen, true);
    const end = p + pktLen;

    if (!VALID_DISCONNECT_REASONS.has(reason))
      reason = DISCONNECT_REASON.PROTOCOL_ERROR;

    packet[p] = MESSAGE.DISCONNECT;
    writeUInt32BE(packet, reason, ++p);
    packet.fill(0, p += 4, end);

    this._debug && this._debug(`Outbound: Sending DISCONNECT (${reason})`);
    sendPacket(this, this._packetRW.write.finalize(packet, true), true);
  }
  ping() {
    const p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(PING_PAYLOAD.length);

    packet.set(PING_PAYLOAD, p);

    this._debug && this._debug(
      'Outbound: Sending ping (GLOBAL_REQUEST: keepalive@openssh.com)'
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  rekey() {
    if (this._kexinit === undefined) {
      this._debug && this._debug('Outbound: Initiated explicit rekey');
      this._queue = [];
      kexinit(this);
    } else {
      this._debug && this._debug('Outbound: Ignoring rekey during handshake');
    }
  }

  // 'ssh-connection' service-specific
  // ---------------------------------
  requestSuccess(data) {
    let p = this._packetRW.write.allocStart;
    let packet;
    if (Buffer.isBuffer(data)) {
      packet = this._packetRW.write.alloc(1 + data.length);

      packet[p] = MESSAGE.REQUEST_SUCCESS;

      packet.set(data, ++p);
    } else {
      packet = this._packetRW.write.alloc(1);

      packet[p] = MESSAGE.REQUEST_SUCCESS;
    }

    this._debug && this._debug('Outbound: Sending REQUEST_SUCCESS');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  requestFailure() {
    const p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1);

    packet[p] = MESSAGE.REQUEST_FAILURE;

    this._debug && this._debug('Outbound: Sending REQUEST_FAILURE');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelSuccess(chan) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4);

    packet[p] = MESSAGE.CHANNEL_SUCCESS;

    writeUInt32BE(packet, chan, ++p);

    this._debug && this._debug(`Outbound: Sending CHANNEL_SUCCESS (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelFailure(chan) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4);

    packet[p] = MESSAGE.CHANNEL_FAILURE;

    writeUInt32BE(packet, chan, ++p);

    this._debug && this._debug(`Outbound: Sending CHANNEL_FAILURE (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelEOF(chan) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4);

    packet[p] = MESSAGE.CHANNEL_EOF;

    writeUInt32BE(packet, chan, ++p);

    this._debug && this._debug(`Outbound: Sending CHANNEL_EOF (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelClose(chan) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4);

    packet[p] = MESSAGE.CHANNEL_CLOSE;

    writeUInt32BE(packet, chan, ++p);

    this._debug && this._debug(`Outbound: Sending CHANNEL_CLOSE (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelWindowAdjust(chan, amount) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4);

    packet[p] = MESSAGE.CHANNEL_WINDOW_ADJUST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, amount, p += 4);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_WINDOW_ADJUST (r:${chan}, ${amount})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelData(chan, data) {
    const isBuffer = Buffer.isBuffer(data);
    const dataLen = (isBuffer ? data.length : Buffer.byteLength(data));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + dataLen);

    packet[p] = MESSAGE.CHANNEL_DATA;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, dataLen, p += 4);

    if (isBuffer)
      packet.set(data, p += 4);
    else
      packet.utf8Write(data, p += 4, dataLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_DATA (r:${chan}, ${dataLen})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelExtData(chan, data, type) {
    const isBuffer = Buffer.isBuffer(data);
    const dataLen = (isBuffer ? data.length : Buffer.byteLength(data));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 4 + dataLen);

    packet[p] = MESSAGE.CHANNEL_EXTENDED_DATA;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, type, p += 4);

    writeUInt32BE(packet, dataLen, p += 4);

    if (isBuffer)
      packet.set(data, p += 4);
    else
      packet.utf8Write(data, p += 4, dataLen);

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_EXTENDED_DATA (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelOpenConfirm(remote, local, initWindow, maxPacket) {
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 4 + 4);

    packet[p] = MESSAGE.CHANNEL_OPEN_CONFIRMATION;

    writeUInt32BE(packet, remote, ++p);

    writeUInt32BE(packet, local, p += 4);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN_CONFIRMATION (r:${remote}, l:${local})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelOpenFail(remote, reason, desc) {
    if (typeof desc !== 'string')
      desc = '';

    const descLen = Buffer.byteLength(desc);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 4 + descLen + 4);

    packet[p] = MESSAGE.CHANNEL_OPEN_FAILURE;

    writeUInt32BE(packet, remote, ++p);

    writeUInt32BE(packet, reason, p += 4);

    writeUInt32BE(packet, descLen, p += 4);

    p += 4;
    if (descLen) {
      packet.utf8Write(desc, p, descLen);
      p += descLen;
    }

    writeUInt32BE(packet, 0, p); // Empty language tag

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_OPEN_FAILURE (r:${remote})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }

  // ===========================================================================
  // Client-specific ===========================================================
  // ===========================================================================

  // Global
  // ------
  service(name) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const nameLen = Buffer.byteLength(name);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + nameLen);

    packet[p] = MESSAGE.SERVICE_REQUEST;

    writeUInt32BE(packet, nameLen, ++p);
    packet.utf8Write(name, p += 4, nameLen);

    this._debug && this._debug(`Outbound: Sending SERVICE_REQUEST (${name})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }

  // 'ssh-userauth' service-specific
  // -------------------------------
  authPassword(username, password, newPassword) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const userLen = Buffer.byteLength(username);
    const passLen = Buffer.byteLength(password);
    const newPassLen = (newPassword ? Buffer.byteLength(newPassword) : 0);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + userLen + 4 + 14 + 4 + 8 + 1 + 4 + passLen
        + (newPassword ? 4 + newPassLen : 0)
    );

    packet[p] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(packet, userLen, ++p);
    packet.utf8Write(username, p += 4, userLen);

    writeUInt32BE(packet, 14, p += userLen);
    packet.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(packet, 8, p += 14);
    packet.utf8Write('password', p += 4, 8);

    packet[p += 8] = (newPassword ? 1 : 0);

    writeUInt32BE(packet, passLen, ++p);
    if (Buffer.isBuffer(password))
      bufferCopy(password, packet, 0, passLen, p += 4);
    else
      packet.utf8Write(password, p += 4, passLen);

    if (newPassword) {
      writeUInt32BE(packet, newPassLen, p += passLen);
      if (Buffer.isBuffer(newPassword))
        bufferCopy(newPassword, packet, 0, newPassLen, p += 4);
      else
        packet.utf8Write(newPassword, p += 4, newPassLen);
      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (changed password)'
      );
    } else {
      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (password)'
      );
    }

    this._authsQueue.push('password');

    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authPK(username, pubKey, cbSign) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    pubKey = parseKey(pubKey);
    if (pubKey instanceof Error)
      throw new Error('Invalid key');

    const keyType = pubKey.type;
    pubKey = pubKey.getPublicSSH();

    const userLen = Buffer.byteLength(username);
    const algoLen = Buffer.byteLength(keyType);
    const pubKeyLen = pubKey.length;
    const sessionID = this._kex.sessionID;
    const sesLen = sessionID.length;
    const payloadLen =
      (cbSign ? 4 + sesLen : 0)
        + 1 + 4 + userLen + 4 + 14 + 4 + 9 + 1 + 4 + algoLen + 4 + pubKeyLen;
    let packet;
    let p;
    if (cbSign) {
      packet = Buffer.allocUnsafe(payloadLen);
      p = 0;
      writeUInt32BE(packet, sesLen, p);
      packet.set(sessionID, p += 4);
      p += sesLen;
    } else {
      packet = this._packetRW.write.alloc(payloadLen);
      p = this._packetRW.write.allocStart;
    }

    packet[p] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(packet, userLen, ++p);
    packet.utf8Write(username, p += 4, userLen);

    writeUInt32BE(packet, 14, p += userLen);
    packet.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(packet, 9, p += 14);
    packet.utf8Write('publickey', p += 4, 9);

    packet[p += 9] = (cbSign ? 1 : 0);

    writeUInt32BE(packet, algoLen, ++p);
    packet.utf8Write(keyType, p += 4, algoLen);

    writeUInt32BE(packet, pubKeyLen, p += algoLen);
    packet.set(pubKey, p += 4);

    if (!cbSign) {
      this._authsQueue.push('publickey');

      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (publickey -- check)'
      );
      sendPacket(this, this._packetRW.write.finalize(packet));
      return;
    }

    cbSign(packet, (signature) => {
      signature = convertSignature(signature, keyType);
      if (signature === false)
        throw new Error('Error while converting handshake signature');

      const sigLen = signature.length;
      p = this._packetRW.write.allocStart;
      packet = this._packetRW.write.alloc(
        1 + 4 + userLen + 4 + 14 + 4 + 9 + 1 + 4 + algoLen + 4 + pubKeyLen + 4
          + 4 + algoLen + 4 + sigLen
      );

      // TODO: simply copy from original "packet" to new `packet` to avoid
      // having to write each individual field a second time?
      packet[p] = MESSAGE.USERAUTH_REQUEST;

      writeUInt32BE(packet, userLen, ++p);
      packet.utf8Write(username, p += 4, userLen);

      writeUInt32BE(packet, 14, p += userLen);
      packet.utf8Write('ssh-connection', p += 4, 14);

      writeUInt32BE(packet, 9, p += 14);
      packet.utf8Write('publickey', p += 4, 9);

      packet[p += 9] = 1;

      writeUInt32BE(packet, algoLen, ++p);
      packet.utf8Write(keyType, p += 4, algoLen);

      writeUInt32BE(packet, pubKeyLen, p += algoLen);
      packet.set(pubKey, p += 4);

      writeUInt32BE(packet, 4 + algoLen + 4 + sigLen, p += pubKeyLen);

      writeUInt32BE(packet, algoLen, p += 4);
      packet.utf8Write(keyType, p += 4, algoLen);

      writeUInt32BE(packet, sigLen, p += algoLen);
      packet.set(signature, p += 4);

      // Servers shouldn't send packet type 60 in response to signed publickey
      // attempts, but if they do, interpret as type 60.
      this._authsQueue.push('publickey');

      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (publickey)'
      );
      sendPacket(this, this._packetRW.write.finalize(packet));
    });
  }
  authHostbased(username, pubKey, hostname, userlocal, cbSign) {
    // TODO: Make DRY by sharing similar code with authPK()
    if (this._server)
      throw new Error('Client-only method called in server mode');

    pubKey = parseKey(pubKey);
    if (pubKey instanceof Error)
      throw new Error('Invalid key');

    const keyType = pubKey.type;
    pubKey = pubKey.getPublicSSH();

    const userLen = Buffer.byteLength(username);
    const algoLen = Buffer.byteLength(keyType);
    const pubKeyLen = pubKey.length;
    const sessionID = this._kex.sessionID;
    const sesLen = sessionID.length;
    const hostnameLen = Buffer.byteLength(hostname);
    const userlocalLen = Buffer.byteLength(userlocal);
    const data = Buffer.allocUnsafe(
      4 + sesLen + 1 + 4 + userLen + 4 + 14 + 4 + 9 + 4 + algoLen
        + 4 + pubKeyLen + 4 + hostnameLen + 4 + userlocalLen
    );
    let p = 0;

    writeUInt32BE(data, sesLen, p);
    data.set(sessionID, p += 4);

    data[p += sesLen] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(data, userLen, ++p);
    data.utf8Write(username, p += 4, userLen);

    writeUInt32BE(data, 14, p += userLen);
    data.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(data, 9, p += 14);
    data.utf8Write('hostbased', p += 4, 9);

    writeUInt32BE(data, algoLen, p += 9);
    data.utf8Write(keyType, p += 4, algoLen);

    writeUInt32BE(data, pubKeyLen, p += algoLen);
    data.set(pubKey, p += 4);

    writeUInt32BE(data, hostnameLen, p += pubKeyLen);
    data.utf8Write(hostname, p += 4, hostnameLen);

    writeUInt32BE(data, userlocalLen, p += hostnameLen);
    data.utf8Write(userlocal, p += 4, userlocalLen);

    cbSign(data, (signature) => {
      signature = convertSignature(signature, keyType);
      if (!signature)
        throw new Error('Error while converting handshake signature');

      const sigLen = signature.length;
      const reqDataLen = (data.length - sesLen - 4);
      p = this._packetRW.write.allocStart;
      const packet = this._packetRW.write.alloc(
        reqDataLen + 4 + 4 + algoLen + 4 + sigLen
      );

      bufferCopy(data, packet, 4 + sesLen, data.length, p);

      writeUInt32BE(packet, 4 + algoLen + 4 + sigLen, p += reqDataLen);
      writeUInt32BE(packet, algoLen, p += 4);
      packet.utf8Write(keyType, p += 4, algoLen);
      writeUInt32BE(packet, sigLen, p += algoLen);
      packet.set(signature, p += 4);

      this._authsQueue.push('hostbased');

      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (hostbased)'
      );
      sendPacket(this, this._packetRW.write.finalize(packet));
    });
  }
  authKeyboard(username) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const userLen = Buffer.byteLength(username);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + userLen + 4 + 14 + 4 + 20 + 4 + 4
    );

    packet[p] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(packet, userLen, ++p);
    packet.utf8Write(username, p += 4, userLen);

    writeUInt32BE(packet, 14, p += userLen);
    packet.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(packet, 20, p += 14);
    packet.utf8Write('keyboard-interactive', p += 4, 20);

    writeUInt32BE(packet, 0, p += 20);

    writeUInt32BE(packet, 0, p += 4);

    this._authsQueue.push('keyboard-interactive');

    this._debug && this._debug(
      'Outbound: Sending USERAUTH_REQUEST (keyboard-interactive)'
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authNone(username) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const userLen = Buffer.byteLength(username);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + userLen + 4 + 14 + 4 + 4);

    packet[p] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(packet, userLen, ++p);
    packet.utf8Write(username, p += 4, userLen);

    writeUInt32BE(packet, 14, p += userLen);
    packet.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(packet, 4, p += 14);
    packet.utf8Write('none', p += 4, 4);

    this._authsQueue.push('none');

    this._debug && this._debug('Outbound: Sending USERAUTH_REQUEST (none)');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authInfoRes(responses) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    let responsesTotalLen = 0;
    let responseLens;

    if (responses) {
      responseLens = new Array(responses.length);
      for (let i = 0; i < responses.length; ++i) {
        const len = Buffer.byteLength(responses[i]);
        responseLens[i] = len;
        responsesTotalLen += 4 + len;
      }
    }

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + responsesTotalLen);

    packet[p] = MESSAGE.USERAUTH_INFO_RESPONSE;

    if (responses) {
      writeUInt32BE(packet, responses.length, ++p);
      p += 4;
      for (let i = 0; i < responses.length; ++i) {
        const len = responseLens[i];
        writeUInt32BE(packet, len, p);
        p += 4;
        if (len) {
          packet.utf8Write(responses[i], p, len);
          p += len;
        }
      }
    } else {
      writeUInt32BE(packet, 0, ++p);
    }

    this._debug && this._debug('Outbound: Sending USERAUTH_INFO_RESPONSE');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }

  // 'ssh-connection' service-specific
  // ---------------------------------
  tcpipForward(bindAddr, bindPort, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const addrLen = Buffer.byteLength(bindAddr);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 13 + 1 + 4 + addrLen + 4);

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 13, ++p);
    packet.utf8Write('tcpip-forward', p += 4, 13);

    packet[p += 13] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, addrLen, ++p);
    packet.utf8Write(bindAddr, p += 4, addrLen);

    writeUInt32BE(packet, bindPort, p += addrLen);

    this._debug
      && this._debug('Outbound: Sending GLOBAL_REQUEST (tcpip-forward)');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  cancelTcpipForward(bindAddr, bindPort, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const addrLen = Buffer.byteLength(bindAddr);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 20 + 1 + 4 + addrLen + 4);

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 20, ++p);
    packet.utf8Write('cancel-tcpip-forward', p += 4, 20);

    packet[p += 20] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, addrLen, ++p);
    packet.utf8Write(bindAddr, p += 4, addrLen);

    writeUInt32BE(packet, bindPort, p += addrLen);

    this._debug
      && this._debug('Outbound: Sending GLOBAL_REQUEST (cancel-tcpip-forward)');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_streamLocalForward(socketPath, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const socketPathLen = Buffer.byteLength(socketPath);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 31 + 1 + 4 + socketPathLen
    );

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 31, ++p);
    packet.utf8Write('streamlocal-forward@openssh.com', p += 4, 31);

    packet[p += 31] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, socketPathLen, ++p);
    packet.utf8Write(socketPath, p += 4, socketPathLen);

    this._debug && this._debug(
      'Outbound: Sending GLOBAL_REQUEST (streamlocal-forward@openssh.com)'
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_cancelStreamLocalForward(socketPath, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const socketPathLen = Buffer.byteLength(socketPath);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 38 + 1 + 4 + socketPathLen
    );

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 38, ++p);
    packet.utf8Write('cancel-streamlocal-forward@openssh.com', p += 4, 38);

    packet[p += 38] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, socketPathLen, ++p);
    packet.utf8Write(socketPath, p += 4, socketPathLen);

    if (this._debug) {
      this._debug(
        'Outbound: Sending GLOBAL_REQUEST '
          + '(cancel-streamlocal-forward@openssh.com)'
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  directTcpip(chan, initWindow, maxPacket, cfg) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const srcLen = Buffer.byteLength(cfg.srcIP);
    const dstLen = Buffer.byteLength(cfg.dstIP);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 12 + 4 + 4 + 4 + 4 + srcLen + 4 + 4 + dstLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 12, ++p);
    packet.utf8Write('direct-tcpip', p += 4, 12);

    writeUInt32BE(packet, chan, p += 12);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, dstLen, p += 4);
    packet.utf8Write(cfg.dstIP, p += 4, dstLen);

    writeUInt32BE(packet, cfg.dstPort, p += dstLen);

    writeUInt32BE(packet, srcLen, p += 4);
    packet.utf8Write(cfg.srcIP, p += 4, srcLen);

    writeUInt32BE(packet, cfg.srcPort, p += srcLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN (r:${chan}, direct-tcpip)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_directStreamLocal(chan, initWindow, maxPacket, cfg) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const pathLen = Buffer.byteLength(cfg.socketPath);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 30 + 4 + 4 + 4 + 4 + pathLen + 4 + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 30, ++p);
    packet.utf8Write('direct-streamlocal@openssh.com', p += 4, 30);

    writeUInt32BE(packet, chan, p += 30);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, pathLen, p += 4);
    packet.utf8Write(cfg.socketPath, p += 4, pathLen);

    // zero-fill reserved fields (string and uint32)
    bufferFill(packet, 0, p += pathLen, p + 8);

    if (this._debug) {
      this._debug(
        'Outbound: Sending CHANNEL_OPEN '
          + `(r:${chan}, direct-streamlocal@openssh.com)`
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_noMoreSessions(wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 28 + 1);

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 28, ++p);
    packet.utf8Write('no-more-sessions@openssh.com', p += 4, 28);

    packet[p += 28] = (wantReply === undefined || wantReply === true ? 1 : 0);

    this._debug && this._debug(
      'Outbound: Sending GLOBAL_REQUEST (no-more-sessions@openssh.com)'
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  session(chan, initWindow, maxPacket) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 7 + 4 + 4 + 4);

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 7, ++p);
    packet.utf8Write('session', p += 4, 7);

    writeUInt32BE(packet, chan, p += 7);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_OPEN (r:${chan}, session)`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  windowChange(chan, rows, cols, height, width) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 13 + 1 + 4 + 4 + 4 + 4
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 13, p += 4);
    packet.utf8Write('window-change', p += 4, 13);

    packet[p += 13] = 0;

    writeUInt32BE(packet, cols, ++p);

    writeUInt32BE(packet, rows, p += 4);

    writeUInt32BE(packet, width, p += 4);

    writeUInt32BE(packet, height, p += 4);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, window-change)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  pty(chan, rows, cols, height, width, term, modes, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    if (!term || !term.length)
      term = 'vt100';
    if (modes
        && !Buffer.isBuffer(modes)
        && !Array.isArray(modes)
        && typeof modes === 'object'
        && modes !== null) {
      modes = modesToBytes(modes);
    }
    if (!modes || !modes.length)
      modes = NO_TERMINAL_MODES_BUFFER;

    const termLen = term.length;
    const modesLen = modes.length;
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 7 + 1 + 4 + termLen + 4 + 4 + 4 + 4 + 4 + modesLen
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 7, p += 4);
    packet.utf8Write('pty-req', p += 4, 7);

    packet[p += 7] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, termLen, ++p);
    packet.utf8Write(term, p += 4, termLen);

    writeUInt32BE(packet, cols, p += termLen);

    writeUInt32BE(packet, rows, p += 4);

    writeUInt32BE(packet, width, p += 4);

    writeUInt32BE(packet, height, p += 4);

    writeUInt32BE(packet, modesLen, p += 4);
    p += 4;
    if (Array.isArray(modes)) {
      for (let i = 0; i < modesLen; ++i)
        packet[p++] = modes[i];
    } else if (Buffer.isBuffer(modes)) {
      packet.set(modes, p);
    }

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_REQUEST (r:${chan}, pty-req)`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  shell(chan, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 5 + 1);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 5, p += 4);
    packet.utf8Write('shell', p += 4, 5);

    packet[p += 5] = (wantReply === undefined || wantReply === true ? 1 : 0);

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_REQUEST (r:${chan}, shell)`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  exec(chan, cmd, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    const isBuf = Buffer.isBuffer(cmd);
    const cmdLen = (isBuf ? cmd.length : Buffer.byteLength(cmd));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 4 + 1 + 4 + cmdLen);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 4, p += 4);
    packet.utf8Write('exec', p += 4, 4);

    packet[p += 4] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, cmdLen, ++p);
    if (isBuf)
      packet.set(cmd, p += 4);
    else
      packet.utf8Write(cmd, p += 4, cmdLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, exec: ${cmd})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  signal(chan, signal) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    const origSignal = signal;

    signal = signal.toUpperCase();
    if (signal.slice(0, 3) === 'SIG')
      signal = signal.slice(3);

    if (SIGNALS[signal] !== 1)
      throw new Error(`Invalid signal: ${origSignal}`);

    const signalLen = signal.length;
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 6 + 1 + 4 + signalLen
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 6, p += 4);
    packet.utf8Write('signal', p += 4, 6);

    packet[p += 6] = 0;

    writeUInt32BE(packet, signalLen, ++p);
    packet.utf8Write(signal, p += 4, signalLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, signal: ${signal})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  env(chan, key, val, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    const keyLen = Buffer.byteLength(key);
    const isBuf = Buffer.isBuffer(val);
    const valLen = (isBuf ? val.length : Buffer.byteLength(val));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 3 + 1 + 4 + keyLen + 4 + valLen
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 3, p += 4);
    packet.utf8Write('env', p += 4, 3);

    packet[p += 3] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, keyLen, ++p);
    packet.utf8Write(key, p += 4, keyLen);

    writeUInt32BE(packet, valLen, p += keyLen);
    if (isBuf)
      packet.set(val, p += 4);
    else
      packet.utf8Write(val, p += 4, valLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, env: ${key}=${val})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  x11Forward(chan, cfg, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    const protocol = cfg.protocol;
    const cookie = cfg.cookie;
    const isBufProto = Buffer.isBuffer(protocol);
    const protoLen = (isBufProto
                      ? protocol.length
                      : Buffer.byteLength(protocol));
    const isBufCookie = Buffer.isBuffer(cookie);
    const cookieLen = (isBufCookie
                       ? cookie.length
                       : Buffer.byteLength(cookie));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 7 + 1 + 1 + 4 + protoLen + 4 + cookieLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 7, p += 4);
    packet.utf8Write('x11-req', p += 4, 7);

    packet[p += 7] = (wantReply === undefined || wantReply === true ? 1 : 0);

    packet[++p] = (cfg.single ? 1 : 0);

    writeUInt32BE(packet, protoLen, ++p);
    if (isBufProto)
      packet.set(protocol, p += 4);
    else
      packet.utf8Write(protocol, p += 4, protoLen);

    writeUInt32BE(packet, cookieLen, p += protoLen);
    if (isBufCookie)
      packet.set(cookie, p += 4);
    else
      packet.latin1Write(cookie, p += 4, cookieLen);

    writeUInt32BE(packet, (cfg.screen || 0), p += cookieLen);

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_REQUEST (r:${chan}, x11-req)`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  subsystem(chan, name, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space
    const nameLen = Buffer.byteLength(name);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 9 + 1 + 4 + nameLen);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 9, p += 4);
    packet.utf8Write('subsystem', p += 4, 9);

    packet[p += 9] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, nameLen, ++p);
    packet.utf8Write(name, p += 4, nameLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, subsystem: ${name})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_agentForward(chan, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 26 + 1);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 26, p += 4);
    packet.utf8Write('auth-agent-req@openssh.com', p += 4, 26);

    packet[p += 26] = (wantReply === undefined || wantReply === true ? 1 : 0);

    if (this._debug) {
      this._debug(
        'Outbound: Sending CHANNEL_REQUEST '
          + `(r:${chan}, auth-agent-req@openssh.com)`
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_hostKeysProve(keys) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    let keysTotal = 0;
    const publicKeys = [];
    for (const key of keys) {
      const publicKey = key.getPublicSSH();
      keysTotal += 4 + publicKey.length;
      publicKeys.push(publicKey);
    }

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 29 + 1 + keysTotal);

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 29, ++p);
    packet.utf8Write('hostkeys-prove-00@openssh.com', p += 4, 29);

    packet[p += 29] = 1; // want reply

    ++p;
    for (const buf of publicKeys) {
      writeUInt32BE(packet, buf.length, p);
      bufferCopy(buf, packet, 0, buf.length, p += 4);
      p += buf.length;
    }

    if (this._debug) {
      this._debug(
        'Outbound: Sending GLOBAL_REQUEST (hostkeys-prove-00@openssh.com)'
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }

  // ===========================================================================
  // Server-specific ===========================================================
  // ===========================================================================

  // Global
  // ------
  serviceAccept(svcName) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const svcNameLen = Buffer.byteLength(svcName);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + svcNameLen);

    packet[p] = MESSAGE.SERVICE_ACCEPT;

    writeUInt32BE(packet, svcNameLen, ++p);
    packet.utf8Write(svcName, p += 4, svcNameLen);

    this._debug && this._debug(`Outbound: Sending SERVICE_ACCEPT (${svcName})`);
    sendPacket(this, this._packetRW.write.finalize(packet));

    if (this._server && this._banner && svcName === 'ssh-userauth') {
      const banner = this._banner;
      this._banner = undefined; // Prevent banner from being displayed again
      const bannerLen = Buffer.byteLength(banner);
      p = this._packetRW.write.allocStart;
      const packet = this._packetRW.write.alloc(1 + 4 + bannerLen + 4);

      packet[p] = MESSAGE.USERAUTH_BANNER;

      writeUInt32BE(packet, bannerLen, ++p);
      packet.utf8Write(banner, p += 4, bannerLen);

      writeUInt32BE(packet, 0, p += bannerLen); // Empty language tag

      this._debug && this._debug('Outbound: Sending USERAUTH_BANNER');
      sendPacket(this, this._packetRW.write.finalize(packet));
    }
  }
  // 'ssh-connection' service-specific
  forwardedTcpip(chan, initWindow, maxPacket, cfg) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const boundAddrLen = Buffer.byteLength(cfg.boundAddr);
    const remoteAddrLen = Buffer.byteLength(cfg.remoteAddr);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 15 + 4 + 4 + 4 + 4 + boundAddrLen + 4 + 4 + remoteAddrLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 15, ++p);
    packet.utf8Write('forwarded-tcpip', p += 4, 15);

    writeUInt32BE(packet, chan, p += 15);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, boundAddrLen, p += 4);
    packet.utf8Write(cfg.boundAddr, p += 4, boundAddrLen);

    writeUInt32BE(packet, cfg.boundPort, p += boundAddrLen);

    writeUInt32BE(packet, remoteAddrLen, p += 4);
    packet.utf8Write(cfg.remoteAddr, p += 4, remoteAddrLen);

    writeUInt32BE(packet, cfg.remotePort, p += remoteAddrLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN (r:${chan}, forwarded-tcpip)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  x11(chan, initWindow, maxPacket, cfg) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const addrLen = Buffer.byteLength(cfg.originAddr);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 3 + 4 + 4 + 4 + 4 + addrLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 3, ++p);
    packet.utf8Write('x11', p += 4, 3);

    writeUInt32BE(packet, chan, p += 3);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, addrLen, p += 4);
    packet.utf8Write(cfg.originAddr, p += 4, addrLen);

    writeUInt32BE(packet, cfg.originPort, p += addrLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN (r:${chan}, x11)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_authAgent(chan, initWindow, maxPacket) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 22 + 4 + 4 + 4);

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 22, ++p);
    packet.utf8Write('auth-agent@openssh.com', p += 4, 22);

    writeUInt32BE(packet, chan, p += 22);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN (r:${chan}, auth-agent@openssh.com)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_forwardedStreamLocal(chan, initWindow, maxPacket, cfg) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const pathLen = Buffer.byteLength(cfg.socketPath);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 33 + 4 + 4 + 4 + 4 + pathLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 33, ++p);
    packet.utf8Write('forwarded-streamlocal@openssh.com', p += 4, 33);

    writeUInt32BE(packet, chan, p += 33);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, pathLen, p += 4);
    packet.utf8Write(cfg.socketPath, p += 4, pathLen);

    writeUInt32BE(packet, 0, p += pathLen);

    if (this._debug) {
      this._debug(
        'Outbound: Sending CHANNEL_OPEN '
          + `(r:${chan}, forwarded-streamlocal@openssh.com)`
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  exitStatus(chan, status) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    // Does not consume window space
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 11 + 1 + 4);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 11, p += 4);
    packet.utf8Write('exit-status', p += 4, 11);

    packet[p += 11] = 0;

    writeUInt32BE(packet, status, ++p);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, exit-status: ${status})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  exitSignal(chan, name, coreDumped, msg) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    // Does not consume window space

    const origSignal = name;

    let signal = name.toUpperCase();
    if (signal.slice(0, 3) === 'SIG')
      signal = signal.slice(3);

    if (SIGNALS[signal] !== 1)
      throw new Error(`Invalid signal: ${origSignal}`);

    const nameLen = Buffer.byteLength(signal);
    const msgLen = (msg ? Buffer.byteLength(msg) : 0);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 11 + 1 + 4 + nameLen + 1 + 4 + msgLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 11, p += 4);
    packet.utf8Write('exit-signal', p += 4, 11);

    packet[p += 11] = 0;

    writeUInt32BE(packet, nameLen, ++p);
    packet.utf8Write(signal, p += 4, nameLen);

    packet[p += nameLen] = (coreDumped ? 1 : 0);

    writeUInt32BE(packet, msgLen, ++p);

    p += 4;
    if (msgLen) {
      packet.utf8Write(msg, p, msgLen);
      p += msgLen;
    }

    writeUInt32BE(packet, 0, p);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, exit-signal: ${name})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  // 'ssh-userauth' service-specific
  authFailure(authMethods, isPartial) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    if (this._authsQueue.length === 0)
      throw new Error('No auth in progress');

    let methods;

    if (typeof authMethods === 'boolean') {
      isPartial = authMethods;
      authMethods = undefined;
    }

    if (authMethods) {
      methods = [];
      for (let i = 0; i < authMethods.length; ++i) {
        if (authMethods[i].toLowerCase() === 'none')
          continue;
        methods.push(authMethods[i]);
      }
      methods = methods.join(',');
    } else {
      methods = '';
    }

    const methodsLen = methods.length;
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + methodsLen + 1);

    packet[p] = MESSAGE.USERAUTH_FAILURE;

    writeUInt32BE(packet, methodsLen, ++p);
    packet.utf8Write(methods, p += 4, methodsLen);

    packet[p += methodsLen] = (isPartial === true ? 1 : 0);

    this._authsQueue.shift();

    this._debug && this._debug('Outbound: Sending USERAUTH_FAILURE');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authSuccess() {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    if (this._authsQueue.length === 0)
      throw new Error('No auth in progress');

    const p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1);

    packet[p] = MESSAGE.USERAUTH_SUCCESS;

    this._authsQueue.shift();
    this._authenticated = true;

    this._debug && this._debug('Outbound: Sending USERAUTH_SUCCESS');
    sendPacket(this, this._packetRW.write.finalize(packet));

    if (this._kex.negotiated.cs.compress === 'zlib@openssh.com')
      this._packetRW.read = new ZlibPacketReader();
    if (this._kex.negotiated.sc.compress === 'zlib@openssh.com')
      this._packetRW.write = new ZlibPacketWriter(this);
  }
  authPKOK(keyAlgo, key) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    if (this._authsQueue.length === 0 || this._authsQueue[0] !== 'publickey')
      throw new Error('"publickey" auth not in progress');

    // TODO: support parsed key for `key`

    const keyAlgoLen = Buffer.byteLength(keyAlgo);
    const keyLen = key.length;
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + keyAlgoLen + 4 + keyLen);

    packet[p] = MESSAGE.USERAUTH_PK_OK;

    writeUInt32BE(packet, keyAlgoLen, ++p);
    packet.utf8Write(keyAlgo, p += 4, keyAlgoLen);

    writeUInt32BE(packet, keyLen, p += keyAlgoLen);
    packet.set(key, p += 4);

    this._authsQueue.shift();

    this._debug && this._debug('Outbound: Sending USERAUTH_PK_OK');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authPasswdChg(prompt) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const promptLen = Buffer.byteLength(prompt);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + promptLen + 4);

    packet[p] = MESSAGE.USERAUTH_PASSWD_CHANGEREQ;

    writeUInt32BE(packet, promptLen, ++p);
    packet.utf8Write(prompt, p += 4, promptLen);

    writeUInt32BE(packet, 0, p += promptLen); // Empty language tag

    this._debug && this._debug('Outbound: Sending USERAUTH_PASSWD_CHANGEREQ');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authInfoReq(name, instructions, prompts) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    let promptsLen = 0;
    const nameLen = name ? Buffer.byteLength(name) : 0;
    const instrLen = instructions ? Buffer.byteLength(instructions) : 0;

    for (let i = 0; i < prompts.length; ++i)
      promptsLen += 4 + Buffer.byteLength(prompts[i].prompt) + 1;

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + nameLen + 4 + instrLen + 4 + 4 + promptsLen
    );

    packet[p] = MESSAGE.USERAUTH_INFO_REQUEST;

    writeUInt32BE(packet, nameLen, ++p);
    p += 4;
    if (name) {
      packet.utf8Write(name, p, nameLen);
      p += nameLen;
    }

    writeUInt32BE(packet, instrLen, p);
    p += 4;
    if (instructions) {
      packet.utf8Write(instructions, p, instrLen);
      p += instrLen;
    }

    writeUInt32BE(packet, 0, p);

    writeUInt32BE(packet, prompts.length, p += 4);
    p += 4;
    for (let i = 0; i < prompts.length; ++i) {
      const prompt = prompts[i];
      const promptLen = Buffer.byteLength(prompt.prompt);

      writeUInt32BE(packet, promptLen, p);
      p += 4;
      if (promptLen) {
        packet.utf8Write(prompt.prompt, p, promptLen);
        p += promptLen;
      }
      packet[p++] = (prompt.echo ? 1 : 0);
    }

    this._debug && this._debug('Outbound: Sending USERAUTH_INFO_REQUEST');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
}

// SSH-protoversion-softwareversion (SP comments) CR LF
const RE_IDENT = /^SSH-(2\.0|1\.99)-([^ ]+)(?: (.*))?$/;

// TODO: optimize this by starting n bytes from the end of this._buffer instead
// of the beginning
function parseHeader(chunk, p, len) {
  let data;
  let chunkOffset;
  if (this._buffer) {
    data = Buffer.allocUnsafe(this._buffer.length + (len - p));
    data.set(this._buffer, 0);
    if (p === 0) {
      data.set(chunk, this._buffer.length);
    } else {
      data.set(new Uint8Array(chunk.buffer,
                              chunk.byteOffset + p,
                              (len - p)),
               this._buffer.length);
    }
    chunkOffset = this._buffer.length;
    p = 0;
  } else {
    data = chunk;
    chunkOffset = 0;
  }
  const op = p;
  let start = p;
  let end = p;
  let needNL = false;
  let lineLen = 0;
  let lines = 0;
  for (; p < data.length; ++p) {
    const ch = data[p];

    if (ch === 13 /* '\r' */) {
      needNL = true;
      continue;
    }

    if (ch === 10 /* '\n' */) {
      if (end > start
          && end - start > 4
          && data[start] === 83 /* 'S' */
          && data[start + 1] === 83 /* 'S' */
          && data[start + 2] === 72 /* 'H' */
          && data[start + 3] === 45 /* '-' */) {

        const full = data.latin1Slice(op, end + 1);
        const identRaw = (start === op ? full : full.slice(start - op));
        const m = RE_IDENT.exec(identRaw);
        if (!m)
          throw new Error('Invalid identification string');

        const header = {
          greeting: (start === op ? '' : full.slice(0, start - op)),
          identRaw,
          versions: {
            protocol: m[1],
            software: m[2],
          },
          comments: m[3]
        };

        // Needed during handshake
        this._remoteIdentRaw = Buffer.from(identRaw);

        this._debug && this._debug(`Remote ident: ${inspect(identRaw)}`);
        this._compatFlags = getCompatFlags(header);

        this._buffer = undefined;
        this._decipher =
          new NullDecipher(0, onKEXPayload.bind(this, { firstPacket: true }));
        this._parse = parsePacket;

        this._onHeader(header);
        if (!this._destruct) {
          // We disconnected inside _onHeader
          return len;
        }

        kexinit(this);

        return p + 1 - chunkOffset;
      }

      // Only allow pre-ident greetings when we're a client
      if (this._server)
        throw new Error('Greetings from clients not permitted');

      if (++lines > MAX_LINES)
        throw new Error('Max greeting lines exceeded');

      needNL = false;
      start = p + 1;
      lineLen = 0;
    } else if (needNL) {
      throw new Error('Invalid header: expected newline');
    } else if (++lineLen >= MAX_LINE_LEN) {
      throw new Error('Header line too long');
    }

    end = p;
  }
  if (!this._buffer)
    this._buffer = bufferSlice(data, op);

  return p - chunkOffset;
}

function parsePacket(chunk, p, len) {
  return this._decipher.decrypt(chunk, p, len);
}

function onPayload(payload) {
  // XXX: move this to the Decipher implementations?

  this._onPacket();

  if (payload.length === 0) {
    this._debug && this._debug('Inbound: Skipping empty packet payload');
    return;
  }

  payload = this._packetRW.read.read(payload);

  const type = payload[0];
  if (type === MESSAGE.USERAUTH_SUCCESS
      && !this._server
      && !this._authenticated) {
    this._authenticated = true;
    if (this._kex.negotiated.cs.compress === 'zlib@openssh.com')
      this._packetRW.write = new ZlibPacketWriter(this);
    if (this._kex.negotiated.sc.compress === 'zlib@openssh.com')
      this._packetRW.read = new ZlibPacketReader();
  }
  const handler = MESSAGE_HANDLERS[type];
  if (handler === undefined) {
    this._debug && this._debug(`Inbound: Unsupported message type: ${type}`);
    return;
  }

  return handler(this, payload);
}

function getCompatFlags(header) {
  const software = header.versions.software;

  let flags = 0;

  for (const rule of COMPAT_CHECKS) {
    if (typeof rule[0] === 'string') {
      if (software === rule[0])
        flags |= rule[1];
    } else if (rule[0].test(software)) {
      flags |= rule[1];
    }
  }

  return flags;
}

function modesToBytes(modes) {
  const keys = Object.keys(modes);
  const bytes = Buffer.allocUnsafe((5 * keys.length) + 1);
  let b = 0;

  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    if (key === 'TTY_OP_END')
      continue;

    const opcode = TERMINAL_MODE[key];
    if (opcode === undefined)
      continue;

    const val = modes[key];
    if (typeof val === 'number' && isFinite(val)) {
      bytes[b++] = opcode;
      bytes[b++] = val >>> 24;
      bytes[b++] = val >>> 16;
      bytes[b++] = val >>> 8;
      bytes[b++] = val;
    }
  }

  bytes[b++] = TERMINAL_MODE.TTY_OP_END;

  if (b < bytes.length)
    return bufferSlice(bytes, 0, b);

  return bytes;
}

module.exports = Protocol;


/***/ }),

/***/ 2026:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const EventEmitter = __nccwpck_require__(8614);
const fs = __nccwpck_require__(5747);
const { constants } = fs;
const {
  Readable: ReadableStream,
  Writable: WritableStream
} = __nccwpck_require__(2413);
const { inherits, isDate } = __nccwpck_require__(1669);

const FastBuffer = Buffer[Symbol.species];

const {
  bufferCopy,
  bufferSlice,
  makeBufferParser,
  writeUInt32BE,
} = __nccwpck_require__(9475);

const ATTR = {
  SIZE: 0x00000001,
  UIDGID: 0x00000002,
  PERMISSIONS: 0x00000004,
  ACMODTIME: 0x00000008,
  EXTENDED: 0x80000000,
};

// Large enough to store all possible attributes
const ATTRS_BUF = Buffer.alloc(28);

const STATUS_CODE = {
  OK: 0,
  EOF: 1,
  NO_SUCH_FILE: 2,
  PERMISSION_DENIED: 3,
  FAILURE: 4,
  BAD_MESSAGE: 5,
  NO_CONNECTION: 6,
  CONNECTION_LOST: 7,
  OP_UNSUPPORTED: 8
};

const VALID_STATUS_CODES = new Map(
  Object.values(STATUS_CODE).map((n) => [n, 1])
);

const STATUS_CODE_STR = {
  [STATUS_CODE.OK]: 'No error',
  [STATUS_CODE.EOF]: 'End of file',
  [STATUS_CODE.NO_SUCH_FILE]: 'No such file or directory',
  [STATUS_CODE.PERMISSION_DENIED]: 'Permission denied',
  [STATUS_CODE.FAILURE]: 'Failure',
  [STATUS_CODE.BAD_MESSAGE]: 'Bad message',
  [STATUS_CODE.NO_CONNECTION]: 'No connection',
  [STATUS_CODE.CONNECTION_LOST]: 'Connection lost',
  [STATUS_CODE.OP_UNSUPPORTED]: 'Operation unsupported',
};

const REQUEST = {
  INIT: 1,
  OPEN: 3,
  CLOSE: 4,
  READ: 5,
  WRITE: 6,
  LSTAT: 7,
  FSTAT: 8,
  SETSTAT: 9,
  FSETSTAT: 10,
  OPENDIR: 11,
  READDIR: 12,
  REMOVE: 13,
  MKDIR: 14,
  RMDIR: 15,
  REALPATH: 16,
  STAT: 17,
  RENAME: 18,
  READLINK: 19,
  SYMLINK: 20,
  EXTENDED: 200
};

const RESPONSE = {
  VERSION: 2,
  STATUS: 101,
  HANDLE: 102,
  DATA: 103,
  NAME: 104,
  ATTRS: 105,
  EXTENDED: 201
};

const OPEN_MODE = {
  READ: 0x00000001,
  WRITE: 0x00000002,
  APPEND: 0x00000004,
  CREAT: 0x00000008,
  TRUNC: 0x00000010,
  EXCL: 0x00000020
};

const PKT_RW_OVERHEAD = 2 * 1024;
const MAX_REQID = 2 ** 32 - 1;
const CLIENT_VERSION_BUFFER = Buffer.from([
  0, 0, 0, 5 /* length */,
    REQUEST.INIT,
    0, 0, 0, 3 /* version */
]);
const SERVER_VERSION_BUFFER = Buffer.from([
  0, 0, 0, 5 /* length */,
    RESPONSE.VERSION,
    0, 0, 0, 3 /* version */
]);

const RE_OPENSSH = /^SSH-2.0-(?:OpenSSH|dropbear)/;
const OPENSSH_MAX_PKT_LEN = 256 * 1024;

const bufferParser = makeBufferParser();

const fakeStderr = {
  readable: false,
  writable: false,
  push: (data) => {},
  once: () => {},
  on: () => {},
  emit: () => {},
  end: () => {},
};

function noop() {}

// Emulates enough of `Channel` to be able to be used as a drop-in replacement
// in order to process incoming data with as little overhead as possible
class SFTP extends EventEmitter {
  constructor(client, chanInfo, cfg) {
    super();

    if (typeof cfg !== 'object' || !cfg)
      cfg = {};

    const remoteIdentRaw = client._protocol._remoteIdentRaw;

    this.server = !!cfg.server;
    this._debug = (typeof cfg.debug === 'function' ? cfg.debug : undefined);
    this._isOpenSSH = (remoteIdentRaw && RE_OPENSSH.test(remoteIdentRaw));

    this._version = -1;
    this._extensions = {};
    this._biOpt = cfg.biOpt;
    this._pktLenBytes = 0;
    this._pktLen = 0;
    this._pktPos = 0;
    this._pktType = 0;
    this._pktData = undefined;
    this._writeReqid = -1;
    this._requests = {};
    this._maxPktLen = (this._isOpenSSH ? OPENSSH_MAX_PKT_LEN : 34000);

    // Channel compatibility
    this._client = client;
    this._protocol = client._protocol;
    this._callbacks = [];
    this._hasX11 = false;
    this._exit = {
      code: undefined,
      signal: undefined,
      dump: undefined,
      desc: undefined,
    };
    this._waitWindow = false; // SSH-level backpressure
    this._chunkcb = undefined;
    this._buffer = [];
    this.type = chanInfo.type;
    this.subtype = undefined;
    this.incoming = chanInfo.incoming;
    this.outgoing = chanInfo.outgoing;
    this.stderr = fakeStderr;
    this.readable = true;
  }

  // This handles incoming data to parse
  push(data) {
    if (data === null) {
      cleanupRequests(this);
      if (!this.readable)
        return;
      // No more incoming data from the remote side
      this.readable = false;
      this.emit('end');
      return;
    }
    /*
        uint32             length
        byte               type
        byte[length - 1]   data payload
    */
    let p = 0;

    while (p < data.length) {
      if (this._pktLenBytes < 4) {
        let nb = Math.min(4 - this._pktLenBytes, data.length - p);
        this._pktLenBytes += nb;

        while (nb--)
          this._pktLen = (this._pktLen << 8) + data[p++];

        if (this._pktLenBytes < 4)
          return;
        if (this._pktLen === 0)
          return doFatalSFTPError(this, 'Invalid packet length');
        if (this._pktLen > this._maxPktLen) {
          const max = this._maxPktLen;
          return doFatalSFTPError(
            this,
            `Packet length ${this._pktLen} exceeds max length of ${max}`
          );
        }
        if (p >= data.length)
          return;
      }
      if (this._pktPos < this._pktLen) {
        const nb = Math.min(this._pktLen - this._pktPos, data.length - p);
        if (p !== 0 || nb !== data.length) {
          if (nb === this._pktLen) {
            this._pkt = new FastBuffer(data.buffer, data.byteOffset + p, nb);
          } else {
            if (!this._pkt)
              this._pkt = Buffer.allocUnsafe(this._pktLen);
            this._pkt.set(
              new Uint8Array(data.buffer, data.byteOffset + p, nb),
              this._pktPos
            );
          }
        } else if (nb === this._pktLen) {
          this._pkt = data;
        } else {
          if (!this._pkt)
            this._pkt = Buffer.allocUnsafe(this._pktLen);
          this._pkt.set(data, this._pktPos);
        }
        p += nb;
        this._pktPos += nb;
        if (this._pktPos < this._pktLen)
          return;
      }

      const type = this._pkt[0];
      const payload = this._pkt;

      // Prepare for next packet
      this._pktLen = 0;
      this._pktLenBytes = 0;
      this._pkt = undefined;
      this._pktPos = 0;

      const handler = (this.server
                       ? SERVER_HANDLERS[type]
                       : CLIENT_HANDLERS[type]);
      if (!handler)
        return doFatalSFTPError(this, `Unknown packet type ${type}`);

      if (this._version === -1) {
        if (this.server) {
          if (type !== REQUEST.INIT)
            return doFatalSFTPError(this, `Expected INIT packet, got ${type}`);
        } else if (type !== RESPONSE.VERSION) {
          return doFatalSFTPError(this, `Expected VERSION packet, got ${type}`);
        }
      }

      if (handler(this, payload) === false)
        return;
    }
  }

  end() {
    this.destroy();
  }
  destroy() {
    if (this.outgoing.state === 'open' || this.outgoing.state === 'eof') {
      this.outgoing.state = 'closing';
      this._protocol.channelClose(this.outgoing.id);
    }
  }
  _init() {
    this._init = noop;
    if (!this.server)
      sendOrBuffer(this, CLIENT_VERSION_BUFFER);
  }

  // ===========================================================================
  // Client-specific ===========================================================
  // ===========================================================================
  createReadStream(path, options) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    return new ReadStream(this, path, options);
  }
  createWriteStream(path, options) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    return new WriteStream(this, path, options);
  }
  open(path, flags_, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (typeof attrs === 'function') {
      cb = attrs;
      attrs = undefined;
    }

    const flags = (typeof flags_ === 'number' ? flags_ : stringToFlags(flags_));
    if (flags === null)
      throw new Error(`Unknown flags string: ${flags_}`);

    let attrsFlags = 0;
    let attrsLen = 0;
    if (typeof attrs === 'string' || typeof attrs === 'number')
      attrs = { mode: attrs };
    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      attrsFlags = attrs.flags;
      attrsLen = attrs.nb;
    }

    /*
      uint32        id
      string        filename
      uint32        pflags
      ATTRS         attrs
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen + 4 + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.OPEN;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);
    writeUInt32BE(buf, flags, p += pathLen);
    writeUInt32BE(buf, attrsFlags, p += 4);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }
    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} OPEN`
    );
  }
  close(handle, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    /*
      uint32     id
      string     handle
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.CLOSE;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    buf.set(handle, p += 4);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} CLOSE`
    );
  }
  read(handle, buf, off, len, position, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');
    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');
    if (!Buffer.isBuffer(buf))
      throw new Error('buffer is not a Buffer');
    if (off >= buf.length)
      throw new Error('offset is out of bounds');
    if (off + len > buf.length)
      throw new Error('length extends beyond buffer');
    if (position === null)
      throw new Error('null position currently unsupported');

    read_(this, handle, buf, off, len, position, cb);
  }
  readData(handle, buf, off, len, position, cb) {
    // Backwards compatibility
    this.read(handle, buf, off, len, position, cb);
  }
  write(handle, buf, off, len, position, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');
    if (!Buffer.isBuffer(buf))
      throw new Error('buffer is not a Buffer');
    if (off > buf.length)
      throw new Error('offset is out of bounds');
    if (off + len > buf.length)
      throw new Error('length extends beyond buffer');
    if (position === null)
      throw new Error('null position currently unsupported');

    if (!len) {
      cb && process.nextTick(cb, undefined, 0);
      return;
    }

    const maxDataLen = this._maxPktLen - PKT_RW_OVERHEAD;
    const overflow = Math.max(len - maxDataLen, 0);
    const origPosition = position;

    if (overflow)
      len = maxDataLen;

    /*
      uint32     id
      string     handle
      uint64     offset
      string     data
    */
    const handleLen = handle.length;
    let p = 9;
    const out = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen + 8 + 4 + len);

    writeUInt32BE(out, out.length - 4, 0);
    out[4] = REQUEST.WRITE;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(out, reqid, 5);

    writeUInt32BE(out, handleLen, p);
    out.set(handle, p += 4);
    p += handleLen;
    for (let i = 7; i >= 0; --i) {
      out[p + i] = position & 0xFF;
      position /= 256;
    }
    writeUInt32BE(out, len, p += 8);
    bufferCopy(buf, out, off, off + len, p += 4);

    this._requests[reqid] = {
      cb: (err) => {
        if (err) {
          if (typeof cb === 'function')
            cb(err);
        } else if (overflow) {
          this.write(handle,
                     buf,
                     off + len,
                     overflow,
                     origPosition + len,
                     cb);
        } else if (typeof cb === 'function') {
          cb(undefined, off + len);
        }
      }
    };

    const isSent = sendOrBuffer(this, out);
    if (this._debug) {
      const how = (isSent ? 'Sent' : 'Buffered');
      this._debug(`SFTP: Outbound: ${how} WRITE (id:${reqid})`);
    }
  }
  writeData(handle, buf, off, len, position, cb) {
    // Backwards compatibility
    this.write(handle, buf, off, len, position, cb);
  }
  fastGet(remotePath, localPath, opts, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    fastXfer(this, fs, remotePath, localPath, opts, cb);
  }
  fastPut(localPath, remotePath, opts, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    fastXfer(fs, this, localPath, remotePath, opts, cb);
  }
  readFile(path, options, callback_) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let callback;
    if (typeof callback_ === 'function') {
      callback = callback_;
    } else if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }

    if (typeof options === 'string')
      options = { encoding: options, flag: 'r' };
    else if (!options)
      options = { encoding: null, flag: 'r' };
    else if (typeof options !== 'object')
      throw new TypeError('Bad arguments');

    const encoding = options.encoding;
    if (encoding && !Buffer.isEncoding(encoding))
      throw new Error(`Unknown encoding: ${encoding}`);

    // First stat the file, so we know the size.
    let size;
    let buffer; // Single buffer with file data
    let buffers; // List for when size is unknown
    let pos = 0;
    let handle;

    // SFTPv3 does not support using -1 for read position, so we have to track
    // read position manually
    let bytesRead = 0;

    const flag = options.flag || 'r';

    const read = () => {
      if (size === 0) {
        buffer = Buffer.allocUnsafe(8192);
        this.read(handle, buffer, 0, 8192, bytesRead, afterRead);
      } else {
        this.read(handle, buffer, pos, size - pos, bytesRead, afterRead);
      }
    };

    const afterRead = (er, nbytes) => {
      let eof;
      if (er) {
        eof = (er.code === STATUS_CODE.EOF);
        if (!eof) {
          return this.close(handle, () => {
            return callback && callback(er);
          });
        }
      } else {
        eof = false;
      }

      if (eof || (size === 0 && nbytes === 0))
        return close();

      bytesRead += nbytes;
      pos += nbytes;
      if (size !== 0) {
        if (pos === size)
          close();
        else
          read();
      } else {
        // Unknown size, just read until we don't get bytes.
        buffers.push(bufferSlice(buffer, 0, nbytes));
        read();
      }
    };
    afterRead._wantEOFError = true;

    const close = () => {
      this.close(handle, (er) => {
        if (size === 0) {
          // Collect the data into the buffers list.
          buffer = Buffer.concat(buffers, pos);
        } else if (pos < size) {
          buffer = bufferSlice(buffer, 0, pos);
        }

        if (encoding)
          buffer = buffer.toString(encoding);
        return callback && callback(er, buffer);
      });
    };

    this.open(path, flag, 0o666, (er, handle_) => {
      if (er)
        return callback && callback(er);
      handle = handle_;

      const tryStat = (er, st) => {
        if (er) {
          // Try stat() for sftp servers that may not support fstat() for
          // whatever reason
          this.stat(path, (er_, st_) => {
            if (er_) {
              return this.close(handle, () => {
                callback && callback(er);
              });
            }
            tryStat(null, st_);
          });
          return;
        }

        size = st.size || 0;
        if (size === 0) {
          // The kernel lies about many files.
          // Go ahead and try to read some bytes.
          buffers = [];
          return read();
        }

        buffer = Buffer.allocUnsafe(size);
        read();
      };
      this.fstat(handle, tryStat);
    });
  }
  writeFile(path, data, options, callback_) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let callback;
    if (typeof callback_ === 'function') {
      callback = callback_;
    } else if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }

    if (typeof options === 'string')
      options = { encoding: options, mode: 0o666, flag: 'w' };
    else if (!options)
      options = { encoding: 'utf8', mode: 0o666, flag: 'w' };
    else if (typeof options !== 'object')
      throw new TypeError('Bad arguments');

    if (options.encoding && !Buffer.isEncoding(options.encoding))
      throw new Error(`Unknown encoding: ${options.encoding}`);

    const flag = options.flag || 'w';
    this.open(path, flag, options.mode, (openErr, handle) => {
      if (openErr) {
        callback && callback(openErr);
      } else {
        const buffer = (Buffer.isBuffer(data)
                        ? data
                        : Buffer.from('' + data, options.encoding || 'utf8'));
        const position = (/a/.test(flag) ? null : 0);

        // SFTPv3 does not support the notion of 'current position'
        // (null position), so we just attempt to append to the end of the file
        // instead
        if (position === null) {
          const tryStat = (er, st) => {
            if (er) {
              // Try stat() for sftp servers that may not support fstat() for
              // whatever reason
              this.stat(path, (er_, st_) => {
                if (er_) {
                  return this.close(handle, () => {
                    callback && callback(er);
                  });
                }
                tryStat(null, st_);
              });
              return;
            }
            writeAll(this, handle, buffer, 0, buffer.length, st.size, callback);
          };
          this.fstat(handle, tryStat);
          return;
        }
        writeAll(this, handle, buffer, 0, buffer.length, position, callback);
      }
    });
  }
  appendFile(path, data, options, callback_) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let callback;
    if (typeof callback_ === 'function') {
      callback = callback_;
    } else if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }

    if (typeof options === 'string')
      options = { encoding: options, mode: 0o666, flag: 'a' };
    else if (!options)
      options = { encoding: 'utf8', mode: 0o666, flag: 'a' };
    else if (typeof options !== 'object')
      throw new TypeError('Bad arguments');

    if (!options.flag)
      options = Object.assign({ flag: 'a' }, options);
    this.writeFile(path, data, options, callback);
  }
  exists(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    this.stat(path, (err) => {
      cb && cb(err ? false : true);
    });
  }
  unlink(filename, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     filename
    */
    const fnameLen = Buffer.byteLength(filename);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + fnameLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.REMOVE;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, fnameLen, p);
    buf.utf8Write(filename, p += 4, fnameLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} REMOVE`
    );
  }
  rename(oldPath, newPath, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     oldpath
      string     newpath
    */
    const oldLen = Buffer.byteLength(oldPath);
    const newLen = Buffer.byteLength(newPath);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + oldLen + 4 + newLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.RENAME;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, oldLen, p);
    buf.utf8Write(oldPath, p += 4, oldLen);
    writeUInt32BE(buf, newLen, p += oldLen);
    buf.utf8Write(newPath, p += 4, newLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} RENAME`
    );
  }
  mkdir(path, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let flags = 0;
    let attrsLen = 0;

    if (typeof attrs === 'function') {
      cb = attrs;
      attrs = undefined;
    }
    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      flags = attrs.flags;
      attrsLen = attrs.nb;
    }

    /*
      uint32     id
      string     path
      ATTRS      attrs
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.MKDIR;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);
    writeUInt32BE(buf, flags, p += pathLen);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} MKDIR`
    );
  }
  rmdir(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.RMDIR;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} RMDIR`
    );
  }
  readdir(where, opts, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    if (typeof opts !== 'object' || opts === null)
      opts = {};

    const doFilter = (opts && opts.full ? false : true);

    if (!Buffer.isBuffer(where) && typeof where !== 'string')
      throw new Error('missing directory handle or path');

    if (typeof where === 'string') {
      const entries = [];
      let e = 0;

      const reread = (err, handle) => {
        if (err)
          return cb(err);

        this.readdir(handle, opts, (err, list) => {
          const eof = (err && err.code === STATUS_CODE.EOF);

          if (err && !eof)
            return this.close(handle, () => cb(err));

          if (eof) {
            return this.close(handle, (err) => {
              if (err)
                return cb(err);
              cb(undefined, entries);
            });
          }

          for (let i = 0; i < list.length; ++i, ++e)
            entries[e] = list[i];

          reread(undefined, handle);
        });
      };
      return this.opendir(where, reread);
    }

    /*
      uint32     id
      string     handle
    */
    const handleLen = where.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.READDIR;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    buf.set(where, p += 4);

    this._requests[reqid] = {
      cb: (doFilter
           ? (err, list) => {
               if (typeof cb !== 'function')
                 return;
               if (err)
                 return cb(err);

               for (let i = list.length - 1; i >= 0; --i) {
                 if (list[i].filename === '.' || list[i].filename === '..')
                   list.splice(i, 1);
               }

               cb(undefined, list);
             }
           : cb)
    };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} READDIR`
    );
  }
  fstat(handle, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    /*
      uint32     id
      string     handle
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.FSTAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    buf.set(handle, p += 4);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} FSTAT`
    );
  }
  stat(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.STAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} STAT`
    );
  }
  lstat(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.LSTAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} LSTAT`
    );
  }
  opendir(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.OPENDIR;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} OPENDIR`
    );
  }
  setstat(path, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let flags = 0;
    let attrsLen = 0;

    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      flags = attrs.flags;
      attrsLen = attrs.nb;
    } else if (typeof attrs === 'function') {
      cb = attrs;
    }

    /*
      uint32     id
      string     path
      ATTRS      attrs
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.SETSTAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);
    writeUInt32BE(buf, flags, p += pathLen);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} SETSTAT`
    );
  }
  fsetstat(handle, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    let flags = 0;
    let attrsLen = 0;

    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      flags = attrs.flags;
      attrsLen = attrs.nb;
    } else if (typeof attrs === 'function') {
      cb = attrs;
    }

    /*
      uint32     id
      string     handle
      ATTRS      attrs
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.FSETSTAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    buf.set(handle, p += 4);
    writeUInt32BE(buf, flags, p += handleLen);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} FSETSTAT`
    );
  }
  futimes(handle, atime, mtime, cb) {
    return this.fsetstat(handle, {
      atime: toUnixTimestamp(atime),
      mtime: toUnixTimestamp(mtime)
    }, cb);
  }
  utimes(path, atime, mtime, cb) {
    return this.setstat(path, {
      atime: toUnixTimestamp(atime),
      mtime: toUnixTimestamp(mtime)
    }, cb);
  }
  fchown(handle, uid, gid, cb) {
    return this.fsetstat(handle, {
      uid: uid,
      gid: gid
    }, cb);
  }
  chown(path, uid, gid, cb) {
    return this.setstat(path, {
      uid: uid,
      gid: gid
    }, cb);
  }
  fchmod(handle, mode, cb) {
    return this.fsetstat(handle, {
      mode: mode
    }, cb);
  }
  chmod(path, mode, cb) {
    return this.setstat(path, {
      mode: mode
    }, cb);
  }
  readlink(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.READLINK;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = {
      cb: (err, names) => {
        if (typeof cb !== 'function')
          return;
        if (err)
          return cb(err);
        if (!names || !names.length)
          return cb(new Error('Response missing link info'));
        cb(undefined, names[0].filename);
      }
    };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} READLINK`
    );
  }
  symlink(targetPath, linkPath, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     linkpath
      string     targetpath
    */
    const linkLen = Buffer.byteLength(linkPath);
    const targetLen = Buffer.byteLength(targetPath);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + linkLen + 4 + targetLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.SYMLINK;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    if (this._isOpenSSH) {
      // OpenSSH has linkpath and targetpath positions switched
      writeUInt32BE(buf, targetLen, p);
      buf.utf8Write(targetPath, p += 4, targetLen);
      writeUInt32BE(buf, linkLen, p += targetLen);
      buf.utf8Write(linkPath, p += 4, linkLen);
    } else {
      writeUInt32BE(buf, linkLen, p);
      buf.utf8Write(linkPath, p += 4, linkLen);
      writeUInt32BE(buf, targetLen, p += linkLen);
      buf.utf8Write(targetPath, p += 4, targetLen);
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} SYMLINK`
    );
  }
  realpath(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.REALPATH;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = {
      cb: (err, names) => {
        if (typeof cb !== 'function')
          return;
        if (err)
          return cb(err);
        if (!names || !names.length)
          return cb(new Error('Response missing path info'));
        cb(undefined, names[0].filename);
      }
    };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} REALPATH`
    );
  }
  // extended requests
  ext_openssh_rename(oldPath, newPath, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['posix-rename@openssh.com'];
    if (!ext || ext !== '1')
      throw new Error('Server does not support this extended request');

    /*
      uint32    id
      string    "posix-rename@openssh.com"
      string    oldpath
      string    newpath
    */
    const oldLen = Buffer.byteLength(oldPath);
    const newLen = Buffer.byteLength(newPath);
    let p = 9;
    const buf =
      Buffer.allocUnsafe(4 + 1 + 4 + 4 + 24 + 4 + oldLen + 4 + newLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 24, p);
    buf.utf8Write('posix-rename@openssh.com', p += 4, 24);
    writeUInt32BE(buf, oldLen, p += 24);
    buf.utf8Write(oldPath, p += 4, oldLen);
    writeUInt32BE(buf, newLen, p += oldLen);
    buf.utf8Write(newPath, p += 4, newLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const which = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${which} posix-rename@openssh.com`);
    }
  }
  ext_openssh_statvfs(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['statvfs@openssh.com'];
    if (!ext || ext !== '2')
      throw new Error('Server does not support this extended request');

    /*
      uint32    id
      string    "statvfs@openssh.com"
      string    path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 19 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 19, p);
    buf.utf8Write('statvfs@openssh.com', p += 4, 19);
    writeUInt32BE(buf, pathLen, p += 19);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { extended: 'statvfs@openssh.com', cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const which = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${which} statvfs@openssh.com`);
    }
  }
  ext_openssh_fstatvfs(handle, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['fstatvfs@openssh.com'];
    if (!ext || ext !== '2')
      throw new Error('Server does not support this extended request');
    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    /*
      uint32    id
      string    "fstatvfs@openssh.com"
      string    handle
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 20 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 20, p);
    buf.utf8Write('fstatvfs@openssh.com', p += 4, 20);
    writeUInt32BE(buf, handleLen, p += 20);
    buf.set(handle, p += 4);

    this._requests[reqid] = { extended: 'fstatvfs@openssh.com', cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const which = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${which} fstatvfs@openssh.com`);
    }
  }
  ext_openssh_hardlink(oldPath, newPath, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['hardlink@openssh.com'];
    if (!ext || ext.indexOf('1') === -1)
      throw new Error('Server does not support this extended request');

    /*
      uint32    id
      string    "hardlink@openssh.com"
      string    oldpath
      string    newpath
    */
    const oldLen = Buffer.byteLength(oldPath);
    const newLen = Buffer.byteLength(newPath);
    let p = 9;
    const buf =
      Buffer.allocUnsafe(4 + 1 + 4 + 4 + 20 + 4 + oldLen + 4 + newLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 20, p);
    buf.utf8Write('hardlink@openssh.com', p += 4, 20);
    writeUInt32BE(buf, oldLen, p += 20);
    buf.utf8Write(oldPath, p += 4, oldLen);
    writeUInt32BE(buf, newLen, p += oldLen);
    buf.utf8Write(newPath, p += 4, newLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const which = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${which} hardlink@openssh.com`);
    }
  }
  ext_openssh_fsync(handle, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['fsync@openssh.com'];
    if (!ext || ext.indexOf('1') === -1)
      throw new Error('Server does not support this extended request');
    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    /*
      uint32    id
      string    "fsync@openssh.com"
      string    handle
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 17 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 17, p);
    buf.utf8Write('fsync@openssh.com', p += 4, 17);
    writeUInt32BE(buf, handleLen, p += 17);
    buf.set(handle, p += 4);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} fsync@openssh.com`
    );
  }
  // ===========================================================================
  // Server-specific ===========================================================
  // ===========================================================================
  handle(reqid, handle) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    const handleLen = handle.length;

    if (handleLen > 256)
      throw new Error('handle too large (> 256 bytes)');

    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.HANDLE;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    if (handleLen)
      buf.set(handle, p += 4);

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} HANDLE`
    );
  }
  status(reqid, code, message) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (!VALID_STATUS_CODES.has(code))
      throw new Error(`Bad status code: ${code}`);

    message || (message = '');

    const msgLen = Buffer.byteLength(message);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 4 + msgLen + 4);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.STATUS;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, code, p);

    writeUInt32BE(buf, msgLen, p += 4);
    p += 4;
    if (msgLen) {
      buf.utf8Write(message, p, msgLen);
      p += msgLen;
    }

    writeUInt32BE(buf, 0, p); // Empty language tag

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} STATUS`
    );
  }
  data(reqid, data, encoding) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    const isBuffer = Buffer.isBuffer(data);

    if (!isBuffer && typeof data !== 'string')
      throw new Error('data is not a Buffer or string');

    let isUTF8;
    if (!isBuffer && !encoding) {
      encoding = undefined;
      isUTF8 = true;
    }

    const dataLen = (
      isBuffer
      ? data.length
      : Buffer.byteLength(data, encoding)
    );
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + dataLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.DATA;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, dataLen, p);
    if (dataLen) {
      if (isBuffer)
        buf.set(data, p += 4);
      else if (isUTF8)
        buf.utf8Write(data, p += 4, dataLen);
      else
        buf.write(data, p += 4, dataLen, encoding);
    }

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} DATA`
    );
  }
  name(reqid, names) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (!Array.isArray(names)) {
      if (typeof names !== 'object' || names === null)
        throw new Error('names is not an object or array');
      names = [ names ];
    }

    const count = names.length;
    let namesLen = 0;
    let nameAttrs;
    const attrs = [];

    for (let i = 0; i < count; ++i) {
      const name = names[i];
      const filename = (
        !name || !name.filename || typeof name.filename !== 'string'
        ? ''
        : name.filename
      );
      namesLen += 4 + Buffer.byteLength(filename);
      const longname = (
        !name || !name.longname || typeof name.longname !== 'string'
        ? ''
        : name.longname
      );
      namesLen += 4 + Buffer.byteLength(longname);

      if (typeof name.attrs === 'object' && name.attrs !== null) {
        nameAttrs = attrsToBytes(name.attrs);
        namesLen += 4 + nameAttrs.nb;

        if (nameAttrs.nb) {
          let bytes;

          if (nameAttrs.nb === ATTRS_BUF.length) {
            bytes = new Uint8Array(ATTRS_BUF);
          } else {
            bytes = new Uint8Array(nameAttrs.nb);
            bufferCopy(ATTRS_BUF, bytes, 0, nameAttrs.nb, 0);
          }

          nameAttrs.bytes = bytes;
        }

        attrs.push(nameAttrs);
      } else {
        namesLen += 4;
        attrs.push(null);
      }
    }

    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + namesLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.NAME;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, count, p);

    p += 4;

    for (let i = 0; i < count; ++i) {
      const name = names[i];

      {
        const filename = (
          !name || !name.filename || typeof name.filename !== 'string'
          ? ''
          : name.filename
        );
        const len = Buffer.byteLength(filename);
        writeUInt32BE(buf, len, p);
        p += 4;
        if (len) {
          buf.utf8Write(filename, p, len);
          p += len;
        }
      }

      {
        const longname = (
          !name || !name.longname || typeof name.longname !== 'string'
          ? ''
          : name.longname
        );
        const len = Buffer.byteLength(longname);
        writeUInt32BE(buf, len, p);
        p += 4;
        if (len) {
          buf.utf8Write(longname, p, len);
          p += len;
        }
      }

      const attr = attrs[i];
      if (attr) {
        writeUInt32BE(buf, attr.flags, p);
        p += 4;
        if (attr.flags && attr.bytes) {
          buf.set(attr.bytes, p);
          p += attr.nb;
        }
      } else {
        writeUInt32BE(buf, 0, p);
        p += 4;
      }
    }

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} NAME`
    );
  }
  attrs(reqid, attrs) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (typeof attrs !== 'object' || attrs === null)
      throw new Error('attrs is not an object');

    attrs = attrsToBytes(attrs);
    const flags = attrs.flags;
    const attrsLen = attrs.nb;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.ATTRS;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, flags, p);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} ATTRS`
    );
  }
}

function tryCreateBuffer(size) {
  try {
    return Buffer.allocUnsafe(size);
  } catch (ex) {
    return ex;
  }
}

function read_(self, handle, buf, off, len, position, cb, req_) {
  const maxDataLen = self._maxPktLen - PKT_RW_OVERHEAD;
  const overflow = Math.max(len - maxDataLen, 0);

  if (overflow)
    len = maxDataLen;

  /*
    uint32     id
    string     handle
    uint64     offset
    uint32     len
  */
  const handleLen = handle.length;
  let p = 9;
  let pos = position;
  const out = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen + 8 + 4);

  writeUInt32BE(out, out.length - 4, 0);
  out[4] = REQUEST.READ;
  const reqid = self._writeReqid = (self._writeReqid + 1) & MAX_REQID;
  writeUInt32BE(out, reqid, 5);

  writeUInt32BE(out, handleLen, p);
  out.set(handle, p += 4);
  p += handleLen;
  for (let i = 7; i >= 0; --i) {
    out[p + i] = pos & 0xFF;
    pos /= 256;
  }
  writeUInt32BE(out, len, p += 8);

  if (typeof cb !== 'function')
    cb = noop;

  const req = (req_ || {
    nb: 0,
    position,
    off,
    origOff: off,
    len: undefined,
    overflow: undefined,
    cb: (err, data, nb) => {
      const len = req.len;
      const overflow = req.overflow;

      if (err) {
        if (cb._wantEOFError || err.code !== STATUS_CODE.EOF)
          return cb(err);
      } else if (nb > len) {
        return cb(new Error('Received more data than requested'));
      } else if (nb === len && overflow) {
        req.nb += nb;
        req.position += nb;
        req.off += nb;
        read_(self, handle, buf, req.off, overflow, req.position, cb, req);
        return;
      }

      if (req.origOff === 0 && buf.length === req.nb)
        data = buf;
      else
        data = bufferSlice(buf, req.origOff, req.origOff + req.nb);
      cb(undefined, req.nb + (nb || 0), data, req.position);
    },
    buffer: undefined,
  });

  req.len = len;
  req.overflow = overflow;

  // TODO: avoid creating multiple buffer slices when we need to re-call read_()
  // because of overflow
  req.buffer = bufferSlice(buf, off, off + len);

  self._requests[reqid] = req;

  const isBuffered = sendOrBuffer(self, out);
  self._debug && self._debug(
    `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} READ`
  );
}

function fastXfer(src, dst, srcPath, dstPath, opts, cb) {
  let concurrency = 64;
  let chunkSize = 32768;
  let onstep;
  let mode;
  let fileSize;

  if (typeof opts === 'function') {
    cb = opts;
  } else if (typeof opts === 'object' && opts !== null) {
    if (typeof opts.concurrency === 'number'
        && opts.concurrency > 0
        && !isNaN(opts.concurrency)) {
      concurrency = opts.concurrency;
    }
    if (typeof opts.chunkSize === 'number'
        && opts.chunkSize > 0
        && !isNaN(opts.chunkSize)) {
      chunkSize = opts.chunkSize;
    }
    if (typeof opts.fileSize === 'number'
        && opts.fileSize > 0
        && !isNaN(opts.fileSize)) {
      fileSize = opts.fileSize;
    }
    if (typeof opts.step === 'function')
      onstep = opts.step;

    if (typeof opts.mode === 'string' || typeof opts.mode === 'number')
      mode = modeNum(opts.mode);
  }

  // Internal state variables
  let fsize;
  let pdst = 0;
  let total = 0;
  let hadError = false;
  let srcHandle;
  let dstHandle;
  let readbuf;
  let bufsize = chunkSize * concurrency;

  function onerror(err) {
    if (hadError)
      return;

    hadError = true;

    let left = 0;
    let cbfinal;

    if (srcHandle || dstHandle) {
      cbfinal = () => {
        if (--left === 0)
          cb(err);
      };
      if (srcHandle && (src === fs || src.outgoing.state === 'open'))
        ++left;
      if (dstHandle && (dst === fs || dst.outgoing.state === 'open'))
        ++left;
      if (srcHandle && (src === fs || src.outgoing.state === 'open'))
        src.close(srcHandle, cbfinal);
      if (dstHandle && (dst === fs || dst.outgoing.state === 'open'))
        dst.close(dstHandle, cbfinal);
    } else {
      cb(err);
    }
  }

  src.open(srcPath, 'r', (err, sourceHandle) => {
    if (err)
      return onerror(err);

    srcHandle = sourceHandle;

    if (fileSize === undefined)
      src.fstat(srcHandle, tryStat);
    else
      tryStat(null, { size: fileSize });

    function tryStat(err, attrs) {
      if (err) {
        if (src !== fs) {
          // Try stat() for sftp servers that may not support fstat() for
          // whatever reason
          src.stat(srcPath, (err_, attrs_) => {
            if (err_)
              return onerror(err);
            tryStat(null, attrs_);
          });
          return;
        }
        return onerror(err);
      }
      fsize = attrs.size;

      dst.open(dstPath, 'w', (err, destHandle) => {
        if (err)
          return onerror(err);

        dstHandle = destHandle;

        if (fsize <= 0)
          return onerror();

        // Use less memory where possible
        while (bufsize > fsize) {
          if (concurrency === 1) {
            bufsize = fsize;
            break;
          }
          bufsize -= chunkSize;
          --concurrency;
        }

        readbuf = tryCreateBuffer(bufsize);
        if (readbuf instanceof Error)
          return onerror(readbuf);

        if (mode !== undefined) {
          dst.fchmod(dstHandle, mode, function tryAgain(err) {
            if (err) {
              // Try chmod() for sftp servers that may not support fchmod()
              // for whatever reason
              dst.chmod(dstPath, mode, (err_) => tryAgain());
              return;
            }
            startReads();
          });
        } else {
          startReads();
        }

        function onread(err, nb, data, dstpos, datapos, origChunkLen) {
          if (err)
            return onerror(err);

          datapos = datapos || 0;

          dst.write(dstHandle, readbuf, datapos, nb, dstpos, writeCb);

          function writeCb(err) {
            if (err)
              return onerror(err);

            total += nb;
            onstep && onstep(total, nb, fsize);

            if (nb < origChunkLen)
              return singleRead(datapos, dstpos + nb, origChunkLen - nb);

            if (total === fsize) {
              dst.close(dstHandle, (err) => {
                dstHandle = undefined;
                if (err)
                  return onerror(err);
                src.close(srcHandle, (err) => {
                  srcHandle = undefined;
                  if (err)
                    return onerror(err);
                  cb();
                });
              });
              return;
            }

            if (pdst >= fsize)
              return;

            const chunk =
              (pdst + chunkSize > fsize ? fsize - pdst : chunkSize);
            singleRead(datapos, pdst, chunk);
            pdst += chunk;
          }
        }

        function makeCb(psrc, pdst, chunk) {
          return (err, nb, data) => {
            onread(err, nb, data, pdst, psrc, chunk);
          };
        }

        function singleRead(psrc, pdst, chunk) {
          src.read(srcHandle,
                   readbuf,
                   psrc,
                   chunk,
                   pdst,
                   makeCb(psrc, pdst, chunk));
        }

        function startReads() {
          let reads = 0;
          let psrc = 0;
          while (pdst < fsize && reads < concurrency) {
            const chunk =
              (pdst + chunkSize > fsize ? fsize - pdst : chunkSize);
            singleRead(psrc, pdst, chunk);
            psrc += chunk;
            pdst += chunk;
            ++reads;
          }
        }
      });
    }
  });
}

function writeAll(sftp, handle, buffer, offset, length, position, callback_) {
  const callback = (typeof callback_ === 'function' ? callback_ : undefined);

  sftp.write(handle,
             buffer,
             offset,
             length,
             position,
             (writeErr, written) => {
    if (writeErr) {
      return sftp.close(handle, () => {
        callback && callback(writeErr);
      });
    }
    if (written === length) {
      sftp.close(handle, callback);
    } else {
      offset += written;
      length -= written;
      position += written;
      writeAll(sftp, handle, buffer, offset, length, position, callback);
    }
  });
}

class Stats {
  constructor(initial) {
    this.mode = (initial && initial.mode);
    this.uid = (initial && initial.uid);
    this.gid = (initial && initial.gid);
    this.size = (initial && initial.size);
    this.atime = (initial && initial.atime);
    this.mtime = (initial && initial.mtime);
    this.extended = (initial && initial.extended);
  }
  isDirectory() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFDIR);
  }
  isFile() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFREG);
  }
  isBlockDevice() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFBLK);
  }
  isCharacterDevice() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFCHR);
  }
  isSymbolicLink() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFLNK);
  }
  isFIFO() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFIFO);
  }
  isSocket() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFSOCK);
  }
}

function attrsToBytes(attrs) {
  let flags = 0;
  let nb = 0;

  if (typeof attrs === 'object' && attrs !== null) {
    if (typeof attrs.size === 'number') {
      flags |= ATTR.SIZE;
      const val = attrs.size;
      // Big Endian
      ATTRS_BUF[nb++] = val / 72057594037927940; // 2**56
      ATTRS_BUF[nb++] = val / 281474976710656; // 2**48
      ATTRS_BUF[nb++] = val / 1099511627776; // 2**40
      ATTRS_BUF[nb++] = val / 4294967296; // 2**32
      ATTRS_BUF[nb++] = val / 16777216; // 2**24
      ATTRS_BUF[nb++] = val / 65536; // 2**16
      ATTRS_BUF[nb++] = val / 256; // 2**8
      ATTRS_BUF[nb++] = val;
    }
    if (typeof attrs.uid === 'number' && typeof attrs.gid === 'number') {
      flags |= ATTR.UIDGID;
      const uid = attrs.uid;
      const gid = attrs.gid;
      // Big Endian
      ATTRS_BUF[nb++] = uid >>> 24;
      ATTRS_BUF[nb++] = uid >>> 16;
      ATTRS_BUF[nb++] = uid >>> 8;
      ATTRS_BUF[nb++] = uid;
      ATTRS_BUF[nb++] = gid >>> 24;
      ATTRS_BUF[nb++] = gid >>> 16;
      ATTRS_BUF[nb++] = gid >>> 8;
      ATTRS_BUF[nb++] = gid;
    }
    if (typeof attrs.mode === 'number' || typeof attrs.mode === 'string') {
      const mode = modeNum(attrs.mode);
      flags |= ATTR.PERMISSIONS;
      // Big Endian
      ATTRS_BUF[nb++] = mode >>> 24;
      ATTRS_BUF[nb++] = mode >>> 16;
      ATTRS_BUF[nb++] = mode >>> 8;
      ATTRS_BUF[nb++] = mode;
    }
    if ((typeof attrs.atime === 'number' || isDate(attrs.atime))
        && (typeof attrs.mtime === 'number' || isDate(attrs.mtime))) {
      const atime = toUnixTimestamp(attrs.atime);
      const mtime = toUnixTimestamp(attrs.mtime);

      flags |= ATTR.ACMODTIME;
      // Big Endian
      ATTRS_BUF[nb++] = atime >>> 24;
      ATTRS_BUF[nb++] = atime >>> 16;
      ATTRS_BUF[nb++] = atime >>> 8;
      ATTRS_BUF[nb++] = atime;
      ATTRS_BUF[nb++] = mtime >>> 24;
      ATTRS_BUF[nb++] = mtime >>> 16;
      ATTRS_BUF[nb++] = mtime >>> 8;
      ATTRS_BUF[nb++] = mtime;
    }
    // TODO: extended attributes
  }

  return { flags, nb };
}

function toUnixTimestamp(time) {
  // eslint-disable-next-line no-self-compare
  if (typeof time === 'number' && time === time) // Valid, non-NaN number
    return time;
  if (isDate(time))
    return parseInt(time.getTime() / 1000, 10);
  throw new Error(`Cannot parse time: ${time}`);
}

function modeNum(mode) {
  // eslint-disable-next-line no-self-compare
  if (typeof mode === 'number' && mode === mode) // Valid, non-NaN number
    return mode;
  if (typeof mode === 'string')
    return modeNum(parseInt(mode, 8));
  throw new Error(`Cannot parse mode: ${mode}`);
}

const stringFlagMap = {
  'r': OPEN_MODE.READ,
  'r+': OPEN_MODE.READ | OPEN_MODE.WRITE,
  'w': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE,
  'wx': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE | OPEN_MODE.EXCL,
  'xw': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE | OPEN_MODE.EXCL,
  'w+': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE,
  'wx+': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE
         | OPEN_MODE.EXCL,
  'xw+': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE
         | OPEN_MODE.EXCL,
  'a': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.WRITE,
  'ax': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.WRITE | OPEN_MODE.EXCL,
  'xa': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.WRITE | OPEN_MODE.EXCL,
  'a+': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE,
  'ax+': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE
         | OPEN_MODE.EXCL,
  'xa+': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE
         | OPEN_MODE.EXCL
};

function stringToFlags(str) {
  const flags = stringFlagMap[str];
  return (flags !== undefined ? flags : null);
}

const flagsToString = (() => {
  const stringFlagMapKeys = Object.keys(stringFlagMap);
  return (flags) => {
    for (let i = 0; i < stringFlagMapKeys.length; ++i) {
      const key = stringFlagMapKeys[i];
      if (stringFlagMap[key] === flags)
        return key;
    }
    return null;
  };
})();

function readAttrs(biOpt) {
  /*
    uint32   flags
    uint64   size           present only if flag SSH_FILEXFER_ATTR_SIZE
    uint32   uid            present only if flag SSH_FILEXFER_ATTR_UIDGID
    uint32   gid            present only if flag SSH_FILEXFER_ATTR_UIDGID
    uint32   permissions    present only if flag SSH_FILEXFER_ATTR_PERMISSIONS
    uint32   atime          present only if flag SSH_FILEXFER_ACMODTIME
    uint32   mtime          present only if flag SSH_FILEXFER_ACMODTIME
    uint32   extended_count present only if flag SSH_FILEXFER_ATTR_EXTENDED
    string   extended_type
    string   extended_data
    ...      more extended data (extended_type - extended_data pairs),
               so that number of pairs equals extended_count
  */
  const flags = bufferParser.readUInt32BE();
  if (flags === undefined)
    return;

  const attrs = new Stats();
  if (flags & ATTR.SIZE) {
    const size = bufferParser.readUInt64BE(biOpt);
    if (size === undefined)
      return;
    attrs.size = size;
  }

  if (flags & ATTR.UIDGID) {
    const uid = bufferParser.readUInt32BE();
    const gid = bufferParser.readUInt32BE();
    if (gid === undefined)
      return;
    attrs.uid = uid;
    attrs.gid = gid;
  }

  if (flags & ATTR.PERMISSIONS) {
    const mode = bufferParser.readUInt32BE();
    if (mode === undefined)
      return;
    attrs.mode = mode;
  }

  if (flags & ATTR.ACMODTIME) {
    const atime = bufferParser.readUInt32BE();
    const mtime = bufferParser.readUInt32BE();
    if (mtime === undefined)
      return;
    attrs.atime = atime;
    attrs.mtime = mtime;
  }

  if (flags & ATTR.EXTENDED) {
    const count = bufferParser.readUInt32BE();
    if (count === undefined)
      return;
    const extended = {};
    for (let i = 0; i < count; ++i) {
      const type = bufferParser.readString(true);
      const data = bufferParser.readString();
      if (data === undefined)
        return;
      extended[type] = data;
    }
    attrs.extended = extended;
  }

  return attrs;
}

function sendOrBuffer(sftp, payload) {
  const ret = tryWritePayload(sftp, payload);
  if (ret !== undefined) {
    sftp._buffer.push(ret);
    return false;
  }
  return true;
}

function tryWritePayload(sftp, payload) {
  const outgoing = sftp.outgoing;
  if (outgoing.state !== 'open')
    return;

  if (outgoing.window === 0) {
    sftp._waitWindow = true; // XXX: Unnecessary?
    return payload;
  }

  let ret;
  const len = payload.length;
  let p = 0;

  while (len - p > 0 && outgoing.window > 0) {
    const actualLen = Math.min(len - p, outgoing.window, outgoing.packetSize);
    outgoing.window -= actualLen;
    if (outgoing.window === 0) {
      sftp._waitWindow = true;
      sftp._chunkcb = drainBuffer;
    }

    if (p === 0 && actualLen === len) {
      sftp._protocol.channelData(sftp.outgoing.id, payload);
    } else {
      sftp._protocol.channelData(sftp.outgoing.id,
                                 bufferSlice(payload, p, p + actualLen));
    }

    p += actualLen;
  }

  if (len - p > 0) {
    if (p > 0)
      ret = bufferSlice(payload, p, len);
    else
      ret = payload; // XXX: should never get here?
  }

  return ret;
}

function drainBuffer() {
  this._chunkcb = undefined;
  const buffer = this._buffer;
  let i = 0;
  while (i < buffer.length) {
    const payload = buffer[i];
    const ret = tryWritePayload(this, payload);
    if (ret !== undefined) {
      if (ret !== payload)
        buffer[i] = ret;
      if (i > 0)
        this._buffer = buffer.slice(i);
      return;
    }
    ++i;
  }
  if (i > 0)
    this._buffer = [];
}

function doFatalSFTPError(sftp, msg, noDebug) {
  const err = new Error(msg);
  err.level = 'sftp-protocol';
  if (!noDebug && sftp._debug)
    sftp._debug(`SFTP: Inbound: ${msg}`);
  sftp.emit('error', err);
  sftp.destroy();
  cleanupRequests(sftp);
  return false;
}

function cleanupRequests(sftp) {
  const keys = Object.keys(sftp._requests);
  if (keys.length === 0)
    return;

  const reqs = sftp._requests;
  sftp._requests = {};
  const err = new Error('No response from server');
  for (let i = 0; i < keys.length; ++i) {
    const req = reqs[keys[i]];
    if (typeof req.cb === 'function')
      req.cb(err);
  }
}

const CLIENT_HANDLERS = {
  [RESPONSE.VERSION]: (sftp, payload) => {
    if (sftp._version !== -1)
      return doFatalSFTPError(sftp, 'Duplicate VERSION packet');

    const extensions = {};

    /*
      uint32 version
      <extension data>
    */
    bufferParser.init(payload, 1);
    let version = bufferParser.readUInt32BE();
    while (bufferParser.avail()) {
      const extName = bufferParser.readString(true);
      const extData = bufferParser.readString(true);
      if (extData === undefined) {
        version = undefined;
        break;
      }
      extensions[extName] = extData;
    }
    bufferParser.clear();

    if (version === undefined)
      return doFatalSFTPError(sftp, 'Malformed VERSION packet');

    if (sftp._debug) {
      const names = Object.keys(extensions);
      if (names.length) {
        sftp._debug(
          `SFTP: Inbound: Received VERSION (v${version}, exts:${names})`
        );
      } else {
        sftp._debug(`SFTP: Inbound: Received VERSION (v${version})`);
      }
    }

    sftp._version = version;
    sftp._extensions = extensions;
    sftp.emit('ready');
  },
  [RESPONSE.STATUS]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      uint32     error/status code
      string     error message (ISO-10646 UTF-8)
      string     language tag
    */
    const errorCode = bufferParser.readUInt32BE();
    const errorMsg = bufferParser.readString(true);
    const lang = bufferParser.skipString();
    bufferParser.clear();

    if (lang === undefined) {
      if (reqID !== undefined)
        delete sftp._requests[reqID];
      return doFatalSFTPError(sftp, 'Malformed STATUS packet');
    }

    if (sftp._debug) {
      const jsonMsg = JSON.stringify(errorMsg);
      sftp._debug(
        `SFTP: Inbound: Received STATUS (id:${reqID}, ${errorCode}, ${jsonMsg})`
      );
    }
    const req = sftp._requests[reqID];
    delete sftp._requests[reqID];
    if (req && typeof req.cb === 'function') {
      if (errorCode === STATUS_CODE.OK) {
        req.cb();
        return;
      }
      const err = new Error(errorMsg
                            || STATUS_CODE_STR[errorCode]
                            || 'Unknown status');
      err.code = errorCode;
      req.cb(err);
    }
  },
  [RESPONSE.HANDLE]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     handle
    */
    const handle = bufferParser.readString();
    bufferParser.clear();

    if (handle === undefined) {
      if (reqID !== undefined)
        delete sftp._requests[reqID];
      return doFatalSFTPError(sftp, 'Malformed HANDLE packet');
    }

    sftp._debug && sftp._debug(`SFTP: Inbound: Received HANDLE (id:${reqID})`);

    const req = sftp._requests[reqID];
    delete sftp._requests[reqID];
    if (req && typeof req.cb === 'function')
      req.cb(undefined, handle);
  },
  [RESPONSE.DATA]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    let req;
    if (reqID !== undefined) {
      req = sftp._requests[reqID];
      delete sftp._requests[reqID];
    }
    /*
      string     data
    */
    if (req && typeof req.cb === 'function') {
      if (req.buffer) {
        // We have already pre-allocated space to store the data

        const nb = bufferParser.readString(req.buffer);
        bufferParser.clear();

        if (nb !== undefined) {
          sftp._debug && sftp._debug(
            `SFTP: Inbound: Received DATA (id:${reqID}, ${nb})`
          );
          req.cb(undefined, req.buffer, nb);
          return;
        }
      } else {
        const data = bufferParser.readString();
        bufferParser.clear();

        if (data !== undefined) {
          sftp._debug && sftp._debug(
            `SFTP: Inbound: Received DATA (id:${reqID}, ${data.length})`
          );
          req.cb(undefined, data);
          return;
        }
      }
    } else {
      const nb = bufferParser.skipString();
      bufferParser.clear();
      if (nb !== undefined) {
        sftp._debug && sftp._debug(
          `SFTP: Inbound: Received DATA (id:${reqID}, ${nb})`
        );
        return;
      }
    }

    return doFatalSFTPError(sftp, 'Malformed DATA packet');
  },
  [RESPONSE.NAME]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    let req;
    if (reqID !== undefined) {
      req = sftp._requests[reqID];
      delete sftp._requests[reqID];
    }
    /*
      uint32     count
      repeats count times:
              string     filename
              string     longname
              ATTRS      attrs
    */
    const count = bufferParser.readUInt32BE();
    if (count !== undefined) {
      let names = [];
      for (let i = 0; i < count; ++i) {
        // We are going to assume UTF-8 for filenames despite the SFTPv3
        // spec not specifying an encoding because the specs for newer
        // versions of the protocol all explicitly specify UTF-8 for
        // filenames
        const filename = bufferParser.readString(true);

        // `longname` only exists in SFTPv3 and since it typically will
        // contain the filename, we assume it is also UTF-8
        const longname = bufferParser.readString(true);

        const attrs = readAttrs(sftp._biOpt);
        if (attrs === undefined) {
          names = undefined;
          break;
        }
        names.push({ filename, longname, attrs });
      }
      if (names !== undefined) {
        sftp._debug && sftp._debug(
          `SFTP: Inbound: Received NAME (id:${reqID}, ${names.length})`
        );
        bufferParser.clear();
        if (req && typeof req.cb === 'function')
          req.cb(undefined, names);
        return;
      }
    }

    bufferParser.clear();
    return doFatalSFTPError(sftp, 'Malformed NAME packet');
  },
  [RESPONSE.ATTRS]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    let req;
    if (reqID !== undefined) {
      req = sftp._requests[reqID];
      delete sftp._requests[reqID];
    }
    /*
      ATTRS      attrs
    */
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();
    if (attrs !== undefined) {
      sftp._debug && sftp._debug(`SFTP: Inbound: Received ATTRS (id:${reqID})`);
      if (req && typeof req.cb === 'function')
        req.cb(undefined, attrs);
      return;
    }

    return doFatalSFTPError(sftp, 'Malformed ATTRS packet');
  },
  [RESPONSE.EXTENDED]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    if (reqID !== undefined) {
      const req = sftp._requests[reqID];
      if (req) {
        delete sftp._requests[reqID];
        switch (req.extended) {
          case 'statvfs@openssh.com':
          case 'fstatvfs@openssh.com': {
            /*
              uint64    f_bsize   // file system block size
              uint64    f_frsize  // fundamental fs block size
              uint64    f_blocks  // number of blocks (unit f_frsize)
              uint64    f_bfree   // free blocks in file system
              uint64    f_bavail  // free blocks for non-root
              uint64    f_files   // total file inodes
              uint64    f_ffree   // free file inodes
              uint64    f_favail  // free file inodes for to non-root
              uint64    f_fsid    // file system id
              uint64    f_flag    // bit mask of f_flag values
              uint64    f_namemax // maximum filename length
            */
            const biOpt = sftp._biOpt;
            const stats = {
              f_bsize: bufferParser.readUInt64BE(biOpt),
              f_frsize: bufferParser.readUInt64BE(biOpt),
              f_blocks: bufferParser.readUInt64BE(biOpt),
              f_bfree: bufferParser.readUInt64BE(biOpt),
              f_bavail: bufferParser.readUInt64BE(biOpt),
              f_files: bufferParser.readUInt64BE(biOpt),
              f_ffree: bufferParser.readUInt64BE(biOpt),
              f_favail: bufferParser.readUInt64BE(biOpt),
              f_sid: bufferParser.readUInt64BE(biOpt),
              f_flag: bufferParser.readUInt64BE(biOpt),
              f_namemax: bufferParser.readUInt64BE(biOpt),
            };
            if (stats.f_namemax === undefined)
              break;
            if (sftp._debug) {
              sftp._debug(
                'SFTP: Inbound: Received EXTENDED_REPLY '
                  + `(id:${reqID}, ${req.extended})`
              );
            }
            bufferParser.clear();
            if (typeof req.cb === 'function')
              req.cb(undefined, stats);
            return;
          }
          default:
            // Unknown extended request
            sftp._debug && sftp._debug(
              `SFTP: Inbound: Received EXTENDED_REPLY (id:${reqID}, ???)`
            );
            bufferParser.clear();
            if (typeof req.cb === 'function')
              req.cb();
            return;
        }
      } else {
        sftp._debug && sftp._debug(
          `SFTP: Inbound: Received EXTENDED_REPLY (id:${reqID}, ???)`
        );
        bufferParser.clear();
        return;
      }
    }

    bufferParser.clear();
    return doFatalSFTPError(sftp, 'Malformed EXTENDED_REPLY packet');
  },
};
const SERVER_HANDLERS = {
  [REQUEST.INIT]: (sftp, payload) => {
    if (sftp._version !== -1)
      return doFatalSFTPError(sftp, 'Duplicate INIT packet');

    const extensions = {};

    /*
      uint32 version
      <extension data>
    */
    bufferParser.init(payload, 1);
    let version = bufferParser.readUInt32BE();
    while (bufferParser.avail()) {
      const extName = bufferParser.readString(true);
      const extData = bufferParser.readString(true);
      if (extData === undefined) {
        version = undefined;
        break;
      }
      extensions[extName] = extData;
    }
    bufferParser.clear();

    if (version === undefined)
      return doFatalSFTPError(sftp, 'Malformed INIT packet');

    if (sftp._debug) {
      const names = Object.keys(extensions);
      if (names.length) {
        sftp._debug(
          `SFTP: Inbound: Received INIT (v${version}, exts:${names})`
        );
      } else {
        sftp._debug(`SFTP: Inbound: Received INIT (v${version})`);
      }
    }

    sendOrBuffer(sftp, SERVER_VERSION_BUFFER);

    sftp._version = version;
    sftp._extensions = extensions;
    sftp.emit('ready');
  },
  [REQUEST.OPEN]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string        filename
      uint32        pflags
      ATTRS         attrs
    */
    const filename = bufferParser.readString(true);
    const pflags = bufferParser.readUInt32BE();
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();

    if (attrs === undefined)
      return doFatalSFTPError(sftp, 'Malformed OPEN packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received OPEN (id:${reqID})`);

    if (!sftp.emit('OPEN', reqID, filename, pflags, attrs)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.CLOSE]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string        handle
    */
    const handle = bufferParser.readString();
    bufferParser.clear();

    if (handle === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed CLOSE packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received CLOSE (id:${reqID})`);

    if (!sftp.emit('CLOSE', reqID, handle)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.READ]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     handle
      uint64     offset
      uint32     len
    */
    const handle = bufferParser.readString();
    const offset = bufferParser.readUInt64BE(sftp._biOpt);
    const len = bufferParser.readUInt32BE();
    bufferParser.clear();

    if (len === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed READ packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received READ (id:${reqID})`);

    if (!sftp.emit('READ', reqID, handle, offset, len)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.WRITE]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     handle
      uint64     offset
      string     data
    */
    const handle = bufferParser.readString();
    const offset = bufferParser.readUInt64BE(sftp._biOpt);
    const data = bufferParser.readString();
    bufferParser.clear();

    if (data === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed WRITE packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received WRITE (id:${reqID})`);

    if (!sftp.emit('WRITE', reqID, handle, offset, data)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.LSTAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed LSTAT packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received LSTAT (id:${reqID})`);

    if (!sftp.emit('LSTAT', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.FSTAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string        handle
    */
    const handle = bufferParser.readString();
    bufferParser.clear();

    if (handle === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed FSTAT packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received FSTAT (id:${reqID})`);

    if (!sftp.emit('FSTAT', reqID, handle)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.SETSTAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
      ATTRS      attrs
    */
    const path = bufferParser.readString(true);
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();

    if (attrs === undefined)
      return doFatalSFTPError(sftp, 'Malformed SETSTAT packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received SETSTAT (id:${reqID})`);

    if (!sftp.emit('SETSTAT', reqID, path, attrs)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.FSETSTAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     handle
      ATTRS      attrs
    */
    const handle = bufferParser.readString();
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();

    if (attrs === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed FSETSTAT packet');

    sftp._debug && sftp._debug(
      `SFTP: Inbound: Received FSETSTAT (id:${reqID})`
    );

    if (!sftp.emit('FSETSTAT', reqID, handle, attrs)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.OPENDIR]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed OPENDIR packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received OPENDIR (id:${reqID})`);

    if (!sftp.emit('OPENDIR', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.READDIR]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string        handle
    */
    const handle = bufferParser.readString();
    bufferParser.clear();

    if (handle === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed READDIR packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received READDIR (id:${reqID})`);

    if (!sftp.emit('READDIR', reqID, handle)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.REMOVE]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed REMOVE packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received REMOVE (id:${reqID})`);

    if (!sftp.emit('REMOVE', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.MKDIR]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
      ATTRS      attrs
    */
    const path = bufferParser.readString(true);
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();

    if (attrs === undefined)
      return doFatalSFTPError(sftp, 'Malformed MKDIR packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received MKDIR (id:${reqID})`);

    if (!sftp.emit('MKDIR', reqID, path, attrs)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.RMDIR]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed RMDIR packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received RMDIR (id:${reqID})`);

    if (!sftp.emit('RMDIR', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.REALPATH]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed REALPATH packet');

    sftp._debug && sftp._debug(
      `SFTP: Inbound: Received REALPATH (id:${reqID})`
    );

    if (!sftp.emit('REALPATH', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.STAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed STAT packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received STAT (id:${reqID})`);

    if (!sftp.emit('STAT', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.RENAME]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     oldpath
      string     newpath
    */
    const oldPath = bufferParser.readString(true);
    const newPath = bufferParser.readString(true);
    bufferParser.clear();

    if (newPath === undefined)
      return doFatalSFTPError(sftp, 'Malformed RENAME packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received RENAME (id:${reqID})`);

    if (!sftp.emit('RENAME', reqID, oldPath, newPath)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.READLINK]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed READLINK packet');

    sftp._debug && sftp._debug(
      `SFTP: Inbound: Received READLINK (id:${reqID})`
    );

    if (!sftp.emit('READLINK', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.SYMLINK]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     linkpath
      string     targetpath
    */
    const linkPath = bufferParser.readString(true);
    const targetPath = bufferParser.readString(true);
    bufferParser.clear();

    if (targetPath === undefined)
      return doFatalSFTPError(sftp, 'Malformed SYMLINK packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received SYMLINK (id:${reqID})`);

    let handled;
    if (sftp._isOpenSSH) {
      // OpenSSH has linkpath and targetpath positions switched
      handled = sftp.emit('SYMLINK', reqID, targetPath, linkPath);
    } else {
      handled = sftp.emit('SYMLINK', reqID, linkPath, targetPath);
    }
    if (!handled) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.EXTENDED]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     extended-request
      ... any request-specific data ...
    */
    const extName = bufferParser.readString(true);
    if (extName === undefined) {
      bufferParser.clear();
      return doFatalSFTPError(sftp, 'Malformed EXTENDED packet');
    }

    let extData;
    if (bufferParser.avail())
      extData = bufferParser.readRaw();
    bufferParser.clear();

    sftp._debug && sftp._debug(
      `SFTP: Inbound: Received EXTENDED (id:${reqID})`
    );

    if (!sftp.emit('EXTENDED', reqID, extName, extData)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
};

// =============================================================================
// ReadStream/WriteStream-related ==============================================
// =============================================================================
const {
  ERR_INVALID_ARG_TYPE,
  ERR_OUT_OF_RANGE,
  validateNumber
} = __nccwpck_require__(7609);

const kMinPoolSpace = 128;

let pool;
// It can happen that we expect to read a large chunk of data, and reserve
// a large chunk of the pool accordingly, but the read() call only filled
// a portion of it. If a concurrently executing read() then uses the same pool,
// the "reserved" portion cannot be used, so we allow it to be re-used as a
// new pool later.
const poolFragments = [];

function allocNewPool(poolSize) {
  if (poolFragments.length > 0)
    pool = poolFragments.pop();
  else
    pool = Buffer.allocUnsafe(poolSize);
  pool.used = 0;
}

// Check the `this.start` and `this.end` of stream.
function checkPosition(pos, name) {
  if (!Number.isSafeInteger(pos)) {
    validateNumber(pos, name);
    if (!Number.isInteger(pos))
      throw new ERR_OUT_OF_RANGE(name, 'an integer', pos);
    throw new ERR_OUT_OF_RANGE(name, '>= 0 and <= 2 ** 53 - 1', pos);
  }
  if (pos < 0)
    throw new ERR_OUT_OF_RANGE(name, '>= 0 and <= 2 ** 53 - 1', pos);
}

function roundUpToMultipleOf8(n) {
  return (n + 7) & ~7;  // Align to 8 byte boundary.
}

function ReadStream(sftp, path, options) {
  if (options === undefined)
    options = {};
  else if (typeof options === 'string')
    options = { encoding: options };
  else if (options === null || typeof options !== 'object')
    throw new TypeError('"options" argument must be a string or an object');
  else
    options = Object.create(options);

  // A little bit bigger buffer and water marks by default
  if (options.highWaterMark === undefined)
    options.highWaterMark = 64 * 1024;

  // For backwards compat do not emit close on destroy.
  options.emitClose = false;
  options.autoDestroy = false; // Node 14 major change.

  ReadableStream.call(this, options);

  this.path = path;
  this.flags = options.flags === undefined ? 'r' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.end = options.end;
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;
  this.pos = 0;
  this.bytesRead = 0;
  this.closed = false;

  this.handle = options.handle === undefined ? null : options.handle;
  this.sftp = sftp;
  this._opening = false;

  if (this.start !== undefined) {
    checkPosition(this.start, 'start');

    this.pos = this.start;
  }

  if (this.end === undefined) {
    this.end = Infinity;
  } else if (this.end !== Infinity) {
    checkPosition(this.end, 'end');

    if (this.start !== undefined && this.start > this.end) {
      throw new ERR_OUT_OF_RANGE(
        'start',
        `<= "end" (here: ${this.end})`,
        this.start
      );
    }
  }

  this.on('end', function() {
    if (this.autoClose)
      this.destroy();
  });

  if (!Buffer.isBuffer(this.handle))
    this.open();
}
inherits(ReadStream, ReadableStream);

ReadStream.prototype.open = function() {
  if (this._opening)
    return;

  this._opening = true;

  this.sftp.open(this.path, this.flags, this.mode, (er, handle) => {
    this._opening = false;

    if (er) {
      this.emit('error', er);
      if (this.autoClose)
        this.destroy();
      return;
    }

    this.handle = handle;
    this.emit('open', handle);
    this.emit('ready');
    // Start the flow of data.
    this.read();
  });
};

ReadStream.prototype._read = function(n) {
  if (!Buffer.isBuffer(this.handle))
    return this.once('open', () => this._read(n));

  // XXX: safe to remove this?
  if (this.destroyed)
    return;

  if (!pool || pool.length - pool.used < kMinPoolSpace) {
    // Discard the old pool.
    allocNewPool(this.readableHighWaterMark
                 || this._readableState.highWaterMark);
  }

  // Grab another reference to the pool in the case that while we're
  // in the thread pool another read() finishes up the pool, and
  // allocates a new one.
  const thisPool = pool;
  let toRead = Math.min(pool.length - pool.used, n);
  const start = pool.used;

  if (this.end !== undefined)
    toRead = Math.min(this.end - this.pos + 1, toRead);

  // Already read everything we were supposed to read!
  // treat as EOF.
  if (toRead <= 0)
    return this.push(null);

  // the actual read.
  this.sftp.read(this.handle,
                 pool,
                 pool.used,
                 toRead,
                 this.pos,
                 (er, bytesRead) => {
    if (er) {
      this.emit('error', er);
      if (this.autoClose)
        this.destroy();
      return;
    }
    let b = null;

    // Now that we know how much data we have actually read, re-wind the
    // 'used' field if we can, and otherwise allow the remainder of our
    // reservation to be used as a new pool later.
    if (start + toRead === thisPool.used && thisPool === pool) {
      thisPool.used = roundUpToMultipleOf8(thisPool.used + bytesRead - toRead);
    } else {
      // Round down to the next lowest multiple of 8 to ensure the new pool
      // fragment start and end positions are aligned to an 8 byte boundary.
      const alignedEnd = (start + toRead) & ~7;
      const alignedStart = roundUpToMultipleOf8(start + bytesRead);
      if (alignedEnd - alignedStart >= kMinPoolSpace)
        poolFragments.push(thisPool.slice(alignedStart, alignedEnd));
    }

    if (bytesRead > 0) {
      this.bytesRead += bytesRead;
      b = thisPool.slice(start, start + bytesRead);
    }

    // Move the pool positions, and internal position for reading.
    this.pos += bytesRead;

    this.push(b);
  });

  pool.used = roundUpToMultipleOf8(pool.used + toRead);
};

ReadStream.prototype._destroy = function(err, cb) {
  if (this._opening && !Buffer.isBuffer(this.handle)) {
    this.once('open', closeStream.bind(null, this, cb, err));
    return;
  }

  closeStream(this, cb, err);
  this.handle = null;
  this._opening = false;
};

function closeStream(stream, cb, err) {
  if (!stream.handle)
    return onclose();

  stream.sftp.close(stream.handle, onclose);

  function onclose(er) {
    er = er || err;
    cb(er);
    stream.closed = true;
    if (!er)
      stream.emit('close');
  }
}

ReadStream.prototype.close = function(cb) {
  this.destroy(null, cb);
};

Object.defineProperty(ReadStream.prototype, 'pending', {
  get() {
    return this.handle === null;
  },
  configurable: true
});

// TODO: add `concurrency` setting to allow more than one in-flight WRITE
// request to server to improve throughput
function WriteStream(sftp, path, options) {
  if (options === undefined)
    options = {};
  else if (typeof options === 'string')
    options = { encoding: options };
  else if (options === null || typeof options !== 'object')
    throw new TypeError('"options" argument must be a string or an object');
  else
    options = Object.create(options);

  // For backwards compat do not emit close on destroy.
  options.emitClose = false;
  options.autoDestroy = false; // Node 14 major change.

  WritableStream.call(this, options);

  this.path = path;
  this.flags = options.flags === undefined ? 'w' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;
  this.pos = 0;
  this.bytesWritten = 0;
  this.closed = false;

  this.handle = options.handle === undefined ? null : options.handle;
  this.sftp = sftp;
  this._opening = false;

  if (this.start !== undefined) {
    checkPosition(this.start, 'start');

    this.pos = this.start;
  }

  if (options.encoding)
    this.setDefaultEncoding(options.encoding);

  // Node v6.x only
  this.on('finish', function() {
    if (this._writableState.finalCalled)
      return;
    if (this.autoClose)
      this.destroy();
  });

  if (!Buffer.isBuffer(this.handle))
    this.open();
}
inherits(WriteStream, WritableStream);

WriteStream.prototype._final = function(cb) {
  if (this.autoClose)
    this.destroy();
  cb();
};

WriteStream.prototype.open = function() {
  if (this._opening)
    return;

  this._opening = true;

  this.sftp.open(this.path, this.flags, this.mode, (er, handle) => {
    this._opening = false;

    if (er) {
      this.emit('error', er);
      if (this.autoClose)
        this.destroy();
      return;
    }

    this.handle = handle;

    const tryAgain = (err) => {
      if (err) {
        // Try chmod() for sftp servers that may not support fchmod() for
        // whatever reason
        this.sftp.chmod(this.path, this.mode, (err_) => tryAgain());
        return;
      }

      // SFTPv3 requires absolute offsets, no matter the open flag used
      if (this.flags[0] === 'a') {
        const tryStat = (err, st) => {
          if (err) {
            // Try stat() for sftp servers that may not support fstat() for
            // whatever reason
            this.sftp.stat(this.path, (err_, st_) => {
              if (err_) {
                this.destroy();
                this.emit('error', err);
                return;
              }
              tryStat(null, st_);
            });
            return;
          }

          this.pos = st.size;
          this.emit('open', handle);
          this.emit('ready');
        };

        this.sftp.fstat(handle, tryStat);
        return;
      }

      this.emit('open', handle);
      this.emit('ready');
    };

    this.sftp.fchmod(handle, this.mode, tryAgain);
  });
};

WriteStream.prototype._write = function(data, encoding, cb) {
  if (!Buffer.isBuffer(data)) {
    const err = new ERR_INVALID_ARG_TYPE('data', 'Buffer', data);
    return this.emit('error', err);
  }

  if (!Buffer.isBuffer(this.handle)) {
    return this.once('open', function() {
      this._write(data, encoding, cb);
    });
  }

  this.sftp.write(this.handle,
                  data,
                  0,
                  data.length,
                  this.pos,
                  (er, bytes) => {
    if (er) {
      if (this.autoClose)
        this.destroy();
      return cb(er);
    }
    this.bytesWritten += bytes;
    cb();
  });

  this.pos += data.length;
};

WriteStream.prototype._writev = function(data, cb) {
  if (!Buffer.isBuffer(this.handle)) {
    return this.once('open', function() {
      this._writev(data, cb);
    });
  }

  const sftp = this.sftp;
  const handle = this.handle;
  let writesLeft = data.length;

  const onwrite = (er, bytes) => {
    if (er) {
      this.destroy();
      return cb(er);
    }
    this.bytesWritten += bytes;
    if (--writesLeft === 0)
      cb();
  };

  // TODO: try to combine chunks to reduce number of requests to the server?
  for (let i = 0; i < data.length; ++i) {
    const chunk = data[i].chunk;

    sftp.write(handle, chunk, 0, chunk.length, this.pos, onwrite);
    this.pos += chunk.length;
  }
};

if (typeof WritableStream.prototype.destroy !== 'function')
  WriteStream.prototype.destroy = ReadStream.prototype.destroy;

WriteStream.prototype._destroy = ReadStream.prototype._destroy;
WriteStream.prototype.close = function(cb) {
  if (cb) {
    if (this.closed) {
      process.nextTick(cb);
      return;
    }
    this.on('close', cb);
  }

  // If we are not autoClosing, we should call
  // destroy on 'finish'.
  if (!this.autoClose)
    this.on('finish', this.destroy.bind(this));

  this.end();
};

// There is no shutdown() for files.
WriteStream.prototype.destroySoon = WriteStream.prototype.end;

Object.defineProperty(WriteStream.prototype, 'pending', {
  get() {
    return this.handle === null;
  },
  configurable: true
});
// =============================================================================

module.exports = {
  flagsToString,
  OPEN_MODE,
  SFTP,
  Stats,
  STATUS_CODE,
  stringToFlags,
};


/***/ }),

/***/ 6832:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const crypto = __nccwpck_require__(6417);

let cpuInfo;
try {
  cpuInfo = __nccwpck_require__(7295)();
} catch {}

const { bindingAvailable } = __nccwpck_require__(5708);

const eddsaSupported = (() => {
  if (typeof crypto.sign === 'function'
      && typeof crypto.verify === 'function') {
    const key =
      '-----BEGIN PRIVATE KEY-----\r\nMC4CAQAwBQYDK2VwBCIEIHKj+sVa9WcD'
      + '/q2DJUJaf43Kptc8xYuUQA4bOFj9vC8T\r\n-----END PRIVATE KEY-----';
    const data = Buffer.from('a');
    let sig;
    let verified;
    try {
      sig = crypto.sign(null, data, key);
      verified = crypto.verify(null, data, key, sig);
    } catch {}
    return (Buffer.isBuffer(sig) && sig.length === 64 && verified === true);
  }

  return false;
})();

const curve25519Supported = (typeof crypto.diffieHellman === 'function'
                             && typeof crypto.generateKeyPairSync === 'function'
                             && typeof crypto.createPublicKey === 'function');

const DEFAULT_KEX = [
  // https://tools.ietf.org/html/rfc5656#section-10.1
  'ecdh-sha2-nistp256',
  'ecdh-sha2-nistp384',
  'ecdh-sha2-nistp521',

  // https://tools.ietf.org/html/rfc4419#section-4
  'diffie-hellman-group-exchange-sha256',

  // https://tools.ietf.org/html/rfc8268
  'diffie-hellman-group14-sha256',
  'diffie-hellman-group15-sha512',
  'diffie-hellman-group16-sha512',
  'diffie-hellman-group17-sha512',
  'diffie-hellman-group18-sha512',
];
if (curve25519Supported) {
  DEFAULT_KEX.unshift('curve25519-sha256');
  DEFAULT_KEX.unshift('curve25519-sha256@libssh.org');
}
const SUPPORTED_KEX = DEFAULT_KEX.concat([
  // https://tools.ietf.org/html/rfc4419#section-4
  'diffie-hellman-group-exchange-sha1',

  'diffie-hellman-group14-sha1', // REQUIRED
  'diffie-hellman-group1-sha1',  // REQUIRED
]);


const DEFAULT_SERVER_HOST_KEY = [
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
  'rsa-sha2-512', // RFC 8332
  'rsa-sha2-256', // RFC 8332
  'ssh-rsa',
];
if (eddsaSupported)
  DEFAULT_SERVER_HOST_KEY.unshift('ssh-ed25519');
const SUPPORTED_SERVER_HOST_KEY = DEFAULT_SERVER_HOST_KEY.concat([
  'ssh-dss',
]);


const DEFAULT_CIPHER = [
  // http://tools.ietf.org/html/rfc5647
  'aes128-gcm',
  'aes128-gcm@openssh.com',
  'aes256-gcm',
  'aes256-gcm@openssh.com',

  // http://tools.ietf.org/html/rfc4344#section-4
  'aes128-ctr',
  'aes192-ctr',
  'aes256-ctr',
];
if (cpuInfo && cpuInfo.flags && !cpuInfo.flags.aes) {
  // We know for sure the CPU does not support AES acceleration
  if (bindingAvailable)
    DEFAULT_CIPHER.unshift('chacha20-poly1305@openssh.com');
  else
    DEFAULT_CIPHER.push('chacha20-poly1305@openssh.com');
} else if (bindingAvailable && cpuInfo && cpuInfo.arch === 'x86') {
  // Places chacha20-poly1305 immediately after GCM ciphers since GCM ciphers
  // seem to outperform it on x86, but it seems to be faster than CTR ciphers
  DEFAULT_CIPHER.splice(4, 0, 'chacha20-poly1305@openssh.com');
} else {
  DEFAULT_CIPHER.push('chacha20-poly1305@openssh.com');
}
const SUPPORTED_CIPHER = DEFAULT_CIPHER.concat([
  'aes256-cbc',
  'aes192-cbc',
  'aes128-cbc',
  'blowfish-cbc',
  '3des-cbc',

  // http://tools.ietf.org/html/rfc4345#section-4:
  'arcfour256',
  'arcfour128',

  'cast128-cbc',
  'arcfour',
]);


const DEFAULT_MAC = [
  'hmac-sha2-256-etm@openssh.com',
  'hmac-sha2-512-etm@openssh.com',
  'hmac-sha1-etm@openssh.com',
  'hmac-sha2-256',
  'hmac-sha2-512',
  'hmac-sha1',
];
const SUPPORTED_MAC = DEFAULT_MAC.concat([
  'hmac-md5',
  'hmac-sha2-256-96', // first 96 bits of HMAC-SHA256
  'hmac-sha2-512-96', // first 96 bits of HMAC-SHA512
  'hmac-ripemd160',
  'hmac-sha1-96',     // first 96 bits of HMAC-SHA1
  'hmac-md5-96',      // first 96 bits of HMAC-MD5
]);

const DEFAULT_COMPRESSION = [
  'none',
  'zlib@openssh.com', // ZLIB (LZ77) compression, except
                      // compression/decompression does not start until after
                      // successful user authentication
  'zlib',             // ZLIB (LZ77) compression
];
const SUPPORTED_COMPRESSION = DEFAULT_COMPRESSION.concat([
]);


const COMPAT = {
  BAD_DHGEX: 1 << 0,
  OLD_EXIT: 1 << 1,
  DYN_RPORT_BUG: 1 << 2,
  BUG_DHGEX_LARGE: 1 << 3,
};

module.exports = {
  MESSAGE: {
    // Transport layer protocol -- generic (1-19)
    DISCONNECT: 1,
    IGNORE: 2,
    UNIMPLEMENTED: 3,
    DEBUG: 4,
    SERVICE_REQUEST: 5,
    SERVICE_ACCEPT: 6,

    // Transport layer protocol -- algorithm negotiation (20-29)
    KEXINIT: 20,
    NEWKEYS: 21,

    // Transport layer protocol -- key exchange method-specific (30-49)
    KEXDH_INIT: 30,
    KEXDH_REPLY: 31,

    KEXDH_GEX_GROUP: 31,
    KEXDH_GEX_INIT: 32,
    KEXDH_GEX_REPLY: 33,
    KEXDH_GEX_REQUEST: 34,

    KEXECDH_INIT: 30,
    KEXECDH_REPLY: 31,

    // User auth protocol -- generic (50-59)
    USERAUTH_REQUEST: 50,
    USERAUTH_FAILURE: 51,
    USERAUTH_SUCCESS: 52,
    USERAUTH_BANNER: 53,

    // User auth protocol -- user auth method-specific (60-79)
    USERAUTH_PASSWD_CHANGEREQ: 60,

    USERAUTH_PK_OK: 60,

    USERAUTH_INFO_REQUEST: 60,
    USERAUTH_INFO_RESPONSE: 61,

    // Connection protocol -- generic (80-89)
    GLOBAL_REQUEST: 80,
    REQUEST_SUCCESS: 81,
    REQUEST_FAILURE: 82,

    // Connection protocol -- channel-related (90-127)
    CHANNEL_OPEN: 90,
    CHANNEL_OPEN_CONFIRMATION: 91,
    CHANNEL_OPEN_FAILURE: 92,
    CHANNEL_WINDOW_ADJUST: 93,
    CHANNEL_DATA: 94,
    CHANNEL_EXTENDED_DATA: 95,
    CHANNEL_EOF: 96,
    CHANNEL_CLOSE: 97,
    CHANNEL_REQUEST: 98,
    CHANNEL_SUCCESS: 99,
    CHANNEL_FAILURE: 100

    // Reserved for client protocols (128-191)

    // Local extensions (192-155)
  },
  DISCONNECT_REASON: {
    HOST_NOT_ALLOWED_TO_CONNECT: 1,
    PROTOCOL_ERROR: 2,
    KEY_EXCHANGE_FAILED: 3,
    RESERVED: 4,
    MAC_ERROR: 5,
    COMPRESSION_ERROR: 6,
    SERVICE_NOT_AVAILABLE: 7,
    PROTOCOL_VERSION_NOT_SUPPORTED: 8,
    HOST_KEY_NOT_VERIFIABLE: 9,
    CONNECTION_LOST: 10,
    BY_APPLICATION: 11,
    TOO_MANY_CONNECTIONS: 12,
    AUTH_CANCELED_BY_USER: 13,
    NO_MORE_AUTH_METHODS_AVAILABLE: 14,
    ILLEGAL_USER_NAME: 15,
  },
  DISCONNECT_REASON_STR: undefined,
  CHANNEL_OPEN_FAILURE: {
    ADMINISTRATIVELY_PROHIBITED: 1,
    CONNECT_FAILED: 2,
    UNKNOWN_CHANNEL_TYPE: 3,
    RESOURCE_SHORTAGE: 4
  },
  TERMINAL_MODE: {
    TTY_OP_END: 0,        // Indicates end of options.
    VINTR: 1,             // Interrupt character; 255 if none. Similarly for the
                          //  other characters.  Not all of these characters are
                          //  supported on all systems.
    VQUIT: 2,             // The quit character (sends SIGQUIT signal on POSIX
                          //  systems).
    VERASE: 3,            // Erase the character to left of the cursor.
    VKILL: 4,             // Kill the current input line.
    VEOF: 5,              // End-of-file character (sends EOF from the
                          //  terminal).
    VEOL: 6,              // End-of-line character in addition to carriage
                          //  return and/or linefeed.
    VEOL2: 7,             // Additional end-of-line character.
    VSTART: 8,            // Continues paused output (normally control-Q).
    VSTOP: 9,             // Pauses output (normally control-S).
    VSUSP: 10,            // Suspends the current program.
    VDSUSP: 11,           // Another suspend character.
    VREPRINT: 12,         // Reprints the current input line.
    VWERASE: 13,          // Erases a word left of cursor.
    VLNEXT: 14,           // Enter the next character typed literally, even if
                          //  it is a special character
    VFLUSH: 15,           // Character to flush output.
    VSWTCH: 16,           // Switch to a different shell layer.
    VSTATUS: 17,          // Prints system status line (load, command, pid,
                          //  etc).
    VDISCARD: 18,         // Toggles the flushing of terminal output.
    IGNPAR: 30,           // The ignore parity flag.  The parameter SHOULD be 0
                          //  if this flag is FALSE, and 1 if it is TRUE.
    PARMRK: 31,           // Mark parity and framing errors.
    INPCK: 32,            // Enable checking of parity errors.
    ISTRIP: 33,           // Strip 8th bit off characters.
    INLCR: 34,            // Map NL into CR on input.
    IGNCR: 35,            // Ignore CR on input.
    ICRNL: 36,            // Map CR to NL on input.
    IUCLC: 37,            // Translate uppercase characters to lowercase.
    IXON: 38,             // Enable output flow control.
    IXANY: 39,            // Any char will restart after stop.
    IXOFF: 40,            // Enable input flow control.
    IMAXBEL: 41,          // Ring bell on input queue full.
    ISIG: 50,             // Enable signals INTR, QUIT, [D]SUSP.
    ICANON: 51,           // Canonicalize input lines.
    XCASE: 52,            // Enable input and output of uppercase characters by
                          //  preceding their lowercase equivalents with "\".
    ECHO: 53,             // Enable echoing.
    ECHOE: 54,            // Visually erase chars.
    ECHOK: 55,            // Kill character discards current line.
    ECHONL: 56,           // Echo NL even if ECHO is off.
    NOFLSH: 57,           // Don't flush after interrupt.
    TOSTOP: 58,           // Stop background jobs from output.
    IEXTEN: 59,           // Enable extensions.
    ECHOCTL: 60,          // Echo control characters as ^(Char).
    ECHOKE: 61,           // Visual erase for line kill.
    PENDIN: 62,           // Retype pending input.
    OPOST: 70,            // Enable output processing.
    OLCUC: 71,            // Convert lowercase to uppercase.
    ONLCR: 72,            // Map NL to CR-NL.
    OCRNL: 73,            // Translate carriage return to newline (output).
    ONOCR: 74,            // Translate newline to carriage return-newline
                          //  (output).
    ONLRET: 75,           // Newline performs a carriage return (output).
    CS7: 90,              // 7 bit mode.
    CS8: 91,              // 8 bit mode.
    PARENB: 92,           // Parity enable.
    PARODD: 93,           // Odd parity, else even.
    TTY_OP_ISPEED: 128,   // Specifies the input baud rate in bits per second.
    TTY_OP_OSPEED: 129,   // Specifies the output baud rate in bits per second.
  },
  CHANNEL_EXTENDED_DATATYPE: {
    STDERR: 1,
  },

  SIGNALS: [
    'ABRT', 'ALRM', 'FPE', 'HUP', 'ILL', 'INT', 'QUIT', 'SEGV', 'TERM', 'USR1',
    'USR2', 'KILL', 'PIPE'
  ].reduce((cur, val) => ({ ...cur, [val]: 1 }), {}),

  COMPAT,
  COMPAT_CHECKS: [
    [ 'Cisco-1.25', COMPAT.BAD_DHGEX ],
    [ /^Cisco-1\./, COMPAT.BUG_DHGEX_LARGE ],
    [ /^[0-9.]+$/, COMPAT.OLD_EXIT ], // old SSH.com implementations
    [ /^OpenSSH_5\.\d+/, COMPAT.DYN_RPORT_BUG ],
  ],

  // KEX proposal-related
  DEFAULT_KEX,
  SUPPORTED_KEX,
  DEFAULT_SERVER_HOST_KEY,
  SUPPORTED_SERVER_HOST_KEY,
  DEFAULT_CIPHER,
  SUPPORTED_CIPHER,
  DEFAULT_MAC,
  SUPPORTED_MAC,
  DEFAULT_COMPRESSION,
  SUPPORTED_COMPRESSION,

  curve25519Supported,
  eddsaSupported,
};

module.exports.DISCONNECT_REASON_BY_VALUE =
  Array.from(Object.entries(module.exports.DISCONNECT_REASON))
       .reduce((obj, [key, value]) => ({ ...obj, [value]: key }), {});


/***/ }),

/***/ 5708:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// TODO:
//    * make max packet size configurable
//    * if decompression is enabled, use `._packet` in decipher instances as
//      input to (sync) zlib inflater with appropriate offset and length to
//      avoid an additional copy of payload data before inflation
//    * factor decompression status into packet length checks


const {
  createCipheriv, createDecipheriv, createHmac, randomFillSync, timingSafeEqual
} = __nccwpck_require__(6417);

const { readUInt32BE, writeUInt32BE } = __nccwpck_require__(9475);

const FastBuffer = Buffer[Symbol.species];
const MAX_SEQNO = 2 ** 32 - 1;
const EMPTY_BUFFER = Buffer.alloc(0);
const BUF_INT = Buffer.alloc(4);
const DISCARD_CACHE = new Map();
const MAX_PACKET_SIZE = 35000;

let binding;
let AESGCMCipher;
let ChaChaPolyCipher;
let GenericCipher;
let AESGCMDecipher;
let ChaChaPolyDecipher;
let GenericDecipher;
try {
  binding = __nccwpck_require__(9041);
  ({ AESGCMCipher, ChaChaPolyCipher, GenericCipher,
     AESGCMDecipher, ChaChaPolyDecipher, GenericDecipher } = binding);
} catch {}

const CIPHER_STREAM = 1 << 0;
const CIPHER_INFO = (() => {
  function info(sslName, blockLen, keyLen, ivLen, authLen, discardLen, flags) {
    return {
      sslName,
      blockLen,
      keyLen,
      ivLen: (ivLen !== 0 || (flags & CIPHER_STREAM)
              ? ivLen
              : blockLen),
      authLen,
      discardLen,
      stream: !!(flags & CIPHER_STREAM),
    };
  }

  return {
    'chacha20-poly1305@openssh.com':
      info('chacha20', 8, 64, 0, 16, 0, CIPHER_STREAM),

    'aes128-gcm': info('aes-128-gcm', 16, 16, 12, 16, 0, CIPHER_STREAM),
    'aes256-gcm': info('aes-256-gcm', 16, 32, 12, 16, 0, CIPHER_STREAM),
    'aes128-gcm@openssh.com':
      info('aes-128-gcm', 16, 16, 12, 16, 0, CIPHER_STREAM),
    'aes256-gcm@openssh.com':
      info('aes-256-gcm', 16, 32, 12, 16, 0, CIPHER_STREAM),

    'aes128-cbc': info('aes-128-cbc', 16, 16, 0, 0, 0, 0),
    'aes192-cbc': info('aes-192-cbc', 16, 24, 0, 0, 0, 0),
    'aes256-cbc': info('aes-256-cbc', 16, 32, 0, 0, 0, 0),
    'rijndael-cbc@lysator.liu.se': info('aes-256-cbc', 16, 32, 0, 0, 0, 0),
    '3des-cbc': info('des-ede3-cbc', 8, 24, 0, 0, 0, 0),
    'blowfish-cbc': info('bf-cbc', 8, 16, 0, 0, 0, 0),
    'idea-cbc': info('idea-cbc', 8, 16, 0, 0, 0, 0),
    'cast128-cbc': info('cast-cbc', 8, 16, 0, 0, 0, 0),

    'aes128-ctr': info('aes-128-ctr', 16, 16, 16, 0, 0, CIPHER_STREAM),
    'aes192-ctr': info('aes-192-ctr', 16, 24, 16, 0, 0, CIPHER_STREAM),
    'aes256-ctr': info('aes-256-ctr', 16, 32, 16, 0, 0, CIPHER_STREAM),
    '3des-ctr': info('des-ede3', 8, 24, 8, 0, 0, CIPHER_STREAM),
    'blowfish-ctr': info('bf-ecb', 8, 16, 8, 0, 0, CIPHER_STREAM),
    'cast128-ctr': info('cast5-ecb', 8, 16, 8, 0, 0, CIPHER_STREAM),

    /* The "arcfour128" algorithm is the RC4 cipher, as described in
       [SCHNEIER], using a 128-bit key.  The first 1536 bytes of keystream
       generated by the cipher MUST be discarded, and the first byte of the
       first encrypted packet MUST be encrypted using the 1537th byte of
       keystream.

       -- http://tools.ietf.org/html/rfc4345#section-4 */
    'arcfour': info('rc4', 8, 16, 0, 0, 1536, CIPHER_STREAM),
    'arcfour128': info('rc4', 8, 16, 0, 0, 1536, CIPHER_STREAM),
    'arcfour256': info('rc4', 8, 32, 0, 0, 1536, CIPHER_STREAM),
    'arcfour512': info('rc4', 8, 64, 0, 0, 1536, CIPHER_STREAM),
  };
})();

const MAC_INFO = (() => {
  function info(sslName, len, actualLen, isETM) {
    return {
      sslName,
      len,
      actualLen,
      isETM,
    };
  }

  return {
    'hmac-md5': info('md5', 16, 16, false),
    'hmac-md5-96': info('md5', 16, 12, false),
    'hmac-ripemd160': info('ripemd160', 20, 20, false),
    'hmac-sha1': info('sha1', 20, 20, false),
    'hmac-sha1-etm@openssh.com': info('sha1', 20, 20, true),
    'hmac-sha1-96': info('sha1', 20, 12, false),
    'hmac-sha2-256': info('sha256', 32, 32, false),
    'hmac-sha2-256-etm@openssh.com': info('sha256', 32, 32, true),
    'hmac-sha2-256-96': info('sha256', 32, 12, false),
    'hmac-sha2-512': info('sha512', 64, 64, false),
    'hmac-sha2-512-etm@openssh.com': info('sha512', 64, 64, true),
    'hmac-sha2-512-96': info('sha512', 64, 12, false),
  };
})();


// Should only_be used during the initial handshake
class NullCipher {
  constructor(seqno, onWrite) {
    this.outSeqno = seqno;
    this._onWrite = onWrite;
    this._dead = false;
  }
  free() {
    this._dead = true;
  }
  allocPacket(payloadLen) {
    let pktLen = 4 + 1 + payloadLen;
    let padLen = 8 - (pktLen & (8 - 1));
    if (padLen < 4)
      padLen += 8;
    pktLen += padLen;

    const packet = Buffer.allocUnsafe(pktLen);

    writeUInt32BE(packet, pktLen - 4, 0);
    packet[4] = padLen;

    randomFillSync(packet, 5 + payloadLen, padLen);

    return packet;
  }
  encrypt(packet) {
    // `packet` === unencrypted packet

    if (this._dead)
      return;

    this._onWrite(packet);

    this.outSeqno = (this.outSeqno + 1) >>> 0;
  }
}


const POLY1305_ZEROS = Buffer.alloc(32);
const POLY1305_OUT_COMPUTE = Buffer.alloc(16);
let POLY1305_WASM_MODULE;
let POLY1305_RESULT_MALLOC;
let poly1305_auth;
class ChaChaPolyCipherNative {
  constructor(config) {
    const enc = config.outbound;
    this.outSeqno = enc.seqno;
    this._onWrite = enc.onWrite;
    this._encKeyMain = enc.cipherKey.slice(0, 32);
    this._encKeyPktLen = enc.cipherKey.slice(32);
    this._dead = false;
  }
  free() {
    this._dead = true;
  }
  allocPacket(payloadLen) {
    let pktLen = 4 + 1 + payloadLen;
    let padLen = 8 - ((pktLen - 4) & (8 - 1));
    if (padLen < 4)
      padLen += 8;
    pktLen += padLen;

    const packet = Buffer.allocUnsafe(pktLen);

    writeUInt32BE(packet, pktLen - 4, 0);
    packet[4] = padLen;

    randomFillSync(packet, 5 + payloadLen, padLen);

    return packet;
  }
  encrypt(packet) {
    // `packet` === unencrypted packet

    if (this._dead)
      return;

    // Generate Poly1305 key
    POLY1305_OUT_COMPUTE[0] = 0; // Set counter to 0 (little endian)
    writeUInt32BE(POLY1305_OUT_COMPUTE, this.outSeqno, 12);
    const polyKey =
      createCipheriv('chacha20', this._encKeyMain, POLY1305_OUT_COMPUTE)
      .update(POLY1305_ZEROS);

    // Encrypt packet length
    const pktLenEnc =
      createCipheriv('chacha20', this._encKeyPktLen, POLY1305_OUT_COMPUTE)
      .update(packet.slice(0, 4));
    this._onWrite(pktLenEnc);

    // Encrypt rest of packet
    POLY1305_OUT_COMPUTE[0] = 1; // Set counter to 1 (little endian)
    const payloadEnc =
      createCipheriv('chacha20', this._encKeyMain, POLY1305_OUT_COMPUTE)
      .update(packet.slice(4));
    this._onWrite(payloadEnc);

    // Calculate Poly1305 MAC
    poly1305_auth(POLY1305_RESULT_MALLOC,
                  pktLenEnc,
                  pktLenEnc.length,
                  payloadEnc,
                  payloadEnc.length,
                  polyKey);
    const mac = Buffer.allocUnsafe(16);
    mac.set(
      new Uint8Array(POLY1305_WASM_MODULE.HEAPU8.buffer,
                     POLY1305_RESULT_MALLOC,
                     16),
      0
    );
    this._onWrite(mac);

    this.outSeqno = (this.outSeqno + 1) >>> 0;
  }
}

class ChaChaPolyCipherBinding {
  constructor(config) {
    const enc = config.outbound;
    this.outSeqno = enc.seqno;
    this._onWrite = enc.onWrite;
    this._instance = new ChaChaPolyCipher(enc.cipherKey);
    this._dead = false;
  }
  free() {
    this._dead = true;
    this._instance.free();
  }
  allocPacket(payloadLen) {
    let pktLen = 4 + 1 + payloadLen;
    let padLen = 8 - ((pktLen - 4) & (8 - 1));
    if (padLen < 4)
      padLen += 8;
    pktLen += padLen;

    const packet = Buffer.allocUnsafe(pktLen + 16/* MAC */);

    writeUInt32BE(packet, pktLen - 4, 0);
    packet[4] = padLen;

    randomFillSync(packet, 5 + payloadLen, padLen);

    return packet;
  }
  encrypt(packet) {
    // `packet` === unencrypted packet

    if (this._dead)
      return;

    // Encrypts in-place
    this._instance.encrypt(packet, this.outSeqno);

    this._onWrite(packet);

    this.outSeqno = (this.outSeqno + 1) >>> 0;
  }
}


class AESGCMCipherNative {
  constructor(config) {
    const enc = config.outbound;
    this.outSeqno = enc.seqno;
    this._onWrite = enc.onWrite;
    this._encSSLName = enc.cipherInfo.sslName;
    this._encKey = enc.cipherKey;
    this._encIV = enc.cipherIV;
    this._dead = false;
  }
  free() {
    this._dead = true;
  }
  allocPacket(payloadLen) {
    let pktLen = 4 + 1 + payloadLen;
    let padLen = 16 - ((pktLen - 4) & (16 - 1));
    if (padLen < 4)
      padLen += 16;
    pktLen += padLen;

    const packet = Buffer.allocUnsafe(pktLen);

    writeUInt32BE(packet, pktLen - 4, 0);
    packet[4] = padLen;

    randomFillSync(packet, 5 + payloadLen, padLen);

    return packet;
  }
  encrypt(packet) {
    // `packet` === unencrypted packet

    if (this._dead)
      return;

    const cipher = createCipheriv(this._encSSLName, this._encKey, this._encIV);
    cipher.setAutoPadding(false);

    const lenData = packet.slice(0, 4);
    cipher.setAAD(lenData);
    this._onWrite(lenData);

    // Encrypt pad length, payload, and padding
    const encrypted = cipher.update(packet.slice(4));
    this._onWrite(encrypted);
    const final = cipher.final();
    // XXX: final.length === 0 always?
    if (final.length)
      this._onWrite(final);

    // Generate MAC
    const tag = cipher.getAuthTag();
    this._onWrite(tag);

    // Increment counter in IV by 1 for next packet
    ivIncrement(this._encIV);

    this.outSeqno = (this.outSeqno + 1) >>> 0;
  }
}

class AESGCMCipherBinding {
  constructor(config) {
    const enc = config.outbound;
    this.outSeqno = enc.seqno;
    this._onWrite = enc.onWrite;
    this._instance = new AESGCMCipher(enc.cipherInfo.sslName,
                                      enc.cipherKey,
                                      enc.cipherIV);
    this._dead = false;
  }
  free() {
    this._dead = true;
    this._instance.free();
  }
  allocPacket(payloadLen) {
    let pktLen = 4 + 1 + payloadLen;
    let padLen = 16 - ((pktLen - 4) & (16 - 1));
    if (padLen < 4)
      padLen += 16;
    pktLen += padLen;

    const packet = Buffer.allocUnsafe(pktLen + 16/* authTag */);

    writeUInt32BE(packet, pktLen - 4, 0);
    packet[4] = padLen;

    randomFillSync(packet, 5 + payloadLen, padLen);

    return packet;
  }
  encrypt(packet) {
    // `packet` === unencrypted packet

    if (this._dead)
      return;

    // Encrypts in-place
    this._instance.encrypt(packet);

    this._onWrite(packet);

    this.outSeqno = (this.outSeqno + 1) >>> 0;
  }
}


class GenericCipherNative {
  constructor(config) {
    const enc = config.outbound;
    this.outSeqno = enc.seqno;
    this._onWrite = enc.onWrite;
    this._encBlockLen = enc.cipherInfo.blockLen;
    this._cipherInstance = createCipheriv(enc.cipherInfo.sslName,
                                          enc.cipherKey,
                                          enc.cipherIV);
    this._macSSLName = enc.macInfo.sslName;
    this._macKey = enc.macKey;
    this._macActualLen = enc.macInfo.actualLen;
    this._macETM = enc.macInfo.isETM;
    this._aadLen = (this._macETM ? 4 : 0);
    this._dead = false;

    const discardLen = enc.cipherInfo.discardLen;
    if (discardLen) {
      let discard = DISCARD_CACHE.get(discardLen);
      if (discard === undefined) {
        discard = Buffer.alloc(discardLen);
        DISCARD_CACHE.set(discardLen, discard);
      }
      this._cipherInstance.update(discard);
    }
  }
  free() {
    this._dead = true;
  }
  allocPacket(payloadLen) {
    const blockLen = this._encBlockLen;

    let pktLen = 4 + 1 + payloadLen;
    let padLen = blockLen - ((pktLen - this._aadLen) & (blockLen - 1));
    if (padLen < 4)
      padLen += blockLen;
    pktLen += padLen;

    const packet = Buffer.allocUnsafe(pktLen);

    writeUInt32BE(packet, pktLen - 4, 0);
    packet[4] = padLen;

    randomFillSync(packet, 5 + payloadLen, padLen);

    return packet;
  }
  encrypt(packet) {
    // `packet` === unencrypted packet

    if (this._dead)
      return;

    let mac;
    if (this._macETM) {
      // Encrypt pad length, payload, and padding
      const lenBytes = new Uint8Array(packet.buffer, packet.byteOffset, 4);
      const encrypted = this._cipherInstance.update(
        new Uint8Array(packet.buffer,
                       packet.byteOffset + 4,
                       packet.length - 4)
      );

      this._onWrite(lenBytes);
      this._onWrite(encrypted);

      // TODO: look into storing seqno as 4-byte buffer and incrementing like we
      // do for AES-GCM IVs to avoid having to (re)write all 4 bytes every time
      mac = createHmac(this._macSSLName, this._macKey);
      writeUInt32BE(BUF_INT, this.outSeqno, 0);
      mac.update(BUF_INT);
      mac.update(lenBytes);
      mac.update(encrypted);
    } else {
      // Encrypt length field, pad length, payload, and padding
      const encrypted = this._cipherInstance.update(packet);
      this._onWrite(encrypted);

      // TODO: look into storing seqno as 4-byte buffer and incrementing like we
      // do for AES-GCM IVs to avoid having to (re)write all 4 bytes every time
      mac = createHmac(this._macSSLName, this._macKey);
      writeUInt32BE(BUF_INT, this.outSeqno, 0);
      mac.update(BUF_INT);
      mac.update(packet);
    }

    let digest = mac.digest();
    if (digest.length > this._macActualLen)
      digest = digest.slice(0, this._macActualLen);
    this._onWrite(digest);

    this.outSeqno = (this.outSeqno + 1) >>> 0;
  }
}

class GenericCipherBinding {
  constructor(config) {
    const enc = config.outbound;
    this.outSeqno = enc.seqno;
    this._onWrite = enc.onWrite;
    this._encBlockLen = enc.cipherInfo.blockLen;
    this._macLen = enc.macInfo.len;
    this._macActualLen = enc.macInfo.actualLen;
    this._aadLen = (enc.macInfo.isETM ? 4 : 0);
    this._instance = new GenericCipher(enc.cipherInfo.sslName,
                                       enc.cipherKey,
                                       enc.cipherIV,
                                       enc.macInfo.sslName,
                                       enc.macKey,
                                       enc.macInfo.isETM);
    this._dead = false;
  }
  free() {
    this._dead = true;
    this._instance.free();
  }
  allocPacket(payloadLen) {
    const blockLen = this._encBlockLen;

    let pktLen = 4 + 1 + payloadLen;
    let padLen = blockLen - ((pktLen - this._aadLen) & (blockLen - 1));
    if (padLen < 4)
      padLen += blockLen;
    pktLen += padLen;

    const packet = Buffer.allocUnsafe(pktLen + this._macLen);

    writeUInt32BE(packet, pktLen - 4, 0);
    packet[4] = padLen;

    randomFillSync(packet, 5 + payloadLen, padLen);

    return packet;
  }
  encrypt(packet) {
    // `packet` === unencrypted packet

    if (this._dead)
      return;

    // Encrypts in-place
    this._instance.encrypt(packet, this.outSeqno);

    if (this._macActualLen < this._macLen) {
      packet = new FastBuffer(packet.buffer,
                              packet.byteOffset,
                              (packet.length
                                - (this._macLen - this._macActualLen)));
    }
    this._onWrite(packet);

    this.outSeqno = (this.outSeqno + 1) >>> 0;
  }
}


class NullDecipher {
  constructor(seqno, onPayload) {
    this.inSeqno = seqno;
    this._onPayload = onPayload;
    this._len = 0;
    this._lenBytes = 0;
    this._packet = null;
    this._packetPos = 0;
  }
  free() {}
  decrypt(data, p, dataLen) {
    while (p < dataLen) {
      // Read packet length
      if (this._lenBytes < 4) {
        let nb = Math.min(4 - this._lenBytes, dataLen - p);

        this._lenBytes += nb;
        while (nb--)
          this._len = (this._len << 8) + data[p++];

        if (this._lenBytes < 4)
          return;

        if (this._len > MAX_PACKET_SIZE
            || this._len < 8
            || (4 + this._len & 7) !== 0) {
          throw new Error('Bad packet length');
        }
        if (p >= dataLen)
          return;
      }

      // Read padding length, payload, and padding
      if (this._packetPos < this._len) {
        const nb = Math.min(this._len - this._packetPos, dataLen - p);
        if (p !== 0 || nb !== dataLen) {
          if (nb === this._len) {
            this._packet = new FastBuffer(data.buffer, data.byteOffset + p, nb);
          } else {
            this._packet = Buffer.allocUnsafe(this._len);
            this._packet.set(
              new Uint8Array(data.buffer, data.byteOffset + p, nb),
              this._packetPos
            );
          }
        } else if (nb === this._len) {
          this._packet = data;
        } else {
          if (!this._packet)
            this._packet = Buffer.allocUnsafe(this._len);
          this._packet.set(data, this._packetPos);
        }
        p += nb;
        this._packetPos += nb;
        if (this._packetPos < this._len)
          return;
      }

      const payload = (!this._packet
                       ? EMPTY_BUFFER
                       : new FastBuffer(this._packet.buffer,
                                        this._packet.byteOffset + 1,
                                        this._packet.length
                                          - this._packet[0] - 1));

      // Prepare for next packet
      this.inSeqno = (this.inSeqno + 1) >>> 0;
      this._len = 0;
      this._lenBytes = 0;
      this._packet = null;
      this._packetPos = 0;

      {
        const ret = this._onPayload(payload);
        if (ret !== undefined)
          return (ret === false ? p : ret);
      }
    }
  }
}

class ChaChaPolyDecipherNative {
  constructor(config) {
    const dec = config.inbound;
    this.inSeqno = dec.seqno;
    this._onPayload = dec.onPayload;
    this._decKeyMain = dec.decipherKey.slice(0, 32);
    this._decKeyPktLen = dec.decipherKey.slice(32);
    this._len = 0;
    this._lenBuf = Buffer.alloc(4);
    this._lenPos = 0;
    this._packet = null;
    this._pktLen = 0;
    this._mac = Buffer.allocUnsafe(16);
    this._calcMac = Buffer.allocUnsafe(16);
    this._macPos = 0;
  }
  free() {}
  decrypt(data, p, dataLen) {
    // `data` === encrypted data

    while (p < dataLen) {
      // Read packet length
      if (this._lenPos < 4) {
        let nb = Math.min(4 - this._lenPos, dataLen - p);
        while (nb--)
          this._lenBuf[this._lenPos++] = data[p++];
        if (this._lenPos < 4)
          return;

        POLY1305_OUT_COMPUTE[0] = 0; // Set counter to 0 (little endian)
        writeUInt32BE(POLY1305_OUT_COMPUTE, this.inSeqno, 12);

        const decLenBytes =
          createDecipheriv('chacha20', this._decKeyPktLen, POLY1305_OUT_COMPUTE)
          .update(this._lenBuf);
        this._len = readUInt32BE(decLenBytes, 0);

        if (this._len > MAX_PACKET_SIZE
            || this._len < 8
            || (this._len & 7) !== 0) {
          throw new Error('Bad packet length');
        }
      }

      // Read padding length, payload, and padding
      if (this._pktLen < this._len) {
        if (p >= dataLen)
          return;
        const nb = Math.min(this._len - this._pktLen, dataLen - p);
        let encrypted;
        if (p !== 0 || nb !== dataLen)
          encrypted = new Uint8Array(data.buffer, data.byteOffset + p, nb);
        else
          encrypted = data;
        if (nb === this._len) {
          this._packet = encrypted;
        } else {
          if (!this._packet)
            this._packet = Buffer.allocUnsafe(this._len);
          this._packet.set(encrypted, this._pktLen);
        }
        p += nb;
        this._pktLen += nb;
        if (this._pktLen < this._len || p >= dataLen)
          return;
      }

      // Read Poly1305 MAC
      {
        const nb = Math.min(16 - this._macPos, dataLen - p);
        // TODO: avoid copying if entire MAC is in current chunk
        if (p !== 0 || nb !== dataLen) {
          this._mac.set(
            new Uint8Array(data.buffer, data.byteOffset + p, nb),
            this._macPos
          );
        } else {
          this._mac.set(data, this._macPos);
        }
        p += nb;
        this._macPos += nb;
        if (this._macPos < 16)
          return;
      }

      // Generate Poly1305 key
      POLY1305_OUT_COMPUTE[0] = 0; // Set counter to 0 (little endian)
      writeUInt32BE(POLY1305_OUT_COMPUTE, this.inSeqno, 12);
      const polyKey =
        createCipheriv('chacha20', this._decKeyMain, POLY1305_OUT_COMPUTE)
        .update(POLY1305_ZEROS);

      // Calculate and compare Poly1305 MACs
      poly1305_auth(POLY1305_RESULT_MALLOC,
                    this._lenBuf,
                    4,
                    this._packet,
                    this._packet.length,
                    polyKey);

      this._calcMac.set(
        new Uint8Array(POLY1305_WASM_MODULE.HEAPU8.buffer,
                       POLY1305_RESULT_MALLOC,
                       16),
        0
      );
      if (!timingSafeEqual(this._calcMac, this._mac))
        throw new Error('Invalid MAC');

      // Decrypt packet
      POLY1305_OUT_COMPUTE[0] = 1; // Set counter to 1 (little endian)
      const packet =
        createDecipheriv('chacha20', this._decKeyMain, POLY1305_OUT_COMPUTE)
        .update(this._packet);

      const payload = new FastBuffer(packet.buffer,
                                     packet.byteOffset + 1,
                                     packet.length - packet[0] - 1);

      // Prepare for next packet
      this.inSeqno = (this.inSeqno + 1) >>> 0;
      this._len = 0;
      this._lenPos = 0;
      this._packet = null;
      this._pktLen = 0;
      this._macPos = 0;

      {
        const ret = this._onPayload(payload);
        if (ret !== undefined)
          return (ret === false ? p : ret);
      }
    }
  }
}

class ChaChaPolyDecipherBinding {
  constructor(config) {
    const dec = config.inbound;
    this.inSeqno = dec.seqno;
    this._onPayload = dec.onPayload;
    this._instance = new ChaChaPolyDecipher(dec.decipherKey);
    this._len = 0;
    this._lenBuf = Buffer.alloc(4);
    this._lenPos = 0;
    this._packet = null;
    this._pktLen = 0;
    this._mac = Buffer.allocUnsafe(16);
    this._macPos = 0;
  }
  free() {
    this._instance.free();
  }
  decrypt(data, p, dataLen) {
    // `data` === encrypted data

    while (p < dataLen) {
      // Read packet length
      if (this._lenPos < 4) {
        let nb = Math.min(4 - this._lenPos, dataLen - p);
        while (nb--)
          this._lenBuf[this._lenPos++] = data[p++];
        if (this._lenPos < 4)
          return;

        this._len = this._instance.decryptLen(this._lenBuf, this.inSeqno);

        if (this._len > MAX_PACKET_SIZE
            || this._len < 8
            || (this._len & 7) !== 0) {
          throw new Error('Bad packet length');
        }

        if (p >= dataLen)
          return;
      }

      // Read padding length, payload, and padding
      if (this._pktLen < this._len) {
        const nb = Math.min(this._len - this._pktLen, dataLen - p);
        let encrypted;
        if (p !== 0 || nb !== dataLen)
          encrypted = new Uint8Array(data.buffer, data.byteOffset + p, nb);
        else
          encrypted = data;
        if (nb === this._len) {
          this._packet = encrypted;
        } else {
          if (!this._packet)
            this._packet = Buffer.allocUnsafe(this._len);
          this._packet.set(encrypted, this._pktLen);
        }
        p += nb;
        this._pktLen += nb;
        if (this._pktLen < this._len || p >= dataLen)
          return;
      }

      // Read Poly1305 MAC
      {
        const nb = Math.min(16 - this._macPos, dataLen - p);
        // TODO: avoid copying if entire MAC is in current chunk
        if (p !== 0 || nb !== dataLen) {
          this._mac.set(
            new Uint8Array(data.buffer, data.byteOffset + p, nb),
            this._macPos
          );
        } else {
          this._mac.set(data, this._macPos);
        }
        p += nb;
        this._macPos += nb;
        if (this._macPos < 16)
          return;
      }

      this._instance.decrypt(this._packet, this._mac, this.inSeqno);

      const payload = new FastBuffer(this._packet.buffer,
                                     this._packet.byteOffset + 1,
                                     this._packet.length - this._packet[0] - 1);

      // Prepare for next packet
      this.inSeqno = (this.inSeqno + 1) >>> 0;
      this._len = 0;
      this._lenPos = 0;
      this._packet = null;
      this._pktLen = 0;
      this._macPos = 0;

      {
        const ret = this._onPayload(payload);
        if (ret !== undefined)
          return (ret === false ? p : ret);
      }
    }
  }
}

class AESGCMDecipherNative {
  constructor(config) {
    const dec = config.inbound;
    this.inSeqno = dec.seqno;
    this._onPayload = dec.onPayload;
    this._decipherInstance = null;
    this._decipherSSLName = dec.decipherInfo.sslName;
    this._decipherKey = dec.decipherKey;
    this._decipherIV = dec.decipherIV;
    this._len = 0;
    this._lenBytes = 0;
    this._packet = null;
    this._packetPos = 0;
    this._pktLen = 0;
    this._tag = Buffer.allocUnsafe(16);
    this._tagPos = 0;
  }
  free() {}
  decrypt(data, p, dataLen) {
    // `data` === encrypted data

    while (p < dataLen) {
      // Read packet length (unencrypted, but AAD)
      if (this._lenBytes < 4) {
        let nb = Math.min(4 - this._lenBytes, dataLen - p);
        this._lenBytes += nb;
        while (nb--)
          this._len = (this._len << 8) + data[p++];
        if (this._lenBytes < 4)
          return;

        if ((this._len + 20) > MAX_PACKET_SIZE
            || this._len < 16
            || (this._len & 15) !== 0) {
          throw new Error('Bad packet length');
        }

        this._decipherInstance = createDecipheriv(
          this._decipherSSLName,
          this._decipherKey,
          this._decipherIV
        );
        this._decipherInstance.setAutoPadding(false);
        this._decipherInstance.setAAD(intToBytes(this._len));
      }

      // Read padding length, payload, and padding
      if (this._pktLen < this._len) {
        if (p >= dataLen)
          return;
        const nb = Math.min(this._len - this._pktLen, dataLen - p);
        let decrypted;
        if (p !== 0 || nb !== dataLen) {
          decrypted = this._decipherInstance.update(
            new Uint8Array(data.buffer, data.byteOffset + p, nb)
          );
        } else {
          decrypted = this._decipherInstance.update(data);
        }
        if (decrypted.length) {
          if (nb === this._len) {
            this._packet = decrypted;
          } else {
            if (!this._packet)
              this._packet = Buffer.allocUnsafe(this._len);
            this._packet.set(decrypted, this._packetPos);
          }
          this._packetPos += decrypted.length;
        }
        p += nb;
        this._pktLen += nb;
        if (this._pktLen < this._len || p >= dataLen)
          return;
      }

      // Read authentication tag
      {
        const nb = Math.min(16 - this._tagPos, dataLen - p);
        if (p !== 0 || nb !== dataLen) {
          this._tag.set(
            new Uint8Array(data.buffer, data.byteOffset + p, nb),
            this._tagPos
          );
        } else {
          this._tag.set(data, this._tagPos);
        }
        p += nb;
        this._tagPos += nb;
        if (this._tagPos < 16)
          return;
      }

      {
        // Verify authentication tag
        this._decipherInstance.setAuthTag(this._tag);

        const decrypted = this._decipherInstance.final();

        // XXX: this should never output any data since stream ciphers always
        // return data from .update() and block ciphers must end on a multiple
        // of the block length, which would have caused an exception to be
        // thrown if the total input was not...
        if (decrypted.length) {
          if (this._packet)
            this._packet.set(decrypted, this._packetPos);
          else
            this._packet = decrypted;
        }
      }

      const payload = (!this._packet
                       ? EMPTY_BUFFER
                       : new FastBuffer(this._packet.buffer,
                                        this._packet.byteOffset + 1,
                                        this._packet.length
                                          - this._packet[0] - 1));

      // Prepare for next packet
      this.inSeqno = (this.inSeqno + 1) >>> 0;
      ivIncrement(this._decipherIV);
      this._len = 0;
      this._lenBytes = 0;
      this._packet = null;
      this._packetPos = 0;
      this._pktLen = 0;
      this._tagPos = 0;

      {
        const ret = this._onPayload(payload);
        if (ret !== undefined)
          return (ret === false ? p : ret);
      }
    }
  }
}

class AESGCMDecipherBinding {
  constructor(config) {
    const dec = config.inbound;
    this.inSeqno = dec.seqno;
    this._onPayload = dec.onPayload;
    this._instance = new AESGCMDecipher(dec.decipherInfo.sslName,
                                        dec.decipherKey,
                                        dec.decipherIV);
    this._len = 0;
    this._lenBytes = 0;
    this._packet = null;
    this._pktLen = 0;
    this._tag = Buffer.allocUnsafe(16);
    this._tagPos = 0;
  }
  free() {}
  decrypt(data, p, dataLen) {
    // `data` === encrypted data

    while (p < dataLen) {
      // Read packet length (unencrypted, but AAD)
      if (this._lenBytes < 4) {
        let nb = Math.min(4 - this._lenBytes, dataLen - p);
        this._lenBytes += nb;
        while (nb--)
          this._len = (this._len << 8) + data[p++];
        if (this._lenBytes < 4)
          return;

        if ((this._len + 20) > MAX_PACKET_SIZE
            || this._len < 16
            || (this._len & 15) !== 0) {
          throw new Error(`Bad packet length: ${this._len}`);
        }
      }

      // Read padding length, payload, and padding
      if (this._pktLen < this._len) {
        if (p >= dataLen)
          return;
        const nb = Math.min(this._len - this._pktLen, dataLen - p);
        let encrypted;
        if (p !== 0 || nb !== dataLen)
          encrypted = new Uint8Array(data.buffer, data.byteOffset + p, nb);
        else
          encrypted = data;
        if (nb === this._len) {
          this._packet = encrypted;
        } else {
          if (!this._packet)
            this._packet = Buffer.allocUnsafe(this._len);
          this._packet.set(encrypted, this._pktLen);
        }
        p += nb;
        this._pktLen += nb;
        if (this._pktLen < this._len || p >= dataLen)
          return;
      }

      // Read authentication tag
      {
        const nb = Math.min(16 - this._tagPos, dataLen - p);
        if (p !== 0 || nb !== dataLen) {
          this._tag.set(
            new Uint8Array(data.buffer, data.byteOffset + p, nb),
            this._tagPos
          );
        } else {
          this._tag.set(data, this._tagPos);
        }
        p += nb;
        this._tagPos += nb;
        if (this._tagPos < 16)
          return;
      }

      this._instance.decrypt(this._packet, this._len, this._tag);

      const payload = new FastBuffer(this._packet.buffer,
                                     this._packet.byteOffset + 1,
                                     this._packet.length - this._packet[0] - 1);

      // Prepare for next packet
      this.inSeqno = (this.inSeqno + 1) >>> 0;
      this._len = 0;
      this._lenBytes = 0;
      this._packet = null;
      this._pktLen = 0;
      this._tagPos = 0;

      {
        const ret = this._onPayload(payload);
        if (ret !== undefined)
          return (ret === false ? p : ret);
      }
    }
  }
}

// TODO: test incremental .update()s vs. copying to _packet and doing a single
// .update() after entire packet read -- a single .update() would allow
// verifying MAC before decrypting for ETM MACs
class GenericDecipherNative {
  constructor(config) {
    const dec = config.inbound;
    this.inSeqno = dec.seqno;
    this._onPayload = dec.onPayload;
    this._decipherInstance = createDecipheriv(dec.decipherInfo.sslName,
                                              dec.decipherKey,
                                              dec.decipherIV);
    this._decipherInstance.setAutoPadding(false);
    this._block = Buffer.allocUnsafe(
      dec.macInfo.isETM ? 4 : dec.decipherInfo.blockLen
    );
    this._blockSize = dec.decipherInfo.blockLen;
    this._blockPos = 0;
    this._len = 0;
    this._packet = null;
    this._packetPos = 0;
    this._pktLen = 0;
    this._mac = Buffer.allocUnsafe(dec.macInfo.actualLen);
    this._macPos = 0;
    this._macSSLName = dec.macInfo.sslName;
    this._macKey = dec.macKey;
    this._macActualLen = dec.macInfo.actualLen;
    this._macETM = dec.macInfo.isETM;
    this._macInstance = null;

    const discardLen = dec.decipherInfo.discardLen;
    if (discardLen) {
      let discard = DISCARD_CACHE.get(discardLen);
      if (discard === undefined) {
        discard = Buffer.alloc(discardLen);
        DISCARD_CACHE.set(discardLen, discard);
      }
      this._decipherInstance.update(discard);
    }
  }
  free() {}
  decrypt(data, p, dataLen) {
    // `data` === encrypted data

    while (p < dataLen) {
      // Read first encrypted block
      if (this._blockPos < this._block.length) {
        const nb = Math.min(this._block.length - this._blockPos, dataLen - p);
        if (p !== 0 || nb !== dataLen || nb < data.length) {
          this._block.set(
            new Uint8Array(data.buffer, data.byteOffset + p, nb),
            this._blockPos
          );
        } else {
          this._block.set(data, this._blockPos);
        }

        p += nb;
        this._blockPos += nb;
        if (this._blockPos < this._block.length)
          return;

        let decrypted;
        let need;
        if (this._macETM) {
          this._len = need = readUInt32BE(this._block, 0);
        } else {
          // Decrypt first block to get packet length
          decrypted = this._decipherInstance.update(this._block);
          this._len = readUInt32BE(decrypted, 0);
          need = 4 + this._len - this._blockSize;
        }

        if (this._len > MAX_PACKET_SIZE
            || this._len < 5
            || (need & (this._blockSize - 1)) !== 0) {
          throw new Error('Bad packet length');
        }

        // Create MAC up front to calculate in parallel with decryption
        this._macInstance = createHmac(this._macSSLName, this._macKey);

        writeUInt32BE(BUF_INT, this.inSeqno, 0);
        this._macInstance.update(BUF_INT);
        if (this._macETM) {
          this._macInstance.update(this._block);
        } else {
          this._macInstance.update(new Uint8Array(decrypted.buffer,
                                                  decrypted.byteOffset,
                                                  4));
          this._pktLen = decrypted.length - 4;
          this._packetPos = this._pktLen;
          this._packet = Buffer.allocUnsafe(this._len);
          this._packet.set(
            new Uint8Array(decrypted.buffer,
                           decrypted.byteOffset + 4,
                           this._packetPos),
            0
          );
        }

        if (p >= dataLen)
          return;
      }

      // Read padding length, payload, and padding
      if (this._pktLen < this._len) {
        const nb = Math.min(this._len - this._pktLen, dataLen - p);
        let encrypted;
        if (p !== 0 || nb !== dataLen)
          encrypted = new Uint8Array(data.buffer, data.byteOffset + p, nb);
        else
          encrypted = data;
        if (this._macETM)
          this._macInstance.update(encrypted);
        const decrypted = this._decipherInstance.update(encrypted);
        if (decrypted.length) {
          if (nb === this._len) {
            this._packet = decrypted;
          } else {
            if (!this._packet)
              this._packet = Buffer.allocUnsafe(this._len);
            this._packet.set(decrypted, this._packetPos);
          }
          this._packetPos += decrypted.length;
        }
        p += nb;
        this._pktLen += nb;
        if (this._pktLen < this._len || p >= dataLen)
          return;
      }

      // Read MAC
      {
        const nb = Math.min(this._macActualLen - this._macPos, dataLen - p);
        if (p !== 0 || nb !== dataLen) {
          this._mac.set(
            new Uint8Array(data.buffer, data.byteOffset + p, nb),
            this._macPos
          );
        } else {
          this._mac.set(data, this._macPos);
        }
        p += nb;
        this._macPos += nb;
        if (this._macPos < this._macActualLen)
          return;
      }

      // Verify MAC
      if (!this._macETM)
        this._macInstance.update(this._packet);
      let calculated = this._macInstance.digest();
      if (this._macActualLen < calculated.length) {
        calculated = new Uint8Array(calculated.buffer,
                                    calculated.byteOffset,
                                    this._macActualLen);
      }
      if (!timingSafeEquals(calculated, this._mac))
        throw new Error('Invalid MAC');

      const payload = new FastBuffer(this._packet.buffer,
                                     this._packet.byteOffset + 1,
                                     this._packet.length - this._packet[0] - 1);

      // Prepare for next packet
      this.inSeqno = (this.inSeqno + 1) >>> 0;
      this._blockPos = 0;
      this._len = 0;
      this._packet = null;
      this._packetPos = 0;
      this._pktLen = 0;
      this._macPos = 0;
      this._macInstance = null;

      {
        const ret = this._onPayload(payload);
        if (ret !== undefined)
          return (ret === false ? p : ret);
      }
    }
  }
}

class GenericDecipherBinding {
  constructor(config) {
    const dec = config.inbound;
    this.inSeqno = dec.seqno;
    this._onPayload = dec.onPayload;
    this._instance = new GenericDecipher(dec.decipherInfo.sslName,
                                         dec.decipherKey,
                                         dec.decipherIV,
                                         dec.macInfo.sslName,
                                         dec.macKey,
                                         dec.macInfo.isETM,
                                         dec.macInfo.actualLen);
    this._block = Buffer.allocUnsafe(
      dec.macInfo.isETM || dec.decipherInfo.stream
      ? 4
      : dec.decipherInfo.blockLen
    );
    this._blockPos = 0;
    this._len = 0;
    this._packet = null;
    this._pktLen = 0;
    this._mac = Buffer.allocUnsafe(dec.macInfo.actualLen);
    this._macPos = 0;
    this._macActualLen = dec.macInfo.actualLen;
    this._macETM = dec.macInfo.isETM;
  }
  free() {
    this._instance.free();
  }
  decrypt(data, p, dataLen) {
    // `data` === encrypted data

    while (p < dataLen) {
      // Read first encrypted block
      if (this._blockPos < this._block.length) {
        const nb = Math.min(this._block.length - this._blockPos, dataLen - p);
        if (p !== 0 || nb !== dataLen || nb < data.length) {
          this._block.set(
            new Uint8Array(data.buffer, data.byteOffset + p, nb),
            this._blockPos
          );
        } else {
          this._block.set(data, this._blockPos);
        }

        p += nb;
        this._blockPos += nb;
        if (this._blockPos < this._block.length)
          return;

        let need;
        if (this._macETM) {
          this._len = need = readUInt32BE(this._block, 0);
        } else {
          // Decrypt first block to get packet length
          this._instance.decryptBlock(this._block, this.inSeqno);
          this._len = readUInt32BE(this._block, 0);
          need = 4 + this._len - this._block.length;
        }

        if (this._len > MAX_PACKET_SIZE
            || this._len < 5
            || (need & (this._block.length - 1)) !== 0) {
          throw new Error('Bad packet length');
        }

        if (!this._macETM) {
          const pktStart = (this._block.length - 4);
          const startP = p - pktStart;
          let endP;
          if (p >= pktStart && (endP = startP + this._len) <= dataLen) {
            // The entire packet exists within the current chunk, with the
            // first block already decrypted
            if (startP === 0 && endP === dataLen) {
              this._packet = data;
              this._pktLen = this._len;
            } else {
              this._packet = new FastBuffer(
                data.buffer,
                data.byteOffset + startP,
                this._len
              );
              this._pktLen = this._len;
            }
            p = endP;
          } else {
            this._pktLen = pktStart;
            if (this._pktLen) {
              this._packet = Buffer.allocUnsafe(this._len);
              this._packet.set(
                new Uint8Array(this._block.buffer,
                               this._block.byteOffset + 4,
                               this._pktLen),
                0
              );
            }
          }
        }

        if (p >= dataLen)
          return;
      }

      // Read padding length, payload, and padding
      if (this._pktLen < this._len) {
        const nb = Math.min(this._len - this._pktLen, dataLen - p);
        let encrypted;
        if (p !== 0 || nb !== dataLen)
          encrypted = new Uint8Array(data.buffer, data.byteOffset + p, nb);
        else
          encrypted = data;
        if (nb === this._len) {
          this._packet = encrypted;
        } else {
          if (!this._packet)
            this._packet = Buffer.allocUnsafe(this._len);
          this._packet.set(encrypted, this._pktLen);
        }
        p += nb;
        this._pktLen += nb;
        if (this._pktLen < this._len || p >= dataLen)
          return;
      }

      // Read MAC
      {
        const nb = Math.min(this._macActualLen - this._macPos, dataLen - p);
        if (p !== 0 || nb !== dataLen) {
          this._mac.set(
            new Uint8Array(data.buffer, data.byteOffset + p, nb),
            this._macPos
          );
        } else {
          this._mac.set(data, this._macPos);
        }
        p += nb;
        this._macPos += nb;
        if (this._macPos < this._macActualLen)
          return;
      }

      // Decrypt and verify MAC
      this._instance.decrypt(this._packet,
                             this.inSeqno,
                             this._block,
                             this._mac);

      const payload = new FastBuffer(this._packet.buffer,
                                     this._packet.byteOffset + 1,
                                     this._packet.length - this._packet[0] - 1);

      // Prepare for next packet
      this.inSeqno = (this.inSeqno + 1) >>> 0;
      this._blockPos = 0;
      this._len = 0;
      this._packet = null;
      this._pktLen = 0;
      this._macPos = 0;
      this._macInstance = null;

      {
        const ret = this._onPayload(payload);
        if (ret !== undefined)
          return (ret === false ? p : ret);
      }
    }
  }
}

// Increments unsigned, big endian counter (last 8 bytes) of AES-GCM IV
function ivIncrement(iv) {
  // eslint-disable-next-line no-unused-expressions
  ++iv[11] >>> 8
  && ++iv[10] >>> 8
  && ++iv[9] >>> 8
  && ++iv[8] >>> 8
  && ++iv[7] >>> 8
  && ++iv[6] >>> 8
  && ++iv[5] >>> 8
  && ++iv[4] >>> 8;
}

const intToBytes = (() => {
  const ret = Buffer.alloc(4);
  return (n) => {
    ret[0] = (n >>> 24);
    ret[1] = (n >>> 16);
    ret[2] = (n >>> 8);
    ret[3] = n;
    return ret;
  };
})();

function timingSafeEquals(a, b) {
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

function createCipher(config) {
  if (typeof config !== 'object' || config === null)
    throw new Error('Invalid config');

  if (typeof config.outbound !== 'object' || config.outbound === null)
    throw new Error('Invalid outbound');

  const outbound = config.outbound;

  if (typeof outbound.onWrite !== 'function')
    throw new Error('Invalid outbound.onWrite');

  if (typeof outbound.cipherInfo !== 'object' || outbound.cipherInfo === null)
    throw new Error('Invalid outbound.cipherInfo');

  if (!Buffer.isBuffer(outbound.cipherKey)
      || outbound.cipherKey.length !== outbound.cipherInfo.keyLen) {
    throw new Error('Invalid outbound.cipherKey');
  }

  if (outbound.cipherInfo.ivLen
      && (!Buffer.isBuffer(outbound.cipherIV)
          || outbound.cipherIV.length !== outbound.cipherInfo.ivLen)) {
    throw new Error('Invalid outbound.cipherIV');
  }

  if (typeof outbound.seqno !== 'number'
      || outbound.seqno < 0
      || outbound.seqno > MAX_SEQNO) {
    throw new Error('Invalid outbound.seqno');
  }

  const forceNative = !!outbound.forceNative;

  switch (outbound.cipherInfo.sslName) {
    case 'aes-128-gcm':
    case 'aes-256-gcm':
      return (AESGCMCipher && !forceNative
              ? new AESGCMCipherBinding(config)
              : new AESGCMCipherNative(config));
    case 'chacha20':
      return (ChaChaPolyCipher && !forceNative
              ? new ChaChaPolyCipherBinding(config)
              : new ChaChaPolyCipherNative(config));
    default: {
      if (typeof outbound.macInfo !== 'object' || outbound.macInfo === null)
        throw new Error('Invalid outbound.macInfo');
      if (!Buffer.isBuffer(outbound.macKey)
          || outbound.macKey.length !== outbound.macInfo.len) {
        throw new Error('Invalid outbound.macKey');
      }
      return (GenericCipher && !forceNative
              ? new GenericCipherBinding(config)
              : new GenericCipherNative(config));
    }
  }
}

function createDecipher(config) {
  if (typeof config !== 'object' || config === null)
    throw new Error('Invalid config');

  if (typeof config.inbound !== 'object' || config.inbound === null)
    throw new Error('Invalid inbound');

  const inbound = config.inbound;

  if (typeof inbound.onPayload !== 'function')
    throw new Error('Invalid inbound.onPayload');

  if (typeof inbound.decipherInfo !== 'object'
      || inbound.decipherInfo === null) {
    throw new Error('Invalid inbound.decipherInfo');
  }

  if (!Buffer.isBuffer(inbound.decipherKey)
      || inbound.decipherKey.length !== inbound.decipherInfo.keyLen) {
    throw new Error('Invalid inbound.decipherKey');
  }

  if (inbound.decipherInfo.ivLen
      && (!Buffer.isBuffer(inbound.decipherIV)
          || inbound.decipherIV.length !== inbound.decipherInfo.ivLen)) {
    throw new Error('Invalid inbound.decipherIV');
  }

  if (typeof inbound.seqno !== 'number'
      || inbound.seqno < 0
      || inbound.seqno > MAX_SEQNO) {
    throw new Error('Invalid inbound.seqno');
  }

  const forceNative = !!inbound.forceNative;

  switch (inbound.decipherInfo.sslName) {
    case 'aes-128-gcm':
    case 'aes-256-gcm':
      return (AESGCMDecipher && !forceNative
              ? new AESGCMDecipherBinding(config)
              : new AESGCMDecipherNative(config));
    case 'chacha20':
      return (ChaChaPolyDecipher && !forceNative
              ? new ChaChaPolyDecipherBinding(config)
              : new ChaChaPolyDecipherNative(config));
    default: {
      if (typeof inbound.macInfo !== 'object' || inbound.macInfo === null)
        throw new Error('Invalid inbound.macInfo');
      if (!Buffer.isBuffer(inbound.macKey)
          || inbound.macKey.length !== inbound.macInfo.len) {
        throw new Error('Invalid inbound.macKey');
      }
      return (GenericDecipher && !forceNative
              ? new GenericDecipherBinding(config)
              : new GenericDecipherNative(config));
    }
  }
}

module.exports = {
  CIPHER_INFO,
  MAC_INFO,
  bindingAvailable: !!binding,
  init: (() => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        POLY1305_WASM_MODULE = await __nccwpck_require__(4989)();
        POLY1305_RESULT_MALLOC = POLY1305_WASM_MODULE._malloc(16);
        poly1305_auth = POLY1305_WASM_MODULE.cwrap(
          'poly1305_auth',
          null,
          ['number', 'array', 'number', 'array', 'number', 'array']
        );
      } catch (ex) {
        return reject(ex);
      }
      resolve();
    });
  })(),

  NullCipher,
  createCipher,
  NullDecipher,
  createDecipher,
};


/***/ }),

/***/ 4989:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {


var createPoly1305 = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  if (typeof __filename !== 'undefined') _scriptDir = _scriptDir || __filename;
  return (
function(createPoly1305) {
  createPoly1305 = createPoly1305 || {};


var b;b||(b=typeof createPoly1305 !== 'undefined' ? createPoly1305 : {});var q,r;b.ready=new Promise(function(a,c){q=a;r=c});var u={},w;for(w in b)b.hasOwnProperty(w)&&(u[w]=b[w]);var x="object"===typeof window,y="function"===typeof importScripts,z="object"===typeof process&&"object"===typeof process.versions&&"string"===typeof process.versions.node,B="",C,D,E,F,G;
if(z)B=y?__nccwpck_require__(5622).dirname(B)+"/":__dirname+"/",C=function(a,c){var d=H(a);if(d)return c?d:d.toString();F||(F=__nccwpck_require__(5747));G||(G=__nccwpck_require__(5622));a=G.normalize(a);return F.readFileSync(a,c?null:"utf8")},E=function(a){a=C(a,!0);a.buffer||(a=new Uint8Array(a));assert(a.buffer);return a},D=function(a,c,d){var e=H(a);e&&c(e);F||(F=__nccwpck_require__(5747));G||(G=__nccwpck_require__(5622));a=G.normalize(a);F.readFile(a,function(f,l){f?d(f):c(l.buffer)})},1<process.argv.length&&process.argv[1].replace(/\\/g,"/"),process.argv.slice(2),
b.inspect=function(){return"[Emscripten Module object]"};else if(x||y)y?B=self.location.href:"undefined"!==typeof document&&document.currentScript&&(B=document.currentScript.src),_scriptDir&&(B=_scriptDir),0!==B.indexOf("blob:")?B=B.substr(0,B.lastIndexOf("/")+1):B="",C=function(a){try{var c=new XMLHttpRequest;c.open("GET",a,!1);c.send(null);return c.responseText}catch(f){if(a=H(a)){c=[];for(var d=0;d<a.length;d++){var e=a[d];255<e&&(ba&&assert(!1,"Character code "+e+" ("+String.fromCharCode(e)+")  at offset "+
d+" not in 0x00-0xFF."),e&=255);c.push(String.fromCharCode(e))}return c.join("")}throw f;}},y&&(E=function(a){try{var c=new XMLHttpRequest;c.open("GET",a,!1);c.responseType="arraybuffer";c.send(null);return new Uint8Array(c.response)}catch(d){if(a=H(a))return a;throw d;}}),D=function(a,c,d){var e=new XMLHttpRequest;e.open("GET",a,!0);e.responseType="arraybuffer";e.onload=function(){if(200==e.status||0==e.status&&e.response)c(e.response);else{var f=H(a);f?c(f.buffer):d()}};e.onerror=d;e.send(null)};
b.print||console.log.bind(console);var I=b.printErr||console.warn.bind(console);for(w in u)u.hasOwnProperty(w)&&(b[w]=u[w]);u=null;var J;b.wasmBinary&&(J=b.wasmBinary);var noExitRuntime=b.noExitRuntime||!0;"object"!==typeof WebAssembly&&K("no native wasm support detected");var L,M=!1;function assert(a,c){a||K("Assertion failed: "+c)}function N(a){var c=b["_"+a];assert(c,"Cannot call unknown function "+a+", make sure it is exported");return c}
function ca(a,c,d,e){var f={string:function(g){var p=0;if(null!==g&&void 0!==g&&0!==g){var n=(g.length<<2)+1;p=O(n);var k=p,h=P;if(0<n){n=k+n-1;for(var v=0;v<g.length;++v){var m=g.charCodeAt(v);if(55296<=m&&57343>=m){var oa=g.charCodeAt(++v);m=65536+((m&1023)<<10)|oa&1023}if(127>=m){if(k>=n)break;h[k++]=m}else{if(2047>=m){if(k+1>=n)break;h[k++]=192|m>>6}else{if(65535>=m){if(k+2>=n)break;h[k++]=224|m>>12}else{if(k+3>=n)break;h[k++]=240|m>>18;h[k++]=128|m>>12&63}h[k++]=128|m>>6&63}h[k++]=128|m&63}}h[k]=
0}}return p},array:function(g){var p=O(g.length);Q.set(g,p);return p}},l=N(a),A=[];a=0;if(e)for(var t=0;t<e.length;t++){var aa=f[d[t]];aa?(0===a&&(a=da()),A[t]=aa(e[t])):A[t]=e[t]}d=l.apply(null,A);d=function(g){if("string"===c)if(g){for(var p=P,n=g+NaN,k=g;p[k]&&!(k>=n);)++k;if(16<k-g&&p.subarray&&ea)g=ea.decode(p.subarray(g,k));else{for(n="";g<k;){var h=p[g++];if(h&128){var v=p[g++]&63;if(192==(h&224))n+=String.fromCharCode((h&31)<<6|v);else{var m=p[g++]&63;h=224==(h&240)?(h&15)<<12|v<<6|m:(h&7)<<
18|v<<12|m<<6|p[g++]&63;65536>h?n+=String.fromCharCode(h):(h-=65536,n+=String.fromCharCode(55296|h>>10,56320|h&1023))}}else n+=String.fromCharCode(h)}g=n}}else g="";else g="boolean"===c?!!g:g;return g}(d);0!==a&&fa(a);return d}var ea="undefined"!==typeof TextDecoder?new TextDecoder("utf8"):void 0,ha,Q,P;
function ia(){var a=L.buffer;ha=a;b.HEAP8=Q=new Int8Array(a);b.HEAP16=new Int16Array(a);b.HEAP32=new Int32Array(a);b.HEAPU8=P=new Uint8Array(a);b.HEAPU16=new Uint16Array(a);b.HEAPU32=new Uint32Array(a);b.HEAPF32=new Float32Array(a);b.HEAPF64=new Float64Array(a)}var R,ja=[],ka=[],la=[];function ma(){var a=b.preRun.shift();ja.unshift(a)}var S=0,T=null,U=null;b.preloadedImages={};b.preloadedAudios={};
function K(a){if(b.onAbort)b.onAbort(a);I(a);M=!0;a=new WebAssembly.RuntimeError("abort("+a+"). Build with -s ASSERTIONS=1 for more info.");r(a);throw a;}var V="data:application/octet-stream;base64,",W;W="data:application/octet-stream;base64,AGFzbQEAAAABIAZgAX8Bf2ADf39/AGABfwBgAABgAAF/YAZ/f39/f38AAgcBAWEBYQAAAwsKAAEDAQAAAgQFAgQFAXABAQEFBwEBgAKAgAIGCQF/AUGAjMACCwclCQFiAgABYwADAWQACQFlAAgBZgAHAWcABgFoAAUBaQAKAWoBAAqGTQpPAQJ/QYAIKAIAIgEgAEEDakF8cSICaiEAAkAgAkEAIAAgAU0bDQAgAD8AQRB0SwRAIAAQAEUNAQtBgAggADYCACABDwtBhAhBMDYCAEF/C4wFAg5+Cn8gACgCJCEUIAAoAiAhFSAAKAIcIREgACgCGCESIAAoAhQhEyACQRBPBEAgAC0ATEVBGHQhFyAAKAIEIhZBBWytIQ8gACgCCCIYQQVsrSENIAAoAgwiGUEFbK0hCyAAKAIQIhpBBWytIQkgADUCACEIIBqtIRAgGa0hDiAYrSEMIBatIQoDQCASIAEtAAMiEiABLQAEQQh0ciABLQAFQRB0ciABLQAGIhZBGHRyQQJ2Qf///x9xaq0iAyAOfiABLwAAIAEtAAJBEHRyIBNqIBJBGHRBgICAGHFqrSIEIBB+fCARIAEtAAdBCHQgFnIgAS0ACEEQdHIgAS0ACSIRQRh0ckEEdkH///8fcWqtIgUgDH58IAEtAApBCHQgEXIgAS0AC0EQdHIgAS0ADEEYdHJBBnYgFWqtIgYgCn58IBQgF2ogAS8ADSABLQAPQRB0cmqtIgcgCH58IAMgDH4gBCAOfnwgBSAKfnwgBiAIfnwgByAJfnwgAyAKfiAEIAx+fCAFIAh+fCAGIAl+fCAHIAt+fCADIAh+IAQgCn58IAUgCX58IAYgC358IAcgDX58IAMgCX4gBCAIfnwgBSALfnwgBiANfnwgByAPfnwiA0IaiEL/////D4N8IgRCGohC/////w+DfCIFQhqIQv////8Pg3wiBkIaiEL/////D4N8IgdCGoinQQVsIAOnQf///x9xaiITQRp2IASnQf///x9xaiESIAWnQf///x9xIREgBqdB////H3EhFSAHp0H///8fcSEUIBNB////H3EhEyABQRBqIQEgAkEQayICQQ9LDQALCyAAIBQ2AiQgACAVNgIgIAAgETYCHCAAIBI2AhggACATNgIUCwMAAQu2BAEGfwJAIAAoAjgiBARAIABBPGohBQJAIAJBECAEayIDIAIgA0kbIgZFDQAgBkEDcSEHAkAgBkEBa0EDSQRAQQAhAwwBCyAGQXxxIQhBACEDA0AgBSADIARqaiABIANqLQAAOgAAIAUgA0EBciIEIAAoAjhqaiABIARqLQAAOgAAIAUgA0ECciIEIAAoAjhqaiABIARqLQAAOgAAIAUgA0EDciIEIAAoAjhqaiABIARqLQAAOgAAIANBBGohAyAAKAI4IQQgCEEEayIIDQALCyAHRQ0AA0AgBSADIARqaiABIANqLQAAOgAAIANBAWohAyAAKAI4IQQgB0EBayIHDQALCyAAIAQgBmoiAzYCOCADQRBJDQEgACAFQRAQAiAAQQA2AjggAiAGayECIAEgBmohAQsgAkEQTwRAIAAgASACQXBxIgMQAiACQQ9xIQIgASADaiEBCyACRQ0AIAJBA3EhBCAAQTxqIQVBACEDIAJBAWtBA08EQCACQXxxIQcDQCAFIAAoAjggA2pqIAEgA2otAAA6AAAgBSADQQFyIgYgACgCOGpqIAEgBmotAAA6AAAgBSADQQJyIgYgACgCOGpqIAEgBmotAAA6AAAgBSADQQNyIgYgACgCOGpqIAEgBmotAAA6AAAgA0EEaiEDIAdBBGsiBw0ACwsgBARAA0AgBSAAKAI4IANqaiABIANqLQAAOgAAIANBAWohAyAEQQFrIgQNAAsLIAAgACgCOCACajYCOAsLoS0BDH8jAEEQayIMJAACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAEH0AU0EQEGICCgCACIFQRAgAEELakF4cSAAQQtJGyIIQQN2IgJ2IgFBA3EEQCABQX9zQQFxIAJqIgNBA3QiAUG4CGooAgAiBEEIaiEAAkAgBCgCCCICIAFBsAhqIgFGBEBBiAggBUF+IAN3cTYCAAwBCyACIAE2AgwgASACNgIICyAEIANBA3QiAUEDcjYCBCABIARqIgEgASgCBEEBcjYCBAwNCyAIQZAIKAIAIgpNDQEgAQRAAkBBAiACdCIAQQAgAGtyIAEgAnRxIgBBACAAa3FBAWsiACAAQQx2QRBxIgJ2IgFBBXZBCHEiACACciABIAB2IgFBAnZBBHEiAHIgASAAdiIBQQF2QQJxIgByIAEgAHYiAUEBdkEBcSIAciABIAB2aiIDQQN0IgBBuAhqKAIAIgQoAggiASAAQbAIaiIARgRAQYgIIAVBfiADd3EiBTYCAAwBCyABIAA2AgwgACABNgIICyAEQQhqIQAgBCAIQQNyNgIEIAQgCGoiAiADQQN0IgEgCGsiA0EBcjYCBCABIARqIAM2AgAgCgRAIApBA3YiAUEDdEGwCGohB0GcCCgCACEEAn8gBUEBIAF0IgFxRQRAQYgIIAEgBXI2AgAgBwwBCyAHKAIICyEBIAcgBDYCCCABIAQ2AgwgBCAHNgIMIAQgATYCCAtBnAggAjYCAEGQCCADNgIADA0LQYwIKAIAIgZFDQEgBkEAIAZrcUEBayIAIABBDHZBEHEiAnYiAUEFdkEIcSIAIAJyIAEgAHYiAUECdkEEcSIAciABIAB2IgFBAXZBAnEiAHIgASAAdiIBQQF2QQFxIgByIAEgAHZqQQJ0QbgKaigCACIBKAIEQXhxIAhrIQMgASECA0ACQCACKAIQIgBFBEAgAigCFCIARQ0BCyAAKAIEQXhxIAhrIgIgAyACIANJIgIbIQMgACABIAIbIQEgACECDAELCyABIAhqIgkgAU0NAiABKAIYIQsgASABKAIMIgRHBEAgASgCCCIAQZgIKAIASRogACAENgIMIAQgADYCCAwMCyABQRRqIgIoAgAiAEUEQCABKAIQIgBFDQQgAUEQaiECCwNAIAIhByAAIgRBFGoiAigCACIADQAgBEEQaiECIAQoAhAiAA0ACyAHQQA2AgAMCwtBfyEIIABBv39LDQAgAEELaiIAQXhxIQhBjAgoAgAiCUUNAEEAIAhrIQMCQAJAAkACf0EAIAhBgAJJDQAaQR8gCEH///8HSw0AGiAAQQh2IgAgAEGA/j9qQRB2QQhxIgJ0IgAgAEGA4B9qQRB2QQRxIgF0IgAgAEGAgA9qQRB2QQJxIgB0QQ92IAEgAnIgAHJrIgBBAXQgCCAAQRVqdkEBcXJBHGoLIgVBAnRBuApqKAIAIgJFBEBBACEADAELQQAhACAIQQBBGSAFQQF2ayAFQR9GG3QhAQNAAkAgAigCBEF4cSAIayIHIANPDQAgAiEEIAciAw0AQQAhAyACIQAMAwsgACACKAIUIgcgByACIAFBHXZBBHFqKAIQIgJGGyAAIAcbIQAgAUEBdCEBIAINAAsLIAAgBHJFBEBBACEEQQIgBXQiAEEAIABrciAJcSIARQ0DIABBACAAa3FBAWsiACAAQQx2QRBxIgJ2IgFBBXZBCHEiACACciABIAB2IgFBAnZBBHEiAHIgASAAdiIBQQF2QQJxIgByIAEgAHYiAUEBdkEBcSIAciABIAB2akECdEG4CmooAgAhAAsgAEUNAQsDQCAAKAIEQXhxIAhrIgEgA0khAiABIAMgAhshAyAAIAQgAhshBCAAKAIQIgEEfyABBSAAKAIUCyIADQALCyAERQ0AIANBkAgoAgAgCGtPDQAgBCAIaiIGIARNDQEgBCgCGCEFIAQgBCgCDCIBRwRAIAQoAggiAEGYCCgCAEkaIAAgATYCDCABIAA2AggMCgsgBEEUaiICKAIAIgBFBEAgBCgCECIARQ0EIARBEGohAgsDQCACIQcgACIBQRRqIgIoAgAiAA0AIAFBEGohAiABKAIQIgANAAsgB0EANgIADAkLIAhBkAgoAgAiAk0EQEGcCCgCACEDAkAgAiAIayIBQRBPBEBBkAggATYCAEGcCCADIAhqIgA2AgAgACABQQFyNgIEIAIgA2ogATYCACADIAhBA3I2AgQMAQtBnAhBADYCAEGQCEEANgIAIAMgAkEDcjYCBCACIANqIgAgACgCBEEBcjYCBAsgA0EIaiEADAsLIAhBlAgoAgAiBkkEQEGUCCAGIAhrIgE2AgBBoAhBoAgoAgAiAiAIaiIANgIAIAAgAUEBcjYCBCACIAhBA3I2AgQgAkEIaiEADAsLQQAhACAIQS9qIgkCf0HgCygCAARAQegLKAIADAELQewLQn83AgBB5AtCgKCAgICABDcCAEHgCyAMQQxqQXBxQdiq1aoFczYCAEH0C0EANgIAQcQLQQA2AgBBgCALIgFqIgVBACABayIHcSICIAhNDQpBwAsoAgAiBARAQbgLKAIAIgMgAmoiASADTQ0LIAEgBEsNCwtBxAstAABBBHENBQJAAkBBoAgoAgAiAwRAQcgLIQADQCADIAAoAgAiAU8EQCABIAAoAgRqIANLDQMLIAAoAggiAA0ACwtBABABIgFBf0YNBiACIQVB5AsoAgAiA0EBayIAIAFxBEAgAiABayAAIAFqQQAgA2txaiEFCyAFIAhNDQYgBUH+////B0sNBkHACygCACIEBEBBuAsoAgAiAyAFaiIAIANNDQcgACAESw0HCyAFEAEiACABRw0BDAgLIAUgBmsgB3EiBUH+////B0sNBSAFEAEiASAAKAIAIAAoAgRqRg0EIAEhAAsCQCAAQX9GDQAgCEEwaiAFTQ0AQegLKAIAIgEgCSAFa2pBACABa3EiAUH+////B0sEQCAAIQEMCAsgARABQX9HBEAgASAFaiEFIAAhAQwIC0EAIAVrEAEaDAULIAAiAUF/Rw0GDAQLAAtBACEEDAcLQQAhAQwFCyABQX9HDQILQcQLQcQLKAIAQQRyNgIACyACQf7///8HSw0BIAIQASEBQQAQASEAIAFBf0YNASAAQX9GDQEgACABTQ0BIAAgAWsiBSAIQShqTQ0BC0G4C0G4CygCACAFaiIANgIAQbwLKAIAIABJBEBBvAsgADYCAAsCQAJAAkBBoAgoAgAiBwRAQcgLIQADQCABIAAoAgAiAyAAKAIEIgJqRg0CIAAoAggiAA0ACwwCC0GYCCgCACIAQQAgACABTRtFBEBBmAggATYCAAtBACEAQcwLIAU2AgBByAsgATYCAEGoCEF/NgIAQawIQeALKAIANgIAQdQLQQA2AgADQCAAQQN0IgNBuAhqIANBsAhqIgI2AgAgA0G8CGogAjYCACAAQQFqIgBBIEcNAAtBlAggBUEoayIDQXggAWtBB3FBACABQQhqQQdxGyIAayICNgIAQaAIIAAgAWoiADYCACAAIAJBAXI2AgQgASADakEoNgIEQaQIQfALKAIANgIADAILIAAtAAxBCHENACADIAdLDQAgASAHTQ0AIAAgAiAFajYCBEGgCCAHQXggB2tBB3FBACAHQQhqQQdxGyIAaiICNgIAQZQIQZQIKAIAIAVqIgEgAGsiADYCACACIABBAXI2AgQgASAHakEoNgIEQaQIQfALKAIANgIADAELQZgIKAIAIAFLBEBBmAggATYCAAsgASAFaiECQcgLIQACQAJAAkACQAJAAkADQCACIAAoAgBHBEAgACgCCCIADQEMAgsLIAAtAAxBCHFFDQELQcgLIQADQCAHIAAoAgAiAk8EQCACIAAoAgRqIgQgB0sNAwsgACgCCCEADAALAAsgACABNgIAIAAgACgCBCAFajYCBCABQXggAWtBB3FBACABQQhqQQdxG2oiCSAIQQNyNgIEIAJBeCACa0EHcUEAIAJBCGpBB3EbaiIFIAggCWoiBmshAiAFIAdGBEBBoAggBjYCAEGUCEGUCCgCACACaiIANgIAIAYgAEEBcjYCBAwDCyAFQZwIKAIARgRAQZwIIAY2AgBBkAhBkAgoAgAgAmoiADYCACAGIABBAXI2AgQgACAGaiAANgIADAMLIAUoAgQiAEEDcUEBRgRAIABBeHEhBwJAIABB/wFNBEAgBSgCCCIDIABBA3YiAEEDdEGwCGpGGiADIAUoAgwiAUYEQEGICEGICCgCAEF+IAB3cTYCAAwCCyADIAE2AgwgASADNgIIDAELIAUoAhghCAJAIAUgBSgCDCIBRwRAIAUoAggiACABNgIMIAEgADYCCAwBCwJAIAVBFGoiACgCACIDDQAgBUEQaiIAKAIAIgMNAEEAIQEMAQsDQCAAIQQgAyIBQRRqIgAoAgAiAw0AIAFBEGohACABKAIQIgMNAAsgBEEANgIACyAIRQ0AAkAgBSAFKAIcIgNBAnRBuApqIgAoAgBGBEAgACABNgIAIAENAUGMCEGMCCgCAEF+IAN3cTYCAAwCCyAIQRBBFCAIKAIQIAVGG2ogATYCACABRQ0BCyABIAg2AhggBSgCECIABEAgASAANgIQIAAgATYCGAsgBSgCFCIARQ0AIAEgADYCFCAAIAE2AhgLIAUgB2ohBSACIAdqIQILIAUgBSgCBEF+cTYCBCAGIAJBAXI2AgQgAiAGaiACNgIAIAJB/wFNBEAgAkEDdiIAQQN0QbAIaiECAn9BiAgoAgAiAUEBIAB0IgBxRQRAQYgIIAAgAXI2AgAgAgwBCyACKAIICyEAIAIgBjYCCCAAIAY2AgwgBiACNgIMIAYgADYCCAwDC0EfIQAgAkH///8HTQRAIAJBCHYiACAAQYD+P2pBEHZBCHEiA3QiACAAQYDgH2pBEHZBBHEiAXQiACAAQYCAD2pBEHZBAnEiAHRBD3YgASADciAAcmsiAEEBdCACIABBFWp2QQFxckEcaiEACyAGIAA2AhwgBkIANwIQIABBAnRBuApqIQQCQEGMCCgCACIDQQEgAHQiAXFFBEBBjAggASADcjYCACAEIAY2AgAgBiAENgIYDAELIAJBAEEZIABBAXZrIABBH0YbdCEAIAQoAgAhAQNAIAEiAygCBEF4cSACRg0DIABBHXYhASAAQQF0IQAgAyABQQRxaiIEKAIQIgENAAsgBCAGNgIQIAYgAzYCGAsgBiAGNgIMIAYgBjYCCAwCC0GUCCAFQShrIgNBeCABa0EHcUEAIAFBCGpBB3EbIgBrIgI2AgBBoAggACABaiIANgIAIAAgAkEBcjYCBCABIANqQSg2AgRBpAhB8AsoAgA2AgAgByAEQScgBGtBB3FBACAEQSdrQQdxG2pBL2siACAAIAdBEGpJGyICQRs2AgQgAkHQCykCADcCECACQcgLKQIANwIIQdALIAJBCGo2AgBBzAsgBTYCAEHICyABNgIAQdQLQQA2AgAgAkEYaiEAA0AgAEEHNgIEIABBCGohASAAQQRqIQAgASAESQ0ACyACIAdGDQMgAiACKAIEQX5xNgIEIAcgAiAHayIEQQFyNgIEIAIgBDYCACAEQf8BTQRAIARBA3YiAEEDdEGwCGohAgJ/QYgIKAIAIgFBASAAdCIAcUUEQEGICCAAIAFyNgIAIAIMAQsgAigCCAshACACIAc2AgggACAHNgIMIAcgAjYCDCAHIAA2AggMBAtBHyEAIAdCADcCECAEQf///wdNBEAgBEEIdiIAIABBgP4/akEQdkEIcSICdCIAIABBgOAfakEQdkEEcSIBdCIAIABBgIAPakEQdkECcSIAdEEPdiABIAJyIAByayIAQQF0IAQgAEEVanZBAXFyQRxqIQALIAcgADYCHCAAQQJ0QbgKaiEDAkBBjAgoAgAiAkEBIAB0IgFxRQRAQYwIIAEgAnI2AgAgAyAHNgIAIAcgAzYCGAwBCyAEQQBBGSAAQQF2ayAAQR9GG3QhACADKAIAIQEDQCABIgIoAgRBeHEgBEYNBCAAQR12IQEgAEEBdCEAIAIgAUEEcWoiAygCECIBDQALIAMgBzYCECAHIAI2AhgLIAcgBzYCDCAHIAc2AggMAwsgAygCCCIAIAY2AgwgAyAGNgIIIAZBADYCGCAGIAM2AgwgBiAANgIICyAJQQhqIQAMBQsgAigCCCIAIAc2AgwgAiAHNgIIIAdBADYCGCAHIAI2AgwgByAANgIIC0GUCCgCACIAIAhNDQBBlAggACAIayIBNgIAQaAIQaAIKAIAIgIgCGoiADYCACAAIAFBAXI2AgQgAiAIQQNyNgIEIAJBCGohAAwDC0GECEEwNgIAQQAhAAwCCwJAIAVFDQACQCAEKAIcIgJBAnRBuApqIgAoAgAgBEYEQCAAIAE2AgAgAQ0BQYwIIAlBfiACd3EiCTYCAAwCCyAFQRBBFCAFKAIQIARGG2ogATYCACABRQ0BCyABIAU2AhggBCgCECIABEAgASAANgIQIAAgATYCGAsgBCgCFCIARQ0AIAEgADYCFCAAIAE2AhgLAkAgA0EPTQRAIAQgAyAIaiIAQQNyNgIEIAAgBGoiACAAKAIEQQFyNgIEDAELIAQgCEEDcjYCBCAGIANBAXI2AgQgAyAGaiADNgIAIANB/wFNBEAgA0EDdiIAQQN0QbAIaiECAn9BiAgoAgAiAUEBIAB0IgBxRQRAQYgIIAAgAXI2AgAgAgwBCyACKAIICyEAIAIgBjYCCCAAIAY2AgwgBiACNgIMIAYgADYCCAwBC0EfIQAgA0H///8HTQRAIANBCHYiACAAQYD+P2pBEHZBCHEiAnQiACAAQYDgH2pBEHZBBHEiAXQiACAAQYCAD2pBEHZBAnEiAHRBD3YgASACciAAcmsiAEEBdCADIABBFWp2QQFxckEcaiEACyAGIAA2AhwgBkIANwIQIABBAnRBuApqIQICQAJAIAlBASAAdCIBcUUEQEGMCCABIAlyNgIAIAIgBjYCACAGIAI2AhgMAQsgA0EAQRkgAEEBdmsgAEEfRht0IQAgAigCACEIA0AgCCIBKAIEQXhxIANGDQIgAEEddiECIABBAXQhACABIAJBBHFqIgIoAhAiCA0ACyACIAY2AhAgBiABNgIYCyAGIAY2AgwgBiAGNgIIDAELIAEoAggiACAGNgIMIAEgBjYCCCAGQQA2AhggBiABNgIMIAYgADYCCAsgBEEIaiEADAELAkAgC0UNAAJAIAEoAhwiAkECdEG4CmoiACgCACABRgRAIAAgBDYCACAEDQFBjAggBkF+IAJ3cTYCAAwCCyALQRBBFCALKAIQIAFGG2ogBDYCACAERQ0BCyAEIAs2AhggASgCECIABEAgBCAANgIQIAAgBDYCGAsgASgCFCIARQ0AIAQgADYCFCAAIAQ2AhgLAkAgA0EPTQRAIAEgAyAIaiIAQQNyNgIEIAAgAWoiACAAKAIEQQFyNgIEDAELIAEgCEEDcjYCBCAJIANBAXI2AgQgAyAJaiADNgIAIAoEQCAKQQN2IgBBA3RBsAhqIQRBnAgoAgAhAgJ/QQEgAHQiACAFcUUEQEGICCAAIAVyNgIAIAQMAQsgBCgCCAshACAEIAI2AgggACACNgIMIAIgBDYCDCACIAA2AggLQZwIIAk2AgBBkAggAzYCAAsgAUEIaiEACyAMQRBqJAAgAAsQACMAIABrQXBxIgAkACAACwYAIAAkAAsEACMAC4AJAgh/BH4jAEGQAWsiBiQAIAYgBS0AA0EYdEGAgIAYcSAFLwAAIAUtAAJBEHRycjYCACAGIAUoAANBAnZBg/7/H3E2AgQgBiAFKAAGQQR2Qf+B/x9xNgIIIAYgBSgACUEGdkH//8AfcTYCDCAFLwANIQggBS0ADyEJIAZCADcCFCAGQgA3AhwgBkEANgIkIAYgCCAJQRB0QYCAPHFyNgIQIAYgBSgAEDYCKCAGIAUoABQ2AiwgBiAFKAAYNgIwIAUoABwhBSAGQQA6AEwgBkEANgI4IAYgBTYCNCAGIAEgAhAEIAQEQCAGIAMgBBAECyAGKAI4IgEEQCAGQTxqIgIgAWpBAToAACABQQFqQQ9NBEAgASAGakE9aiEEAkBBDyABayIDRQ0AIAMgBGoiAUEBa0EAOgAAIARBADoAACADQQNJDQAgAUECa0EAOgAAIARBADoAASABQQNrQQA6AAAgBEEAOgACIANBB0kNACABQQRrQQA6AAAgBEEAOgADIANBCUkNACAEQQAgBGtBA3EiAWoiBEEANgIAIAQgAyABa0F8cSIBaiIDQQRrQQA2AgAgAUEJSQ0AIARBADYCCCAEQQA2AgQgA0EIa0EANgIAIANBDGtBADYCACABQRlJDQAgBEEANgIYIARBADYCFCAEQQA2AhAgBEEANgIMIANBEGtBADYCACADQRRrQQA2AgAgA0EYa0EANgIAIANBHGtBADYCACABIARBBHFBGHIiAWsiA0EgSQ0AIAEgBGohAQNAIAFCADcDGCABQgA3AxAgAUIANwMIIAFCADcDACABQSBqIQEgA0EgayIDQR9LDQALCwsgBkEBOgBMIAYgAkEQEAILIAY1AjQhECAGNQIwIREgBjUCLCEOIAAgBjUCKCAGKAIkIAYoAiAgBigCHCAGKAIYIgNBGnZqIgJBGnZqIgFBGnZqIgtBgICAYHIgAUH///8fcSINIAJB////H3EiCCAGKAIUIAtBGnZBBWxqIgFB////H3EiCUEFaiIFQRp2IANB////H3EgAUEadmoiA2oiAUEadmoiAkEadmoiBEEadmoiDEEfdSIHIANxIAEgDEEfdkEBayIDQf///x9xIgpxciIBQRp0IAUgCnEgByAJcXJyrXwiDzwAACAAIA9CGIg8AAMgACAPQhCIPAACIAAgD0IIiDwAASAAIA4gByAIcSACIApxciICQRR0IAFBBnZyrXwgD0IgiHwiDjwABCAAIA5CGIg8AAcgACAOQhCIPAAGIAAgDkIIiDwABSAAIBEgByANcSAEIApxciIBQQ50IAJBDHZyrXwgDkIgiHwiDjwACCAAIA5CGIg8AAsgACAOQhCIPAAKIAAgDkIIiDwACSAAIBAgAyAMcSAHIAtxckEIdCABQRJ2cq18IA5CIIh8Ig48AAwgACAOQhiIPAAPIAAgDkIQiDwADiAAIA5CCIg8AA0gBkIANwIwIAZCADcCKCAGQgA3AiAgBkIANwIYIAZCADcCECAGQgA3AgggBkIANwIAIAZBkAFqJAALpwwBB38CQCAARQ0AIABBCGsiAyAAQQRrKAIAIgFBeHEiAGohBQJAIAFBAXENACABQQNxRQ0BIAMgAygCACIBayIDQZgIKAIASQ0BIAAgAWohACADQZwIKAIARwRAIAFB/wFNBEAgAygCCCICIAFBA3YiBEEDdEGwCGpGGiACIAMoAgwiAUYEQEGICEGICCgCAEF+IAR3cTYCAAwDCyACIAE2AgwgASACNgIIDAILIAMoAhghBgJAIAMgAygCDCIBRwRAIAMoAggiAiABNgIMIAEgAjYCCAwBCwJAIANBFGoiAigCACIEDQAgA0EQaiICKAIAIgQNAEEAIQEMAQsDQCACIQcgBCIBQRRqIgIoAgAiBA0AIAFBEGohAiABKAIQIgQNAAsgB0EANgIACyAGRQ0BAkAgAyADKAIcIgJBAnRBuApqIgQoAgBGBEAgBCABNgIAIAENAUGMCEGMCCgCAEF+IAJ3cTYCAAwDCyAGQRBBFCAGKAIQIANGG2ogATYCACABRQ0CCyABIAY2AhggAygCECICBEAgASACNgIQIAIgATYCGAsgAygCFCICRQ0BIAEgAjYCFCACIAE2AhgMAQsgBSgCBCIBQQNxQQNHDQBBkAggADYCACAFIAFBfnE2AgQgAyAAQQFyNgIEIAAgA2ogADYCAA8LIAMgBU8NACAFKAIEIgFBAXFFDQACQCABQQJxRQRAIAVBoAgoAgBGBEBBoAggAzYCAEGUCEGUCCgCACAAaiIANgIAIAMgAEEBcjYCBCADQZwIKAIARw0DQZAIQQA2AgBBnAhBADYCAA8LIAVBnAgoAgBGBEBBnAggAzYCAEGQCEGQCCgCACAAaiIANgIAIAMgAEEBcjYCBCAAIANqIAA2AgAPCyABQXhxIABqIQACQCABQf8BTQRAIAUoAggiAiABQQN2IgRBA3RBsAhqRhogAiAFKAIMIgFGBEBBiAhBiAgoAgBBfiAEd3E2AgAMAgsgAiABNgIMIAEgAjYCCAwBCyAFKAIYIQYCQCAFIAUoAgwiAUcEQCAFKAIIIgJBmAgoAgBJGiACIAE2AgwgASACNgIIDAELAkAgBUEUaiICKAIAIgQNACAFQRBqIgIoAgAiBA0AQQAhAQwBCwNAIAIhByAEIgFBFGoiAigCACIEDQAgAUEQaiECIAEoAhAiBA0ACyAHQQA2AgALIAZFDQACQCAFIAUoAhwiAkECdEG4CmoiBCgCAEYEQCAEIAE2AgAgAQ0BQYwIQYwIKAIAQX4gAndxNgIADAILIAZBEEEUIAYoAhAgBUYbaiABNgIAIAFFDQELIAEgBjYCGCAFKAIQIgIEQCABIAI2AhAgAiABNgIYCyAFKAIUIgJFDQAgASACNgIUIAIgATYCGAsgAyAAQQFyNgIEIAAgA2ogADYCACADQZwIKAIARw0BQZAIIAA2AgAPCyAFIAFBfnE2AgQgAyAAQQFyNgIEIAAgA2ogADYCAAsgAEH/AU0EQCAAQQN2IgFBA3RBsAhqIQACf0GICCgCACICQQEgAXQiAXFFBEBBiAggASACcjYCACAADAELIAAoAggLIQIgACADNgIIIAIgAzYCDCADIAA2AgwgAyACNgIIDwtBHyECIANCADcCECAAQf///wdNBEAgAEEIdiIBIAFBgP4/akEQdkEIcSIBdCICIAJBgOAfakEQdkEEcSICdCIEIARBgIAPakEQdkECcSIEdEEPdiABIAJyIARyayIBQQF0IAAgAUEVanZBAXFyQRxqIQILIAMgAjYCHCACQQJ0QbgKaiEBAkACQAJAQYwIKAIAIgRBASACdCIHcUUEQEGMCCAEIAdyNgIAIAEgAzYCACADIAE2AhgMAQsgAEEAQRkgAkEBdmsgAkEfRht0IQIgASgCACEBA0AgASIEKAIEQXhxIABGDQIgAkEddiEBIAJBAXQhAiAEIAFBBHFqIgdBEGooAgAiAQ0ACyAHIAM2AhAgAyAENgIYCyADIAM2AgwgAyADNgIIDAELIAQoAggiACADNgIMIAQgAzYCCCADQQA2AhggAyAENgIMIAMgADYCCAtBqAhBqAgoAgBBAWsiAEF/IAAbNgIACwsLCQEAQYEICwIGUA==";if(!W.startsWith(V)){var na=W;W=b.locateFile?b.locateFile(na,B):B+na}function pa(){var a=W;try{if(a==W&&J)return new Uint8Array(J);var c=H(a);if(c)return c;if(E)return E(a);throw"both async and sync fetching of the wasm failed";}catch(d){K(d)}}
function qa(){if(!J&&(x||y)){if("function"===typeof fetch&&!W.startsWith("file://"))return fetch(W,{credentials:"same-origin"}).then(function(a){if(!a.ok)throw"failed to load wasm binary file at '"+W+"'";return a.arrayBuffer()}).catch(function(){return pa()});if(D)return new Promise(function(a,c){D(W,function(d){a(new Uint8Array(d))},c)})}return Promise.resolve().then(function(){return pa()})}
function X(a){for(;0<a.length;){var c=a.shift();if("function"==typeof c)c(b);else{var d=c.m;"number"===typeof d?void 0===c.l?R.get(d)():R.get(d)(c.l):d(void 0===c.l?null:c.l)}}}
var ba=!1,ra="function"===typeof atob?atob:function(a){var c="",d=0;a=a.replace(/[^A-Za-z0-9\+\/=]/g,"");do{var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a.charAt(d++));var f="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a.charAt(d++));var l="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a.charAt(d++));var A="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a.charAt(d++));e=e<<
2|f>>4;f=(f&15)<<4|l>>2;var t=(l&3)<<6|A;c+=String.fromCharCode(e);64!==l&&(c+=String.fromCharCode(f));64!==A&&(c+=String.fromCharCode(t))}while(d<a.length);return c};
function H(a){if(a.startsWith(V)){a=a.slice(V.length);if("boolean"===typeof z&&z){var c=Buffer.from(a,"base64");c=new Uint8Array(c.buffer,c.byteOffset,c.byteLength)}else try{var d=ra(a),e=new Uint8Array(d.length);for(a=0;a<d.length;++a)e[a]=d.charCodeAt(a);c=e}catch(f){throw Error("Converting base64 string to bytes failed.");}return c}}
var sa={a:function(a){var c=P.length;a>>>=0;if(2147483648<a)return!1;for(var d=1;4>=d;d*=2){var e=c*(1+.2/d);e=Math.min(e,a+100663296);e=Math.max(a,e);0<e%65536&&(e+=65536-e%65536);a:{try{L.grow(Math.min(2147483648,e)-ha.byteLength+65535>>>16);ia();var f=1;break a}catch(l){}f=void 0}if(f)return!0}return!1}};
(function(){function a(f){b.asm=f.exports;L=b.asm.b;ia();R=b.asm.j;ka.unshift(b.asm.c);S--;b.monitorRunDependencies&&b.monitorRunDependencies(S);0==S&&(null!==T&&(clearInterval(T),T=null),U&&(f=U,U=null,f()))}function c(f){a(f.instance)}function d(f){return qa().then(function(l){return WebAssembly.instantiate(l,e)}).then(f,function(l){I("failed to asynchronously prepare wasm: "+l);K(l)})}var e={a:sa};S++;b.monitorRunDependencies&&b.monitorRunDependencies(S);if(b.instantiateWasm)try{return b.instantiateWasm(e,
a)}catch(f){return I("Module.instantiateWasm callback failed with error: "+f),!1}(function(){return J||"function"!==typeof WebAssembly.instantiateStreaming||W.startsWith(V)||W.startsWith("file://")||"function"!==typeof fetch?d(c):fetch(W,{credentials:"same-origin"}).then(function(f){return WebAssembly.instantiateStreaming(f,e).then(c,function(l){I("wasm streaming compile failed: "+l);I("falling back to ArrayBuffer instantiation");return d(c)})})})().catch(r);return{}})();
b.___wasm_call_ctors=function(){return(b.___wasm_call_ctors=b.asm.c).apply(null,arguments)};b._poly1305_auth=function(){return(b._poly1305_auth=b.asm.d).apply(null,arguments)};var da=b.stackSave=function(){return(da=b.stackSave=b.asm.e).apply(null,arguments)},fa=b.stackRestore=function(){return(fa=b.stackRestore=b.asm.f).apply(null,arguments)},O=b.stackAlloc=function(){return(O=b.stackAlloc=b.asm.g).apply(null,arguments)};b._malloc=function(){return(b._malloc=b.asm.h).apply(null,arguments)};
b._free=function(){return(b._free=b.asm.i).apply(null,arguments)};b.cwrap=function(a,c,d,e){d=d||[];var f=d.every(function(l){return"number"===l});return"string"!==c&&f&&!e?N(a):function(){return ca(a,c,d,arguments)}};var Y;U=function ta(){Y||Z();Y||(U=ta)};
function Z(){function a(){if(!Y&&(Y=!0,b.calledRun=!0,!M)){X(ka);q(b);if(b.onRuntimeInitialized)b.onRuntimeInitialized();if(b.postRun)for("function"==typeof b.postRun&&(b.postRun=[b.postRun]);b.postRun.length;){var c=b.postRun.shift();la.unshift(c)}X(la)}}if(!(0<S)){if(b.preRun)for("function"==typeof b.preRun&&(b.preRun=[b.preRun]);b.preRun.length;)ma();X(ja);0<S||(b.setStatus?(b.setStatus("Running..."),setTimeout(function(){setTimeout(function(){b.setStatus("")},1);a()},1)):a())}}b.run=Z;
if(b.preInit)for("function"==typeof b.preInit&&(b.preInit=[b.preInit]);0<b.preInit.length;)b.preInit.pop()();Z();


  return createPoly1305.ready
}
);
})();
if (true)
  module.exports = createPoly1305;
else {}


/***/ }),

/***/ 172:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const MESSAGE_HANDLERS = new Array(256);
[
  __nccwpck_require__(4126).HANDLERS,
  __nccwpck_require__(6475),
].forEach((handlers) => {
  // eslint-disable-next-line prefer-const
  for (let [type, handler] of Object.entries(handlers)) {
    type = +type;
    if (isFinite(type) && type >= 0 && type < MESSAGE_HANDLERS.length)
      MESSAGE_HANDLERS[type] = handler;
  }
});

module.exports = MESSAGE_HANDLERS;


/***/ }),

/***/ 6475:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const {
  bufferSlice,
  bufferParser,
  doFatalError,
  sigSSHToASN1,
  writeUInt32BE,
} = __nccwpck_require__(9475);

const {
  CHANNEL_OPEN_FAILURE,
  COMPAT,
  MESSAGE,
  TERMINAL_MODE,
} = __nccwpck_require__(6832);

const {
  parseKey,
} = __nccwpck_require__(2218);

const TERMINAL_MODE_BY_VALUE =
  Array.from(Object.entries(TERMINAL_MODE))
       .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

module.exports = {
  // Transport layer protocol ==================================================
  [MESSAGE.DISCONNECT]: (self, payload) => {
    /*
      byte      SSH_MSG_DISCONNECT
      uint32    reason code
      string    description in ISO-10646 UTF-8 encoding
      string    language tag
    */
    bufferParser.init(payload, 1);
    const reason = bufferParser.readUInt32BE();
    const desc = bufferParser.readString(true);
    const lang = bufferParser.readString();
    bufferParser.clear();

    if (lang === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed DISCONNECT packet'
      );
    }

    self._debug && self._debug(
      `Inbound: Received DISCONNECT (${reason}, "${desc}")`
    );

    const handler = self._handlers.DISCONNECT;
    handler && handler(self, reason, desc);
  },
  [MESSAGE.IGNORE]: (self, payload) => {
    /*
      byte      SSH_MSG_IGNORE
      string    data
    */
    self._debug && self._debug('Inbound: Received IGNORE');
  },
  [MESSAGE.UNIMPLEMENTED]: (self, payload) => {
    /*
      byte      SSH_MSG_UNIMPLEMENTED
      uint32    packet sequence number of rejected message
    */
    bufferParser.init(payload, 1);
    const seqno = bufferParser.readUInt32BE();
    bufferParser.clear();

    if (seqno === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed UNIMPLEMENTED packet'
      );
    }

    self._debug
      && self._debug(`Inbound: Received UNIMPLEMENTED (seqno ${seqno})`);
  },
  [MESSAGE.DEBUG]: (self, payload) => {
    /*
      byte      SSH_MSG_DEBUG
      boolean   always_display
      string    message in ISO-10646 UTF-8 encoding [RFC3629]
      string    language tag [RFC3066]
    */
    bufferParser.init(payload, 1);
    const display = bufferParser.readBool();
    const msg = bufferParser.readString(true);
    const lang = bufferParser.readString();
    bufferParser.clear();

    if (lang === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed DEBUG packet'
      );
    }

    self._debug && self._debug('Inbound: Received DEBUG');

    const handler = self._handlers.DEBUG;
    handler && handler(self, display, msg);
  },
  [MESSAGE.SERVICE_REQUEST]: (self, payload) => {
    /*
      byte      SSH_MSG_SERVICE_REQUEST
      string    service name
    */
    bufferParser.init(payload, 1);
    const name = bufferParser.readString(true);
    bufferParser.clear();

    if (name === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed SERVICE_REQUEST packet'
      );
    }

    self._debug && self._debug(`Inbound: Received SERVICE_REQUEST (${name})`);

    const handler = self._handlers.SERVICE_REQUEST;
    handler && handler(self, name);
  },
  [MESSAGE.SERVICE_ACCEPT]: (self, payload) => {
    // S->C
    /*
      byte      SSH_MSG_SERVICE_ACCEPT
      string    service name
    */
    bufferParser.init(payload, 1);
    const name = bufferParser.readString(true);
    bufferParser.clear();

    if (name === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed SERVICE_ACCEPT packet'
      );
    }

    self._debug && self._debug(`Inbound: Received SERVICE_ACCEPT (${name})`);

    const handler = self._handlers.SERVICE_ACCEPT;
    handler && handler(self, name);
  },

  // User auth protocol -- generic =============================================
  [MESSAGE.USERAUTH_REQUEST]: (self, payload) => {
    /*
      byte      SSH_MSG_USERAUTH_REQUEST
      string    user name in ISO-10646 UTF-8 encoding [RFC3629]
      string    service name in US-ASCII
      string    method name in US-ASCII
      ....      method specific fields
    */
    bufferParser.init(payload, 1);
    const user = bufferParser.readString(true);
    const service = bufferParser.readString(true);
    const method = bufferParser.readString(true);
    let methodData;
    let methodDesc;
    switch (method) {
      case 'none':
        methodData = null;
        break;
      case 'password': {
        /*
          boolean   <new password follows (old) plaintext password?>
          string    plaintext password in ISO-10646 UTF-8 encoding [RFC3629]
         [string    new password]
        */
        const isChange = bufferParser.readBool();
        if (isChange !== undefined) {
          methodData = bufferParser.readString(true);
          if (methodData !== undefined && isChange) {
            const newPassword = bufferParser.readString(true);
            if (newPassword !== undefined)
              methodData = { oldPassword: methodData, newPassword };
            else
              methodData = undefined;
          }
        }
        break;
      }
      case 'publickey': {
        /*
          boolean   <signature follows public key blob?>
          string    public key algorithm name
          string    public key blob
         [string    signature]
        */
        const hasSig = bufferParser.readBool();
        if (hasSig !== undefined) {
          const keyAlgo = bufferParser.readString(true);
          const key = bufferParser.readString();
          if (hasSig) {
            const blobEnd = bufferParser.pos();
            let signature = bufferParser.readString();
            if (signature !== undefined) {
              if (signature.length > (4 + keyAlgo.length + 4)
                  && signature.utf8Slice(4, 4 + keyAlgo.length) === keyAlgo) {
                // Skip algoLen + algo + sigLen
                signature = bufferSlice(signature, 4 + keyAlgo.length + 4);
              }

              signature = sigSSHToASN1(signature, keyAlgo);
              if (signature) {
                const sessionID = self._kex.sessionID;
                const blob = Buffer.allocUnsafe(4 + sessionID.length + blobEnd);
                writeUInt32BE(blob, sessionID.length, 0);
                blob.set(sessionID, 4);
                blob.set(
                  new Uint8Array(payload.buffer, payload.byteOffset, blobEnd),
                  4 + sessionID.length
                );
                methodData = {
                  keyAlgo,
                  key,
                  signature,
                  blob,
                };
              }
            }
          } else {
            methodData = { keyAlgo, key };
            methodDesc = 'publickey -- check';
          }
        }
        break;
      }
      case 'hostbased': {
        /*
          string    public key algorithm for host key
          string    public host key and certificates for client host
          string    client host name expressed as the FQDN in US-ASCII
          string    user name on the client host in ISO-10646 UTF-8 encoding
                     [RFC3629]
          string    signature
        */
        const keyAlgo = bufferParser.readString(true);
        const key = bufferParser.readString();
        const localHostname = bufferParser.readString(true);
        const localUsername = bufferParser.readString(true);

        const blobEnd = bufferParser.pos();
        let signature = bufferParser.readString();
        if (signature !== undefined) {
          if (signature.length > (4 + keyAlgo.length + 4)
              && signature.utf8Slice(4, 4 + keyAlgo.length) === keyAlgo) {
            // Skip algoLen + algo + sigLen
            signature = bufferSlice(signature, 4 + keyAlgo.length + 4);
          }

          signature = sigSSHToASN1(signature, keyAlgo);
          if (signature !== undefined) {
            const sessionID = self._kex.sessionID;
            const blob = Buffer.allocUnsafe(4 + sessionID.length + blobEnd);
            writeUInt32BE(blob, sessionID.length, 0);
            blob.set(sessionID, 4);
            blob.set(
              new Uint8Array(payload.buffer, payload.byteOffset, blobEnd),
              4 + sessionID.length
            );
            methodData = {
              keyAlgo,
              key,
              signature,
              blob,
              localHostname,
              localUsername,
            };
          }
        }
        break;
      }
      case 'keyboard-interactive':
        /*
          string    language tag (as defined in [RFC-3066])
          string    submethods (ISO-10646 UTF-8)
        */
        // Skip/ignore language field -- it's deprecated in RFC 4256
        bufferParser.skipString();

        methodData = bufferParser.readList();
        break;
      default:
        if (method !== undefined)
          methodData = bufferParser.readRaw();
    }
    bufferParser.clear();

    if (methodData === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed USERAUTH_REQUEST packet'
      );
    }

    if (methodDesc === undefined)
      methodDesc = method;

    self._authsQueue.push(method);

    self._debug
      && self._debug(`Inbound: Received USERAUTH_REQUEST (${methodDesc})`);

    const handler = self._handlers.USERAUTH_REQUEST;
    handler && handler(self, user, service, method, methodData);
  },
  [MESSAGE.USERAUTH_FAILURE]: (self, payload) => {
    // S->C
    /*
      byte         SSH_MSG_USERAUTH_FAILURE
      name-list    authentications that can continue
      boolean      partial success
    */
    bufferParser.init(payload, 1);
    const authMethods = bufferParser.readList();
    const partialSuccess = bufferParser.readBool();
    bufferParser.clear();

    if (partialSuccess === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed USERAUTH_FAILURE packet'
      );
    }

    self._debug
      && self._debug(`Inbound: Received USERAUTH_FAILURE (${authMethods})`);

    self._authsQueue.shift();
    const handler = self._handlers.USERAUTH_FAILURE;
    handler && handler(self, authMethods, partialSuccess);
  },
  [MESSAGE.USERAUTH_SUCCESS]: (self, payload) => {
    // S->C
    /*
      byte      SSH_MSG_USERAUTH_SUCCESS
    */
    self._debug && self._debug('Inbound: Received USERAUTH_SUCCESS');

    self._authsQueue.shift();
    const handler = self._handlers.USERAUTH_SUCCESS;
    handler && handler(self);
  },
  [MESSAGE.USERAUTH_BANNER]: (self, payload) => {
    // S->C
    /*
      byte      SSH_MSG_USERAUTH_BANNER
      string    message in ISO-10646 UTF-8 encoding [RFC3629]
      string    language tag [RFC3066]
    */
    bufferParser.init(payload, 1);
    const msg = bufferParser.readString(true);
    const lang = bufferParser.readString();
    bufferParser.clear();

    if (lang === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed USERAUTH_BANNER packet'
      );
    }

    self._debug && self._debug('Inbound: Received USERAUTH_BANNER');

    const handler = self._handlers.USERAUTH_BANNER;
    handler && handler(self, msg);
  },

  // User auth protocol -- method-specific =====================================
  60: (self, payload) => {
    if (!self._authsQueue.length) {
      self._debug
        && self._debug('Inbound: Received payload type 60 without auth');
      return;
    }

    switch (self._authsQueue[0]) {
      case 'password': {
        // S->C
        /*
          byte      SSH_MSG_USERAUTH_PASSWD_CHANGEREQ
          string    prompt in ISO-10646 UTF-8 encoding [RFC3629]
          string    language tag [RFC3066]
        */
        bufferParser.init(payload, 1);
        const prompt = bufferParser.readString(true);
        const lang = bufferParser.readString();
        bufferParser.clear();

        if (lang === undefined) {
          return doFatalError(
            self,
            'Inbound: Malformed USERAUTH_PASSWD_CHANGEREQ packet'
          );
        }

        self._debug
          && self._debug('Inbound: Received USERAUTH_PASSWD_CHANGEREQ');

        const handler = self._handlers.USERAUTH_PASSWD_CHANGEREQ;
        handler && handler(self, prompt);
        break;
      }
      case 'publickey': {
        // S->C
        /*
          byte      SSH_MSG_USERAUTH_PK_OK
          string    public key algorithm name from the request
          string    public key blob from the request
        */
        bufferParser.init(payload, 1);
        const keyAlgo = bufferParser.readString(true);
        const key = bufferParser.readString();
        bufferParser.clear();

        if (key === undefined) {
          return doFatalError(
            self,
            'Inbound: Malformed USERAUTH_PK_OK packet'
          );
        }

        self._debug && self._debug('Inbound: Received USERAUTH_PK_OK');

        self._authsQueue.shift();
        const handler = self._handlers.USERAUTH_PK_OK;
        handler && handler(self, keyAlgo, key);
        break;
      }
      case 'keyboard-interactive': {
        // S->C
        /*
          byte      SSH_MSG_USERAUTH_INFO_REQUEST
          string    name (ISO-10646 UTF-8)
          string    instruction (ISO-10646 UTF-8)
          string    language tag (as defined in [RFC-3066])
          int       num-prompts
          string    prompt[1] (ISO-10646 UTF-8)
          boolean   echo[1]
          ...
          string    prompt[num-prompts] (ISO-10646 UTF-8)
          boolean   echo[num-prompts]
        */
        bufferParser.init(payload, 1);
        const name = bufferParser.readString(true);
        const instructions = bufferParser.readString(true);
        bufferParser.readString(); // skip lang
        const numPrompts = bufferParser.readUInt32BE();
        let prompts;
        if (numPrompts !== undefined) {
          prompts = new Array(numPrompts);
          let i;
          for (i = 0; i < numPrompts; ++i) {
            const prompt = bufferParser.readString(true);
            const echo = bufferParser.readBool();
            if (echo === undefined)
              break;
            prompts[i] = { prompt, echo };
          }
          if (i !== numPrompts)
            prompts = undefined;
        }
        bufferParser.clear();

        if (prompts === undefined) {
          return doFatalError(
            self,
            'Inbound: Malformed USERAUTH_INFO_REQUEST packet'
          );
        }

        self._debug && self._debug('Inbound: Received USERAUTH_INFO_REQUEST');

        const handler = self._handlers.USERAUTH_INFO_REQUEST;
        handler && handler(self, name, instructions, prompts);
        break;
      }
      default:
        self._debug
          && self._debug('Inbound: Received unexpected payload type 60');
    }
  },
  61: (self, payload) => {
    if (!self._authsQueue.length) {
      self._debug
        && self._debug('Inbound: Received payload type 61 without auth');
      return;
    }
    /*
      byte      SSH_MSG_USERAUTH_INFO_RESPONSE
      int       num-responses
      string    response[1] (ISO-10646 UTF-8)
      ...
      string    response[num-responses] (ISO-10646 UTF-8)
    */
    if (self._authsQueue[0] !== 'keyboard-interactive') {
      return doFatalError(
        self,
        'Inbound: Received unexpected payload type 61'
      );
    }
    bufferParser.init(payload, 1);
    const numResponses = bufferParser.readUInt32BE();
    let responses;
    if (numResponses !== undefined) {
      responses = new Array(numResponses);
      let i;
      for (i = 0; i < numResponses; ++i) {
        const response = bufferParser.readString(true);
        if (response === undefined)
          break;
        responses[i] = response;
      }
      if (i !== numResponses)
        responses = undefined;
    }
    bufferParser.clear();

    if (responses === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed USERAUTH_INFO_RESPONSE packet'
      );
    }

    self._debug && self._debug('Inbound: Received USERAUTH_INFO_RESPONSE');

    const handler = self._handlers.USERAUTH_INFO_RESPONSE;
    handler && handler(self, responses);
  },

  // Connection protocol -- generic ============================================
  [MESSAGE.GLOBAL_REQUEST]: (self, payload) => {
    /*
      byte      SSH_MSG_GLOBAL_REQUEST
      string    request name in US-ASCII only
      boolean   want reply
      ....      request-specific data follows
    */
    bufferParser.init(payload, 1);
    const name = bufferParser.readString(true);
    const wantReply = bufferParser.readBool();
    let data;
    if (wantReply !== undefined) {
      switch (name) {
        case 'tcpip-forward':
        case 'cancel-tcpip-forward': {
          /*
            string    address to bind (e.g., "0.0.0.0")
            uint32    port number to bind
          */
          const bindAddr = bufferParser.readString(true);
          const bindPort = bufferParser.readUInt32BE();
          if (bindPort !== undefined)
            data = { bindAddr, bindPort };
          break;
        }
        case 'streamlocal-forward@openssh.com':
        case 'cancel-streamlocal-forward@openssh.com': {
          /*
            string    socket path
          */
          const socketPath = bufferParser.readString(true);
          if (socketPath !== undefined)
            data = { socketPath };
          break;
        }
        case 'no-more-sessions@openssh.com':
          data = null;
          break;
        case 'hostkeys-00@openssh.com': {
          data = [];
          while (bufferParser.avail() > 0) {
            const keyRaw = bufferParser.readString();
            if (keyRaw === undefined) {
              data = undefined;
              break;
            }
            const key = parseKey(keyRaw);
            if (!(key instanceof Error))
              data.push(key);
          }
          break;
        }
        default:
          data = bufferParser.readRaw();
      }
    }
    bufferParser.clear();

    if (data === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed GLOBAL_REQUEST packet'
      );
    }

    self._debug && self._debug(`Inbound: GLOBAL_REQUEST (${name})`);

    const handler = self._handlers.GLOBAL_REQUEST;
    if (handler)
      handler(self, name, wantReply, data);
    else
      self.requestFailure(); // Auto reject
  },
  [MESSAGE.REQUEST_SUCCESS]: (self, payload) => {
    /*
      byte      SSH_MSG_REQUEST_SUCCESS
      ....     response specific data
    */
    const data = (payload.length > 1 ? bufferSlice(payload, 1) : null);

    self._debug && self._debug('Inbound: REQUEST_SUCCESS');

    const handler = self._handlers.REQUEST_SUCCESS;
    handler && handler(self, data);
  },
  [MESSAGE.REQUEST_FAILURE]: (self, payload) => {
    /*
      byte      SSH_MSG_REQUEST_FAILURE
    */
    self._debug && self._debug('Inbound: Received REQUEST_FAILURE');

    const handler = self._handlers.REQUEST_FAILURE;
    handler && handler(self);
  },

  // Connection protocol -- channel-related ====================================
  [MESSAGE.CHANNEL_OPEN]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_OPEN
      string    channel type in US-ASCII only
      uint32    sender channel
      uint32    initial window size
      uint32    maximum packet size
      ....      channel type specific data follows
    */
    bufferParser.init(payload, 1);
    const type = bufferParser.readString(true);
    const sender = bufferParser.readUInt32BE();
    const window = bufferParser.readUInt32BE();
    const packetSize = bufferParser.readUInt32BE();
    let channelInfo;

    switch (type) {
      case 'forwarded-tcpip': // S->C
      case 'direct-tcpip': { // C->S
        /*
          string    address that was connected / host to connect
          uint32    port that was connected / port to connect
          string    originator IP address
          uint32    originator port
        */
        const destIP = bufferParser.readString(true);
        const destPort = bufferParser.readUInt32BE();
        const srcIP = bufferParser.readString(true);
        const srcPort = bufferParser.readUInt32BE();
        if (srcPort !== undefined) {
          channelInfo = {
            type,
            sender,
            window,
            packetSize,
            data: { destIP, destPort, srcIP, srcPort }
          };
        }
        break;
      }
      case 'forwarded-streamlocal@openssh.com': // S->C
      case 'direct-streamlocal@openssh.com': { // C->S
        /*
          string    socket path
          string    reserved for future use

          (direct-streamlocal@openssh.com additionally has:)
          uint32    reserved
        */
        const socketPath = bufferParser.readString(true);
        if (socketPath !== undefined) {
          channelInfo = {
            type,
            sender,
            window,
            packetSize,
            data: { socketPath }
          };
        }
        break;
      }
      case 'x11': { // S->C
        /*
          string    originator address (e.g., "192.168.7.38")
          uint32    originator port
        */
        const srcIP = bufferParser.readString(true);
        const srcPort = bufferParser.readUInt32BE();
        if (srcPort !== undefined) {
          channelInfo = {
            type,
            sender,
            window,
            packetSize,
            data: { srcIP, srcPort }
          };
        }
        break;
      }
      default:
        // Includes:
        //   'session' (C->S)
        //   'auth-agent@openssh.com' (S->C)
        channelInfo = {
          type,
          sender,
          window,
          packetSize,
          data: {}
        };
    }
    bufferParser.clear();

    if (channelInfo === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_OPEN packet'
      );
    }

    self._debug && self._debug(`Inbound: CHANNEL_OPEN (s:${sender}, ${type})`);

    const handler = self._handlers.CHANNEL_OPEN;
    if (handler) {
      handler(self, channelInfo);
    } else {
      self.channelOpenFail(
        channelInfo.sender,
        CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED,
        '',
        ''
      );
    }
  },
  [MESSAGE.CHANNEL_OPEN_CONFIRMATION]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_OPEN_CONFIRMATION
      uint32    recipient channel
      uint32    sender channel
      uint32    initial window size
      uint32    maximum packet size
      ....      channel type specific data follows
    */
    // "The 'recipient channel' is the channel number given in the
    // original open request, and 'sender channel' is the channel number
    // allocated by the other side."
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    const sender = bufferParser.readUInt32BE();
    const window = bufferParser.readUInt32BE();
    const packetSize = bufferParser.readUInt32BE();
    const data = (bufferParser.avail() ? bufferParser.readRaw() : undefined);
    bufferParser.clear();

    if (packetSize === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_OPEN_CONFIRMATION packet'
      );
    }

    self._debug && self._debug(
      `Inbound: CHANNEL_OPEN_CONFIRMATION (r:${recipient}, s:${sender})`
    );

    const handler = self._handlers.CHANNEL_OPEN_CONFIRMATION;
    if (handler)
      handler(self, { recipient, sender, window, packetSize, data });
  },
  [MESSAGE.CHANNEL_OPEN_FAILURE]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_OPEN_FAILURE
      uint32    recipient channel
      uint32    reason code
      string    description in ISO-10646 UTF-8 encoding [RFC3629]
      string    language tag [RFC3066]
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    const reason = bufferParser.readUInt32BE();
    const description = bufferParser.readString(true);
    const lang = bufferParser.readString();
    bufferParser.clear();

    if (lang === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_OPEN_FAILURE packet'
      );
    }

    self._debug
      && self._debug(`Inbound: CHANNEL_OPEN_FAILURE (r:${recipient})`);

    const handler = self._handlers.CHANNEL_OPEN_FAILURE;
    handler && handler(self, recipient, reason, description);
  },
  [MESSAGE.CHANNEL_WINDOW_ADJUST]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_WINDOW_ADJUST
      uint32    recipient channel
      uint32    bytes to add
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    const bytesToAdd = bufferParser.readUInt32BE();
    bufferParser.clear();

    if (bytesToAdd === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_WINDOW_ADJUST packet'
      );
    }

    self._debug && self._debug(
      `Inbound: CHANNEL_WINDOW_ADJUST (r:${recipient}, ${bytesToAdd})`
    );

    const handler = self._handlers.CHANNEL_WINDOW_ADJUST;
    handler && handler(self, recipient, bytesToAdd);
  },
  [MESSAGE.CHANNEL_DATA]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_DATA
      uint32    recipient channel
      string    data
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    const data = bufferParser.readString();
    bufferParser.clear();

    if (data === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_DATA packet'
      );
    }

    self._debug
      && self._debug(`Inbound: CHANNEL_DATA (r:${recipient}, ${data.length})`);

    const handler = self._handlers.CHANNEL_DATA;
    handler && handler(self, recipient, data);
  },
  [MESSAGE.CHANNEL_EXTENDED_DATA]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_EXTENDED_DATA
      uint32    recipient channel
      uint32    data_type_code
      string    data
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    const type = bufferParser.readUInt32BE();
    const data = bufferParser.readString();
    bufferParser.clear();

    if (data === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_EXTENDED_DATA packet'
      );
    }

    self._debug && self._debug(
      `Inbound: CHANNEL_EXTENDED_DATA (r:${recipient}, ${data.length})`
    );

    const handler = self._handlers.CHANNEL_EXTENDED_DATA;
    handler && handler(self, recipient, data, type);
  },
  [MESSAGE.CHANNEL_EOF]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_EOF
      uint32    recipient channel
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    bufferParser.clear();

    if (recipient === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_EOF packet'
      );
    }

    self._debug && self._debug(`Inbound: CHANNEL_EOF (r:${recipient})`);

    const handler = self._handlers.CHANNEL_EOF;
    handler && handler(self, recipient);
  },
  [MESSAGE.CHANNEL_CLOSE]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_CLOSE
      uint32    recipient channel
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    bufferParser.clear();

    if (recipient === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_CLOSE packet'
      );
    }

    self._debug && self._debug(`Inbound: CHANNEL_CLOSE (r:${recipient})`);

    const handler = self._handlers.CHANNEL_CLOSE;
    handler && handler(self, recipient);
  },
  [MESSAGE.CHANNEL_REQUEST]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_REQUEST
      uint32    recipient channel
      string    request type in US-ASCII characters only
      boolean   want reply
      ....      type-specific data follows
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    const type = bufferParser.readString(true);
    const wantReply = bufferParser.readBool();
    let data;
    if (wantReply !== undefined) {
      switch (type) {
        case 'exit-status': // S->C
          /*
            uint32    exit_status
          */
          data = bufferParser.readUInt32BE();
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type}: ${data})`
          );
          break;
        case 'exit-signal': { // S->C
          /*
            string    signal name (without the "SIG" prefix)
            boolean   core dumped
            string    error message in ISO-10646 UTF-8 encoding
            string    language tag
          */
          let signal;
          let coreDumped;
          if (self._compatFlags & COMPAT.OLD_EXIT) {
            /*
              Instead of `signal name` and `core dumped`, we have just:
                uint32  signal number
            */
            const num = bufferParser.readUInt32BE();
            switch (num) {
              case 1:
                signal = 'HUP';
                break;
              case 2:
                signal = 'INT';
                break;
              case 3:
                signal = 'QUIT';
                break;
              case 6:
                signal = 'ABRT';
                break;
              case 9:
                signal = 'KILL';
                break;
              case 14:
                signal = 'ALRM';
                break;
              case 15:
                signal = 'TERM';
                break;
              default:
                if (num !== undefined) {
                  // Unknown or OS-specific
                  signal = `UNKNOWN (${num})`;
                }
            }
            coreDumped = false;
          } else {
            signal = bufferParser.readString(true);
            coreDumped = bufferParser.readBool();
            if (coreDumped === undefined)
              signal = undefined;
          }
          const errorMessage = bufferParser.readString(true);
          if (bufferParser.skipString() !== undefined)
            data = { signal, coreDumped, errorMessage };
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type}: ${signal})`
          );
          break;
        }
        case 'pty-req': { // C->S
          /*
            string    TERM environment variable value (e.g., vt100)
            uint32    terminal width, characters (e.g., 80)
            uint32    terminal height, rows (e.g., 24)
            uint32    terminal width, pixels (e.g., 640)
            uint32    terminal height, pixels (e.g., 480)
            string    encoded terminal modes
          */
          const term = bufferParser.readString(true);
          const cols = bufferParser.readUInt32BE();
          const rows = bufferParser.readUInt32BE();
          const width = bufferParser.readUInt32BE();
          const height = bufferParser.readUInt32BE();
          const modesBinary = bufferParser.readString();
          if (modesBinary !== undefined) {
            bufferParser.init(modesBinary, 1);
            let modes = {};
            while (bufferParser.avail()) {
              const opcode = bufferParser.readByte();
              if (opcode === TERMINAL_MODE.TTY_OP_END)
                break;
              const name = TERMINAL_MODE_BY_VALUE[opcode];
              const value = bufferParser.readUInt32BE();
              if (opcode === undefined
                  || name === undefined
                  || value === undefined) {
                modes = undefined;
                break;
              }
              modes[name] = value;
            }
            if (modes !== undefined)
              data = { term, cols, rows, width, height, modes };
          }
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type})`
          );
          break;
        }
        case 'window-change': { // C->S
          /*
            uint32    terminal width, columns
            uint32    terminal height, rows
            uint32    terminal width, pixels
            uint32    terminal height, pixels
          */
          const cols = bufferParser.readUInt32BE();
          const rows = bufferParser.readUInt32BE();
          const width = bufferParser.readUInt32BE();
          const height = bufferParser.readUInt32BE();
          if (height !== undefined)
            data = { cols, rows, width, height };
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type})`
          );
          break;
        }
        case 'x11-req': { // C->S
          /*
            boolean   single connection
            string    x11 authentication protocol
            string    x11 authentication cookie
            uint32    x11 screen number
          */
          const single = bufferParser.readBool();
          const protocol = bufferParser.readString(true);
          const cookie = bufferParser.readString();
          const screen = bufferParser.readUInt32BE();
          if (screen !== undefined)
            data = { single, protocol, cookie, screen };
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type})`
          );
          break;
        }
        case 'env': { // C->S
          /*
            string    variable name
            string    variable value
          */
          const name = bufferParser.readString(true);
          const value = bufferParser.readString(true);
          if (value !== undefined)
            data = { name, value };
          if (self._debug) {
            self._debug(
              `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type}: `
                + `${name}=${value})`
            );
          }
          break;
        }
        case 'shell': // C->S
          data = null; // No extra data
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type})`
          );
          break;
        case 'exec': // C->S
          /*
            string    command
          */
          data = bufferParser.readString(true);
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type}: ${data})`
          );
          break;
        case 'subsystem': // C->S
          /*
            string    subsystem name
          */
          data = bufferParser.readString(true);
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type}: ${data})`
          );
          break;
        case 'signal': // C->S
          /*
            string    signal name (without the "SIG" prefix)
          */
          data = bufferParser.readString(true);
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type}: ${data})`
          );
          break;
        case 'xon-xoff': // C->S
          /*
            boolean   client can do
          */
          data = bufferParser.readBool();
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type}: ${data})`
          );
          break;
        case 'auth-agent-req@openssh.com': // C-S
          data = null; // No extra data
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type})`
          );
          break;
        default:
          data = (bufferParser.avail() ? bufferParser.readRaw() : null);
          self._debug && self._debug(
            `Inbound: CHANNEL_REQUEST (r:${recipient}, ${type})`
          );
      }
    }
    bufferParser.clear();

    if (data === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_REQUEST packet'
      );
    }

    const handler = self._handlers.CHANNEL_REQUEST;
    handler && handler(self, recipient, type, wantReply, data);
  },
  [MESSAGE.CHANNEL_SUCCESS]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_SUCCESS
      uint32    recipient channel
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    bufferParser.clear();

    if (recipient === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_SUCCESS packet'
      );
    }

    self._debug && self._debug(`Inbound: CHANNEL_SUCCESS (r:${recipient})`);

    const handler = self._handlers.CHANNEL_SUCCESS;
    handler && handler(self, recipient);
  },
  [MESSAGE.CHANNEL_FAILURE]: (self, payload) => {
    /*
      byte      SSH_MSG_CHANNEL_FAILURE
      uint32    recipient channel
    */
    bufferParser.init(payload, 1);
    const recipient = bufferParser.readUInt32BE();
    bufferParser.clear();

    if (recipient === undefined) {
      return doFatalError(
        self,
        'Inbound: Malformed CHANNEL_FAILURE packet'
      );
    }

    self._debug && self._debug(`Inbound: CHANNEL_FAILURE (r:${recipient})`);

    const handler = self._handlers.CHANNEL_FAILURE;
    handler && handler(self, recipient);
  },
};


/***/ }),

/***/ 4126:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const {
  createDiffieHellman,
  createDiffieHellmanGroup,
  createECDH,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  randomFillSync,
} = __nccwpck_require__(6417);

const { Ber } = __nccwpck_require__(970);

const {
  COMPAT,
  curve25519Supported,
  DEFAULT_KEX,
  DEFAULT_SERVER_HOST_KEY,
  DEFAULT_CIPHER,
  DEFAULT_MAC,
  DEFAULT_COMPRESSION,
  DISCONNECT_REASON,
  MESSAGE,
} = __nccwpck_require__(6832);
const {
  CIPHER_INFO,
  createCipher,
  createDecipher,
  MAC_INFO,
} = __nccwpck_require__(5708);
const { parseDERKey } = __nccwpck_require__(2218);
const {
  bufferFill,
  bufferParser,
  convertSignature,
  doFatalError,
  FastBuffer,
  sigSSHToASN1,
  writeUInt32BE,
} = __nccwpck_require__(9475);
const {
  PacketReader,
  PacketWriter,
  ZlibPacketReader,
  ZlibPacketWriter,
} = __nccwpck_require__(6715);

let MESSAGE_HANDLERS;

const GEX_MIN_BITS = 2048; // RFC 8270
const GEX_MAX_BITS = 8192; // RFC 8270

const EMPTY_BUFFER = Buffer.alloc(0);

// Client/Server
function kexinit(self) {
  /*
    byte         SSH_MSG_KEXINIT
    byte[16]     cookie (random bytes)
    name-list    kex_algorithms
    name-list    server_host_key_algorithms
    name-list    encryption_algorithms_client_to_server
    name-list    encryption_algorithms_server_to_client
    name-list    mac_algorithms_client_to_server
    name-list    mac_algorithms_server_to_client
    name-list    compression_algorithms_client_to_server
    name-list    compression_algorithms_server_to_client
    name-list    languages_client_to_server
    name-list    languages_server_to_client
    boolean      first_kex_packet_follows
    uint32       0 (reserved for future extension)
  */

  let payload;
  if (self._compatFlags & COMPAT.BAD_DHGEX) {
    const entry = self._offer.lists.kex;
    let kex = entry.array;
    let found = false;
    for (let i = 0; i < kex.length; ++i) {
      if (kex[i].indexOf('group-exchange') !== -1) {
        if (!found) {
          found = true;
          // Copy array lazily
          kex = kex.slice();
        }
        kex.splice(i--, 1);
      }
    }
    if (found) {
      let len = 1 + 16 + self._offer.totalSize + 1 + 4;
      const newKexBuf = Buffer.from(kex.join(','));
      len -= (entry.buffer.length - newKexBuf.length);

      const all = self._offer.lists.all;
      const rest = new Uint8Array(
        all.buffer,
        all.byteOffset + 4 + entry.buffer.length,
        all.length - (4 + entry.buffer.length)
      );

      payload = Buffer.allocUnsafe(len);
      writeUInt32BE(payload, newKexBuf.length, 0);
      payload.set(newKexBuf, 4);
      payload.set(rest, 4 + newKexBuf.length);
    }
  }

  if (payload === undefined) {
    payload = Buffer.allocUnsafe(1 + 16 + self._offer.totalSize + 1 + 4);
    self._offer.copyAllTo(payload, 17);
  }

  self._debug && self._debug('Outbound: Sending KEXINIT');

  payload[0] = MESSAGE.KEXINIT;
  randomFillSync(payload, 1, 16);

  // Zero-fill first_kex_packet_follows and reserved bytes
  bufferFill(payload, 0, payload.length - 5);

  self._kexinit = payload;

  // Needed to correct the starting position in allocated "packets" when packets
  // will be buffered due to active key exchange
  self._packetRW.write.allocStart = 0;

  // TODO: only create single buffer and set _kexinit as slice of packet instead
  {
    const p = self._packetRW.write.allocStartKEX;
    const packet = self._packetRW.write.alloc(payload.length, true);
    packet.set(payload, p);
    self._cipher.encrypt(self._packetRW.write.finalize(packet, true));
  }
}

function handleKexInit(self, payload) {
  /*
    byte         SSH_MSG_KEXINIT
    byte[16]     cookie (random bytes)
    name-list    kex_algorithms
    name-list    server_host_key_algorithms
    name-list    encryption_algorithms_client_to_server
    name-list    encryption_algorithms_server_to_client
    name-list    mac_algorithms_client_to_server
    name-list    mac_algorithms_server_to_client
    name-list    compression_algorithms_client_to_server
    name-list    compression_algorithms_server_to_client
    name-list    languages_client_to_server
    name-list    languages_server_to_client
    boolean      first_kex_packet_follows
    uint32       0 (reserved for future extension)
  */
  const init = {
    kex: undefined,
    serverHostKey: undefined,
    cs: {
      cipher: undefined,
      mac: undefined,
      compress: undefined,
      lang: undefined,
    },
    sc: {
      cipher: undefined,
      mac: undefined,
      compress: undefined,
      lang: undefined,
    },
  };

  bufferParser.init(payload, 17);

  if ((init.kex = bufferParser.readList()) === undefined
      || (init.serverHostKey = bufferParser.readList()) === undefined
      || (init.cs.cipher = bufferParser.readList()) === undefined
      || (init.sc.cipher = bufferParser.readList()) === undefined
      || (init.cs.mac = bufferParser.readList()) === undefined
      || (init.sc.mac = bufferParser.readList()) === undefined
      || (init.cs.compress = bufferParser.readList()) === undefined
      || (init.sc.compress = bufferParser.readList()) === undefined
      || (init.cs.lang = bufferParser.readList()) === undefined
      || (init.sc.lang = bufferParser.readList()) === undefined) {
    bufferParser.clear();
    return doFatalError(
      self,
      'Received malformed KEXINIT',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }

  const pos = bufferParser.pos();
  const firstFollows = (pos < payload.length && payload[pos] === 1);
  bufferParser.clear();

  const local = self._offer;
  const remote = init;

  let localKex = local.lists.kex.array;
  if (self._compatFlags & COMPAT.BAD_DHGEX) {
    let found = false;
    for (let i = 0; i < localKex.length; ++i) {
      if (localKex[i].indexOf('group-exchange') !== -1) {
        if (!found) {
          found = true;
          // Copy array lazily
          localKex = localKex.slice();
        }
        localKex.splice(i--, 1);
      }
    }
  }

  let clientList;
  let serverList;
  let i;
  const debug = self._debug;

  debug && debug('Inbound: Handshake in progress');

  // Key exchange method =======================================================
  debug && debug(`Handshake: (local) KEX method: ${localKex}`);
  debug && debug(`Handshake: (remote) KEX method: ${remote.kex}`);
  if (self._server) {
    serverList = localKex;
    clientList = remote.kex;
  } else {
    serverList = remote.kex;
    clientList = localKex;
  }
  // Check for agreeable key exchange algorithm
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching key exchange algorithm');
    return doFatalError(
      self,
      'Handshake failed: no matching key exchange algorithm',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.kex = clientList[i];
  debug && debug(`Handshake: KEX algorithm: ${clientList[i]}`);
  if (firstFollows && (!remote.kex.length || clientList[i] !== remote.kex[0])) {
    // Ignore next inbound packet, it was a wrong first guess at KEX algorithm
    self._skipNextInboundPacket = true;
  }


  // Server host key format ====================================================
  const localSrvHostKey = local.lists.serverHostKey.array;
  debug && debug(`Handshake: (local) Host key format: ${localSrvHostKey}`);
  debug && debug(
    `Handshake: (remote) Host key format: ${remote.serverHostKey}`
  );
  if (self._server) {
    serverList = localSrvHostKey;
    clientList = remote.serverHostKey;
  } else {
    serverList = remote.serverHostKey;
    clientList = localSrvHostKey;
  }
  // Check for agreeable server host key format
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching host key format');
    return doFatalError(
      self,
      'Handshake failed: no matching host key format',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.serverHostKey = clientList[i];
  debug && debug(`Handshake: Host key format: ${clientList[i]}`);


  // Client->Server cipher =====================================================
  const localCSCipher = local.lists.cs.cipher.array;
  debug && debug(`Handshake: (local) C->S cipher: ${localCSCipher}`);
  debug && debug(`Handshake: (remote) C->S cipher: ${remote.cs.cipher}`);
  if (self._server) {
    serverList = localCSCipher;
    clientList = remote.cs.cipher;
  } else {
    serverList = remote.cs.cipher;
    clientList = localCSCipher;
  }
  // Check for agreeable client->server cipher
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching C->S cipher');
    return doFatalError(
      self,
      'Handshake failed: no matching C->S cipher',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.cs.cipher = clientList[i];
  debug && debug(`Handshake: C->S Cipher: ${clientList[i]}`);


  // Server->Client cipher =====================================================
  const localSCCipher = local.lists.sc.cipher.array;
  debug && debug(`Handshake: (local) S->C cipher: ${localSCCipher}`);
  debug && debug(`Handshake: (remote) S->C cipher: ${remote.sc.cipher}`);
  if (self._server) {
    serverList = localSCCipher;
    clientList = remote.sc.cipher;
  } else {
    serverList = remote.sc.cipher;
    clientList = localSCCipher;
  }
  // Check for agreeable server->client cipher
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching S->C cipher');
    return doFatalError(
      self,
      'Handshake failed: no matching S->C cipher',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.sc.cipher = clientList[i];
  debug && debug(`Handshake: S->C cipher: ${clientList[i]}`);


  // Client->Server MAC ========================================================
  const localCSMAC = local.lists.cs.mac.array;
  debug && debug(`Handshake: (local) C->S MAC: ${localCSMAC}`);
  debug && debug(`Handshake: (remote) C->S MAC: ${remote.cs.mac}`);
  if (CIPHER_INFO[init.cs.cipher].authLen > 0) {
    init.cs.mac = '';
    debug && debug('Handshake: C->S MAC: <implicit>');
  } else {
    if (self._server) {
      serverList = localCSMAC;
      clientList = remote.cs.mac;
    } else {
      serverList = remote.cs.mac;
      clientList = localCSMAC;
    }
    // Check for agreeable client->server hmac algorithm
    for (i = 0;
         i < clientList.length && serverList.indexOf(clientList[i]) === -1;
         ++i);
    if (i === clientList.length) {
      // No suitable match found!
      debug && debug('Handshake: No matching C->S MAC');
      return doFatalError(
        self,
        'Handshake failed: no matching C->S MAC',
        'handshake',
        DISCONNECT_REASON.KEY_EXCHANGE_FAILED
      );
    }
    init.cs.mac = clientList[i];
    debug && debug(`Handshake: C->S MAC: ${clientList[i]}`);
  }


  // Server->Client MAC ========================================================
  const localSCMAC = local.lists.sc.mac.array;
  debug && debug(`Handshake: (local) S->C MAC: ${localSCMAC}`);
  debug && debug(`Handshake: (remote) S->C MAC: ${remote.sc.mac}`);
  if (CIPHER_INFO[init.sc.cipher].authLen > 0) {
    init.sc.mac = '';
    debug && debug('Handshake: S->C MAC: <implicit>');
  } else {
    if (self._server) {
      serverList = localSCMAC;
      clientList = remote.sc.mac;
    } else {
      serverList = remote.sc.mac;
      clientList = localSCMAC;
    }
    // Check for agreeable server->client hmac algorithm
    for (i = 0;
         i < clientList.length && serverList.indexOf(clientList[i]) === -1;
         ++i);
    if (i === clientList.length) {
      // No suitable match found!
      debug && debug('Handshake: No matching S->C MAC');
      return doFatalError(
        self,
        'Handshake failed: no matching S->C MAC',
        'handshake',
        DISCONNECT_REASON.KEY_EXCHANGE_FAILED
      );
    }
    init.sc.mac = clientList[i];
    debug && debug(`Handshake: S->C MAC: ${clientList[i]}`);
  }


  // Client->Server compression ================================================
  const localCSCompress = local.lists.cs.compress.array;
  debug && debug(`Handshake: (local) C->S compression: ${localCSCompress}`);
  debug && debug(`Handshake: (remote) C->S compression: ${remote.cs.compress}`);
  if (self._server) {
    serverList = localCSCompress;
    clientList = remote.cs.compress;
  } else {
    serverList = remote.cs.compress;
    clientList = localCSCompress;
  }
  // Check for agreeable client->server compression algorithm
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching C->S compression');
    return doFatalError(
      self,
      'Handshake failed: no matching C->S compression',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.cs.compress = clientList[i];
  debug && debug(`Handshake: C->S compression: ${clientList[i]}`);


  // Server->Client compression ================================================
  const localSCCompress = local.lists.sc.compress.array;
  debug && debug(`Handshake: (local) S->C compression: ${localSCCompress}`);
  debug && debug(`Handshake: (remote) S->C compression: ${remote.sc.compress}`);
  if (self._server) {
    serverList = localSCCompress;
    clientList = remote.sc.compress;
  } else {
    serverList = remote.sc.compress;
    clientList = localSCCompress;
  }
  // Check for agreeable server->client compression algorithm
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching S->C compression');
    return doFatalError(
      self,
      'Handshake failed: no matching S->C compression',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.sc.compress = clientList[i];
  debug && debug(`Handshake: S->C compression: ${clientList[i]}`);

  init.cs.lang = '';
  init.sc.lang = '';

  // XXX: hack -- find a better way to do this
  if (self._kex) {
    if (!self._kexinit) {
      // We received a rekey request, but we haven't sent a KEXINIT in response
      // yet
      kexinit(self);
    }
    self._decipher._onPayload = onKEXPayload.bind(self, { firstPacket: false });
  }

  self._kex = createKeyExchange(init, self, payload);
  self._kex.start();
}

const createKeyExchange = (() => {
  function convertToMpint(buf) {
    let idx = 0;
    let length = buf.length;
    while (buf[idx] === 0x00) {
      ++idx;
      --length;
    }
    let newBuf;
    if (buf[idx] & 0x80) {
      newBuf = Buffer.allocUnsafe(1 + length);
      newBuf[0] = 0;
      buf.copy(newBuf, 1, idx);
      buf = newBuf;
    } else if (length !== buf.length) {
      newBuf = Buffer.allocUnsafe(length);
      buf.copy(newBuf, 0, idx);
      buf = newBuf;
    }
    return buf;
  }

  class KeyExchange {
    constructor(negotiated, protocol, remoteKexinit) {
      this._protocol = protocol;

      this.sessionID = (protocol._kex ? protocol._kex.sessionID : undefined);
      this.negotiated = negotiated;
      this._step = 1;
      this._public = null;
      this._dh = null;
      this._sentNEWKEYS = false;
      this._receivedNEWKEYS = false;
      this._finished = false;
      this._hostVerified = false;

      // Data needed for initializing cipher/decipher/etc.
      this._kexinit = protocol._kexinit;
      this._remoteKexinit = remoteKexinit;
      this._identRaw = protocol._identRaw;
      this._remoteIdentRaw = protocol._remoteIdentRaw;
      this._hostKey = undefined;
      this._dhData = undefined;
      this._sig = undefined;
    }
    finish() {
      if (this._finished)
        return false;
      this._finished = true;

      const isServer = this._protocol._server;
      const negotiated = this.negotiated;

      const pubKey = this.convertPublicKey(this._dhData);
      let secret = this.computeSecret(this._dhData);
      if (secret instanceof Error) {
        secret.message =
          `Error while computing DH secret (${this.type}): ${secret.message}`;
        secret.level = 'handshake';
        return doFatalError(
          this._protocol,
          secret,
          DISCONNECT_REASON.KEY_EXCHANGE_FAILED
        );
      }

      const hash = createHash(this.hashName);
      // V_C
      hashString(hash, (isServer ? this._remoteIdentRaw : this._identRaw));
      // "V_S"
      hashString(hash, (isServer ? this._identRaw : this._remoteIdentRaw));
      // "I_C"
      hashString(hash, (isServer ? this._remoteKexinit : this._kexinit));
      // "I_S"
      hashString(hash, (isServer ? this._kexinit : this._remoteKexinit));
      // "K_S"
      const serverPublicHostKey = (isServer
                                   ? this._hostKey.getPublicSSH()
                                   : this._hostKey);
      hashString(hash, serverPublicHostKey);

      if (this.type === 'groupex') {
        // Group exchange-specific
        const params = this.getDHParams();
        const num = Buffer.allocUnsafe(4);
        // min (uint32)
        writeUInt32BE(num, this._minBits, 0);
        hash.update(num);
        // preferred (uint32)
        writeUInt32BE(num, this._prefBits, 0);
        hash.update(num);
        // max (uint32)
        writeUInt32BE(num, this._maxBits, 0);
        hash.update(num);
        // prime
        hashString(hash, params.prime);
        // generator
        hashString(hash, params.generator);
      }

      // method-specific data sent by client
      hashString(hash, (isServer ? pubKey : this.getPublicKey()));
      // method-specific data sent by server
      const serverPublicKey = (isServer ? this.getPublicKey() : pubKey);
      hashString(hash, serverPublicKey);
      // shared secret ("K")
      hashString(hash, secret);

      // "H"
      const exchangeHash = hash.digest();

      if (!isServer) {
        bufferParser.init(this._sig, 0);
        const sigType = bufferParser.readString(true);

        if (!sigType) {
          return doFatalError(
            this._protocol,
            'Malformed packet while reading signature',
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        if (sigType !== negotiated.serverHostKey) {
          return doFatalError(
            this._protocol,
            `Wrong signature type: ${sigType}, `
              + `expected: ${negotiated.serverHostKey}`,
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        // "s"
        let sigValue = bufferParser.readString();

        bufferParser.clear();

        if (sigValue === undefined) {
          return doFatalError(
            this._protocol,
            'Malformed packet while reading signature',
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        if (!(sigValue = sigSSHToASN1(sigValue, sigType))) {
          return doFatalError(
            this._protocol,
            'Malformed signature',
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        let parsedHostKey;
        {
          bufferParser.init(this._hostKey, 0);
          const name = bufferParser.readString(true);
          const hostKey = this._hostKey.slice(bufferParser.pos());
          bufferParser.clear();
          parsedHostKey = parseDERKey(hostKey, name);
          if (parsedHostKey instanceof Error) {
            parsedHostKey.level = 'handshake';
            return doFatalError(
              this._protocol,
              parsedHostKey,
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }
        }

        let hashAlgo;
        // Check if we need to override the default hash algorithm
        switch (this.negotiated.serverHostKey) {
          case 'rsa-sha2-256': hashAlgo = 'sha256'; break;
          case 'rsa-sha2-512': hashAlgo = 'sha512'; break;
        }

        this._protocol._debug
          && this._protocol._debug('Verifying signature ...');

        const verified = parsedHostKey.verify(exchangeHash, sigValue, hashAlgo);
        if (verified !== true) {
          if (verified instanceof Error) {
            this._protocol._debug && this._protocol._debug(
              `Signature verification failed: ${verified.stack}`
            );
          } else {
            this._protocol._debug && this._protocol._debug(
              'Signature verification failed'
            );
          }
          return doFatalError(
            this._protocol,
            'Handshake failed: signature verification failed',
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }
        this._protocol._debug && this._protocol._debug('Verified signature');
      } else {
        // Server

        let hashAlgo;
        // Check if we need to override the default hash algorithm
        switch (this.negotiated.serverHostKey) {
          case 'rsa-sha2-256': hashAlgo = 'sha256'; break;
          case 'rsa-sha2-512': hashAlgo = 'sha512'; break;
        }

        this._protocol._debug && this._protocol._debug(
          'Generating signature ...'
        );

        let signature = this._hostKey.sign(exchangeHash, hashAlgo);
        if (signature instanceof Error) {
          return doFatalError(
            this._protocol,
            'Handshake failed: signature generation failed for '
              + `${this._hostKey.type} host key: ${signature.message}`,
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        signature = convertSignature(signature, this._hostKey.type);
        if (signature === false) {
          return doFatalError(
            this._protocol,
            'Handshake failed: signature conversion failed for '
              + `${this._hostKey.type} host key`,
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        // Send KEX reply
        /*
          byte      SSH_MSG_KEXDH_REPLY
                      / SSH_MSG_KEX_DH_GEX_REPLY
                      / SSH_MSG_KEX_ECDH_REPLY
          string    server public host key and certificates (K_S)
          string    <method-specific data>
          string    signature of H
        */
        const sigType = this.negotiated.serverHostKey;
        const sigTypeLen = Buffer.byteLength(sigType);
        const sigLen = 4 + sigTypeLen + 4 + signature.length;
        let p = this._protocol._packetRW.write.allocStartKEX;
        const packet = this._protocol._packetRW.write.alloc(
          1
            + 4 + serverPublicHostKey.length
            + 4 + serverPublicKey.length
            + 4 + sigLen,
          true
        );

        packet[p] = MESSAGE.KEXDH_REPLY;

        writeUInt32BE(packet, serverPublicHostKey.length, ++p);
        packet.set(serverPublicHostKey, p += 4);

        writeUInt32BE(packet,
                      serverPublicKey.length,
                      p += serverPublicHostKey.length);
        packet.set(serverPublicKey, p += 4);

        writeUInt32BE(packet, sigLen, p += serverPublicKey.length);

        writeUInt32BE(packet, sigTypeLen, p += 4);
        packet.utf8Write(sigType, p += 4, sigTypeLen);

        writeUInt32BE(packet, signature.length, p += sigTypeLen);
        packet.set(signature, p += 4);

        if (this._protocol._debug) {
          let type;
          switch (this.type) {
            case 'group':
              type = 'KEXDH_REPLY';
              break;
            case 'groupex':
              type = 'KEXDH_GEX_REPLY';
              break;
            default:
              type = 'KEXECDH_REPLY';
          }
          this._protocol._debug(`Outbound: Sending ${type}`);
        }
        this._protocol._cipher.encrypt(
          this._protocol._packetRW.write.finalize(packet, true)
        );
      }
      trySendNEWKEYS(this);

      const completeHandshake = () => {
        if (!this.sessionID)
          this.sessionID = exchangeHash;

        {
          const newSecret = Buffer.allocUnsafe(4 + secret.length);
          writeUInt32BE(newSecret, secret.length, 0);
          newSecret.set(secret, 4);
          secret = newSecret;
        }

        // Initialize new ciphers, deciphers, etc.

        const csCipherInfo = CIPHER_INFO[negotiated.cs.cipher];
        const scCipherInfo = CIPHER_INFO[negotiated.sc.cipher];

        const csIV = generateKEXVal(csCipherInfo.ivLen,
                                    this.hashName,
                                    secret,
                                    exchangeHash,
                                    this.sessionID,
                                    'A');
        const scIV = generateKEXVal(scCipherInfo.ivLen,
                                    this.hashName,
                                    secret,
                                    exchangeHash,
                                    this.sessionID,
                                    'B');
        const csKey = generateKEXVal(csCipherInfo.keyLen,
                                     this.hashName,
                                     secret,
                                     exchangeHash,
                                     this.sessionID,
                                     'C');
        const scKey = generateKEXVal(scCipherInfo.keyLen,
                                     this.hashName,
                                     secret,
                                     exchangeHash,
                                     this.sessionID,
                                     'D');
        let csMacInfo;
        let csMacKey;
        if (!csCipherInfo.authLen) {
          csMacInfo = MAC_INFO[negotiated.cs.mac];
          csMacKey = generateKEXVal(csMacInfo.len,
                                    this.hashName,
                                    secret,
                                    exchangeHash,
                                    this.sessionID,
                                    'E');
        }
        let scMacInfo;
        let scMacKey;
        if (!scCipherInfo.authLen) {
          scMacInfo = MAC_INFO[negotiated.sc.mac];
          scMacKey = generateKEXVal(scMacInfo.len,
                                    this.hashName,
                                    secret,
                                    exchangeHash,
                                    this.sessionID,
                                    'F');
        }

        const config = {
          inbound: {
            onPayload: this._protocol._onPayload,
            seqno: this._protocol._decipher.inSeqno,
            decipherInfo: (!isServer ? scCipherInfo : csCipherInfo),
            decipherIV: (!isServer ? scIV : csIV),
            decipherKey: (!isServer ? scKey : csKey),
            macInfo: (!isServer ? scMacInfo : csMacInfo),
            macKey: (!isServer ? scMacKey : csMacKey),
          },
          outbound: {
            onWrite: this._protocol._onWrite,
            seqno: this._protocol._cipher.outSeqno,
            cipherInfo: (isServer ? scCipherInfo : csCipherInfo),
            cipherIV: (isServer ? scIV : csIV),
            cipherKey: (isServer ? scKey : csKey),
            macInfo: (isServer ? scMacInfo : csMacInfo),
            macKey: (isServer ? scMacKey : csMacKey),
          },
        };
        this._protocol._cipher && this._protocol._cipher.free();
        this._protocol._decipher && this._protocol._decipher.free();
        this._protocol._cipher = createCipher(config);
        this._protocol._decipher = createDecipher(config);

        const rw = {
          read: undefined,
          write: undefined,
        };
        switch (negotiated.cs.compress) {
          case 'zlib': // starts immediately
            if (isServer)
              rw.read = new ZlibPacketReader();
            else
              rw.write = new ZlibPacketWriter(this._protocol);
            break;
          case 'zlib@openssh.com':
            // Starts after successful user authentication

            if (this._protocol._authenticated) {
              // If a rekey happens and this compression method is selected and
              // we already authenticated successfully, we need to start
              // immediately instead
              if (isServer)
                rw.read = new ZlibPacketReader();
              else
                rw.write = new ZlibPacketWriter(this._protocol);
              break;
            }
          // FALLTHROUGH
          default:
            // none -- never any compression/decompression

            if (isServer)
              rw.read = new PacketReader();
            else
              rw.write = new PacketWriter(this._protocol);
        }
        switch (negotiated.sc.compress) {
          case 'zlib': // starts immediately
            if (isServer)
              rw.write = new ZlibPacketWriter(this._protocol);
            else
              rw.read = new ZlibPacketReader();
            break;
          case 'zlib@openssh.com':
            // Starts after successful user authentication

            if (this._protocol._authenticated) {
              // If a rekey happens and this compression method is selected and
              // we already authenticated successfully, we need to start
              // immediately instead
              if (isServer)
                rw.write = new ZlibPacketWriter(this._protocol);
              else
                rw.read = new ZlibPacketReader();
              break;
            }
          // FALLTHROUGH
          default:
            // none -- never any compression/decompression

            if (isServer)
              rw.write = new PacketWriter(this._protocol);
            else
              rw.read = new PacketReader();
        }
        this._protocol._packetRW.read.cleanup();
        this._protocol._packetRW.write.cleanup();
        this._protocol._packetRW = rw;

        // Cleanup/reset various state
        this._public = null;
        this._dh = null;
        this._kexinit = this._protocol._kexinit = undefined;
        this._remoteKexinit = undefined;
        this._identRaw = undefined;
        this._remoteIdentRaw = undefined;
        this._hostKey = undefined;
        this._dhData = undefined;
        this._sig = undefined;

        this._protocol._onHandshakeComplete(negotiated);

        return false;
      };
      if (!isServer)
        return completeHandshake();
      this.finish = completeHandshake;
    }

    start() {
      if (!this._protocol._server) {
        if (this._protocol._debug) {
          let type;
          switch (this.type) {
            case 'group':
              type = 'KEXDH_INIT';
              break;
            default:
              type = 'KEXECDH_INIT';
          }
          this._protocol._debug(`Outbound: Sending ${type}`);
        }

        const pubKey = this.getPublicKey();

        let p = this._protocol._packetRW.write.allocStartKEX;
        const packet = this._protocol._packetRW.write.alloc(
          1 + 4 + pubKey.length,
          true
        );
        packet[p] = MESSAGE.KEXDH_INIT;
        writeUInt32BE(packet, pubKey.length, ++p);
        packet.set(pubKey, p += 4);
        this._protocol._cipher.encrypt(
          this._protocol._packetRW.write.finalize(packet, true)
        );
      }
    }
    getPublicKey() {
      this.generateKeys();

      const key = this._public;

      if (key)
        return this.convertPublicKey(key);
    }
    convertPublicKey(key) {
      let newKey;
      let idx = 0;
      let len = key.length;
      while (key[idx] === 0x00) {
        ++idx;
        --len;
      }

      if (key[idx] & 0x80) {
        newKey = Buffer.allocUnsafe(1 + len);
        newKey[0] = 0;
        key.copy(newKey, 1, idx);
        return newKey;
      }

      if (len !== key.length) {
        newKey = Buffer.allocUnsafe(len);
        key.copy(newKey, 0, idx);
        key = newKey;
      }
      return key;
    }
    computeSecret(otherPublicKey) {
      this.generateKeys();

      try {
        return convertToMpint(this._dh.computeSecret(otherPublicKey));
      } catch (ex) {
        return ex;
      }
    }
    parse(payload) {
      const type = payload[0];
      switch (this._step) {
        case 1:
          if (this._protocol._server) {
            // Server
            if (type !== MESSAGE.KEXDH_INIT) {
              return doFatalError(
                this._protocol,
                `Received packet ${type} instead of ${MESSAGE.KEXDH_INIT}`,
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            this._protocol._debug && this._protocol._debug(
              'Received DH Init'
            );
            /*
              byte     SSH_MSG_KEXDH_INIT
                         / SSH_MSG_KEX_ECDH_INIT
              string   <method-specific data>
            */
            bufferParser.init(payload, 1);
            const dhData = bufferParser.readString();
            bufferParser.clear();
            if (dhData === undefined) {
              return doFatalError(
                this._protocol,
                'Received malformed KEX*_INIT',
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }

            // Client public key
            this._dhData = dhData;

            let hostKey =
              this._protocol._hostKeys[this.negotiated.serverHostKey];
            if (Array.isArray(hostKey))
              hostKey = hostKey[0];
            this._hostKey = hostKey;

            this.finish();
          } else {
            // Client
            if (type !== MESSAGE.KEXDH_REPLY) {
              return doFatalError(
                this._protocol,
                `Received packet ${type} instead of ${MESSAGE.KEXDH_REPLY}`,
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            this._protocol._debug && this._protocol._debug(
              'Received DH Reply'
            );
            /*
              byte      SSH_MSG_KEXDH_REPLY
                          / SSH_MSG_KEX_DH_GEX_REPLY
                          / SSH_MSG_KEX_ECDH_REPLY
              string    server public host key and certificates (K_S)
              string    <method-specific data>
              string    signature of H
            */
            bufferParser.init(payload, 1);
            let hostPubKey;
            let dhData;
            let sig;
            if ((hostPubKey = bufferParser.readString()) === undefined
                || (dhData = bufferParser.readString()) === undefined
                || (sig = bufferParser.readString()) === undefined) {
              bufferParser.clear();
              return doFatalError(
                this._protocol,
                'Received malformed KEX*_REPLY',
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            bufferParser.clear();

            // Check that the host public key type matches what was negotiated
            // during KEXINIT swap
            bufferParser.init(hostPubKey, 0);
            const hostPubKeyType = bufferParser.readString(true);
            bufferParser.clear();
            if (hostPubKeyType === undefined) {
              return doFatalError(
                this._protocol,
                'Received malformed host public key',
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            if (hostPubKeyType !== this.negotiated.serverHostKey) {
              // Check if we need to make an exception
              switch (this.negotiated.serverHostKey) {
                case 'rsa-sha2-256':
                case 'rsa-sha2-512':
                  if (hostPubKeyType === 'ssh-rsa')
                    break;
                // FALLTHROUGH
                default:
                  return doFatalError(
                    this._protocol,
                    'Host key does not match negotiated type',
                    'handshake',
                    DISCONNECT_REASON.KEY_EXCHANGE_FAILED
                  );
              }
            }

            this._hostKey = hostPubKey;
            this._dhData = dhData;
            this._sig = sig;

            let checked = false;
            let ret;
            if (this._protocol._hostVerifier === undefined) {
              ret = true;
              this._protocol._debug && this._protocol._debug(
                'Host accepted by default (no verification)'
              );
            } else {
              ret = this._protocol._hostVerifier(hostPubKey, (permitted) => {
                if (checked)
                  return;
                checked = true;
                if (permitted === false) {
                  this._protocol._debug && this._protocol._debug(
                    'Host denied (verification failed)'
                  );
                  return doFatalError(
                    this._protocol,
                    'Host denied (verification failed)',
                    'handshake',
                    DISCONNECT_REASON.KEY_EXCHANGE_FAILED
                  );
                }
                this._protocol._debug && this._protocol._debug(
                  'Host accepted (verified)'
                );
                this._hostVerified = true;
                if (this._receivedNEWKEYS)
                  this.finish();
                else
                  trySendNEWKEYS(this);
              });
            }
            if (ret === undefined) {
              // Async host verification
              ++this._step;
              return;
            }
            checked = true;
            if (ret === false) {
              this._protocol._debug && this._protocol._debug(
                'Host denied (verification failed)'
              );
              return doFatalError(
                this._protocol,
                'Host denied (verification failed)',
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            this._protocol._debug && this._protocol._debug(
              'Host accepted (verified)'
            );
            this._hostVerified = true;
            trySendNEWKEYS(this);
          }
          ++this._step;
          break;
        case 2:
          if (type !== MESSAGE.NEWKEYS) {
            return doFatalError(
              this._protocol,
              `Received packet ${type} instead of ${MESSAGE.NEWKEYS}`,
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }
          this._protocol._debug && this._protocol._debug(
            'Inbound: NEWKEYS'
          );
          this._receivedNEWKEYS = true;
          ++this._step;
          if (this._protocol._server || this._hostVerified)
            return this.finish();

          // Signal to current decipher that we need to change to a new decipher
          // for the next packet
          return false;
        default:
          return doFatalError(
            this._protocol,
            `Received unexpected packet ${type} after NEWKEYS`,
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
      }
    }
  }

  class Curve25519Exchange extends KeyExchange {
    constructor(hashName, ...args) {
      super(...args);

      this.type = '25519';
      this.hashName = hashName;
      this._keys = null;
    }
    generateKeys() {
      if (!this._keys)
        this._keys = generateKeyPairSync('x25519');
    }
    getPublicKey() {
      this.generateKeys();

      const key = this._keys.publicKey.export({ type: 'spki', format: 'der' });
      return key.slice(-32); // HACK: avoids parsing DER/BER header
    }
    convertPublicKey(key) {
      let newKey;
      let idx = 0;
      let len = key.length;
      while (key[idx] === 0x00) {
        ++idx;
        --len;
      }

      if (key.length === 32)
        return key;

      if (len !== key.length) {
        newKey = Buffer.allocUnsafe(len);
        key.copy(newKey, 0, idx);
        key = newKey;
      }
      return key;
    }
    computeSecret(otherPublicKey) {
      this.generateKeys();

      try {
        const asnWriter = new Ber.Writer();
        asnWriter.startSequence();
          // algorithm
          asnWriter.startSequence();
            asnWriter.writeOID('1.3.101.110'); // id-X25519
          asnWriter.endSequence();

          // PublicKey
          asnWriter.startSequence(Ber.BitString);
            asnWriter.writeByte(0x00);
            // XXX: hack to write a raw buffer without a tag -- yuck
            asnWriter._ensure(otherPublicKey.length);
            otherPublicKey.copy(asnWriter._buf,
                                asnWriter._offset,
                                0,
                                otherPublicKey.length);
            asnWriter._offset += otherPublicKey.length;
          asnWriter.endSequence();
        asnWriter.endSequence();

        return convertToMpint(diffieHellman({
          privateKey: this._keys.privateKey,
          publicKey: createPublicKey({
            key: asnWriter.buffer,
            type: 'spki',
            format: 'der',
          }),
        }));
      } catch (ex) {
        return ex;
      }
    }
  }

  class ECDHExchange extends KeyExchange {
    constructor(curveName, hashName, ...args) {
      super(...args);

      this.type = 'ecdh';
      this.curveName = curveName;
      this.hashName = hashName;
    }
    generateKeys() {
      if (!this._dh) {
        this._dh = createECDH(this.curveName);
        this._public = this._dh.generateKeys();
      }
    }
  }

  class DHGroupExchange extends KeyExchange {
    constructor(hashName, ...args) {
      super(...args);

      this.type = 'groupex';
      this.hashName = hashName;
      this._prime = null;
      this._generator = null;
      this._minBits = GEX_MIN_BITS;
      this._prefBits = dhEstimate(this.negotiated);
      if (this._protocol._compatFlags & COMPAT.BUG_DHGEX_LARGE)
        this._prefBits = Math.min(this._prefBits, 4096);
      this._maxBits = GEX_MAX_BITS;
    }
    start() {
      if (this._protocol._server)
        return;
      this._protocol._debug && this._protocol._debug(
        'Outbound: Sending KEXDH_GEX_REQUEST'
      );
      let p = this._protocol._packetRW.write.allocStartKEX;
      const packet = this._protocol._packetRW.write.alloc(
        1 + 4 + 4 + 4,
        true
      );
      packet[p] = MESSAGE.KEXDH_GEX_REQUEST;
      writeUInt32BE(packet, this._minBits, ++p);
      writeUInt32BE(packet, this._prefBits, p += 4);
      writeUInt32BE(packet, this._maxBits, p += 4);
      this._protocol._cipher.encrypt(
        this._protocol._packetRW.write.finalize(packet, true)
      );
    }
    generateKeys() {
      if (!this._dh && this._prime && this._generator) {
        this._dh = createDiffieHellman(this._prime, this._generator);
        this._public = this._dh.generateKeys();
      }
    }
    setDHParams(prime, generator) {
      if (!Buffer.isBuffer(prime))
        throw new Error('Invalid prime value');
      if (!Buffer.isBuffer(generator))
        throw new Error('Invalid generator value');
      this._prime = prime;
      this._generator = generator;
    }
    getDHParams() {
      if (this._dh) {
        return {
          prime: convertToMpint(this._dh.getPrime()),
          generator: convertToMpint(this._dh.getGenerator()),
        };
      }
    }
    parse(payload) {
      const type = payload[0];
      switch (this._step) {
        case 1:
          if (this._protocol._server) {
            if (type !== MESSAGE.KEXDH_GEX_REQUEST) {
              return doFatalError(
                this._protocol,
                `Received packet ${type} instead of `
                  + MESSAGE.KEXDH_GEX_REQUEST,
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            // TODO: allow user implementation to provide safe prime and
            // generator on demand to support group exchange on server side
            return doFatalError(
              this._protocol,
              'Group exchange not implemented for server',
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }

          if (type !== MESSAGE.KEXDH_GEX_GROUP) {
            return doFatalError(
              this._protocol,
              `Received packet ${type} instead of ${MESSAGE.KEXDH_GEX_GROUP}`,
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }

          this._protocol._debug && this._protocol._debug(
            'Received DH GEX Group'
          );

          /*
            byte    SSH_MSG_KEX_DH_GEX_GROUP
            mpint   p, safe prime
            mpint   g, generator for subgroup in GF(p)
          */
          bufferParser.init(payload, 1);
          let prime;
          let gen;
          if ((prime = bufferParser.readString()) === undefined
              || (gen = bufferParser.readString()) === undefined) {
            bufferParser.clear();
            return doFatalError(
              this._protocol,
              'Received malformed KEXDH_GEX_GROUP',
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }
          bufferParser.clear();

          // TODO: validate prime
          this.setDHParams(prime, gen);
          this.generateKeys();
          const pubkey = this.getPublicKey();

          this._protocol._debug && this._protocol._debug(
            'Outbound: Sending KEXDH_GEX_INIT'
          );

          let p = this._protocol._packetRW.write.allocStartKEX;
          const packet =
            this._protocol._packetRW.write.alloc(1 + 4 + pubkey.length, true);
          packet[p] = MESSAGE.KEXDH_GEX_INIT;
          writeUInt32BE(packet, pubkey.length, ++p);
          packet.set(pubkey, p += 4);
          this._protocol._cipher.encrypt(
            this._protocol._packetRW.write.finalize(packet, true)
          );

          ++this._step;
          break;
        case 2:
          if (this._protocol._server) {
            if (type !== MESSAGE.KEXDH_GEX_INIT) {
              return doFatalError(
                this._protocol,
                `Received packet ${type} instead of ${MESSAGE.KEXDH_GEX_INIT}`,
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            this._protocol._debug && this._protocol._debug(
              'Received DH GEX Init'
            );
            return doFatalError(
              this._protocol,
              'Group exchange not implemented for server',
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          } else if (type !== MESSAGE.KEXDH_GEX_REPLY) {
            return doFatalError(
              this._protocol,
              `Received packet ${type} instead of ${MESSAGE.KEXDH_GEX_REPLY}`,
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }
          this._protocol._debug && this._protocol._debug(
            'Received DH GEX Reply'
          );
          this._step = 1;
          payload[0] = MESSAGE.KEXDH_REPLY;
          this.parse = KeyExchange.prototype.parse;
          this.parse(payload);
      }
    }
  }

  class DHExchange extends KeyExchange {
    constructor(groupName, hashName, ...args) {
      super(...args);

      this.type = 'group';
      this.groupName = groupName;
      this.hashName = hashName;
    }
    start() {
      if (!this._protocol._server) {
        this._protocol._debug && this._protocol._debug(
          'Outbound: Sending KEXDH_INIT'
        );
        const pubKey = this.getPublicKey();
        let p = this._protocol._packetRW.write.allocStartKEX;
        const packet =
          this._protocol._packetRW.write.alloc(1 + 4 + pubKey.length, true);
        packet[p] = MESSAGE.KEXDH_INIT;
        writeUInt32BE(packet, pubKey.length, ++p);
        packet.set(pubKey, p += 4);
        this._protocol._cipher.encrypt(
          this._protocol._packetRW.write.finalize(packet, true)
        );
      }
    }
    generateKeys() {
      if (!this._dh) {
        this._dh = createDiffieHellmanGroup(this.groupName);
        this._public = this._dh.generateKeys();
      }
    }
    getDHParams() {
      if (this._dh) {
        return {
          prime: convertToMpint(this._dh.getPrime()),
          generator: convertToMpint(this._dh.getGenerator()),
        };
      }
    }
  }

  return (negotiated, ...args) => {
    if (typeof negotiated !== 'object' || negotiated === null)
      throw new Error('Invalid negotiated argument');
    const kexType = negotiated.kex;
    if (typeof kexType === 'string') {
      args = [negotiated, ...args];
      switch (kexType) {
        case 'curve25519-sha256':
        case 'curve25519-sha256@libssh.org':
          if (!curve25519Supported)
            break;
          return new Curve25519Exchange('sha256', ...args);

        case 'ecdh-sha2-nistp256':
          return new ECDHExchange('prime256v1', 'sha256', ...args);
        case 'ecdh-sha2-nistp384':
          return new ECDHExchange('secp384r1', 'sha384', ...args);
        case 'ecdh-sha2-nistp521':
          return new ECDHExchange('secp521r1', 'sha512', ...args);

        case 'diffie-hellman-group1-sha1':
          return new DHExchange('modp2', 'sha1', ...args);
        case 'diffie-hellman-group14-sha1':
          return new DHExchange('modp14', 'sha1', ...args);
        case 'diffie-hellman-group14-sha256':
          return new DHExchange('modp14', 'sha256', ...args);
        case 'diffie-hellman-group15-sha512':
          return new DHExchange('modp15', 'sha512', ...args);
        case 'diffie-hellman-group16-sha512':
          return new DHExchange('modp16', 'sha512', ...args);
        case 'diffie-hellman-group17-sha512':
          return new DHExchange('modp17', 'sha512', ...args);
        case 'diffie-hellman-group18-sha512':
          return new DHExchange('modp18', 'sha512', ...args);

        case 'diffie-hellman-group-exchange-sha1':
          return new DHGroupExchange('sha1', ...args);
        case 'diffie-hellman-group-exchange-sha256':
          return new DHGroupExchange('sha256', ...args);
      }
      throw new Error(`Unsupported key exchange algorithm: ${kexType}`);
    }
    throw new Error(`Invalid key exchange type: ${kexType}`);
  };
})();

const KexInit = (() => {
  const KEX_PROPERTY_NAMES = [
    'kex',
    'serverHostKey',
    ['cs', 'cipher' ],
    ['sc', 'cipher' ],
    ['cs', 'mac' ],
    ['sc', 'mac' ],
    ['cs', 'compress' ],
    ['sc', 'compress' ],
    ['cs', 'lang' ],
    ['sc', 'lang' ],
  ];
  return class KexInit {
    constructor(obj) {
      if (typeof obj !== 'object' || obj === null)
        throw new TypeError('Argument must be an object');

      const lists = {
        kex: undefined,
        serverHostKey: undefined,
        cs: {
          cipher: undefined,
          mac: undefined,
          compress: undefined,
          lang: undefined,
        },
        sc: {
          cipher: undefined,
          mac: undefined,
          compress: undefined,
          lang: undefined,
        },

        all: undefined,
      };
      let totalSize = 0;
      for (const prop of KEX_PROPERTY_NAMES) {
        let base;
        let val;
        let desc;
        let key;
        if (typeof prop === 'string') {
          base = lists;
          val = obj[prop];
          desc = key = prop;
        } else {
          const parent = prop[0];
          base = lists[parent];
          key = prop[1];
          val = obj[parent][key];
          desc = `${parent}.${key}`;
        }
        const entry = { array: undefined, buffer: undefined };
        if (Buffer.isBuffer(val)) {
          entry.array = ('' + val).split(',');
          entry.buffer = val;
          totalSize += 4 + val.length;
        } else {
          if (typeof val === 'string')
            val = val.split(',');
          if (Array.isArray(val)) {
            entry.array = val;
            entry.buffer = Buffer.from(val.join(','));
          } else {
            throw new TypeError(`Invalid \`${desc}\` type: ${typeof val}`);
          }
          totalSize += 4 + entry.buffer.length;
        }
        base[key] = entry;
      }

      const all = Buffer.allocUnsafe(totalSize);
      lists.all = all;

      let allPos = 0;
      for (const prop of KEX_PROPERTY_NAMES) {
        let data;
        if (typeof prop === 'string')
          data = lists[prop].buffer;
        else
          data = lists[prop[0]][prop[1]].buffer;
        allPos = writeUInt32BE(all, data.length, allPos);
        all.set(data, allPos);
        allPos += data.length;
      }

      this.totalSize = totalSize;
      this.lists = lists;
    }
    copyAllTo(buf, offset) {
      const src = this.lists.all;
      if (typeof offset !== 'number')
        throw new TypeError(`Invalid offset value: ${typeof offset}`);
      if (buf.length - offset < src.length)
        throw new Error('Insufficient space to copy list');
      buf.set(src, offset);
      return src.length;
    }
  };
})();

const hashString = (() => {
  const LEN = Buffer.allocUnsafe(4);
  return (hash, buf) => {
    writeUInt32BE(LEN, buf.length, 0);
    hash.update(LEN);
    hash.update(buf);
  };
})();

function generateKEXVal(len, hashName, secret, exchangeHash, sessionID, char) {
  let ret;
  if (len) {
    let digest = createHash(hashName)
                   .update(secret)
                   .update(exchangeHash)
                   .update(char)
                   .update(sessionID)
                   .digest();
    while (digest.length < len) {
      const chunk = createHash(hashName)
                      .update(secret)
                      .update(exchangeHash)
                      .update(digest)
                      .digest();
      const extended = Buffer.allocUnsafe(digest.length + chunk.length);
      extended.set(digest, 0);
      extended.set(chunk, digest.length);
      digest = extended;
    }
    if (digest.length === len)
      ret = digest;
    else
      ret = new FastBuffer(digest.buffer, digest.byteOffset, len);
  } else {
    ret = EMPTY_BUFFER;
  }
  return ret;
}

function onKEXPayload(state, payload) {
  // XXX: move this to the Decipher implementations?
  if (payload.length === 0) {
    this._debug && this._debug('Inbound: Skipping empty packet payload');
    return;
  }

  if (this._skipNextInboundPacket) {
    this._skipNextInboundPacket = false;
    return;
  }

  payload = this._packetRW.read.read(payload);

  const type = payload[0];
  switch (type) {
    case MESSAGE.DISCONNECT:
    case MESSAGE.IGNORE:
    case MESSAGE.UNIMPLEMENTED:
    case MESSAGE.DEBUG:
      if (!MESSAGE_HANDLERS)
        MESSAGE_HANDLERS = __nccwpck_require__(172);
      return MESSAGE_HANDLERS[type](this, payload);
    case MESSAGE.KEXINIT:
      if (!state.firstPacket) {
        return doFatalError(
          this,
          'Received extra KEXINIT during handshake',
          'handshake',
          DISCONNECT_REASON.KEY_EXCHANGE_FAILED
        );
      }
      state.firstPacket = false;
      return handleKexInit(this, payload);
    default:
      if (type < 20 || type > 49) {
        return doFatalError(
          this,
          `Received unexpected packet type ${type}`,
          'handshake',
          DISCONNECT_REASON.KEY_EXCHANGE_FAILED
        );
      }
  }

  return this._kex.parse(payload);
}

function dhEstimate(neg) {
  const csCipher = CIPHER_INFO[neg.cs.cipher];
  const scCipher = CIPHER_INFO[neg.sc.cipher];
  // XXX: if OpenSSH's `umac-*` MACs are ever supported, their key lengths will
  // also need to be considered when calculating `bits`
  const bits = Math.max(
    0,
    (csCipher.sslName === 'des-ede3-cbc' ? 14 : csCipher.keyLen),
    csCipher.blockLen,
    csCipher.ivLen,
    (scCipher.sslName === 'des-ede3-cbc' ? 14 : scCipher.keyLen),
    scCipher.blockLen,
    scCipher.ivLen
  ) * 8;
  if (bits <= 112)
    return 2048;
  if (bits <= 128)
    return 3072;
  if (bits <= 192)
    return 7680;
  return 8192;
}

function trySendNEWKEYS(kex) {
  if (!kex._sentNEWKEYS) {
    kex._protocol._debug && kex._protocol._debug(
      'Outbound: Sending NEWKEYS'
    );
    const p = kex._protocol._packetRW.write.allocStartKEX;
    const packet = kex._protocol._packetRW.write.alloc(1, true);
    packet[p] = MESSAGE.NEWKEYS;
    kex._protocol._cipher.encrypt(
      kex._protocol._packetRW.write.finalize(packet, true)
    );
    kex._sentNEWKEYS = true;
  }
}

module.exports = {
  KexInit,
  kexinit,
  onKEXPayload,
  DEFAULT_KEXINIT: new KexInit({
    kex: DEFAULT_KEX,
    serverHostKey: DEFAULT_SERVER_HOST_KEY,
    cs: {
      cipher: DEFAULT_CIPHER,
      mac: DEFAULT_MAC,
      compress: DEFAULT_COMPRESSION,
      lang: [],
    },
    sc: {
      cipher: DEFAULT_CIPHER,
      mac: DEFAULT_MAC,
      compress: DEFAULT_COMPRESSION,
      lang: [],
    },
  }),
  HANDLERS: {
    [MESSAGE.KEXINIT]: handleKexInit,
  },
};


/***/ }),

/***/ 2218:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// TODO:
//    * utilize `crypto.create(Private|Public)Key()` and `keyObject.export()`
//    * handle multi-line header values (OpenSSH)?
//    * more thorough validation?


const {
  createDecipheriv,
  createECDH,
  createHash,
  createHmac,
  createSign,
  createVerify,
  getCiphers,
  sign: sign_,
  verify: verify_,
} = __nccwpck_require__(6417);
const supportedOpenSSLCiphers = getCiphers();

const { Ber } = __nccwpck_require__(970);
const bcrypt_pbkdf = __nccwpck_require__(5447).pbkdf;

const { CIPHER_INFO } = __nccwpck_require__(5708);
const { eddsaSupported, SUPPORTED_CIPHER } = __nccwpck_require__(6832);
const {
  bufferSlice,
  makeBufferParser,
  readString,
  readUInt32BE,
  writeUInt32BE,
} = __nccwpck_require__(9475);

const SYM_HASH_ALGO = Symbol('Hash Algorithm');
const SYM_PRIV_PEM = Symbol('Private key PEM');
const SYM_PUB_PEM = Symbol('Public key PEM');
const SYM_PUB_SSH = Symbol('Public key SSH');
const SYM_DECRYPTED = Symbol('Decrypted Key');

// Create OpenSSL cipher name -> SSH cipher name conversion table
const CIPHER_INFO_OPENSSL = Object.create(null);
{
  const keys = Object.keys(CIPHER_INFO);
  for (let i = 0; i < keys.length; ++i) {
    const cipherName = CIPHER_INFO[keys[i]].sslName;
    if (!cipherName || CIPHER_INFO_OPENSSL[cipherName])
      continue;
    CIPHER_INFO_OPENSSL[cipherName] = CIPHER_INFO[keys[i]];
  }
}

const binaryKeyParser = makeBufferParser();

function makePEM(type, data) {
  data = data.base64Slice(0, data.length);
  let formatted = data.replace(/.{64}/g, '$&\n');
  if (data.length & 63)
    formatted += '\n';
  return `-----BEGIN ${type} KEY-----\n${formatted}-----END ${type} KEY-----`;
}

function combineBuffers(buf1, buf2) {
  const result = Buffer.allocUnsafe(buf1.length + buf2.length);
  result.set(buf1, 0);
  result.set(buf2, buf1.length);
  return result;
}

function skipFields(buf, nfields) {
  const bufLen = buf.length;
  let pos = (buf._pos || 0);
  for (let i = 0; i < nfields; ++i) {
    const left = (bufLen - pos);
    if (pos >= bufLen || left < 4)
      return false;
    const len = readUInt32BE(buf, pos);
    if (left < 4 + len)
      return false;
    pos += 4 + len;
  }
  buf._pos = pos;
  return true;
}

function genOpenSSLRSAPub(n, e) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.2.840.113549.1.1.1'); // rsaEncryption
      // algorithm parameters (RSA has none)
      asnWriter.writeNull();
    asnWriter.endSequence();

    // subjectPublicKey
    asnWriter.startSequence(Ber.BitString);
      asnWriter.writeByte(0x00);
      asnWriter.startSequence();
        asnWriter.writeBuffer(n, Ber.Integer);
        asnWriter.writeBuffer(e, Ber.Integer);
      asnWriter.endSequence();
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PUBLIC', asnWriter.buffer);
}

function genOpenSSHRSAPub(n, e) {
  const publicKey = Buffer.allocUnsafe(4 + 7 + 4 + e.length + 4 + n.length);

  writeUInt32BE(publicKey, 7, 0);
  publicKey.utf8Write('ssh-rsa', 4, 7);

  let i = 4 + 7;
  writeUInt32BE(publicKey, e.length, i);
  publicKey.set(e, i += 4);

  writeUInt32BE(publicKey, n.length, i += e.length);
  publicKey.set(n, i + 4);

  return publicKey;
}

const genOpenSSLRSAPriv = (() => {
  function genRSAASN1Buf(n, e, d, p, q, dmp1, dmq1, iqmp) {
    const asnWriter = new Ber.Writer();
    asnWriter.startSequence();
      asnWriter.writeInt(0x00, Ber.Integer);
      asnWriter.writeBuffer(n, Ber.Integer);
      asnWriter.writeBuffer(e, Ber.Integer);
      asnWriter.writeBuffer(d, Ber.Integer);
      asnWriter.writeBuffer(p, Ber.Integer);
      asnWriter.writeBuffer(q, Ber.Integer);
      asnWriter.writeBuffer(dmp1, Ber.Integer);
      asnWriter.writeBuffer(dmq1, Ber.Integer);
      asnWriter.writeBuffer(iqmp, Ber.Integer);
    asnWriter.endSequence();
    return asnWriter.buffer;
  }

  function bigIntFromBuffer(buf) {
    return BigInt(`0x${buf.hexSlice(0, buf.length)}`);
  }

  function bigIntToBuffer(bn) {
    let hex = bn.toString(16);
    if ((hex.length & 1) !== 0) {
      hex = `0${hex}`;
    } else {
      const sigbit = hex.charCodeAt(0);
      // BER/DER integers require leading zero byte to denote a positive value
      // when first byte >= 0x80
      if (sigbit === 56/* '8' */
          || sigbit === 57/* '9' */
          || (sigbit >= 97/* 'a' */ && sigbit <= 102/* 'f' */)) {
        hex = `00${hex}`;
      }
    }
    return Buffer.from(hex, 'hex');
  }

  return function genOpenSSLRSAPriv(n, e, d, iqmp, p, q) {
    const bn_d = bigIntFromBuffer(d);
    const dmp1 = bigIntToBuffer(bn_d % (bigIntFromBuffer(p) - 1n));
    const dmq1 = bigIntToBuffer(bn_d % (bigIntFromBuffer(q) - 1n));
    return makePEM('RSA PRIVATE',
                   genRSAASN1Buf(n, e, d, p, q, dmp1, dmq1, iqmp));
  };
})();

function genOpenSSLDSAPub(p, q, g, y) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.2.840.10040.4.1'); // id-dsa
      // algorithm parameters
      asnWriter.startSequence();
        asnWriter.writeBuffer(p, Ber.Integer);
        asnWriter.writeBuffer(q, Ber.Integer);
        asnWriter.writeBuffer(g, Ber.Integer);
      asnWriter.endSequence();
    asnWriter.endSequence();

    // subjectPublicKey
    asnWriter.startSequence(Ber.BitString);
      asnWriter.writeByte(0x00);
      asnWriter.writeBuffer(y, Ber.Integer);
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PUBLIC', asnWriter.buffer);
}

function genOpenSSHDSAPub(p, q, g, y) {
  const publicKey = Buffer.allocUnsafe(
    4 + 7 + 4 + p.length + 4 + q.length + 4 + g.length + 4 + y.length
  );

  writeUInt32BE(publicKey, 7, 0);
  publicKey.utf8Write('ssh-dss', 4, 7);

  let i = 4 + 7;
  writeUInt32BE(publicKey, p.length, i);
  publicKey.set(p, i += 4);

  writeUInt32BE(publicKey, q.length, i += p.length);
  publicKey.set(q, i += 4);

  writeUInt32BE(publicKey, g.length, i += q.length);
  publicKey.set(g, i += 4);

  writeUInt32BE(publicKey, y.length, i += g.length);
  publicKey.set(y, i + 4);

  return publicKey;
}

function genOpenSSLDSAPriv(p, q, g, y, x) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    asnWriter.writeInt(0x00, Ber.Integer);
    asnWriter.writeBuffer(p, Ber.Integer);
    asnWriter.writeBuffer(q, Ber.Integer);
    asnWriter.writeBuffer(g, Ber.Integer);
    asnWriter.writeBuffer(y, Ber.Integer);
    asnWriter.writeBuffer(x, Ber.Integer);
  asnWriter.endSequence();
  return makePEM('DSA PRIVATE', asnWriter.buffer);
}

function genOpenSSLEdPub(pub) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.3.101.112'); // id-Ed25519
    asnWriter.endSequence();

    // PublicKey
    asnWriter.startSequence(Ber.BitString);
      asnWriter.writeByte(0x00);
      // XXX: hack to write a raw buffer without a tag -- yuck
      asnWriter._ensure(pub.length);
      asnWriter._buf.set(pub, asnWriter._offset);
      asnWriter._offset += pub.length;
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PUBLIC', asnWriter.buffer);
}

function genOpenSSHEdPub(pub) {
  const publicKey = Buffer.allocUnsafe(4 + 11 + 4 + pub.length);

  writeUInt32BE(publicKey, 11, 0);
  publicKey.utf8Write('ssh-ed25519', 4, 11);

  writeUInt32BE(publicKey, pub.length, 15);
  publicKey.set(pub, 19);

  return publicKey;
}

function genOpenSSLEdPriv(priv) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // version
    asnWriter.writeInt(0x00, Ber.Integer);

    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.3.101.112'); // id-Ed25519
    asnWriter.endSequence();

    // PrivateKey
    asnWriter.startSequence(Ber.OctetString);
      asnWriter.writeBuffer(priv, Ber.OctetString);
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PRIVATE', asnWriter.buffer);
}

function genOpenSSLECDSAPub(oid, Q) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.2.840.10045.2.1'); // id-ecPublicKey
      // algorithm parameters (namedCurve)
      asnWriter.writeOID(oid);
    asnWriter.endSequence();

    // subjectPublicKey
    asnWriter.startSequence(Ber.BitString);
      asnWriter.writeByte(0x00);
      // XXX: hack to write a raw buffer without a tag -- yuck
      asnWriter._ensure(Q.length);
      asnWriter._buf.set(Q, asnWriter._offset);
      asnWriter._offset += Q.length;
      // end hack
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PUBLIC', asnWriter.buffer);
}

function genOpenSSHECDSAPub(oid, Q) {
  let curveName;
  switch (oid) {
    case '1.2.840.10045.3.1.7':
      // prime256v1/secp256r1
      curveName = 'nistp256';
      break;
    case '1.3.132.0.34':
      // secp384r1
      curveName = 'nistp384';
      break;
    case '1.3.132.0.35':
      // secp521r1
      curveName = 'nistp521';
      break;
    default:
      return;
  }

  const publicKey = Buffer.allocUnsafe(4 + 19 + 4 + 8 + 4 + Q.length);

  writeUInt32BE(publicKey, 19, 0);
  publicKey.utf8Write(`ecdsa-sha2-${curveName}`, 4, 19);

  writeUInt32BE(publicKey, 8, 23);
  publicKey.utf8Write(curveName, 27, 8);

  writeUInt32BE(publicKey, Q.length, 35);
  publicKey.set(Q, 39);

  return publicKey;
}

function genOpenSSLECDSAPriv(oid, pub, priv) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // version
    asnWriter.writeInt(0x01, Ber.Integer);
    // privateKey
    asnWriter.writeBuffer(priv, Ber.OctetString);
    // parameters (optional)
    asnWriter.startSequence(0xA0);
      asnWriter.writeOID(oid);
    asnWriter.endSequence();
    // publicKey (optional)
    asnWriter.startSequence(0xA1);
      asnWriter.startSequence(Ber.BitString);
        asnWriter.writeByte(0x00);
        // XXX: hack to write a raw buffer without a tag -- yuck
        asnWriter._ensure(pub.length);
        asnWriter._buf.set(pub, asnWriter._offset);
        asnWriter._offset += pub.length;
        // end hack
      asnWriter.endSequence();
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('EC PRIVATE', asnWriter.buffer);
}

function genOpenSSLECDSAPubFromPriv(curveName, priv) {
  const tempECDH = createECDH(curveName);
  tempECDH.setPrivateKey(priv);
  return tempECDH.getPublicKey();
}

const BaseKey = {
  sign: (() => {
    if (typeof sign_ === 'function') {
      return function sign(data, algo) {
        const pem = this[SYM_PRIV_PEM];
        if (pem === null)
          return new Error('No private key available');
        if (!algo || typeof algo !== 'string')
          algo = this[SYM_HASH_ALGO];
        try {
          return sign_(algo, data, pem);
        } catch (ex) {
          return ex;
        }
      };
    }
    return function sign(data, algo) {
      const pem = this[SYM_PRIV_PEM];
      if (pem === null)
        return new Error('No private key available');
      if (!algo || typeof algo !== 'string')
        algo = this[SYM_HASH_ALGO];
      const signature = createSign(algo);
      signature.update(data);
      try {
        return signature.sign(pem);
      } catch (ex) {
        return ex;
      }
    };
  })(),
  verify: (() => {
    if (typeof verify_ === 'function') {
      return function verify(data, signature, algo) {
        const pem = this[SYM_PUB_PEM];
        if (pem === null)
          return new Error('No public key available');
        if (!algo || typeof algo !== 'string')
          algo = this[SYM_HASH_ALGO];
        try {
          return verify_(algo, data, pem, signature);
        } catch (ex) {
          return ex;
        }
      };
    }
    return function verify(data, signature, algo) {
      const pem = this[SYM_PUB_PEM];
      if (pem === null)
        return new Error('No public key available');
      if (!algo || typeof algo !== 'string')
        algo = this[SYM_HASH_ALGO];
      const verifier = createVerify(algo);
      verifier.update(data);
      try {
        return verifier.verify(pem, signature);
      } catch (ex) {
        return ex;
      }
    };
  })(),
  isPrivateKey: function isPrivateKey() {
    return (this[SYM_PRIV_PEM] !== null);
  },
  getPrivatePEM: function getPrivatePEM() {
    return this[SYM_PRIV_PEM];
  },
  getPublicPEM: function getPublicPEM() {
    return this[SYM_PUB_PEM];
  },
  getPublicSSH: function getPublicSSH() {
    return this[SYM_PUB_SSH];
  },
  equals: function equals(key) {
    const parsed = parseKey(key);
    if (parsed instanceof Error)
      return false;
    return (
      this.type === parsed.type
      && this[SYM_PRIV_PEM] === parsed[SYM_PRIV_PEM]
      && this[SYM_PUB_PEM] === parsed[SYM_PUB_PEM]
      && this[SYM_PUB_SSH] === parsed[SYM_PUB_SSH]
    );
  },
};


function OpenSSH_Private(type, comment, privPEM, pubPEM, pubSSH, algo,
                         decrypted) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = privPEM;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = decrypted;
}
OpenSSH_Private.prototype = BaseKey;
{
  const regexp = /^-----BEGIN OPENSSH PRIVATE KEY-----(?:\r\n|\n)([\s\S]+)(?:\r\n|\n)-----END OPENSSH PRIVATE KEY-----$/;
  OpenSSH_Private.parse = (str, passphrase) => {
    const m = regexp.exec(str);
    if (m === null)
      return null;
    let ret;
    const data = Buffer.from(m[1], 'base64');
    if (data.length < 31) // magic (+ magic null term.) + minimum field lengths
      return new Error('Malformed OpenSSH private key');
    const magic = data.utf8Slice(0, 15);
    if (magic !== 'openssh-key-v1\0')
      return new Error(`Unsupported OpenSSH key magic: ${magic}`);

    const cipherName = readString(data, 15, true);
    if (cipherName === undefined)
      return new Error('Malformed OpenSSH private key');
    if (cipherName !== 'none' && SUPPORTED_CIPHER.indexOf(cipherName) === -1)
      return new Error(`Unsupported cipher for OpenSSH key: ${cipherName}`);

    const kdfName = readString(data, data._pos, true);
    if (kdfName === undefined)
      return new Error('Malformed OpenSSH private key');
    if (kdfName !== 'none') {
      if (cipherName === 'none')
        return new Error('Malformed OpenSSH private key');
      if (kdfName !== 'bcrypt')
        return new Error(`Unsupported kdf name for OpenSSH key: ${kdfName}`);
      if (!passphrase) {
        return new Error(
          'Encrypted private OpenSSH key detected, but no passphrase given'
        );
      }
    } else if (cipherName !== 'none') {
      return new Error('Malformed OpenSSH private key');
    }

    let encInfo;
    let cipherKey;
    let cipherIV;
    if (cipherName !== 'none')
      encInfo = CIPHER_INFO[cipherName];
    const kdfOptions = readString(data, data._pos);
    if (kdfOptions === undefined)
      return new Error('Malformed OpenSSH private key');
    if (kdfOptions.length) {
      switch (kdfName) {
        case 'none':
          return new Error('Malformed OpenSSH private key');
        case 'bcrypt':
          /*
            string salt
            uint32 rounds
          */
          const salt = readString(kdfOptions, 0);
          if (salt === undefined || kdfOptions._pos + 4 > kdfOptions.length)
            return new Error('Malformed OpenSSH private key');
          const rounds = readUInt32BE(kdfOptions, kdfOptions._pos);
          const gen = Buffer.allocUnsafe(encInfo.keyLen + encInfo.ivLen);
          const r = bcrypt_pbkdf(passphrase,
                                 passphrase.length,
                                 salt,
                                 salt.length,
                                 gen,
                                 gen.length,
                                 rounds);
          if (r !== 0)
            return new Error('Failed to generate information to decrypt key');
          cipherKey = bufferSlice(gen, 0, encInfo.keyLen);
          cipherIV = bufferSlice(gen, encInfo.keyLen, gen.length);
          break;
      }
    } else if (kdfName !== 'none') {
      return new Error('Malformed OpenSSH private key');
    }

    if (data._pos + 3 >= data.length)
      return new Error('Malformed OpenSSH private key');
    const keyCount = readUInt32BE(data, data._pos);
    data._pos += 4;

    if (keyCount > 0) {
      // TODO: place sensible limit on max `keyCount`

      // Read public keys first
      for (let i = 0; i < keyCount; ++i) {
        const pubData = readString(data, data._pos);
        if (pubData === undefined)
          return new Error('Malformed OpenSSH private key');
        const type = readString(pubData, 0, true);
        if (type === undefined)
          return new Error('Malformed OpenSSH private key');
      }

      let privBlob = readString(data, data._pos);
      if (privBlob === undefined)
        return new Error('Malformed OpenSSH private key');

      if (cipherKey !== undefined) {
        // Encrypted private key(s)
        if (privBlob.length < encInfo.blockLen
            || (privBlob.length % encInfo.blockLen) !== 0) {
          return new Error('Malformed OpenSSH private key');
        }
        try {
          const options = { authTagLength: encInfo.authLen };
          const decipher = createDecipheriv(encInfo.sslName,
                                            cipherKey,
                                            cipherIV,
                                            options);
          if (encInfo.authLen > 0) {
            if (data.length - data._pos < encInfo.authLen)
              return new Error('Malformed OpenSSH private key');
            decipher.setAuthTag(
              bufferSlice(data, data._pos, data._pos += encInfo.authLen)
            );
          }
          privBlob = combineBuffers(decipher.update(privBlob),
                                    decipher.final());
        } catch (ex) {
          return ex;
        }
      }
      // Nothing should we follow the private key(s), except a possible
      // authentication tag for relevant ciphers
      if (data._pos !== data.length)
        return new Error('Malformed OpenSSH private key');

      ret = parseOpenSSHPrivKeys(privBlob, keyCount, cipherKey !== undefined);
    } else {
      ret = [];
    }
    // This will need to change if/when OpenSSH ever starts storing multiple
    // keys in their key files
    return ret[0];
  };

  function parseOpenSSHPrivKeys(data, nkeys, decrypted) {
    const keys = [];
    /*
      uint32  checkint
      uint32  checkint
      string  privatekey1
      string  comment1
      string  privatekey2
      string  comment2
      ...
      string  privatekeyN
      string  commentN
      char  1
      char  2
      char  3
      ...
      char  padlen % 255
    */
    if (data.length < 8)
      return new Error('Malformed OpenSSH private key');
    const check1 = readUInt32BE(data, 0);
    const check2 = readUInt32BE(data, 4);
    if (check1 !== check2) {
      if (decrypted) {
        return new Error(
          'OpenSSH key integrity check failed -- bad passphrase?'
        );
      }
      return new Error('OpenSSH key integrity check failed');
    }
    data._pos = 8;
    let i;
    let oid;
    for (i = 0; i < nkeys; ++i) {
      let algo;
      let privPEM;
      let pubPEM;
      let pubSSH;
      // The OpenSSH documentation for the key format actually lies, the
      // entirety of the private key content is not contained with a string
      // field, it's actually the literal contents of the private key, so to be
      // able to find the end of the key data you need to know the layout/format
      // of each key type ...
      const type = readString(data, data._pos, true);
      if (type === undefined)
        return new Error('Malformed OpenSSH private key');

      switch (type) {
        case 'ssh-rsa': {
          /*
            string  n -- public
            string  e -- public
            string  d -- private
            string  iqmp -- private
            string  p -- private
            string  q -- private
          */
          const n = readString(data, data._pos);
          if (n === undefined)
            return new Error('Malformed OpenSSH private key');
          const e = readString(data, data._pos);
          if (e === undefined)
            return new Error('Malformed OpenSSH private key');
          const d = readString(data, data._pos);
          if (d === undefined)
            return new Error('Malformed OpenSSH private key');
          const iqmp = readString(data, data._pos);
          if (iqmp === undefined)
            return new Error('Malformed OpenSSH private key');
          const p = readString(data, data._pos);
          if (p === undefined)
            return new Error('Malformed OpenSSH private key');
          const q = readString(data, data._pos);
          if (q === undefined)
            return new Error('Malformed OpenSSH private key');

          pubPEM = genOpenSSLRSAPub(n, e);
          pubSSH = genOpenSSHRSAPub(n, e);
          privPEM = genOpenSSLRSAPriv(n, e, d, iqmp, p, q);
          algo = 'sha1';
          break;
        }
        case 'ssh-dss': {
          /*
            string  p -- public
            string  q -- public
            string  g -- public
            string  y -- public
            string  x -- private
          */
          const p = readString(data, data._pos);
          if (p === undefined)
            return new Error('Malformed OpenSSH private key');
          const q = readString(data, data._pos);
          if (q === undefined)
            return new Error('Malformed OpenSSH private key');
          const g = readString(data, data._pos);
          if (g === undefined)
            return new Error('Malformed OpenSSH private key');
          const y = readString(data, data._pos);
          if (y === undefined)
            return new Error('Malformed OpenSSH private key');
          const x = readString(data, data._pos);
          if (x === undefined)
            return new Error('Malformed OpenSSH private key');

          pubPEM = genOpenSSLDSAPub(p, q, g, y);
          pubSSH = genOpenSSHDSAPub(p, q, g, y);
          privPEM = genOpenSSLDSAPriv(p, q, g, y, x);
          algo = 'sha1';
          break;
        }
        case 'ssh-ed25519': {
          if (!eddsaSupported)
            return new Error(`Unsupported OpenSSH private key type: ${type}`);
          /*
            * string  public key
            * string  private key + public key
          */
          const edpub = readString(data, data._pos);
          if (edpub === undefined || edpub.length !== 32)
            return new Error('Malformed OpenSSH private key');
          const edpriv = readString(data, data._pos);
          if (edpriv === undefined || edpriv.length !== 64)
            return new Error('Malformed OpenSSH private key');

          pubPEM = genOpenSSLEdPub(edpub);
          pubSSH = genOpenSSHEdPub(edpub);
          privPEM = genOpenSSLEdPriv(bufferSlice(edpriv, 0, 32));
          algo = null;
          break;
        }
        case 'ecdsa-sha2-nistp256':
          algo = 'sha256';
          oid = '1.2.840.10045.3.1.7';
        // FALLTHROUGH
        case 'ecdsa-sha2-nistp384':
          if (algo === undefined) {
            algo = 'sha384';
            oid = '1.3.132.0.34';
          }
        // FALLTHROUGH
        case 'ecdsa-sha2-nistp521': {
          if (algo === undefined) {
            algo = 'sha512';
            oid = '1.3.132.0.35';
          }
          /*
            string  curve name
            string  Q -- public
            string  d -- private
          */
          // TODO: validate curve name against type
          if (!skipFields(data, 1)) // Skip curve name
            return new Error('Malformed OpenSSH private key');
          const ecpub = readString(data, data._pos);
          if (ecpub === undefined)
            return new Error('Malformed OpenSSH private key');
          const ecpriv = readString(data, data._pos);
          if (ecpriv === undefined)
            return new Error('Malformed OpenSSH private key');

          pubPEM = genOpenSSLECDSAPub(oid, ecpub);
          pubSSH = genOpenSSHECDSAPub(oid, ecpub);
          privPEM = genOpenSSLECDSAPriv(oid, ecpub, ecpriv);
          break;
        }
        default:
          return new Error(`Unsupported OpenSSH private key type: ${type}`);
      }

      const privComment = readString(data, data._pos, true);
      if (privComment === undefined)
        return new Error('Malformed OpenSSH private key');

      keys.push(
        new OpenSSH_Private(type, privComment, privPEM, pubPEM, pubSSH, algo,
                            decrypted)
      );
    }
    let cnt = 0;
    for (i = data._pos; i < data.length; ++i) {
      if (data[i] !== (++cnt % 255))
        return new Error('Malformed OpenSSH private key');
    }

    return keys;
  }
}


function OpenSSH_Old_Private(type, comment, privPEM, pubPEM, pubSSH, algo,
                             decrypted) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = privPEM;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = decrypted;
}
OpenSSH_Old_Private.prototype = BaseKey;
{
  const regexp = /^-----BEGIN (RSA|DSA|EC) PRIVATE KEY-----(?:\r\n|\n)((?:[^:]+:\s*[\S].*(?:\r\n|\n))*)([\s\S]+)(?:\r\n|\n)-----END (RSA|DSA|EC) PRIVATE KEY-----$/;
  OpenSSH_Old_Private.parse = (str, passphrase) => {
    const m = regexp.exec(str);
    if (m === null)
      return null;
    let privBlob = Buffer.from(m[3], 'base64');
    let headers = m[2];
    let decrypted = false;
    if (headers !== undefined) {
      // encrypted key
      headers = headers.split(/\r\n|\n/g);
      for (let i = 0; i < headers.length; ++i) {
        const header = headers[i];
        let sepIdx = header.indexOf(':');
        if (header.slice(0, sepIdx) === 'DEK-Info') {
          const val = header.slice(sepIdx + 2);
          sepIdx = val.indexOf(',');
          if (sepIdx === -1)
            continue;
          const cipherName = val.slice(0, sepIdx).toLowerCase();
          if (supportedOpenSSLCiphers.indexOf(cipherName) === -1) {
            return new Error(
              `Cipher (${cipherName}) not supported `
                + 'for encrypted OpenSSH private key'
            );
          }
          const encInfo = CIPHER_INFO_OPENSSL[cipherName];
          if (!encInfo) {
            return new Error(
              `Cipher (${cipherName}) not supported `
                + 'for encrypted OpenSSH private key'
            );
          }
          const cipherIV = Buffer.from(val.slice(sepIdx + 1), 'hex');
          if (cipherIV.length !== encInfo.ivLen)
            return new Error('Malformed encrypted OpenSSH private key');
          if (!passphrase) {
            return new Error(
              'Encrypted OpenSSH private key detected, but no passphrase given'
            );
          }
          const ivSlice = bufferSlice(cipherIV, 0, 8);
          let cipherKey = createHash('md5')
                            .update(passphrase)
                            .update(ivSlice)
                            .digest();
          while (cipherKey.length < encInfo.keyLen) {
            cipherKey = combineBuffers(
              cipherKey,
              createHash('md5')
                .update(cipherKey)
                .update(passphrase)
                .update(ivSlice)
                .digest()
            );
          }
          if (cipherKey.length > encInfo.keyLen)
            cipherKey = bufferSlice(cipherKey, 0, encInfo.keyLen);
          try {
            const decipher = createDecipheriv(cipherName, cipherKey, cipherIV);
            decipher.setAutoPadding(false);
            privBlob = combineBuffers(decipher.update(privBlob),
                                      decipher.final());
            decrypted = true;
          } catch (ex) {
            return ex;
          }
        }
      }
    }

    let type;
    let privPEM;
    let pubPEM;
    let pubSSH;
    let algo;
    let reader;
    let errMsg = 'Malformed OpenSSH private key';
    if (decrypted)
      errMsg += '. Bad passphrase?';
    switch (m[1]) {
      case 'RSA':
        type = 'ssh-rsa';
        privPEM = makePEM('RSA PRIVATE', privBlob);
        try {
          reader = new Ber.Reader(privBlob);
          reader.readSequence();
          reader.readInt(); // skip version
          const n = reader.readString(Ber.Integer, true);
          if (n === null)
            return new Error(errMsg);
          const e = reader.readString(Ber.Integer, true);
          if (e === null)
            return new Error(errMsg);
          pubPEM = genOpenSSLRSAPub(n, e);
          pubSSH = genOpenSSHRSAPub(n, e);
        } catch {
          return new Error(errMsg);
        }
        algo = 'sha1';
        break;
      case 'DSA':
        type = 'ssh-dss';
        privPEM = makePEM('DSA PRIVATE', privBlob);
        try {
          reader = new Ber.Reader(privBlob);
          reader.readSequence();
          reader.readInt(); // skip version
          const p = reader.readString(Ber.Integer, true);
          if (p === null)
            return new Error(errMsg);
          const q = reader.readString(Ber.Integer, true);
          if (q === null)
            return new Error(errMsg);
          const g = reader.readString(Ber.Integer, true);
          if (g === null)
            return new Error(errMsg);
          const y = reader.readString(Ber.Integer, true);
          if (y === null)
            return new Error(errMsg);
          pubPEM = genOpenSSLDSAPub(p, q, g, y);
          pubSSH = genOpenSSHDSAPub(p, q, g, y);
        } catch {
          return new Error(errMsg);
        }
        algo = 'sha1';
        break;
      case 'EC':
        let ecSSLName;
        let ecPriv;
        let ecOID;
        try {
          reader = new Ber.Reader(privBlob);
          reader.readSequence();
          reader.readInt(); // skip version
          ecPriv = reader.readString(Ber.OctetString, true);
          reader.readByte(); // Skip "complex" context type byte
          const offset = reader.readLength(); // Skip context length
          if (offset !== null) {
            reader._offset = offset;
            ecOID = reader.readOID();
            if (ecOID === null)
              return new Error(errMsg);
            switch (ecOID) {
              case '1.2.840.10045.3.1.7':
                // prime256v1/secp256r1
                ecSSLName = 'prime256v1';
                type = 'ecdsa-sha2-nistp256';
                algo = 'sha256';
                break;
              case '1.3.132.0.34':
                // secp384r1
                ecSSLName = 'secp384r1';
                type = 'ecdsa-sha2-nistp384';
                algo = 'sha384';
                break;
              case '1.3.132.0.35':
                // secp521r1
                ecSSLName = 'secp521r1';
                type = 'ecdsa-sha2-nistp521';
                algo = 'sha512';
                break;
              default:
                return new Error(`Unsupported private key EC OID: ${ecOID}`);
            }
          } else {
            return new Error(errMsg);
          }
        } catch {
          return new Error(errMsg);
        }
        privPEM = makePEM('EC PRIVATE', privBlob);
        const pubBlob = genOpenSSLECDSAPubFromPriv(ecSSLName, ecPriv);
        pubPEM = genOpenSSLECDSAPub(ecOID, pubBlob);
        pubSSH = genOpenSSHECDSAPub(ecOID, pubBlob);
        break;
    }

    return new OpenSSH_Old_Private(type, '', privPEM, pubPEM, pubSSH, algo,
                                   decrypted);
  };
}


function PPK_Private(type, comment, privPEM, pubPEM, pubSSH, algo, decrypted) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = privPEM;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = decrypted;
}
PPK_Private.prototype = BaseKey;
{
  const EMPTY_PASSPHRASE = Buffer.alloc(0);
  const PPK_IV = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const PPK_PP1 = Buffer.from([0, 0, 0, 0]);
  const PPK_PP2 = Buffer.from([0, 0, 0, 1]);
  const regexp = /^PuTTY-User-Key-File-2: (ssh-(?:rsa|dss))\r?\nEncryption: (aes256-cbc|none)\r?\nComment: ([^\r\n]*)\r?\nPublic-Lines: \d+\r?\n([\s\S]+?)\r?\nPrivate-Lines: \d+\r?\n([\s\S]+?)\r?\nPrivate-MAC: ([^\r\n]+)/;
  PPK_Private.parse = (str, passphrase) => {
    const m = regexp.exec(str);
    if (m === null)
      return null;
    // m[1] = key type
    // m[2] = encryption type
    // m[3] = comment
    // m[4] = base64-encoded public key data:
    //         for "ssh-rsa":
    //          string "ssh-rsa"
    //          mpint  e    (public exponent)
    //          mpint  n    (modulus)
    //         for "ssh-dss":
    //          string "ssh-dss"
    //          mpint p     (modulus)
    //          mpint q     (prime)
    //          mpint g     (base number)
    //          mpint y     (public key parameter: g^x mod p)
    // m[5] = base64-encoded private key data:
    //         for "ssh-rsa":
    //          mpint  d    (private exponent)
    //          mpint  p    (prime 1)
    //          mpint  q    (prime 2)
    //          mpint  iqmp ([inverse of q] mod p)
    //         for "ssh-dss":
    //          mpint x     (private key parameter)
    // m[6] = SHA1 HMAC over:
    //          string  name of algorithm ("ssh-dss", "ssh-rsa")
    //          string  encryption type
    //          string  comment
    //          string  public key data
    //          string  private-plaintext (including the final padding)
    const cipherName = m[2];
    const encrypted = (cipherName !== 'none');
    if (encrypted && !passphrase) {
      return new Error(
        'Encrypted PPK private key detected, but no passphrase given'
      );
    }

    let privBlob = Buffer.from(m[5], 'base64');

    if (encrypted) {
      const encInfo = CIPHER_INFO[cipherName];
      let cipherKey = combineBuffers(
        createHash('sha1').update(PPK_PP1).update(passphrase).digest(),
        createHash('sha1').update(PPK_PP2).update(passphrase).digest()
      );
      if (cipherKey.length > encInfo.keyLen)
        cipherKey = bufferSlice(cipherKey, 0, encInfo.keyLen);
      try {
        const decipher = createDecipheriv(encInfo.sslName,
                                        cipherKey,
                                        PPK_IV);
        decipher.setAutoPadding(false);
        privBlob = combineBuffers(decipher.update(privBlob),
                                  decipher.final());
      } catch (ex) {
        return ex;
      }
    }

    const type = m[1];
    const comment = m[3];
    const pubBlob = Buffer.from(m[4], 'base64');

    const mac = m[6];
    const typeLen = type.length;
    const cipherNameLen = cipherName.length;
    const commentLen = Buffer.byteLength(comment);
    const pubLen = pubBlob.length;
    const privLen = privBlob.length;
    const macData = Buffer.allocUnsafe(4 + typeLen
                                       + 4 + cipherNameLen
                                       + 4 + commentLen
                                       + 4 + pubLen
                                       + 4 + privLen);
    let p = 0;

    writeUInt32BE(macData, typeLen, p);
    macData.utf8Write(type, p += 4, typeLen);
    writeUInt32BE(macData, cipherNameLen, p += typeLen);
    macData.utf8Write(cipherName, p += 4, cipherNameLen);
    writeUInt32BE(macData, commentLen, p += cipherNameLen);
    macData.utf8Write(comment, p += 4, commentLen);
    writeUInt32BE(macData, pubLen, p += commentLen);
    macData.set(pubBlob, p += 4);
    writeUInt32BE(macData, privLen, p += pubLen);
    macData.set(privBlob, p + 4);

    if (!passphrase)
      passphrase = EMPTY_PASSPHRASE;

    const calcMAC = createHmac(
      'sha1',
       createHash('sha1')
         .update('putty-private-key-file-mac-key')
         .update(passphrase)
         .digest()
    ).update(macData).digest('hex');

    if (calcMAC !== mac) {
      if (encrypted) {
        return new Error(
          'PPK private key integrity check failed -- bad passphrase?'
        );
      }
      return new Error('PPK private key integrity check failed');
    }

    let pubPEM;
    let pubSSH;
    let privPEM;
    pubBlob._pos = 0;
    skipFields(pubBlob, 1); // skip (duplicate) key type
    switch (type) {
      case 'ssh-rsa': {
        const e = readString(pubBlob, pubBlob._pos);
        if (e === undefined)
          return new Error('Malformed PPK public key');
        const n = readString(pubBlob, pubBlob._pos);
        if (n === undefined)
          return new Error('Malformed PPK public key');
        const d = readString(privBlob, 0);
        if (d === undefined)
          return new Error('Malformed PPK private key');
        const p = readString(privBlob, privBlob._pos);
        if (p === undefined)
          return new Error('Malformed PPK private key');
        const q = readString(privBlob, privBlob._pos);
        if (q === undefined)
          return new Error('Malformed PPK private key');
        const iqmp = readString(privBlob, privBlob._pos);
        if (iqmp === undefined)
          return new Error('Malformed PPK private key');
        pubPEM = genOpenSSLRSAPub(n, e);
        pubSSH = genOpenSSHRSAPub(n, e);
        privPEM = genOpenSSLRSAPriv(n, e, d, iqmp, p, q);
        break;
      }
      case 'ssh-dss': {
        const p = readString(pubBlob, pubBlob._pos);
        if (p === undefined)
          return new Error('Malformed PPK public key');
        const q = readString(pubBlob, pubBlob._pos);
        if (q === undefined)
          return new Error('Malformed PPK public key');
        const g = readString(pubBlob, pubBlob._pos);
        if (g === undefined)
          return new Error('Malformed PPK public key');
        const y = readString(pubBlob, pubBlob._pos);
        if (y === undefined)
          return new Error('Malformed PPK public key');
        const x = readString(privBlob, 0);
        if (x === undefined)
          return new Error('Malformed PPK private key');

        pubPEM = genOpenSSLDSAPub(p, q, g, y);
        pubSSH = genOpenSSHDSAPub(p, q, g, y);
        privPEM = genOpenSSLDSAPriv(p, q, g, y, x);
        break;
      }
    }

    return new PPK_Private(type, comment, privPEM, pubPEM, pubSSH, 'sha1',
                           encrypted);
  };
}


function OpenSSH_Public(type, comment, pubPEM, pubSSH, algo) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = null;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = false;
}
OpenSSH_Public.prototype = BaseKey;
{
  let regexp;
  if (eddsaSupported)
    regexp = /^(((?:ssh-(?:rsa|dss|ed25519))|ecdsa-sha2-nistp(?:256|384|521))(?:-cert-v0[01]@openssh.com)?) ([A-Z0-9a-z/+=]+)(?:$|\s+([\S].*)?)$/;
  else
    regexp = /^(((?:ssh-(?:rsa|dss))|ecdsa-sha2-nistp(?:256|384|521))(?:-cert-v0[01]@openssh.com)?) ([A-Z0-9a-z/+=]+)(?:$|\s+([\S].*)?)$/;
  OpenSSH_Public.parse = (str) => {
    const m = regexp.exec(str);
    if (m === null)
      return null;
    // m[1] = full type
    // m[2] = base type
    // m[3] = base64-encoded public key
    // m[4] = comment

    const fullType = m[1];
    const baseType = m[2];
    const data = Buffer.from(m[3], 'base64');
    const comment = (m[4] || '');

    const type = readString(data, data._pos, true);
    if (type === undefined || type.indexOf(baseType) !== 0)
      return new Error('Malformed OpenSSH public key');

    return parseDER(data, baseType, comment, fullType);
  };
}


function RFC4716_Public(type, comment, pubPEM, pubSSH, algo) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = null;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = false;
}
RFC4716_Public.prototype = BaseKey;
{
  const regexp = /^---- BEGIN SSH2 PUBLIC KEY ----(?:\r?\n)((?:.{0,72}\r?\n)+)---- END SSH2 PUBLIC KEY ----$/;
  const RE_DATA = /^[A-Z0-9a-z/+=\r\n]+$/;
  const RE_HEADER = /^([\x21-\x39\x3B-\x7E]{1,64}): ((?:[^\\]*\\\r?\n)*[^\r\n]+)\r?\n/gm;
  const RE_HEADER_ENDS = /\\\r?\n/g;
  RFC4716_Public.parse = (str) => {
    let m = regexp.exec(str);
    if (m === null)
      return null;

    const body = m[1];
    let dataStart = 0;
    let comment = '';

    while (m = RE_HEADER.exec(body)) {
      const headerName = m[1];
      const headerValue = m[2].replace(RE_HEADER_ENDS, '');
      if (headerValue.length > 1024) {
        RE_HEADER.lastIndex = 0;
        return new Error('Malformed RFC4716 public key');
      }

      dataStart = RE_HEADER.lastIndex;

      if (headerName.toLowerCase() === 'comment') {
        comment = headerValue;
        if (comment.length > 1
            && comment.charCodeAt(0) === 34/* '"' */
            && comment.charCodeAt(comment.length - 1) === 34/* '"' */) {
          comment = comment.slice(1, -1);
        }
      }
    }

    let data = body.slice(dataStart);
    if (!RE_DATA.test(data))
      return new Error('Malformed RFC4716 public key');

    data = Buffer.from(data, 'base64');

    const type = readString(data, 0, true);
    if (type === undefined)
      return new Error('Malformed RFC4716 public key');

    let pubPEM = null;
    let pubSSH = null;
    switch (type) {
      case 'ssh-rsa': {
        const e = readString(data, data._pos);
        if (e === undefined)
          return new Error('Malformed RFC4716 public key');
        const n = readString(data, data._pos);
        if (n === undefined)
          return new Error('Malformed RFC4716 public key');
        pubPEM = genOpenSSLRSAPub(n, e);
        pubSSH = genOpenSSHRSAPub(n, e);
        break;
      }
      case 'ssh-dss': {
        const p = readString(data, data._pos);
        if (p === undefined)
          return new Error('Malformed RFC4716 public key');
        const q = readString(data, data._pos);
        if (q === undefined)
          return new Error('Malformed RFC4716 public key');
        const g = readString(data, data._pos);
        if (g === undefined)
          return new Error('Malformed RFC4716 public key');
        const y = readString(data, data._pos);
        if (y === undefined)
          return new Error('Malformed RFC4716 public key');
        pubPEM = genOpenSSLDSAPub(p, q, g, y);
        pubSSH = genOpenSSHDSAPub(p, q, g, y);
        break;
      }
      default:
        return new Error('Malformed RFC4716 public key');
    }

    return new RFC4716_Public(type, comment, pubPEM, pubSSH, 'sha1');
  };
}


function parseDER(data, baseType, comment, fullType) {
  if (!isSupportedKeyType(baseType))
    return new Error(`Unsupported OpenSSH public key type: ${baseType}`);

  let algo;
  let oid;
  let pubPEM = null;
  let pubSSH = null;

  switch (baseType) {
    case 'ssh-rsa': {
      const e = readString(data, data._pos || 0);
      if (e === undefined)
        return new Error('Malformed OpenSSH public key');
      const n = readString(data, data._pos);
      if (n === undefined)
        return new Error('Malformed OpenSSH public key');
      pubPEM = genOpenSSLRSAPub(n, e);
      pubSSH = genOpenSSHRSAPub(n, e);
      algo = 'sha1';
      break;
    }
    case 'ssh-dss': {
      const p = readString(data, data._pos || 0);
      if (p === undefined)
        return new Error('Malformed OpenSSH public key');
      const q = readString(data, data._pos);
      if (q === undefined)
        return new Error('Malformed OpenSSH public key');
      const g = readString(data, data._pos);
      if (g === undefined)
        return new Error('Malformed OpenSSH public key');
      const y = readString(data, data._pos);
      if (y === undefined)
        return new Error('Malformed OpenSSH public key');
      pubPEM = genOpenSSLDSAPub(p, q, g, y);
      pubSSH = genOpenSSHDSAPub(p, q, g, y);
      algo = 'sha1';
      break;
    }
    case 'ssh-ed25519': {
      const edpub = readString(data, data._pos || 0);
      if (edpub === undefined || edpub.length !== 32)
        return new Error('Malformed OpenSSH public key');
      pubPEM = genOpenSSLEdPub(edpub);
      pubSSH = genOpenSSHEdPub(edpub);
      algo = null;
      break;
    }
    case 'ecdsa-sha2-nistp256':
      algo = 'sha256';
      oid = '1.2.840.10045.3.1.7';
    // FALLTHROUGH
    case 'ecdsa-sha2-nistp384':
      if (algo === undefined) {
        algo = 'sha384';
        oid = '1.3.132.0.34';
      }
    // FALLTHROUGH
    case 'ecdsa-sha2-nistp521': {
      if (algo === undefined) {
        algo = 'sha512';
        oid = '1.3.132.0.35';
      }
      // TODO: validate curve name against type
      if (!skipFields(data, 1)) // Skip curve name
        return new Error('Malformed OpenSSH public key');
      const ecpub = readString(data, data._pos || 0);
      if (ecpub === undefined)
        return new Error('Malformed OpenSSH public key');
      pubPEM = genOpenSSLECDSAPub(oid, ecpub);
      pubSSH = genOpenSSHECDSAPub(oid, ecpub);
      break;
    }
    default:
      return new Error(`Unsupported OpenSSH public key type: ${baseType}`);
  }

  return new OpenSSH_Public(fullType, comment, pubPEM, pubSSH, algo);
}

function isSupportedKeyType(type) {
  switch (type) {
    case 'ssh-rsa':
    case 'ssh-dss':
    case 'ecdsa-sha2-nistp256':
    case 'ecdsa-sha2-nistp384':
    case 'ecdsa-sha2-nistp521':
      return true;
    case 'ssh-ed25519':
      if (eddsaSupported)
        return true;
    // FALLTHROUGH
    default:
      return false;
  }
}

function isParsedKey(val) {
  if (!val)
    return false;
  return (typeof val[SYM_DECRYPTED] === 'boolean');
}

function parseKey(data, passphrase) {
  if (isParsedKey(data))
    return data;

  let origBuffer;
  if (Buffer.isBuffer(data)) {
    origBuffer = data;
    data = data.utf8Slice(0, data.length).trim();
  } else if (typeof data === 'string') {
    data = data.trim();
  } else {
    return new Error('Key data must be a Buffer or string');
  }

  // eslint-disable-next-line eqeqeq
  if (passphrase != undefined) {
    if (typeof passphrase === 'string')
      passphrase = Buffer.from(passphrase);
    else if (!Buffer.isBuffer(passphrase))
      return new Error('Passphrase must be a string or Buffer when supplied');
  }

  let ret;

  // First try as printable string format (e.g. PEM)

  // Private keys
  if ((ret = OpenSSH_Private.parse(data, passphrase)) !== null)
    return ret;
  if ((ret = OpenSSH_Old_Private.parse(data, passphrase)) !== null)
    return ret;
  if ((ret = PPK_Private.parse(data, passphrase)) !== null)
    return ret;

  // Public keys
  if ((ret = OpenSSH_Public.parse(data)) !== null)
    return ret;
  if ((ret = RFC4716_Public.parse(data)) !== null)
    return ret;

  // Finally try as a binary format if we were originally passed binary data
  if (origBuffer) {
    binaryKeyParser.init(origBuffer, 0);
    const type = binaryKeyParser.readString(true);
    if (type !== undefined) {
      data = binaryKeyParser.readRaw();
      if (data !== undefined) {
        ret = parseDER(data, type, '', type);
        // Ignore potentially useless errors in case the data was not actually
        // in the binary format
        if (ret instanceof Error)
          ret = null;
      }
    }
    binaryKeyParser.clear();
  }

  if (ret)
    return ret;

  return new Error('Unsupported key format');
}

module.exports = {
  isParsedKey,
  isSupportedKeyType,
  parseDERKey: (data, type) => parseDER(data, type, '', type),
  parseKey,
};


/***/ }),

/***/ 7609:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


const assert = __nccwpck_require__(2357);
const { inspect } = __nccwpck_require__(1669);

// Only use this for integers! Decimal numbers do not work with this function.
function addNumericalSeparator(val) {
  let res = '';
  let i = val.length;
  const start = val[0] === '-' ? 1 : 0;
  for (; i >= start + 4; i -= 3)
    res = `_${val.slice(i - 3, i)}${res}`;
  return `${val.slice(0, i)}${res}`;
}

function oneOf(expected, thing) {
  assert(typeof thing === 'string', '`thing` has to be of type string');
  if (Array.isArray(expected)) {
    const len = expected.length;
    assert(len > 0, 'At least one expected value needs to be specified');
    expected = expected.map((i) => String(i));
    if (len > 2) {
      return `one of ${thing} ${expected.slice(0, len - 1).join(', ')}, or `
              + expected[len - 1];
    } else if (len === 2) {
      return `one of ${thing} ${expected[0]} or ${expected[1]}`;
    }
    return `of ${thing} ${expected[0]}`;
  }
  return `of ${thing} ${String(expected)}`;
}


exports.ERR_INTERNAL_ASSERTION = class ERR_INTERNAL_ASSERTION extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, ERR_INTERNAL_ASSERTION);

    const suffix = 'This is caused by either a bug in ssh2 '
                   + 'or incorrect usage of ssh2 internals.\n'
                   + 'Please open an issue with this stack trace at '
                   + 'https://github.com/mscdex/ssh2/issues\n';

    this.message = (message === undefined ? suffix : `${message}\n${suffix}`);
  }
};

const MAX_32BIT_INT = 2 ** 32;
const MAX_32BIT_BIGINT = (() => {
  try {
    return new Function('return 2n ** 32n')();
  } catch {}
})();
exports.ERR_OUT_OF_RANGE = class ERR_OUT_OF_RANGE extends RangeError {
  constructor(str, range, input, replaceDefaultBoolean) {
    super();
    Error.captureStackTrace(this, ERR_OUT_OF_RANGE);

    assert(range, 'Missing "range" argument');
    let msg = (replaceDefaultBoolean
               ? str
               : `The value of "${str}" is out of range.`);
    let received;
    if (Number.isInteger(input) && Math.abs(input) > MAX_32BIT_INT) {
      received = addNumericalSeparator(String(input));
    } else if (typeof input === 'bigint') {
      received = String(input);
      if (input > MAX_32BIT_BIGINT || input < -MAX_32BIT_BIGINT)
        received = addNumericalSeparator(received);
      received += 'n';
    } else {
      received = inspect(input);
    }
    msg += ` It must be ${range}. Received ${received}`;

    this.message = msg;
  }
};

class ERR_INVALID_ARG_TYPE extends TypeError {
  constructor(name, expected, actual) {
    super();
    Error.captureStackTrace(this, ERR_INVALID_ARG_TYPE);

    assert(typeof name === 'string', `'name' must be a string`);

    // determiner: 'must be' or 'must not be'
    let determiner;
    if (typeof expected === 'string' && expected.startsWith('not ')) {
      determiner = 'must not be';
      expected = expected.replace(/^not /, '');
    } else {
      determiner = 'must be';
    }

    let msg;
    if (name.endsWith(' argument')) {
      // For cases like 'first argument'
      msg = `The ${name} ${determiner} ${oneOf(expected, 'type')}`;
    } else {
      const type = (name.includes('.') ? 'property' : 'argument');
      msg = `The "${name}" ${type} ${determiner} ${oneOf(expected, 'type')}`;
    }

    msg += `. Received type ${typeof actual}`;

    this.message = msg;
  }
}
exports.ERR_INVALID_ARG_TYPE = ERR_INVALID_ARG_TYPE;

exports.validateNumber = function validateNumber(value, name) {
  if (typeof value !== 'number')
    throw new ERR_INVALID_ARG_TYPE(name, 'number', value);
};


/***/ }),

/***/ 9475:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const Ber = __nccwpck_require__(970).Ber;

let DISCONNECT_REASON;

const FastBuffer = Buffer[Symbol.species];
const TypedArrayFill = Object.getPrototypeOf(Uint8Array.prototype).fill;

function readUInt32BE(buf, offset) {
  return (buf[offset++] * 16777216)
         + (buf[offset++] * 65536)
         + (buf[offset++] * 256)
         + buf[offset];
}

function bufferCopy(src, dest, srcStart, srcEnd, destStart) {
  if (!destStart)
    destStart = 0;
  if (srcEnd > src.length)
    srcEnd = src.length;
  let nb = srcEnd - srcStart;
  const destLeft = (dest.length - destStart);
  if (nb > destLeft)
    nb = destLeft;
  dest.set(new Uint8Array(src.buffer, src.byteOffset + srcStart, nb),
           destStart);
  return nb;
}

function bufferSlice(buf, start, end) {
  if (end === undefined)
    end = buf.length;
  return new FastBuffer(buf.buffer, buf.byteOffset + start, end - start);
}

function makeBufferParser() {
  let pos = 0;
  let buffer;

  const self = {
    init: (buf, start) => {
      buffer = buf;
      pos = (typeof start === 'number' ? start : 0);
    },
    pos: () => pos,
    length: () => (buffer ? buffer.length : 0),
    avail: () => (buffer && pos < buffer.length ? buffer.length - pos : 0),
    clear: () => {
      buffer = undefined;
    },
    readUInt32BE: () => {
      if (!buffer || pos + 3 >= buffer.length)
        return;
      return (buffer[pos++] * 16777216)
             + (buffer[pos++] * 65536)
             + (buffer[pos++] * 256)
             + buffer[pos++];
    },
    readUInt64BE: (behavior) => {
      if (!buffer || pos + 7 >= buffer.length)
        return;
      switch (behavior) {
        case 'always':
          return BigInt(`0x${buffer.hexSlice(pos, pos += 8)}`);
        case 'maybe':
          if (buffer[pos] > 0x1F)
            return BigInt(`0x${buffer.hexSlice(pos, pos += 8)}`);
          // FALLTHROUGH
        default:
          return (buffer[pos++] * 72057594037927940)
                 + (buffer[pos++] * 281474976710656)
                 + (buffer[pos++] * 1099511627776)
                 + (buffer[pos++] * 4294967296)
                 + (buffer[pos++] * 16777216)
                 + (buffer[pos++] * 65536)
                 + (buffer[pos++] * 256)
                 + buffer[pos++];
      }
    },
    skip: (n) => {
      if (buffer && n > 0)
        pos += n;
    },
    skipString: () => {
      const len = self.readUInt32BE();
      if (len === undefined)
        return;
      pos += len;
      return (pos <= buffer.length ? len : undefined);
    },
    readByte: () => {
      if (buffer && pos < buffer.length)
        return buffer[pos++];
    },
    readBool: () => {
      if (buffer && pos < buffer.length)
        return !!buffer[pos++];
    },
    readList: () => {
      const list = self.readString(true);
      if (list === undefined)
        return;
      return (list ? list.split(',') : []);
    },
    readString: (dest, maxLen) => {
      if (typeof dest === 'number') {
        maxLen = dest;
        dest = undefined;
      }

      const len = self.readUInt32BE();
      if (len === undefined)
        return;

      if ((buffer.length - pos) < len
          || (typeof maxLen === 'number' && len > maxLen)) {
        return;
      }

      if (dest) {
        if (Buffer.isBuffer(dest))
          return bufferCopy(buffer, dest, pos, pos += len);
        return buffer.utf8Slice(pos, pos += len);
      }
      return bufferSlice(buffer, pos, pos += len);
    },
    readRaw: (len) => {
      if (!buffer)
        return;
      if (typeof len !== 'number')
        return bufferSlice(buffer, pos, pos += (buffer.length - pos));
      if ((buffer.length - pos) >= len)
        return bufferSlice(buffer, pos, pos += len);
    },
  };

  return self;
}

function makeError(msg, level, fatal) {
  const err = new Error(msg);
  if (typeof level === 'boolean') {
    fatal = level;
    err.level = 'protocol';
  } else {
    err.level = level || 'protocol';
  }
  err.fatal = !!fatal;
  return err;
}

function writeUInt32BE(buf, value, offset) {
  buf[offset++] = (value >>> 24);
  buf[offset++] = (value >>> 16);
  buf[offset++] = (value >>> 8);
  buf[offset++] = value;
  return offset;
}

const utilBufferParser = makeBufferParser();

module.exports = {
  bufferCopy,
  bufferSlice,
  FastBuffer,
  bufferFill: (buf, value, start, end) => {
    return TypedArrayFill.call(buf, value, start, end);
  },
  makeError,
  doFatalError: (protocol, msg, level, reason) => {
    let err;
    if (DISCONNECT_REASON === undefined)
      ({ DISCONNECT_REASON } = __nccwpck_require__(9475));
    if (msg instanceof Error) {
      // doFatalError(protocol, err[, reason])
      err = msg;
      if (typeof level !== 'number')
        reason = DISCONNECT_REASON.PROTOCOL_ERROR;
      else
        reason = level;
    } else {
      // doFatalError(protocol, msg[, level[, reason]])
      err = makeError(msg, level, true);
    }
    if (typeof reason !== 'number')
      reason = DISCONNECT_REASON.PROTOCOL_ERROR;
    protocol.disconnect(reason);
    protocol._destruct();
    protocol._onError(err);
    return Infinity;
  },
  readUInt32BE,
  writeUInt32BE,
  writeUInt32LE: (buf, value, offset) => {
    buf[offset++] = value;
    buf[offset++] = (value >>> 8);
    buf[offset++] = (value >>> 16);
    buf[offset++] = (value >>> 24);
    return offset;
  },
  makeBufferParser,
  bufferParser: makeBufferParser(),
  readString: (buffer, start, dest, maxLen) => {
    if (typeof dest === 'number') {
      maxLen = dest;
      dest = undefined;
    }

    if (start === undefined)
      start = 0;

    const left = (buffer.length - start);
    if (start < 0 || start >= buffer.length || left < 4)
      return;

    const len = readUInt32BE(buffer, start);
    if (left < (4 + len) || (typeof maxLen === 'number' && len > maxLen))
      return;

    start += 4;
    const end = start + len;
    buffer._pos = end;

    if (dest) {
      if (Buffer.isBuffer(dest))
        return bufferCopy(buffer, dest, start, end);
      return buffer.utf8Slice(start, end);
    }
    return bufferSlice(buffer, start, end);
  },
  sigSSHToASN1: (sig, type) => {
    switch (type) {
      case 'ssh-dss': {
        if (sig.length > 40)
          return sig;
        // Change bare signature r and s values to ASN.1 BER values for OpenSSL
        const asnWriter = new Ber.Writer();
        asnWriter.startSequence();
        let r = sig.slice(0, 20);
        let s = sig.slice(20);
        if (r[0] & 0x80) {
          const rNew = Buffer.allocUnsafe(21);
          rNew[0] = 0x00;
          r.copy(rNew, 1);
          r = rNew;
        } else if (r[0] === 0x00 && !(r[1] & 0x80)) {
          r = r.slice(1);
        }
        if (s[0] & 0x80) {
          const sNew = Buffer.allocUnsafe(21);
          sNew[0] = 0x00;
          s.copy(sNew, 1);
          s = sNew;
        } else if (s[0] === 0x00 && !(s[1] & 0x80)) {
          s = s.slice(1);
        }
        asnWriter.writeBuffer(r, Ber.Integer);
        asnWriter.writeBuffer(s, Ber.Integer);
        asnWriter.endSequence();
        return asnWriter.buffer;
      }
      case 'ecdsa-sha2-nistp256':
      case 'ecdsa-sha2-nistp384':
      case 'ecdsa-sha2-nistp521': {
        utilBufferParser.init(sig, 0);
        const r = utilBufferParser.readString();
        const s = utilBufferParser.readString();
        utilBufferParser.clear();
        if (r === undefined || s === undefined)
          return;

        const asnWriter = new Ber.Writer();
        asnWriter.startSequence();
        asnWriter.writeBuffer(r, Ber.Integer);
        asnWriter.writeBuffer(s, Ber.Integer);
        asnWriter.endSequence();
        return asnWriter.buffer;
      }
      default:
        return sig;
    }
  },
  convertSignature: (signature, keyType) => {
    switch (keyType) {
      case 'ssh-dss': {
        if (signature.length <= 40)
          return signature;
        // This is a quick and dirty way to get from BER encoded r and s that
        // OpenSSL gives us, to just the bare values back to back (40 bytes
        // total) like OpenSSH (and possibly others) are expecting
        const asnReader = new Ber.Reader(signature);
        asnReader.readSequence();
        let r = asnReader.readString(Ber.Integer, true);
        let s = asnReader.readString(Ber.Integer, true);
        let rOffset = 0;
        let sOffset = 0;
        if (r.length < 20) {
          const rNew = Buffer.allocUnsafe(20);
          rNew.set(r, 1);
          r = rNew;
          r[0] = 0;
        }
        if (s.length < 20) {
          const sNew = Buffer.allocUnsafe(20);
          sNew.set(s, 1);
          s = sNew;
          s[0] = 0;
        }
        if (r.length > 20 && r[0] === 0)
          rOffset = 1;
        if (s.length > 20 && s[0] === 0)
          sOffset = 1;
        const newSig =
          Buffer.allocUnsafe((r.length - rOffset) + (s.length - sOffset));
        bufferCopy(r, newSig, rOffset, r.length, 0);
        bufferCopy(s, newSig, sOffset, s.length, r.length - rOffset);
        return newSig;
      }
      case 'ecdsa-sha2-nistp256':
      case 'ecdsa-sha2-nistp384':
      case 'ecdsa-sha2-nistp521': {
        if (signature[0] === 0)
          return signature;
        // Convert SSH signature parameters to ASN.1 BER values for OpenSSL
        const asnReader = new Ber.Reader(signature);
        asnReader.readSequence();
        const r = asnReader.readString(Ber.Integer, true);
        const s = asnReader.readString(Ber.Integer, true);
        if (r === null || s === null)
          return;
        const newSig = Buffer.allocUnsafe(4 + r.length + 4 + s.length);
        writeUInt32BE(newSig, r.length, 0);
        newSig.set(r, 4);
        writeUInt32BE(newSig, s.length, 4 + r.length);
        newSig.set(s, 4 + 4 + r.length);
        return newSig;
      }
    }

    return signature;
  },
  sendPacket: (proto, packet, bypass) => {
    if (!bypass && proto._kexinit !== undefined) {
      // We're currently in the middle of a handshake

      if (proto._queue === undefined)
        proto._queue = [];
      proto._queue.push(packet);
      proto._debug && proto._debug('Outbound: ... packet queued');
      return false;
    }
    proto._cipher.encrypt(packet);
    return true;
  },
};


/***/ }),

/***/ 6715:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { kMaxLength } = __nccwpck_require__(4293);
const {
  createInflate,
  constants: {
    DEFLATE,
    INFLATE,
    Z_DEFAULT_CHUNK,
    Z_DEFAULT_COMPRESSION,
    Z_DEFAULT_MEMLEVEL,
    Z_DEFAULT_STRATEGY,
    Z_DEFAULT_WINDOWBITS,
    Z_PARTIAL_FLUSH,
  }
} = __nccwpck_require__(8761);
const ZlibHandle = createInflate()._handle.constructor;

function processCallback() {
  throw new Error('Should not get here');
}

function zlibOnError(message, errno, code) {
  const self = this._owner;
  // There is no way to cleanly recover.
  // Continuing only obscures problems.

  const error = new Error(message);
  error.errno = errno;
  error.code = code;
  self._err = error;
}

function _close(engine) {
  // Caller may invoke .close after a zlib error (which will null _handle).
  if (!engine._handle)
    return;

  engine._handle.close();
  engine._handle = null;
}

class Zlib {
  constructor(mode) {
    const windowBits = Z_DEFAULT_WINDOWBITS;
    const level = Z_DEFAULT_COMPRESSION;
    const memLevel = Z_DEFAULT_MEMLEVEL;
    const strategy = Z_DEFAULT_STRATEGY;
    const dictionary = undefined;

    this._err = undefined;
    this._writeState = new Uint32Array(2);
    this._chunkSize = Z_DEFAULT_CHUNK;
    this._maxOutputLength = kMaxLength;
    this._outBuffer = Buffer.allocUnsafe(this._chunkSize);
    this._outOffset = 0;

    this._handle = new ZlibHandle(mode);
    this._handle._owner = this;
    this._handle.onerror = zlibOnError;
    this._handle.init(windowBits,
                      level,
                      memLevel,
                      strategy,
                      this._writeState,
                      processCallback,
                      dictionary);
  }

  writeSync(chunk, retChunks) {
    const handle = this._handle;
    if (!handle)
      throw new Error('Invalid Zlib instance');

    let availInBefore = chunk.length;
    let availOutBefore = this._chunkSize - this._outOffset;
    let inOff = 0;
    let availOutAfter;
    let availInAfter;

    let buffers;
    let nread = 0;
    const state = this._writeState;
    let buffer = this._outBuffer;
    let offset = this._outOffset;
    const chunkSize = this._chunkSize;

    while (true) {
      handle.writeSync(Z_PARTIAL_FLUSH,
                       chunk, // in
                       inOff, // in_off
                       availInBefore, // in_len
                       buffer, // out
                       offset, // out_off
                       availOutBefore); // out_len
      if (this._err)
        throw this._err;

      availOutAfter = state[0];
      availInAfter = state[1];

      const inDelta = availInBefore - availInAfter;
      const have = availOutBefore - availOutAfter;

      if (have > 0) {
        const out = (offset === 0 && have === buffer.length
                     ? buffer
                     : buffer.slice(offset, offset + have));
        offset += have;
        if (!buffers)
          buffers = out;
        else if (buffers.push === undefined)
          buffers = [buffers, out];
        else
          buffers.push(out);
        nread += out.byteLength;

        if (nread > this._maxOutputLength) {
          _close(this);
          throw new Error(
            `Output length exceeded maximum of ${this._maxOutputLength}`
          );
        }
      } else if (have !== 0) {
        throw new Error('have should not go down');
      }

      // Exhausted the output buffer, or used all the input create a new one.
      if (availOutAfter === 0 || offset >= chunkSize) {
        availOutBefore = chunkSize;
        offset = 0;
        buffer = Buffer.allocUnsafe(chunkSize);
      }

      if (availOutAfter === 0) {
        // Not actually done. Need to reprocess.
        // Also, update the availInBefore to the availInAfter value,
        // so that if we have to hit it a third (fourth, etc.) time,
        // it'll have the correct byte counts.
        inOff += inDelta;
        availInBefore = availInAfter;
      } else {
        break;
      }
    }

    this._outBuffer = buffer;
    this._outOffset = offset;

    if (nread === 0)
      buffers = Buffer.alloc(0);

    if (retChunks) {
      buffers.totalLen = nread;
      return buffers;
    }

    if (buffers.push === undefined)
      return buffers;

    const output = Buffer.allocUnsafe(nread);
    for (let i = 0, p = 0; i < buffers.length; ++i) {
      const buf = buffers[i];
      output.set(buf, p);
      p += buf.length;
    }
    return output;
  }
}

class ZlibPacketWriter {
  constructor(protocol) {
    this.allocStart = 0;
    this.allocStartKEX = 0;
    this._protocol = protocol;
    this._zlib = new Zlib(DEFLATE);
  }

  cleanup() {
    if (this._zlib)
      _close(this._zlib);
  }

  alloc(payloadSize, force) {
    return Buffer.allocUnsafe(payloadSize);
  }

  finalize(payload, force) {
    if (this._protocol._kexinit === undefined || force) {
      const output = this._zlib.writeSync(payload, true);
      const packet = this._protocol._cipher.allocPacket(output.totalLen);
      if (output.push === undefined) {
        packet.set(output, 5);
      } else {
        for (let i = 0, p = 5; i < output.length; ++i) {
          const chunk = output[i];
          packet.set(chunk, p);
          p += chunk.length;
        }
      }
      return packet;
    }
    return payload;
  }
}

class PacketWriter {
  constructor(protocol) {
    this.allocStart = 5;
    this.allocStartKEX = 5;
    this._protocol = protocol;
  }

  cleanup() {}

  alloc(payloadSize, force) {
    if (this._protocol._kexinit === undefined || force)
      return this._protocol._cipher.allocPacket(payloadSize);
    return Buffer.allocUnsafe(payloadSize);
  }

  finalize(packet, force) {
    return packet;
  }
}

class ZlibPacketReader {
  constructor() {
    this._zlib = new Zlib(INFLATE);
  }

  cleanup() {
    if (this._zlib)
      _close(this._zlib);
  }

  read(data) {
    return this._zlib.writeSync(data, false);
  }
}

class PacketReader {
  cleanup() {}

  read(data) {
    return data;
  }
}

module.exports = {
  PacketReader,
  PacketWriter,
  ZlibPacketReader,
  ZlibPacketWriter,
};


/***/ }),

/***/ 2986:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// TODO:
//   * convert listenerCount() usage to emit() return value checking?
//   * emit error when connection severed early (e.g. before handshake)
//   * add '.connected' or similar property to connection objects to allow
//     immediate connection status checking


const { Server: netServer } = __nccwpck_require__(1631);
const EventEmitter = __nccwpck_require__(8614);
const { listenerCount } = EventEmitter;

const {
  CHANNEL_OPEN_FAILURE,
  DEFAULT_CIPHER,
  DEFAULT_COMPRESSION,
  DEFAULT_KEX,
  DEFAULT_MAC,
  DEFAULT_SERVER_HOST_KEY,
  DISCONNECT_REASON,
  DISCONNECT_REASON_BY_VALUE,
  SUPPORTED_CIPHER,
  SUPPORTED_COMPRESSION,
  SUPPORTED_KEX,
  SUPPORTED_MAC,
  SUPPORTED_SERVER_HOST_KEY,
} = __nccwpck_require__(6832);
const { init: cryptoInit } = __nccwpck_require__(5708);
const { KexInit } = __nccwpck_require__(4126);
const { parseKey } = __nccwpck_require__(2218);
const Protocol = __nccwpck_require__(9031);
const { SFTP } = __nccwpck_require__(2026);
const { writeUInt32BE } = __nccwpck_require__(9475);

const {
  Channel,
  MAX_WINDOW,
  PACKET_SIZE,
  windowAdjust,
  WINDOW_THRESHOLD,
} = __nccwpck_require__(3204);

const {
  ChannelManager,
  generateAlgorithmList,
  isWritable,
  onChannelOpenFailure,
  onCHANNEL_CLOSE,
} = __nccwpck_require__(834);

const MAX_PENDING_AUTHS = 10;

class AuthContext extends EventEmitter {
  constructor(protocol, username, service, method, cb) {
    super();

    this.username = this.user = username;
    this.service = service;
    this.method = method;
    this._initialResponse = false;
    this._finalResponse = false;
    this._multistep = false;
    this._cbfinal = (allowed, methodsLeft, isPartial) => {
      if (!this._finalResponse) {
        this._finalResponse = true;
        cb(this, allowed, methodsLeft, isPartial);
      }
    };
    this._protocol = protocol;
  }

  accept() {
    this._cleanup && this._cleanup();
    this._initialResponse = true;
    this._cbfinal(true);
  }
  reject(methodsLeft, isPartial) {
    this._cleanup && this._cleanup();
    this._initialResponse = true;
    this._cbfinal(false, methodsLeft, isPartial);
  }
}


class KeyboardAuthContext extends AuthContext {
  constructor(protocol, username, service, method, submethods, cb) {
    super(protocol, username, service, method, cb);

    this._multistep = true;

    this._cb = undefined;
    this._onInfoResponse = (responses) => {
      const callback = this._cb;
      if (callback) {
        this._cb = undefined;
        callback(responses);
      }
    };
    this.submethods = submethods;
    this.on('abort', () => {
      this._cb && this._cb(new Error('Authentication request aborted'));
    });
  }

  prompt(prompts, title, instructions, cb) {
    if (!Array.isArray(prompts))
      prompts = [ prompts ];

    if (typeof title === 'function') {
      cb = title;
      title = instructions = undefined;
    } else if (typeof instructions === 'function') {
      cb = instructions;
      instructions = undefined;
    } else if (typeof cb !== 'function') {
      cb = undefined;
    }

    for (let i = 0; i < prompts.length; ++i) {
      if (typeof prompts[i] === 'string') {
        prompts[i] = {
          prompt: prompts[i],
          echo: true
        };
      }
    }

    this._cb = cb;
    this._initialResponse = true;

    this._protocol.authInfoReq(title, instructions, prompts);
  }
}

class PKAuthContext extends AuthContext {
  constructor(protocol, username, service, method, pkInfo, cb) {
    super(protocol, username, service, method, cb);

    this.key = { algo: pkInfo.keyAlgo, data: pkInfo.key };
    this.signature = pkInfo.signature;
    this.blob = pkInfo.blob;
  }

  accept() {
    if (!this.signature) {
      this._initialResponse = true;
      this._protocol.authPKOK(this.key.algo, this.key.data);
    } else {
      AuthContext.prototype.accept.call(this);
    }
  }
}

class HostbasedAuthContext extends AuthContext {
  constructor(protocol, username, service, method, pkInfo, cb) {
    super(protocol, username, service, method, cb);

    this.key = { algo: pkInfo.keyAlgo, data: pkInfo.key };
    this.signature = pkInfo.signature;
    this.blob = pkInfo.blob;
    this.localHostname = pkInfo.localHostname;
    this.localUsername = pkInfo.localUsername;
  }
}

class PwdAuthContext extends AuthContext {
  constructor(protocol, username, service, method, password, cb) {
    super(protocol, username, service, method, cb);

    this.password = password;
    this._changeCb = undefined;
  }

  requestChange(prompt, cb) {
    if (this._changeCb)
      throw new Error('Change request already in progress');
    if (typeof prompt !== 'string')
      throw new Error('prompt argument must be a string');
    if (typeof cb !== 'function')
      throw new Error('Callback argument must be a function');
    this._changeCb = cb;
    this._protocol.authPasswdChg(prompt);
  }
}


class Session extends EventEmitter {
  constructor(client, info, localChan) {
    super();

    this.type = 'session';
    this.subtype = undefined;
    this._ending = false;
    this._channel = undefined;
    this._chanInfo = {
      type: 'session',
      incoming: {
        id: localChan,
        window: MAX_WINDOW,
        packetSize: PACKET_SIZE,
        state: 'open'
      },
      outgoing: {
        id: info.sender,
        window: info.window,
        packetSize: info.packetSize,
        state: 'open'
      }
    };
  }
}


class Server extends EventEmitter {
  constructor(cfg, listener) {
    super();

    if (typeof cfg !== 'object' || cfg === null)
      throw new Error('Missing configuration object');

    const hostKeys = Object.create(null);
    const hostKeyAlgoOrder = [];

    const hostKeys_ = cfg.hostKeys;
    if (!Array.isArray(hostKeys_))
      throw new Error('hostKeys must be an array');

    const cfgAlgos = (
      typeof cfg.algorithms === 'object' && cfg.algorithms !== null
      ? cfg.algorithms
      : {}
    );

    const hostKeyAlgos = generateAlgorithmList(
      cfgAlgos.serverHostKey,
      DEFAULT_SERVER_HOST_KEY,
      SUPPORTED_SERVER_HOST_KEY
    );
    for (let i = 0; i < hostKeys_.length; ++i) {
      let privateKey;
      if (Buffer.isBuffer(hostKeys_[i]) || typeof hostKeys_[i] === 'string')
        privateKey = parseKey(hostKeys_[i]);
      else
        privateKey = parseKey(hostKeys_[i].key, hostKeys_[i].passphrase);

      if (privateKey instanceof Error)
        throw new Error(`Cannot parse privateKey: ${privateKey.message}`);

      if (Array.isArray(privateKey)) {
        // OpenSSH's newer format only stores 1 key for now
        privateKey = privateKey[0];
      }

      if (privateKey.getPrivatePEM() === null)
        throw new Error('privateKey value contains an invalid private key');

      // Discard key if we already found a key of the same type
      if (hostKeyAlgoOrder.includes(privateKey.type))
        continue;

      if (privateKey.type === 'ssh-rsa') {
        // SSH supports multiple signature hashing algorithms for RSA, so we add
        // the algorithms in the desired order
        let sha1Pos = hostKeyAlgos.indexOf('ssh-rsa');
        const sha256Pos = hostKeyAlgos.indexOf('rsa-sha2-256');
        const sha512Pos = hostKeyAlgos.indexOf('rsa-sha2-512');
        if (sha1Pos === -1) {
          // Fall back to giving SHA1 the lowest priority
          sha1Pos = Infinity;
        }
        [sha1Pos, sha256Pos, sha512Pos].sort(compareNumbers).forEach((pos) => {
          if (pos === -1)
            return;

          let type;
          switch (pos) {
            case sha1Pos: type = 'ssh-rsa'; break;
            case sha256Pos: type = 'rsa-sha2-256'; break;
            case sha512Pos: type = 'rsa-sha2-512'; break;
            default: return;
          }

          // Store same RSA key under each hash algorithm name for convenience
          hostKeys[type] = privateKey;

          hostKeyAlgoOrder.push(type);
        });
      } else {
        hostKeys[privateKey.type] = privateKey;
        hostKeyAlgoOrder.push(privateKey.type);
      }
    }

    const algorithms = {
      kex: generateAlgorithmList(cfgAlgos.kex, DEFAULT_KEX, SUPPORTED_KEX),
      serverHostKey: hostKeyAlgoOrder,
      cs: {
        cipher: generateAlgorithmList(
                  cfgAlgos.cipher,
                  DEFAULT_CIPHER,
                  SUPPORTED_CIPHER
                ),
        mac: generateAlgorithmList(cfgAlgos.hmac, DEFAULT_MAC, SUPPORTED_MAC),
        compress: generateAlgorithmList(
                    cfgAlgos.compress,
                    DEFAULT_COMPRESSION,
                    SUPPORTED_COMPRESSION
                  ),
        lang: [],
      },
      sc: undefined,
    };
    algorithms.sc = algorithms.cs;

    if (typeof listener === 'function')
      this.on('connection', listener);

    const origDebug = (typeof cfg.debug === 'function' ? cfg.debug : undefined);
    const ident = (cfg.ident ? Buffer.from(cfg.ident) : undefined);
    const offer = new KexInit(algorithms);

    this._srv = new netServer((socket) => {
      if (this._connections >= this.maxConnections) {
        socket.destroy();
        return;
      }
      ++this._connections;
      socket.once('close', () => {
        --this._connections;
      });

      let debug;
      if (origDebug) {
        // Prepend debug output with a unique identifier in case there are
        // multiple clients connected at the same time
        const debugPrefix = `[${process.hrtime().join('.')}] `;
        debug = (msg) => {
          origDebug(`${debugPrefix}${msg}`);
        };
      }

      // eslint-disable-next-line no-use-before-define
      new Client(socket, hostKeys, ident, offer, debug, this, cfg);
    }).on('error', (err) => {
      this.emit('error', err);
    }).on('listening', () => {
      this.emit('listening');
    }).on('close', () => {
      this.emit('close');
    });
    this._connections = 0;
    this.maxConnections = Infinity;
  }

  injectSocket(socket) {
    this._srv.emit('connection', socket);
  }

  listen(...args) {
    this._srv.listen(...args);
    return this;
  }

  address() {
    return this._srv.address();
  }

  getConnections(cb) {
    this._srv.getConnections(cb);
    return this;
  }

  close(cb) {
    this._srv.close(cb);
    return this;
  }

  ref() {
    this._srv.ref();
    return this;
  }

  unref() {
    this._srv.unref();
    return this;
  }
}
Server.KEEPALIVE_CLIENT_INTERVAL = 15000;
Server.KEEPALIVE_CLIENT_COUNT_MAX = 3;


class Client extends EventEmitter {
  constructor(socket, hostKeys, ident, offer, debug, server, srvCfg) {
    super();

    let exchanges = 0;
    let acceptedAuthSvc = false;
    let pendingAuths = [];
    let authCtx;
    let kaTimer;
    let onPacket;
    const unsentGlobalRequestsReplies = [];
    this._sock = socket;
    this._chanMgr = new ChannelManager(this);
    this._debug = debug;
    this.noMoreSessions = false;
    this.authenticated = false;

    // Silence pre-header errors
    function onClientPreHeaderError(err) {}
    this.on('error', onClientPreHeaderError);

    const DEBUG_HANDLER = (!debug ? undefined : (p, display, msg) => {
      debug(`Debug output from client: ${JSON.stringify(msg)}`);
    });

    const kaIntvl = (
      typeof srvCfg.keepaliveInterval === 'number'
        && isFinite(srvCfg.keepaliveInterval)
        && srvCfg.keepaliveInterval > 0
      ? srvCfg.keepaliveInterval
      : (
        typeof Server.KEEPALIVE_CLIENT_INTERVAL === 'number'
          && isFinite(Server.KEEPALIVE_CLIENT_INTERVAL)
          && Server.KEEPALIVE_CLIENT_INTERVAL > 0
        ? Server.KEEPALIVE_CLIENT_INTERVAL
        : -1
      )
    );
    const kaCountMax = (
      typeof srvCfg.keepaliveCountMax === 'number'
        && isFinite(srvCfg.keepaliveCountMax)
        && srvCfg.keepaliveCountMax >= 0
      ? srvCfg.keepaliveCountMax
      : (
        typeof Server.KEEPALIVE_CLIENT_COUNT_MAX === 'number'
          && isFinite(Server.KEEPALIVE_CLIENT_COUNT_MAX)
          && Server.KEEPALIVE_CLIENT_COUNT_MAX >= 0
        ? Server.KEEPALIVE_CLIENT_COUNT_MAX
        : -1
      )
    );
    let kaCurCount = 0;
    if (kaIntvl !== -1 && kaCountMax !== -1) {
      this.once('ready', () => {
        const onClose = () => {
          clearInterval(kaTimer);
        };
        this.on('close', onClose).on('end', onClose);
        kaTimer = setInterval(() => {
          if (++kaCurCount > kaCountMax) {
            clearInterval(kaTimer);
            const err = new Error('Keepalive timeout');
            err.level = 'client-timeout';
            this.emit('error', err);
            this.end();
          } else {
            // XXX: if the server ever starts sending real global requests to
            //      the client, we will need to add a dummy callback here to
            //      keep the correct reply order
            proto.ping();
          }
        }, kaIntvl);
      });
      // TODO: re-verify keepalive behavior with OpenSSH
      onPacket = () => {
        kaTimer && kaTimer.refresh();
        kaCurCount = 0;
      };
    }

    const proto = this._protocol = new Protocol({
      server: true,
      hostKeys,
      ident,
      offer,
      onPacket,
      greeting: srvCfg.greeting,
      banner: srvCfg.banner,
      onWrite: (data) => {
        if (isWritable(socket))
          socket.write(data);
      },
      onError: (err) => {
        if (!proto._destruct)
          socket.removeAllListeners('data');
        this.emit('error', err);
        try {
          socket.end();
        } catch {}
      },
      onHeader: (header) => {
        this.removeListener('error', onClientPreHeaderError);

        const info = {
          ip: socket.remoteAddress,
          family: socket.remoteFamily,
          port: socket.remotePort,
          header,
        };
        if (!server.emit('connection', this, info)) {
          // auto reject
          proto.disconnect(DISCONNECT_REASON.BY_APPLICATION);
          socket.end();
          return;
        }

        if (header.greeting)
          this.emit('greeting', header.greeting);
      },
      onHandshakeComplete: (negotiated) => {
        if (++exchanges > 1)
          this.emit('rekey');
        this.emit('handshake', negotiated);
      },
      debug,
      messageHandlers: {
        DEBUG: DEBUG_HANDLER,
        DISCONNECT: (p, reason, desc) => {
          if (reason !== DISCONNECT_REASON.BY_APPLICATION) {
            if (!desc) {
              desc = DISCONNECT_REASON_BY_VALUE[reason];
              if (desc === undefined)
                desc = `Unexpected disconnection reason: ${reason}`;
            }
            const err = new Error(desc);
            err.code = reason;
            this.emit('error', err);
          }
          socket.end();
        },
        CHANNEL_OPEN: (p, info) => {
          // Handle incoming requests from client

          // Do early reject in some cases to prevent wasteful channel
          // allocation
          if ((info.type === 'session' && this.noMoreSessions)
              || !this.authenticated) {
            const reasonCode = CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
            return proto.channelOpenFail(info.sender, reasonCode);
          }

          let localChan = -1;
          let reason;
          let replied = false;

          let accept;
          const reject = () => {
            if (replied)
              return;
            replied = true;

            if (reason === undefined) {
              if (localChan === -1)
                reason = CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
              else
                reason = CHANNEL_OPEN_FAILURE.CONNECT_FAILED;
            }

            proto.channelOpenFail(info.sender, reason, '');
          };
          const reserveChannel = () => {
            localChan = this._chanMgr.add();

            if (localChan === -1) {
              reason = CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
              if (debug) {
                debug('Automatic rejection of incoming channel open: '
                        + 'no channels available');
              }
            }

            return (localChan !== -1);
          };

          const data = info.data;
          switch (info.type) {
            case 'session':
              if (listenerCount(this, 'session') && reserveChannel()) {
                accept = () => {
                  if (replied)
                    return;
                  replied = true;

                  const instance = new Session(this, info, localChan);
                  this._chanMgr.update(localChan, instance);

                  proto.channelOpenConfirm(info.sender,
                                           localChan,
                                           MAX_WINDOW,
                                           PACKET_SIZE);

                  return instance;
                };

                this.emit('session', accept, reject);
                return;
              }
              break;
            case 'direct-tcpip':
              if (listenerCount(this, 'tcpip') && reserveChannel()) {
                accept = () => {
                  if (replied)
                    return;
                  replied = true;

                  const chanInfo = {
                    type: undefined,
                    incoming: {
                      id: localChan,
                      window: MAX_WINDOW,
                      packetSize: PACKET_SIZE,
                      state: 'open'
                    },
                    outgoing: {
                      id: info.sender,
                      window: info.window,
                      packetSize: info.packetSize,
                      state: 'open'
                    }
                  };

                  const stream = new Channel(this, chanInfo, { server: true });
                  this._chanMgr.update(localChan, stream);

                  proto.channelOpenConfirm(info.sender,
                                           localChan,
                                           MAX_WINDOW,
                                           PACKET_SIZE);

                  return stream;
                };

                this.emit('tcpip', accept, reject, data);
                return;
              }
              break;
            case 'direct-streamlocal@openssh.com':
              if (listenerCount(this, 'openssh.streamlocal')
                  && reserveChannel()) {
                accept = () => {
                  if (replied)
                    return;
                  replied = true;

                  const chanInfo = {
                    type: undefined,
                    incoming: {
                      id: localChan,
                      window: MAX_WINDOW,
                      packetSize: PACKET_SIZE,
                      state: 'open'
                    },
                    outgoing: {
                      id: info.sender,
                      window: info.window,
                      packetSize: info.packetSize,
                      state: 'open'
                    }
                  };

                  const stream = new Channel(this, chanInfo, { server: true });
                  this._chanMgr.update(localChan, stream);

                  proto.channelOpenConfirm(info.sender,
                                           localChan,
                                           MAX_WINDOW,
                                           PACKET_SIZE);

                  return stream;
                };

                this.emit('openssh.streamlocal', accept, reject, data);
                return;
              }
              break;
            default:
              // Automatically reject any unsupported channel open requests
              reason = CHANNEL_OPEN_FAILURE.UNKNOWN_CHANNEL_TYPE;
              if (debug) {
                debug('Automatic rejection of unsupported incoming channel open'
                        + ` type: ${info.type}`);
              }
          }

          if (reason === undefined) {
            reason = CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
            if (debug) {
              debug('Automatic rejection of unexpected incoming channel open'
                      + ` for: ${info.type}`);
            }
          }

          reject();
        },
        CHANNEL_OPEN_CONFIRMATION: (p, info) => {
          const channel = this._chanMgr.get(info.recipient);
          if (typeof channel !== 'function')
            return;

          const chanInfo = {
            type: channel.type,
            incoming: {
              id: info.recipient,
              window: MAX_WINDOW,
              packetSize: PACKET_SIZE,
              state: 'open'
            },
            outgoing: {
              id: info.sender,
              window: info.window,
              packetSize: info.packetSize,
              state: 'open'
            }
          };

          const instance = new Channel(this, chanInfo, { server: true });
          this._chanMgr.update(info.recipient, instance);
          channel(undefined, instance);
        },
        CHANNEL_OPEN_FAILURE: (p, recipient, reason, description) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'function')
            return;

          const info = { reason, description };
          onChannelOpenFailure(this, recipient, info, channel);
        },
        CHANNEL_DATA: (p, recipient, data) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel = channel._channel;
            if (!channel)
              return;
          }

          // The remote party should not be sending us data if there is no
          // window space available ...
          // TODO: raise error on data with not enough window?
          if (channel.incoming.window === 0)
            return;

          channel.incoming.window -= data.length;

          if (channel.push(data) === false) {
            channel._waitChanDrain = true;
            return;
          }

          if (channel.incoming.window <= WINDOW_THRESHOLD)
            windowAdjust(channel);
        },
        CHANNEL_EXTENDED_DATA: (p, recipient, data, type) => {
          // NOOP -- should not be sent by client
        },
        CHANNEL_WINDOW_ADJUST: (p, recipient, amount) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel = channel._channel;
            if (!channel)
              return;
          }

          // The other side is allowing us to send `amount` more bytes of data
          channel.outgoing.window += amount;

          if (channel._waitWindow) {
            channel._waitWindow = false;

            if (channel._chunk) {
              channel._write(channel._chunk, null, channel._chunkcb);
            } else if (channel._chunkcb) {
              channel._chunkcb();
            } else if (channel._chunkErr) {
              channel.stderr._write(channel._chunkErr,
                                    null,
                                    channel._chunkcbErr);
            } else if (channel._chunkcbErr) {
              channel._chunkcbErr();
            }
          }
        },
        CHANNEL_SUCCESS: (p, recipient) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel = channel._channel;
            if (!channel)
              return;
          }

          if (channel._callbacks.length)
            channel._callbacks.shift()(false);
        },
        CHANNEL_FAILURE: (p, recipient) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel = channel._channel;
            if (!channel)
              return;
          }

          if (channel._callbacks.length)
            channel._callbacks.shift()(true);
        },
        CHANNEL_REQUEST: (p, recipient, type, wantReply, data) => {
          const session = this._chanMgr.get(recipient);
          if (typeof session !== 'object' || session === null)
            return;

          let replied = false;
          let accept;
          let reject;

          if (session.constructor !== Session) {
            // normal Channel instance
            if (wantReply)
              proto.channelFailure(session.outgoing.id);
            return;
          }

          if (wantReply) {
            // "real session" requests will have custom accept behaviors
            if (type !== 'shell'
                && type !== 'exec'
                && type !== 'subsystem') {
              accept = () => {
                if (replied || session._ending || session._channel)
                  return;
                replied = true;

                proto.channelSuccess(session._chanInfo.outgoing.id);
              };
            }

            reject = () => {
              if (replied || session._ending || session._channel)
                return;
              replied = true;

              proto.channelFailure(session._chanInfo.outgoing.id);
            };
          }

          if (session._ending) {
            reject && reject();
            return;
          }

          switch (type) {
            // "pre-real session start" requests
            case 'env':
              if (listenerCount(session, 'env')) {
                session.emit('env', accept, reject, {
                  key: data.name,
                  val: data.value
                });
                return;
              }
              break;
            case 'pty-req':
              if (listenerCount(session, 'pty')) {
                session.emit('pty', accept, reject, data);
                return;
              }
              break;
            case 'window-change':
              if (listenerCount(session, 'window-change'))
                session.emit('window-change', accept, reject, data);
              else
                reject && reject();
              break;
            case 'x11-req':
              if (listenerCount(session, 'x11')) {
                session.emit('x11', accept, reject, data);
                return;
              }
              break;
            // "post-real session start" requests
            case 'signal':
              if (listenerCount(session, 'signal')) {
                session.emit('signal', accept, reject, {
                  name: data
                });
                return;
              }
              break;
            // XXX: is `auth-agent-req@openssh.com` really "post-real session
            // start"?
            case 'auth-agent-req@openssh.com':
              if (listenerCount(session, 'auth-agent')) {
                session.emit('auth-agent', accept, reject);
                return;
              }
              break;
            // "real session start" requests
            case 'shell':
              if (listenerCount(session, 'shell')) {
                accept = () => {
                  if (replied || session._ending || session._channel)
                    return;
                  replied = true;

                  if (wantReply)
                    proto.channelSuccess(session._chanInfo.outgoing.id);

                  const channel = new Channel(
                    this, session._chanInfo, { server: true }
                  );

                  channel.subtype = session.subtype = type;
                  session._channel = channel;

                  return channel;
                };

                session.emit('shell', accept, reject);
                return;
              }
              break;
            case 'exec':
              if (listenerCount(session, 'exec')) {
                accept = () => {
                  if (replied || session._ending || session._channel)
                    return;
                  replied = true;

                  if (wantReply)
                    proto.channelSuccess(session._chanInfo.outgoing.id);

                  const channel = new Channel(
                    this, session._chanInfo, { server: true }
                  );

                  channel.subtype = session.subtype = type;
                  session._channel = channel;

                  return channel;
                };

                session.emit('exec', accept, reject, {
                  command: data
                });
                return;
              }
              break;
            case 'subsystem': {
              let useSFTP = (data === 'sftp');
              accept = () => {
                if (replied || session._ending || session._channel)
                  return;
                replied = true;

                if (wantReply)
                  proto.channelSuccess(session._chanInfo.outgoing.id);

                let instance;
                if (useSFTP) {
                  instance = new SFTP(this, session._chanInfo, {
                    server: true,
                    debug,
                  });
                } else {
                  instance = new Channel(
                    this, session._chanInfo, { server: true }
                  );
                  instance.subtype =
                    session.subtype = `${type}:${data}`;
                }
                session._channel = instance;

                return instance;
              };

              if (data === 'sftp') {
                if (listenerCount(session, 'sftp')) {
                  session.emit('sftp', accept, reject);
                  return;
                }
                useSFTP = false;
              }
              if (listenerCount(session, 'subsystem')) {
                session.emit('subsystem', accept, reject, {
                  name: data
                });
                return;
              }
              break;
            }
          }
          debug && debug(
            `Automatic rejection of incoming channel request: ${type}`
          );
          reject && reject();
        },
        CHANNEL_EOF: (p, recipient) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            if (!channel._ending) {
              channel._ending = true;
              channel.emit('eof');
              channel.emit('end');
            }
            channel = channel._channel;
            if (!channel)
              return;
          }

          if (channel.incoming.state !== 'open')
            return;
          channel.incoming.state = 'eof';

          if (channel.readable)
            channel.push(null);
        },
        CHANNEL_CLOSE: (p, recipient) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel._ending = true;
            channel.emit('close');
            channel = channel._channel;
            if (!channel)
              return;
          }

          onCHANNEL_CLOSE(this, recipient, channel);
        },
        // Begin service/auth-related ==========================================
        SERVICE_REQUEST: (p, service) => {
          if (exchanges === 0
              || acceptedAuthSvc
              || this.authenticated
              || service !== 'ssh-userauth') {
            proto.disconnect(DISCONNECT_REASON.SERVICE_NOT_AVAILABLE);
            socket.end();
            return;
          }

          acceptedAuthSvc = true;
          proto.serviceAccept(service);
        },
        USERAUTH_REQUEST: (p, username, service, method, methodData) => {
          if (exchanges === 0
              || this.authenticated
              || (authCtx
                  && (authCtx.username !== username
                      || authCtx.service !== service))
                // TODO: support hostbased auth
              || (method !== 'password'
                  && method !== 'publickey'
                  && method !== 'hostbased'
                  && method !== 'keyboard-interactive'
                  && method !== 'none')
              || pendingAuths.length === MAX_PENDING_AUTHS) {
            proto.disconnect(DISCONNECT_REASON.PROTOCOL_ERROR);
            socket.end();
            return;
          } else if (service !== 'ssh-connection') {
            proto.disconnect(DISCONNECT_REASON.SERVICE_NOT_AVAILABLE);
            socket.end();
            return;
          }

          let ctx;
          switch (method) {
            case 'keyboard-interactive':
              ctx = new KeyboardAuthContext(proto, username, service, method,
                                            methodData, onAuthDecide);
              break;
            case 'publickey':
              ctx = new PKAuthContext(proto, username, service, method,
                                      methodData, onAuthDecide);
              break;
            case 'hostbased':
              ctx = new HostbasedAuthContext(proto, username, service, method,
                                             methodData, onAuthDecide);
              break;
            case 'password':
              if (authCtx
                  && authCtx instanceof PwdAuthContext
                  && authCtx._changeCb) {
                const cb = authCtx._changeCb;
                authCtx._changeCb = undefined;
                cb(methodData.newPassword);
                return;
              }
              ctx = new PwdAuthContext(proto, username, service, method,
                                       methodData, onAuthDecide);
              break;
            case 'none':
              ctx = new AuthContext(proto, username, service, method,
                                    onAuthDecide);
              break;
          }

          if (authCtx) {
            if (!authCtx._initialResponse) {
              return pendingAuths.push(ctx);
            } else if (authCtx._multistep && !authCtx._finalResponse) {
              // RFC 4252 says to silently abort the current auth request if a
              // new auth request comes in before the final response from an
              // auth method that requires additional request/response exchanges
              // -- this means keyboard-interactive for now ...
              authCtx._cleanup && authCtx._cleanup();
              authCtx.emit('abort');
            }
          }

          authCtx = ctx;

          if (listenerCount(this, 'authentication'))
            this.emit('authentication', authCtx);
          else
            authCtx.reject();
        },
        USERAUTH_INFO_RESPONSE: (p, responses) => {
          if (authCtx && authCtx instanceof KeyboardAuthContext)
            authCtx._onInfoResponse(responses);
        },
        // End service/auth-related ============================================
        GLOBAL_REQUEST: (p, name, wantReply, data) => {
          const reply = {
            type: null,
            buf: null
          };

          function setReply(type, buf) {
            reply.type = type;
            reply.buf = buf;
            sendReplies();
          }

          if (wantReply)
            unsentGlobalRequestsReplies.push(reply);

          if ((name === 'tcpip-forward'
               || name === 'cancel-tcpip-forward'
               || name === 'no-more-sessions@openssh.com'
               || name === 'streamlocal-forward@openssh.com'
               || name === 'cancel-streamlocal-forward@openssh.com')
              && listenerCount(this, 'request')
              && this.authenticated) {
            let accept;
            let reject;

            if (wantReply) {
              let replied = false;
              accept = (chosenPort) => {
                if (replied)
                  return;
                replied = true;
                let bufPort;
                if (name === 'tcpip-forward'
                    && data.bindPort === 0
                    && typeof chosenPort === 'number') {
                  bufPort = Buffer.allocUnsafe(4);
                  writeUInt32BE(bufPort, chosenPort, 0);
                }
                setReply('SUCCESS', bufPort);
              };
              reject = () => {
                if (replied)
                  return;
                replied = true;
                setReply('FAILURE');
              };
            }

            if (name === 'no-more-sessions@openssh.com') {
              this.noMoreSessions = true;
              accept && accept();
              return;
            }

            this.emit('request', accept, reject, name, data);
          } else if (wantReply) {
            setReply('FAILURE');
          }
        },
      },
    });

    socket.pause();
    cryptoInit.then(() => {
      socket.on('data', (data) => {
        try {
          proto.parse(data, 0, data.length);
        } catch (ex) {
          this.emit('error', ex);
          try {
            if (isWritable(socket))
              socket.end();
          } catch {}
        }
      });
      socket.resume();
    }).catch((err) => {
      this.emit('error', err);
      try {
        if (isWritable(socket))
          socket.end();
      } catch {}
    });
    socket.on('error', (err) => {
      err.level = 'socket';
      this.emit('error', err);
    }).once('end', () => {
      debug && debug('Socket ended');
      proto.cleanup();
      this.emit('end');
    }).once('close', () => {
      debug && debug('Socket closed');
      proto.cleanup();
      this.emit('close');

      const err = new Error('No response from server');

      // Simulate error for pending channels and close any open channels
      this._chanMgr.cleanup(err);
    });

    const onAuthDecide = (ctx, allowed, methodsLeft, isPartial) => {
      if (authCtx === ctx && !this.authenticated) {
        if (allowed) {
          authCtx = undefined;
          this.authenticated = true;
          proto.authSuccess();
          pendingAuths = [];
          this.emit('ready');
        } else {
          proto.authFailure(methodsLeft, isPartial);
          if (pendingAuths.length) {
            authCtx = pendingAuths.pop();
            if (listenerCount(this, 'authentication'))
              this.emit('authentication', authCtx);
            else
              authCtx.reject();
          }
        }
      }
    };

    function sendReplies() {
      while (unsentGlobalRequestsReplies.length > 0
             && unsentGlobalRequestsReplies[0].type) {
        const reply = unsentGlobalRequestsReplies.shift();
        if (reply.type === 'SUCCESS')
          proto.requestSuccess(reply.buf);
        if (reply.type === 'FAILURE')
          proto.requestFailure();
      }
    }
  }

  end() {
    if (this._sock && isWritable(this._sock)) {
      this._protocol.disconnect(DISCONNECT_REASON.BY_APPLICATION);
      this._sock.end();
    }
    return this;
  }

  x11(originAddr, originPort, cb) {
    const opts = { originAddr, originPort };
    openChannel(this, 'x11', opts, cb);
    return this;
  }

  forwardOut(boundAddr, boundPort, remoteAddr, remotePort, cb) {
    const opts = { boundAddr, boundPort, remoteAddr, remotePort };
    openChannel(this, 'forwarded-tcpip', opts, cb);
    return this;
  }

  openssh_forwardOutStreamLocal(socketPath, cb) {
    const opts = { socketPath };
    openChannel(this, 'forwarded-streamlocal@openssh.com', opts, cb);
    return this;
  }

  rekey(cb) {
    let error;

    try {
      this._protocol.rekey();
    } catch (ex) {
      error = ex;
    }

    // TODO: re-throw error if no callback?

    if (typeof cb === 'function') {
      if (error)
        process.nextTick(cb, error);
      else
        this.once('rekey', cb);
    }
  }
}


function openChannel(self, type, opts, cb) {
  // Ask the client to open a channel for some purpose (e.g. a forwarded TCP
  // connection)
  const initWindow = MAX_WINDOW;
  const maxPacket = PACKET_SIZE;

  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  const wrapper = (err, stream) => {
    cb(err, stream);
  };
  wrapper.type = type;

  const localChan = self._chanMgr.add(wrapper);

  if (localChan === -1) {
    cb(new Error('No free channels available'));
    return;
  }

  switch (type) {
    case 'forwarded-tcpip':
      self._protocol.forwardedTcpip(localChan, initWindow, maxPacket, opts);
      break;
    case 'x11':
      self._protocol.x11(localChan, initWindow, maxPacket, opts);
      break;
    case 'forwarded-streamlocal@openssh.com':
      self._protocol.openssh_forwardedStreamLocal(
        localChan, initWindow, maxPacket, opts
      );
      break;
    default:
      throw new Error(`Unsupported channel type: ${type}`);
  }
}

function compareNumbers(a, b) {
  return a - b;
}

module.exports = Server;
module.exports.IncomingClient = Client;


/***/ }),

/***/ 834:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { SFTP } = __nccwpck_require__(2026);

const MAX_CHANNEL = 2 ** 32 - 1;

function onChannelOpenFailure(self, recipient, info, cb) {
  self._chanMgr.remove(recipient);
  if (typeof cb !== 'function')
    return;

  let err;
  if (info instanceof Error) {
    err = info;
  } else if (typeof info === 'object' && info !== null) {
    err = new Error(`(SSH) Channel open failure: ${info.description}`);
    err.reason = info.reason;
  } else {
    err = new Error(
      '(SSH) Channel open failure: server closed channel unexpectedly'
    );
    err.reason = '';
  }

  cb(err);
}

function onCHANNEL_CLOSE(self, recipient, channel, err, dead) {
  if (typeof channel === 'function') {
    // We got CHANNEL_CLOSE instead of CHANNEL_OPEN_FAILURE when
    // requesting to open a channel
    onChannelOpenFailure(self, recipient, err, channel);
    return;
  }
  if (typeof channel !== 'object'
      || channel === null
      || channel.incoming.state === 'closed') {
    return;
  }

  channel.incoming.state = 'closed';

  if (channel.readable)
    channel.push(null);
  if (channel.server) {
    if (channel.stderr.writable)
      channel.stderr.end();
  } else if (channel.stderr.readable) {
    channel.stderr.push(null);
  }

  if (channel.constructor !== SFTP
      && (channel.outgoing.state === 'open'
          || channel.outgoing.state === 'eof')
      && !dead) {
    channel.close();
  }
  if (channel.outgoing.state === 'closing')
    channel.outgoing.state = 'closed';

  self._chanMgr.remove(recipient);

  const readState = channel._readableState;
  const writeState = channel._writableState;
  if (writeState && !writeState.ending && !writeState.finished && !dead)
    channel.end();

  // Take care of any outstanding channel requests
  const chanCallbacks = channel._callbacks;
  channel._callbacks = [];
  for (let i = 0; i < chanCallbacks.length; ++i)
    chanCallbacks[i](true);

  if (channel.server) {
    if (!channel.readable
        || channel.destroyed
        || (readState && readState.endEmitted)) {
      channel.emit('close');
    } else {
      channel.once('end', () => channel.emit('close'));
    }
  } else {
    let doClose;
    switch (channel.type) {
      case 'direct-streamlocal@openssh.com':
      case 'direct-tcpip':
        doClose = () => channel.emit('close');
        break;
      default: {
        // Align more with node child processes, where the close event gets
        // the same arguments as the exit event
        const exit = channel._exit;
        doClose = () => {
          if (exit.code === null)
            channel.emit('close', exit.code, exit.signal, exit.dump, exit.desc);
          else
            channel.emit('close', exit.code);
        };
      }
    }
    if (!channel.readable
        || channel.destroyed
        || (readState && readState.endEmitted)) {
      doClose();
    } else {
      channel.once('end', doClose);
    }

    const errReadState = channel.stderr._readableState;
    if (!channel.stderr.readable
        || channel.stderr.destroyed
        || (errReadState && errReadState.endEmitted)) {
      channel.stderr.emit('close');
    } else {
      channel.stderr.once('end', () => channel.stderr.emit('close'));
    }
  }
}

class ChannelManager {
  constructor(client) {
    this._client = client;
    this._channels = {};
    this._cur = -1;
    this._count = 0;
  }
  add(val) {
    // Attempt to reserve an id

    let id;
    // Optimized paths
    if (this._cur < MAX_CHANNEL) {
      id = ++this._cur;
    } else if (this._count === 0) {
      // Revert and reset back to fast path once we no longer have any channels
      // open
      this._cur = 0;
      id = 0;
    } else {
      // Slower lookup path

      // This path is triggered we have opened at least MAX_CHANNEL channels
      // while having at least one channel open at any given time, so we have
      // to search for a free id.
      const channels = this._channels;
      for (let i = 0; i < MAX_CHANNEL; ++i) {
        if (channels[i] === undefined) {
          id = i;
          break;
        }
      }
    }

    if (id === undefined)
      return -1;

    this._channels[id] = (val || true);
    ++this._count;

    return id;
  }
  update(id, val) {
    if (typeof id !== 'number' || id < 0 || id >= MAX_CHANNEL || !isFinite(id))
      throw new Error(`Invalid channel id: ${id}`);

    if (val && this._channels[id])
      this._channels[id] = val;
  }
  get(id) {
    if (typeof id !== 'number' || id < 0 || id >= MAX_CHANNEL || !isFinite(id))
      throw new Error(`Invalid channel id: ${id}`);

    return this._channels[id];
  }
  remove(id) {
    if (typeof id !== 'number' || id < 0 || id >= MAX_CHANNEL || !isFinite(id))
      throw new Error(`Invalid channel id: ${id}`);

    if (this._channels[id]) {
      delete this._channels[id];
      if (this._count)
        --this._count;
    }
  }
  cleanup(err) {
    const channels = this._channels;
    this._channels = {};
    this._cur = -1;
    this._count = 0;

    const chanIDs = Object.keys(channels);
    const client = this._client;
    for (let i = 0; i < chanIDs.length; ++i) {
      const id = +chanIDs[i];
      const channel = channels[id];
      onCHANNEL_CLOSE(client, id, channel._channel || channel, err, true);
    }
  }
}

const isRegExp = (() => {
  const toString = Object.prototype.toString;
  return (val) => toString.call(val) === '[object RegExp]';
})();

function generateAlgorithmList(algoList, defaultList, supportedList) {
  if (Array.isArray(algoList) && algoList.length > 0) {
    // Exact list
    for (let i = 0; i < algoList.length; ++i) {
      if (supportedList.indexOf(algoList[i]) === -1)
        throw new Error(`Unsupported algorithm: ${algoList[i]}`);
    }
    return algoList;
  }

  if (typeof algoList === 'object' && algoList !== null) {
    // Operations based on the default list
    const keys = Object.keys(algoList);
    let list = defaultList;
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      let val = algoList[key];
      switch (key) {
        case 'append':
          if (!Array.isArray(val))
            val = [val];
          if (Array.isArray(val)) {
            for (let j = 0; j < val.length; ++j) {
              const append = val[j];
              if (typeof append === 'string') {
                if (!append || list.indexOf(append) !== -1)
                  continue;
                if (supportedList.indexOf(append) === -1)
                  throw new Error(`Unsupported algorithm: ${append}`);
                if (list === defaultList)
                  list = list.slice();
                list.push(append);
              } else if (isRegExp(append)) {
                for (let k = 0; k < supportedList.length; ++k) {
                  const algo = supportedList[k];
                  if (append.test(algo)) {
                    if (list.indexOf(algo) !== -1)
                      continue;
                    if (list === defaultList)
                      list = list.slice();
                    list.push(algo);
                  }
                }
              }
            }
          }
          break;
        case 'prepend':
          if (!Array.isArray(val))
            val = [val];
          if (Array.isArray(val)) {
            for (let j = val.length; j >= 0; --j) {
              const prepend = val[j];
              if (typeof prepend === 'string') {
                if (!prepend || list.indexOf(prepend) !== -1)
                  continue;
                if (supportedList.indexOf(prepend) === -1)
                  throw new Error(`Unsupported algorithm: ${prepend}`);
                if (list === defaultList)
                  list = list.slice();
                list.unshift(prepend);
              } else if (isRegExp(prepend)) {
                for (let k = supportedList.length; k >= 0; --k) {
                  const algo = supportedList[k];
                  if (prepend.test(algo)) {
                    if (list.indexOf(algo) !== -1)
                      continue;
                    if (list === defaultList)
                      list = list.slice();
                    list.unshift(algo);
                  }
                }
              }
            }
          }
          break;
        case 'remove':
          if (!Array.isArray(val))
            val = [val];
          if (Array.isArray(val)) {
            for (let j = 0; j < val.length; ++j) {
              const search = val[j];
              if (typeof search === 'string') {
                if (!search)
                  continue;
                const idx = list.indexOf(search);
                if (idx === -1)
                  continue;
                if (list === defaultList)
                  list = list.slice();
                list.splice(idx, 1);
              } else if (isRegExp(search)) {
                for (let k = 0; k < list.length; ++k) {
                  if (search.test(list[k])) {
                    if (list === defaultList)
                      list = list.slice();
                    list.splice(k, 1);
                    --k;
                  }
                }
              }
            }
          }
          break;
      }
    }

    return list;
  }

  return defaultList;
}

module.exports = {
  ChannelManager,
  generateAlgorithmList,
  onChannelOpenFailure,
  onCHANNEL_CLOSE,
  isWritable: (stream) => {
    // XXX: hack to workaround regression in node
    // See: https://github.com/nodejs/node/issues/36029
    return (stream
            && stream.writable
            && stream._readableState
            && stream._readableState.ended === false);
  },
};


/***/ }),

/***/ 6126:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

var Buffer = __nccwpck_require__(5118).Buffer;

var algInfo = {
	'dsa': {
		parts: ['p', 'q', 'g', 'y'],
		sizePart: 'p'
	},
	'rsa': {
		parts: ['e', 'n'],
		sizePart: 'n'
	},
	'ecdsa': {
		parts: ['curve', 'Q'],
		sizePart: 'Q'
	},
	'ed25519': {
		parts: ['A'],
		sizePart: 'A'
	}
};
algInfo['curve25519'] = algInfo['ed25519'];

var algPrivInfo = {
	'dsa': {
		parts: ['p', 'q', 'g', 'y', 'x']
	},
	'rsa': {
		parts: ['n', 'e', 'd', 'iqmp', 'p', 'q']
	},
	'ecdsa': {
		parts: ['curve', 'Q', 'd']
	},
	'ed25519': {
		parts: ['A', 'k']
	}
};
algPrivInfo['curve25519'] = algPrivInfo['ed25519'];

var hashAlgs = {
	'md5': true,
	'sha1': true,
	'sha256': true,
	'sha384': true,
	'sha512': true
};

/*
 * Taken from
 * http://csrc.nist.gov/groups/ST/toolkit/documents/dss/NISTReCur.pdf
 */
var curves = {
	'nistp256': {
		size: 256,
		pkcs8oid: '1.2.840.10045.3.1.7',
		p: Buffer.from(('00' +
		    'ffffffff 00000001 00000000 00000000' +
		    '00000000 ffffffff ffffffff ffffffff').
		    replace(/ /g, ''), 'hex'),
		a: Buffer.from(('00' +
		    'FFFFFFFF 00000001 00000000 00000000' +
		    '00000000 FFFFFFFF FFFFFFFF FFFFFFFC').
		    replace(/ /g, ''), 'hex'),
		b: Buffer.from((
		    '5ac635d8 aa3a93e7 b3ebbd55 769886bc' +
		    '651d06b0 cc53b0f6 3bce3c3e 27d2604b').
		    replace(/ /g, ''), 'hex'),
		s: Buffer.from(('00' +
		    'c49d3608 86e70493 6a6678e1 139d26b7' +
		    '819f7e90').
		    replace(/ /g, ''), 'hex'),
		n: Buffer.from(('00' +
		    'ffffffff 00000000 ffffffff ffffffff' +
		    'bce6faad a7179e84 f3b9cac2 fc632551').
		    replace(/ /g, ''), 'hex'),
		G: Buffer.from(('04' +
		    '6b17d1f2 e12c4247 f8bce6e5 63a440f2' +
		    '77037d81 2deb33a0 f4a13945 d898c296' +
		    '4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16' +
		    '2bce3357 6b315ece cbb64068 37bf51f5').
		    replace(/ /g, ''), 'hex')
	},
	'nistp384': {
		size: 384,
		pkcs8oid: '1.3.132.0.34',
		p: Buffer.from(('00' +
		    'ffffffff ffffffff ffffffff ffffffff' +
		    'ffffffff ffffffff ffffffff fffffffe' +
		    'ffffffff 00000000 00000000 ffffffff').
		    replace(/ /g, ''), 'hex'),
		a: Buffer.from(('00' +
		    'FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF' +
		    'FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE' +
		    'FFFFFFFF 00000000 00000000 FFFFFFFC').
		    replace(/ /g, ''), 'hex'),
		b: Buffer.from((
		    'b3312fa7 e23ee7e4 988e056b e3f82d19' +
		    '181d9c6e fe814112 0314088f 5013875a' +
		    'c656398d 8a2ed19d 2a85c8ed d3ec2aef').
		    replace(/ /g, ''), 'hex'),
		s: Buffer.from(('00' +
		    'a335926a a319a27a 1d00896a 6773a482' +
		    '7acdac73').
		    replace(/ /g, ''), 'hex'),
		n: Buffer.from(('00' +
		    'ffffffff ffffffff ffffffff ffffffff' +
		    'ffffffff ffffffff c7634d81 f4372ddf' +
		    '581a0db2 48b0a77a ecec196a ccc52973').
		    replace(/ /g, ''), 'hex'),
		G: Buffer.from(('04' +
		    'aa87ca22 be8b0537 8eb1c71e f320ad74' +
		    '6e1d3b62 8ba79b98 59f741e0 82542a38' +
		    '5502f25d bf55296c 3a545e38 72760ab7' +
		    '3617de4a 96262c6f 5d9e98bf 9292dc29' +
		    'f8f41dbd 289a147c e9da3113 b5f0b8c0' +
		    '0a60b1ce 1d7e819d 7a431d7c 90ea0e5f').
		    replace(/ /g, ''), 'hex')
	},
	'nistp521': {
		size: 521,
		pkcs8oid: '1.3.132.0.35',
		p: Buffer.from((
		    '01ffffff ffffffff ffffffff ffffffff' +
		    'ffffffff ffffffff ffffffff ffffffff' +
		    'ffffffff ffffffff ffffffff ffffffff' +
		    'ffffffff ffffffff ffffffff ffffffff' +
		    'ffff').replace(/ /g, ''), 'hex'),
		a: Buffer.from(('01FF' +
		    'FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF' +
		    'FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF' +
		    'FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF' +
		    'FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFC').
		    replace(/ /g, ''), 'hex'),
		b: Buffer.from(('51' +
		    '953eb961 8e1c9a1f 929a21a0 b68540ee' +
		    'a2da725b 99b315f3 b8b48991 8ef109e1' +
		    '56193951 ec7e937b 1652c0bd 3bb1bf07' +
		    '3573df88 3d2c34f1 ef451fd4 6b503f00').
		    replace(/ /g, ''), 'hex'),
		s: Buffer.from(('00' +
		    'd09e8800 291cb853 96cc6717 393284aa' +
		    'a0da64ba').replace(/ /g, ''), 'hex'),
		n: Buffer.from(('01ff' +
		    'ffffffff ffffffff ffffffff ffffffff' +
		    'ffffffff ffffffff ffffffff fffffffa' +
		    '51868783 bf2f966b 7fcc0148 f709a5d0' +
		    '3bb5c9b8 899c47ae bb6fb71e 91386409').
		    replace(/ /g, ''), 'hex'),
		G: Buffer.from(('04' +
		    '00c6 858e06b7 0404e9cd 9e3ecb66 2395b442' +
		         '9c648139 053fb521 f828af60 6b4d3dba' +
		         'a14b5e77 efe75928 fe1dc127 a2ffa8de' +
		         '3348b3c1 856a429b f97e7e31 c2e5bd66' +
		    '0118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9' +
		         '98f54449 579b4468 17afbd17 273e662c' +
		         '97ee7299 5ef42640 c550b901 3fad0761' +
		         '353c7086 a272c240 88be9476 9fd16650').
		    replace(/ /g, ''), 'hex')
	}
};

module.exports = {
	info: algInfo,
	privInfo: algPrivInfo,
	hashAlgs: hashAlgs,
	curves: curves
};


/***/ }),

/***/ 7406:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2016 Joyent, Inc.

module.exports = Certificate;

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var crypto = __nccwpck_require__(6417);
var Fingerprint = __nccwpck_require__(3079);
var Signature = __nccwpck_require__(1394);
var errs = __nccwpck_require__(7979);
var util = __nccwpck_require__(1669);
var utils = __nccwpck_require__(575);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var Identity = __nccwpck_require__(508);

var formats = {};
formats['openssh'] = __nccwpck_require__(4033);
formats['x509'] = __nccwpck_require__(267);
formats['pem'] = __nccwpck_require__(217);

var CertificateParseError = errs.CertificateParseError;
var InvalidAlgorithmError = errs.InvalidAlgorithmError;

function Certificate(opts) {
	assert.object(opts, 'options');
	assert.arrayOfObject(opts.subjects, 'options.subjects');
	utils.assertCompatible(opts.subjects[0], Identity, [1, 0],
	    'options.subjects');
	utils.assertCompatible(opts.subjectKey, Key, [1, 0],
	    'options.subjectKey');
	utils.assertCompatible(opts.issuer, Identity, [1, 0], 'options.issuer');
	if (opts.issuerKey !== undefined) {
		utils.assertCompatible(opts.issuerKey, Key, [1, 0],
		    'options.issuerKey');
	}
	assert.object(opts.signatures, 'options.signatures');
	assert.buffer(opts.serial, 'options.serial');
	assert.date(opts.validFrom, 'options.validFrom');
	assert.date(opts.validUntil, 'optons.validUntil');

	assert.optionalArrayOfString(opts.purposes, 'options.purposes');

	this._hashCache = {};

	this.subjects = opts.subjects;
	this.issuer = opts.issuer;
	this.subjectKey = opts.subjectKey;
	this.issuerKey = opts.issuerKey;
	this.signatures = opts.signatures;
	this.serial = opts.serial;
	this.validFrom = opts.validFrom;
	this.validUntil = opts.validUntil;
	this.purposes = opts.purposes;
}

Certificate.formats = formats;

Certificate.prototype.toBuffer = function (format, options) {
	if (format === undefined)
		format = 'x509';
	assert.string(format, 'format');
	assert.object(formats[format], 'formats[format]');
	assert.optionalObject(options, 'options');

	return (formats[format].write(this, options));
};

Certificate.prototype.toString = function (format, options) {
	if (format === undefined)
		format = 'pem';
	return (this.toBuffer(format, options).toString());
};

Certificate.prototype.fingerprint = function (algo) {
	if (algo === undefined)
		algo = 'sha256';
	assert.string(algo, 'algorithm');
	var opts = {
		type: 'certificate',
		hash: this.hash(algo),
		algorithm: algo
	};
	return (new Fingerprint(opts));
};

Certificate.prototype.hash = function (algo) {
	assert.string(algo, 'algorithm');
	algo = algo.toLowerCase();
	if (algs.hashAlgs[algo] === undefined)
		throw (new InvalidAlgorithmError(algo));

	if (this._hashCache[algo])
		return (this._hashCache[algo]);

	var hash = crypto.createHash(algo).
	    update(this.toBuffer('x509')).digest();
	this._hashCache[algo] = hash;
	return (hash);
};

Certificate.prototype.isExpired = function (when) {
	if (when === undefined)
		when = new Date();
	return (!((when.getTime() >= this.validFrom.getTime()) &&
		(when.getTime() < this.validUntil.getTime())));
};

Certificate.prototype.isSignedBy = function (issuerCert) {
	utils.assertCompatible(issuerCert, Certificate, [1, 0], 'issuer');

	if (!this.issuer.equals(issuerCert.subjects[0]))
		return (false);
	if (this.issuer.purposes && this.issuer.purposes.length > 0 &&
	    this.issuer.purposes.indexOf('ca') === -1) {
		return (false);
	}

	return (this.isSignedByKey(issuerCert.subjectKey));
};

Certificate.prototype.getExtension = function (keyOrOid) {
	assert.string(keyOrOid, 'keyOrOid');
	var ext = this.getExtensions().filter(function (maybeExt) {
		if (maybeExt.format === 'x509')
			return (maybeExt.oid === keyOrOid);
		if (maybeExt.format === 'openssh')
			return (maybeExt.name === keyOrOid);
		return (false);
	})[0];
	return (ext);
};

Certificate.prototype.getExtensions = function () {
	var exts = [];
	var x509 = this.signatures.x509;
	if (x509 && x509.extras && x509.extras.exts) {
		x509.extras.exts.forEach(function (ext) {
			ext.format = 'x509';
			exts.push(ext);
		});
	}
	var openssh = this.signatures.openssh;
	if (openssh && openssh.exts) {
		openssh.exts.forEach(function (ext) {
			ext.format = 'openssh';
			exts.push(ext);
		});
	}
	return (exts);
};

Certificate.prototype.isSignedByKey = function (issuerKey) {
	utils.assertCompatible(issuerKey, Key, [1, 2], 'issuerKey');

	if (this.issuerKey !== undefined) {
		return (this.issuerKey.
		    fingerprint('sha512').matches(issuerKey));
	}

	var fmt = Object.keys(this.signatures)[0];
	var valid = formats[fmt].verify(this, issuerKey);
	if (valid)
		this.issuerKey = issuerKey;
	return (valid);
};

Certificate.prototype.signWith = function (key) {
	utils.assertCompatible(key, PrivateKey, [1, 2], 'key');
	var fmts = Object.keys(formats);
	var didOne = false;
	for (var i = 0; i < fmts.length; ++i) {
		if (fmts[i] !== 'pem') {
			var ret = formats[fmts[i]].sign(this, key);
			if (ret === true)
				didOne = true;
		}
	}
	if (!didOne) {
		throw (new Error('Failed to sign the certificate for any ' +
		    'available certificate formats'));
	}
};

Certificate.createSelfSigned = function (subjectOrSubjects, key, options) {
	var subjects;
	if (Array.isArray(subjectOrSubjects))
		subjects = subjectOrSubjects;
	else
		subjects = [subjectOrSubjects];

	assert.arrayOfObject(subjects);
	subjects.forEach(function (subject) {
		utils.assertCompatible(subject, Identity, [1, 0], 'subject');
	});

	utils.assertCompatible(key, PrivateKey, [1, 2], 'private key');

	assert.optionalObject(options, 'options');
	if (options === undefined)
		options = {};
	assert.optionalObject(options.validFrom, 'options.validFrom');
	assert.optionalObject(options.validUntil, 'options.validUntil');
	var validFrom = options.validFrom;
	var validUntil = options.validUntil;
	if (validFrom === undefined)
		validFrom = new Date();
	if (validUntil === undefined) {
		assert.optionalNumber(options.lifetime, 'options.lifetime');
		var lifetime = options.lifetime;
		if (lifetime === undefined)
			lifetime = 10*365*24*3600;
		validUntil = new Date();
		validUntil.setTime(validUntil.getTime() + lifetime*1000);
	}
	assert.optionalBuffer(options.serial, 'options.serial');
	var serial = options.serial;
	if (serial === undefined)
		serial = Buffer.from('0000000000000001', 'hex');

	var purposes = options.purposes;
	if (purposes === undefined)
		purposes = [];

	if (purposes.indexOf('signature') === -1)
		purposes.push('signature');

	/* Self-signed certs are always CAs. */
	if (purposes.indexOf('ca') === -1)
		purposes.push('ca');
	if (purposes.indexOf('crl') === -1)
		purposes.push('crl');

	/*
	 * If we weren't explicitly given any other purposes, do the sensible
	 * thing and add some basic ones depending on the subject type.
	 */
	if (purposes.length <= 3) {
		var hostSubjects = subjects.filter(function (subject) {
			return (subject.type === 'host');
		});
		var userSubjects = subjects.filter(function (subject) {
			return (subject.type === 'user');
		});
		if (hostSubjects.length > 0) {
			if (purposes.indexOf('serverAuth') === -1)
				purposes.push('serverAuth');
		}
		if (userSubjects.length > 0) {
			if (purposes.indexOf('clientAuth') === -1)
				purposes.push('clientAuth');
		}
		if (userSubjects.length > 0 || hostSubjects.length > 0) {
			if (purposes.indexOf('keyAgreement') === -1)
				purposes.push('keyAgreement');
			if (key.type === 'rsa' &&
			    purposes.indexOf('encryption') === -1)
				purposes.push('encryption');
		}
	}

	var cert = new Certificate({
		subjects: subjects,
		issuer: subjects[0],
		subjectKey: key.toPublic(),
		issuerKey: key.toPublic(),
		signatures: {},
		serial: serial,
		validFrom: validFrom,
		validUntil: validUntil,
		purposes: purposes
	});
	cert.signWith(key);

	return (cert);
};

Certificate.create =
    function (subjectOrSubjects, key, issuer, issuerKey, options) {
	var subjects;
	if (Array.isArray(subjectOrSubjects))
		subjects = subjectOrSubjects;
	else
		subjects = [subjectOrSubjects];

	assert.arrayOfObject(subjects);
	subjects.forEach(function (subject) {
		utils.assertCompatible(subject, Identity, [1, 0], 'subject');
	});

	utils.assertCompatible(key, Key, [1, 0], 'key');
	if (PrivateKey.isPrivateKey(key))
		key = key.toPublic();
	utils.assertCompatible(issuer, Identity, [1, 0], 'issuer');
	utils.assertCompatible(issuerKey, PrivateKey, [1, 2], 'issuer key');

	assert.optionalObject(options, 'options');
	if (options === undefined)
		options = {};
	assert.optionalObject(options.validFrom, 'options.validFrom');
	assert.optionalObject(options.validUntil, 'options.validUntil');
	var validFrom = options.validFrom;
	var validUntil = options.validUntil;
	if (validFrom === undefined)
		validFrom = new Date();
	if (validUntil === undefined) {
		assert.optionalNumber(options.lifetime, 'options.lifetime');
		var lifetime = options.lifetime;
		if (lifetime === undefined)
			lifetime = 10*365*24*3600;
		validUntil = new Date();
		validUntil.setTime(validUntil.getTime() + lifetime*1000);
	}
	assert.optionalBuffer(options.serial, 'options.serial');
	var serial = options.serial;
	if (serial === undefined)
		serial = Buffer.from('0000000000000001', 'hex');

	var purposes = options.purposes;
	if (purposes === undefined)
		purposes = [];

	if (purposes.indexOf('signature') === -1)
		purposes.push('signature');

	if (options.ca === true) {
		if (purposes.indexOf('ca') === -1)
			purposes.push('ca');
		if (purposes.indexOf('crl') === -1)
			purposes.push('crl');
	}

	var hostSubjects = subjects.filter(function (subject) {
		return (subject.type === 'host');
	});
	var userSubjects = subjects.filter(function (subject) {
		return (subject.type === 'user');
	});
	if (hostSubjects.length > 0) {
		if (purposes.indexOf('serverAuth') === -1)
			purposes.push('serverAuth');
	}
	if (userSubjects.length > 0) {
		if (purposes.indexOf('clientAuth') === -1)
			purposes.push('clientAuth');
	}
	if (userSubjects.length > 0 || hostSubjects.length > 0) {
		if (purposes.indexOf('keyAgreement') === -1)
			purposes.push('keyAgreement');
		if (key.type === 'rsa' &&
		    purposes.indexOf('encryption') === -1)
			purposes.push('encryption');
	}

	var cert = new Certificate({
		subjects: subjects,
		issuer: issuer,
		subjectKey: key,
		issuerKey: issuerKey.toPublic(),
		signatures: {},
		serial: serial,
		validFrom: validFrom,
		validUntil: validUntil,
		purposes: purposes
	});
	cert.signWith(issuerKey);

	return (cert);
};

Certificate.parse = function (data, format, options) {
	if (typeof (data) !== 'string')
		assert.buffer(data, 'data');
	if (format === undefined)
		format = 'auto';
	assert.string(format, 'format');
	if (typeof (options) === 'string')
		options = { filename: options };
	assert.optionalObject(options, 'options');
	if (options === undefined)
		options = {};
	assert.optionalString(options.filename, 'options.filename');
	if (options.filename === undefined)
		options.filename = '(unnamed)';

	assert.object(formats[format], 'formats[format]');

	try {
		var k = formats[format].read(data, options);
		return (k);
	} catch (e) {
		throw (new CertificateParseError(options.filename, format, e));
	}
};

Certificate.isCertificate = function (obj, ver) {
	return (utils.isCompatible(obj, Certificate, ver));
};

/*
 * API versions for Certificate:
 * [1,0] -- initial ver
 * [1,1] -- openssh format now unpacks extensions
 */
Certificate.prototype._sshpkApiVersion = [1, 1];

Certificate._oldVersionDetect = function (obj) {
	return ([1, 0]);
};


/***/ }),

/***/ 7602:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2017 Joyent, Inc.

module.exports = {
	DiffieHellman: DiffieHellman,
	generateECDSA: generateECDSA,
	generateED25519: generateED25519
};

var assert = __nccwpck_require__(6631);
var crypto = __nccwpck_require__(6417);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var utils = __nccwpck_require__(575);
var nacl = __nccwpck_require__(8729);

var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);

var CRYPTO_HAVE_ECDH = (crypto.createECDH !== undefined);

var ecdh = __nccwpck_require__(9865);
var ec = __nccwpck_require__(3943);
var jsbn = __nccwpck_require__(5587).BigInteger;

function DiffieHellman(key) {
	utils.assertCompatible(key, Key, [1, 4], 'key');
	this._isPriv = PrivateKey.isPrivateKey(key, [1, 3]);
	this._algo = key.type;
	this._curve = key.curve;
	this._key = key;
	if (key.type === 'dsa') {
		if (!CRYPTO_HAVE_ECDH) {
			throw (new Error('Due to bugs in the node 0.10 ' +
			    'crypto API, node 0.12.x or later is required ' +
			    'to use DH'));
		}
		this._dh = crypto.createDiffieHellman(
		    key.part.p.data, undefined,
		    key.part.g.data, undefined);
		this._p = key.part.p;
		this._g = key.part.g;
		if (this._isPriv)
			this._dh.setPrivateKey(key.part.x.data);
		this._dh.setPublicKey(key.part.y.data);

	} else if (key.type === 'ecdsa') {
		if (!CRYPTO_HAVE_ECDH) {
			this._ecParams = new X9ECParameters(this._curve);

			if (this._isPriv) {
				this._priv = new ECPrivate(
				    this._ecParams, key.part.d.data);
			}
			return;
		}

		var curve = {
			'nistp256': 'prime256v1',
			'nistp384': 'secp384r1',
			'nistp521': 'secp521r1'
		}[key.curve];
		this._dh = crypto.createECDH(curve);
		if (typeof (this._dh) !== 'object' ||
		    typeof (this._dh.setPrivateKey) !== 'function') {
			CRYPTO_HAVE_ECDH = false;
			DiffieHellman.call(this, key);
			return;
		}
		if (this._isPriv)
			this._dh.setPrivateKey(key.part.d.data);
		this._dh.setPublicKey(key.part.Q.data);

	} else if (key.type === 'curve25519') {
		if (this._isPriv) {
			utils.assertCompatible(key, PrivateKey, [1, 5], 'key');
			this._priv = key.part.k.data;
		}

	} else {
		throw (new Error('DH not supported for ' + key.type + ' keys'));
	}
}

DiffieHellman.prototype.getPublicKey = function () {
	if (this._isPriv)
		return (this._key.toPublic());
	return (this._key);
};

DiffieHellman.prototype.getPrivateKey = function () {
	if (this._isPriv)
		return (this._key);
	else
		return (undefined);
};
DiffieHellman.prototype.getKey = DiffieHellman.prototype.getPrivateKey;

DiffieHellman.prototype._keyCheck = function (pk, isPub) {
	assert.object(pk, 'key');
	if (!isPub)
		utils.assertCompatible(pk, PrivateKey, [1, 3], 'key');
	utils.assertCompatible(pk, Key, [1, 4], 'key');

	if (pk.type !== this._algo) {
		throw (new Error('A ' + pk.type + ' key cannot be used in ' +
		    this._algo + ' Diffie-Hellman'));
	}

	if (pk.curve !== this._curve) {
		throw (new Error('A key from the ' + pk.curve + ' curve ' +
		    'cannot be used with a ' + this._curve +
		    ' Diffie-Hellman'));
	}

	if (pk.type === 'dsa') {
		assert.deepEqual(pk.part.p, this._p,
		    'DSA key prime does not match');
		assert.deepEqual(pk.part.g, this._g,
		    'DSA key generator does not match');
	}
};

DiffieHellman.prototype.setKey = function (pk) {
	this._keyCheck(pk);

	if (pk.type === 'dsa') {
		this._dh.setPrivateKey(pk.part.x.data);
		this._dh.setPublicKey(pk.part.y.data);

	} else if (pk.type === 'ecdsa') {
		if (CRYPTO_HAVE_ECDH) {
			this._dh.setPrivateKey(pk.part.d.data);
			this._dh.setPublicKey(pk.part.Q.data);
		} else {
			this._priv = new ECPrivate(
			    this._ecParams, pk.part.d.data);
		}

	} else if (pk.type === 'curve25519') {
		var k = pk.part.k;
		if (!pk.part.k)
			k = pk.part.r;
		this._priv = k.data;
		if (this._priv[0] === 0x00)
			this._priv = this._priv.slice(1);
		this._priv = this._priv.slice(0, 32);
	}
	this._key = pk;
	this._isPriv = true;
};
DiffieHellman.prototype.setPrivateKey = DiffieHellman.prototype.setKey;

DiffieHellman.prototype.computeSecret = function (otherpk) {
	this._keyCheck(otherpk, true);
	if (!this._isPriv)
		throw (new Error('DH exchange has not been initialized with ' +
		    'a private key yet'));

	var pub;
	if (this._algo === 'dsa') {
		return (this._dh.computeSecret(
		    otherpk.part.y.data));

	} else if (this._algo === 'ecdsa') {
		if (CRYPTO_HAVE_ECDH) {
			return (this._dh.computeSecret(
			    otherpk.part.Q.data));
		} else {
			pub = new ECPublic(
			    this._ecParams, otherpk.part.Q.data);
			return (this._priv.deriveSharedSecret(pub));
		}

	} else if (this._algo === 'curve25519') {
		pub = otherpk.part.A.data;
		while (pub[0] === 0x00 && pub.length > 32)
			pub = pub.slice(1);
		var priv = this._priv;
		assert.strictEqual(pub.length, 32);
		assert.strictEqual(priv.length, 32);

		var secret = nacl.box.before(new Uint8Array(pub),
		    new Uint8Array(priv));

		return (Buffer.from(secret));
	}

	throw (new Error('Invalid algorithm: ' + this._algo));
};

DiffieHellman.prototype.generateKey = function () {
	var parts = [];
	var priv, pub;
	if (this._algo === 'dsa') {
		this._dh.generateKeys();

		parts.push({name: 'p', data: this._p.data});
		parts.push({name: 'q', data: this._key.part.q.data});
		parts.push({name: 'g', data: this._g.data});
		parts.push({name: 'y', data: this._dh.getPublicKey()});
		parts.push({name: 'x', data: this._dh.getPrivateKey()});
		this._key = new PrivateKey({
			type: 'dsa',
			parts: parts
		});
		this._isPriv = true;
		return (this._key);

	} else if (this._algo === 'ecdsa') {
		if (CRYPTO_HAVE_ECDH) {
			this._dh.generateKeys();

			parts.push({name: 'curve',
			    data: Buffer.from(this._curve)});
			parts.push({name: 'Q', data: this._dh.getPublicKey()});
			parts.push({name: 'd', data: this._dh.getPrivateKey()});
			this._key = new PrivateKey({
				type: 'ecdsa',
				curve: this._curve,
				parts: parts
			});
			this._isPriv = true;
			return (this._key);

		} else {
			var n = this._ecParams.getN();
			var r = new jsbn(crypto.randomBytes(n.bitLength()));
			var n1 = n.subtract(jsbn.ONE);
			priv = r.mod(n1).add(jsbn.ONE);
			pub = this._ecParams.getG().multiply(priv);

			priv = Buffer.from(priv.toByteArray());
			pub = Buffer.from(this._ecParams.getCurve().
			    encodePointHex(pub), 'hex');

			this._priv = new ECPrivate(this._ecParams, priv);

			parts.push({name: 'curve',
			    data: Buffer.from(this._curve)});
			parts.push({name: 'Q', data: pub});
			parts.push({name: 'd', data: priv});

			this._key = new PrivateKey({
				type: 'ecdsa',
				curve: this._curve,
				parts: parts
			});
			this._isPriv = true;
			return (this._key);
		}

	} else if (this._algo === 'curve25519') {
		var pair = nacl.box.keyPair();
		priv = Buffer.from(pair.secretKey);
		pub = Buffer.from(pair.publicKey);
		priv = Buffer.concat([priv, pub]);
		assert.strictEqual(priv.length, 64);
		assert.strictEqual(pub.length, 32);

		parts.push({name: 'A', data: pub});
		parts.push({name: 'k', data: priv});
		this._key = new PrivateKey({
			type: 'curve25519',
			parts: parts
		});
		this._isPriv = true;
		return (this._key);
	}

	throw (new Error('Invalid algorithm: ' + this._algo));
};
DiffieHellman.prototype.generateKeys = DiffieHellman.prototype.generateKey;

/* These are helpers for using ecc-jsbn (for node 0.10 compatibility). */

function X9ECParameters(name) {
	var params = algs.curves[name];
	assert.object(params);

	var p = new jsbn(params.p);
	var a = new jsbn(params.a);
	var b = new jsbn(params.b);
	var n = new jsbn(params.n);
	var h = jsbn.ONE;
	var curve = new ec.ECCurveFp(p, a, b);
	var G = curve.decodePointHex(params.G.toString('hex'));

	this.curve = curve;
	this.g = G;
	this.n = n;
	this.h = h;
}
X9ECParameters.prototype.getCurve = function () { return (this.curve); };
X9ECParameters.prototype.getG = function () { return (this.g); };
X9ECParameters.prototype.getN = function () { return (this.n); };
X9ECParameters.prototype.getH = function () { return (this.h); };

function ECPublic(params, buffer) {
	this._params = params;
	if (buffer[0] === 0x00)
		buffer = buffer.slice(1);
	this._pub = params.getCurve().decodePointHex(buffer.toString('hex'));
}

function ECPrivate(params, buffer) {
	this._params = params;
	this._priv = new jsbn(utils.mpNormalize(buffer));
}
ECPrivate.prototype.deriveSharedSecret = function (pubKey) {
	assert.ok(pubKey instanceof ECPublic);
	var S = pubKey._pub.multiply(this._priv);
	return (Buffer.from(S.getX().toBigInteger().toByteArray()));
};

function generateED25519() {
	var pair = nacl.sign.keyPair();
	var priv = Buffer.from(pair.secretKey);
	var pub = Buffer.from(pair.publicKey);
	assert.strictEqual(priv.length, 64);
	assert.strictEqual(pub.length, 32);

	var parts = [];
	parts.push({name: 'A', data: pub});
	parts.push({name: 'k', data: priv.slice(0, 32)});
	var key = new PrivateKey({
		type: 'ed25519',
		parts: parts
	});
	return (key);
}

/* Generates a new ECDSA private key on a given curve. */
function generateECDSA(curve) {
	var parts = [];
	var key;

	if (CRYPTO_HAVE_ECDH) {
		/*
		 * Node crypto doesn't expose key generation directly, but the
		 * ECDH instances can generate keys. It turns out this just
		 * calls into the OpenSSL generic key generator, and we can
		 * read its output happily without doing an actual DH. So we
		 * use that here.
		 */
		var osCurve = {
			'nistp256': 'prime256v1',
			'nistp384': 'secp384r1',
			'nistp521': 'secp521r1'
		}[curve];

		var dh = crypto.createECDH(osCurve);
		dh.generateKeys();

		parts.push({name: 'curve',
		    data: Buffer.from(curve)});
		parts.push({name: 'Q', data: dh.getPublicKey()});
		parts.push({name: 'd', data: dh.getPrivateKey()});

		key = new PrivateKey({
			type: 'ecdsa',
			curve: curve,
			parts: parts
		});
		return (key);
	} else {

		var ecParams = new X9ECParameters(curve);

		/* This algorithm taken from FIPS PUB 186-4 (section B.4.1) */
		var n = ecParams.getN();
		/*
		 * The crypto.randomBytes() function can only give us whole
		 * bytes, so taking a nod from X9.62, we round up.
		 */
		var cByteLen = Math.ceil((n.bitLength() + 64) / 8);
		var c = new jsbn(crypto.randomBytes(cByteLen));

		var n1 = n.subtract(jsbn.ONE);
		var priv = c.mod(n1).add(jsbn.ONE);
		var pub = ecParams.getG().multiply(priv);

		priv = Buffer.from(priv.toByteArray());
		pub = Buffer.from(ecParams.getCurve().
		    encodePointHex(pub), 'hex');

		parts.push({name: 'curve', data: Buffer.from(curve)});
		parts.push({name: 'Q', data: pub});
		parts.push({name: 'd', data: priv});

		key = new PrivateKey({
			type: 'ecdsa',
			curve: curve,
			parts: parts
		});
		return (key);
	}
}


/***/ }),

/***/ 4694:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

module.exports = {
	Verifier: Verifier,
	Signer: Signer
};

var nacl = __nccwpck_require__(8729);
var stream = __nccwpck_require__(2413);
var util = __nccwpck_require__(1669);
var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var Signature = __nccwpck_require__(1394);

function Verifier(key, hashAlgo) {
	if (hashAlgo.toLowerCase() !== 'sha512')
		throw (new Error('ED25519 only supports the use of ' +
		    'SHA-512 hashes'));

	this.key = key;
	this.chunks = [];

	stream.Writable.call(this, {});
}
util.inherits(Verifier, stream.Writable);

Verifier.prototype._write = function (chunk, enc, cb) {
	this.chunks.push(chunk);
	cb();
};

Verifier.prototype.update = function (chunk) {
	if (typeof (chunk) === 'string')
		chunk = Buffer.from(chunk, 'binary');
	this.chunks.push(chunk);
};

Verifier.prototype.verify = function (signature, fmt) {
	var sig;
	if (Signature.isSignature(signature, [2, 0])) {
		if (signature.type !== 'ed25519')
			return (false);
		sig = signature.toBuffer('raw');

	} else if (typeof (signature) === 'string') {
		sig = Buffer.from(signature, 'base64');

	} else if (Signature.isSignature(signature, [1, 0])) {
		throw (new Error('signature was created by too old ' +
		    'a version of sshpk and cannot be verified'));
	}

	assert.buffer(sig);
	return (nacl.sign.detached.verify(
	    new Uint8Array(Buffer.concat(this.chunks)),
	    new Uint8Array(sig),
	    new Uint8Array(this.key.part.A.data)));
};

function Signer(key, hashAlgo) {
	if (hashAlgo.toLowerCase() !== 'sha512')
		throw (new Error('ED25519 only supports the use of ' +
		    'SHA-512 hashes'));

	this.key = key;
	this.chunks = [];

	stream.Writable.call(this, {});
}
util.inherits(Signer, stream.Writable);

Signer.prototype._write = function (chunk, enc, cb) {
	this.chunks.push(chunk);
	cb();
};

Signer.prototype.update = function (chunk) {
	if (typeof (chunk) === 'string')
		chunk = Buffer.from(chunk, 'binary');
	this.chunks.push(chunk);
};

Signer.prototype.sign = function () {
	var sig = nacl.sign.detached(
	    new Uint8Array(Buffer.concat(this.chunks)),
	    new Uint8Array(Buffer.concat([
		this.key.part.k.data, this.key.part.A.data])));
	var sigBuf = Buffer.from(sig);
	var sigObj = Signature.parse(sigBuf, 'ed25519', 'raw');
	sigObj.hashAlgorithm = 'sha512';
	return (sigObj);
};


/***/ }),

/***/ 7979:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

var assert = __nccwpck_require__(6631);
var util = __nccwpck_require__(1669);

function FingerprintFormatError(fp, format) {
	if (Error.captureStackTrace)
		Error.captureStackTrace(this, FingerprintFormatError);
	this.name = 'FingerprintFormatError';
	this.fingerprint = fp;
	this.format = format;
	this.message = 'Fingerprint format is not supported, or is invalid: ';
	if (fp !== undefined)
		this.message += ' fingerprint = ' + fp;
	if (format !== undefined)
		this.message += ' format = ' + format;
}
util.inherits(FingerprintFormatError, Error);

function InvalidAlgorithmError(alg) {
	if (Error.captureStackTrace)
		Error.captureStackTrace(this, InvalidAlgorithmError);
	this.name = 'InvalidAlgorithmError';
	this.algorithm = alg;
	this.message = 'Algorithm "' + alg + '" is not supported';
}
util.inherits(InvalidAlgorithmError, Error);

function KeyParseError(name, format, innerErr) {
	if (Error.captureStackTrace)
		Error.captureStackTrace(this, KeyParseError);
	this.name = 'KeyParseError';
	this.format = format;
	this.keyName = name;
	this.innerErr = innerErr;
	this.message = 'Failed to parse ' + name + ' as a valid ' + format +
	    ' format key: ' + innerErr.message;
}
util.inherits(KeyParseError, Error);

function SignatureParseError(type, format, innerErr) {
	if (Error.captureStackTrace)
		Error.captureStackTrace(this, SignatureParseError);
	this.name = 'SignatureParseError';
	this.type = type;
	this.format = format;
	this.innerErr = innerErr;
	this.message = 'Failed to parse the given data as a ' + type +
	    ' signature in ' + format + ' format: ' + innerErr.message;
}
util.inherits(SignatureParseError, Error);

function CertificateParseError(name, format, innerErr) {
	if (Error.captureStackTrace)
		Error.captureStackTrace(this, CertificateParseError);
	this.name = 'CertificateParseError';
	this.format = format;
	this.certName = name;
	this.innerErr = innerErr;
	this.message = 'Failed to parse ' + name + ' as a valid ' + format +
	    ' format certificate: ' + innerErr.message;
}
util.inherits(CertificateParseError, Error);

function KeyEncryptedError(name, format) {
	if (Error.captureStackTrace)
		Error.captureStackTrace(this, KeyEncryptedError);
	this.name = 'KeyEncryptedError';
	this.format = format;
	this.keyName = name;
	this.message = 'The ' + format + ' format key ' + name + ' is ' +
	    'encrypted (password-protected), and no passphrase was ' +
	    'provided in `options`';
}
util.inherits(KeyEncryptedError, Error);

module.exports = {
	FingerprintFormatError: FingerprintFormatError,
	InvalidAlgorithmError: InvalidAlgorithmError,
	KeyParseError: KeyParseError,
	SignatureParseError: SignatureParseError,
	KeyEncryptedError: KeyEncryptedError,
	CertificateParseError: CertificateParseError
};


/***/ }),

/***/ 3079:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2018 Joyent, Inc.

module.exports = Fingerprint;

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var crypto = __nccwpck_require__(6417);
var errs = __nccwpck_require__(7979);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var Certificate = __nccwpck_require__(7406);
var utils = __nccwpck_require__(575);

var FingerprintFormatError = errs.FingerprintFormatError;
var InvalidAlgorithmError = errs.InvalidAlgorithmError;

function Fingerprint(opts) {
	assert.object(opts, 'options');
	assert.string(opts.type, 'options.type');
	assert.buffer(opts.hash, 'options.hash');
	assert.string(opts.algorithm, 'options.algorithm');

	this.algorithm = opts.algorithm.toLowerCase();
	if (algs.hashAlgs[this.algorithm] !== true)
		throw (new InvalidAlgorithmError(this.algorithm));

	this.hash = opts.hash;
	this.type = opts.type;
	this.hashType = opts.hashType;
}

Fingerprint.prototype.toString = function (format) {
	if (format === undefined) {
		if (this.algorithm === 'md5' || this.hashType === 'spki')
			format = 'hex';
		else
			format = 'base64';
	}
	assert.string(format);

	switch (format) {
	case 'hex':
		if (this.hashType === 'spki')
			return (this.hash.toString('hex'));
		return (addColons(this.hash.toString('hex')));
	case 'base64':
		if (this.hashType === 'spki')
			return (this.hash.toString('base64'));
		return (sshBase64Format(this.algorithm,
		    this.hash.toString('base64')));
	default:
		throw (new FingerprintFormatError(undefined, format));
	}
};

Fingerprint.prototype.matches = function (other) {
	assert.object(other, 'key or certificate');
	if (this.type === 'key' && this.hashType !== 'ssh') {
		utils.assertCompatible(other, Key, [1, 7], 'key with spki');
		if (PrivateKey.isPrivateKey(other)) {
			utils.assertCompatible(other, PrivateKey, [1, 6],
			    'privatekey with spki support');
		}
	} else if (this.type === 'key') {
		utils.assertCompatible(other, Key, [1, 0], 'key');
	} else {
		utils.assertCompatible(other, Certificate, [1, 0],
		    'certificate');
	}

	var theirHash = other.hash(this.algorithm, this.hashType);
	var theirHash2 = crypto.createHash(this.algorithm).
	    update(theirHash).digest('base64');

	if (this.hash2 === undefined)
		this.hash2 = crypto.createHash(this.algorithm).
		    update(this.hash).digest('base64');

	return (this.hash2 === theirHash2);
};

/*JSSTYLED*/
var base64RE = /^[A-Za-z0-9+\/=]+$/;
/*JSSTYLED*/
var hexRE = /^[a-fA-F0-9]+$/;

Fingerprint.parse = function (fp, options) {
	assert.string(fp, 'fingerprint');

	var alg, hash, enAlgs;
	if (Array.isArray(options)) {
		enAlgs = options;
		options = {};
	}
	assert.optionalObject(options, 'options');
	if (options === undefined)
		options = {};
	if (options.enAlgs !== undefined)
		enAlgs = options.enAlgs;
	if (options.algorithms !== undefined)
		enAlgs = options.algorithms;
	assert.optionalArrayOfString(enAlgs, 'algorithms');

	var hashType = 'ssh';
	if (options.hashType !== undefined)
		hashType = options.hashType;
	assert.string(hashType, 'options.hashType');

	var parts = fp.split(':');
	if (parts.length == 2) {
		alg = parts[0].toLowerCase();
		if (!base64RE.test(parts[1]))
			throw (new FingerprintFormatError(fp));
		try {
			hash = Buffer.from(parts[1], 'base64');
		} catch (e) {
			throw (new FingerprintFormatError(fp));
		}
	} else if (parts.length > 2) {
		alg = 'md5';
		if (parts[0].toLowerCase() === 'md5')
			parts = parts.slice(1);
		parts = parts.map(function (p) {
			while (p.length < 2)
				p = '0' + p;
			if (p.length > 2)
				throw (new FingerprintFormatError(fp));
			return (p);
		});
		parts = parts.join('');
		if (!hexRE.test(parts) || parts.length % 2 !== 0)
			throw (new FingerprintFormatError(fp));
		try {
			hash = Buffer.from(parts, 'hex');
		} catch (e) {
			throw (new FingerprintFormatError(fp));
		}
	} else {
		if (hexRE.test(fp)) {
			hash = Buffer.from(fp, 'hex');
		} else if (base64RE.test(fp)) {
			hash = Buffer.from(fp, 'base64');
		} else {
			throw (new FingerprintFormatError(fp));
		}

		switch (hash.length) {
		case 32:
			alg = 'sha256';
			break;
		case 16:
			alg = 'md5';
			break;
		case 20:
			alg = 'sha1';
			break;
		case 64:
			alg = 'sha512';
			break;
		default:
			throw (new FingerprintFormatError(fp));
		}

		/* Plain hex/base64: guess it's probably SPKI unless told. */
		if (options.hashType === undefined)
			hashType = 'spki';
	}

	if (alg === undefined)
		throw (new FingerprintFormatError(fp));

	if (algs.hashAlgs[alg] === undefined)
		throw (new InvalidAlgorithmError(alg));

	if (enAlgs !== undefined) {
		enAlgs = enAlgs.map(function (a) { return a.toLowerCase(); });
		if (enAlgs.indexOf(alg) === -1)
			throw (new InvalidAlgorithmError(alg));
	}

	return (new Fingerprint({
		algorithm: alg,
		hash: hash,
		type: options.type || 'key',
		hashType: hashType
	}));
};

function addColons(s) {
	/*JSSTYLED*/
	return (s.replace(/(.{2})(?=.)/g, '$1:'));
}

function base64Strip(s) {
	/*JSSTYLED*/
	return (s.replace(/=*$/, ''));
}

function sshBase64Format(alg, h) {
	return (alg.toUpperCase() + ':' + base64Strip(h));
}

Fingerprint.isFingerprint = function (obj, ver) {
	return (utils.isCompatible(obj, Fingerprint, ver));
};

/*
 * API versions for Fingerprint:
 * [1,0] -- initial ver
 * [1,1] -- first tagged ver
 * [1,2] -- hashType and spki support
 */
Fingerprint.prototype._sshpkApiVersion = [1, 2];

Fingerprint._oldVersionDetect = function (obj) {
	assert.func(obj.toString);
	assert.func(obj.matches);
	return ([1, 0]);
};


/***/ }),

/***/ 8243:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2018 Joyent, Inc.

module.exports = {
	read: read,
	write: write
};

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var utils = __nccwpck_require__(575);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);

var pem = __nccwpck_require__(4324);
var ssh = __nccwpck_require__(8927);
var rfc4253 = __nccwpck_require__(8688);
var dnssec = __nccwpck_require__(3561);
var putty = __nccwpck_require__(974);

var DNSSEC_PRIVKEY_HEADER_PREFIX = 'Private-key-format: v1';

function read(buf, options) {
	if (typeof (buf) === 'string') {
		if (buf.trim().match(/^[-]+[ ]*BEGIN/))
			return (pem.read(buf, options));
		if (buf.match(/^\s*ssh-[a-z]/))
			return (ssh.read(buf, options));
		if (buf.match(/^\s*ecdsa-/))
			return (ssh.read(buf, options));
		if (buf.match(/^putty-user-key-file-2:/i))
			return (putty.read(buf, options));
		if (findDNSSECHeader(buf))
			return (dnssec.read(buf, options));
		buf = Buffer.from(buf, 'binary');
	} else {
		assert.buffer(buf);
		if (findPEMHeader(buf))
			return (pem.read(buf, options));
		if (findSSHHeader(buf))
			return (ssh.read(buf, options));
		if (findPuTTYHeader(buf))
			return (putty.read(buf, options));
		if (findDNSSECHeader(buf))
			return (dnssec.read(buf, options));
	}
	if (buf.readUInt32BE(0) < buf.length)
		return (rfc4253.read(buf, options));
	throw (new Error('Failed to auto-detect format of key'));
}

function findPuTTYHeader(buf) {
	var offset = 0;
	while (offset < buf.length &&
	    (buf[offset] === 32 || buf[offset] === 10 || buf[offset] === 9))
		++offset;
	if (offset + 22 <= buf.length &&
	    buf.slice(offset, offset + 22).toString('ascii').toLowerCase() ===
	    'putty-user-key-file-2:')
		return (true);
	return (false);
}

function findSSHHeader(buf) {
	var offset = 0;
	while (offset < buf.length &&
	    (buf[offset] === 32 || buf[offset] === 10 || buf[offset] === 9))
		++offset;
	if (offset + 4 <= buf.length &&
	    buf.slice(offset, offset + 4).toString('ascii') === 'ssh-')
		return (true);
	if (offset + 6 <= buf.length &&
	    buf.slice(offset, offset + 6).toString('ascii') === 'ecdsa-')
		return (true);
	return (false);
}

function findPEMHeader(buf) {
	var offset = 0;
	while (offset < buf.length &&
	    (buf[offset] === 32 || buf[offset] === 10))
		++offset;
	if (buf[offset] !== 45)
		return (false);
	while (offset < buf.length &&
	    (buf[offset] === 45))
		++offset;
	while (offset < buf.length &&
	    (buf[offset] === 32))
		++offset;
	if (offset + 5 > buf.length ||
	    buf.slice(offset, offset + 5).toString('ascii') !== 'BEGIN')
		return (false);
	return (true);
}

function findDNSSECHeader(buf) {
	// private case first
	if (buf.length <= DNSSEC_PRIVKEY_HEADER_PREFIX.length)
		return (false);
	var headerCheck = buf.slice(0, DNSSEC_PRIVKEY_HEADER_PREFIX.length);
	if (headerCheck.toString('ascii') === DNSSEC_PRIVKEY_HEADER_PREFIX)
		return (true);

	// public-key RFC3110 ?
	// 'domain.com. IN KEY ...' or 'domain.com. IN DNSKEY ...'
	// skip any comment-lines
	if (typeof (buf) !== 'string') {
		buf = buf.toString('ascii');
	}
	var lines = buf.split('\n');
	var line = 0;
	/* JSSTYLED */
	while (lines[line].match(/^\;/))
		line++;
	if (lines[line].toString('ascii').match(/\. IN KEY /))
		return (true);
	if (lines[line].toString('ascii').match(/\. IN DNSKEY /))
		return (true);
	return (false);
}

function write(key, options) {
	throw (new Error('"auto" format cannot be used for writing'));
}


/***/ }),

/***/ 3561:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2017 Joyent, Inc.

module.exports = {
	read: read,
	write: write
};

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var utils = __nccwpck_require__(575);
var SSHBuffer = __nccwpck_require__(5621);
var Dhe = __nccwpck_require__(7602);

var supportedAlgos = {
	'rsa-sha1' : 5,
	'rsa-sha256' : 8,
	'rsa-sha512' : 10,
	'ecdsa-p256-sha256' : 13,
	'ecdsa-p384-sha384' : 14
	/*
	 * ed25519 is hypothetically supported with id 15
	 * but the common tools available don't appear to be
	 * capable of generating/using ed25519 keys
	 */
};

var supportedAlgosById = {};
Object.keys(supportedAlgos).forEach(function (k) {
	supportedAlgosById[supportedAlgos[k]] = k.toUpperCase();
});

function read(buf, options) {
	if (typeof (buf) !== 'string') {
		assert.buffer(buf, 'buf');
		buf = buf.toString('ascii');
	}
	var lines = buf.split('\n');
	if (lines[0].match(/^Private-key-format\: v1/)) {
		var algElems = lines[1].split(' ');
		var algoNum = parseInt(algElems[1], 10);
		var algoName = algElems[2];
		if (!supportedAlgosById[algoNum])
			throw (new Error('Unsupported algorithm: ' + algoName));
		return (readDNSSECPrivateKey(algoNum, lines.slice(2)));
	}

	// skip any comment-lines
	var line = 0;
	/* JSSTYLED */
	while (lines[line].match(/^\;/))
		line++;
	// we should now have *one single* line left with our KEY on it.
	if ((lines[line].match(/\. IN KEY /) ||
	    lines[line].match(/\. IN DNSKEY /)) && lines[line+1].length === 0) {
		return (readRFC3110(lines[line]));
	}
	throw (new Error('Cannot parse dnssec key'));
}

function readRFC3110(keyString) {
	var elems = keyString.split(' ');
	//unused var flags = parseInt(elems[3], 10);
	//unused var protocol = parseInt(elems[4], 10);
	var algorithm = parseInt(elems[5], 10);
	if (!supportedAlgosById[algorithm])
		throw (new Error('Unsupported algorithm: ' + algorithm));
	var base64key = elems.slice(6, elems.length).join();
	var keyBuffer = Buffer.from(base64key, 'base64');
	if (supportedAlgosById[algorithm].match(/^RSA-/)) {
		// join the rest of the body into a single base64-blob
		var publicExponentLen = keyBuffer.readUInt8(0);
		if (publicExponentLen != 3 && publicExponentLen != 1)
			throw (new Error('Cannot parse dnssec key: ' +
			    'unsupported exponent length'));

		var publicExponent = keyBuffer.slice(1, publicExponentLen+1);
		publicExponent = utils.mpNormalize(publicExponent);
		var modulus = keyBuffer.slice(1+publicExponentLen);
		modulus = utils.mpNormalize(modulus);
		// now, make the key
		var rsaKey = {
			type: 'rsa',
			parts: []
		};
		rsaKey.parts.push({ name: 'e', data: publicExponent});
		rsaKey.parts.push({ name: 'n', data: modulus});
		return (new Key(rsaKey));
	}
	if (supportedAlgosById[algorithm] === 'ECDSA-P384-SHA384' ||
	    supportedAlgosById[algorithm] === 'ECDSA-P256-SHA256') {
		var curve = 'nistp384';
		var size = 384;
		if (supportedAlgosById[algorithm].match(/^ECDSA-P256-SHA256/)) {
			curve = 'nistp256';
			size = 256;
		}

		var ecdsaKey = {
			type: 'ecdsa',
			curve: curve,
			size: size,
			parts: [
				{name: 'curve', data: Buffer.from(curve) },
				{name: 'Q', data: utils.ecNormalize(keyBuffer) }
			]
		};
		return (new Key(ecdsaKey));
	}
	throw (new Error('Unsupported algorithm: ' +
	    supportedAlgosById[algorithm]));
}

function elementToBuf(e) {
	return (Buffer.from(e.split(' ')[1], 'base64'));
}

function readDNSSECRSAPrivateKey(elements) {
	var rsaParams = {};
	elements.forEach(function (element) {
		if (element.split(' ')[0] === 'Modulus:')
			rsaParams['n'] = elementToBuf(element);
		else if (element.split(' ')[0] === 'PublicExponent:')
			rsaParams['e'] = elementToBuf(element);
		else if (element.split(' ')[0] === 'PrivateExponent:')
			rsaParams['d'] = elementToBuf(element);
		else if (element.split(' ')[0] === 'Prime1:')
			rsaParams['p'] = elementToBuf(element);
		else if (element.split(' ')[0] === 'Prime2:')
			rsaParams['q'] = elementToBuf(element);
		else if (element.split(' ')[0] === 'Exponent1:')
			rsaParams['dmodp'] = elementToBuf(element);
		else if (element.split(' ')[0] === 'Exponent2:')
			rsaParams['dmodq'] = elementToBuf(element);
		else if (element.split(' ')[0] === 'Coefficient:')
			rsaParams['iqmp'] = elementToBuf(element);
	});
	// now, make the key
	var key = {
		type: 'rsa',
		parts: [
			{ name: 'e', data: utils.mpNormalize(rsaParams['e'])},
			{ name: 'n', data: utils.mpNormalize(rsaParams['n'])},
			{ name: 'd', data: utils.mpNormalize(rsaParams['d'])},
			{ name: 'p', data: utils.mpNormalize(rsaParams['p'])},
			{ name: 'q', data: utils.mpNormalize(rsaParams['q'])},
			{ name: 'dmodp',
			    data: utils.mpNormalize(rsaParams['dmodp'])},
			{ name: 'dmodq',
			    data: utils.mpNormalize(rsaParams['dmodq'])},
			{ name: 'iqmp',
			    data: utils.mpNormalize(rsaParams['iqmp'])}
		]
	};
	return (new PrivateKey(key));
}

function readDNSSECPrivateKey(alg, elements) {
	if (supportedAlgosById[alg].match(/^RSA-/)) {
		return (readDNSSECRSAPrivateKey(elements));
	}
	if (supportedAlgosById[alg] === 'ECDSA-P384-SHA384' ||
	    supportedAlgosById[alg] === 'ECDSA-P256-SHA256') {
		var d = Buffer.from(elements[0].split(' ')[1], 'base64');
		var curve = 'nistp384';
		var size = 384;
		if (supportedAlgosById[alg] === 'ECDSA-P256-SHA256') {
			curve = 'nistp256';
			size = 256;
		}
		// DNSSEC generates the public-key on the fly (go calculate it)
		var publicKey = utils.publicFromPrivateECDSA(curve, d);
		var Q = publicKey.part['Q'].data;
		var ecdsaKey = {
			type: 'ecdsa',
			curve: curve,
			size: size,
			parts: [
				{name: 'curve', data: Buffer.from(curve) },
				{name: 'd', data: d },
				{name: 'Q', data: Q }
			]
		};
		return (new PrivateKey(ecdsaKey));
	}
	throw (new Error('Unsupported algorithm: ' + supportedAlgosById[alg]));
}

function dnssecTimestamp(date) {
	var year = date.getFullYear() + ''; //stringify
	var month = (date.getMonth() + 1);
	var timestampStr = year + month + date.getUTCDate();
	timestampStr += '' + date.getUTCHours() + date.getUTCMinutes();
	timestampStr += date.getUTCSeconds();
	return (timestampStr);
}

function rsaAlgFromOptions(opts) {
	if (!opts || !opts.hashAlgo || opts.hashAlgo === 'sha1')
		return ('5 (RSASHA1)');
	else if (opts.hashAlgo === 'sha256')
		return ('8 (RSASHA256)');
	else if (opts.hashAlgo === 'sha512')
		return ('10 (RSASHA512)');
	else
		throw (new Error('Unknown or unsupported hash: ' +
		    opts.hashAlgo));
}

function writeRSA(key, options) {
	// if we're missing parts, add them.
	if (!key.part.dmodp || !key.part.dmodq) {
		utils.addRSAMissing(key);
	}

	var out = '';
	out += 'Private-key-format: v1.3\n';
	out += 'Algorithm: ' + rsaAlgFromOptions(options) + '\n';
	var n = utils.mpDenormalize(key.part['n'].data);
	out += 'Modulus: ' + n.toString('base64') + '\n';
	var e = utils.mpDenormalize(key.part['e'].data);
	out += 'PublicExponent: ' + e.toString('base64') + '\n';
	var d = utils.mpDenormalize(key.part['d'].data);
	out += 'PrivateExponent: ' + d.toString('base64') + '\n';
	var p = utils.mpDenormalize(key.part['p'].data);
	out += 'Prime1: ' + p.toString('base64') + '\n';
	var q = utils.mpDenormalize(key.part['q'].data);
	out += 'Prime2: ' + q.toString('base64') + '\n';
	var dmodp = utils.mpDenormalize(key.part['dmodp'].data);
	out += 'Exponent1: ' + dmodp.toString('base64') + '\n';
	var dmodq = utils.mpDenormalize(key.part['dmodq'].data);
	out += 'Exponent2: ' + dmodq.toString('base64') + '\n';
	var iqmp = utils.mpDenormalize(key.part['iqmp'].data);
	out += 'Coefficient: ' + iqmp.toString('base64') + '\n';
	// Assume that we're valid as-of now
	var timestamp = new Date();
	out += 'Created: ' + dnssecTimestamp(timestamp) + '\n';
	out += 'Publish: ' + dnssecTimestamp(timestamp) + '\n';
	out += 'Activate: ' + dnssecTimestamp(timestamp) + '\n';
	return (Buffer.from(out, 'ascii'));
}

function writeECDSA(key, options) {
	var out = '';
	out += 'Private-key-format: v1.3\n';

	if (key.curve === 'nistp256') {
		out += 'Algorithm: 13 (ECDSAP256SHA256)\n';
	} else if (key.curve === 'nistp384') {
		out += 'Algorithm: 14 (ECDSAP384SHA384)\n';
	} else {
		throw (new Error('Unsupported curve'));
	}
	var base64Key = key.part['d'].data.toString('base64');
	out += 'PrivateKey: ' + base64Key + '\n';

	// Assume that we're valid as-of now
	var timestamp = new Date();
	out += 'Created: ' + dnssecTimestamp(timestamp) + '\n';
	out += 'Publish: ' + dnssecTimestamp(timestamp) + '\n';
	out += 'Activate: ' + dnssecTimestamp(timestamp) + '\n';

	return (Buffer.from(out, 'ascii'));
}

function write(key, options) {
	if (PrivateKey.isPrivateKey(key)) {
		if (key.type === 'rsa') {
			return (writeRSA(key, options));
		} else if (key.type === 'ecdsa') {
			return (writeECDSA(key, options));
		} else {
			throw (new Error('Unsupported algorithm: ' + key.type));
		}
	} else if (Key.isKey(key)) {
		/*
		 * RFC3110 requires a keyname, and a keytype, which we
		 * don't really have a mechanism for specifying such
		 * additional metadata.
		 */
		throw (new Error('Format "dnssec" only supports ' +
		    'writing private keys'));
	} else {
		throw (new Error('key is not a Key or PrivateKey'));
	}
}


/***/ }),

/***/ 4033:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2017 Joyent, Inc.

module.exports = {
	read: read,
	verify: verify,
	sign: sign,
	signAsync: signAsync,
	write: write,

	/* Internal private API */
	fromBuffer: fromBuffer,
	toBuffer: toBuffer
};

var assert = __nccwpck_require__(6631);
var SSHBuffer = __nccwpck_require__(5621);
var crypto = __nccwpck_require__(6417);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var Identity = __nccwpck_require__(508);
var rfc4253 = __nccwpck_require__(8688);
var Signature = __nccwpck_require__(1394);
var utils = __nccwpck_require__(575);
var Certificate = __nccwpck_require__(7406);

function verify(cert, key) {
	/*
	 * We always give an issuerKey, so if our verify() is being called then
	 * there was no signature. Return false.
	 */
	return (false);
}

var TYPES = {
	'user': 1,
	'host': 2
};
Object.keys(TYPES).forEach(function (k) { TYPES[TYPES[k]] = k; });

var ECDSA_ALGO = /^ecdsa-sha2-([^@-]+)-cert-v01@openssh.com$/;

function read(buf, options) {
	if (Buffer.isBuffer(buf))
		buf = buf.toString('ascii');
	var parts = buf.trim().split(/[ \t\n]+/g);
	if (parts.length < 2 || parts.length > 3)
		throw (new Error('Not a valid SSH certificate line'));

	var algo = parts[0];
	var data = parts[1];

	data = Buffer.from(data, 'base64');
	return (fromBuffer(data, algo));
}

function fromBuffer(data, algo, partial) {
	var sshbuf = new SSHBuffer({ buffer: data });
	var innerAlgo = sshbuf.readString();
	if (algo !== undefined && innerAlgo !== algo)
		throw (new Error('SSH certificate algorithm mismatch'));
	if (algo === undefined)
		algo = innerAlgo;

	var cert = {};
	cert.signatures = {};
	cert.signatures.openssh = {};

	cert.signatures.openssh.nonce = sshbuf.readBuffer();

	var key = {};
	var parts = (key.parts = []);
	key.type = getAlg(algo);

	var partCount = algs.info[key.type].parts.length;
	while (parts.length < partCount)
		parts.push(sshbuf.readPart());
	assert.ok(parts.length >= 1, 'key must have at least one part');

	var algInfo = algs.info[key.type];
	if (key.type === 'ecdsa') {
		var res = ECDSA_ALGO.exec(algo);
		assert.ok(res !== null);
		assert.strictEqual(res[1], parts[0].data.toString());
	}

	for (var i = 0; i < algInfo.parts.length; ++i) {
		parts[i].name = algInfo.parts[i];
		if (parts[i].name !== 'curve' &&
		    algInfo.normalize !== false) {
			var p = parts[i];
			p.data = utils.mpNormalize(p.data);
		}
	}

	cert.subjectKey = new Key(key);

	cert.serial = sshbuf.readInt64();

	var type = TYPES[sshbuf.readInt()];
	assert.string(type, 'valid cert type');

	cert.signatures.openssh.keyId = sshbuf.readString();

	var principals = [];
	var pbuf = sshbuf.readBuffer();
	var psshbuf = new SSHBuffer({ buffer: pbuf });
	while (!psshbuf.atEnd())
		principals.push(psshbuf.readString());
	if (principals.length === 0)
		principals = ['*'];

	cert.subjects = principals.map(function (pr) {
		if (type === 'user')
			return (Identity.forUser(pr));
		else if (type === 'host')
			return (Identity.forHost(pr));
		throw (new Error('Unknown identity type ' + type));
	});

	cert.validFrom = int64ToDate(sshbuf.readInt64());
	cert.validUntil = int64ToDate(sshbuf.readInt64());

	var exts = [];
	var extbuf = new SSHBuffer({ buffer: sshbuf.readBuffer() });
	var ext;
	while (!extbuf.atEnd()) {
		ext = { critical: true };
		ext.name = extbuf.readString();
		ext.data = extbuf.readBuffer();
		exts.push(ext);
	}
	extbuf = new SSHBuffer({ buffer: sshbuf.readBuffer() });
	while (!extbuf.atEnd()) {
		ext = { critical: false };
		ext.name = extbuf.readString();
		ext.data = extbuf.readBuffer();
		exts.push(ext);
	}
	cert.signatures.openssh.exts = exts;

	/* reserved */
	sshbuf.readBuffer();

	var signingKeyBuf = sshbuf.readBuffer();
	cert.issuerKey = rfc4253.read(signingKeyBuf);

	/*
	 * OpenSSH certs don't give the identity of the issuer, just their
	 * public key. So, we use an Identity that matches anything. The
	 * isSignedBy() function will later tell you if the key matches.
	 */
	cert.issuer = Identity.forHost('**');

	var sigBuf = sshbuf.readBuffer();
	cert.signatures.openssh.signature =
	    Signature.parse(sigBuf, cert.issuerKey.type, 'ssh');

	if (partial !== undefined) {
		partial.remainder = sshbuf.remainder();
		partial.consumed = sshbuf._offset;
	}

	return (new Certificate(cert));
}

function int64ToDate(buf) {
	var i = buf.readUInt32BE(0) * 4294967296;
	i += buf.readUInt32BE(4);
	var d = new Date();
	d.setTime(i * 1000);
	d.sourceInt64 = buf;
	return (d);
}

function dateToInt64(date) {
	if (date.sourceInt64 !== undefined)
		return (date.sourceInt64);
	var i = Math.round(date.getTime() / 1000);
	var upper = Math.floor(i / 4294967296);
	var lower = Math.floor(i % 4294967296);
	var buf = Buffer.alloc(8);
	buf.writeUInt32BE(upper, 0);
	buf.writeUInt32BE(lower, 4);
	return (buf);
}

function sign(cert, key) {
	if (cert.signatures.openssh === undefined)
		cert.signatures.openssh = {};
	try {
		var blob = toBuffer(cert, true);
	} catch (e) {
		delete (cert.signatures.openssh);
		return (false);
	}
	var sig = cert.signatures.openssh;
	var hashAlgo = undefined;
	if (key.type === 'rsa' || key.type === 'dsa')
		hashAlgo = 'sha1';
	var signer = key.createSign(hashAlgo);
	signer.write(blob);
	sig.signature = signer.sign();
	return (true);
}

function signAsync(cert, signer, done) {
	if (cert.signatures.openssh === undefined)
		cert.signatures.openssh = {};
	try {
		var blob = toBuffer(cert, true);
	} catch (e) {
		delete (cert.signatures.openssh);
		done(e);
		return;
	}
	var sig = cert.signatures.openssh;

	signer(blob, function (err, signature) {
		if (err) {
			done(err);
			return;
		}
		try {
			/*
			 * This will throw if the signature isn't of a
			 * type/algo that can be used for SSH.
			 */
			signature.toBuffer('ssh');
		} catch (e) {
			done(e);
			return;
		}
		sig.signature = signature;
		done();
	});
}

function write(cert, options) {
	if (options === undefined)
		options = {};

	var blob = toBuffer(cert);
	var out = getCertType(cert.subjectKey) + ' ' + blob.toString('base64');
	if (options.comment)
		out = out + ' ' + options.comment;
	return (out);
}


function toBuffer(cert, noSig) {
	assert.object(cert.signatures.openssh, 'signature for openssh format');
	var sig = cert.signatures.openssh;

	if (sig.nonce === undefined)
		sig.nonce = crypto.randomBytes(16);
	var buf = new SSHBuffer({});
	buf.writeString(getCertType(cert.subjectKey));
	buf.writeBuffer(sig.nonce);

	var key = cert.subjectKey;
	var algInfo = algs.info[key.type];
	algInfo.parts.forEach(function (part) {
		buf.writePart(key.part[part]);
	});

	buf.writeInt64(cert.serial);

	var type = cert.subjects[0].type;
	assert.notStrictEqual(type, 'unknown');
	cert.subjects.forEach(function (id) {
		assert.strictEqual(id.type, type);
	});
	type = TYPES[type];
	buf.writeInt(type);

	if (sig.keyId === undefined) {
		sig.keyId = cert.subjects[0].type + '_' +
		    (cert.subjects[0].uid || cert.subjects[0].hostname);
	}
	buf.writeString(sig.keyId);

	var sub = new SSHBuffer({});
	cert.subjects.forEach(function (id) {
		if (type === TYPES.host)
			sub.writeString(id.hostname);
		else if (type === TYPES.user)
			sub.writeString(id.uid);
	});
	buf.writeBuffer(sub.toBuffer());

	buf.writeInt64(dateToInt64(cert.validFrom));
	buf.writeInt64(dateToInt64(cert.validUntil));

	var exts = sig.exts;
	if (exts === undefined)
		exts = [];

	var extbuf = new SSHBuffer({});
	exts.forEach(function (ext) {
		if (ext.critical !== true)
			return;
		extbuf.writeString(ext.name);
		extbuf.writeBuffer(ext.data);
	});
	buf.writeBuffer(extbuf.toBuffer());

	extbuf = new SSHBuffer({});
	exts.forEach(function (ext) {
		if (ext.critical === true)
			return;
		extbuf.writeString(ext.name);
		extbuf.writeBuffer(ext.data);
	});
	buf.writeBuffer(extbuf.toBuffer());

	/* reserved */
	buf.writeBuffer(Buffer.alloc(0));

	sub = rfc4253.write(cert.issuerKey);
	buf.writeBuffer(sub);

	if (!noSig)
		buf.writeBuffer(sig.signature.toBuffer('ssh'));

	return (buf.toBuffer());
}

function getAlg(certType) {
	if (certType === 'ssh-rsa-cert-v01@openssh.com')
		return ('rsa');
	if (certType === 'ssh-dss-cert-v01@openssh.com')
		return ('dsa');
	if (certType.match(ECDSA_ALGO))
		return ('ecdsa');
	if (certType === 'ssh-ed25519-cert-v01@openssh.com')
		return ('ed25519');
	throw (new Error('Unsupported cert type ' + certType));
}

function getCertType(key) {
	if (key.type === 'rsa')
		return ('ssh-rsa-cert-v01@openssh.com');
	if (key.type === 'dsa')
		return ('ssh-dss-cert-v01@openssh.com');
	if (key.type === 'ecdsa')
		return ('ecdsa-sha2-' + key.curve + '-cert-v01@openssh.com');
	if (key.type === 'ed25519')
		return ('ssh-ed25519-cert-v01@openssh.com');
	throw (new Error('Unsupported key type ' + key.type));
}


/***/ }),

/***/ 4324:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2018 Joyent, Inc.

module.exports = {
	read: read,
	write: write
};

var assert = __nccwpck_require__(6631);
var asn1 = __nccwpck_require__(970);
var crypto = __nccwpck_require__(6417);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var utils = __nccwpck_require__(575);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);

var pkcs1 = __nccwpck_require__(9367);
var pkcs8 = __nccwpck_require__(4173);
var sshpriv = __nccwpck_require__(3923);
var rfc4253 = __nccwpck_require__(8688);

var errors = __nccwpck_require__(7979);

var OID_PBES2 = '1.2.840.113549.1.5.13';
var OID_PBKDF2 = '1.2.840.113549.1.5.12';

var OID_TO_CIPHER = {
	'1.2.840.113549.3.7': '3des-cbc',
	'2.16.840.1.101.3.4.1.2': 'aes128-cbc',
	'2.16.840.1.101.3.4.1.42': 'aes256-cbc'
};
var CIPHER_TO_OID = {};
Object.keys(OID_TO_CIPHER).forEach(function (k) {
	CIPHER_TO_OID[OID_TO_CIPHER[k]] = k;
});

var OID_TO_HASH = {
	'1.2.840.113549.2.7': 'sha1',
	'1.2.840.113549.2.9': 'sha256',
	'1.2.840.113549.2.11': 'sha512'
};
var HASH_TO_OID = {};
Object.keys(OID_TO_HASH).forEach(function (k) {
	HASH_TO_OID[OID_TO_HASH[k]] = k;
});

/*
 * For reading we support both PKCS#1 and PKCS#8. If we find a private key,
 * we just take the public component of it and use that.
 */
function read(buf, options, forceType) {
	var input = buf;
	if (typeof (buf) !== 'string') {
		assert.buffer(buf, 'buf');
		buf = buf.toString('ascii');
	}

	var lines = buf.trim().split(/[\r\n]+/g);

	var m;
	var si = -1;
	while (!m && si < lines.length) {
		m = lines[++si].match(/*JSSTYLED*/
		    /[-]+[ ]*BEGIN ([A-Z0-9][A-Za-z0-9]+ )?(PUBLIC|PRIVATE) KEY[ ]*[-]+/);
	}
	assert.ok(m, 'invalid PEM header');

	var m2;
	var ei = lines.length;
	while (!m2 && ei > 0) {
		m2 = lines[--ei].match(/*JSSTYLED*/
		    /[-]+[ ]*END ([A-Z0-9][A-Za-z0-9]+ )?(PUBLIC|PRIVATE) KEY[ ]*[-]+/);
	}
	assert.ok(m2, 'invalid PEM footer');

	/* Begin and end banners must match key type */
	assert.equal(m[2], m2[2]);
	var type = m[2].toLowerCase();

	var alg;
	if (m[1]) {
		/* They also must match algorithms, if given */
		assert.equal(m[1], m2[1], 'PEM header and footer mismatch');
		alg = m[1].trim();
	}

	lines = lines.slice(si, ei + 1);

	var headers = {};
	while (true) {
		lines = lines.slice(1);
		m = lines[0].match(/*JSSTYLED*/
		    /^([A-Za-z0-9-]+): (.+)$/);
		if (!m)
			break;
		headers[m[1].toLowerCase()] = m[2];
	}

	/* Chop off the first and last lines */
	lines = lines.slice(0, -1).join('');
	buf = Buffer.from(lines, 'base64');

	var cipher, key, iv;
	if (headers['proc-type']) {
		var parts = headers['proc-type'].split(',');
		if (parts[0] === '4' && parts[1] === 'ENCRYPTED') {
			if (typeof (options.passphrase) === 'string') {
				options.passphrase = Buffer.from(
				    options.passphrase, 'utf-8');
			}
			if (!Buffer.isBuffer(options.passphrase)) {
				throw (new errors.KeyEncryptedError(
				    options.filename, 'PEM'));
			} else {
				parts = headers['dek-info'].split(',');
				assert.ok(parts.length === 2);
				cipher = parts[0].toLowerCase();
				iv = Buffer.from(parts[1], 'hex');
				key = utils.opensslKeyDeriv(cipher, iv,
				    options.passphrase, 1).key;
			}
		}
	}

	if (alg && alg.toLowerCase() === 'encrypted') {
		var eder = new asn1.BerReader(buf);
		var pbesEnd;
		eder.readSequence();

		eder.readSequence();
		pbesEnd = eder.offset + eder.length;

		var method = eder.readOID();
		if (method !== OID_PBES2) {
			throw (new Error('Unsupported PEM/PKCS8 encryption ' +
			    'scheme: ' + method));
		}

		eder.readSequence();	/* PBES2-params */

		eder.readSequence();	/* keyDerivationFunc */
		var kdfEnd = eder.offset + eder.length;
		var kdfOid = eder.readOID();
		if (kdfOid !== OID_PBKDF2)
			throw (new Error('Unsupported PBES2 KDF: ' + kdfOid));
		eder.readSequence();
		var salt = eder.readString(asn1.Ber.OctetString, true);
		var iterations = eder.readInt();
		var hashAlg = 'sha1';
		if (eder.offset < kdfEnd) {
			eder.readSequence();
			var hashAlgOid = eder.readOID();
			hashAlg = OID_TO_HASH[hashAlgOid];
			if (hashAlg === undefined) {
				throw (new Error('Unsupported PBKDF2 hash: ' +
				    hashAlgOid));
			}
		}
		eder._offset = kdfEnd;

		eder.readSequence();	/* encryptionScheme */
		var cipherOid = eder.readOID();
		cipher = OID_TO_CIPHER[cipherOid];
		if (cipher === undefined) {
			throw (new Error('Unsupported PBES2 cipher: ' +
			    cipherOid));
		}
		iv = eder.readString(asn1.Ber.OctetString, true);

		eder._offset = pbesEnd;
		buf = eder.readString(asn1.Ber.OctetString, true);

		if (typeof (options.passphrase) === 'string') {
			options.passphrase = Buffer.from(
			    options.passphrase, 'utf-8');
		}
		if (!Buffer.isBuffer(options.passphrase)) {
			throw (new errors.KeyEncryptedError(
			    options.filename, 'PEM'));
		}

		var cinfo = utils.opensshCipherInfo(cipher);

		cipher = cinfo.opensslName;
		key = utils.pbkdf2(hashAlg, salt, iterations, cinfo.keySize,
		    options.passphrase);
		alg = undefined;
	}

	if (cipher && key && iv) {
		var cipherStream = crypto.createDecipheriv(cipher, key, iv);
		var chunk, chunks = [];
		cipherStream.once('error', function (e) {
			if (e.toString().indexOf('bad decrypt') !== -1) {
				throw (new Error('Incorrect passphrase ' +
				    'supplied, could not decrypt key'));
			}
			throw (e);
		});
		cipherStream.write(buf);
		cipherStream.end();
		while ((chunk = cipherStream.read()) !== null)
			chunks.push(chunk);
		buf = Buffer.concat(chunks);
	}

	/* The new OpenSSH internal format abuses PEM headers */
	if (alg && alg.toLowerCase() === 'openssh')
		return (sshpriv.readSSHPrivate(type, buf, options));
	if (alg && alg.toLowerCase() === 'ssh2')
		return (rfc4253.readType(type, buf, options));

	var der = new asn1.BerReader(buf);
	der.originalInput = input;

	/*
	 * All of the PEM file types start with a sequence tag, so chop it
	 * off here
	 */
	der.readSequence();

	/* PKCS#1 type keys name an algorithm in the banner explicitly */
	if (alg) {
		if (forceType)
			assert.strictEqual(forceType, 'pkcs1');
		return (pkcs1.readPkcs1(alg, type, der));
	} else {
		if (forceType)
			assert.strictEqual(forceType, 'pkcs8');
		return (pkcs8.readPkcs8(alg, type, der));
	}
}

function write(key, options, type) {
	assert.object(key);

	var alg = {
	    'ecdsa': 'EC',
	    'rsa': 'RSA',
	    'dsa': 'DSA',
	    'ed25519': 'EdDSA'
	}[key.type];
	var header;

	var der = new asn1.BerWriter();

	if (PrivateKey.isPrivateKey(key)) {
		if (type && type === 'pkcs8') {
			header = 'PRIVATE KEY';
			pkcs8.writePkcs8(der, key);
		} else {
			if (type)
				assert.strictEqual(type, 'pkcs1');
			header = alg + ' PRIVATE KEY';
			pkcs1.writePkcs1(der, key);
		}

	} else if (Key.isKey(key)) {
		if (type && type === 'pkcs1') {
			header = alg + ' PUBLIC KEY';
			pkcs1.writePkcs1(der, key);
		} else {
			if (type)
				assert.strictEqual(type, 'pkcs8');
			header = 'PUBLIC KEY';
			pkcs8.writePkcs8(der, key);
		}

	} else {
		throw (new Error('key is not a Key or PrivateKey'));
	}

	var tmp = der.buffer.toString('base64');
	var len = tmp.length + (tmp.length / 64) +
	    18 + 16 + header.length*2 + 10;
	var buf = Buffer.alloc(len);
	var o = 0;
	o += buf.write('-----BEGIN ' + header + '-----\n', o);
	for (var i = 0; i < tmp.length; ) {
		var limit = i + 64;
		if (limit > tmp.length)
			limit = tmp.length;
		o += buf.write(tmp.slice(i, limit), o);
		buf[o++] = 10;
		i = limit;
	}
	o += buf.write('-----END ' + header + '-----\n', o);

	return (buf.slice(0, o));
}


/***/ }),

/***/ 9367:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

module.exports = {
	read: read,
	readPkcs1: readPkcs1,
	write: write,
	writePkcs1: writePkcs1
};

var assert = __nccwpck_require__(6631);
var asn1 = __nccwpck_require__(970);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var utils = __nccwpck_require__(575);

var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var pem = __nccwpck_require__(4324);

var pkcs8 = __nccwpck_require__(4173);
var readECDSACurve = pkcs8.readECDSACurve;

function read(buf, options) {
	return (pem.read(buf, options, 'pkcs1'));
}

function write(key, options) {
	return (pem.write(key, options, 'pkcs1'));
}

/* Helper to read in a single mpint */
function readMPInt(der, nm) {
	assert.strictEqual(der.peek(), asn1.Ber.Integer,
	    nm + ' is not an Integer');
	return (utils.mpNormalize(der.readString(asn1.Ber.Integer, true)));
}

function readPkcs1(alg, type, der) {
	switch (alg) {
	case 'RSA':
		if (type === 'public')
			return (readPkcs1RSAPublic(der));
		else if (type === 'private')
			return (readPkcs1RSAPrivate(der));
		throw (new Error('Unknown key type: ' + type));
	case 'DSA':
		if (type === 'public')
			return (readPkcs1DSAPublic(der));
		else if (type === 'private')
			return (readPkcs1DSAPrivate(der));
		throw (new Error('Unknown key type: ' + type));
	case 'EC':
	case 'ECDSA':
		if (type === 'private')
			return (readPkcs1ECDSAPrivate(der));
		else if (type === 'public')
			return (readPkcs1ECDSAPublic(der));
		throw (new Error('Unknown key type: ' + type));
	case 'EDDSA':
	case 'EdDSA':
		if (type === 'private')
			return (readPkcs1EdDSAPrivate(der));
		throw (new Error(type + ' keys not supported with EdDSA'));
	default:
		throw (new Error('Unknown key algo: ' + alg));
	}
}

function readPkcs1RSAPublic(der) {
	// modulus and exponent
	var n = readMPInt(der, 'modulus');
	var e = readMPInt(der, 'exponent');

	// now, make the key
	var key = {
		type: 'rsa',
		parts: [
			{ name: 'e', data: e },
			{ name: 'n', data: n }
		]
	};

	return (new Key(key));
}

function readPkcs1RSAPrivate(der) {
	var version = readMPInt(der, 'version');
	assert.strictEqual(version[0], 0);

	// modulus then public exponent
	var n = readMPInt(der, 'modulus');
	var e = readMPInt(der, 'public exponent');
	var d = readMPInt(der, 'private exponent');
	var p = readMPInt(der, 'prime1');
	var q = readMPInt(der, 'prime2');
	var dmodp = readMPInt(der, 'exponent1');
	var dmodq = readMPInt(der, 'exponent2');
	var iqmp = readMPInt(der, 'iqmp');

	// now, make the key
	var key = {
		type: 'rsa',
		parts: [
			{ name: 'n', data: n },
			{ name: 'e', data: e },
			{ name: 'd', data: d },
			{ name: 'iqmp', data: iqmp },
			{ name: 'p', data: p },
			{ name: 'q', data: q },
			{ name: 'dmodp', data: dmodp },
			{ name: 'dmodq', data: dmodq }
		]
	};

	return (new PrivateKey(key));
}

function readPkcs1DSAPrivate(der) {
	var version = readMPInt(der, 'version');
	assert.strictEqual(version.readUInt8(0), 0);

	var p = readMPInt(der, 'p');
	var q = readMPInt(der, 'q');
	var g = readMPInt(der, 'g');
	var y = readMPInt(der, 'y');
	var x = readMPInt(der, 'x');

	// now, make the key
	var key = {
		type: 'dsa',
		parts: [
			{ name: 'p', data: p },
			{ name: 'q', data: q },
			{ name: 'g', data: g },
			{ name: 'y', data: y },
			{ name: 'x', data: x }
		]
	};

	return (new PrivateKey(key));
}

function readPkcs1EdDSAPrivate(der) {
	var version = readMPInt(der, 'version');
	assert.strictEqual(version.readUInt8(0), 1);

	// private key
	var k = der.readString(asn1.Ber.OctetString, true);

	der.readSequence(0xa0);
	var oid = der.readOID();
	assert.strictEqual(oid, '1.3.101.112', 'the ed25519 curve identifier');

	der.readSequence(0xa1);
	var A = utils.readBitString(der);

	var key = {
		type: 'ed25519',
		parts: [
			{ name: 'A', data: utils.zeroPadToLength(A, 32) },
			{ name: 'k', data: k }
		]
	};

	return (new PrivateKey(key));
}

function readPkcs1DSAPublic(der) {
	var y = readMPInt(der, 'y');
	var p = readMPInt(der, 'p');
	var q = readMPInt(der, 'q');
	var g = readMPInt(der, 'g');

	var key = {
		type: 'dsa',
		parts: [
			{ name: 'y', data: y },
			{ name: 'p', data: p },
			{ name: 'q', data: q },
			{ name: 'g', data: g }
		]
	};

	return (new Key(key));
}

function readPkcs1ECDSAPublic(der) {
	der.readSequence();

	var oid = der.readOID();
	assert.strictEqual(oid, '1.2.840.10045.2.1', 'must be ecPublicKey');

	var curveOid = der.readOID();

	var curve;
	var curves = Object.keys(algs.curves);
	for (var j = 0; j < curves.length; ++j) {
		var c = curves[j];
		var cd = algs.curves[c];
		if (cd.pkcs8oid === curveOid) {
			curve = c;
			break;
		}
	}
	assert.string(curve, 'a known ECDSA named curve');

	var Q = der.readString(asn1.Ber.BitString, true);
	Q = utils.ecNormalize(Q);

	var key = {
		type: 'ecdsa',
		parts: [
			{ name: 'curve', data: Buffer.from(curve) },
			{ name: 'Q', data: Q }
		]
	};

	return (new Key(key));
}

function readPkcs1ECDSAPrivate(der) {
	var version = readMPInt(der, 'version');
	assert.strictEqual(version.readUInt8(0), 1);

	// private key
	var d = der.readString(asn1.Ber.OctetString, true);

	der.readSequence(0xa0);
	var curve = readECDSACurve(der);
	assert.string(curve, 'a known elliptic curve');

	der.readSequence(0xa1);
	var Q = der.readString(asn1.Ber.BitString, true);
	Q = utils.ecNormalize(Q);

	var key = {
		type: 'ecdsa',
		parts: [
			{ name: 'curve', data: Buffer.from(curve) },
			{ name: 'Q', data: Q },
			{ name: 'd', data: d }
		]
	};

	return (new PrivateKey(key));
}

function writePkcs1(der, key) {
	der.startSequence();

	switch (key.type) {
	case 'rsa':
		if (PrivateKey.isPrivateKey(key))
			writePkcs1RSAPrivate(der, key);
		else
			writePkcs1RSAPublic(der, key);
		break;
	case 'dsa':
		if (PrivateKey.isPrivateKey(key))
			writePkcs1DSAPrivate(der, key);
		else
			writePkcs1DSAPublic(der, key);
		break;
	case 'ecdsa':
		if (PrivateKey.isPrivateKey(key))
			writePkcs1ECDSAPrivate(der, key);
		else
			writePkcs1ECDSAPublic(der, key);
		break;
	case 'ed25519':
		if (PrivateKey.isPrivateKey(key))
			writePkcs1EdDSAPrivate(der, key);
		else
			writePkcs1EdDSAPublic(der, key);
		break;
	default:
		throw (new Error('Unknown key algo: ' + key.type));
	}

	der.endSequence();
}

function writePkcs1RSAPublic(der, key) {
	der.writeBuffer(key.part.n.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.e.data, asn1.Ber.Integer);
}

function writePkcs1RSAPrivate(der, key) {
	var ver = Buffer.from([0]);
	der.writeBuffer(ver, asn1.Ber.Integer);

	der.writeBuffer(key.part.n.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.e.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.d.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.p.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.q.data, asn1.Ber.Integer);
	if (!key.part.dmodp || !key.part.dmodq)
		utils.addRSAMissing(key);
	der.writeBuffer(key.part.dmodp.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.dmodq.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.iqmp.data, asn1.Ber.Integer);
}

function writePkcs1DSAPrivate(der, key) {
	var ver = Buffer.from([0]);
	der.writeBuffer(ver, asn1.Ber.Integer);

	der.writeBuffer(key.part.p.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.q.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.g.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.y.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.x.data, asn1.Ber.Integer);
}

function writePkcs1DSAPublic(der, key) {
	der.writeBuffer(key.part.y.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.p.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.q.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.g.data, asn1.Ber.Integer);
}

function writePkcs1ECDSAPublic(der, key) {
	der.startSequence();

	der.writeOID('1.2.840.10045.2.1'); /* ecPublicKey */
	var curve = key.part.curve.data.toString();
	var curveOid = algs.curves[curve].pkcs8oid;
	assert.string(curveOid, 'a known ECDSA named curve');
	der.writeOID(curveOid);

	der.endSequence();

	var Q = utils.ecNormalize(key.part.Q.data, true);
	der.writeBuffer(Q, asn1.Ber.BitString);
}

function writePkcs1ECDSAPrivate(der, key) {
	var ver = Buffer.from([1]);
	der.writeBuffer(ver, asn1.Ber.Integer);

	der.writeBuffer(key.part.d.data, asn1.Ber.OctetString);

	der.startSequence(0xa0);
	var curve = key.part.curve.data.toString();
	var curveOid = algs.curves[curve].pkcs8oid;
	assert.string(curveOid, 'a known ECDSA named curve');
	der.writeOID(curveOid);
	der.endSequence();

	der.startSequence(0xa1);
	var Q = utils.ecNormalize(key.part.Q.data, true);
	der.writeBuffer(Q, asn1.Ber.BitString);
	der.endSequence();
}

function writePkcs1EdDSAPrivate(der, key) {
	var ver = Buffer.from([1]);
	der.writeBuffer(ver, asn1.Ber.Integer);

	der.writeBuffer(key.part.k.data, asn1.Ber.OctetString);

	der.startSequence(0xa0);
	der.writeOID('1.3.101.112');
	der.endSequence();

	der.startSequence(0xa1);
	utils.writeBitString(der, key.part.A.data);
	der.endSequence();
}

function writePkcs1EdDSAPublic(der, key) {
	throw (new Error('Public keys are not supported for EdDSA PKCS#1'));
}


/***/ }),

/***/ 4173:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2018 Joyent, Inc.

module.exports = {
	read: read,
	readPkcs8: readPkcs8,
	write: write,
	writePkcs8: writePkcs8,
	pkcs8ToBuffer: pkcs8ToBuffer,

	readECDSACurve: readECDSACurve,
	writeECDSACurve: writeECDSACurve
};

var assert = __nccwpck_require__(6631);
var asn1 = __nccwpck_require__(970);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var utils = __nccwpck_require__(575);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var pem = __nccwpck_require__(4324);

function read(buf, options) {
	return (pem.read(buf, options, 'pkcs8'));
}

function write(key, options) {
	return (pem.write(key, options, 'pkcs8'));
}

/* Helper to read in a single mpint */
function readMPInt(der, nm) {
	assert.strictEqual(der.peek(), asn1.Ber.Integer,
	    nm + ' is not an Integer');
	return (utils.mpNormalize(der.readString(asn1.Ber.Integer, true)));
}

function readPkcs8(alg, type, der) {
	/* Private keys in pkcs#8 format have a weird extra int */
	if (der.peek() === asn1.Ber.Integer) {
		assert.strictEqual(type, 'private',
		    'unexpected Integer at start of public key');
		der.readString(asn1.Ber.Integer, true);
	}

	der.readSequence();
	var next = der.offset + der.length;

	var oid = der.readOID();
	switch (oid) {
	case '1.2.840.113549.1.1.1':
		der._offset = next;
		if (type === 'public')
			return (readPkcs8RSAPublic(der));
		else
			return (readPkcs8RSAPrivate(der));
	case '1.2.840.10040.4.1':
		if (type === 'public')
			return (readPkcs8DSAPublic(der));
		else
			return (readPkcs8DSAPrivate(der));
	case '1.2.840.10045.2.1':
		if (type === 'public')
			return (readPkcs8ECDSAPublic(der));
		else
			return (readPkcs8ECDSAPrivate(der));
	case '1.3.101.112':
		if (type === 'public') {
			return (readPkcs8EdDSAPublic(der));
		} else {
			return (readPkcs8EdDSAPrivate(der));
		}
	case '1.3.101.110':
		if (type === 'public') {
			return (readPkcs8X25519Public(der));
		} else {
			return (readPkcs8X25519Private(der));
		}
	default:
		throw (new Error('Unknown key type OID ' + oid));
	}
}

function readPkcs8RSAPublic(der) {
	// bit string sequence
	der.readSequence(asn1.Ber.BitString);
	der.readByte();
	der.readSequence();

	// modulus
	var n = readMPInt(der, 'modulus');
	var e = readMPInt(der, 'exponent');

	// now, make the key
	var key = {
		type: 'rsa',
		source: der.originalInput,
		parts: [
			{ name: 'e', data: e },
			{ name: 'n', data: n }
		]
	};

	return (new Key(key));
}

function readPkcs8RSAPrivate(der) {
	der.readSequence(asn1.Ber.OctetString);
	der.readSequence();

	var ver = readMPInt(der, 'version');
	assert.equal(ver[0], 0x0, 'unknown RSA private key version');

	// modulus then public exponent
	var n = readMPInt(der, 'modulus');
	var e = readMPInt(der, 'public exponent');
	var d = readMPInt(der, 'private exponent');
	var p = readMPInt(der, 'prime1');
	var q = readMPInt(der, 'prime2');
	var dmodp = readMPInt(der, 'exponent1');
	var dmodq = readMPInt(der, 'exponent2');
	var iqmp = readMPInt(der, 'iqmp');

	// now, make the key
	var key = {
		type: 'rsa',
		parts: [
			{ name: 'n', data: n },
			{ name: 'e', data: e },
			{ name: 'd', data: d },
			{ name: 'iqmp', data: iqmp },
			{ name: 'p', data: p },
			{ name: 'q', data: q },
			{ name: 'dmodp', data: dmodp },
			{ name: 'dmodq', data: dmodq }
		]
	};

	return (new PrivateKey(key));
}

function readPkcs8DSAPublic(der) {
	der.readSequence();

	var p = readMPInt(der, 'p');
	var q = readMPInt(der, 'q');
	var g = readMPInt(der, 'g');

	// bit string sequence
	der.readSequence(asn1.Ber.BitString);
	der.readByte();

	var y = readMPInt(der, 'y');

	// now, make the key
	var key = {
		type: 'dsa',
		parts: [
			{ name: 'p', data: p },
			{ name: 'q', data: q },
			{ name: 'g', data: g },
			{ name: 'y', data: y }
		]
	};

	return (new Key(key));
}

function readPkcs8DSAPrivate(der) {
	der.readSequence();

	var p = readMPInt(der, 'p');
	var q = readMPInt(der, 'q');
	var g = readMPInt(der, 'g');

	der.readSequence(asn1.Ber.OctetString);
	var x = readMPInt(der, 'x');

	/* The pkcs#8 format does not include the public key */
	var y = utils.calculateDSAPublic(g, p, x);

	var key = {
		type: 'dsa',
		parts: [
			{ name: 'p', data: p },
			{ name: 'q', data: q },
			{ name: 'g', data: g },
			{ name: 'y', data: y },
			{ name: 'x', data: x }
		]
	};

	return (new PrivateKey(key));
}

function readECDSACurve(der) {
	var curveName, curveNames;
	var j, c, cd;

	if (der.peek() === asn1.Ber.OID) {
		var oid = der.readOID();

		curveNames = Object.keys(algs.curves);
		for (j = 0; j < curveNames.length; ++j) {
			c = curveNames[j];
			cd = algs.curves[c];
			if (cd.pkcs8oid === oid) {
				curveName = c;
				break;
			}
		}

	} else {
		// ECParameters sequence
		der.readSequence();
		var version = der.readString(asn1.Ber.Integer, true);
		assert.strictEqual(version[0], 1, 'ECDSA key not version 1');

		var curve = {};

		// FieldID sequence
		der.readSequence();
		var fieldTypeOid = der.readOID();
		assert.strictEqual(fieldTypeOid, '1.2.840.10045.1.1',
		    'ECDSA key is not from a prime-field');
		var p = curve.p = utils.mpNormalize(
		    der.readString(asn1.Ber.Integer, true));
		/*
		 * p always starts with a 1 bit, so count the zeros to get its
		 * real size.
		 */
		curve.size = p.length * 8 - utils.countZeros(p);

		// Curve sequence
		der.readSequence();
		curve.a = utils.mpNormalize(
		    der.readString(asn1.Ber.OctetString, true));
		curve.b = utils.mpNormalize(
		    der.readString(asn1.Ber.OctetString, true));
		if (der.peek() === asn1.Ber.BitString)
			curve.s = der.readString(asn1.Ber.BitString, true);

		// Combined Gx and Gy
		curve.G = der.readString(asn1.Ber.OctetString, true);
		assert.strictEqual(curve.G[0], 0x4,
		    'uncompressed G is required');

		curve.n = utils.mpNormalize(
		    der.readString(asn1.Ber.Integer, true));
		curve.h = utils.mpNormalize(
		    der.readString(asn1.Ber.Integer, true));
		assert.strictEqual(curve.h[0], 0x1, 'a cofactor=1 curve is ' +
		    'required');

		curveNames = Object.keys(algs.curves);
		var ks = Object.keys(curve);
		for (j = 0; j < curveNames.length; ++j) {
			c = curveNames[j];
			cd = algs.curves[c];
			var equal = true;
			for (var i = 0; i < ks.length; ++i) {
				var k = ks[i];
				if (cd[k] === undefined)
					continue;
				if (typeof (cd[k]) === 'object' &&
				    cd[k].equals !== undefined) {
					if (!cd[k].equals(curve[k])) {
						equal = false;
						break;
					}
				} else if (Buffer.isBuffer(cd[k])) {
					if (cd[k].toString('binary')
					    !== curve[k].toString('binary')) {
						equal = false;
						break;
					}
				} else {
					if (cd[k] !== curve[k]) {
						equal = false;
						break;
					}
				}
			}
			if (equal) {
				curveName = c;
				break;
			}
		}
	}
	return (curveName);
}

function readPkcs8ECDSAPrivate(der) {
	var curveName = readECDSACurve(der);
	assert.string(curveName, 'a known elliptic curve');

	der.readSequence(asn1.Ber.OctetString);
	der.readSequence();

	var version = readMPInt(der, 'version');
	assert.equal(version[0], 1, 'unknown version of ECDSA key');

	var d = der.readString(asn1.Ber.OctetString, true);
	var Q;

	if (der.peek() == 0xa0) {
		der.readSequence(0xa0);
		der._offset += der.length;
	}
	if (der.peek() == 0xa1) {
		der.readSequence(0xa1);
		Q = der.readString(asn1.Ber.BitString, true);
		Q = utils.ecNormalize(Q);
	}

	if (Q === undefined) {
		var pub = utils.publicFromPrivateECDSA(curveName, d);
		Q = pub.part.Q.data;
	}

	var key = {
		type: 'ecdsa',
		parts: [
			{ name: 'curve', data: Buffer.from(curveName) },
			{ name: 'Q', data: Q },
			{ name: 'd', data: d }
		]
	};

	return (new PrivateKey(key));
}

function readPkcs8ECDSAPublic(der) {
	var curveName = readECDSACurve(der);
	assert.string(curveName, 'a known elliptic curve');

	var Q = der.readString(asn1.Ber.BitString, true);
	Q = utils.ecNormalize(Q);

	var key = {
		type: 'ecdsa',
		parts: [
			{ name: 'curve', data: Buffer.from(curveName) },
			{ name: 'Q', data: Q }
		]
	};

	return (new Key(key));
}

function readPkcs8EdDSAPublic(der) {
	if (der.peek() === 0x00)
		der.readByte();

	var A = utils.readBitString(der);

	var key = {
		type: 'ed25519',
		parts: [
			{ name: 'A', data: utils.zeroPadToLength(A, 32) }
		]
	};

	return (new Key(key));
}

function readPkcs8X25519Public(der) {
	var A = utils.readBitString(der);

	var key = {
		type: 'curve25519',
		parts: [
			{ name: 'A', data: utils.zeroPadToLength(A, 32) }
		]
	};

	return (new Key(key));
}

function readPkcs8EdDSAPrivate(der) {
	if (der.peek() === 0x00)
		der.readByte();

	der.readSequence(asn1.Ber.OctetString);
	var k = der.readString(asn1.Ber.OctetString, true);
	k = utils.zeroPadToLength(k, 32);

	var A;
	if (der.peek() === asn1.Ber.BitString) {
		A = utils.readBitString(der);
		A = utils.zeroPadToLength(A, 32);
	} else {
		A = utils.calculateED25519Public(k);
	}

	var key = {
		type: 'ed25519',
		parts: [
			{ name: 'A', data: utils.zeroPadToLength(A, 32) },
			{ name: 'k', data: utils.zeroPadToLength(k, 32) }
		]
	};

	return (new PrivateKey(key));
}

function readPkcs8X25519Private(der) {
	if (der.peek() === 0x00)
		der.readByte();

	der.readSequence(asn1.Ber.OctetString);
	var k = der.readString(asn1.Ber.OctetString, true);
	k = utils.zeroPadToLength(k, 32);

	var A = utils.calculateX25519Public(k);

	var key = {
		type: 'curve25519',
		parts: [
			{ name: 'A', data: utils.zeroPadToLength(A, 32) },
			{ name: 'k', data: utils.zeroPadToLength(k, 32) }
		]
	};

	return (new PrivateKey(key));
}

function pkcs8ToBuffer(key) {
	var der = new asn1.BerWriter();
	writePkcs8(der, key);
	return (der.buffer);
}

function writePkcs8(der, key) {
	der.startSequence();

	if (PrivateKey.isPrivateKey(key)) {
		var sillyInt = Buffer.from([0]);
		der.writeBuffer(sillyInt, asn1.Ber.Integer);
	}

	der.startSequence();
	switch (key.type) {
	case 'rsa':
		der.writeOID('1.2.840.113549.1.1.1');
		if (PrivateKey.isPrivateKey(key))
			writePkcs8RSAPrivate(key, der);
		else
			writePkcs8RSAPublic(key, der);
		break;
	case 'dsa':
		der.writeOID('1.2.840.10040.4.1');
		if (PrivateKey.isPrivateKey(key))
			writePkcs8DSAPrivate(key, der);
		else
			writePkcs8DSAPublic(key, der);
		break;
	case 'ecdsa':
		der.writeOID('1.2.840.10045.2.1');
		if (PrivateKey.isPrivateKey(key))
			writePkcs8ECDSAPrivate(key, der);
		else
			writePkcs8ECDSAPublic(key, der);
		break;
	case 'ed25519':
		der.writeOID('1.3.101.112');
		if (PrivateKey.isPrivateKey(key))
			throw (new Error('Ed25519 private keys in pkcs8 ' +
			    'format are not supported'));
		writePkcs8EdDSAPublic(key, der);
		break;
	default:
		throw (new Error('Unsupported key type: ' + key.type));
	}

	der.endSequence();
}

function writePkcs8RSAPrivate(key, der) {
	der.writeNull();
	der.endSequence();

	der.startSequence(asn1.Ber.OctetString);
	der.startSequence();

	var version = Buffer.from([0]);
	der.writeBuffer(version, asn1.Ber.Integer);

	der.writeBuffer(key.part.n.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.e.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.d.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.p.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.q.data, asn1.Ber.Integer);
	if (!key.part.dmodp || !key.part.dmodq)
		utils.addRSAMissing(key);
	der.writeBuffer(key.part.dmodp.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.dmodq.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.iqmp.data, asn1.Ber.Integer);

	der.endSequence();
	der.endSequence();
}

function writePkcs8RSAPublic(key, der) {
	der.writeNull();
	der.endSequence();

	der.startSequence(asn1.Ber.BitString);
	der.writeByte(0x00);

	der.startSequence();
	der.writeBuffer(key.part.n.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.e.data, asn1.Ber.Integer);
	der.endSequence();

	der.endSequence();
}

function writePkcs8DSAPrivate(key, der) {
	der.startSequence();
	der.writeBuffer(key.part.p.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.q.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.g.data, asn1.Ber.Integer);
	der.endSequence();

	der.endSequence();

	der.startSequence(asn1.Ber.OctetString);
	der.writeBuffer(key.part.x.data, asn1.Ber.Integer);
	der.endSequence();
}

function writePkcs8DSAPublic(key, der) {
	der.startSequence();
	der.writeBuffer(key.part.p.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.q.data, asn1.Ber.Integer);
	der.writeBuffer(key.part.g.data, asn1.Ber.Integer);
	der.endSequence();
	der.endSequence();

	der.startSequence(asn1.Ber.BitString);
	der.writeByte(0x00);
	der.writeBuffer(key.part.y.data, asn1.Ber.Integer);
	der.endSequence();
}

function writeECDSACurve(key, der) {
	var curve = algs.curves[key.curve];
	if (curve.pkcs8oid) {
		/* This one has a name in pkcs#8, so just write the oid */
		der.writeOID(curve.pkcs8oid);

	} else {
		// ECParameters sequence
		der.startSequence();

		var version = Buffer.from([1]);
		der.writeBuffer(version, asn1.Ber.Integer);

		// FieldID sequence
		der.startSequence();
		der.writeOID('1.2.840.10045.1.1'); // prime-field
		der.writeBuffer(curve.p, asn1.Ber.Integer);
		der.endSequence();

		// Curve sequence
		der.startSequence();
		var a = curve.p;
		if (a[0] === 0x0)
			a = a.slice(1);
		der.writeBuffer(a, asn1.Ber.OctetString);
		der.writeBuffer(curve.b, asn1.Ber.OctetString);
		der.writeBuffer(curve.s, asn1.Ber.BitString);
		der.endSequence();

		der.writeBuffer(curve.G, asn1.Ber.OctetString);
		der.writeBuffer(curve.n, asn1.Ber.Integer);
		var h = curve.h;
		if (!h) {
			h = Buffer.from([1]);
		}
		der.writeBuffer(h, asn1.Ber.Integer);

		// ECParameters
		der.endSequence();
	}
}

function writePkcs8ECDSAPublic(key, der) {
	writeECDSACurve(key, der);
	der.endSequence();

	var Q = utils.ecNormalize(key.part.Q.data, true);
	der.writeBuffer(Q, asn1.Ber.BitString);
}

function writePkcs8ECDSAPrivate(key, der) {
	writeECDSACurve(key, der);
	der.endSequence();

	der.startSequence(asn1.Ber.OctetString);
	der.startSequence();

	var version = Buffer.from([1]);
	der.writeBuffer(version, asn1.Ber.Integer);

	der.writeBuffer(key.part.d.data, asn1.Ber.OctetString);

	der.startSequence(0xa1);
	var Q = utils.ecNormalize(key.part.Q.data, true);
	der.writeBuffer(Q, asn1.Ber.BitString);
	der.endSequence();

	der.endSequence();
	der.endSequence();
}

function writePkcs8EdDSAPublic(key, der) {
	der.endSequence();

	utils.writeBitString(der, key.part.A.data);
}

function writePkcs8EdDSAPrivate(key, der) {
	der.endSequence();

	var k = utils.mpNormalize(key.part.k.data, true);
	der.startSequence(asn1.Ber.OctetString);
	der.writeBuffer(k, asn1.Ber.OctetString);
	der.endSequence();
}


/***/ }),

/***/ 974:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2018 Joyent, Inc.

module.exports = {
	read: read,
	write: write
};

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var rfc4253 = __nccwpck_require__(8688);
var Key = __nccwpck_require__(6814);

var errors = __nccwpck_require__(7979);

function read(buf, options) {
	var lines = buf.toString('ascii').split(/[\r\n]+/);
	var found = false;
	var parts;
	var si = 0;
	while (si < lines.length) {
		parts = splitHeader(lines[si++]);
		if (parts &&
		    parts[0].toLowerCase() === 'putty-user-key-file-2') {
			found = true;
			break;
		}
	}
	if (!found) {
		throw (new Error('No PuTTY format first line found'));
	}
	var alg = parts[1];

	parts = splitHeader(lines[si++]);
	assert.equal(parts[0].toLowerCase(), 'encryption');

	parts = splitHeader(lines[si++]);
	assert.equal(parts[0].toLowerCase(), 'comment');
	var comment = parts[1];

	parts = splitHeader(lines[si++]);
	assert.equal(parts[0].toLowerCase(), 'public-lines');
	var publicLines = parseInt(parts[1], 10);
	if (!isFinite(publicLines) || publicLines < 0 ||
	    publicLines > lines.length) {
		throw (new Error('Invalid public-lines count'));
	}

	var publicBuf = Buffer.from(
	    lines.slice(si, si + publicLines).join(''), 'base64');
	var keyType = rfc4253.algToKeyType(alg);
	var key = rfc4253.read(publicBuf);
	if (key.type !== keyType) {
		throw (new Error('Outer key algorithm mismatch'));
	}
	key.comment = comment;
	return (key);
}

function splitHeader(line) {
	var idx = line.indexOf(':');
	if (idx === -1)
		return (null);
	var header = line.slice(0, idx);
	++idx;
	while (line[idx] === ' ')
		++idx;
	var rest = line.slice(idx);
	return ([header, rest]);
}

function write(key, options) {
	assert.object(key);
	if (!Key.isKey(key))
		throw (new Error('Must be a public key'));

	var alg = rfc4253.keyTypeToAlg(key);
	var buf = rfc4253.write(key);
	var comment = key.comment || '';

	var b64 = buf.toString('base64');
	var lines = wrap(b64, 64);

	lines.unshift('Public-Lines: ' + lines.length);
	lines.unshift('Comment: ' + comment);
	lines.unshift('Encryption: none');
	lines.unshift('PuTTY-User-Key-File-2: ' + alg);

	return (Buffer.from(lines.join('\n') + '\n'));
}

function wrap(txt, len) {
	var lines = [];
	var pos = 0;
	while (pos < txt.length) {
		lines.push(txt.slice(pos, pos + 64));
		pos += 64;
	}
	return (lines);
}


/***/ }),

/***/ 8688:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

module.exports = {
	read: read.bind(undefined, false, undefined),
	readType: read.bind(undefined, false),
	write: write,
	/* semi-private api, used by sshpk-agent */
	readPartial: read.bind(undefined, true),

	/* shared with ssh format */
	readInternal: read,
	keyTypeToAlg: keyTypeToAlg,
	algToKeyType: algToKeyType
};

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var utils = __nccwpck_require__(575);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var SSHBuffer = __nccwpck_require__(5621);

function algToKeyType(alg) {
	assert.string(alg);
	if (alg === 'ssh-dss')
		return ('dsa');
	else if (alg === 'ssh-rsa')
		return ('rsa');
	else if (alg === 'ssh-ed25519')
		return ('ed25519');
	else if (alg === 'ssh-curve25519')
		return ('curve25519');
	else if (alg.match(/^ecdsa-sha2-/))
		return ('ecdsa');
	else
		throw (new Error('Unknown algorithm ' + alg));
}

function keyTypeToAlg(key) {
	assert.object(key);
	if (key.type === 'dsa')
		return ('ssh-dss');
	else if (key.type === 'rsa')
		return ('ssh-rsa');
	else if (key.type === 'ed25519')
		return ('ssh-ed25519');
	else if (key.type === 'curve25519')
		return ('ssh-curve25519');
	else if (key.type === 'ecdsa')
		return ('ecdsa-sha2-' + key.part.curve.data.toString());
	else
		throw (new Error('Unknown key type ' + key.type));
}

function read(partial, type, buf, options) {
	if (typeof (buf) === 'string')
		buf = Buffer.from(buf);
	assert.buffer(buf, 'buf');

	var key = {};

	var parts = key.parts = [];
	var sshbuf = new SSHBuffer({buffer: buf});

	var alg = sshbuf.readString();
	assert.ok(!sshbuf.atEnd(), 'key must have at least one part');

	key.type = algToKeyType(alg);

	var partCount = algs.info[key.type].parts.length;
	if (type && type === 'private')
		partCount = algs.privInfo[key.type].parts.length;

	while (!sshbuf.atEnd() && parts.length < partCount)
		parts.push(sshbuf.readPart());
	while (!partial && !sshbuf.atEnd())
		parts.push(sshbuf.readPart());

	assert.ok(parts.length >= 1,
	    'key must have at least one part');
	assert.ok(partial || sshbuf.atEnd(),
	    'leftover bytes at end of key');

	var Constructor = Key;
	var algInfo = algs.info[key.type];
	if (type === 'private' || algInfo.parts.length !== parts.length) {
		algInfo = algs.privInfo[key.type];
		Constructor = PrivateKey;
	}
	assert.strictEqual(algInfo.parts.length, parts.length);

	if (key.type === 'ecdsa') {
		var res = /^ecdsa-sha2-(.+)$/.exec(alg);
		assert.ok(res !== null);
		assert.strictEqual(res[1], parts[0].data.toString());
	}

	var normalized = true;
	for (var i = 0; i < algInfo.parts.length; ++i) {
		var p = parts[i];
		p.name = algInfo.parts[i];
		/*
		 * OpenSSH stores ed25519 "private" keys as seed + public key
		 * concat'd together (k followed by A). We want to keep them
		 * separate for other formats that don't do this.
		 */
		if (key.type === 'ed25519' && p.name === 'k')
			p.data = p.data.slice(0, 32);

		if (p.name !== 'curve' && algInfo.normalize !== false) {
			var nd;
			if (key.type === 'ed25519') {
				nd = utils.zeroPadToLength(p.data, 32);
			} else {
				nd = utils.mpNormalize(p.data);
			}
			if (nd.toString('binary') !==
			    p.data.toString('binary')) {
				p.data = nd;
				normalized = false;
			}
		}
	}

	if (normalized)
		key._rfc4253Cache = sshbuf.toBuffer();

	if (partial && typeof (partial) === 'object') {
		partial.remainder = sshbuf.remainder();
		partial.consumed = sshbuf._offset;
	}

	return (new Constructor(key));
}

function write(key, options) {
	assert.object(key);

	var alg = keyTypeToAlg(key);
	var i;

	var algInfo = algs.info[key.type];
	if (PrivateKey.isPrivateKey(key))
		algInfo = algs.privInfo[key.type];
	var parts = algInfo.parts;

	var buf = new SSHBuffer({});

	buf.writeString(alg);

	for (i = 0; i < parts.length; ++i) {
		var data = key.part[parts[i]].data;
		if (algInfo.normalize !== false) {
			if (key.type === 'ed25519')
				data = utils.zeroPadToLength(data, 32);
			else
				data = utils.mpNormalize(data);
		}
		if (key.type === 'ed25519' && parts[i] === 'k')
			data = Buffer.concat([data, key.part.A.data]);
		buf.writeBuffer(data);
	}

	return (buf.toBuffer());
}


/***/ }),

/***/ 3923:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

module.exports = {
	read: read,
	readSSHPrivate: readSSHPrivate,
	write: write
};

var assert = __nccwpck_require__(6631);
var asn1 = __nccwpck_require__(970);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var utils = __nccwpck_require__(575);
var crypto = __nccwpck_require__(6417);

var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var pem = __nccwpck_require__(4324);
var rfc4253 = __nccwpck_require__(8688);
var SSHBuffer = __nccwpck_require__(5621);
var errors = __nccwpck_require__(7979);

var bcrypt;

function read(buf, options) {
	return (pem.read(buf, options));
}

var MAGIC = 'openssh-key-v1';

function readSSHPrivate(type, buf, options) {
	buf = new SSHBuffer({buffer: buf});

	var magic = buf.readCString();
	assert.strictEqual(magic, MAGIC, 'bad magic string');

	var cipher = buf.readString();
	var kdf = buf.readString();
	var kdfOpts = buf.readBuffer();

	var nkeys = buf.readInt();
	if (nkeys !== 1) {
		throw (new Error('OpenSSH-format key file contains ' +
		    'multiple keys: this is unsupported.'));
	}

	var pubKey = buf.readBuffer();

	if (type === 'public') {
		assert.ok(buf.atEnd(), 'excess bytes left after key');
		return (rfc4253.read(pubKey));
	}

	var privKeyBlob = buf.readBuffer();
	assert.ok(buf.atEnd(), 'excess bytes left after key');

	var kdfOptsBuf = new SSHBuffer({ buffer: kdfOpts });
	switch (kdf) {
	case 'none':
		if (cipher !== 'none') {
			throw (new Error('OpenSSH-format key uses KDF "none" ' +
			     'but specifies a cipher other than "none"'));
		}
		break;
	case 'bcrypt':
		var salt = kdfOptsBuf.readBuffer();
		var rounds = kdfOptsBuf.readInt();
		var cinf = utils.opensshCipherInfo(cipher);
		if (bcrypt === undefined) {
			bcrypt = __nccwpck_require__(5447);
		}

		if (typeof (options.passphrase) === 'string') {
			options.passphrase = Buffer.from(options.passphrase,
			    'utf-8');
		}
		if (!Buffer.isBuffer(options.passphrase)) {
			throw (new errors.KeyEncryptedError(
			    options.filename, 'OpenSSH'));
		}

		var pass = new Uint8Array(options.passphrase);
		var salti = new Uint8Array(salt);
		/* Use the pbkdf to derive both the key and the IV. */
		var out = new Uint8Array(cinf.keySize + cinf.blockSize);
		var res = bcrypt.pbkdf(pass, pass.length, salti, salti.length,
		    out, out.length, rounds);
		if (res !== 0) {
			throw (new Error('bcrypt_pbkdf function returned ' +
			    'failure, parameters invalid'));
		}
		out = Buffer.from(out);
		var ckey = out.slice(0, cinf.keySize);
		var iv = out.slice(cinf.keySize, cinf.keySize + cinf.blockSize);
		var cipherStream = crypto.createDecipheriv(cinf.opensslName,
		    ckey, iv);
		cipherStream.setAutoPadding(false);
		var chunk, chunks = [];
		cipherStream.once('error', function (e) {
			if (e.toString().indexOf('bad decrypt') !== -1) {
				throw (new Error('Incorrect passphrase ' +
				    'supplied, could not decrypt key'));
			}
			throw (e);
		});
		cipherStream.write(privKeyBlob);
		cipherStream.end();
		while ((chunk = cipherStream.read()) !== null)
			chunks.push(chunk);
		privKeyBlob = Buffer.concat(chunks);
		break;
	default:
		throw (new Error(
		    'OpenSSH-format key uses unknown KDF "' + kdf + '"'));
	}

	buf = new SSHBuffer({buffer: privKeyBlob});

	var checkInt1 = buf.readInt();
	var checkInt2 = buf.readInt();
	if (checkInt1 !== checkInt2) {
		throw (new Error('Incorrect passphrase supplied, could not ' +
		    'decrypt key'));
	}

	var ret = {};
	var key = rfc4253.readInternal(ret, 'private', buf.remainder());

	buf.skip(ret.consumed);

	var comment = buf.readString();
	key.comment = comment;

	return (key);
}

function write(key, options) {
	var pubKey;
	if (PrivateKey.isPrivateKey(key))
		pubKey = key.toPublic();
	else
		pubKey = key;

	var cipher = 'none';
	var kdf = 'none';
	var kdfopts = Buffer.alloc(0);
	var cinf = { blockSize: 8 };
	var passphrase;
	if (options !== undefined) {
		passphrase = options.passphrase;
		if (typeof (passphrase) === 'string')
			passphrase = Buffer.from(passphrase, 'utf-8');
		if (passphrase !== undefined) {
			assert.buffer(passphrase, 'options.passphrase');
			assert.optionalString(options.cipher, 'options.cipher');
			cipher = options.cipher;
			if (cipher === undefined)
				cipher = 'aes128-ctr';
			cinf = utils.opensshCipherInfo(cipher);
			kdf = 'bcrypt';
		}
	}

	var privBuf;
	if (PrivateKey.isPrivateKey(key)) {
		privBuf = new SSHBuffer({});
		var checkInt = crypto.randomBytes(4).readUInt32BE(0);
		privBuf.writeInt(checkInt);
		privBuf.writeInt(checkInt);
		privBuf.write(key.toBuffer('rfc4253'));
		privBuf.writeString(key.comment || '');

		var n = 1;
		while (privBuf._offset % cinf.blockSize !== 0)
			privBuf.writeChar(n++);
		privBuf = privBuf.toBuffer();
	}

	switch (kdf) {
	case 'none':
		break;
	case 'bcrypt':
		var salt = crypto.randomBytes(16);
		var rounds = 16;
		var kdfssh = new SSHBuffer({});
		kdfssh.writeBuffer(salt);
		kdfssh.writeInt(rounds);
		kdfopts = kdfssh.toBuffer();

		if (bcrypt === undefined) {
			bcrypt = __nccwpck_require__(5447);
		}
		var pass = new Uint8Array(passphrase);
		var salti = new Uint8Array(salt);
		/* Use the pbkdf to derive both the key and the IV. */
		var out = new Uint8Array(cinf.keySize + cinf.blockSize);
		var res = bcrypt.pbkdf(pass, pass.length, salti, salti.length,
		    out, out.length, rounds);
		if (res !== 0) {
			throw (new Error('bcrypt_pbkdf function returned ' +
			    'failure, parameters invalid'));
		}
		out = Buffer.from(out);
		var ckey = out.slice(0, cinf.keySize);
		var iv = out.slice(cinf.keySize, cinf.keySize + cinf.blockSize);

		var cipherStream = crypto.createCipheriv(cinf.opensslName,
		    ckey, iv);
		cipherStream.setAutoPadding(false);
		var chunk, chunks = [];
		cipherStream.once('error', function (e) {
			throw (e);
		});
		cipherStream.write(privBuf);
		cipherStream.end();
		while ((chunk = cipherStream.read()) !== null)
			chunks.push(chunk);
		privBuf = Buffer.concat(chunks);
		break;
	default:
		throw (new Error('Unsupported kdf ' + kdf));
	}

	var buf = new SSHBuffer({});

	buf.writeCString(MAGIC);
	buf.writeString(cipher);	/* cipher */
	buf.writeString(kdf);		/* kdf */
	buf.writeBuffer(kdfopts);	/* kdfoptions */

	buf.writeInt(1);		/* nkeys */
	buf.writeBuffer(pubKey.toBuffer('rfc4253'));

	if (privBuf)
		buf.writeBuffer(privBuf);

	buf = buf.toBuffer();

	var header;
	if (PrivateKey.isPrivateKey(key))
		header = 'OPENSSH PRIVATE KEY';
	else
		header = 'OPENSSH PUBLIC KEY';

	var tmp = buf.toString('base64');
	var len = tmp.length + (tmp.length / 70) +
	    18 + 16 + header.length*2 + 10;
	buf = Buffer.alloc(len);
	var o = 0;
	o += buf.write('-----BEGIN ' + header + '-----\n', o);
	for (var i = 0; i < tmp.length; ) {
		var limit = i + 70;
		if (limit > tmp.length)
			limit = tmp.length;
		o += buf.write(tmp.slice(i, limit), o);
		buf[o++] = 10;
		i = limit;
	}
	o += buf.write('-----END ' + header + '-----\n', o);

	return (buf.slice(0, o));
}


/***/ }),

/***/ 8927:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

module.exports = {
	read: read,
	write: write
};

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var rfc4253 = __nccwpck_require__(8688);
var utils = __nccwpck_require__(575);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);

var sshpriv = __nccwpck_require__(3923);

/*JSSTYLED*/
var SSHKEY_RE = /^([a-z0-9-]+)[ \t]+([a-zA-Z0-9+\/]+[=]*)([ \t]+([^ \t][^\n]*[\n]*)?)?$/;
/*JSSTYLED*/
var SSHKEY_RE2 = /^([a-z0-9-]+)[ \t\n]+([a-zA-Z0-9+\/][a-zA-Z0-9+\/ \t\n=]*)([^a-zA-Z0-9+\/ \t\n=].*)?$/;

function read(buf, options) {
	if (typeof (buf) !== 'string') {
		assert.buffer(buf, 'buf');
		buf = buf.toString('ascii');
	}

	var trimmed = buf.trim().replace(/[\\\r]/g, '');
	var m = trimmed.match(SSHKEY_RE);
	if (!m)
		m = trimmed.match(SSHKEY_RE2);
	assert.ok(m, 'key must match regex');

	var type = rfc4253.algToKeyType(m[1]);
	var kbuf = Buffer.from(m[2], 'base64');

	/*
	 * This is a bit tricky. If we managed to parse the key and locate the
	 * key comment with the regex, then do a non-partial read and assert
	 * that we have consumed all bytes. If we couldn't locate the key
	 * comment, though, there may be whitespace shenanigans going on that
	 * have conjoined the comment to the rest of the key. We do a partial
	 * read in this case to try to make the best out of a sorry situation.
	 */
	var key;
	var ret = {};
	if (m[4]) {
		try {
			key = rfc4253.read(kbuf);

		} catch (e) {
			m = trimmed.match(SSHKEY_RE2);
			assert.ok(m, 'key must match regex');
			kbuf = Buffer.from(m[2], 'base64');
			key = rfc4253.readInternal(ret, 'public', kbuf);
		}
	} else {
		key = rfc4253.readInternal(ret, 'public', kbuf);
	}

	assert.strictEqual(type, key.type);

	if (m[4] && m[4].length > 0) {
		key.comment = m[4];

	} else if (ret.consumed) {
		/*
		 * Now the magic: trying to recover the key comment when it's
		 * gotten conjoined to the key or otherwise shenanigan'd.
		 *
		 * Work out how much base64 we used, then drop all non-base64
		 * chars from the beginning up to this point in the the string.
		 * Then offset in this and try to make up for missing = chars.
		 */
		var data = m[2] + (m[3] ? m[3] : '');
		var realOffset = Math.ceil(ret.consumed / 3) * 4;
		data = data.slice(0, realOffset - 2). /*JSSTYLED*/
		    replace(/[^a-zA-Z0-9+\/=]/g, '') +
		    data.slice(realOffset - 2);

		var padding = ret.consumed % 3;
		if (padding > 0 &&
		    data.slice(realOffset - 1, realOffset) !== '=')
			realOffset--;
		while (data.slice(realOffset, realOffset + 1) === '=')
			realOffset++;

		/* Finally, grab what we think is the comment & clean it up. */
		var trailer = data.slice(realOffset);
		trailer = trailer.replace(/[\r\n]/g, ' ').
		    replace(/^\s+/, '');
		if (trailer.match(/^[a-zA-Z0-9]/))
			key.comment = trailer;
	}

	return (key);
}

function write(key, options) {
	assert.object(key);
	if (!Key.isKey(key))
		throw (new Error('Must be a public key'));

	var parts = [];
	var alg = rfc4253.keyTypeToAlg(key);
	parts.push(alg);

	var buf = rfc4253.write(key);
	parts.push(buf.toString('base64'));

	if (key.comment)
		parts.push(key.comment);

	return (Buffer.from(parts.join(' ')));
}


/***/ }),

/***/ 217:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2016 Joyent, Inc.

var x509 = __nccwpck_require__(267);

module.exports = {
	read: read,
	verify: x509.verify,
	sign: x509.sign,
	write: write
};

var assert = __nccwpck_require__(6631);
var asn1 = __nccwpck_require__(970);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var utils = __nccwpck_require__(575);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var pem = __nccwpck_require__(4324);
var Identity = __nccwpck_require__(508);
var Signature = __nccwpck_require__(1394);
var Certificate = __nccwpck_require__(7406);

function read(buf, options) {
	if (typeof (buf) !== 'string') {
		assert.buffer(buf, 'buf');
		buf = buf.toString('ascii');
	}

	var lines = buf.trim().split(/[\r\n]+/g);

	var m;
	var si = -1;
	while (!m && si < lines.length) {
		m = lines[++si].match(/*JSSTYLED*/
		    /[-]+[ ]*BEGIN CERTIFICATE[ ]*[-]+/);
	}
	assert.ok(m, 'invalid PEM header');

	var m2;
	var ei = lines.length;
	while (!m2 && ei > 0) {
		m2 = lines[--ei].match(/*JSSTYLED*/
		    /[-]+[ ]*END CERTIFICATE[ ]*[-]+/);
	}
	assert.ok(m2, 'invalid PEM footer');

	lines = lines.slice(si, ei + 1);

	var headers = {};
	while (true) {
		lines = lines.slice(1);
		m = lines[0].match(/*JSSTYLED*/
		    /^([A-Za-z0-9-]+): (.+)$/);
		if (!m)
			break;
		headers[m[1].toLowerCase()] = m[2];
	}

	/* Chop off the first and last lines */
	lines = lines.slice(0, -1).join('');
	buf = Buffer.from(lines, 'base64');

	return (x509.read(buf, options));
}

function write(cert, options) {
	var dbuf = x509.write(cert, options);

	var header = 'CERTIFICATE';
	var tmp = dbuf.toString('base64');
	var len = tmp.length + (tmp.length / 64) +
	    18 + 16 + header.length*2 + 10;
	var buf = Buffer.alloc(len);
	var o = 0;
	o += buf.write('-----BEGIN ' + header + '-----\n', o);
	for (var i = 0; i < tmp.length; ) {
		var limit = i + 64;
		if (limit > tmp.length)
			limit = tmp.length;
		o += buf.write(tmp.slice(i, limit), o);
		buf[o++] = 10;
		i = limit;
	}
	o += buf.write('-----END ' + header + '-----\n', o);

	return (buf.slice(0, o));
}


/***/ }),

/***/ 267:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2017 Joyent, Inc.

module.exports = {
	read: read,
	verify: verify,
	sign: sign,
	signAsync: signAsync,
	write: write
};

var assert = __nccwpck_require__(6631);
var asn1 = __nccwpck_require__(970);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var utils = __nccwpck_require__(575);
var Key = __nccwpck_require__(6814);
var PrivateKey = __nccwpck_require__(9602);
var pem = __nccwpck_require__(4324);
var Identity = __nccwpck_require__(508);
var Signature = __nccwpck_require__(1394);
var Certificate = __nccwpck_require__(7406);
var pkcs8 = __nccwpck_require__(4173);

/*
 * This file is based on RFC5280 (X.509).
 */

/* Helper to read in a single mpint */
function readMPInt(der, nm) {
	assert.strictEqual(der.peek(), asn1.Ber.Integer,
	    nm + ' is not an Integer');
	return (utils.mpNormalize(der.readString(asn1.Ber.Integer, true)));
}

function verify(cert, key) {
	var sig = cert.signatures.x509;
	assert.object(sig, 'x509 signature');

	var algParts = sig.algo.split('-');
	if (algParts[0] !== key.type)
		return (false);

	var blob = sig.cache;
	if (blob === undefined) {
		var der = new asn1.BerWriter();
		writeTBSCert(cert, der);
		blob = der.buffer;
	}

	var verifier = key.createVerify(algParts[1]);
	verifier.write(blob);
	return (verifier.verify(sig.signature));
}

function Local(i) {
	return (asn1.Ber.Context | asn1.Ber.Constructor | i);
}

function Context(i) {
	return (asn1.Ber.Context | i);
}

var SIGN_ALGS = {
	'rsa-md5': '1.2.840.113549.1.1.4',
	'rsa-sha1': '1.2.840.113549.1.1.5',
	'rsa-sha256': '1.2.840.113549.1.1.11',
	'rsa-sha384': '1.2.840.113549.1.1.12',
	'rsa-sha512': '1.2.840.113549.1.1.13',
	'dsa-sha1': '1.2.840.10040.4.3',
	'dsa-sha256': '2.16.840.1.101.3.4.3.2',
	'ecdsa-sha1': '1.2.840.10045.4.1',
	'ecdsa-sha256': '1.2.840.10045.4.3.2',
	'ecdsa-sha384': '1.2.840.10045.4.3.3',
	'ecdsa-sha512': '1.2.840.10045.4.3.4',
	'ed25519-sha512': '1.3.101.112'
};
Object.keys(SIGN_ALGS).forEach(function (k) {
	SIGN_ALGS[SIGN_ALGS[k]] = k;
});
SIGN_ALGS['1.3.14.3.2.3'] = 'rsa-md5';
SIGN_ALGS['1.3.14.3.2.29'] = 'rsa-sha1';

var EXTS = {
	'issuerKeyId': '2.5.29.35',
	'altName': '2.5.29.17',
	'basicConstraints': '2.5.29.19',
	'keyUsage': '2.5.29.15',
	'extKeyUsage': '2.5.29.37'
};

function read(buf, options) {
	if (typeof (buf) === 'string') {
		buf = Buffer.from(buf, 'binary');
	}
	assert.buffer(buf, 'buf');

	var der = new asn1.BerReader(buf);

	der.readSequence();
	if (Math.abs(der.length - der.remain) > 1) {
		throw (new Error('DER sequence does not contain whole byte ' +
		    'stream'));
	}

	var tbsStart = der.offset;
	der.readSequence();
	var sigOffset = der.offset + der.length;
	var tbsEnd = sigOffset;

	if (der.peek() === Local(0)) {
		der.readSequence(Local(0));
		var version = der.readInt();
		assert.ok(version <= 3,
		    'only x.509 versions up to v3 supported');
	}

	var cert = {};
	cert.signatures = {};
	var sig = (cert.signatures.x509 = {});
	sig.extras = {};

	cert.serial = readMPInt(der, 'serial');

	der.readSequence();
	var after = der.offset + der.length;
	var certAlgOid = der.readOID();
	var certAlg = SIGN_ALGS[certAlgOid];
	if (certAlg === undefined)
		throw (new Error('unknown signature algorithm ' + certAlgOid));

	der._offset = after;
	cert.issuer = Identity.parseAsn1(der);

	der.readSequence();
	cert.validFrom = readDate(der);
	cert.validUntil = readDate(der);

	cert.subjects = [Identity.parseAsn1(der)];

	der.readSequence();
	after = der.offset + der.length;
	cert.subjectKey = pkcs8.readPkcs8(undefined, 'public', der);
	der._offset = after;

	/* issuerUniqueID */
	if (der.peek() === Local(1)) {
		der.readSequence(Local(1));
		sig.extras.issuerUniqueID =
		    buf.slice(der.offset, der.offset + der.length);
		der._offset += der.length;
	}

	/* subjectUniqueID */
	if (der.peek() === Local(2)) {
		der.readSequence(Local(2));
		sig.extras.subjectUniqueID =
		    buf.slice(der.offset, der.offset + der.length);
		der._offset += der.length;
	}

	/* extensions */
	if (der.peek() === Local(3)) {
		der.readSequence(Local(3));
		var extEnd = der.offset + der.length;
		der.readSequence();

		while (der.offset < extEnd)
			readExtension(cert, buf, der);

		assert.strictEqual(der.offset, extEnd);
	}

	assert.strictEqual(der.offset, sigOffset);

	der.readSequence();
	after = der.offset + der.length;
	var sigAlgOid = der.readOID();
	var sigAlg = SIGN_ALGS[sigAlgOid];
	if (sigAlg === undefined)
		throw (new Error('unknown signature algorithm ' + sigAlgOid));
	der._offset = after;

	var sigData = der.readString(asn1.Ber.BitString, true);
	if (sigData[0] === 0)
		sigData = sigData.slice(1);
	var algParts = sigAlg.split('-');

	sig.signature = Signature.parse(sigData, algParts[0], 'asn1');
	sig.signature.hashAlgorithm = algParts[1];
	sig.algo = sigAlg;
	sig.cache = buf.slice(tbsStart, tbsEnd);

	return (new Certificate(cert));
}

function readDate(der) {
	if (der.peek() === asn1.Ber.UTCTime) {
		return (utcTimeToDate(der.readString(asn1.Ber.UTCTime)));
	} else if (der.peek() === asn1.Ber.GeneralizedTime) {
		return (gTimeToDate(der.readString(asn1.Ber.GeneralizedTime)));
	} else {
		throw (new Error('Unsupported date format'));
	}
}

function writeDate(der, date) {
	if (date.getUTCFullYear() >= 2050 || date.getUTCFullYear() < 1950) {
		der.writeString(dateToGTime(date), asn1.Ber.GeneralizedTime);
	} else {
		der.writeString(dateToUTCTime(date), asn1.Ber.UTCTime);
	}
}

/* RFC5280, section 4.2.1.6 (GeneralName type) */
var ALTNAME = {
	OtherName: Local(0),
	RFC822Name: Context(1),
	DNSName: Context(2),
	X400Address: Local(3),
	DirectoryName: Local(4),
	EDIPartyName: Local(5),
	URI: Context(6),
	IPAddress: Context(7),
	OID: Context(8)
};

/* RFC5280, section 4.2.1.12 (KeyPurposeId) */
var EXTPURPOSE = {
	'serverAuth': '1.3.6.1.5.5.7.3.1',
	'clientAuth': '1.3.6.1.5.5.7.3.2',
	'codeSigning': '1.3.6.1.5.5.7.3.3',

	/* See https://github.com/joyent/oid-docs/blob/master/root.md */
	'joyentDocker': '1.3.6.1.4.1.38678.1.4.1',
	'joyentCmon': '1.3.6.1.4.1.38678.1.4.2'
};
var EXTPURPOSE_REV = {};
Object.keys(EXTPURPOSE).forEach(function (k) {
	EXTPURPOSE_REV[EXTPURPOSE[k]] = k;
});

var KEYUSEBITS = [
	'signature', 'identity', 'keyEncryption',
	'encryption', 'keyAgreement', 'ca', 'crl'
];

function readExtension(cert, buf, der) {
	der.readSequence();
	var after = der.offset + der.length;
	var extId = der.readOID();
	var id;
	var sig = cert.signatures.x509;
	if (!sig.extras.exts)
		sig.extras.exts = [];

	var critical;
	if (der.peek() === asn1.Ber.Boolean)
		critical = der.readBoolean();

	switch (extId) {
	case (EXTS.basicConstraints):
		der.readSequence(asn1.Ber.OctetString);
		der.readSequence();
		var bcEnd = der.offset + der.length;
		var ca = false;
		if (der.peek() === asn1.Ber.Boolean)
			ca = der.readBoolean();
		if (cert.purposes === undefined)
			cert.purposes = [];
		if (ca === true)
			cert.purposes.push('ca');
		var bc = { oid: extId, critical: critical };
		if (der.offset < bcEnd && der.peek() === asn1.Ber.Integer)
			bc.pathLen = der.readInt();
		sig.extras.exts.push(bc);
		break;
	case (EXTS.extKeyUsage):
		der.readSequence(asn1.Ber.OctetString);
		der.readSequence();
		if (cert.purposes === undefined)
			cert.purposes = [];
		var ekEnd = der.offset + der.length;
		while (der.offset < ekEnd) {
			var oid = der.readOID();
			cert.purposes.push(EXTPURPOSE_REV[oid] || oid);
		}
		/*
		 * This is a bit of a hack: in the case where we have a cert
		 * that's only allowed to do serverAuth or clientAuth (and not
		 * the other), we want to make sure all our Subjects are of
		 * the right type. But we already parsed our Subjects and
		 * decided if they were hosts or users earlier (since it appears
		 * first in the cert).
		 *
		 * So we go through and mutate them into the right kind here if
		 * it doesn't match. This might not be hugely beneficial, as it
		 * seems that single-purpose certs are not often seen in the
		 * wild.
		 */
		if (cert.purposes.indexOf('serverAuth') !== -1 &&
		    cert.purposes.indexOf('clientAuth') === -1) {
			cert.subjects.forEach(function (ide) {
				if (ide.type !== 'host') {
					ide.type = 'host';
					ide.hostname = ide.uid ||
					    ide.email ||
					    ide.components[0].value;
				}
			});
		} else if (cert.purposes.indexOf('clientAuth') !== -1 &&
		    cert.purposes.indexOf('serverAuth') === -1) {
			cert.subjects.forEach(function (ide) {
				if (ide.type !== 'user') {
					ide.type = 'user';
					ide.uid = ide.hostname ||
					    ide.email ||
					    ide.components[0].value;
				}
			});
		}
		sig.extras.exts.push({ oid: extId, critical: critical });
		break;
	case (EXTS.keyUsage):
		der.readSequence(asn1.Ber.OctetString);
		var bits = der.readString(asn1.Ber.BitString, true);
		var setBits = readBitField(bits, KEYUSEBITS);
		setBits.forEach(function (bit) {
			if (cert.purposes === undefined)
				cert.purposes = [];
			if (cert.purposes.indexOf(bit) === -1)
				cert.purposes.push(bit);
		});
		sig.extras.exts.push({ oid: extId, critical: critical,
		    bits: bits });
		break;
	case (EXTS.altName):
		der.readSequence(asn1.Ber.OctetString);
		der.readSequence();
		var aeEnd = der.offset + der.length;
		while (der.offset < aeEnd) {
			switch (der.peek()) {
			case ALTNAME.OtherName:
			case ALTNAME.EDIPartyName:
				der.readSequence();
				der._offset += der.length;
				break;
			case ALTNAME.OID:
				der.readOID(ALTNAME.OID);
				break;
			case ALTNAME.RFC822Name:
				/* RFC822 specifies email addresses */
				var email = der.readString(ALTNAME.RFC822Name);
				id = Identity.forEmail(email);
				if (!cert.subjects[0].equals(id))
					cert.subjects.push(id);
				break;
			case ALTNAME.DirectoryName:
				der.readSequence(ALTNAME.DirectoryName);
				id = Identity.parseAsn1(der);
				if (!cert.subjects[0].equals(id))
					cert.subjects.push(id);
				break;
			case ALTNAME.DNSName:
				var host = der.readString(
				    ALTNAME.DNSName);
				id = Identity.forHost(host);
				if (!cert.subjects[0].equals(id))
					cert.subjects.push(id);
				break;
			default:
				der.readString(der.peek());
				break;
			}
		}
		sig.extras.exts.push({ oid: extId, critical: critical });
		break;
	default:
		sig.extras.exts.push({
			oid: extId,
			critical: critical,
			data: der.readString(asn1.Ber.OctetString, true)
		});
		break;
	}

	der._offset = after;
}

var UTCTIME_RE =
    /^([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})?Z$/;
function utcTimeToDate(t) {
	var m = t.match(UTCTIME_RE);
	assert.ok(m, 'timestamps must be in UTC');
	var d = new Date();

	var thisYear = d.getUTCFullYear();
	var century = Math.floor(thisYear / 100) * 100;

	var year = parseInt(m[1], 10);
	if (thisYear % 100 < 50 && year >= 60)
		year += (century - 1);
	else
		year += century;
	d.setUTCFullYear(year, parseInt(m[2], 10) - 1, parseInt(m[3], 10));
	d.setUTCHours(parseInt(m[4], 10), parseInt(m[5], 10));
	if (m[6] && m[6].length > 0)
		d.setUTCSeconds(parseInt(m[6], 10));
	return (d);
}

var GTIME_RE =
    /^([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})?Z$/;
function gTimeToDate(t) {
	var m = t.match(GTIME_RE);
	assert.ok(m);
	var d = new Date();

	d.setUTCFullYear(parseInt(m[1], 10), parseInt(m[2], 10) - 1,
	    parseInt(m[3], 10));
	d.setUTCHours(parseInt(m[4], 10), parseInt(m[5], 10));
	if (m[6] && m[6].length > 0)
		d.setUTCSeconds(parseInt(m[6], 10));
	return (d);
}

function zeroPad(n, m) {
	if (m === undefined)
		m = 2;
	var s = '' + n;
	while (s.length < m)
		s = '0' + s;
	return (s);
}

function dateToUTCTime(d) {
	var s = '';
	s += zeroPad(d.getUTCFullYear() % 100);
	s += zeroPad(d.getUTCMonth() + 1);
	s += zeroPad(d.getUTCDate());
	s += zeroPad(d.getUTCHours());
	s += zeroPad(d.getUTCMinutes());
	s += zeroPad(d.getUTCSeconds());
	s += 'Z';
	return (s);
}

function dateToGTime(d) {
	var s = '';
	s += zeroPad(d.getUTCFullYear(), 4);
	s += zeroPad(d.getUTCMonth() + 1);
	s += zeroPad(d.getUTCDate());
	s += zeroPad(d.getUTCHours());
	s += zeroPad(d.getUTCMinutes());
	s += zeroPad(d.getUTCSeconds());
	s += 'Z';
	return (s);
}

function sign(cert, key) {
	if (cert.signatures.x509 === undefined)
		cert.signatures.x509 = {};
	var sig = cert.signatures.x509;

	sig.algo = key.type + '-' + key.defaultHashAlgorithm();
	if (SIGN_ALGS[sig.algo] === undefined)
		return (false);

	var der = new asn1.BerWriter();
	writeTBSCert(cert, der);
	var blob = der.buffer;
	sig.cache = blob;

	var signer = key.createSign();
	signer.write(blob);
	cert.signatures.x509.signature = signer.sign();

	return (true);
}

function signAsync(cert, signer, done) {
	if (cert.signatures.x509 === undefined)
		cert.signatures.x509 = {};
	var sig = cert.signatures.x509;

	var der = new asn1.BerWriter();
	writeTBSCert(cert, der);
	var blob = der.buffer;
	sig.cache = blob;

	signer(blob, function (err, signature) {
		if (err) {
			done(err);
			return;
		}
		sig.algo = signature.type + '-' + signature.hashAlgorithm;
		if (SIGN_ALGS[sig.algo] === undefined) {
			done(new Error('Invalid signing algorithm "' +
			    sig.algo + '"'));
			return;
		}
		sig.signature = signature;
		done();
	});
}

function write(cert, options) {
	var sig = cert.signatures.x509;
	assert.object(sig, 'x509 signature');

	var der = new asn1.BerWriter();
	der.startSequence();
	if (sig.cache) {
		der._ensure(sig.cache.length);
		sig.cache.copy(der._buf, der._offset);
		der._offset += sig.cache.length;
	} else {
		writeTBSCert(cert, der);
	}

	der.startSequence();
	der.writeOID(SIGN_ALGS[sig.algo]);
	if (sig.algo.match(/^rsa-/))
		der.writeNull();
	der.endSequence();

	var sigData = sig.signature.toBuffer('asn1');
	var data = Buffer.alloc(sigData.length + 1);
	data[0] = 0;
	sigData.copy(data, 1);
	der.writeBuffer(data, asn1.Ber.BitString);
	der.endSequence();

	return (der.buffer);
}

function writeTBSCert(cert, der) {
	var sig = cert.signatures.x509;
	assert.object(sig, 'x509 signature');

	der.startSequence();

	der.startSequence(Local(0));
	der.writeInt(2);
	der.endSequence();

	der.writeBuffer(utils.mpNormalize(cert.serial), asn1.Ber.Integer);

	der.startSequence();
	der.writeOID(SIGN_ALGS[sig.algo]);
	if (sig.algo.match(/^rsa-/))
		der.writeNull();
	der.endSequence();

	cert.issuer.toAsn1(der);

	der.startSequence();
	writeDate(der, cert.validFrom);
	writeDate(der, cert.validUntil);
	der.endSequence();

	var subject = cert.subjects[0];
	var altNames = cert.subjects.slice(1);
	subject.toAsn1(der);

	pkcs8.writePkcs8(der, cert.subjectKey);

	if (sig.extras && sig.extras.issuerUniqueID) {
		der.writeBuffer(sig.extras.issuerUniqueID, Local(1));
	}

	if (sig.extras && sig.extras.subjectUniqueID) {
		der.writeBuffer(sig.extras.subjectUniqueID, Local(2));
	}

	if (altNames.length > 0 || subject.type === 'host' ||
	    (cert.purposes !== undefined && cert.purposes.length > 0) ||
	    (sig.extras && sig.extras.exts)) {
		der.startSequence(Local(3));
		der.startSequence();

		var exts = [];
		if (cert.purposes !== undefined && cert.purposes.length > 0) {
			exts.push({
				oid: EXTS.basicConstraints,
				critical: true
			});
			exts.push({
				oid: EXTS.keyUsage,
				critical: true
			});
			exts.push({
				oid: EXTS.extKeyUsage,
				critical: true
			});
		}
		exts.push({ oid: EXTS.altName });
		if (sig.extras && sig.extras.exts)
			exts = sig.extras.exts;

		for (var i = 0; i < exts.length; ++i) {
			der.startSequence();
			der.writeOID(exts[i].oid);

			if (exts[i].critical !== undefined)
				der.writeBoolean(exts[i].critical);

			if (exts[i].oid === EXTS.altName) {
				der.startSequence(asn1.Ber.OctetString);
				der.startSequence();
				if (subject.type === 'host') {
					der.writeString(subject.hostname,
					    Context(2));
				}
				for (var j = 0; j < altNames.length; ++j) {
					if (altNames[j].type === 'host') {
						der.writeString(
						    altNames[j].hostname,
						    ALTNAME.DNSName);
					} else if (altNames[j].type ===
					    'email') {
						der.writeString(
						    altNames[j].email,
						    ALTNAME.RFC822Name);
					} else {
						/*
						 * Encode anything else as a
						 * DN style name for now.
						 */
						der.startSequence(
						    ALTNAME.DirectoryName);
						altNames[j].toAsn1(der);
						der.endSequence();
					}
				}
				der.endSequence();
				der.endSequence();
			} else if (exts[i].oid === EXTS.basicConstraints) {
				der.startSequence(asn1.Ber.OctetString);
				der.startSequence();
				var ca = (cert.purposes.indexOf('ca') !== -1);
				var pathLen = exts[i].pathLen;
				der.writeBoolean(ca);
				if (pathLen !== undefined)
					der.writeInt(pathLen);
				der.endSequence();
				der.endSequence();
			} else if (exts[i].oid === EXTS.extKeyUsage) {
				der.startSequence(asn1.Ber.OctetString);
				der.startSequence();
				cert.purposes.forEach(function (purpose) {
					if (purpose === 'ca')
						return;
					if (KEYUSEBITS.indexOf(purpose) !== -1)
						return;
					var oid = purpose;
					if (EXTPURPOSE[purpose] !== undefined)
						oid = EXTPURPOSE[purpose];
					der.writeOID(oid);
				});
				der.endSequence();
				der.endSequence();
			} else if (exts[i].oid === EXTS.keyUsage) {
				der.startSequence(asn1.Ber.OctetString);
				/*
				 * If we parsed this certificate from a byte
				 * stream (i.e. we didn't generate it in sshpk)
				 * then we'll have a ".bits" property on the
				 * ext with the original raw byte contents.
				 *
				 * If we have this, use it here instead of
				 * regenerating it. This guarantees we output
				 * the same data we parsed, so signatures still
				 * validate.
				 */
				if (exts[i].bits !== undefined) {
					der.writeBuffer(exts[i].bits,
					    asn1.Ber.BitString);
				} else {
					var bits = writeBitField(cert.purposes,
					    KEYUSEBITS);
					der.writeBuffer(bits,
					    asn1.Ber.BitString);
				}
				der.endSequence();
			} else {
				der.writeBuffer(exts[i].data,
				    asn1.Ber.OctetString);
			}

			der.endSequence();
		}

		der.endSequence();
		der.endSequence();
	}

	der.endSequence();
}

/*
 * Reads an ASN.1 BER bitfield out of the Buffer produced by doing
 * `BerReader#readString(asn1.Ber.BitString)`. That function gives us the raw
 * contents of the BitString tag, which is a count of unused bits followed by
 * the bits as a right-padded byte string.
 *
 * `bits` is the Buffer, `bitIndex` should contain an array of string names
 * for the bits in the string, ordered starting with bit #0 in the ASN.1 spec.
 *
 * Returns an array of Strings, the names of the bits that were set to 1.
 */
function readBitField(bits, bitIndex) {
	var bitLen = 8 * (bits.length - 1) - bits[0];
	var setBits = {};
	for (var i = 0; i < bitLen; ++i) {
		var byteN = 1 + Math.floor(i / 8);
		var bit = 7 - (i % 8);
		var mask = 1 << bit;
		var bitVal = ((bits[byteN] & mask) !== 0);
		var name = bitIndex[i];
		if (bitVal && typeof (name) === 'string') {
			setBits[name] = true;
		}
	}
	return (Object.keys(setBits));
}

/*
 * `setBits` is an array of strings, containing the names for each bit that
 * sould be set to 1. `bitIndex` is same as in `readBitField()`.
 *
 * Returns a Buffer, ready to be written out with `BerWriter#writeString()`.
 */
function writeBitField(setBits, bitIndex) {
	var bitLen = bitIndex.length;
	var blen = Math.ceil(bitLen / 8);
	var unused = blen * 8 - bitLen;
	var bits = Buffer.alloc(1 + blen); // zero-filled
	bits[0] = unused;
	for (var i = 0; i < bitLen; ++i) {
		var byteN = 1 + Math.floor(i / 8);
		var bit = 7 - (i % 8);
		var mask = 1 << bit;
		var name = bitIndex[i];
		if (name === undefined)
			continue;
		var bitVal = (setBits.indexOf(name) !== -1);
		if (bitVal) {
			bits[byteN] |= mask;
		}
	}
	return (bits);
}


/***/ }),

/***/ 508:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2017 Joyent, Inc.

module.exports = Identity;

var assert = __nccwpck_require__(6631);
var algs = __nccwpck_require__(6126);
var crypto = __nccwpck_require__(6417);
var Fingerprint = __nccwpck_require__(3079);
var Signature = __nccwpck_require__(1394);
var errs = __nccwpck_require__(7979);
var util = __nccwpck_require__(1669);
var utils = __nccwpck_require__(575);
var asn1 = __nccwpck_require__(970);
var Buffer = __nccwpck_require__(5118).Buffer;

/*JSSTYLED*/
var DNS_NAME_RE = /^([*]|[a-z0-9][a-z0-9\-]{0,62})(?:\.([*]|[a-z0-9][a-z0-9\-]{0,62}))*$/i;

var oids = {};
oids.cn = '2.5.4.3';
oids.o = '2.5.4.10';
oids.ou = '2.5.4.11';
oids.l = '2.5.4.7';
oids.s = '2.5.4.8';
oids.c = '2.5.4.6';
oids.sn = '2.5.4.4';
oids.postalCode = '2.5.4.17';
oids.serialNumber = '2.5.4.5';
oids.street = '2.5.4.9';
oids.x500UniqueIdentifier = '2.5.4.45';
oids.role = '2.5.4.72';
oids.telephoneNumber = '2.5.4.20';
oids.description = '2.5.4.13';
oids.dc = '0.9.2342.19200300.100.1.25';
oids.uid = '0.9.2342.19200300.100.1.1';
oids.mail = '0.9.2342.19200300.100.1.3';
oids.title = '2.5.4.12';
oids.gn = '2.5.4.42';
oids.initials = '2.5.4.43';
oids.pseudonym = '2.5.4.65';
oids.emailAddress = '1.2.840.113549.1.9.1';

var unoids = {};
Object.keys(oids).forEach(function (k) {
	unoids[oids[k]] = k;
});

function Identity(opts) {
	var self = this;
	assert.object(opts, 'options');
	assert.arrayOfObject(opts.components, 'options.components');
	this.components = opts.components;
	this.componentLookup = {};
	this.components.forEach(function (c) {
		if (c.name && !c.oid)
			c.oid = oids[c.name];
		if (c.oid && !c.name)
			c.name = unoids[c.oid];
		if (self.componentLookup[c.name] === undefined)
			self.componentLookup[c.name] = [];
		self.componentLookup[c.name].push(c);
	});
	if (this.componentLookup.cn && this.componentLookup.cn.length > 0) {
		this.cn = this.componentLookup.cn[0].value;
	}
	assert.optionalString(opts.type, 'options.type');
	if (opts.type === undefined) {
		if (this.components.length === 1 &&
		    this.componentLookup.cn &&
		    this.componentLookup.cn.length === 1 &&
		    this.componentLookup.cn[0].value.match(DNS_NAME_RE)) {
			this.type = 'host';
			this.hostname = this.componentLookup.cn[0].value;

		} else if (this.componentLookup.dc &&
		    this.components.length === this.componentLookup.dc.length) {
			this.type = 'host';
			this.hostname = this.componentLookup.dc.map(
			    function (c) {
				return (c.value);
			}).join('.');

		} else if (this.componentLookup.uid &&
		    this.components.length ===
		    this.componentLookup.uid.length) {
			this.type = 'user';
			this.uid = this.componentLookup.uid[0].value;

		} else if (this.componentLookup.cn &&
		    this.componentLookup.cn.length === 1 &&
		    this.componentLookup.cn[0].value.match(DNS_NAME_RE)) {
			this.type = 'host';
			this.hostname = this.componentLookup.cn[0].value;

		} else if (this.componentLookup.uid &&
		    this.componentLookup.uid.length === 1) {
			this.type = 'user';
			this.uid = this.componentLookup.uid[0].value;

		} else if (this.componentLookup.mail &&
		    this.componentLookup.mail.length === 1) {
			this.type = 'email';
			this.email = this.componentLookup.mail[0].value;

		} else if (this.componentLookup.cn &&
		    this.componentLookup.cn.length === 1) {
			this.type = 'user';
			this.uid = this.componentLookup.cn[0].value;

		} else {
			this.type = 'unknown';
		}
	} else {
		this.type = opts.type;
		if (this.type === 'host')
			this.hostname = opts.hostname;
		else if (this.type === 'user')
			this.uid = opts.uid;
		else if (this.type === 'email')
			this.email = opts.email;
		else
			throw (new Error('Unknown type ' + this.type));
	}
}

Identity.prototype.toString = function () {
	return (this.components.map(function (c) {
		var n = c.name.toUpperCase();
		/*JSSTYLED*/
		n = n.replace(/=/g, '\\=');
		var v = c.value;
		/*JSSTYLED*/
		v = v.replace(/,/g, '\\,');
		return (n + '=' + v);
	}).join(', '));
};

Identity.prototype.get = function (name, asArray) {
	assert.string(name, 'name');
	var arr = this.componentLookup[name];
	if (arr === undefined || arr.length === 0)
		return (undefined);
	if (!asArray && arr.length > 1)
		throw (new Error('Multiple values for attribute ' + name));
	if (!asArray)
		return (arr[0].value);
	return (arr.map(function (c) {
		return (c.value);
	}));
};

Identity.prototype.toArray = function (idx) {
	return (this.components.map(function (c) {
		return ({
			name: c.name,
			value: c.value
		});
	}));
};

/*
 * These are from X.680 -- PrintableString allowed chars are in section 37.4
 * table 8. Spec for IA5Strings is "1,6 + SPACE + DEL" where 1 refers to
 * ISO IR #001 (standard ASCII control characters) and 6 refers to ISO IR #006
 * (the basic ASCII character set).
 */
/* JSSTYLED */
var NOT_PRINTABLE = /[^a-zA-Z0-9 '(),+.\/:=?-]/;
/* JSSTYLED */
var NOT_IA5 = /[^\x00-\x7f]/;

Identity.prototype.toAsn1 = function (der, tag) {
	der.startSequence(tag);
	this.components.forEach(function (c) {
		der.startSequence(asn1.Ber.Constructor | asn1.Ber.Set);
		der.startSequence();
		der.writeOID(c.oid);
		/*
		 * If we fit in a PrintableString, use that. Otherwise use an
		 * IA5String or UTF8String.
		 *
		 * If this identity was parsed from a DN, use the ASN.1 types
		 * from the original representation (otherwise this might not
		 * be a full match for the original in some validators).
		 */
		if (c.asn1type === asn1.Ber.Utf8String ||
		    c.value.match(NOT_IA5)) {
			var v = Buffer.from(c.value, 'utf8');
			der.writeBuffer(v, asn1.Ber.Utf8String);

		} else if (c.asn1type === asn1.Ber.IA5String ||
		    c.value.match(NOT_PRINTABLE)) {
			der.writeString(c.value, asn1.Ber.IA5String);

		} else {
			var type = asn1.Ber.PrintableString;
			if (c.asn1type !== undefined)
				type = c.asn1type;
			der.writeString(c.value, type);
		}
		der.endSequence();
		der.endSequence();
	});
	der.endSequence();
};

function globMatch(a, b) {
	if (a === '**' || b === '**')
		return (true);
	var aParts = a.split('.');
	var bParts = b.split('.');
	if (aParts.length !== bParts.length)
		return (false);
	for (var i = 0; i < aParts.length; ++i) {
		if (aParts[i] === '*' || bParts[i] === '*')
			continue;
		if (aParts[i] !== bParts[i])
			return (false);
	}
	return (true);
}

Identity.prototype.equals = function (other) {
	if (!Identity.isIdentity(other, [1, 0]))
		return (false);
	if (other.components.length !== this.components.length)
		return (false);
	for (var i = 0; i < this.components.length; ++i) {
		if (this.components[i].oid !== other.components[i].oid)
			return (false);
		if (!globMatch(this.components[i].value,
		    other.components[i].value)) {
			return (false);
		}
	}
	return (true);
};

Identity.forHost = function (hostname) {
	assert.string(hostname, 'hostname');
	return (new Identity({
		type: 'host',
		hostname: hostname,
		components: [ { name: 'cn', value: hostname } ]
	}));
};

Identity.forUser = function (uid) {
	assert.string(uid, 'uid');
	return (new Identity({
		type: 'user',
		uid: uid,
		components: [ { name: 'uid', value: uid } ]
	}));
};

Identity.forEmail = function (email) {
	assert.string(email, 'email');
	return (new Identity({
		type: 'email',
		email: email,
		components: [ { name: 'mail', value: email } ]
	}));
};

Identity.parseDN = function (dn) {
	assert.string(dn, 'dn');
	var parts = [''];
	var idx = 0;
	var rem = dn;
	while (rem.length > 0) {
		var m;
		/*JSSTYLED*/
		if ((m = /^,/.exec(rem)) !== null) {
			parts[++idx] = '';
			rem = rem.slice(m[0].length);
		/*JSSTYLED*/
		} else if ((m = /^\\,/.exec(rem)) !== null) {
			parts[idx] += ',';
			rem = rem.slice(m[0].length);
		/*JSSTYLED*/
		} else if ((m = /^\\./.exec(rem)) !== null) {
			parts[idx] += m[0];
			rem = rem.slice(m[0].length);
		/*JSSTYLED*/
		} else if ((m = /^[^\\,]+/.exec(rem)) !== null) {
			parts[idx] += m[0];
			rem = rem.slice(m[0].length);
		} else {
			throw (new Error('Failed to parse DN'));
		}
	}
	var cmps = parts.map(function (c) {
		c = c.trim();
		var eqPos = c.indexOf('=');
		while (eqPos > 0 && c.charAt(eqPos - 1) === '\\')
			eqPos = c.indexOf('=', eqPos + 1);
		if (eqPos === -1) {
			throw (new Error('Failed to parse DN'));
		}
		/*JSSTYLED*/
		var name = c.slice(0, eqPos).toLowerCase().replace(/\\=/g, '=');
		var value = c.slice(eqPos + 1);
		return ({ name: name, value: value });
	});
	return (new Identity({ components: cmps }));
};

Identity.fromArray = function (components) {
	assert.arrayOfObject(components, 'components');
	components.forEach(function (cmp) {
		assert.object(cmp, 'component');
		assert.string(cmp.name, 'component.name');
		if (!Buffer.isBuffer(cmp.value) &&
		    !(typeof (cmp.value) === 'string')) {
			throw (new Error('Invalid component value'));
		}
	});
	return (new Identity({ components: components }));
};

Identity.parseAsn1 = function (der, top) {
	var components = [];
	der.readSequence(top);
	var end = der.offset + der.length;
	while (der.offset < end) {
		der.readSequence(asn1.Ber.Constructor | asn1.Ber.Set);
		var after = der.offset + der.length;
		der.readSequence();
		var oid = der.readOID();
		var type = der.peek();
		var value;
		switch (type) {
		case asn1.Ber.PrintableString:
		case asn1.Ber.IA5String:
		case asn1.Ber.OctetString:
		case asn1.Ber.T61String:
			value = der.readString(type);
			break;
		case asn1.Ber.Utf8String:
			value = der.readString(type, true);
			value = value.toString('utf8');
			break;
		case asn1.Ber.CharacterString:
		case asn1.Ber.BMPString:
			value = der.readString(type, true);
			value = value.toString('utf16le');
			break;
		default:
			throw (new Error('Unknown asn1 type ' + type));
		}
		components.push({ oid: oid, asn1type: type, value: value });
		der._offset = after;
	}
	der._offset = end;
	return (new Identity({
		components: components
	}));
};

Identity.isIdentity = function (obj, ver) {
	return (utils.isCompatible(obj, Identity, ver));
};

/*
 * API versions for Identity:
 * [1,0] -- initial ver
 */
Identity.prototype._sshpkApiVersion = [1, 0];

Identity._oldVersionDetect = function (obj) {
	return ([1, 0]);
};


/***/ }),

/***/ 7022:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

var Key = __nccwpck_require__(6814);
var Fingerprint = __nccwpck_require__(3079);
var Signature = __nccwpck_require__(1394);
var PrivateKey = __nccwpck_require__(9602);
var Certificate = __nccwpck_require__(7406);
var Identity = __nccwpck_require__(508);
var errs = __nccwpck_require__(7979);

module.exports = {
	/* top-level classes */
	Key: Key,
	parseKey: Key.parse,
	Fingerprint: Fingerprint,
	parseFingerprint: Fingerprint.parse,
	Signature: Signature,
	parseSignature: Signature.parse,
	PrivateKey: PrivateKey,
	parsePrivateKey: PrivateKey.parse,
	generatePrivateKey: PrivateKey.generate,
	Certificate: Certificate,
	parseCertificate: Certificate.parse,
	createSelfSignedCertificate: Certificate.createSelfSigned,
	createCertificate: Certificate.create,
	Identity: Identity,
	identityFromDN: Identity.parseDN,
	identityForHost: Identity.forHost,
	identityForUser: Identity.forUser,
	identityForEmail: Identity.forEmail,
	identityFromArray: Identity.fromArray,

	/* errors */
	FingerprintFormatError: errs.FingerprintFormatError,
	InvalidAlgorithmError: errs.InvalidAlgorithmError,
	KeyParseError: errs.KeyParseError,
	SignatureParseError: errs.SignatureParseError,
	KeyEncryptedError: errs.KeyEncryptedError,
	CertificateParseError: errs.CertificateParseError
};


/***/ }),

/***/ 6814:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2018 Joyent, Inc.

module.exports = Key;

var assert = __nccwpck_require__(6631);
var algs = __nccwpck_require__(6126);
var crypto = __nccwpck_require__(6417);
var Fingerprint = __nccwpck_require__(3079);
var Signature = __nccwpck_require__(1394);
var DiffieHellman = __nccwpck_require__(7602).DiffieHellman;
var errs = __nccwpck_require__(7979);
var utils = __nccwpck_require__(575);
var PrivateKey = __nccwpck_require__(9602);
var edCompat;

try {
	edCompat = __nccwpck_require__(4694);
} catch (e) {
	/* Just continue through, and bail out if we try to use it. */
}

var InvalidAlgorithmError = errs.InvalidAlgorithmError;
var KeyParseError = errs.KeyParseError;

var formats = {};
formats['auto'] = __nccwpck_require__(8243);
formats['pem'] = __nccwpck_require__(4324);
formats['pkcs1'] = __nccwpck_require__(9367);
formats['pkcs8'] = __nccwpck_require__(4173);
formats['rfc4253'] = __nccwpck_require__(8688);
formats['ssh'] = __nccwpck_require__(8927);
formats['ssh-private'] = __nccwpck_require__(3923);
formats['openssh'] = formats['ssh-private'];
formats['dnssec'] = __nccwpck_require__(3561);
formats['putty'] = __nccwpck_require__(974);
formats['ppk'] = formats['putty'];

function Key(opts) {
	assert.object(opts, 'options');
	assert.arrayOfObject(opts.parts, 'options.parts');
	assert.string(opts.type, 'options.type');
	assert.optionalString(opts.comment, 'options.comment');

	var algInfo = algs.info[opts.type];
	if (typeof (algInfo) !== 'object')
		throw (new InvalidAlgorithmError(opts.type));

	var partLookup = {};
	for (var i = 0; i < opts.parts.length; ++i) {
		var part = opts.parts[i];
		partLookup[part.name] = part;
	}

	this.type = opts.type;
	this.parts = opts.parts;
	this.part = partLookup;
	this.comment = undefined;
	this.source = opts.source;

	/* for speeding up hashing/fingerprint operations */
	this._rfc4253Cache = opts._rfc4253Cache;
	this._hashCache = {};

	var sz;
	this.curve = undefined;
	if (this.type === 'ecdsa') {
		var curve = this.part.curve.data.toString();
		this.curve = curve;
		sz = algs.curves[curve].size;
	} else if (this.type === 'ed25519' || this.type === 'curve25519') {
		sz = 256;
		this.curve = 'curve25519';
	} else {
		var szPart = this.part[algInfo.sizePart];
		sz = szPart.data.length;
		sz = sz * 8 - utils.countZeros(szPart.data);
	}
	this.size = sz;
}

Key.formats = formats;

Key.prototype.toBuffer = function (format, options) {
	if (format === undefined)
		format = 'ssh';
	assert.string(format, 'format');
	assert.object(formats[format], 'formats[format]');
	assert.optionalObject(options, 'options');

	if (format === 'rfc4253') {
		if (this._rfc4253Cache === undefined)
			this._rfc4253Cache = formats['rfc4253'].write(this);
		return (this._rfc4253Cache);
	}

	return (formats[format].write(this, options));
};

Key.prototype.toString = function (format, options) {
	return (this.toBuffer(format, options).toString());
};

Key.prototype.hash = function (algo, type) {
	assert.string(algo, 'algorithm');
	assert.optionalString(type, 'type');
	if (type === undefined)
		type = 'ssh';
	algo = algo.toLowerCase();
	if (algs.hashAlgs[algo] === undefined)
		throw (new InvalidAlgorithmError(algo));

	var cacheKey = algo + '||' + type;
	if (this._hashCache[cacheKey])
		return (this._hashCache[cacheKey]);

	var buf;
	if (type === 'ssh') {
		buf = this.toBuffer('rfc4253');
	} else if (type === 'spki') {
		buf = formats.pkcs8.pkcs8ToBuffer(this);
	} else {
		throw (new Error('Hash type ' + type + ' not supported'));
	}
	var hash = crypto.createHash(algo).update(buf).digest();
	this._hashCache[cacheKey] = hash;
	return (hash);
};

Key.prototype.fingerprint = function (algo, type) {
	if (algo === undefined)
		algo = 'sha256';
	if (type === undefined)
		type = 'ssh';
	assert.string(algo, 'algorithm');
	assert.string(type, 'type');
	var opts = {
		type: 'key',
		hash: this.hash(algo, type),
		algorithm: algo,
		hashType: type
	};
	return (new Fingerprint(opts));
};

Key.prototype.defaultHashAlgorithm = function () {
	var hashAlgo = 'sha1';
	if (this.type === 'rsa')
		hashAlgo = 'sha256';
	if (this.type === 'dsa' && this.size > 1024)
		hashAlgo = 'sha256';
	if (this.type === 'ed25519')
		hashAlgo = 'sha512';
	if (this.type === 'ecdsa') {
		if (this.size <= 256)
			hashAlgo = 'sha256';
		else if (this.size <= 384)
			hashAlgo = 'sha384';
		else
			hashAlgo = 'sha512';
	}
	return (hashAlgo);
};

Key.prototype.createVerify = function (hashAlgo) {
	if (hashAlgo === undefined)
		hashAlgo = this.defaultHashAlgorithm();
	assert.string(hashAlgo, 'hash algorithm');

	/* ED25519 is not supported by OpenSSL, use a javascript impl. */
	if (this.type === 'ed25519' && edCompat !== undefined)
		return (new edCompat.Verifier(this, hashAlgo));
	if (this.type === 'curve25519')
		throw (new Error('Curve25519 keys are not suitable for ' +
		    'signing or verification'));

	var v, nm, err;
	try {
		nm = hashAlgo.toUpperCase();
		v = crypto.createVerify(nm);
	} catch (e) {
		err = e;
	}
	if (v === undefined || (err instanceof Error &&
	    err.message.match(/Unknown message digest/))) {
		nm = 'RSA-';
		nm += hashAlgo.toUpperCase();
		v = crypto.createVerify(nm);
	}
	assert.ok(v, 'failed to create verifier');
	var oldVerify = v.verify.bind(v);
	var key = this.toBuffer('pkcs8');
	var curve = this.curve;
	var self = this;
	v.verify = function (signature, fmt) {
		if (Signature.isSignature(signature, [2, 0])) {
			if (signature.type !== self.type)
				return (false);
			if (signature.hashAlgorithm &&
			    signature.hashAlgorithm !== hashAlgo)
				return (false);
			if (signature.curve && self.type === 'ecdsa' &&
			    signature.curve !== curve)
				return (false);
			return (oldVerify(key, signature.toBuffer('asn1')));

		} else if (typeof (signature) === 'string' ||
		    Buffer.isBuffer(signature)) {
			return (oldVerify(key, signature, fmt));

		/*
		 * Avoid doing this on valid arguments, walking the prototype
		 * chain can be quite slow.
		 */
		} else if (Signature.isSignature(signature, [1, 0])) {
			throw (new Error('signature was created by too old ' +
			    'a version of sshpk and cannot be verified'));

		} else {
			throw (new TypeError('signature must be a string, ' +
			    'Buffer, or Signature object'));
		}
	};
	return (v);
};

Key.prototype.createDiffieHellman = function () {
	if (this.type === 'rsa')
		throw (new Error('RSA keys do not support Diffie-Hellman'));

	return (new DiffieHellman(this));
};
Key.prototype.createDH = Key.prototype.createDiffieHellman;

Key.parse = function (data, format, options) {
	if (typeof (data) !== 'string')
		assert.buffer(data, 'data');
	if (format === undefined)
		format = 'auto';
	assert.string(format, 'format');
	if (typeof (options) === 'string')
		options = { filename: options };
	assert.optionalObject(options, 'options');
	if (options === undefined)
		options = {};
	assert.optionalString(options.filename, 'options.filename');
	if (options.filename === undefined)
		options.filename = '(unnamed)';

	assert.object(formats[format], 'formats[format]');

	try {
		var k = formats[format].read(data, options);
		if (k instanceof PrivateKey)
			k = k.toPublic();
		if (!k.comment)
			k.comment = options.filename;
		return (k);
	} catch (e) {
		if (e.name === 'KeyEncryptedError')
			throw (e);
		throw (new KeyParseError(options.filename, format, e));
	}
};

Key.isKey = function (obj, ver) {
	return (utils.isCompatible(obj, Key, ver));
};

/*
 * API versions for Key:
 * [1,0] -- initial ver, may take Signature for createVerify or may not
 * [1,1] -- added pkcs1, pkcs8 formats
 * [1,2] -- added auto, ssh-private, openssh formats
 * [1,3] -- added defaultHashAlgorithm
 * [1,4] -- added ed support, createDH
 * [1,5] -- first explicitly tagged version
 * [1,6] -- changed ed25519 part names
 * [1,7] -- spki hash types
 */
Key.prototype._sshpkApiVersion = [1, 7];

Key._oldVersionDetect = function (obj) {
	assert.func(obj.toBuffer);
	assert.func(obj.fingerprint);
	if (obj.createDH)
		return ([1, 4]);
	if (obj.defaultHashAlgorithm)
		return ([1, 3]);
	if (obj.formats['auto'])
		return ([1, 2]);
	if (obj.formats['pkcs1'])
		return ([1, 1]);
	return ([1, 0]);
};


/***/ }),

/***/ 9602:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2017 Joyent, Inc.

module.exports = PrivateKey;

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var crypto = __nccwpck_require__(6417);
var Fingerprint = __nccwpck_require__(3079);
var Signature = __nccwpck_require__(1394);
var errs = __nccwpck_require__(7979);
var util = __nccwpck_require__(1669);
var utils = __nccwpck_require__(575);
var dhe = __nccwpck_require__(7602);
var generateECDSA = dhe.generateECDSA;
var generateED25519 = dhe.generateED25519;
var edCompat = __nccwpck_require__(4694);
var nacl = __nccwpck_require__(8729);

var Key = __nccwpck_require__(6814);

var InvalidAlgorithmError = errs.InvalidAlgorithmError;
var KeyParseError = errs.KeyParseError;
var KeyEncryptedError = errs.KeyEncryptedError;

var formats = {};
formats['auto'] = __nccwpck_require__(8243);
formats['pem'] = __nccwpck_require__(4324);
formats['pkcs1'] = __nccwpck_require__(9367);
formats['pkcs8'] = __nccwpck_require__(4173);
formats['rfc4253'] = __nccwpck_require__(8688);
formats['ssh-private'] = __nccwpck_require__(3923);
formats['openssh'] = formats['ssh-private'];
formats['ssh'] = formats['ssh-private'];
formats['dnssec'] = __nccwpck_require__(3561);

function PrivateKey(opts) {
	assert.object(opts, 'options');
	Key.call(this, opts);

	this._pubCache = undefined;
}
util.inherits(PrivateKey, Key);

PrivateKey.formats = formats;

PrivateKey.prototype.toBuffer = function (format, options) {
	if (format === undefined)
		format = 'pkcs1';
	assert.string(format, 'format');
	assert.object(formats[format], 'formats[format]');
	assert.optionalObject(options, 'options');

	return (formats[format].write(this, options));
};

PrivateKey.prototype.hash = function (algo, type) {
	return (this.toPublic().hash(algo, type));
};

PrivateKey.prototype.fingerprint = function (algo, type) {
	return (this.toPublic().fingerprint(algo, type));
};

PrivateKey.prototype.toPublic = function () {
	if (this._pubCache)
		return (this._pubCache);

	var algInfo = algs.info[this.type];
	var pubParts = [];
	for (var i = 0; i < algInfo.parts.length; ++i) {
		var p = algInfo.parts[i];
		pubParts.push(this.part[p]);
	}

	this._pubCache = new Key({
		type: this.type,
		source: this,
		parts: pubParts
	});
	if (this.comment)
		this._pubCache.comment = this.comment;
	return (this._pubCache);
};

PrivateKey.prototype.derive = function (newType) {
	assert.string(newType, 'type');
	var priv, pub, pair;

	if (this.type === 'ed25519' && newType === 'curve25519') {
		priv = this.part.k.data;
		if (priv[0] === 0x00)
			priv = priv.slice(1);

		pair = nacl.box.keyPair.fromSecretKey(new Uint8Array(priv));
		pub = Buffer.from(pair.publicKey);

		return (new PrivateKey({
			type: 'curve25519',
			parts: [
				{ name: 'A', data: utils.mpNormalize(pub) },
				{ name: 'k', data: utils.mpNormalize(priv) }
			]
		}));
	} else if (this.type === 'curve25519' && newType === 'ed25519') {
		priv = this.part.k.data;
		if (priv[0] === 0x00)
			priv = priv.slice(1);

		pair = nacl.sign.keyPair.fromSeed(new Uint8Array(priv));
		pub = Buffer.from(pair.publicKey);

		return (new PrivateKey({
			type: 'ed25519',
			parts: [
				{ name: 'A', data: utils.mpNormalize(pub) },
				{ name: 'k', data: utils.mpNormalize(priv) }
			]
		}));
	}
	throw (new Error('Key derivation not supported from ' + this.type +
	    ' to ' + newType));
};

PrivateKey.prototype.createVerify = function (hashAlgo) {
	return (this.toPublic().createVerify(hashAlgo));
};

PrivateKey.prototype.createSign = function (hashAlgo) {
	if (hashAlgo === undefined)
		hashAlgo = this.defaultHashAlgorithm();
	assert.string(hashAlgo, 'hash algorithm');

	/* ED25519 is not supported by OpenSSL, use a javascript impl. */
	if (this.type === 'ed25519' && edCompat !== undefined)
		return (new edCompat.Signer(this, hashAlgo));
	if (this.type === 'curve25519')
		throw (new Error('Curve25519 keys are not suitable for ' +
		    'signing or verification'));

	var v, nm, err;
	try {
		nm = hashAlgo.toUpperCase();
		v = crypto.createSign(nm);
	} catch (e) {
		err = e;
	}
	if (v === undefined || (err instanceof Error &&
	    err.message.match(/Unknown message digest/))) {
		nm = 'RSA-';
		nm += hashAlgo.toUpperCase();
		v = crypto.createSign(nm);
	}
	assert.ok(v, 'failed to create verifier');
	var oldSign = v.sign.bind(v);
	var key = this.toBuffer('pkcs1');
	var type = this.type;
	var curve = this.curve;
	v.sign = function () {
		var sig = oldSign(key);
		if (typeof (sig) === 'string')
			sig = Buffer.from(sig, 'binary');
		sig = Signature.parse(sig, type, 'asn1');
		sig.hashAlgorithm = hashAlgo;
		sig.curve = curve;
		return (sig);
	};
	return (v);
};

PrivateKey.parse = function (data, format, options) {
	if (typeof (data) !== 'string')
		assert.buffer(data, 'data');
	if (format === undefined)
		format = 'auto';
	assert.string(format, 'format');
	if (typeof (options) === 'string')
		options = { filename: options };
	assert.optionalObject(options, 'options');
	if (options === undefined)
		options = {};
	assert.optionalString(options.filename, 'options.filename');
	if (options.filename === undefined)
		options.filename = '(unnamed)';

	assert.object(formats[format], 'formats[format]');

	try {
		var k = formats[format].read(data, options);
		assert.ok(k instanceof PrivateKey, 'key is not a private key');
		if (!k.comment)
			k.comment = options.filename;
		return (k);
	} catch (e) {
		if (e.name === 'KeyEncryptedError')
			throw (e);
		throw (new KeyParseError(options.filename, format, e));
	}
};

PrivateKey.isPrivateKey = function (obj, ver) {
	return (utils.isCompatible(obj, PrivateKey, ver));
};

PrivateKey.generate = function (type, options) {
	if (options === undefined)
		options = {};
	assert.object(options, 'options');

	switch (type) {
	case 'ecdsa':
		if (options.curve === undefined)
			options.curve = 'nistp256';
		assert.string(options.curve, 'options.curve');
		return (generateECDSA(options.curve));
	case 'ed25519':
		return (generateED25519());
	default:
		throw (new Error('Key generation not supported with key ' +
		    'type "' + type + '"'));
	}
};

/*
 * API versions for PrivateKey:
 * [1,0] -- initial ver
 * [1,1] -- added auto, pkcs[18], openssh/ssh-private formats
 * [1,2] -- added defaultHashAlgorithm
 * [1,3] -- added derive, ed, createDH
 * [1,4] -- first tagged version
 * [1,5] -- changed ed25519 part names and format
 * [1,6] -- type arguments for hash() and fingerprint()
 */
PrivateKey.prototype._sshpkApiVersion = [1, 6];

PrivateKey._oldVersionDetect = function (obj) {
	assert.func(obj.toPublic);
	assert.func(obj.createSign);
	if (obj.derive)
		return ([1, 3]);
	if (obj.defaultHashAlgorithm)
		return ([1, 2]);
	if (obj.formats['auto'])
		return ([1, 1]);
	return ([1, 0]);
};


/***/ }),

/***/ 1394:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

module.exports = Signature;

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var algs = __nccwpck_require__(6126);
var crypto = __nccwpck_require__(6417);
var errs = __nccwpck_require__(7979);
var utils = __nccwpck_require__(575);
var asn1 = __nccwpck_require__(970);
var SSHBuffer = __nccwpck_require__(5621);

var InvalidAlgorithmError = errs.InvalidAlgorithmError;
var SignatureParseError = errs.SignatureParseError;

function Signature(opts) {
	assert.object(opts, 'options');
	assert.arrayOfObject(opts.parts, 'options.parts');
	assert.string(opts.type, 'options.type');

	var partLookup = {};
	for (var i = 0; i < opts.parts.length; ++i) {
		var part = opts.parts[i];
		partLookup[part.name] = part;
	}

	this.type = opts.type;
	this.hashAlgorithm = opts.hashAlgo;
	this.curve = opts.curve;
	this.parts = opts.parts;
	this.part = partLookup;
}

Signature.prototype.toBuffer = function (format) {
	if (format === undefined)
		format = 'asn1';
	assert.string(format, 'format');

	var buf;
	var stype = 'ssh-' + this.type;

	switch (this.type) {
	case 'rsa':
		switch (this.hashAlgorithm) {
		case 'sha256':
			stype = 'rsa-sha2-256';
			break;
		case 'sha512':
			stype = 'rsa-sha2-512';
			break;
		case 'sha1':
		case undefined:
			break;
		default:
			throw (new Error('SSH signature ' +
			    'format does not support hash ' +
			    'algorithm ' + this.hashAlgorithm));
		}
		if (format === 'ssh') {
			buf = new SSHBuffer({});
			buf.writeString(stype);
			buf.writePart(this.part.sig);
			return (buf.toBuffer());
		} else {
			return (this.part.sig.data);
		}
		break;

	case 'ed25519':
		if (format === 'ssh') {
			buf = new SSHBuffer({});
			buf.writeString(stype);
			buf.writePart(this.part.sig);
			return (buf.toBuffer());
		} else {
			return (this.part.sig.data);
		}
		break;

	case 'dsa':
	case 'ecdsa':
		var r, s;
		if (format === 'asn1') {
			var der = new asn1.BerWriter();
			der.startSequence();
			r = utils.mpNormalize(this.part.r.data);
			s = utils.mpNormalize(this.part.s.data);
			der.writeBuffer(r, asn1.Ber.Integer);
			der.writeBuffer(s, asn1.Ber.Integer);
			der.endSequence();
			return (der.buffer);
		} else if (format === 'ssh' && this.type === 'dsa') {
			buf = new SSHBuffer({});
			buf.writeString('ssh-dss');
			r = this.part.r.data;
			if (r.length > 20 && r[0] === 0x00)
				r = r.slice(1);
			s = this.part.s.data;
			if (s.length > 20 && s[0] === 0x00)
				s = s.slice(1);
			if ((this.hashAlgorithm &&
			    this.hashAlgorithm !== 'sha1') ||
			    r.length + s.length !== 40) {
				throw (new Error('OpenSSH only supports ' +
				    'DSA signatures with SHA1 hash'));
			}
			buf.writeBuffer(Buffer.concat([r, s]));
			return (buf.toBuffer());
		} else if (format === 'ssh' && this.type === 'ecdsa') {
			var inner = new SSHBuffer({});
			r = this.part.r.data;
			inner.writeBuffer(r);
			inner.writePart(this.part.s);

			buf = new SSHBuffer({});
			/* XXX: find a more proper way to do this? */
			var curve;
			if (r[0] === 0x00)
				r = r.slice(1);
			var sz = r.length * 8;
			if (sz === 256)
				curve = 'nistp256';
			else if (sz === 384)
				curve = 'nistp384';
			else if (sz === 528)
				curve = 'nistp521';
			buf.writeString('ecdsa-sha2-' + curve);
			buf.writeBuffer(inner.toBuffer());
			return (buf.toBuffer());
		}
		throw (new Error('Invalid signature format'));
	default:
		throw (new Error('Invalid signature data'));
	}
};

Signature.prototype.toString = function (format) {
	assert.optionalString(format, 'format');
	return (this.toBuffer(format).toString('base64'));
};

Signature.parse = function (data, type, format) {
	if (typeof (data) === 'string')
		data = Buffer.from(data, 'base64');
	assert.buffer(data, 'data');
	assert.string(format, 'format');
	assert.string(type, 'type');

	var opts = {};
	opts.type = type.toLowerCase();
	opts.parts = [];

	try {
		assert.ok(data.length > 0, 'signature must not be empty');
		switch (opts.type) {
		case 'rsa':
			return (parseOneNum(data, type, format, opts));
		case 'ed25519':
			return (parseOneNum(data, type, format, opts));

		case 'dsa':
		case 'ecdsa':
			if (format === 'asn1')
				return (parseDSAasn1(data, type, format, opts));
			else if (opts.type === 'dsa')
				return (parseDSA(data, type, format, opts));
			else
				return (parseECDSA(data, type, format, opts));

		default:
			throw (new InvalidAlgorithmError(type));
		}

	} catch (e) {
		if (e instanceof InvalidAlgorithmError)
			throw (e);
		throw (new SignatureParseError(type, format, e));
	}
};

function parseOneNum(data, type, format, opts) {
	if (format === 'ssh') {
		try {
			var buf = new SSHBuffer({buffer: data});
			var head = buf.readString();
		} catch (e) {
			/* fall through */
		}
		if (buf !== undefined) {
			var msg = 'SSH signature does not match expected ' +
			    'type (expected ' + type + ', got ' + head + ')';
			switch (head) {
			case 'ssh-rsa':
				assert.strictEqual(type, 'rsa', msg);
				opts.hashAlgo = 'sha1';
				break;
			case 'rsa-sha2-256':
				assert.strictEqual(type, 'rsa', msg);
				opts.hashAlgo = 'sha256';
				break;
			case 'rsa-sha2-512':
				assert.strictEqual(type, 'rsa', msg);
				opts.hashAlgo = 'sha512';
				break;
			case 'ssh-ed25519':
				assert.strictEqual(type, 'ed25519', msg);
				opts.hashAlgo = 'sha512';
				break;
			default:
				throw (new Error('Unknown SSH signature ' +
				    'type: ' + head));
			}
			var sig = buf.readPart();
			assert.ok(buf.atEnd(), 'extra trailing bytes');
			sig.name = 'sig';
			opts.parts.push(sig);
			return (new Signature(opts));
		}
	}
	opts.parts.push({name: 'sig', data: data});
	return (new Signature(opts));
}

function parseDSAasn1(data, type, format, opts) {
	var der = new asn1.BerReader(data);
	der.readSequence();
	var r = der.readString(asn1.Ber.Integer, true);
	var s = der.readString(asn1.Ber.Integer, true);

	opts.parts.push({name: 'r', data: utils.mpNormalize(r)});
	opts.parts.push({name: 's', data: utils.mpNormalize(s)});

	return (new Signature(opts));
}

function parseDSA(data, type, format, opts) {
	if (data.length != 40) {
		var buf = new SSHBuffer({buffer: data});
		var d = buf.readBuffer();
		if (d.toString('ascii') === 'ssh-dss')
			d = buf.readBuffer();
		assert.ok(buf.atEnd(), 'extra trailing bytes');
		assert.strictEqual(d.length, 40, 'invalid inner length');
		data = d;
	}
	opts.parts.push({name: 'r', data: data.slice(0, 20)});
	opts.parts.push({name: 's', data: data.slice(20, 40)});
	return (new Signature(opts));
}

function parseECDSA(data, type, format, opts) {
	var buf = new SSHBuffer({buffer: data});

	var r, s;
	var inner = buf.readBuffer();
	var stype = inner.toString('ascii');
	if (stype.slice(0, 6) === 'ecdsa-') {
		var parts = stype.split('-');
		assert.strictEqual(parts[0], 'ecdsa');
		assert.strictEqual(parts[1], 'sha2');
		opts.curve = parts[2];
		switch (opts.curve) {
		case 'nistp256':
			opts.hashAlgo = 'sha256';
			break;
		case 'nistp384':
			opts.hashAlgo = 'sha384';
			break;
		case 'nistp521':
			opts.hashAlgo = 'sha512';
			break;
		default:
			throw (new Error('Unsupported ECDSA curve: ' +
			    opts.curve));
		}
		inner = buf.readBuffer();
		assert.ok(buf.atEnd(), 'extra trailing bytes on outer');
		buf = new SSHBuffer({buffer: inner});
		r = buf.readPart();
	} else {
		r = {data: inner};
	}

	s = buf.readPart();
	assert.ok(buf.atEnd(), 'extra trailing bytes');

	r.name = 'r';
	s.name = 's';

	opts.parts.push(r);
	opts.parts.push(s);
	return (new Signature(opts));
}

Signature.isSignature = function (obj, ver) {
	return (utils.isCompatible(obj, Signature, ver));
};

/*
 * API versions for Signature:
 * [1,0] -- initial ver
 * [2,0] -- support for rsa in full ssh format, compat with sshpk-agent
 *          hashAlgorithm property
 * [2,1] -- first tagged version
 */
Signature.prototype._sshpkApiVersion = [2, 1];

Signature._oldVersionDetect = function (obj) {
	assert.func(obj.toBuffer);
	if (obj.hasOwnProperty('hashAlgorithm'))
		return ([2, 0]);
	return ([1, 0]);
};


/***/ }),

/***/ 5621:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

module.exports = SSHBuffer;

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;

function SSHBuffer(opts) {
	assert.object(opts, 'options');
	if (opts.buffer !== undefined)
		assert.buffer(opts.buffer, 'options.buffer');

	this._size = opts.buffer ? opts.buffer.length : 1024;
	this._buffer = opts.buffer || Buffer.alloc(this._size);
	this._offset = 0;
}

SSHBuffer.prototype.toBuffer = function () {
	return (this._buffer.slice(0, this._offset));
};

SSHBuffer.prototype.atEnd = function () {
	return (this._offset >= this._buffer.length);
};

SSHBuffer.prototype.remainder = function () {
	return (this._buffer.slice(this._offset));
};

SSHBuffer.prototype.skip = function (n) {
	this._offset += n;
};

SSHBuffer.prototype.expand = function () {
	this._size *= 2;
	var buf = Buffer.alloc(this._size);
	this._buffer.copy(buf, 0);
	this._buffer = buf;
};

SSHBuffer.prototype.readPart = function () {
	return ({data: this.readBuffer()});
};

SSHBuffer.prototype.readBuffer = function () {
	var len = this._buffer.readUInt32BE(this._offset);
	this._offset += 4;
	assert.ok(this._offset + len <= this._buffer.length,
	    'length out of bounds at +0x' + this._offset.toString(16) +
	    ' (data truncated?)');
	var buf = this._buffer.slice(this._offset, this._offset + len);
	this._offset += len;
	return (buf);
};

SSHBuffer.prototype.readString = function () {
	return (this.readBuffer().toString());
};

SSHBuffer.prototype.readCString = function () {
	var offset = this._offset;
	while (offset < this._buffer.length &&
	    this._buffer[offset] !== 0x00)
		offset++;
	assert.ok(offset < this._buffer.length, 'c string does not terminate');
	var str = this._buffer.slice(this._offset, offset).toString();
	this._offset = offset + 1;
	return (str);
};

SSHBuffer.prototype.readInt = function () {
	var v = this._buffer.readUInt32BE(this._offset);
	this._offset += 4;
	return (v);
};

SSHBuffer.prototype.readInt64 = function () {
	assert.ok(this._offset + 8 < this._buffer.length,
	    'buffer not long enough to read Int64');
	var v = this._buffer.slice(this._offset, this._offset + 8);
	this._offset += 8;
	return (v);
};

SSHBuffer.prototype.readChar = function () {
	var v = this._buffer[this._offset++];
	return (v);
};

SSHBuffer.prototype.writeBuffer = function (buf) {
	while (this._offset + 4 + buf.length > this._size)
		this.expand();
	this._buffer.writeUInt32BE(buf.length, this._offset);
	this._offset += 4;
	buf.copy(this._buffer, this._offset);
	this._offset += buf.length;
};

SSHBuffer.prototype.writeString = function (str) {
	this.writeBuffer(Buffer.from(str, 'utf8'));
};

SSHBuffer.prototype.writeCString = function (str) {
	while (this._offset + 1 + str.length > this._size)
		this.expand();
	this._buffer.write(str, this._offset);
	this._offset += str.length;
	this._buffer[this._offset++] = 0;
};

SSHBuffer.prototype.writeInt = function (v) {
	while (this._offset + 4 > this._size)
		this.expand();
	this._buffer.writeUInt32BE(v, this._offset);
	this._offset += 4;
};

SSHBuffer.prototype.writeInt64 = function (v) {
	assert.buffer(v, 'value');
	if (v.length > 8) {
		var lead = v.slice(0, v.length - 8);
		for (var i = 0; i < lead.length; ++i) {
			assert.strictEqual(lead[i], 0,
			    'must fit in 64 bits of precision');
		}
		v = v.slice(v.length - 8, v.length);
	}
	while (this._offset + 8 > this._size)
		this.expand();
	v.copy(this._buffer, this._offset);
	this._offset += 8;
};

SSHBuffer.prototype.writeChar = function (v) {
	while (this._offset + 1 > this._size)
		this.expand();
	this._buffer[this._offset++] = v;
};

SSHBuffer.prototype.writePart = function (p) {
	this.writeBuffer(p.data);
};

SSHBuffer.prototype.write = function (buf) {
	while (this._offset + buf.length > this._size)
		this.expand();
	buf.copy(this._buffer, this._offset);
	this._offset += buf.length;
};


/***/ }),

/***/ 575:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2015 Joyent, Inc.

module.exports = {
	bufferSplit: bufferSplit,
	addRSAMissing: addRSAMissing,
	calculateDSAPublic: calculateDSAPublic,
	calculateED25519Public: calculateED25519Public,
	calculateX25519Public: calculateX25519Public,
	mpNormalize: mpNormalize,
	mpDenormalize: mpDenormalize,
	ecNormalize: ecNormalize,
	countZeros: countZeros,
	assertCompatible: assertCompatible,
	isCompatible: isCompatible,
	opensslKeyDeriv: opensslKeyDeriv,
	opensshCipherInfo: opensshCipherInfo,
	publicFromPrivateECDSA: publicFromPrivateECDSA,
	zeroPadToLength: zeroPadToLength,
	writeBitString: writeBitString,
	readBitString: readBitString,
	pbkdf2: pbkdf2
};

var assert = __nccwpck_require__(6631);
var Buffer = __nccwpck_require__(5118).Buffer;
var PrivateKey = __nccwpck_require__(9602);
var Key = __nccwpck_require__(6814);
var crypto = __nccwpck_require__(6417);
var algs = __nccwpck_require__(6126);
var asn1 = __nccwpck_require__(970);

var ec = __nccwpck_require__(3943);
var jsbn = __nccwpck_require__(5587).BigInteger;
var nacl = __nccwpck_require__(8729);

var MAX_CLASS_DEPTH = 3;

function isCompatible(obj, klass, needVer) {
	if (obj === null || typeof (obj) !== 'object')
		return (false);
	if (needVer === undefined)
		needVer = klass.prototype._sshpkApiVersion;
	if (obj instanceof klass &&
	    klass.prototype._sshpkApiVersion[0] == needVer[0])
		return (true);
	var proto = Object.getPrototypeOf(obj);
	var depth = 0;
	while (proto.constructor.name !== klass.name) {
		proto = Object.getPrototypeOf(proto);
		if (!proto || ++depth > MAX_CLASS_DEPTH)
			return (false);
	}
	if (proto.constructor.name !== klass.name)
		return (false);
	var ver = proto._sshpkApiVersion;
	if (ver === undefined)
		ver = klass._oldVersionDetect(obj);
	if (ver[0] != needVer[0] || ver[1] < needVer[1])
		return (false);
	return (true);
}

function assertCompatible(obj, klass, needVer, name) {
	if (name === undefined)
		name = 'object';
	assert.ok(obj, name + ' must not be null');
	assert.object(obj, name + ' must be an object');
	if (needVer === undefined)
		needVer = klass.prototype._sshpkApiVersion;
	if (obj instanceof klass &&
	    klass.prototype._sshpkApiVersion[0] == needVer[0])
		return;
	var proto = Object.getPrototypeOf(obj);
	var depth = 0;
	while (proto.constructor.name !== klass.name) {
		proto = Object.getPrototypeOf(proto);
		assert.ok(proto && ++depth <= MAX_CLASS_DEPTH,
		    name + ' must be a ' + klass.name + ' instance');
	}
	assert.strictEqual(proto.constructor.name, klass.name,
	    name + ' must be a ' + klass.name + ' instance');
	var ver = proto._sshpkApiVersion;
	if (ver === undefined)
		ver = klass._oldVersionDetect(obj);
	assert.ok(ver[0] == needVer[0] && ver[1] >= needVer[1],
	    name + ' must be compatible with ' + klass.name + ' klass ' +
	    'version ' + needVer[0] + '.' + needVer[1]);
}

var CIPHER_LEN = {
	'des-ede3-cbc': { key: 24, iv: 8 },
	'aes-128-cbc': { key: 16, iv: 16 },
	'aes-256-cbc': { key: 32, iv: 16 }
};
var PKCS5_SALT_LEN = 8;

function opensslKeyDeriv(cipher, salt, passphrase, count) {
	assert.buffer(salt, 'salt');
	assert.buffer(passphrase, 'passphrase');
	assert.number(count, 'iteration count');

	var clen = CIPHER_LEN[cipher];
	assert.object(clen, 'supported cipher');

	salt = salt.slice(0, PKCS5_SALT_LEN);

	var D, D_prev, bufs;
	var material = Buffer.alloc(0);
	while (material.length < clen.key + clen.iv) {
		bufs = [];
		if (D_prev)
			bufs.push(D_prev);
		bufs.push(passphrase);
		bufs.push(salt);
		D = Buffer.concat(bufs);
		for (var j = 0; j < count; ++j)
			D = crypto.createHash('md5').update(D).digest();
		material = Buffer.concat([material, D]);
		D_prev = D;
	}

	return ({
	    key: material.slice(0, clen.key),
	    iv: material.slice(clen.key, clen.key + clen.iv)
	});
}

/* See: RFC2898 */
function pbkdf2(hashAlg, salt, iterations, size, passphrase) {
	var hkey = Buffer.alloc(salt.length + 4);
	salt.copy(hkey);

	var gen = 0, ts = [];
	var i = 1;
	while (gen < size) {
		var t = T(i++);
		gen += t.length;
		ts.push(t);
	}
	return (Buffer.concat(ts).slice(0, size));

	function T(I) {
		hkey.writeUInt32BE(I, hkey.length - 4);

		var hmac = crypto.createHmac(hashAlg, passphrase);
		hmac.update(hkey);

		var Ti = hmac.digest();
		var Uc = Ti;
		var c = 1;
		while (c++ < iterations) {
			hmac = crypto.createHmac(hashAlg, passphrase);
			hmac.update(Uc);
			Uc = hmac.digest();
			for (var x = 0; x < Ti.length; ++x)
				Ti[x] ^= Uc[x];
		}
		return (Ti);
	}
}

/* Count leading zero bits on a buffer */
function countZeros(buf) {
	var o = 0, obit = 8;
	while (o < buf.length) {
		var mask = (1 << obit);
		if ((buf[o] & mask) === mask)
			break;
		obit--;
		if (obit < 0) {
			o++;
			obit = 8;
		}
	}
	return (o*8 + (8 - obit) - 1);
}

function bufferSplit(buf, chr) {
	assert.buffer(buf);
	assert.string(chr);

	var parts = [];
	var lastPart = 0;
	var matches = 0;
	for (var i = 0; i < buf.length; ++i) {
		if (buf[i] === chr.charCodeAt(matches))
			++matches;
		else if (buf[i] === chr.charCodeAt(0))
			matches = 1;
		else
			matches = 0;

		if (matches >= chr.length) {
			var newPart = i + 1;
			parts.push(buf.slice(lastPart, newPart - matches));
			lastPart = newPart;
			matches = 0;
		}
	}
	if (lastPart <= buf.length)
		parts.push(buf.slice(lastPart, buf.length));

	return (parts);
}

function ecNormalize(buf, addZero) {
	assert.buffer(buf);
	if (buf[0] === 0x00 && buf[1] === 0x04) {
		if (addZero)
			return (buf);
		return (buf.slice(1));
	} else if (buf[0] === 0x04) {
		if (!addZero)
			return (buf);
	} else {
		while (buf[0] === 0x00)
			buf = buf.slice(1);
		if (buf[0] === 0x02 || buf[0] === 0x03)
			throw (new Error('Compressed elliptic curve points ' +
			    'are not supported'));
		if (buf[0] !== 0x04)
			throw (new Error('Not a valid elliptic curve point'));
		if (!addZero)
			return (buf);
	}
	var b = Buffer.alloc(buf.length + 1);
	b[0] = 0x0;
	buf.copy(b, 1);
	return (b);
}

function readBitString(der, tag) {
	if (tag === undefined)
		tag = asn1.Ber.BitString;
	var buf = der.readString(tag, true);
	assert.strictEqual(buf[0], 0x00, 'bit strings with unused bits are ' +
	    'not supported (0x' + buf[0].toString(16) + ')');
	return (buf.slice(1));
}

function writeBitString(der, buf, tag) {
	if (tag === undefined)
		tag = asn1.Ber.BitString;
	var b = Buffer.alloc(buf.length + 1);
	b[0] = 0x00;
	buf.copy(b, 1);
	der.writeBuffer(b, tag);
}

function mpNormalize(buf) {
	assert.buffer(buf);
	while (buf.length > 1 && buf[0] === 0x00 && (buf[1] & 0x80) === 0x00)
		buf = buf.slice(1);
	if ((buf[0] & 0x80) === 0x80) {
		var b = Buffer.alloc(buf.length + 1);
		b[0] = 0x00;
		buf.copy(b, 1);
		buf = b;
	}
	return (buf);
}

function mpDenormalize(buf) {
	assert.buffer(buf);
	while (buf.length > 1 && buf[0] === 0x00)
		buf = buf.slice(1);
	return (buf);
}

function zeroPadToLength(buf, len) {
	assert.buffer(buf);
	assert.number(len);
	while (buf.length > len) {
		assert.equal(buf[0], 0x00);
		buf = buf.slice(1);
	}
	while (buf.length < len) {
		var b = Buffer.alloc(buf.length + 1);
		b[0] = 0x00;
		buf.copy(b, 1);
		buf = b;
	}
	return (buf);
}

function bigintToMpBuf(bigint) {
	var buf = Buffer.from(bigint.toByteArray());
	buf = mpNormalize(buf);
	return (buf);
}

function calculateDSAPublic(g, p, x) {
	assert.buffer(g);
	assert.buffer(p);
	assert.buffer(x);
	g = new jsbn(g);
	p = new jsbn(p);
	x = new jsbn(x);
	var y = g.modPow(x, p);
	var ybuf = bigintToMpBuf(y);
	return (ybuf);
}

function calculateED25519Public(k) {
	assert.buffer(k);

	var kp = nacl.sign.keyPair.fromSeed(new Uint8Array(k));
	return (Buffer.from(kp.publicKey));
}

function calculateX25519Public(k) {
	assert.buffer(k);

	var kp = nacl.box.keyPair.fromSeed(new Uint8Array(k));
	return (Buffer.from(kp.publicKey));
}

function addRSAMissing(key) {
	assert.object(key);
	assertCompatible(key, PrivateKey, [1, 1]);

	var d = new jsbn(key.part.d.data);
	var buf;

	if (!key.part.dmodp) {
		var p = new jsbn(key.part.p.data);
		var dmodp = d.mod(p.subtract(1));

		buf = bigintToMpBuf(dmodp);
		key.part.dmodp = {name: 'dmodp', data: buf};
		key.parts.push(key.part.dmodp);
	}
	if (!key.part.dmodq) {
		var q = new jsbn(key.part.q.data);
		var dmodq = d.mod(q.subtract(1));

		buf = bigintToMpBuf(dmodq);
		key.part.dmodq = {name: 'dmodq', data: buf};
		key.parts.push(key.part.dmodq);
	}
}

function publicFromPrivateECDSA(curveName, priv) {
	assert.string(curveName, 'curveName');
	assert.buffer(priv);
	var params = algs.curves[curveName];
	var p = new jsbn(params.p);
	var a = new jsbn(params.a);
	var b = new jsbn(params.b);
	var curve = new ec.ECCurveFp(p, a, b);
	var G = curve.decodePointHex(params.G.toString('hex'));

	var d = new jsbn(mpNormalize(priv));
	var pub = G.multiply(d);
	pub = Buffer.from(curve.encodePointHex(pub), 'hex');

	var parts = [];
	parts.push({name: 'curve', data: Buffer.from(curveName)});
	parts.push({name: 'Q', data: pub});

	var key = new Key({type: 'ecdsa', curve: curve, parts: parts});
	return (key);
}

function opensshCipherInfo(cipher) {
	var inf = {};
	switch (cipher) {
	case '3des-cbc':
		inf.keySize = 24;
		inf.blockSize = 8;
		inf.opensslName = 'des-ede3-cbc';
		break;
	case 'blowfish-cbc':
		inf.keySize = 16;
		inf.blockSize = 8;
		inf.opensslName = 'bf-cbc';
		break;
	case 'aes128-cbc':
	case 'aes128-ctr':
	case 'aes128-gcm@openssh.com':
		inf.keySize = 16;
		inf.blockSize = 16;
		inf.opensslName = 'aes-128-' + cipher.slice(7, 10);
		break;
	case 'aes192-cbc':
	case 'aes192-ctr':
	case 'aes192-gcm@openssh.com':
		inf.keySize = 24;
		inf.blockSize = 16;
		inf.opensslName = 'aes-192-' + cipher.slice(7, 10);
		break;
	case 'aes256-cbc':
	case 'aes256-ctr':
	case 'aes256-gcm@openssh.com':
		inf.keySize = 32;
		inf.blockSize = 16;
		inf.opensslName = 'aes-256-' + cipher.slice(7, 10);
		break;
	default:
		throw (new Error(
		    'Unsupported openssl cipher "' + cipher + '"'));
	}
	return (inf);
}


/***/ }),

/***/ 8729:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

(function(nacl) {
'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

var gf = function(init) {
  var i, r = new Float64Array(16);
  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
  return r;
};

//  Pluggable, initialized in high-level API below.
var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

var _0 = new Uint8Array(16);
var _9 = new Uint8Array(32); _9[0] = 9;

var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function ts64(x, i, h, l) {
  x[i]   = (h >> 24) & 0xff;
  x[i+1] = (h >> 16) & 0xff;
  x[i+2] = (h >>  8) & 0xff;
  x[i+3] = h & 0xff;
  x[i+4] = (l >> 24)  & 0xff;
  x[i+5] = (l >> 16)  & 0xff;
  x[i+6] = (l >>  8)  & 0xff;
  x[i+7] = l & 0xff;
}

function vn(x, xi, y, yi, n) {
  var i,d = 0;
  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
  return (1 & ((d - 1) >>> 8)) - 1;
}

function crypto_verify_16(x, xi, y, yi) {
  return vn(x,xi,y,yi,16);
}

function crypto_verify_32(x, xi, y, yi) {
  return vn(x,xi,y,yi,32);
}

function core_salsa20(o, p, k, c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }
   x0 =  x0 +  j0 | 0;
   x1 =  x1 +  j1 | 0;
   x2 =  x2 +  j2 | 0;
   x3 =  x3 +  j3 | 0;
   x4 =  x4 +  j4 | 0;
   x5 =  x5 +  j5 | 0;
   x6 =  x6 +  j6 | 0;
   x7 =  x7 +  j7 | 0;
   x8 =  x8 +  j8 | 0;
   x9 =  x9 +  j9 | 0;
  x10 = x10 + j10 | 0;
  x11 = x11 + j11 | 0;
  x12 = x12 + j12 | 0;
  x13 = x13 + j13 | 0;
  x14 = x14 + j14 | 0;
  x15 = x15 + j15 | 0;

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x1 >>>  0 & 0xff;
  o[ 5] = x1 >>>  8 & 0xff;
  o[ 6] = x1 >>> 16 & 0xff;
  o[ 7] = x1 >>> 24 & 0xff;

  o[ 8] = x2 >>>  0 & 0xff;
  o[ 9] = x2 >>>  8 & 0xff;
  o[10] = x2 >>> 16 & 0xff;
  o[11] = x2 >>> 24 & 0xff;

  o[12] = x3 >>>  0 & 0xff;
  o[13] = x3 >>>  8 & 0xff;
  o[14] = x3 >>> 16 & 0xff;
  o[15] = x3 >>> 24 & 0xff;

  o[16] = x4 >>>  0 & 0xff;
  o[17] = x4 >>>  8 & 0xff;
  o[18] = x4 >>> 16 & 0xff;
  o[19] = x4 >>> 24 & 0xff;

  o[20] = x5 >>>  0 & 0xff;
  o[21] = x5 >>>  8 & 0xff;
  o[22] = x5 >>> 16 & 0xff;
  o[23] = x5 >>> 24 & 0xff;

  o[24] = x6 >>>  0 & 0xff;
  o[25] = x6 >>>  8 & 0xff;
  o[26] = x6 >>> 16 & 0xff;
  o[27] = x6 >>> 24 & 0xff;

  o[28] = x7 >>>  0 & 0xff;
  o[29] = x7 >>>  8 & 0xff;
  o[30] = x7 >>> 16 & 0xff;
  o[31] = x7 >>> 24 & 0xff;

  o[32] = x8 >>>  0 & 0xff;
  o[33] = x8 >>>  8 & 0xff;
  o[34] = x8 >>> 16 & 0xff;
  o[35] = x8 >>> 24 & 0xff;

  o[36] = x9 >>>  0 & 0xff;
  o[37] = x9 >>>  8 & 0xff;
  o[38] = x9 >>> 16 & 0xff;
  o[39] = x9 >>> 24 & 0xff;

  o[40] = x10 >>>  0 & 0xff;
  o[41] = x10 >>>  8 & 0xff;
  o[42] = x10 >>> 16 & 0xff;
  o[43] = x10 >>> 24 & 0xff;

  o[44] = x11 >>>  0 & 0xff;
  o[45] = x11 >>>  8 & 0xff;
  o[46] = x11 >>> 16 & 0xff;
  o[47] = x11 >>> 24 & 0xff;

  o[48] = x12 >>>  0 & 0xff;
  o[49] = x12 >>>  8 & 0xff;
  o[50] = x12 >>> 16 & 0xff;
  o[51] = x12 >>> 24 & 0xff;

  o[52] = x13 >>>  0 & 0xff;
  o[53] = x13 >>>  8 & 0xff;
  o[54] = x13 >>> 16 & 0xff;
  o[55] = x13 >>> 24 & 0xff;

  o[56] = x14 >>>  0 & 0xff;
  o[57] = x14 >>>  8 & 0xff;
  o[58] = x14 >>> 16 & 0xff;
  o[59] = x14 >>> 24 & 0xff;

  o[60] = x15 >>>  0 & 0xff;
  o[61] = x15 >>>  8 & 0xff;
  o[62] = x15 >>> 16 & 0xff;
  o[63] = x15 >>> 24 & 0xff;
}

function core_hsalsa20(o,p,k,c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x5 >>>  0 & 0xff;
  o[ 5] = x5 >>>  8 & 0xff;
  o[ 6] = x5 >>> 16 & 0xff;
  o[ 7] = x5 >>> 24 & 0xff;

  o[ 8] = x10 >>>  0 & 0xff;
  o[ 9] = x10 >>>  8 & 0xff;
  o[10] = x10 >>> 16 & 0xff;
  o[11] = x10 >>> 24 & 0xff;

  o[12] = x15 >>>  0 & 0xff;
  o[13] = x15 >>>  8 & 0xff;
  o[14] = x15 >>> 16 & 0xff;
  o[15] = x15 >>> 24 & 0xff;

  o[16] = x6 >>>  0 & 0xff;
  o[17] = x6 >>>  8 & 0xff;
  o[18] = x6 >>> 16 & 0xff;
  o[19] = x6 >>> 24 & 0xff;

  o[20] = x7 >>>  0 & 0xff;
  o[21] = x7 >>>  8 & 0xff;
  o[22] = x7 >>> 16 & 0xff;
  o[23] = x7 >>> 24 & 0xff;

  o[24] = x8 >>>  0 & 0xff;
  o[25] = x8 >>>  8 & 0xff;
  o[26] = x8 >>> 16 & 0xff;
  o[27] = x8 >>> 24 & 0xff;

  o[28] = x9 >>>  0 & 0xff;
  o[29] = x9 >>>  8 & 0xff;
  o[30] = x9 >>> 16 & 0xff;
  o[31] = x9 >>> 24 & 0xff;
}

function crypto_core_salsa20(out,inp,k,c) {
  core_salsa20(out,inp,k,c);
}

function crypto_core_hsalsa20(out,inp,k,c) {
  core_hsalsa20(out,inp,k,c);
}

var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
            // "expand 32-byte k"

function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
    mpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
  }
  return 0;
}

function crypto_stream_salsa20(c,cpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = x[i];
  }
  return 0;
}

function crypto_stream(c,cpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20(c,cpos,d,sn,s);
}

function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
}

/*
* Port of Andrew Moon's Poly1305-donna-16. Public domain.
* https://github.com/floodyberry/poly1305-donna
*/

var poly1305 = function(key) {
  this.buffer = new Uint8Array(16);
  this.r = new Uint16Array(10);
  this.h = new Uint16Array(10);
  this.pad = new Uint16Array(8);
  this.leftover = 0;
  this.fin = 0;

  var t0, t1, t2, t3, t4, t5, t6, t7;

  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
  this.r[9] = ((t7 >>>  5)) & 0x007f;

  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
};

poly1305.prototype.blocks = function(m, mpos, bytes) {
  var hibit = this.fin ? 0 : (1 << 11);
  var t0, t1, t2, t3, t4, t5, t6, t7, c;
  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

  var h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7],
      h8 = this.h[8],
      h9 = this.h[9];

  var r0 = this.r[0],
      r1 = this.r[1],
      r2 = this.r[2],
      r3 = this.r[3],
      r4 = this.r[4],
      r5 = this.r[5],
      r6 = this.r[6],
      r7 = this.r[7],
      r8 = this.r[8],
      r9 = this.r[9];

  while (bytes >= 16) {
    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
    h5 += ((t4 >>>  1)) & 0x1fff;
    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
    h9 += ((t7 >>> 5)) | hibit;

    c = 0;

    d0 = c;
    d0 += h0 * r0;
    d0 += h1 * (5 * r9);
    d0 += h2 * (5 * r8);
    d0 += h3 * (5 * r7);
    d0 += h4 * (5 * r6);
    c = (d0 >>> 13); d0 &= 0x1fff;
    d0 += h5 * (5 * r5);
    d0 += h6 * (5 * r4);
    d0 += h7 * (5 * r3);
    d0 += h8 * (5 * r2);
    d0 += h9 * (5 * r1);
    c += (d0 >>> 13); d0 &= 0x1fff;

    d1 = c;
    d1 += h0 * r1;
    d1 += h1 * r0;
    d1 += h2 * (5 * r9);
    d1 += h3 * (5 * r8);
    d1 += h4 * (5 * r7);
    c = (d1 >>> 13); d1 &= 0x1fff;
    d1 += h5 * (5 * r6);
    d1 += h6 * (5 * r5);
    d1 += h7 * (5 * r4);
    d1 += h8 * (5 * r3);
    d1 += h9 * (5 * r2);
    c += (d1 >>> 13); d1 &= 0x1fff;

    d2 = c;
    d2 += h0 * r2;
    d2 += h1 * r1;
    d2 += h2 * r0;
    d2 += h3 * (5 * r9);
    d2 += h4 * (5 * r8);
    c = (d2 >>> 13); d2 &= 0x1fff;
    d2 += h5 * (5 * r7);
    d2 += h6 * (5 * r6);
    d2 += h7 * (5 * r5);
    d2 += h8 * (5 * r4);
    d2 += h9 * (5 * r3);
    c += (d2 >>> 13); d2 &= 0x1fff;

    d3 = c;
    d3 += h0 * r3;
    d3 += h1 * r2;
    d3 += h2 * r1;
    d3 += h3 * r0;
    d3 += h4 * (5 * r9);
    c = (d3 >>> 13); d3 &= 0x1fff;
    d3 += h5 * (5 * r8);
    d3 += h6 * (5 * r7);
    d3 += h7 * (5 * r6);
    d3 += h8 * (5 * r5);
    d3 += h9 * (5 * r4);
    c += (d3 >>> 13); d3 &= 0x1fff;

    d4 = c;
    d4 += h0 * r4;
    d4 += h1 * r3;
    d4 += h2 * r2;
    d4 += h3 * r1;
    d4 += h4 * r0;
    c = (d4 >>> 13); d4 &= 0x1fff;
    d4 += h5 * (5 * r9);
    d4 += h6 * (5 * r8);
    d4 += h7 * (5 * r7);
    d4 += h8 * (5 * r6);
    d4 += h9 * (5 * r5);
    c += (d4 >>> 13); d4 &= 0x1fff;

    d5 = c;
    d5 += h0 * r5;
    d5 += h1 * r4;
    d5 += h2 * r3;
    d5 += h3 * r2;
    d5 += h4 * r1;
    c = (d5 >>> 13); d5 &= 0x1fff;
    d5 += h5 * r0;
    d5 += h6 * (5 * r9);
    d5 += h7 * (5 * r8);
    d5 += h8 * (5 * r7);
    d5 += h9 * (5 * r6);
    c += (d5 >>> 13); d5 &= 0x1fff;

    d6 = c;
    d6 += h0 * r6;
    d6 += h1 * r5;
    d6 += h2 * r4;
    d6 += h3 * r3;
    d6 += h4 * r2;
    c = (d6 >>> 13); d6 &= 0x1fff;
    d6 += h5 * r1;
    d6 += h6 * r0;
    d6 += h7 * (5 * r9);
    d6 += h8 * (5 * r8);
    d6 += h9 * (5 * r7);
    c += (d6 >>> 13); d6 &= 0x1fff;

    d7 = c;
    d7 += h0 * r7;
    d7 += h1 * r6;
    d7 += h2 * r5;
    d7 += h3 * r4;
    d7 += h4 * r3;
    c = (d7 >>> 13); d7 &= 0x1fff;
    d7 += h5 * r2;
    d7 += h6 * r1;
    d7 += h7 * r0;
    d7 += h8 * (5 * r9);
    d7 += h9 * (5 * r8);
    c += (d7 >>> 13); d7 &= 0x1fff;

    d8 = c;
    d8 += h0 * r8;
    d8 += h1 * r7;
    d8 += h2 * r6;
    d8 += h3 * r5;
    d8 += h4 * r4;
    c = (d8 >>> 13); d8 &= 0x1fff;
    d8 += h5 * r3;
    d8 += h6 * r2;
    d8 += h7 * r1;
    d8 += h8 * r0;
    d8 += h9 * (5 * r9);
    c += (d8 >>> 13); d8 &= 0x1fff;

    d9 = c;
    d9 += h0 * r9;
    d9 += h1 * r8;
    d9 += h2 * r7;
    d9 += h3 * r6;
    d9 += h4 * r5;
    c = (d9 >>> 13); d9 &= 0x1fff;
    d9 += h5 * r4;
    d9 += h6 * r3;
    d9 += h7 * r2;
    d9 += h8 * r1;
    d9 += h9 * r0;
    c += (d9 >>> 13); d9 &= 0x1fff;

    c = (((c << 2) + c)) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = (c >>> 13);
    d1 += c;

    h0 = d0;
    h1 = d1;
    h2 = d2;
    h3 = d3;
    h4 = d4;
    h5 = d5;
    h6 = d6;
    h7 = d7;
    h8 = d8;
    h9 = d9;

    mpos += 16;
    bytes -= 16;
  }
  this.h[0] = h0;
  this.h[1] = h1;
  this.h[2] = h2;
  this.h[3] = h3;
  this.h[4] = h4;
  this.h[5] = h5;
  this.h[6] = h6;
  this.h[7] = h7;
  this.h[8] = h8;
  this.h[9] = h9;
};

poly1305.prototype.finish = function(mac, macpos) {
  var g = new Uint16Array(10);
  var c, mask, f, i;

  if (this.leftover) {
    i = this.leftover;
    this.buffer[i++] = 1;
    for (; i < 16; i++) this.buffer[i] = 0;
    this.fin = 1;
    this.blocks(this.buffer, 0, 16);
  }

  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  for (i = 2; i < 10; i++) {
    this.h[i] += c;
    c = this.h[i] >>> 13;
    this.h[i] &= 0x1fff;
  }
  this.h[0] += (c * 5);
  c = this.h[0] >>> 13;
  this.h[0] &= 0x1fff;
  this.h[1] += c;
  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  this.h[2] += c;

  g[0] = this.h[0] + 5;
  c = g[0] >>> 13;
  g[0] &= 0x1fff;
  for (i = 1; i < 10; i++) {
    g[i] = this.h[i] + c;
    c = g[i] >>> 13;
    g[i] &= 0x1fff;
  }
  g[9] -= (1 << 13);

  mask = (c ^ 1) - 1;
  for (i = 0; i < 10; i++) g[i] &= mask;
  mask = ~mask;
  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

  f = this.h[0] + this.pad[0];
  this.h[0] = f & 0xffff;
  for (i = 1; i < 8; i++) {
    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
    this.h[i] = f & 0xffff;
  }

  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
};

poly1305.prototype.update = function(m, mpos, bytes) {
  var i, want;

  if (this.leftover) {
    want = (16 - this.leftover);
    if (want > bytes)
      want = bytes;
    for (i = 0; i < want; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    bytes -= want;
    mpos += want;
    this.leftover += want;
    if (this.leftover < 16)
      return;
    this.blocks(this.buffer, 0, 16);
    this.leftover = 0;
  }

  if (bytes >= 16) {
    want = bytes - (bytes % 16);
    this.blocks(m, mpos, want);
    mpos += want;
    bytes -= want;
  }

  if (bytes) {
    for (i = 0; i < bytes; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    this.leftover += bytes;
  }
};

function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
  var s = new poly1305(k);
  s.update(m, mpos, n);
  s.finish(out, outpos);
  return 0;
}

function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
  var x = new Uint8Array(16);
  crypto_onetimeauth(x,0,m,mpos,n,k);
  return crypto_verify_16(h,hpos,x,0);
}

function crypto_secretbox(c,m,d,n,k) {
  var i;
  if (d < 32) return -1;
  crypto_stream_xor(c,0,m,0,d,n,k);
  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
  for (i = 0; i < 16; i++) c[i] = 0;
  return 0;
}

function crypto_secretbox_open(m,c,d,n,k) {
  var i;
  var x = new Uint8Array(32);
  if (d < 32) return -1;
  crypto_stream(x,0,32,n,k);
  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
  crypto_stream_xor(m,0,c,0,d,n,k);
  for (i = 0; i < 32; i++) m[i] = 0;
  return 0;
}

function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i]|0;
}

function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c-1 + 37 * (c-1);
}

function sel25519(p, q, b) {
  var t, c = ~(b-1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
      m[i-1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
    b = (m[15]>>16) & 1;
    m[14] &= 0xffff;
    sel25519(t, m, 1-b);
  }
  for (i = 0; i < 16; i++) {
    o[2*i] = t[i] & 0xff;
    o[2*i+1] = t[i]>>8;
  }
}

function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}

function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
  o[15] &= 0x7fff;
}

function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function M(o, a, b) {
  var v, c,
     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
    b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5],
    b6 = b[6],
    b7 = b[7],
    b8 = b[8],
    b9 = b[9],
    b10 = b[10],
    b11 = b[11],
    b12 = b[12],
    b13 = b[13],
    b14 = b[14],
    b15 = b[15];

  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;

  t0  += 38 * t16;
  t1  += 38 * t17;
  t2  += 38 * t18;
  t3  += 38 * t19;
  t4  += 38 * t20;
  t5  += 38 * t21;
  t6  += 38 * t22;
  t7  += 38 * t23;
  t8  += 38 * t24;
  t9  += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  // t15 left as is

  // first car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  // second car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  o[ 0] = t0;
  o[ 1] = t1;
  o[ 2] = t2;
  o[ 3] = t3;
  o[ 4] = t4;
  o[ 5] = t5;
  o[ 6] = t6;
  o[ 7] = t7;
  o[ 8] = t8;
  o[ 9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}

function S(o, a) {
  M(o, a, a);
}

function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if(a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31]=(n[31]&127)|64;
  z[0]&=248;
  unpack25519(x,p);
  for (i = 0; i < 16; i++) {
    b[i]=x[i];
    d[i]=a[i]=c[i]=0;
  }
  a[0]=d[0]=1;
  for (i=254; i>=0; --i) {
    r=(z[i>>>3]>>>(i&7))&1;
    sel25519(a,b,r);
    sel25519(c,d,r);
    A(e,a,c);
    Z(a,a,c);
    A(c,b,d);
    Z(b,b,d);
    S(d,e);
    S(f,a);
    M(a,c,a);
    M(c,b,e);
    A(e,a,c);
    Z(a,a,c);
    S(b,a);
    Z(c,d,f);
    M(a,c,_121665);
    A(a,a,d);
    M(c,c,a);
    M(a,d,f);
    M(d,b,x);
    S(b,e);
    sel25519(a,b,r);
    sel25519(c,d,r);
  }
  for (i = 0; i < 16; i++) {
    x[i+16]=a[i];
    x[i+32]=c[i];
    x[i+48]=b[i];
    x[i+64]=d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32,x32);
  M(x16,x16,x32);
  pack25519(q,x16);
  return 0;
}

function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}

function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}

function crypto_box_beforenm(k, y, x) {
  var s = new Uint8Array(32);
  crypto_scalarmult(s, x, y);
  return crypto_core_hsalsa20(k, _0, s, sigma);
}

var crypto_box_afternm = crypto_secretbox;
var crypto_box_open_afternm = crypto_secretbox_open;

function crypto_box(c, m, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_afternm(c, m, d, n, k);
}

function crypto_box_open(m, c, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_open_afternm(m, c, d, n, k);
}

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16),
      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
      th, tl, i, j, h, l, a, b, c, d;

  var ah0 = hh[0],
      ah1 = hh[1],
      ah2 = hh[2],
      ah3 = hh[3],
      ah4 = hh[4],
      ah5 = hh[5],
      ah6 = hh[6],
      ah7 = hh[7],

      al0 = hl[0],
      al1 = hl[1],
      al2 = hl[2],
      al3 = hl[3],
      al4 = hl[4],
      al5 = hl[5],
      al6 = hl[6],
      al7 = hl[7];

  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;

      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;

      // add
      h = ah7;
      l = al7;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma1
      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Ch
      h = (ah4 & ah5) ^ (~ah4 & ah6);
      l = (al4 & al5) ^ (~al4 & al6);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // K
      h = K[i*2];
      l = K[i*2+1];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // w
      h = wh[i%16];
      l = wl[i%16];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      th = c & 0xffff | d << 16;
      tl = a & 0xffff | b << 16;

      // add
      h = th;
      l = tl;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma0
      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Maj
      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh7 = (c & 0xffff) | (d << 16);
      bl7 = (a & 0xffff) | (b << 16);

      // add
      h = bh3;
      l = bl3;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      h = th;
      l = tl;

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh3 = (c & 0xffff) | (d << 16);
      bl3 = (a & 0xffff) | (b << 16);

      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;

      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;

      if (i%16 === 15) {
        for (j = 0; j < 16; j++) {
          // add
          h = wh[j];
          l = wl[j];

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = wh[(j+9)%16];
          l = wl[(j+9)%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma0
          th = wh[(j+1)%16];
          tl = wl[(j+1)%16];
          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma1
          th = wh[(j+14)%16];
          tl = wl[(j+14)%16];
          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          wh[j] = (c & 0xffff) | (d << 16);
          wl[j] = (a & 0xffff) | (b << 16);
        }
      }
    }

    // add
    h = ah0;
    l = al0;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[0];
    l = hl[0];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[0] = ah0 = (c & 0xffff) | (d << 16);
    hl[0] = al0 = (a & 0xffff) | (b << 16);

    h = ah1;
    l = al1;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[1];
    l = hl[1];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[1] = ah1 = (c & 0xffff) | (d << 16);
    hl[1] = al1 = (a & 0xffff) | (b << 16);

    h = ah2;
    l = al2;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[2];
    l = hl[2];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[2] = ah2 = (c & 0xffff) | (d << 16);
    hl[2] = al2 = (a & 0xffff) | (b << 16);

    h = ah3;
    l = al3;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[3];
    l = hl[3];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[3] = ah3 = (c & 0xffff) | (d << 16);
    hl[3] = al3 = (a & 0xffff) | (b << 16);

    h = ah4;
    l = al4;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[4];
    l = hl[4];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[4] = ah4 = (c & 0xffff) | (d << 16);
    hl[4] = al4 = (a & 0xffff) | (b << 16);

    h = ah5;
    l = al5;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[5];
    l = hl[5];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[5] = ah5 = (c & 0xffff) | (d << 16);
    hl[5] = al5 = (a & 0xffff) | (b << 16);

    h = ah6;
    l = al6;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[6];
    l = hl[6];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[6] = ah6 = (c & 0xffff) | (d << 16);
    hl[6] = al6 = (a & 0xffff) | (b << 16);

    h = ah7;
    l = al7;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[7];
    l = hl[7];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[7] = ah7 = (c & 0xffff) | (d << 16);
    hl[7] = al7 = (a & 0xffff) | (b << 16);

    pos += 128;
    n -= 128;
  }

  return n;
}

function crypto_hash(out, m, n) {
  var hh = new Int32Array(8),
      hl = new Int32Array(8),
      x = new Uint8Array(256),
      i, b = n;

  hh[0] = 0x6a09e667;
  hh[1] = 0xbb67ae85;
  hh[2] = 0x3c6ef372;
  hh[3] = 0xa54ff53a;
  hh[4] = 0x510e527f;
  hh[5] = 0x9b05688c;
  hh[6] = 0x1f83d9ab;
  hh[7] = 0x5be0cd19;

  hl[0] = 0xf3bcc908;
  hl[1] = 0x84caa73b;
  hl[2] = 0xfe94f82b;
  hl[3] = 0x5f1d36f1;
  hl[4] = 0xade682d1;
  hl[5] = 0x2b3e6c1f;
  hl[6] = 0xfb41bd6b;
  hl[7] = 0x137e2179;

  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;

  for (i = 0; i < n; i++) x[i] = m[b-n+i];
  x[n] = 128;

  n = 256-128*(n<112?1:0);
  x[n-9] = 0;
  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);

  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

  return 0;
}

function add(p, q) {
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);

  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}

function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}

function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}

function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = (s[(i/8)|0] >> (i&7)) & 1;
    cswap(p, q, b);
    add(q, p);
    add(p, p);
    cswap(p, q, b);
  }
}

function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}

function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;

  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  scalarbase(p, d);
  pack(pk, p);

  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
  return 0;
}

var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = (x[j] + 128) >> 8;
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i+1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}

function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}

// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];

  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

  crypto_hash(r, sm.subarray(32), n+32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);

  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);

  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i+j] += h[i] * d[j];
    }
  }

  modL(sm.subarray(32), x);
  return smlen;
}

function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);

  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);

  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

  M(r[3], r[0], r[1]);
  return 0;
}

function crypto_sign_open(m, sm, n, pk) {
  var i, mlen;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

  mlen = -1;
  if (n < 64) return -1;

  if (unpackneg(q, pk)) return -1;

  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i+32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);

  scalarbase(q, sm.subarray(32));
  add(p, q);
  pack(t, p);

  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }

  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  mlen = n;
  return mlen;
}

var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_hash_BYTES = 64;

nacl.lowlevel = {
  crypto_core_hsalsa20: crypto_core_hsalsa20,
  crypto_stream_xor: crypto_stream_xor,
  crypto_stream: crypto_stream,
  crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
  crypto_stream_salsa20: crypto_stream_salsa20,
  crypto_onetimeauth: crypto_onetimeauth,
  crypto_onetimeauth_verify: crypto_onetimeauth_verify,
  crypto_verify_16: crypto_verify_16,
  crypto_verify_32: crypto_verify_32,
  crypto_secretbox: crypto_secretbox,
  crypto_secretbox_open: crypto_secretbox_open,
  crypto_scalarmult: crypto_scalarmult,
  crypto_scalarmult_base: crypto_scalarmult_base,
  crypto_box_beforenm: crypto_box_beforenm,
  crypto_box_afternm: crypto_box_afternm,
  crypto_box: crypto_box,
  crypto_box_open: crypto_box_open,
  crypto_box_keypair: crypto_box_keypair,
  crypto_hash: crypto_hash,
  crypto_sign: crypto_sign,
  crypto_sign_keypair: crypto_sign_keypair,
  crypto_sign_open: crypto_sign_open,

  crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
  crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
  crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
  crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
  crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
  crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
  crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
  crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
  crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
  crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
  crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
  crypto_sign_BYTES: crypto_sign_BYTES,
  crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
  crypto_hash_BYTES: crypto_hash_BYTES
};

/* High-level API */

function checkLengths(k, n) {
  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
}

function checkBoxLengths(pk, sk) {
  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
}

function checkArrayTypes() {
  var t, i;
  for (i = 0; i < arguments.length; i++) {
     if ((t = Object.prototype.toString.call(arguments[i])) !== '[object Uint8Array]')
       throw new TypeError('unexpected type ' + t + ', use Uint8Array');
  }
}

function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}

// TODO: Completely remove this in v0.15.
if (!nacl.util) {
  nacl.util = {};
  nacl.util.decodeUTF8 = nacl.util.encodeUTF8 = nacl.util.encodeBase64 = nacl.util.decodeBase64 = function() {
    throw new Error('nacl.util moved into separate package: https://github.com/dchest/tweetnacl-util-js');
  };
}

nacl.randomBytes = function(n) {
  var b = new Uint8Array(n);
  randombytes(b, n);
  return b;
};

nacl.secretbox = function(msg, nonce, key) {
  checkArrayTypes(msg, nonce, key);
  checkLengths(key, nonce);
  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
  var c = new Uint8Array(m.length);
  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
  crypto_secretbox(c, m, m.length, nonce, key);
  return c.subarray(crypto_secretbox_BOXZEROBYTES);
};

nacl.secretbox.open = function(box, nonce, key) {
  checkArrayTypes(box, nonce, key);
  checkLengths(key, nonce);
  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
  var m = new Uint8Array(c.length);
  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
  if (c.length < 32) return false;
  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return false;
  return m.subarray(crypto_secretbox_ZEROBYTES);
};

nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

nacl.scalarMult = function(n, p) {
  checkArrayTypes(n, p);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult(q, n, p);
  return q;
};

nacl.scalarMult.base = function(n) {
  checkArrayTypes(n);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult_base(q, n);
  return q;
};

nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

nacl.box = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox(msg, nonce, k);
};

nacl.box.before = function(publicKey, secretKey) {
  checkArrayTypes(publicKey, secretKey);
  checkBoxLengths(publicKey, secretKey);
  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
  crypto_box_beforenm(k, publicKey, secretKey);
  return k;
};

nacl.box.after = nacl.secretbox;

nacl.box.open = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox.open(msg, nonce, k);
};

nacl.box.open.after = nacl.secretbox.open;

nacl.box.keyPair = function() {
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
  crypto_box_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.box.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  crypto_scalarmult_base(pk, secretKey);
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
nacl.box.nonceLength = crypto_box_NONCEBYTES;
nacl.box.overheadLength = nacl.secretbox.overheadLength;

nacl.sign = function(msg, secretKey) {
  checkArrayTypes(msg, secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
  crypto_sign(signedMsg, msg, msg.length, secretKey);
  return signedMsg;
};

nacl.sign.open = function(signedMsg, publicKey) {
  if (arguments.length !== 2)
    throw new Error('nacl.sign.open accepts 2 arguments; did you mean to use nacl.sign.detached.verify?');
  checkArrayTypes(signedMsg, publicKey);
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var tmp = new Uint8Array(signedMsg.length);
  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
  if (mlen < 0) return null;
  var m = new Uint8Array(mlen);
  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
  return m;
};

nacl.sign.detached = function(msg, secretKey) {
  var signedMsg = nacl.sign(msg, secretKey);
  var sig = new Uint8Array(crypto_sign_BYTES);
  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
  return sig;
};

nacl.sign.detached.verify = function(msg, sig, publicKey) {
  checkArrayTypes(msg, sig, publicKey);
  if (sig.length !== crypto_sign_BYTES)
    throw new Error('bad signature size');
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
  var i;
  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};

nacl.sign.keyPair = function() {
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  crypto_sign_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.sign.keyPair.fromSeed = function(seed) {
  checkArrayTypes(seed);
  if (seed.length !== crypto_sign_SEEDBYTES)
    throw new Error('bad seed size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  for (var i = 0; i < 32; i++) sk[i] = seed[i];
  crypto_sign_keypair(pk, sk, true);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
nacl.sign.seedLength = crypto_sign_SEEDBYTES;
nacl.sign.signatureLength = crypto_sign_BYTES;

nacl.hash = function(msg) {
  checkArrayTypes(msg);
  var h = new Uint8Array(crypto_hash_BYTES);
  crypto_hash(h, msg, msg.length);
  return h;
};

nacl.hash.hashLength = crypto_hash_BYTES;

nacl.verify = function(x, y) {
  checkArrayTypes(x, y);
  // Zero length arguments are considered not equal.
  if (x.length === 0 || y.length === 0) return false;
  if (x.length !== y.length) return false;
  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
};

nacl.setPRNG = function(fn) {
  randombytes = fn;
};

(function() {
  // Initialize PRNG if environment provides CSPRNG.
  // If not, methods calling randombytes will throw.
  var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
  if (crypto && crypto.getRandomValues) {
    // Browsers.
    var QUOTA = 65536;
    nacl.setPRNG(function(x, n) {
      var i, v = new Uint8Array(n);
      for (i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
      }
      for (i = 0; i < n; i++) x[i] = v[i];
      cleanup(v);
    });
  } else if (true) {
    // Node.js.
    crypto = __nccwpck_require__(6417);
    if (crypto && crypto.randomBytes) {
      nacl.setPRNG(function(x, n) {
        var i, v = crypto.randomBytes(n);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  }
})();

})( true && module.exports ? module.exports : (self.nacl = self.nacl || {}));


/***/ }),

/***/ 9041:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = require(__nccwpck_require__.ab + "lib/protocol/crypto/build/Release/sshcrypto4.node")

/***/ }),

/***/ 7295:
/***/ ((module) => {

module.exports = eval("require")("cpu-features");


/***/ }),

/***/ 6447:
/***/ ((module) => {

"use strict";
module.exports = {"i8":"1.3.0"};

/***/ }),

/***/ 2357:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 4293:
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ 3129:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 6417:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 881:
/***/ ((module) => {

"use strict";
module.exports = require("dns");

/***/ }),

/***/ 8614:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 5747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 8605:
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ 7211:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ 1631:
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ 5622:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 2413:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ 4016:
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ 1669:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 8761:
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseSSHKey = exports.generateOpenSSHKeys = void 0;
const crypto_1 = __nccwpck_require__(6417);
const ssh2_1 = __nccwpck_require__(5869);
const sshpk_1 = __nccwpck_require__(7022);
// Generate public/private key in OpenSSH format (used for encryption in tunnel over SSH)
const generateOpenSSHKeys = () => {
    const format = 'pem';
    const { publicKey, privateKey } = crypto_1.generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        privateKeyEncoding: {
            format,
            type: 'pkcs8',
        },
        publicKeyEncoding: {
            format,
            type: 'spki',
        },
    });
    const openSSHPublicKey = sshpk_1.parseKey(publicKey, format).toBuffer('ssh', {}).toString('utf-8');
    const openSSHPrivateKey = sshpk_1.parsePrivateKey(privateKey, format).toBuffer('ssh', {}).toString('utf-8');
    return {
        privateKey: openSSHPrivateKey,
        publicKey: openSSHPublicKey,
    };
};
exports.generateOpenSSHKeys = generateOpenSSHKeys;
// Parse SSH key for ssh2 module
const parseSSHKey = (key) => {
    const parsedKey = ssh2_1.utils.parseKey(key);
    if (!parsedKey) {
        throw new Error(`Invalid key ${key}`);
    }
    if (parsedKey instanceof Error) {
        throw parsedKey;
    }
    if (parsedKey instanceof Array) {
        // Multiple keys could be concatenated - in our use cases, a single key is expected
        if (parsedKey.length === 0) {
            throw new Error(`Invalid key ${key}`);
        }
        return parsedKey[0];
    }
    return parsedKey;
};
exports.parseSSHKey = parseSSHKey;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=crypto.js.map