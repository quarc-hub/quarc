import { AttributeType, ParsedAttribute } from './template-parser';
import { BaseAttributeHelper, AttributeProcessingContext, AttributeProcessingResult } from './base-attribute-helper';

export class TemplateReferenceHelper extends BaseAttributeHelper {
    get supportedType(): string {
        return 'template-reference';
    }

    canHandle(attribute: ParsedAttribute): boolean {
        return attribute.type === AttributeType.TEMPLATE_REFERENCE;
    }

    process(context: AttributeProcessingContext): AttributeProcessingResult {
        const referenceName = this.extractAttributeName(context.attribute.name);

        return {
            transformed: true,
            newAttribute: {
                name: `#${referenceName}`,
                value: context.attribute.value,
                type: AttributeType.TEMPLATE_REFERENCE,
            },
        };
    }
}
