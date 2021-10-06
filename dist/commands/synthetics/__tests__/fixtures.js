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
exports.getApiTest = exports.mockReporter = void 0;
const mockUser = {
    email: '',
    handle: '',
    id: 42,
    name: '',
};
exports.mockReporter = {
    error: jest.fn(),
    initErrors: jest.fn(),
    log: jest.fn(),
    reportStart: jest.fn(),
    runEnd: jest.fn(),
    testEnd: jest.fn(),
    testTrigger: jest.fn(),
    testWait: jest.fn(),
};
const getApiTest = (publicId) => ({
    config: {
        assertions: [],
        request: {
            headers: {},
            method: 'GET',
            timeout: 60000,
            url: 'http://fake.url',
        },
        variables: [],
    },
    created_at: '',
    created_by: mockUser,
    locations: [],
    message: '',
    modified_at: '',
    modified_by: mockUser,
    monitor_id: 0,
    name: '',
    options: {
        device_ids: [],
        min_failure_duration: 0,
        min_location_failed: 0,
        tick_every: 3600,
    },
    overall_state: 0,
    overall_state_modified: '',
    public_id: publicId,
    status: '',
    stepCount: 0,
    subtype: 'http',
    tags: [],
    type: 'api',
});
exports.getApiTest = getApiTest;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=fixtures.js.map