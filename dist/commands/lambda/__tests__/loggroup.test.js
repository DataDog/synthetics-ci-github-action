require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 861:
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
const loggroup_1 = __nccwpck_require__(255);
const makeMockCloudWatch = (logGroups) => ({
    createLogGroup: jest.fn().mockImplementation(() => ({ promise: () => Promise.resolve() })),
    deleteSubscriptionFilter: jest.fn().mockImplementation(() => ({ promise: () => Promise.resolve() })),
    describeLogGroups: jest.fn().mockImplementation(({ logGroupNamePrefix }) => {
        var _a, _b;
        const groups = (_b = (_a = logGroups[logGroupNamePrefix]) === null || _a === void 0 ? void 0 : _a.config) !== null && _b !== void 0 ? _b : { logGroups: [] };
        return {
            promise: () => Promise.resolve(groups),
        };
    }),
    describeSubscriptionFilters: jest.fn().mockImplementation(({ logGroupName }) => {
        var _a, _b;
        const groups = (_b = (_a = logGroups[logGroupName]) === null || _a === void 0 ? void 0 : _a.filters) !== null && _b !== void 0 ? _b : { subscriptionFilters: [] };
        return {
            promise: () => Promise.resolve(groups),
        };
    }),
    putSubscriptionFilter: jest.fn().mockImplementation(() => ({ promise: () => Promise.resolve() })),
});
describe('loggroup', () => {
    describe('calculateLogGroupUpdateRequest', () => {
        test("creates a new log group when one doesn't exist", () => __awaiter(void 0, void 0, void 0, function* () {
            const logs = makeMockCloudWatch({});
            const result = yield loggroup_1.calculateLogGroupUpdateRequest(logs, '/aws/lambda/my-func', 'my-forwarder');
            expect(result).toMatchInlineSnapshot(`
                        Object {
                          "createLogGroupRequest": Object {
                            "logGroupName": "/aws/lambda/my-func",
                          },
                          "logGroupName": "/aws/lambda/my-func",
                          "subscriptionFilterRequest": Object {
                            "destinationArn": "my-forwarder",
                            "filterName": "datadog-ci-filter",
                            "filterPattern": "",
                            "logGroupName": "/aws/lambda/my-func",
                          },
                        }
                  `);
        }));
        test("adds a subscription filter when one doesn't exist", () => __awaiter(void 0, void 0, void 0, function* () {
            const logs = makeMockCloudWatch({
                '/aws/lambda/my-func': {
                    config: {
                        logGroups: [{ logGroupName: '/aws/lambda/my-func' }],
                    },
                    filters: {},
                },
            });
            const result = yield loggroup_1.calculateLogGroupUpdateRequest(logs, '/aws/lambda/my-func', 'my-forwarder');
            expect(result).toMatchInlineSnapshot(`
                Object {
                  "logGroupName": "/aws/lambda/my-func",
                  "subscriptionFilterRequest": Object {
                    "destinationArn": "my-forwarder",
                    "filterName": "datadog-ci-filter",
                    "filterPattern": "",
                    "logGroupName": "/aws/lambda/my-func",
                  },
                }
            `);
        }));
        test('updates a subscription filter when an owned one already exists', () => __awaiter(void 0, void 0, void 0, function* () {
            const logs = makeMockCloudWatch({
                '/aws/lambda/my-func': {
                    config: {
                        logGroups: [{ logGroupName: '/aws/lambda/my-func' }],
                    },
                    filters: {
                        subscriptionFilters: [
                            {
                                destinationArn: 'wrong-destination',
                                filterName: 'datadog-ci-filter',
                                logGroupName: '/aws/lambda/my-func',
                            },
                        ],
                    },
                },
            });
            const result = yield loggroup_1.calculateLogGroupUpdateRequest(logs, '/aws/lambda/my-func', 'my-forwarder');
            expect(result).toMatchInlineSnapshot(`
                Object {
                  "logGroupName": "/aws/lambda/my-func",
                  "subscriptionFilterRequest": Object {
                    "destinationArn": "my-forwarder",
                    "filterName": "datadog-ci-filter",
                    "filterPattern": "",
                    "logGroupName": "/aws/lambda/my-func",
                  },
                }
            `);
        }));
        test('throws an exception when an unowned subscription filter exists', () => __awaiter(void 0, void 0, void 0, function* () {
            const logs = makeMockCloudWatch({
                '/aws/lambda/my-func': {
                    config: {
                        logGroups: [{ logGroupName: '/aws/lambda/my-func' }],
                    },
                    filters: {
                        subscriptionFilters: [
                            {
                                destinationArn: 'wrong-destination',
                                filterName: 'wrong-filter-name',
                                logGroupName: '/aws/lambda/my-func',
                            },
                        ],
                    },
                },
            });
            const promise = loggroup_1.calculateLogGroupUpdateRequest(logs, '/aws/lambda/my-func', 'my-forwarder');
            yield expect(promise).rejects.toEqual(Error('Unknown subscription filter already on log group /aws/lambda/my-func. Only one subscription is allowed.'));
        }));
        test("doesn't update a subscription when filter is already correct", () => __awaiter(void 0, void 0, void 0, function* () {
            const logs = makeMockCloudWatch({
                '/aws/lambda/my-func': {
                    config: {
                        logGroups: [{ logGroupName: '/aws/lambda/my-func' }],
                    },
                    filters: {
                        subscriptionFilters: [
                            {
                                destinationArn: 'my-forwarder',
                                filterName: 'datadog-ci-filter',
                                logGroupName: '/aws/lambda/my-func',
                            },
                        ],
                    },
                },
            });
            const result = yield loggroup_1.calculateLogGroupUpdateRequest(logs, '/aws/lambda/my-func', 'my-forwarder');
            expect(result).toMatchInlineSnapshot('undefined');
        }));
    });
    describe('applyLogGroupConfiguration', () => {
        test('applies specified changes', () => __awaiter(void 0, void 0, void 0, function* () {
            const logs = makeMockCloudWatch({});
            const config = {
                createLogGroupRequest: {
                    logGroupName: '/aws/lambda/my-func',
                },
                deleteSubscriptionFilterRequest: {
                    filterName: 'datadog-ci-filter',
                    logGroupName: '/aws/lambda/my-func',
                },
                logGroupName: '/aws/lambda/my-func',
                subscriptionFilterRequest: {
                    destinationArn: 'my-forwarder',
                    filterName: 'datadog-ci-filter',
                    filterPattern: '',
                    logGroupName: '/aws/lambda/my-func',
                },
            };
            yield loggroup_1.applyLogGroupConfig(logs, config);
            expect(logs.createLogGroup).toHaveBeenCalledWith({
                logGroupName: '/aws/lambda/my-func',
            });
            expect(logs.deleteSubscriptionFilter).toHaveBeenCalledWith({
                filterName: 'datadog-ci-filter',
                logGroupName: '/aws/lambda/my-func',
            });
            expect(logs.putSubscriptionFilter).toHaveBeenCalledWith({
                destinationArn: 'my-forwarder',
                filterName: 'datadog-ci-filter',
                filterPattern: '',
                logGroupName: '/aws/lambda/my-func',
            });
        }));
        test("doesn't apply unspecified changes", () => __awaiter(void 0, void 0, void 0, function* () {
            const logs = makeMockCloudWatch({});
            const config = {
                logGroupName: '/aws/lambda/my-func',
                subscriptionFilterRequest: {
                    destinationArn: 'my-forwarder',
                    filterName: 'datadog-ci-filter',
                    filterPattern: '',
                    logGroupName: '/aws/lambda/my-func',
                },
            };
            yield loggroup_1.applyLogGroupConfig(logs, config);
            expect(logs.createLogGroup).not.toHaveBeenCalled();
            expect(logs.deleteSubscriptionFilter).not.toHaveBeenCalled();
            expect(logs.putSubscriptionFilter).toHaveBeenCalledWith({
                destinationArn: 'my-forwarder',
                filterName: 'datadog-ci-filter',
                filterPattern: '',
                logGroupName: '/aws/lambda/my-func',
            });
        }));
    });
});


