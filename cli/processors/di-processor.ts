import { BaseProcessor, ProcessorContext, ProcessorResult } from './base-processor';

export class DIProcessor extends BaseProcessor {
    get name(): string {
        return 'di-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        if (!context.source.includes('constructor')) {
            return this.noChange(context.source);
        }

        let source = context.source;
        let modified = false;

        const typeOnlyImports = this.extractTypeOnlyImports(source);

        const classRegex = /export\s+class\s+(\w+)(?:\s+(?:extends\s+\w+\s*)?(?:implements\s+[\w,\s]+)?)?\s*\{/g;

        const matches = [...source.matchAll(classRegex)];

        for (const match of matches.reverse()) {
            const openBraceIndex = match.index! + match[0].length;
            const classBody = this.extractClassBody(source, openBraceIndex);

            if (!classBody) continue;

            const params = this.extractConstructorParams(classBody, typeOnlyImports);
            if (params.length === 0) continue;

            if (classBody.includes('__di_params__')) continue;

            const diProperty = `\n    static __di_params__ = ['${params.join("', '")}'];`;
            source = source.slice(0, openBraceIndex) + diProperty + source.slice(openBraceIndex);
            modified = true;
        }

        return modified ? this.changed(source) : this.noChange(source);
    }

    private extractTypeOnlyImports(source: string): Set<string> {
        const typeOnlyImports = new Set<string>();

        const importTypeRegex = /import\s+type\s*\{([^}]+)\}/g;
        for (const match of source.matchAll(importTypeRegex)) {
            const types = match[1].split(',').map(t => t.trim());
            types.forEach(t => typeOnlyImports.add(t));
        }

        return typeOnlyImports;
    }

    private extractClassBody(source: string, startIndex: number): string | null {
        let braceCount = 1;
        let i = startIndex;

        while (i < source.length && braceCount > 0) {
            if (source[i] === '{') braceCount++;
            else if (source[i] === '}') braceCount--;
            i++;
        }

        return braceCount === 0 ? source.slice(startIndex, i - 1) : null;
    }

    private extractConstructorParams(classBody: string, typeOnlyImports: Set<string>): string[] {
        const constructorMatch = classBody.match(/constructor\s*\(([^)]*)\)/);
        if (!constructorMatch || !constructorMatch[1].trim()) {
            return [];
        }

        const paramsStr = constructorMatch[1];
        // Don't skip HTMLElement - it's needed for DI to inject the native element
        const skipTypes = new Set([...typeOnlyImports]);

        return paramsStr
            .split(',')
            .map(p => {
                const typeMatch = p.match(/:\s*(\w+)/);
                return typeMatch ? typeMatch[1] : null;
            })
            .filter((p): p is string => p !== null && !skipTypes.has(p));
    }
}
