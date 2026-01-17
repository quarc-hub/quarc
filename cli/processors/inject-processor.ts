import { BaseProcessor, ProcessorContext, ProcessorResult } from './base-processor';

export class InjectProcessor extends BaseProcessor {
    get name(): string {
        return 'inject-processor';
    }

    private findMatchingAngleBracket(source: string, startIndex: number): number {
        let depth = 1;
        let i = startIndex + 1;

        while (i < source.length && depth > 0) {
            if (source[i] === '<') depth++;
            else if (source[i] === '>') depth--;
            i++;
        }

        return depth === 0 ? i - 1 : -1;
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        if (!context.source.includes('inject')) {
            return this.noChange(context.source);
        }

        let source = context.source;
        let modified = false;

        const replacements: Array<{ start: number; end: number; replacement: string }> = [];

        const injectStartPattern = /inject\s*/g;

        let match;
        while ((match = injectStartPattern.exec(source)) !== null) {
            const injectStart = match.index;
            let currentPos = injectStart + match[0].length;

            let genericPart = '';
            if (source[currentPos] === '<') {
                const closingBracket = this.findMatchingAngleBracket(source, currentPos);
                if (closingBracket !== -1) {
                    genericPart = source.substring(currentPos, closingBracket + 1);
                    currentPos = closingBracket + 1;
                }
            }

            while (currentPos < source.length && /\s/.test(source[currentPos])) {
                currentPos++;
            }

            if (source[currentPos] === '(') {
                currentPos++;
                while (currentPos < source.length && /\s/.test(source[currentPos])) {
                    currentPos++;
                }

                const classNameMatch = source.substring(currentPos).match(/^([A-Z]\w*)/);
                if (classNameMatch) {
                    const className = classNameMatch[1];
                    currentPos += className.length;

                    while (currentPos < source.length && /\s/.test(source[currentPos])) {
                        currentPos++;
                    }

                    if (source[currentPos] === ')') {
                        currentPos++;

                        const fullMatch = source.substring(injectStart, currentPos);
                        const replacement = `inject${genericPart}("${className}")`;

                        replacements.push({
                            start: injectStart,
                            end: currentPos,
                            replacement
                        });
                    }
                }
            }
        }

        if (replacements.length > 0) {
            replacements.sort((a, b) => b.start - a.start);

            for (const { start, end, replacement } of replacements) {
                source = source.slice(0, start) + replacement + source.slice(end);
            }

            modified = true;
        }

        return modified ? this.changed(source) : this.noChange(source);
    }
}
