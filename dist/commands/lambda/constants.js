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

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=constants.js.map