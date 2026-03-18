"use strict";
exports.id = 23;
exports.ids = [23];
exports.modules = {

/***/ 67023:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ isDocker)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(87561);


let isDockerCached;

function hasDockerEnv() {
	try {
		node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync('/.dockerenv');
		return true;
	} catch {
		return false;
	}
}

function hasDockerCGroup() {
	try {
		return node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
	} catch {
		return false;
	}
}

function hasDockerMountInfo() {
	try {
		return node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync('/proc/self/mountinfo', 'utf8').includes('/docker/containers/');
	} catch {
		return false;
	}
}

function isDocker() {
	isDockerCached ??= hasDockerEnv() || hasDockerCGroup() || hasDockerMountInfo();
	return isDockerCached;
}


/***/ })

};
;
//# sourceMappingURL=23.index.js.map