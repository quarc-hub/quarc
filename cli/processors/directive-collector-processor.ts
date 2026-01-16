import { BaseProcessor, ProcessorContext, ProcessorResult } from './base-processor';

export class DirectiveCollectorProcessor extends BaseProcessor {
    get name(): string {
        return 'directive-collector-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        if (!context.source.includes('_quarcComponent')) {
            return this.noChange(context.source);
        }

        if (!context.source.includes('imports:')) {
            return this.noChange(context.source);
        }

        let source = context.source;
        let modified = false;

        const scopeIdPattern = /static\s+_scopeId\s*=\s*'[^']*';/g;

        let match;
        const replacements: { position: number; insert: string }[] = [];

        while ((match = scopeIdPattern.exec(source)) !== null) {
            const scopeIdEnd = match.index + match[0].length;

            const beforeScopeId = source.substring(0, match.index);
            const quarcComponentMatch = beforeScopeId.match(/static\s+_quarcComponent\s*=\s*\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\];[^]*$/);

            if (!quarcComponentMatch) {
                continue;
            }

            const componentOptions = quarcComponentMatch[1];

            const importsMatch = componentOptions.match(/imports\s*:\s*\[([^\]]*)\]/);
            if (!importsMatch) {
                continue;
            }

            const importsContent = importsMatch[1];
            const importNames = this.parseImportNames(importsContent);

            if (importNames.length === 0) {
                continue;
            }

            const directivesProperty = `\n    static _quarcDirectives = [${importNames.join(', ')}];`;

            replacements.push({
                position: scopeIdEnd,
                insert: directivesProperty,
            });
        }

        for (let i = replacements.length - 1; i >= 0; i--) {
            const r = replacements[i];
            source = source.slice(0, r.position) + r.insert + source.slice(r.position);
            modified = true;
        }

        return modified ? this.changed(source) : this.noChange(source);
    }

    private parseImportNames(importsContent: string): string[] {
        return importsContent
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && /^[A-Z]/.test(s));
    }
}
