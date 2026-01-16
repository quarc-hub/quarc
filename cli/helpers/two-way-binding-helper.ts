import { AttributeType, ParsedAttribute } from './template-parser';
import { BaseAttributeHelper, AttributeProcessingContext, AttributeProcessingResult } from './base-attribute-helper';

export class TwoWayBindingHelper extends BaseAttributeHelper {
    get supportedType(): string {
        return 'two-way-binding';
    }

    canHandle(attribute: ParsedAttribute): boolean {
        return attribute.type === AttributeType.TWO_WAY_BINDING;
    }

    process(context: AttributeProcessingContext): AttributeProcessingResult {
        const propertyName = this.extractAttributeName(context.attribute.name);

        return {
            transformed: true,
            newAttribute: {
                name: `[(${propertyName})]`,
                value: context.attribute.value,
                type: AttributeType.TWO_WAY_BINDING,
            },
        };
    }
}
