require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 735:
/***/ ((__unused_webpack_module, exports) => {


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
const utils_1 = __nccwpck_require__(735);
describe('parseTags', () => {
    test('falls back to empty object if invalid format', () => {
        expect(utils_1.parseTags([''])).toEqual({});
        expect(utils_1.parseTags(['not.correct.format'])).toEqual({});
        expect(utils_1.parseTags(['not.correct.format,either'])).toEqual({});
    });
    test('returns an object with the tags with well formatted strings', () => {
        expect(utils_1.parseTags(['key1:value1', 'key2:value2'])).toEqual({ key1: 'value1', key2: 'value2' });
    });
    test('should not include invalid key:value pairs', () => {
        expect(utils_1.parseTags(['key1:value1', 'key2:value2', 'invalidkeyvalue'])).toEqual({ key1: 'value1', key2: 'value2' });
    });
});

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=utils.test.js.map