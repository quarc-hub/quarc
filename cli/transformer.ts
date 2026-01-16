import * as ts from 'typescript';

export function createDependencyInjectionTransformer(): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            const visitor = (node: ts.Node): ts.Node => {
                if (ts.isClassDeclaration(node) && node.name) {
                    const constructor = node.members.find(
                        member => ts.isConstructorDeclaration(member)
                    ) as ts.ConstructorDeclaration | undefined;

                    if (constructor && constructor.parameters.length > 0) {
                        const paramTypes = constructor.parameters
                            .map(param => {
                                if (param.type && ts.isTypeReferenceNode(param.type)) {
                                    return param.type.typeName.getText(sourceFile);
                                }
                                return null;
                            })
                            .filter(Boolean);

                        if (paramTypes.length > 0) {
                            const staticProperty = ts.factory.createPropertyDeclaration(
                                [ts.factory.createModifier(ts.SyntaxKind.StaticKeyword)],
                                '__di_params__',
                                undefined,
                                undefined,
                                ts.factory.createArrayLiteralExpression(
                                    paramTypes.map(typeName =>
                                        ts.factory.createIdentifier(typeName as string)
                                    )
                                )
                            );

                            return ts.factory.updateClassDeclaration(
                                node,
                                node.modifiers,
                                node.name,
                                node.typeParameters,
                                node.heritageClauses,
                                [staticProperty, ...node.members]
                            );
                        }
                    }
                }

                return ts.visitEachChild(node, visitor, context);
            };

            return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
        };
    };
}
