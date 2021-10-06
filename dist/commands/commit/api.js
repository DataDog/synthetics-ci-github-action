require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 880:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getBaseIntakeUrl = exports.apiHost = exports.datadogSite = void 0;
exports.datadogSite = process.env.DATADOG_SITE || 'datadoghq.com';
exports.apiHost = 'api.' + exports.datadogSite;
const getBaseIntakeUrl = () => {
    if (process.env.DATADOG_SOURCEMAP_INTAKE_URL) {
        return process.env.DATADOG_SOURCEMAP_INTAKE_URL;
    }
    return 'https://sourcemap-intake.' + exports.datadogSite;
};
exports.getBaseIntakeUrl = getBaseIntakeUrl;


/***/ })

/******/ 	});
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
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__[880](0, __webpack_exports__);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=api.js.map