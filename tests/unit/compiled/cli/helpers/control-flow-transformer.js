"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlFlowTransformer = void 0;
class ControlFlowTransformer {
    transform(content) {
        const ifBlockRegex = /@if\s*\(([^)]+)\)\s*\{([\s\S]*?)\}(?:\s*@else\s+if\s*\(([^)]+)\)\s*\{([\s\S]*?)\})*(?:\s*@else\s*\{([\s\S]*?)\})?/g;
        return content.replace(ifBlockRegex, (match) => {
            const blocks = this.parseBlocks(match);
            return this.buildNgContainers(blocks);
        });
    }
    parseBlocks(match) {
        const blocks = [];
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
    buildNgContainers(blocks) {
        let result = '';
        const negated = [];
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
