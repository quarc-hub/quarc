import { AttributeType, ParsedAttribute } from './template-parser';
import { BaseAttributeHelper, AttributeProcessingContext, AttributeProcessingResult } from './base-attribute-helper';

export class OutputBindingHelper extends BaseAttributeHelper {
    get supportedType(): string {
        return 'output-binding';
    }

    canHandle(attribute: ParsedAttribute): boolean {
        return attribute.type === AttributeType.OUTPUT_BINDING;
    }

    process(context: AttributeProcessingContext): AttributeProcessingResult {
        const eventName = this.extractAttributeName(context.attribute.name);

        return {
            transformed: true,
            newAttribute: {
                name: `(${eventName})`,
                value: context.attribute.value,
                type: AttributeType.OUTPUT_BINDING,
            },
        };
    }
}
