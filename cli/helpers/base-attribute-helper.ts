import { ParsedAttribute, ParsedElement } from './template-parser';

export interface AttributeProcessingContext {
    element: ParsedElement;
    attribute: ParsedAttribute;
    filePath: string;
}

export interface AttributeProcessingResult {
    transformed: boolean;
    newAttribute?: ParsedAttribute;
    additionalAttributes?: ParsedAttribute[];
    removeOriginal?: boolean;
}

export abstract class BaseAttributeHelper {
    abstract get supportedType(): string;

    abstract canHandle(attribute: ParsedAttribute): boolean;

    abstract process(context: AttributeProcessingContext): AttributeProcessingResult;

    protected extractAttributeName(fullName: string): string {
        return fullName.replace(/^\*/, '')
            .replace(/^\[/, '').replace(/\]$/, '')
            .replace(/^\(/, '').replace(/\)$/, '')
            .replace(/^\[\(/, '').replace(/\)\]$/, '')
            .replace(/^#/, '');
    }
}
