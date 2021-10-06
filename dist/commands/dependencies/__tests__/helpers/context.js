require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 413:
/***/ ((module) => {

module.exports = require("stream");

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
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
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
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createMockContext = void 0;
const stream_1 = __nccwpck_require__(413);
const createMockContext = () => {
    const buffer = {
        stderr: [],
        stdout: [],
    };
    const stderr = new stream_1.Writable({
        write(chunk, encoding, callback) {
            buffer.stderr.push(chunk);
            callback();
        },
    });
    const stdout = new stream_1.Writable({
        write(chunk, encoding, callback) {
            buffer.stdout.push(chunk);
            callback();
        },
    });
    const stdin = new stream_1.Readable();
    Object.assign(stderr, { toString: () => buffer.stderr.join('') });
    Object.assign(stdout, { toString: () => buffer.stdout.join('') });
    return {
        stderr,
        stdin,
        stdout,
    };
};
exports.createMockContext = createMockContext;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=context.js.map