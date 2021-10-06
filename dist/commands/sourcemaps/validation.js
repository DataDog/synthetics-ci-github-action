require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 530:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.validatePayload = exports.InvalidPayload = void 0;
const fs_1 = __importDefault(__nccwpck_require__(747));
class InvalidPayload extends Error {
    constructor(reason, message) {
        super(message);
        this.reason = reason;
    }
}
exports.InvalidPayload = InvalidPayload;
const checkFile = (path) => {
    try {
        const stats = fs_1.default.statSync(path);
        if (stats.size === 0) {
            return { exists: true, empty: true };
        }
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return { exists: false, empty: false };
        }
        // Other kind of error
        throw error;
    }
    return { exists: true, empty: false };
};
const validatePayload = (sourcemap) => {
    // Check existence of sourcemap file
    const sourcemapCheck = checkFile(sourcemap.sourcemapPath);
    if (!sourcemapCheck.exists) {
        // This case should not happen as all collected sourcemaps should point to correct files
        throw new InvalidPayload('missing_sourcemap', `Skipping missing sourcemap (${sourcemap.sourcemapPath})`);
    }
    if (sourcemapCheck.empty) {
        throw new InvalidPayload('empty_sourcemap', `Skipping empty sourcemap (${sourcemap.sourcemapPath})`);
    }
    // Check existence of minified file
    const minifiedFileCheck = checkFile(sourcemap.minifiedFilePath);
    if (!minifiedFileCheck.exists) {
        throw new InvalidPayload('missing_js', `Missing corresponding JS file for sourcemap (${sourcemap.minifiedFilePath})`);
    }
    if (minifiedFileCheck.empty) {
        throw new InvalidPayload('empty_js', `Skipping sourcemap (${sourcemap.sourcemapPath}) due to ${sourcemap.minifiedFilePath} being empty`);
    }
};
exports.validatePayload = validatePayload;


/***/ }),

/***/ 747:
/***/ ((module) => {

module.exports = require("fs");

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
/******/ 	var __webpack_exports__ = __nccwpck_require__(530);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=validation.js.map