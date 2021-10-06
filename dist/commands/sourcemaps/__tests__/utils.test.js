require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 77:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pluralize = exports.getBaseIntakeUrl = exports.getMinifiedFilePath = void 0;
const path_1 = __importDefault(__nccwpck_require__(622));
const getMinifiedFilePath = (sourcemapPath) => {
    if (path_1.default.extname(sourcemapPath) !== '.map') {
        throw Error('cannot get minified file path from a file which is not a sourcemap');
    }
    return sourcemapPath.replace(new RegExp('\\.map$'), '');
};
exports.getMinifiedFilePath = getMinifiedFilePath;
const getBaseIntakeUrl = () => {
    if (process.env.DATADOG_SOURCEMAP_INTAKE_URL) {
        return process.env.DATADOG_SOURCEMAP_INTAKE_URL;
    }
    else if (process.env.DATADOG_SITE) {
        return 'https://sourcemap-intake.' + process.env.DATADOG_SITE;
    }
    return 'https://sourcemap-intake.datadoghq.com';
};
exports.getBaseIntakeUrl = getBaseIntakeUrl;
const pluralize = (nb, singular, plural) => {
    if (nb >= 2) {
        return `${nb} ${plural}`;
    }
    return `${nb} ${singular}`;
};
exports.pluralize = pluralize;


/***/ }),

/***/ 622:
/***/ ((module) => {

module.exports = require("path");

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
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const utils_1 = __nccwpck_require__(77);
describe('utils', () => {
    describe('getMinifiedFilePath', () => {
        test('should return correct minified path', () => {
            const file1 = 'sourcemaps/file1.min.js.map';
            const file2 = 'sourcemaps/file2.js.map.xxx';
            expect(utils_1.getMinifiedFilePath(file1)).toBe('sourcemaps/file1.min.js');
            expect(() => utils_1.getMinifiedFilePath(file2)).toThrow('cannot get minified file path from a file which is not a sourcemap');
        });
    });
});

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=utils.test.js.map