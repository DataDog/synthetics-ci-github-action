require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 230:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CI_KMS_API_KEY_ENV_VAR = exports.CI_API_KEY_ENV_VAR = exports.CI_SITE_ENV_VAR = exports.LAMBDA_HANDLER_ENV_VAR = exports.LOG_LEVEL_ENV_VAR = exports.FLUSH_TO_LOG_ENV_VAR = exports.MERGE_XRAY_TRACES_ENV_VAR = exports.TRACE_ENABLED_ENV_VAR = exports.SITE_ENV_VAR = exports.KMS_API_KEY_ENV_VAR = exports.API_KEY_ENV_VAR = exports.DD_LAMBDA_EXTENSION_LAYER_NAME = exports.TAG_VERSION_NAME = exports.SUBSCRIPTION_FILTER_NAME = exports.GOVCLOUD_LAYER_AWS_ACCOUNT = exports.DEFAULT_LAYER_AWS_ACCOUNT = exports.HANDLER_LOCATION = exports.RUNTIME_LAYER_LOOKUP = void 0;
exports.RUNTIME_LAYER_LOOKUP = {
    'nodejs10.x': 'Datadog-Node10-x',
    'nodejs12.x': 'Datadog-Node12-x',
    'nodejs14.x': 'Datadog-Node14-x',
    'python2.7': 'Datadog-Python27',
    'python3.6': 'Datadog-Python36',
    'python3.7': 'Datadog-Python37',
    'python3.8': 'Datadog-Python38',
    'python3.9': 'Datadog-Python39',
};
const PYTHON_HANDLER_LOCATION = 'datadog_lambda.handler.handler';
const NODE_HANDLER_LOCATION = '/opt/nodejs/node_modules/datadog-lambda-js/handler.handler';
exports.HANDLER_LOCATION = {
    'nodejs10.x': NODE_HANDLER_LOCATION,
    'nodejs12.x': NODE_HANDLER_LOCATION,
    'nodejs14.x': NODE_HANDLER_LOCATION,
    'python2.7': PYTHON_HANDLER_LOCATION,
    'python3.6': PYTHON_HANDLER_LOCATION,
    'python3.7': PYTHON_HANDLER_LOCATION,
    'python3.8': PYTHON_HANDLER_LOCATION,
    'python3.9': PYTHON_HANDLER_LOCATION,
};
exports.DEFAULT_LAYER_AWS_ACCOUNT = '464622532012';
exports.GOVCLOUD_LAYER_AWS_ACCOUNT = '002406178527';
exports.SUBSCRIPTION_FILTER_NAME = 'datadog-ci-filter';
exports.TAG_VERSION_NAME = 'dd_sls_ci';
exports.DD_LAMBDA_EXTENSION_LAYER_NAME = 'Datadog-Extension';
// Environment variables used in the Lambda environment
exports.API_KEY_ENV_VAR = 'DD_API_KEY';
exports.KMS_API_KEY_ENV_VAR = 'DD_KMS_API_KEY';
exports.SITE_ENV_VAR = 'DD_SITE';
exports.TRACE_ENABLED_ENV_VAR = 'DD_TRACE_ENABLED';
exports.MERGE_XRAY_TRACES_ENV_VAR = 'DD_MERGE_XRAY_TRACES';
exports.FLUSH_TO_LOG_ENV_VAR = 'DD_FLUSH_TO_LOG';
exports.LOG_LEVEL_ENV_VAR = 'DD_LOG_LEVEL';
exports.LAMBDA_HANDLER_ENV_VAR = 'DD_LAMBDA_HANDLER';
// Environment variables used by Datadog CI
exports.CI_SITE_ENV_VAR = 'DATADOG_SITE';
exports.CI_API_KEY_ENV_VAR = 'DATADOG_API_KEY';
exports.CI_KMS_API_KEY_ENV_VAR = 'DATADOG_KMS_API_KEY';


/***/ }),

/***/ 762:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hasVersionTag = exports.calculateTagUpdateRequest = exports.applyTagConfig = void 0;
const path_1 = __importDefault(__nccwpck_require__(622));
const constants_1 = __nccwpck_require__(230);
// tslint:disable-next-line
const { version } = require(path_1.default.join(__dirname, '../../../package.json'));
const applyTagConfig = (lambda, configuration) => __awaiter(void 0, void 0, void 0, function* () {
    const { tagResourceRequest } = configuration;
    if (tagResourceRequest !== undefined) {
        yield lambda.tagResource(tagResourceRequest).promise();
    }
});
exports.applyTagConfig = applyTagConfig;
const calculateTagUpdateRequest = (lambda, functionARN) => __awaiter(void 0, void 0, void 0, function* () {
    const config = {};
    const versionTagPresent = yield exports.hasVersionTag(lambda, functionARN);
    if (!versionTagPresent) {
        config.tagResourceRequest = {
            Resource: functionARN,
            Tags: {
                [constants_1.TAG_VERSION_NAME]: `v${version}`,
            },
        };
        return config;
    }
    return;
});
exports.calculateTagUpdateRequest = calculateTagUpdateRequest;
const hasVersionTag = (lambda, functionARN) => __awaiter(void 0, void 0, void 0, function* () {
    const args = {
        Resource: functionARN,
    };
    const result = yield lambda.listTags(args).promise();
    const { Tags } = result;
    return Tags !== undefined && Tags[constants_1.TAG_VERSION_NAME] === `v${version}`;
});
exports.hasVersionTag = hasVersionTag;


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
/******/ 	var __webpack_exports__ = __nccwpck_require__(762);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=tags.js.map