import { AttributeType, ParsedAttribute } from './template-parser';
import { BaseAttributeHelper, AttributeProcessingContext, AttributeProcessingResult } from './base-attribute-helper';

export class StructuralDirectiveHelper extends BaseAttributeHelper {
    get supportedType(): string {
        return 'structural-directive';
    }

    canHandle(attribute: ParsedAttribute): boolean {
        return attribute.type === AttributeType.STRUCTURAL_DIRECTIVE;
    }

    process(context: AttributeProcessingContext): AttributeProcessingResult {
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

    private processNgIf(context: AttributeProcessingContext): AttributeProcessingResult {
        return {
            transformed: true,
            newAttribute: {
                name: '*ngIf',
                value: context.attribute.value,
                type: AttributeType.STRUCTURAL_DIRECTIVE,
            },
        };
    }

    private processNgFor(context: AttributeProcessingContext): AttributeProcessingResult {
        return {
            transformed: true,
            newAttribute: {
                name: '*ngFor',
                value: context.attribute.value,
                type: AttributeType.STRUCTURAL_DIRECTIVE,
            },
        };
    }

    private processNgSwitch(context: AttributeProcessingContext): AttributeProcessingResult {
        return {
            transformed: true,
            newAttribute: {
                name: '*ngSwitch',
                value: context.attribute.value,
                type: AttributeType.STRUCTURAL_DIRECTIVE,
            },
        };
    }
}
