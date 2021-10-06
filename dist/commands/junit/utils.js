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
exports.parseTags = exports.getBaseIntakeUrl = void 0;
const getBaseIntakeUrl = () => {
    if (process.env.DATADOG_SITE || process.env.DD_SITE) {
        return `https://cireport-http-intake.logs.${process.env.DATADOG_SITE || process.env.DD_SITE}`;
    }
    return 'https://cireport-http-intake.logs.datadoghq.com';
};
exports.getBaseIntakeUrl = getBaseIntakeUrl;
/**
 * Receives an array of the form ['key:value', 'key2:value2']
 * and returns an object of the form {key: 'value', key2: 'value2'}
 */
const parseTags = (tags) => {
    try {
        return tags.reduce((acc, keyValuePair) => {
            if (!keyValuePair.includes(':')) {
                return acc;
            }
            const [key, value] = keyValuePair.split(':');
            return Object.assign(Object.assign({}, acc), { [key]: value });
        }, {});
    }
    catch (e) {
        return {};
    }
};
exports.parseTags = parseTags;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=utils.js.map