/***/ }),

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

/***/ 255:
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getSubscriptionFilterState = exports.hasLogGroup = exports.calculateLogGroupUpdateRequest = exports.applyLogGroupConfig = exports.SubscriptionState = void 0;
const constants_1 = __nccwpck_require__(230);
var SubscriptionState;
(function (SubscriptionState) {
    SubscriptionState[SubscriptionState["Empty"] = 0] = "Empty";
    SubscriptionState[SubscriptionState["CorrectDestination"] = 1] = "CorrectDestination";
    SubscriptionState[SubscriptionState["WrongDestinationOwned"] = 2] = "WrongDestinationOwned";
    SubscriptionState[SubscriptionState["WrongDestinationUnowned"] = 3] = "WrongDestinationUnowned";
})(SubscriptionState = exports.SubscriptionState || (exports.SubscriptionState = {}));
const applyLogGroupConfig = (logs, configuration) => __awaiter(void 0, void 0, void 0, function* () {
    const { createLogGroupRequest, deleteSubscriptionFilterRequest, subscriptionFilterRequest } = configuration;
    if (createLogGroupRequest !== undefined) {
        yield logs.createLogGroup(createLogGroupRequest).promise();
    }
    if (deleteSubscriptionFilterRequest !== undefined) {
        yield logs.deleteSubscriptionFilter(deleteSubscriptionFilterRequest).promise();
    }
    yield logs.putSubscriptionFilter(subscriptionFilterRequest).promise();
});
exports.applyLogGroupConfig = applyLogGroupConfig;
const calculateLogGroupUpdateRequest = (logs, logGroupName, forwarderARN) => __awaiter(void 0, void 0, void 0, function* () {
    const config = {
        logGroupName,
        subscriptionFilterRequest: {
            destinationArn: forwarderARN,
            filterName: constants_1.SUBSCRIPTION_FILTER_NAME,
            filterPattern: '',
            logGroupName,
        },
    };
    const logGroupPresent = yield exports.hasLogGroup(logs, logGroupName);
    let subscriptionState = SubscriptionState.Empty;
    if (logGroupPresent) {
        subscriptionState = yield exports.getSubscriptionFilterState(logs, logGroupName, forwarderARN);
    }
    else {
        config.createLogGroupRequest = {
            logGroupName,
        };
    }
    if (subscriptionState === SubscriptionState.CorrectDestination) {
        // All up to date, nothing to be done
        return;
    }
    if (subscriptionState === SubscriptionState.WrongDestinationUnowned) {
        // Can't update, don't own the subscription
        throw Error(`Unknown subscription filter already on log group ${logGroupName}. Only one subscription is allowed.`);
    }
    return config;
});
exports.calculateLogGroupUpdateRequest = calculateLogGroupUpdateRequest;
const hasLogGroup = (logs, logGroupName) => __awaiter(void 0, void 0, void 0, function* () {
    const args = {
        logGroupNamePrefix: logGroupName,
    };
    const result = yield logs.describeLogGroups(args).promise();
    const { logGroups } = result;
    if (logGroups === undefined || logGroups.length === 0) {
        return false;
    }
    return logGroups.find((lg) => lg.logGroupName === logGroupName) !== undefined;
});
exports.hasLogGroup = hasLogGroup;
const getSubscriptionFilterState = (logs, logGroupName, forwarderARN) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionFilters } = yield logs.describeSubscriptionFilters({ logGroupName }).promise();
    if (subscriptionFilters === undefined || subscriptionFilters.length === 0) {
        return SubscriptionState.Empty;
    }
    if (subscriptionFilters.find((sf) => sf.destinationArn === forwarderARN) !== undefined) {
        return SubscriptionState.CorrectDestination;
    }
    if (subscriptionFilters.find((sf) => sf.filterName === constants_1.SUBSCRIPTION_FILTER_NAME)) {
        // Subscription filter was created by this CI tool
        return SubscriptionState.WrongDestinationOwned;
    }
    return SubscriptionState.WrongDestinationUnowned;
});
exports.getSubscriptionFilterState = getSubscriptionFilterState;


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
/******/ 	var __webpack_exports__ = __nccwpck_require__(861);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=loggroup.test.js.map