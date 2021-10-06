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
exports.CommitInfo = void 0;
class CommitInfo {
    constructor(hash, remote, trackedFiles) {
        this.repositoryPayload = () => JSON.stringify({
            data: [
                {
                    files: this.trackedFiles,
                    hash: this.hash,
                    repository_url: this.remote,
                },
            ],
            // Make sure to update the version if the format of the JSON payloads changes in any way.
            version: 1,
        });
        this.hash = hash;
        this.remote = remote;
        this.trackedFiles = trackedFiles;
    }
    asMultipartPayload(cliVersion) {
        return {
            content: new Map([
                ['cli_version', { value: cliVersion }],
                ['type', { value: 'repository' }],
                [
                    'repository',
                    {
                        options: {
                            contentType: 'application/json',
                            filename: 'repository',
                        },
                        value: this.repositoryPayload(),
                    },
                ],
                ['git_repository_url', { value: this.remote }],
                ['git_commit_sha', { value: this.hash }],
            ]),
        };
    }
}
exports.CommitInfo = CommitInfo;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=interfaces.js.map