"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatRunData = exports.isCurrentValidationData = exports.normalizeValidationData = void 0;
function normalizeValidationData(data) {
    if (isCurrentValidationData(data)) {
        return data;
    }
    else if (Array.isArray(data)) {
        return { version: '3', log: data };
    }
    else {
        return { version: '3', log: [data] };
    }
}
exports.normalizeValidationData = normalizeValidationData;
function isCurrentValidationData(data) {
    if (Array.isArray(data)) {
        return false;
    }
    else if (!('version' in data)) {
        return false;
    }
    else if (data.version === '3') {
        return true;
    }
    else {
        throw new Error('Unknown version or malformed validation data');
    }
}
exports.isCurrentValidationData = isCurrentValidationData;
function concatRunData(newRunData, previousData) {
    var _a;
    return {
        version: '3',
        log: [newRunData].concat((_a = previousData === null || previousData === void 0 ? void 0 : previousData.log) !== null && _a !== void 0 ? _a : []),
    };
}
exports.concatRunData = concatRunData;
//# sourceMappingURL=data.js.map