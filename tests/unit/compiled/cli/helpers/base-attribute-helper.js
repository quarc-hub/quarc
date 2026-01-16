"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAttributeHelper = void 0;
class BaseAttributeHelper {
    extractAttributeName(fullName) {
        return fullName.replace(/^\*/, '')
            .replace(/^\[/, '').replace(/\]$/, '')
            .replace(/^\(/, '').replace(/\)$/, '')
            .replace(/^\[\(/, '').replace(/\)\]$/, '')
            .replace(/^#/, '');
    }
}
exports.BaseAttributeHelper = BaseAttributeHelper;
