require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.streamToString = void 0;
const streamToString = (stream) => {
    const chunks = [];
    return new Promise((resolve, reject) => {
        const handleData = (chunk) => chunks.push(chunk);
        const handleError = (error) => {
            stream.off('data', handleData);
            stream.off('end', handleEnd);
            reject(error);
        };
        const handleEnd = () => {
            stream.off('data', handleData);
            stream.off('error', handleError);
            resolve(chunks.join(''));
        };
        stream.on('data', handleData);
        stream.once('error', handleError);
        stream.once('end', handleEnd);
        stream.resume();
    });
};
exports.streamToString = streamToString;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=stream.js.map