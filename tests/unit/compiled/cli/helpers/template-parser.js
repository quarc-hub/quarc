"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateParser = exports.AttributeType = void 0;
var AttributeType;
(function (AttributeType) {
    AttributeType["STRUCTURAL_DIRECTIVE"] = "structural";
    AttributeType["INPUT_BINDING"] = "input";
    AttributeType["OUTPUT_BINDING"] = "output";
    AttributeType["TWO_WAY_BINDING"] = "two-way";
    AttributeType["TEMPLATE_REFERENCE"] = "reference";
    AttributeType["REGULAR"] = "regular";
})(AttributeType || (exports.AttributeType = AttributeType = {}));
class TemplateParser {
    parse(template) {
        const elements = [];
        const stack = [];
        let currentPos = 0;
        while (currentPos < template.length) {
            const tagStart = template.indexOf('<', currentPos);
            if (tagStart === -1) {
                const textContent = template.substring(currentPos);
                if (textContent.trim()) {
                    const textNode = {
                        type: 'text',
                        content: textContent,
                    };
                    if (stack.length > 0) {
                        stack[stack.length - 1].children.push(textNode);
                    }
                    else {
                        elements.push(textNode);
                    }
                }
                break;
            }
            if (tagStart > currentPos) {
                const textContent = template.substring(currentPos, tagStart);
                if (textContent.trim()) {
                    const textNode = {
                        type: 'text',
                        content: textContent,
                    };
                    if (stack.length > 0) {
                        stack[stack.length - 1].children.push(textNode);
                    }
                    else {
                        elements.push(textNode);
                    }
                }
            }
            if (template[tagStart + 1] === '/') {
                const tagEnd = template.indexOf('>', tagStart);
                if (tagEnd !== -1) {
                    const closingTag = template.substring(tagStart + 2, tagEnd).trim();
                    if (stack.length > 0 && stack[stack.length - 1].tagName === closingTag) {
                        const element = stack.pop();
                        if (stack.length === 0) {
                            elements.push(element);
                        }
                        else {
                            stack[stack.length - 1].children.push(element);
                        }
                    }
                    currentPos = tagEnd + 1;
                }
            }
            else if (template[tagStart + 1] === '!') {
                const commentEnd = template.indexOf('-->', tagStart);
                currentPos = commentEnd !== -1 ? commentEnd + 3 : tagStart + 1;
            }
            else {
                const tagEnd = template.indexOf('>', tagStart);
                if (tagEnd === -1)
                    break;
                const isSelfClosing = template[tagEnd - 1] === '/';
                const tagContent = template.substring(tagStart + 1, isSelfClosing ? tagEnd - 1 : tagEnd).trim();
                const spaceIndex = tagContent.search(/\s/);
                const tagName = spaceIndex === -1 ? tagContent : tagContent.substring(0, spaceIndex);
                const attributesString = spaceIndex === -1 ? '' : tagContent.substring(spaceIndex + 1);
                const element = {
                    tagName,
                    attributes: this.parseAttributes(attributesString),
                    children: [],
                };
                if (isSelfClosing) {
                    if (stack.length === 0) {
                        elements.push(element);
                    }
                    else {
                        stack[stack.length - 1].children.push(element);
                    }
                }
                else {
                    stack.push(element);
                }
                currentPos = tagEnd + 1;
            }
        }
        while (stack.length > 0) {
            const element = stack.pop();
            if (stack.length === 0) {
                elements.push(element);
            }
            else {
                stack[stack.length - 1].children.push(element);
            }
        }
        return elements;
    }
    parseAttributes(attributesString) {
        const attributes = [];
        const regex = /([^\s=]+)(?:="([^"]*)")?/g;
        let match;
        while ((match = regex.exec(attributesString)) !== null) {
            const name = match[1];
            const value = match[2] || '';
            const type = this.detectAttributeType(name);
            attributes.push({ name, value, type });
        }
        return attributes;
    }
    detectAttributeType(name) {
        if (name.startsWith('*')) {
            return AttributeType.STRUCTURAL_DIRECTIVE;
        }
        if (name.startsWith('[(') && name.endsWith(')]')) {
            return AttributeType.TWO_WAY_BINDING;
        }
        if (name.startsWith('[') && name.endsWith(']')) {
            return AttributeType.INPUT_BINDING;
        }
        if (name.startsWith('(') && name.endsWith(')')) {
            return AttributeType.OUTPUT_BINDING;
        }
        if (name.startsWith('#')) {
            return AttributeType.TEMPLATE_REFERENCE;
        }
        return AttributeType.REGULAR;
    }
    traverseElements(elements, callback) {
        for (const element of elements) {
            if (this.isTextNode(element)) {
                continue;
            }
            callback(element);
            if (element.children.length > 0) {
                this.traverseElements(element.children, callback);
            }
        }
    }
    isTextNode(node) {
        return 'type' in node && node.type === 'text';
    }
}
exports.TemplateParser = TemplateParser;
