"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlFlowTransformer = void 0;
class ControlFlowTransformer {
    transform(content) {
        content = this.transformForBlocks(content);
        content = this.transformIfBlocks(content);
        return content;
    }
    transformIfBlocks(content) {
        let result = content;
        let startIndex = 0;
        while (startIndex < result.length) {
            const ifBlock = this.findIfBlock(result, startIndex);
            if (!ifBlock)
                break;
            const blocks = this.parseBlocks(ifBlock.match);
            const replacement = this.buildNgContainers(blocks);
            result = result.substring(0, ifBlock.startIndex) + replacement + result.substring(ifBlock.endIndex);
            startIndex = ifBlock.startIndex + replacement.length;
        }
        return result;
    }
    findIfBlock(content, startIndex) {
        const ifIndex = content.indexOf('@if', startIndex);
        if (ifIndex === -1)
            return null;
        const openParenIndex = content.indexOf('(', ifIndex);
        if (openParenIndex === -1)
            return null;
        let parenCount = 1;
        let closeParenIndex = openParenIndex + 1;
        while (closeParenIndex < content.length && parenCount > 0) {
            const char = content[closeParenIndex];
            if (char === '(')
                parenCount++;
            else if (char === ')')
                parenCount--;
            closeParenIndex++;
        }
        if (parenCount !== 0)
            return null;
        closeParenIndex--;
        const openBraceIndex = content.indexOf('{', closeParenIndex);
        if (openBraceIndex === -1)
            return null;
        let endIndex = this.findIfBlockEnd(content, openBraceIndex);
        if (endIndex === -1)
            return null;
        return {
            match: content.substring(ifIndex, endIndex),
            startIndex: ifIndex,
            endIndex: endIndex
        };
    }
    findIfBlockEnd(content, startBraceIndex) {
        let braceCount = 1;
        let index = startBraceIndex + 1;
        while (index < content.length && braceCount > 0) {
            const char = content[index];
            if (char === '{')
                braceCount++;
            else if (char === '}')
                braceCount--;
            index++;
        }
        if (braceCount !== 0)
            return -1;
        while (index < content.length) {
            const remaining = content.substring(index);
            const elseIfMatch = remaining.match(/^\s*@else\s+if\s*\(/);
            const elseMatch = remaining.match(/^\s*@else\s*\{/);
            if (elseIfMatch) {
                const elseIfIndex = index + elseIfMatch[0].length - 1;
                let parenCount = 1;
                let parenIndex = elseIfIndex + 1;
                while (parenIndex < content.length && parenCount > 0) {
                    const char = content[parenIndex];
                    if (char === '(')
                        parenCount++;
                    else if (char === ')')
                        parenCount--;
                    parenIndex++;
                }
                if (parenCount !== 0)
                    return index;
                const braceIndex = content.indexOf('{', parenIndex);
                if (braceIndex === -1)
                    return index;
                braceCount = 1;
                index = braceIndex + 1;
                while (index < content.length && braceCount > 0) {
                    const char = content[index];
                    if (char === '{')
                        braceCount++;
                    else if (char === '}')
                        braceCount--;
                    index++;
                }
                if (braceCount !== 0)
                    return -1;
            }
            else if (elseMatch) {
                const braceIndex = index + elseMatch[0].length - 1;
                braceCount = 1;
                index = braceIndex + 1;
                while (index < content.length && braceCount > 0) {
                    const char = content[index];
                    if (char === '{')
                        braceCount++;
                    else if (char === '}')
                        braceCount--;
                    index++;
                }
                if (braceCount !== 0)
                    return -1;
                return index;
            }
            else {
                return index;
            }
        }
        return index;
    }
    transformForBlocks(content) {
        let result = content;
        let startIndex = 0;
        while (startIndex < result.length) {
            const forBlock = this.findForBlock(result, startIndex);
            if (!forBlock)
                break;
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
    findForBlock(content, startIndex) {
        const forIndex = content.indexOf('@for', startIndex);
        if (forIndex === -1)
            return null;
        const openParenIndex = content.indexOf('(', forIndex);
        const closeParenIndex = content.indexOf(')', openParenIndex);
        const openBraceIndex = content.indexOf('{', closeParenIndex);
        if (openBraceIndex === -1)
            return null;
        let braceCount = 1;
        let contentEndIndex = openBraceIndex + 1;
        while (contentEndIndex < content.length && braceCount > 0) {
            const char = content[contentEndIndex];
            if (char === '{')
                braceCount++;
            else if (char === '}')
                braceCount--;
            contentEndIndex++;
        }
        if (braceCount !== 0)
            return null;
        return {
            match: content.substring(forIndex, contentEndIndex),
            startIndex: forIndex,
            endIndex: contentEndIndex
        };
    }
    parseForBlock(match) {
        const startIndex = match.indexOf('@for');
        if (startIndex === -1)
            return null;
        const openParenIndex = match.indexOf('(', startIndex);
        const closeParenIndex = match.indexOf(')', openParenIndex);
        const openBraceIndex = match.indexOf('{', closeParenIndex);
        if (openBraceIndex === -1)
            return null;
        let braceCount = 1;
        let contentEndIndex = openBraceIndex + 1;
        while (contentEndIndex < match.length && braceCount > 0) {
            const char = match[contentEndIndex];
            if (char === '{')
                braceCount++;
            else if (char === '}')
                braceCount--;
            contentEndIndex++;
        }
        if (braceCount !== 0)
            return null;
        const header = match.substring(openParenIndex + 1, closeParenIndex).trim();
        const content = match.substring(openBraceIndex + 1, contentEndIndex - 1);
        // Parse header
        const parts = header.split(';');
        const forPart = parts[0].trim();
        const trackPart = parts[1]?.trim();
        const forMatch = forPart.match(/^\s*([^\s]+)\s+of\s+([^\s]+)\s*$/);
        if (!forMatch)
            return null;
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
    buildNgForContainer(forBlock) {
        let ngForExpression = `let ${forBlock.variable} of ${forBlock.iterable}`;
        if (forBlock.trackBy) {
            ngForExpression += `; trackBy: ${forBlock.trackBy}`;
        }
        return `<ng-container *ngFor="${ngForExpression}">${forBlock.content}</ng-container>`;
    }
    parseBlocks(match) {
        const blocks = [];
        let index = 0;
        const ifIndex = match.indexOf('@if');
        if (ifIndex !== -1) {
            const openParenIndex = match.indexOf('(', ifIndex);
            let parenCount = 1;
            let closeParenIndex = openParenIndex + 1;
            while (closeParenIndex < match.length && parenCount > 0) {
                const char = match[closeParenIndex];
                if (char === '(')
                    parenCount++;
                else if (char === ')')
                    parenCount--;
                closeParenIndex++;
            }
            closeParenIndex--;
            const conditionStr = match.substring(openParenIndex + 1, closeParenIndex);
            const { condition, aliasVariable } = this.parseConditionWithAlias(conditionStr.trim());
            const openBraceIndex = match.indexOf('{', closeParenIndex);
            let braceCount = 1;
            let closeBraceIndex = openBraceIndex + 1;
            while (closeBraceIndex < match.length && braceCount > 0) {
                const char = match[closeBraceIndex];
                if (char === '{')
                    braceCount++;
                else if (char === '}')
                    braceCount--;
                closeBraceIndex++;
            }
            closeBraceIndex--;
            const content = match.substring(openBraceIndex + 1, closeBraceIndex);
            blocks.push({ condition, content, aliasVariable });
            index = closeBraceIndex + 1;
        }
        while (index < match.length) {
            const remaining = match.substring(index);
            const elseIfMatch = remaining.match(/^\s*@else\s+if\s*\(/);
            const elseMatch = remaining.match(/^\s*@else\s*\{/);
            if (elseIfMatch) {
                const elseIfIndex = index + elseIfMatch[0].length - 1;
                let parenCount = 1;
                let closeParenIndex = elseIfIndex + 1;
                while (closeParenIndex < match.length && parenCount > 0) {
                    const char = match[closeParenIndex];
                    if (char === '(')
                        parenCount++;
                    else if (char === ')')
                        parenCount--;
                    closeParenIndex++;
                }
                closeParenIndex--;
                const conditionStr = match.substring(elseIfIndex + 1, closeParenIndex);
                const { condition, aliasVariable } = this.parseConditionWithAlias(conditionStr.trim());
                const openBraceIndex = match.indexOf('{', closeParenIndex);
                let braceCount = 1;
                let closeBraceIndex = openBraceIndex + 1;
                while (closeBraceIndex < match.length && braceCount > 0) {
                    const char = match[closeBraceIndex];
                    if (char === '{')
                        braceCount++;
                    else if (char === '}')
                        braceCount--;
                    closeBraceIndex++;
                }
                closeBraceIndex--;
                const content = match.substring(openBraceIndex + 1, closeBraceIndex);
                blocks.push({ condition, content, aliasVariable });
                index = closeBraceIndex + 1;
            }
            else if (elseMatch) {
                const openBraceIndex = index + elseMatch[0].length - 1;
                let braceCount = 1;
                let closeBraceIndex = openBraceIndex + 1;
                while (closeBraceIndex < match.length && braceCount > 0) {
                    const char = match[closeBraceIndex];
                    if (char === '{')
                        braceCount++;
                    else if (char === '}')
                        braceCount--;
                    closeBraceIndex++;
                }
                closeBraceIndex--;
                const content = match.substring(openBraceIndex + 1, closeBraceIndex);
                blocks.push({ condition: null, content });
                index = closeBraceIndex + 1;
            }
            else {
                break;
            }
        }
        return blocks;
    }
    parseConditionWithAlias(conditionStr) {
        const aliasMatch = conditionStr.match(/^(.+);\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*$/);
        if (aliasMatch) {
            return {
                condition: aliasMatch[1].trim(),
                aliasVariable: aliasMatch[2].trim(),
            };
        }
        return { condition: conditionStr };
    }
    buildNgContainers(blocks) {
        let result = '';
        const negated = [];
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const condition = this.buildCondition(block.condition, negated);
            if (block.aliasVariable) {
                result += `<ng-container *ngIf="${condition}; let ${block.aliasVariable}">${block.content}</ng-container>`;
            }
            else {
                result += `<ng-container *ngIf="${condition}">${block.content}</ng-container>`;
            }
            if (i < blocks.length - 1) {
                result += '\n';
            }
            if (block.condition) {
                negated.push(block.condition);
            }
        }
        return result;
    }
    buildCondition(condition, negated) {
        if (condition === null) {
            return negated.map(c => `!(${c})`).join(' && ');
        }
        if (negated.length > 0) {
            return negated.map(c => `!(${c})`).join(' && ') + ` && ${condition}`;
        }
        return condition;
    }
}
exports.ControlFlowTransformer = ControlFlowTransformer;
