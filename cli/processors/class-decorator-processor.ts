import { BaseProcessor, ProcessorContext, ProcessorResult } from './base-processor';
import { ComponentIdRegistry } from './component-id-registry';

const DECORATOR_MAP: Record<string, string> = {
    'Component': '_quarcComponent',
    'Directive': '_quarcDirective',
    'Pipe': '_quarcPipe',
    'Injectable': '_quarcInjectable',
};

export class ClassDecoratorProcessor extends BaseProcessor {
    private componentIdRegistry = ComponentIdRegistry.getInstance();

    get name(): string {
        return 'class-decorator-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        const decoratorNames = Object.keys(DECORATOR_MAP);
        const hasDecorator = decoratorNames.some(d => context.source.includes(`@${d}`));

        if (!hasDecorator) {
            return this.noChange(context.source);
        }

        let source = context.source;
        let modified = false;

        for (const [decoratorName, propertyName] of Object.entries(DECORATOR_MAP)) {
            const result = this.processDecorator(source, decoratorName, propertyName, context.filePath);
            if (result.modified) {
                source = result.source;
                modified = true;
            }
        }

        return modified ? this.changed(source) : this.noChange(source);
    }

    private processDecorator(
        source: string,
        decoratorName: string,
        propertyName: string,
        filePath: string,
    ): { source: string; modified: boolean } {
        let result = source;
        let modified = false;
        let searchStart = 0;

        while (true) {
            const decoratorStart = result.indexOf(`@${decoratorName}(`, searchStart);
            if (decoratorStart === -1) break;

            const argsStart = decoratorStart + decoratorName.length + 2;
            const argsEnd = this.findMatchingParen(result, argsStart - 1);
            if (argsEnd === -1) {
                searchStart = argsStart;
                continue;
            }

            const decoratorArgs = result.substring(argsStart, argsEnd).trim();

            const afterDecorator = result.substring(argsEnd + 1);
            const classMatch = afterDecorator.match(/^\s*\n?\s*export\s+class\s+(\w+)/);

            if (!classMatch) {
                searchStart = argsEnd + 1;
                continue;
            }

            const className = classMatch[1];

            const afterClassName = result.substring(argsEnd + 1 + classMatch[0].length);
            const classBodyMatch = afterClassName.match(/^(\s*(?:extends\s+\w+\s*)?(?:implements\s+[\w,\s]+)?\s*)\{/);

            if (!classBodyMatch) {
                searchStart = argsEnd + 1;
                continue;
            }

            const fullMatchEnd = argsEnd + 1 + classMatch[0].length + classBodyMatch[0].length;

            const staticProperty = `static ${propertyName} = [${decoratorArgs || '{}'}];`;

            let additionalProperties = '';
            if (decoratorName === 'Component') {
                const scopeId = this.componentIdRegistry.getComponentId(filePath);
                additionalProperties = `\n    static _scopeId = '${scopeId}';\n    static __quarc_original_name__ = '${className}';`;
            } else if (decoratorName === 'Directive') {
                additionalProperties = `\n    static __quarc_original_name__ = '${className}';`;
            } else if (decoratorName === 'Injectable') {
                additionalProperties = `\n    static __quarc_original_name__ = '${className}';`;
            }

            const classDeclaration = `export class ${className}${classBodyMatch[1]}{\n    ${staticProperty}${additionalProperties}`;

            result = result.slice(0, decoratorStart) + classDeclaration + result.slice(fullMatchEnd);
            modified = true;
            searchStart = decoratorStart + classDeclaration.length;
        }

        return { source: result, modified };
    }

    private findMatchingParen(source: string, startIndex: number): number {
        if (source[startIndex] !== '(') return -1;

        let depth = 1;
        let i = startIndex + 1;

        while (i < source.length && depth > 0) {
            const char = source[i];
            if (char === '(') depth++;
            else if (char === ')') depth--;
            i++;
        }

        return depth === 0 ? i - 1 : -1;
    }
}
