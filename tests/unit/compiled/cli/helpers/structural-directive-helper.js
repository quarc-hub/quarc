"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuralDirectiveHelper = void 0;
const template_parser_1 = require("./template-parser");
const base_attribute_helper_1 = require("./base-attribute-helper");
class StructuralDirectiveHelper extends base_attribute_helper_1.BaseAttributeHelper {
    get supportedType() {
        return 'structural-directive';
    }
    canHandle(attribute) {
        return attribute.type === template_parser_1.AttributeType.STRUCTURAL_DIRECTIVE;
    }
    process(context) {
        const directiveName = this.extractAttributeName(context.attribute.name);
        switch (directiveName) {
            case 'ngif':
            case 'ngIf':
                return this.processNgIf(context);
            case 'ngfor':
            case 'ngFor':
                return this.processNgFor(context);
            case 'ngswitch':
            case 'ngSwitch':
                return this.processNgSwitch(context);
            default:
                return { transformed: false };
        }
    }
    processNgIf(context) {
        return {
            transformed: true,
            newAttribute: {
                name: '*ngIf',
                value: context.attribute.value,
                type: template_parser_1.AttributeType.STRUCTURAL_DIRECTIVE,
            },
        };
    }
    processNgFor(context) {
        return {
            transformed: true,
            newAttribute: {
                name: '*ngFor',
                value: context.attribute.value,
                type: template_parser_1.AttributeType.STRUCTURAL_DIRECTIVE,
            },
        };
    }
    processNgSwitch(context) {
        return {
            transformed: true,
            newAttribute: {
                name: '*ngSwitch',
                value: context.attribute.value,
                type: template_parser_1.AttributeType.STRUCTURAL_DIRECTIVE,
            },
        };
    }
}
exports.StructuralDirectiveHelper = StructuralDirectiveHelper;
