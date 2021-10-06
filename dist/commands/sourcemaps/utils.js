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
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(77);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=utils.js.map