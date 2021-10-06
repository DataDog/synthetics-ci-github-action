require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 942:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
jest.mock('../loggroup');
const constants_1 = __nccwpck_require__(230);
const function_1 = __nccwpck_require__(790);
const loggroup = __importStar(__nccwpck_require__(255));
const makeMockLambda = (functionConfigs) => ({
    getFunction: jest.fn().mockImplementation(({ FunctionName }) => ({
        promise: () => Promise.resolve({ Configuration: functionConfigs[FunctionName] }),
    })),
    listTags: jest.fn().mockImplementation(() => ({ promise: () => Promise.resolve({ Tags: {} }) })),
    tagResource: jest.fn().mockImplementation(() => ({ promise: () => Promise.resolve() })),
    updateFunctionConfiguration: jest.fn().mockImplementation(() => ({ promise: () => Promise.resolve() })),
});
const makeMockCloudWatchLogs = () => ({});
const mockAwsAccount = '123456789012';
describe('function', () => {
    describe('getLambdaConfigs', () => {
        const OLD_ENV = process.env;
        beforeEach(() => {
            jest.resetModules();
            process.env = {};
        });
        afterAll(() => {
            process.env = OLD_ENV;
        });
        test('returns the update request for each function', () => __awaiter(void 0, void 0, void 0, function* () {
            const lambda = makeMockLambda({
                'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument': {
                    FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                    Handler: 'index.handler',
                    Runtime: 'nodejs12.x',
                },
            });
            const cloudWatch = makeMockCloudWatchLogs();
            const settings = {
                flushMetricsToLogs: false,
                layerVersion: 22,
                logLevel: 'debug',
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const result = yield function_1.getLambdaConfigs(lambda, cloudWatch, 'us-east-1', ['arn:aws:lambda:us-east-1:000000000000:function:autoinstrument'], settings);
            expect(result.length).toEqual(1);
            expect(result[0].updateRequest).toMatchInlineSnapshot(`
        Object {
          "Environment": Object {
            "Variables": Object {
              "DD_FLUSH_TO_LOG": "false",
              "DD_LAMBDA_HANDLER": "index.handler",
              "DD_LOG_LEVEL": "debug",
              "DD_MERGE_XRAY_TRACES": "false",
              "DD_SITE": "datadoghq.com",
              "DD_TRACE_ENABLED": "false",
            },
          },
          "FunctionName": "arn:aws:lambda:us-east-1:000000000000:function:autoinstrument",
          "Handler": "/opt/nodejs/node_modules/datadog-lambda-js/handler.handler",
          "Layers": Array [
            "arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node12-x:22",
          ],
        }
      `);
        }));
        test('returns configurations without updateRequest when no changes need to be made', () => __awaiter(void 0, void 0, void 0, function* () {
            const lambda = makeMockLambda({
                'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument': {
                    Environment: {
                        Variables: {
                            [constants_1.FLUSH_TO_LOG_ENV_VAR]: 'false',
                            [constants_1.LAMBDA_HANDLER_ENV_VAR]: 'index.handler',
                            [constants_1.LOG_LEVEL_ENV_VAR]: 'debug',
                            [constants_1.MERGE_XRAY_TRACES_ENV_VAR]: 'false',
                            [constants_1.SITE_ENV_VAR]: 'datadoghq.com',
                            [constants_1.TRACE_ENABLED_ENV_VAR]: 'false',
                        },
                    },
                    FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                    Handler: '/opt/nodejs/node_modules/datadog-lambda-js/handler.handler',
                    Layers: [{ Arn: 'arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node12-x:22' }],
                    Runtime: 'nodejs12.x',
                },
            });
            const cloudWatch = makeMockCloudWatchLogs();
            const settings = {
                flushMetricsToLogs: false,
                layerVersion: 22,
                logLevel: 'debug',
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const result = yield function_1.getLambdaConfigs(lambda, cloudWatch, 'us-east-1', ['arn:aws:lambda:us-east-1:000000000000:function:autoinstrument'], settings);
            expect(result[0].updateRequest).toBeUndefined();
        }));
        test('replaces the layer arn when the version has changed', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const lambda = makeMockLambda({
                'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument': {
                    FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                    Layers: [
                        { Arn: 'arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node12-x:22' },
                        { Arn: 'arn:aws:lambda:us-east-1:464622532012:layer:AnotherLayer:10' },
                    ],
                    Runtime: 'nodejs12.x',
                },
            });
            const cloudWatch = makeMockCloudWatchLogs();
            const settings = {
                flushMetricsToLogs: false,
                layerVersion: 23,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const result = yield function_1.getLambdaConfigs(lambda, cloudWatch, 'us-east-1', ['arn:aws:lambda:us-east-1:000000000000:function:autoinstrument'], settings);
            expect((_a = result[0].updateRequest) === null || _a === void 0 ? void 0 : _a.Layers).toMatchInlineSnapshot(`
                      Array [
                        "arn:aws:lambda:us-east-1:464622532012:layer:AnotherLayer:10",
                        "arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node12-x:23",
                      ]
                `);
        }));
        test('uses the GovCloud lambda layer when a GovCloud region is detected', () => __awaiter(void 0, void 0, void 0, function* () {
            var _b;
            const lambda = makeMockLambda({
                'arn:aws-us-gov:lambda:us-gov-east-1:000000000000:function:autoinstrument': {
                    FunctionArn: 'arn:aws-us-gov:lambda:us-gov-east-1:000000000000:function:autoinstrument',
                    Runtime: 'nodejs12.x',
                },
            });
            const cloudWatch = makeMockCloudWatchLogs();
            const settings = {
                flushMetricsToLogs: false,
                layerVersion: 30,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const result = yield function_1.getLambdaConfigs(lambda, cloudWatch, 'us-gov-east-1', ['arn:aws-us-gov:lambda:us-gov-east-1:000000000000:function:autoinstrument'], settings);
            expect((_b = result[0].updateRequest) === null || _b === void 0 ? void 0 : _b.Layers).toMatchInlineSnapshot(`
                      Array [
                        "arn:aws-us-gov:lambda:us-gov-east-1:002406178527:layer:Datadog-Node12-x:30",
                      ]
                `);
        }));
        test('returns results for multiple functions', () => __awaiter(void 0, void 0, void 0, function* () {
            const lambda = makeMockLambda({
                'arn:aws:lambda:us-east-1:000000000000:function:another-func': {
                    FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:another-func',
                    Runtime: 'nodejs12.x',
                },
                'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument': {
                    FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                    Runtime: 'nodejs12.x',
                },
            });
            const cloudWatch = makeMockCloudWatchLogs();
            const settings = {
                flushMetricsToLogs: false,
                layerVersion: 23,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const result = yield function_1.getLambdaConfigs(lambda, cloudWatch, 'us-east-1', [
                'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                'arn:aws:lambda:us-east-1:000000000000:function:another-func',
            ], settings);
            expect(result.length).toEqual(2);
        }));
        test('throws an error when it encounters an unsupported runtime', () => __awaiter(void 0, void 0, void 0, function* () {
            const lambda = makeMockLambda({
                'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument': {
                    FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                    Runtime: 'go',
                },
            });
            const cloudWatch = makeMockCloudWatchLogs();
            const settings = {
                flushMetricsToLogs: false,
                layerVersion: 23,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            yield expect(function_1.getLambdaConfigs(lambda, cloudWatch, 'us-east-1', ['arn:aws:lambda:us-east-1:000000000000:function:autoinstrument'], settings)).rejects.toThrow();
        }));
        test('requests log group configuration when forwarderARN is set', () => __awaiter(void 0, void 0, void 0, function* () {
            ;
            loggroup.calculateLogGroupUpdateRequest.mockImplementation(() => ({ logGroupName: '/aws/lambda/group' }));
            const lambda = makeMockLambda({
                'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument': {
                    FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                    Handler: 'index.handler',
                    Runtime: 'nodejs12.x',
                },
            });
            const cloudWatch = makeMockCloudWatchLogs();
            const settings = {
                flushMetricsToLogs: false,
                forwarderARN: 'my-forwarder',
                layerVersion: 22,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const result = yield function_1.getLambdaConfigs(lambda, cloudWatch, 'us-east-1', ['arn:aws:lambda:us-east-1:000000000000:function:autoinstrument'], settings);
            expect(result.length).toEqual(1);
            expect(result[0].logGroupConfiguration).toMatchInlineSnapshot(`
                Object {
                  "logGroupName": "/aws/lambda/group",
                }
            `);
        }));
    });
    describe('updateLambdaConfigs', () => {
        const OLD_ENV = process.env;
        beforeEach(() => {
            jest.resetModules();
            process.env = {};
        });
        afterAll(() => {
            process.env = OLD_ENV;
        });
        test('updates every lambda', () => __awaiter(void 0, void 0, void 0, function* () {
            const lambda = makeMockLambda({});
            const configs = [
                {
                    functionARN: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                    lambdaConfig: {
                        FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                        Handler: 'index.handler',
                        Runtime: 'nodejs12.x',
                    },
                    lambdaLibraryLayerArn: 'arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node12-x',
                    updateRequest: {
                        Environment: {
                            Variables: {
                                [constants_1.LAMBDA_HANDLER_ENV_VAR]: 'index.handler',
                                [constants_1.MERGE_XRAY_TRACES_ENV_VAR]: 'false',
                                [constants_1.TRACE_ENABLED_ENV_VAR]: 'false',
                            },
                        },
                        FunctionName: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                        Handler: '/opt/nodejs/node_modules/datadog-lambda-js/handler.handler',
                        Layers: ['arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node12-x:22'],
                    },
                },
            ];
            const cloudWatch = makeMockCloudWatchLogs();
            yield function_1.updateLambdaConfigs(lambda, cloudWatch, configs);
            expect(lambda.updateFunctionConfiguration).toHaveBeenCalledWith({
                Environment: {
                    Variables: {
                        [constants_1.LAMBDA_HANDLER_ENV_VAR]: 'index.handler',
                        [constants_1.MERGE_XRAY_TRACES_ENV_VAR]: 'false',
                        [constants_1.TRACE_ENABLED_ENV_VAR]: 'false',
                    },
                },
                FunctionName: 'arn:aws:lambda:us-east-1:000000000000:function:autoinstrument',
                Handler: '/opt/nodejs/node_modules/datadog-lambda-js/handler.handler',
                Layers: ['arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node12-x:22'],
            });
        }));
    });
    describe('getLayerArn', () => {
        const OLD_ENV = process.env;
        beforeEach(() => {
            jest.resetModules();
            process.env = {};
        });
        afterAll(() => {
            process.env = OLD_ENV;
        });
        test('gets sa-east-1 Node12 Lambda Library layer ARN', () => __awaiter(void 0, void 0, void 0, function* () {
            const runtime = 'nodejs12.x';
            const settings = {
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const region = 'sa-east-1';
            const layerArn = function_1.getLayerArn(runtime, settings, region);
            expect(layerArn).toEqual(`arn:aws:lambda:${region}:${mockAwsAccount}:layer:Datadog-Node12-x`);
        }));
        test('gets sa-east-1 Python37 gov cloud Lambda Library layer ARN', () => __awaiter(void 0, void 0, void 0, function* () {
            const runtime = 'python3.7';
            const settings = {
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const region = 'us-gov-1';
            const layerArn = function_1.getLayerArn(runtime, settings, region);
            expect(layerArn).toEqual(`arn:aws-us-gov:lambda:${region}:${constants_1.GOVCLOUD_LAYER_AWS_ACCOUNT}:layer:Datadog-Python37`);
        }));
    });
    describe('getExtensionArn', () => {
        const OLD_ENV = process.env;
        beforeEach(() => {
            jest.resetModules();
            process.env = {};
        });
        afterAll(() => {
            process.env = OLD_ENV;
        });
        test('gets sa-east-1 Lambda Extension layer ARN', () => __awaiter(void 0, void 0, void 0, function* () {
            const settings = {
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const region = 'sa-east-1';
            const layerArn = function_1.getExtensionArn(settings, region);
            expect(layerArn).toEqual(`arn:aws:lambda:${region}:${mockAwsAccount}:layer:Datadog-Extension`);
        }));
        test('gets sa-east-1 gov cloud Lambda Extension layer ARN', () => __awaiter(void 0, void 0, void 0, function* () {
            const settings = {
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const region = 'us-gov-1';
            const layerArn = function_1.getExtensionArn(settings, region);
            expect(layerArn).toEqual(`arn:aws-us-gov:lambda:${region}:${constants_1.GOVCLOUD_LAYER_AWS_ACCOUNT}:layer:Datadog-Extension`);
        }));
    });
    describe('calculateUpdateRequest', () => {
        const OLD_ENV = process.env;
        beforeEach(() => {
            jest.resetModules();
            process.env = {};
        });
        afterAll(() => {
            process.env = OLD_ENV;
        });
        test('calculates an update request with just lambda library layers', () => {
            const config = {
                FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world',
                Handler: 'index.handler',
                Layers: [],
            };
            const settings = {
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                layerVersion: 5,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const lambdaLibraryLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Node12-x`;
            const lambdaExtensionLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Extension`;
            const runtime = 'nodejs12.x';
            const updateRequest = function_1.calculateUpdateRequest(config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime);
            expect(updateRequest).toMatchInlineSnapshot(`
        Object {
          "Environment": Object {
            "Variables": Object {
              "DD_FLUSH_TO_LOG": "false",
              "DD_LAMBDA_HANDLER": "index.handler",
              "DD_MERGE_XRAY_TRACES": "false",
              "DD_SITE": "datadoghq.com",
              "DD_TRACE_ENABLED": "false",
            },
          },
          "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world",
          "Handler": "/opt/nodejs/node_modules/datadog-lambda-js/handler.handler",
          "Layers": Array [
            "arn:aws:lambda:sa-east-1:123456789012:layer:Datadog-Node12-x:5",
          ],
        }
      `);
        });
        test('calculates an update request with a lambda library, extension, and DATADOG_API_KEY', () => {
            process.env.DATADOG_API_KEY = '1234';
            const config = {
                FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world',
                Handler: 'index.handler',
                Layers: [],
            };
            const settings = {
                extensionVersion: 6,
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                layerVersion: 5,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const lambdaLibraryLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Node12-x`;
            const lambdaExtensionLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Extension`;
            const runtime = 'nodejs12.x';
            const updateRequest = function_1.calculateUpdateRequest(config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime);
            expect(updateRequest).toMatchInlineSnapshot(`
        Object {
          "Environment": Object {
            "Variables": Object {
              "DD_API_KEY": "1234",
              "DD_FLUSH_TO_LOG": "false",
              "DD_LAMBDA_HANDLER": "index.handler",
              "DD_MERGE_XRAY_TRACES": "false",
              "DD_SITE": "datadoghq.com",
              "DD_TRACE_ENABLED": "false",
            },
          },
          "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world",
          "Handler": "/opt/nodejs/node_modules/datadog-lambda-js/handler.handler",
          "Layers": Array [
            "arn:aws:lambda:sa-east-1:123456789012:layer:Datadog-Extension:6",
            "arn:aws:lambda:sa-east-1:123456789012:layer:Datadog-Node12-x:5",
          ],
        }
      `);
        });
        test('calculates an update request with a lambda library, extension, and DATADOG_KMS_API_KEY', () => {
            process.env.DATADOG_KMS_API_KEY = '5678';
            const config = {
                FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world',
                Handler: 'index.handler',
                Layers: [],
            };
            const settings = {
                extensionVersion: 6,
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                layerVersion: 5,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const lambdaLibraryLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Python36`;
            const lambdaExtensionLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Extension`;
            const runtime = 'python3.6';
            const updateRequest = function_1.calculateUpdateRequest(config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime);
            expect(updateRequest).toMatchInlineSnapshot(`
        Object {
          "Environment": Object {
            "Variables": Object {
              "DD_FLUSH_TO_LOG": "false",
              "DD_KMS_API_KEY": "5678",
              "DD_LAMBDA_HANDLER": "index.handler",
              "DD_MERGE_XRAY_TRACES": "false",
              "DD_SITE": "datadoghq.com",
              "DD_TRACE_ENABLED": "false",
            },
          },
          "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world",
          "Handler": "datadog_lambda.handler.handler",
          "Layers": Array [
            "arn:aws:lambda:sa-east-1:123456789012:layer:Datadog-Extension:6",
            "arn:aws:lambda:sa-east-1:123456789012:layer:Datadog-Python36:5",
          ],
        }
      `);
        });
        test('by default calculates an update request with DATADOG_SITE being set to datadoghq.com', () => {
            const config = {
                FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world',
                Handler: 'index.handler',
                Layers: [],
            };
            const settings = {
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const lambdaLibraryLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Python36`;
            const lambdaExtensionLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Extension`;
            const runtime = 'python3.6';
            const updateRequest = function_1.calculateUpdateRequest(config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime);
            expect(updateRequest).toMatchInlineSnapshot(`
        Object {
          "Environment": Object {
            "Variables": Object {
              "DD_FLUSH_TO_LOG": "false",
              "DD_LAMBDA_HANDLER": "index.handler",
              "DD_MERGE_XRAY_TRACES": "false",
              "DD_SITE": "datadoghq.com",
              "DD_TRACE_ENABLED": "false",
            },
          },
          "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world",
          "Handler": "datadog_lambda.handler.handler",
        }
      `);
        });
        test('calculates an update request with DATADOG_SITE being set to datadoghq.eu', () => {
            process.env.DATADOG_SITE = 'datadoghq.eu';
            const config = {
                FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world',
                Handler: 'index.handler',
                Layers: [],
            };
            const settings = {
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const lambdaLibraryLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Python36`;
            const lambdaExtensionLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Extension`;
            const runtime = 'python3.6';
            const updateRequest = function_1.calculateUpdateRequest(config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime);
            expect(updateRequest).toMatchInlineSnapshot(`
        Object {
          "Environment": Object {
            "Variables": Object {
              "DD_FLUSH_TO_LOG": "false",
              "DD_LAMBDA_HANDLER": "index.handler",
              "DD_MERGE_XRAY_TRACES": "false",
              "DD_SITE": "datadoghq.eu",
              "DD_TRACE_ENABLED": "false",
            },
          },
          "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world",
          "Handler": "datadog_lambda.handler.handler",
        }
      `);
        });
        test('throws an error when an invalid DATADOG_SITE url is given', () => {
            process.env.DATADOG_SITE = 'datacathq.eu';
            const config = {
                FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world',
                Handler: 'index.handler',
                Layers: [],
            };
            const settings = {
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                layerVersion: 5,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const lambdaLibraryLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Python36`;
            const lambdaExtensionLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Extension`;
            const runtime = 'python3.6';
            expect(() => {
                function_1.calculateUpdateRequest(config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime);
            }).toThrowError('Warning: Invalid site URL. Must be either datadoghq.com, datadoghq.eu, us3.datadoghq.com, or ddog-gov.com.');
        });
        test('throws an error when neither DATADOG_API_KEY nor DATADOG_KMS_API_KEY are given through the environment while using extensionVersion', () => {
            const config = {
                FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:lambda-hello-world',
                Handler: 'index.handler',
                Layers: [],
            };
            const settings = {
                extensionVersion: 6,
                flushMetricsToLogs: false,
                layerAWSAccount: mockAwsAccount,
                layerVersion: 5,
                mergeXrayTraces: false,
                tracingEnabled: false,
            };
            const lambdaLibraryLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Python36`;
            const lambdaExtensionLayerArn = `arn:aws:lambda:sa-east-1:${mockAwsAccount}:layer:Datadog-Extension`;
            const runtime = 'python3.6';
            expect(() => {
                function_1.calculateUpdateRequest(config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime);
            }).toThrowError("When 'extensionLayer' is set, DATADOG_API_KEY or DATADOG_KMS_API_KEY must also be set");
        });
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

/***/ 790:
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
exports.calculateUpdateRequest = exports.getExtensionArn = exports.getLayerArn = exports.updateLambdaConfigs = exports.getLambdaConfigs = void 0;
const constants_1 = __nccwpck_require__(230);
const loggroup_1 = __nccwpck_require__(255);
const tags_1 = __nccwpck_require__(762);
const MAX_LAMBDA_STATE_CHECKS = 3;
/**
 * Waits for n ms
 * @param ms
 * @returns
 */
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const isLambdaActive = (lambda, config, functionArn, attempts = 0) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO remove 1 Oct 2021 https://aws.amazon.com/blogs/compute/tracking-the-state-of-lambda-functions/
    if (!config.State || !config.LastUpdateStatus) {
        return true;
    }
    if (config.LastUpdateStatus === 'Successful' && config.State === 'Active') {
        return true;
    }
    if (config.State === 'Pending' && attempts <= MAX_LAMBDA_STATE_CHECKS) {
        yield wait(Math.pow(2, attempts) * 1000);
        const refetchedConfig = yield getLambdaConfig(lambda, functionArn);
        return isLambdaActive(lambda, refetchedConfig.config, functionArn, (attempts += 1));
    }
    throw Error(`Can't instrument ${functionArn}, as current State is ${config.State} (must be "Active") and Last Update Status is ${config.LastUpdateStatus} (must be "Successful")`);
});
const getLambdaConfigs = (lambda, cloudWatch, region, functionARNs, settings) => __awaiter(void 0, void 0, void 0, function* () {
    const resultPromises = functionARNs.map((fn) => getLambdaConfig(lambda, fn));
    const results = yield Promise.all(resultPromises);
    const functionsToUpdate = [];
    for (const { config, functionARN } of results) {
        const runtime = config.Runtime;
        if (!isSupportedRuntime(runtime)) {
            throw Error(`Can't instrument ${functionARN}, runtime ${runtime} not supported`);
        }
        yield isLambdaActive(lambda, config, functionARN);
        const lambdaLibraryLayerArn = exports.getLayerArn(runtime, settings, region);
        const lambdaExtensionLayerArn = exports.getExtensionArn(settings, region);
        const updateRequest = exports.calculateUpdateRequest(config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime);
        let logGroupConfiguration;
        if (settings.forwarderARN !== undefined) {
            const arn = `/aws/lambda/${config.FunctionName}`;
            logGroupConfiguration = yield loggroup_1.calculateLogGroupUpdateRequest(cloudWatch, arn, settings.forwarderARN);
        }
        const tagConfiguration = yield tags_1.calculateTagUpdateRequest(lambda, functionARN);
        functionsToUpdate.push({
            functionARN,
            lambdaConfig: config,
            lambdaLibraryLayerArn,
            logGroupConfiguration,
            tagConfiguration,
            updateRequest,
        });
    }
    return functionsToUpdate;
});
exports.getLambdaConfigs = getLambdaConfigs;
const updateLambdaConfigs = (lambda, cloudWatch, configurations) => __awaiter(void 0, void 0, void 0, function* () {
    const results = configurations.map((c) => __awaiter(void 0, void 0, void 0, function* () {
        if (c.updateRequest !== undefined) {
            yield lambda.updateFunctionConfiguration(c.updateRequest).promise();
        }
        if (c.logGroupConfiguration !== undefined) {
            yield loggroup_1.applyLogGroupConfig(cloudWatch, c.logGroupConfiguration);
        }
        if (c.tagConfiguration !== undefined) {
            yield tags_1.applyTagConfig(lambda, c.tagConfiguration);
        }
    }));
    yield Promise.all(results);
});
exports.updateLambdaConfigs = updateLambdaConfigs;
const getLambdaConfig = (lambda, functionARN) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        FunctionName: functionARN,
    };
    const result = yield lambda.getFunction(params).promise();
    // AWS typescript API is slightly mistyped, adds undefineds where
    // there shouldn't be.
    const config = result.Configuration;
    const resolvedFunctionARN = config.FunctionArn;
    return { config, functionARN: resolvedFunctionARN };
});
const getLayerArn = (runtime, settings, region) => {
    var _a;
    const layerName = constants_1.RUNTIME_LAYER_LOOKUP[runtime];
    const account = (_a = settings.layerAWSAccount) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_LAYER_AWS_ACCOUNT;
    const isGovCloud = region.startsWith('us-gov');
    if (isGovCloud) {
        return `arn:aws-us-gov:lambda:${region}:${constants_1.GOVCLOUD_LAYER_AWS_ACCOUNT}:layer:${layerName}`;
    }
    return `arn:aws:lambda:${region}:${account}:layer:${layerName}`;
};
exports.getLayerArn = getLayerArn;
const getExtensionArn = (settings, region) => {
    var _a;
    const layerName = constants_1.DD_LAMBDA_EXTENSION_LAYER_NAME;
    const account = (_a = settings.layerAWSAccount) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_LAYER_AWS_ACCOUNT;
    const isGovCloud = region.startsWith('us-gov');
    if (isGovCloud) {
        return `arn:aws-us-gov:lambda:${region}:${constants_1.GOVCLOUD_LAYER_AWS_ACCOUNT}:layer:${layerName}`;
    }
    return `arn:aws:lambda:${region}:${account}:layer:${layerName}`;
};
exports.getExtensionArn = getExtensionArn;
const calculateUpdateRequest = (config, settings, lambdaLibraryLayerArn, lambdaExtensionLayerArn, runtime) => {
    var _a, _b, _c, _d;
    const oldEnvVars = Object.assign({}, (_a = config.Environment) === null || _a === void 0 ? void 0 : _a.Variables);
    const changedEnvVars = {};
    const functionARN = config.FunctionArn;
    const apiKey = process.env[constants_1.CI_API_KEY_ENV_VAR];
    const apiKmsKey = process.env[constants_1.CI_KMS_API_KEY_ENV_VAR];
    const site = process.env[constants_1.CI_SITE_ENV_VAR];
    if (functionARN === undefined) {
        return undefined;
    }
    const updateRequest = {
        FunctionName: functionARN,
    };
    let needsUpdate = false;
    // Update Handler
    const expectedHandler = constants_1.HANDLER_LOCATION[runtime];
    if (config.Handler !== expectedHandler) {
        needsUpdate = true;
        updateRequest.Handler = constants_1.HANDLER_LOCATION[runtime];
    }
    // Update Env Vars
    if (oldEnvVars[constants_1.LAMBDA_HANDLER_ENV_VAR] === undefined) {
        needsUpdate = true;
        changedEnvVars[constants_1.LAMBDA_HANDLER_ENV_VAR] = (_b = config.Handler) !== null && _b !== void 0 ? _b : '';
    }
    if (apiKey !== undefined && oldEnvVars[constants_1.API_KEY_ENV_VAR] !== apiKey) {
        needsUpdate = true;
        changedEnvVars[constants_1.API_KEY_ENV_VAR] = apiKey;
    }
    if (apiKmsKey !== undefined && oldEnvVars[constants_1.KMS_API_KEY_ENV_VAR] !== apiKmsKey) {
        needsUpdate = true;
        changedEnvVars[constants_1.KMS_API_KEY_ENV_VAR] = apiKmsKey;
    }
    if (site !== undefined && oldEnvVars[constants_1.SITE_ENV_VAR] !== site) {
        const siteList = ['datadoghq.com', 'datadoghq.eu', 'us3.datadoghq.com', 'ddog-gov.com'];
        if (siteList.includes(site.toLowerCase())) {
            needsUpdate = true;
            changedEnvVars[constants_1.SITE_ENV_VAR] = site;
        }
        else {
            throw new Error('Warning: Invalid site URL. Must be either datadoghq.com, datadoghq.eu, us3.datadoghq.com, or ddog-gov.com.');
        }
    }
    if (site === undefined && oldEnvVars[constants_1.SITE_ENV_VAR] === undefined) {
        needsUpdate = true;
        changedEnvVars[constants_1.SITE_ENV_VAR] = 'datadoghq.com';
    }
    if (oldEnvVars[constants_1.TRACE_ENABLED_ENV_VAR] !== settings.tracingEnabled.toString()) {
        needsUpdate = true;
        changedEnvVars[constants_1.TRACE_ENABLED_ENV_VAR] = settings.tracingEnabled.toString();
    }
    if (oldEnvVars[constants_1.MERGE_XRAY_TRACES_ENV_VAR] !== settings.mergeXrayTraces.toString()) {
        needsUpdate = true;
        changedEnvVars[constants_1.MERGE_XRAY_TRACES_ENV_VAR] = settings.mergeXrayTraces.toString();
    }
    if (oldEnvVars[constants_1.FLUSH_TO_LOG_ENV_VAR] !== settings.flushMetricsToLogs.toString()) {
        needsUpdate = true;
        changedEnvVars[constants_1.FLUSH_TO_LOG_ENV_VAR] = settings.flushMetricsToLogs.toString();
    }
    const newEnvVars = Object.assign(Object.assign({}, oldEnvVars), changedEnvVars);
    if (newEnvVars[constants_1.LOG_LEVEL_ENV_VAR] !== settings.logLevel) {
        needsUpdate = true;
        if (settings.logLevel) {
            newEnvVars[constants_1.LOG_LEVEL_ENV_VAR] = settings.logLevel;
        }
        else {
            delete newEnvVars[constants_1.LOG_LEVEL_ENV_VAR];
        }
    }
    updateRequest.Environment = {
        Variables: newEnvVars,
    };
    // Update Layers
    let fullLambdaLibraryLayerARN;
    if (settings.layerVersion !== undefined) {
        fullLambdaLibraryLayerARN = `${lambdaLibraryLayerArn}:${settings.layerVersion}`;
    }
    let fullExtensionLayerARN;
    if (settings.extensionVersion !== undefined) {
        fullExtensionLayerARN = `${lambdaExtensionLayerArn}:${settings.extensionVersion}`;
    }
    let layerARNs = ((_c = config.Layers) !== null && _c !== void 0 ? _c : []).map((layer) => { var _a; return (_a = layer.Arn) !== null && _a !== void 0 ? _a : ''; });
    const originalLayerARNs = ((_d = config.Layers) !== null && _d !== void 0 ? _d : []).map((layer) => { var _a; return (_a = layer.Arn) !== null && _a !== void 0 ? _a : ''; });
    let needsLayerUpdate = false;
    layerARNs = addLayerARN(fullLambdaLibraryLayerARN, lambdaLibraryLayerArn, layerARNs);
    layerARNs = addLayerARN(fullExtensionLayerARN, lambdaExtensionLayerArn, layerARNs);
    if (originalLayerARNs.sort().join(',') !== layerARNs.sort().join(',')) {
        needsLayerUpdate = true;
    }
    if (needsLayerUpdate) {
        needsUpdate = true;
        updateRequest.Layers = layerARNs;
    }
    layerARNs.forEach((layerARN) => {
        if (layerARN.includes(constants_1.DD_LAMBDA_EXTENSION_LAYER_NAME) &&
            newEnvVars[constants_1.API_KEY_ENV_VAR] === undefined &&
            newEnvVars[constants_1.KMS_API_KEY_ENV_VAR] === undefined) {
            throw new Error(`When 'extensionLayer' is set, ${constants_1.CI_API_KEY_ENV_VAR} or ${constants_1.CI_KMS_API_KEY_ENV_VAR} must also be set`);
        }
    });
    return needsUpdate ? updateRequest : undefined;
};
exports.calculateUpdateRequest = calculateUpdateRequest;
const addLayerARN = (fullLayerARN, partialLayerARN, layerARNs) => {
    if (fullLayerARN) {
        if (!layerARNs.includes(fullLayerARN)) {
            // Remove any other versions of the layer
            layerARNs = [...layerARNs.filter((l) => !l.startsWith(partialLayerARN)), fullLayerARN];
        }
    }
    return layerARNs;
};
const isSupportedRuntime = (runtime) => {
    const lookup = constants_1.RUNTIME_LAYER_LOOKUP;
    return runtime !== undefined && lookup[runtime] !== undefined;
};


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
/******/ 	var __webpack_exports__ = __nccwpck_require__(942);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=function.test.js.map