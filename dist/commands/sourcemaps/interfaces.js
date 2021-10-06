require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 365:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Sourcemap = void 0;
const fs_1 = __importDefault(__nccwpck_require__(747));
class Sourcemap {
    constructor(minifiedFilePath, minifiedUrl, sourcemapPath) {
        this.minifiedFilePath = minifiedFilePath;
        this.minifiedUrl = minifiedUrl;
        this.sourcemapPath = sourcemapPath;
    }
    addRepositoryData(gitData) {
        this.gitData = gitData;
    }
    asMultipartPayload(cliVersion, service, version, projectPath) {
        const content = new Map([
            ['cli_version', { value: cliVersion }],
            ['service', { value: service }],
            ['version', { value: version }],
            ['source_map', { value: fs_1.default.createReadStream(this.sourcemapPath) }],
            ['minified_file', { value: fs_1.default.createReadStream(this.minifiedFilePath) }],
            ['minified_url', { value: this.minifiedUrl }],
            ['project_path', { value: projectPath }],
            ['type', { value: 'js_sourcemap' }],
        ]);
        if (this.gitData !== undefined) {
            if (this.gitData.gitRepositoryPayload !== undefined) {
                content.set('repository', {
                    options: {
                        contentType: 'application/json',
                        filename: 'repository',
                    },
                    value: this.gitData.gitRepositoryPayload,
                });
            }
            content.set('git_repository_url', { value: this.gitData.gitRepositoryURL });
            content.set('git_commit_sha', { value: this.gitData.gitCommitSha });
        }
        return {
            content,
        };
    }
}
exports.Sourcemap = Sourcemap;


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
/******/ 	var __webpack_exports__ = __nccwpck_require__(365);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=interfaces.js.map