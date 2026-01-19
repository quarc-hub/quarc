export class TemplateMinifier {
  minify(template: string): string {
    let result = template;

    result = this.removeComments(result);
    result = this.minifyWhitespace(result);

    return result;
  }

  private removeComments(template: string): string {
    return template.replace(/<!--[\s\S]*?-->/g, '');
  }

  private minifyWhitespace(template: string): string {
    const tagRegex = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)>/g;
    const parts: Array<{ type: 'tag' | 'text'; content: string; start: number; end: number }> = [];
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(template)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: template.substring(lastIndex, match.index),
          start: lastIndex,
          end: match.index,
        });
      }

      parts.push({
        type: 'tag',
        content: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < template.length) {
      parts.push({
        type: 'text',
        content: template.substring(lastIndex),
        start: lastIndex,
        end: template.length,
      });
    }

    let result = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part.type === 'tag') {
        result += part.content;
      } else {
        const prevPart = i > 0 ? parts[i - 1] : null;
        const nextPart = i < parts.length - 1 ? parts[i + 1] : null;

        const betweenTags = prevPart?.type === 'tag' && nextPart?.type === 'tag';
        const afterTag = prevPart?.type === 'tag' && !nextPart;
        const beforeTag = !prevPart && nextPart?.type === 'tag';

        if (betweenTags || afterTag || beforeTag) {
          const trimmed = part.content.trim();

          if (trimmed.length === 0) {
            continue;
          }

          const hasLeadingWhitespace = /^\s/.test(part.content);
          const hasTrailingWhitespace = /\s$/.test(part.content);

          const minified = trimmed.replace(/\s+/g, ' ');

          if (betweenTags) {
            result += minified;
          } else if (afterTag) {
            result += (hasLeadingWhitespace ? ' ' : '') + minified;
          } else if (beforeTag) {
            result += minified + (hasTrailingWhitespace ? ' ' : '');
          }
        } else {
          result += part.content.replace(/\s+/g, ' ');
        }
      }
    }

    return result;
  }

  minifyAttributeValue(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
