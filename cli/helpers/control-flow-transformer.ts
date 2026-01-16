interface ControlFlowBlock {
    condition: string | null;
    content: string;
}

interface ForBlock {
    variable: string;
    iterable: string;
    content: string;
    trackBy?: string;
}

export class ControlFlowTransformer {
    transform(content: string): string {
        // Transform @for blocks first
        content = this.transformForBlocks(content);

        // Then transform @if blocks
        const ifBlockRegex = /@if\s*\(([^)]+)\)\s*\{([\s\S]*?)\}(?:\s*@else\s+if\s*\(([^)]+)\)\s*\{([\s\S]*?)\})*(?:\s*@else\s*\{([\s\S]*?)\})?/g;

        return content.replace(ifBlockRegex, (match) => {
            const blocks = this.parseBlocks(match);
            return this.buildNgContainers(blocks);
        });
    }

    private transformForBlocks(content: string): string {
        let result = content;
        let startIndex = 0;

        while (startIndex < result.length) {
            const forBlock = this.findForBlock(result, startIndex);
            if (!forBlock) break;

            const parsedBlock = this.parseForBlock(forBlock.match);
            if (!parsedBlock) {
                startIndex = forBlock.endIndex;
                continue;
            }

            const replacement = this.buildNgForContainer(parsedBlock);
            result = result.substring(0, forBlock.startIndex) + replacement + result.substring(forBlock.endIndex);

            // Move to the end of the replacement to avoid infinite loops
            startIndex = forBlock.startIndex + replacement.length;
        }

        return result;
    }

    private findForBlock(content: string, startIndex: number): { match: string; startIndex: number; endIndex: number } | null {
        const forIndex = content.indexOf('@for', startIndex);
        if (forIndex === -1) return null;

        const openParenIndex = content.indexOf('(', forIndex);
        const closeParenIndex = content.indexOf(')', openParenIndex);
        const openBraceIndex = content.indexOf('{', closeParenIndex);

        if (openBraceIndex === -1) return null;

        let braceCount = 1;
        let contentEndIndex = openBraceIndex + 1;

        while (contentEndIndex < content.length && braceCount > 0) {
            const char = content[contentEndIndex];
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            contentEndIndex++;
        }

        if (braceCount !== 0) return null;

        return {
            match: content.substring(forIndex, contentEndIndex),
            startIndex: forIndex,
            endIndex: contentEndIndex
        };
    }

    private parseForBlock(match: string): ForBlock | null {
        const startIndex = match.indexOf('@for');
        if (startIndex === -1) return null;

        const openParenIndex = match.indexOf('(', startIndex);
        const closeParenIndex = match.indexOf(')', openParenIndex);
        const openBraceIndex = match.indexOf('{', closeParenIndex);

        if (openBraceIndex === -1) return null;

        let braceCount = 1;
        let contentEndIndex = openBraceIndex + 1;

        while (contentEndIndex < match.length && braceCount > 0) {
            const char = match[contentEndIndex];
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            contentEndIndex++;
        }

        if (braceCount !== 0) return null;

        const header = match.substring(openParenIndex + 1, closeParenIndex).trim();
        const content = match.substring(openBraceIndex + 1, contentEndIndex - 1);

        // Parse header
        const parts = header.split(';');
        const forPart = parts[0].trim();
        const trackPart = parts[1]?.trim();

        const forMatch = forPart.match(/^\s*([^\s]+)\s+of\s+([^\s]+)\s*$/);
        if (!forMatch) return null;

        const variable = forMatch[1].trim();
        const iterable = forMatch[2].trim();
        let trackBy = undefined;

        if (trackPart) {
            const trackMatch = trackPart.match(/^track\s+(.+)$/);
            if (trackMatch) {
                trackBy = trackMatch[1].trim();
            }
        }

        return {
            variable,
            iterable,
            content,
            trackBy
        };
    }

    private buildNgForContainer(forBlock: ForBlock): string {
        let ngForExpression = `let ${forBlock.variable} of ${forBlock.iterable}`;

        if (forBlock.trackBy) {
            ngForExpression += `; trackBy: ${forBlock.trackBy}`;
        }

        return `<ng-container *ngFor="${ngForExpression}">${forBlock.content}</ng-container>`;
    }

    private parseBlocks(match: string): ControlFlowBlock[] {
        const blocks: ControlFlowBlock[] = [];
        let remaining = match;

        const ifMatch = remaining.match(/@if\s*\(([^)]+)\)\s*\{([\s\S]*?)\}/);
        if (ifMatch) {
            blocks.push({ condition: ifMatch[1].trim(), content: ifMatch[2] });
            remaining = remaining.substring(ifMatch[0].length);
        }

        const elseIfRegex = /@else\s+if\s*\(([^)]+)\)\s*\{([\s\S]*?)\}/g;
        let elseIfMatch;
        while ((elseIfMatch = elseIfRegex.exec(remaining)) !== null) {
            blocks.push({ condition: elseIfMatch[1].trim(), content: elseIfMatch[2] });
        }

        const elseMatch = remaining.match(/@else\s*\{([\s\S]*?)\}$/);
        if (elseMatch) {
            blocks.push({ condition: null, content: elseMatch[1] });
        }

        return blocks;
    }

    private buildNgContainers(blocks: ControlFlowBlock[]): string {
        let result = '';
        const negated: string[] = [];

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const condition = this.buildCondition(block.condition, negated);

            result += `<ng-container *ngIf="${condition}">${block.content}</ng-container>`;
            if (i < blocks.length - 1) {
                result += '\n';
            }

            if (block.condition) {
                negated.push(block.condition);
            }
        }

        return result;
    }

    private buildCondition(condition: string | null, negated: string[]): string {
        if (condition === null) {
            return negated.map(c => `!(${c})`).join(' && ');
        }

        if (negated.length > 0) {
            return negated.map(c => `!(${c})`).join(' && ') + ` && ${condition}`;
        }

        return condition;
    }
}
