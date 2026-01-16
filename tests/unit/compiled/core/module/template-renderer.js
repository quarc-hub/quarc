"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateFragment = void 0;
class TemplateFragment {
    constructor(container, component, template) {
        this.ngContainerMarkers = [];
        this.container = container;
        this.component = component;
        this.template = template ?? '';
        this.originalContent = document.createDocumentFragment();
        while (container.firstChild) {
            this.originalContent.appendChild(container.firstChild);
        }
        container.templateFragment = this;
        container.component = component;
        container.template = this.template;
        container.originalContent = this.originalContent;
    }
    render() {
        if (!this.template)
            return;
        const templateElement = document.createElement('template');
        templateElement.innerHTML = this.template;
        const renderedContent = templateElement.content.cloneNode(true);
        // Process structural directives before appending
        this.processStructuralDirectives(renderedContent);
        while (renderedContent.firstChild) {
            this.container.appendChild(renderedContent.firstChild);
        }
        // Process property bindings after elements are in DOM
        this.processPropertyBindings(this.container);
    }
    processStructuralDirectives(fragment) {
        const ngContainers = Array.from(fragment.querySelectorAll('ng-container'));
        for (const ngContainer of ngContainers) {
            this.processNgContainer(ngContainer);
        }
    }
    processNgContainer(ngContainer) {
        const ngIfAttr = ngContainer.getAttribute('*ngIf');
        const parent = ngContainer.parentNode;
        if (!parent)
            return;
        // Create marker comments to track ng-container position
        const startMarker = document.createComment(`ng-container-start${ngIfAttr ? ` *ngIf="${ngIfAttr}"` : ''}`);
        const endMarker = document.createComment('ng-container-end');
        // Store marker information for later re-rendering
        const originalTemplate = ngContainer.innerHTML;
        this.ngContainerMarkers.push({
            startMarker,
            endMarker,
            condition: ngIfAttr || undefined,
            originalTemplate
        });
        parent.insertBefore(startMarker, ngContainer);
        if (ngIfAttr && !this.evaluateCondition(ngIfAttr)) {
            // Condition is false - don't render content, just add end marker
            parent.insertBefore(endMarker, ngContainer);
            ngContainer.remove();
        }
        else {
            // Condition is true or no condition - render content between markers
            while (ngContainer.firstChild) {
                parent.insertBefore(ngContainer.firstChild, ngContainer);
            }
            parent.insertBefore(endMarker, ngContainer);
            ngContainer.remove();
        }
    }
    evaluateCondition(condition) {
        try {
            return new Function('component', `with(component) { return ${condition}; }`)(this.component);
        }
        catch {
            return false;
        }
    }
    /**
     * Re-renders a specific ng-container fragment based on marker position
     */
    rerenderFragment(markerIndex) {
        if (markerIndex < 0 || markerIndex >= this.ngContainerMarkers.length) {
            console.warn('Invalid marker index:', markerIndex);
            return;
        }
        const marker = this.ngContainerMarkers[markerIndex];
        const { startMarker, endMarker, condition, originalTemplate } = marker;
        // Remove all nodes between markers
        let currentNode = startMarker.nextSibling;
        while (currentNode && currentNode !== endMarker) {
            const nextNode = currentNode.nextSibling;
            currentNode.remove();
            currentNode = nextNode;
        }
        // Re-evaluate condition and render if true
        if (!condition || this.evaluateCondition(condition)) {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = originalTemplate;
            const fragment = document.createDocumentFragment();
            while (tempContainer.firstChild) {
                fragment.appendChild(tempContainer.firstChild);
            }
            // Process property bindings on the fragment
            const tempWrapper = document.createElement('div');
            tempWrapper.appendChild(fragment);
            this.processPropertyBindings(tempWrapper);
            // Insert processed nodes between markers
            const parent = startMarker.parentNode;
            if (parent) {
                while (tempWrapper.firstChild) {
                    parent.insertBefore(tempWrapper.firstChild, endMarker);
                }
            }
        }
    }
    /**
     * Re-renders all ng-container fragments
     */
    rerenderAllFragments() {
        for (let i = 0; i < this.ngContainerMarkers.length; i++) {
            this.rerenderFragment(i);
        }
    }
    /**
     * Gets all ng-container markers for inspection
     */
    getFragmentMarkers() {
        return this.ngContainerMarkers;
    }
    processPropertyBindings(container) {
        const allElements = Array.from(container.querySelectorAll('*'));
        for (const element of allElements) {
            const attributesToRemove = [];
            const attributes = Array.from(element.attributes);
            for (const attr of attributes) {
                if (attr.name.startsWith('[') && attr.name.endsWith(']')) {
                    let propertyName = attr.name.slice(1, -1);
                    const expression = attr.value;
                    // Map common property names from lowercase to camelCase
                    const propertyMap = {
                        'innerhtml': 'innerHTML',
                        'textcontent': 'textContent',
                        'innertext': 'innerText',
                        'classname': 'className',
                    };
                    if (propertyMap[propertyName.toLowerCase()]) {
                        propertyName = propertyMap[propertyName.toLowerCase()];
                    }
                    try {
                        const value = this.evaluateExpression(expression);
                        element[propertyName] = value;
                        attributesToRemove.push(attr.name);
                    }
                    catch (error) {
                        console.warn(`Failed to evaluate property binding [${propertyName}]:`, error);
                    }
                }
            }
            for (const attrName of attributesToRemove) {
                element.removeAttribute(attrName);
            }
        }
    }
    evaluateExpression(expression) {
        try {
            return new Function('component', `with(component) { return ${expression}; }`)(this.component);
        }
        catch (error) {
            console.error(`Failed to evaluate expression: ${expression}`, error);
            return undefined;
        }
    }
    static getOrCreate(container, component, template) {
        if (container.templateFragment) {
            return container.templateFragment;
        }
        return new TemplateFragment(container, component, template);
    }
}
exports.TemplateFragment = TemplateFragment;
