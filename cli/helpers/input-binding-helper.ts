import { AttributeType, ParsedAttribute } from './template-parser';
import { BaseAttributeHelper, AttributeProcessingContext, AttributeProcessingResult } from './base-attribute-helper';

export class InputBindingHelper extends BaseAttributeHelper {
    get supportedType(): string {
        return 'input-binding';
    }

    canHandle(attribute: ParsedAttribute): boolean {
        return attribute.type === AttributeType.INPUT_BINDING;
    }

    process(context: AttributeProcessingContext): AttributeProcessingResult {
        const propertyName = this.extractAttributeName(context.attribute.name);

        return {
            transformed: true,
            newAttribute: {
                name: `[${propertyName}]`,
                value: context.attribute.value,
                type: AttributeType.INPUT_BINDING,
            },
        };
    }
}
