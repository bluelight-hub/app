'use strict';

function isCommentToken(token) {
  return token.type === 'Block' || token.type === 'Line' || token.type === 'BlockComment' || token.type === 'LineComment';
}

function getLineIndent(sourceText, offset) {
  const lineStart = sourceText.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const linePrefix = sourceText.slice(lineStart, offset);
  const match = linePrefix.match(/^[\t ]*/);
  return match ? match[0] : '';
}

module.exports = {
  rules: {
    'array-expression-multiline': {
      meta: {
        type: 'layout',
        fixable: 'whitespace',
        schema: [
          {
            type: 'object',
            properties: {
              minItems: {
                type: 'integer',
                minimum: 2,
              },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          requireMultiline: 'Array literals with {{count}} elements must be multiline.',
        },
      },

      create(context) {
        const sourceCode = context.sourceCode;
        const sourceText = sourceCode.text;
        const minItems = context.options[0]?.minItems ?? 2;

        function check(node) {
          if (node.type !== 'ArrayExpression') return;
          if (node.elements.length < minItems) return;
          if (node.elements.some((element) => element == null)) return;

          const openBracket = sourceCode.getFirstToken(node);
          const closeBracket = sourceCode.getLastToken(node);
          const firstElement = sourceCode.getTokenAfter(openBracket, { includeComments: true });
          const lastElement = sourceCode.getTokenBefore(closeBracket, { includeComments: true });

          if (!openBracket || !closeBracket || !firstElement || !lastElement) return;

          const openHasLineBreak = openBracket.loc.end.line < firstElement.loc.start.line;
          const closeHasLineBreak = lastElement.loc.end.line < closeBracket.loc.start.line;

          let elementsAreMultiline = true;
          for (let index = 1; index < node.elements.length; index += 1) {
            const previous = node.elements[index - 1];
            const current = node.elements[index];
            if (!previous || !current) {
              elementsAreMultiline = false;
              break;
            }

            if (previous.loc.end.line >= current.loc.start.line) {
              elementsAreMultiline = false;
              break;
            }
          }

          if (openHasLineBreak && closeHasLineBreak && elementsAreMultiline) return;

          context.report({
            node,
            messageId: 'requireMultiline',
            data: { count: String(node.elements.length) },
            fix(fixer) {
              const innerTokens = sourceCode.getTokensBetween(openBracket, closeBracket, { includeComments: true });
              if (innerTokens.some(isCommentToken)) {
                return null;
              }

              const baseIndent = getLineIndent(sourceText, openBracket.range[0]);
              const innerIndent = `${baseIndent}  `;
              const formattedElements = node.elements.map((element) => `${innerIndent}${sourceCode.getText(element)}`).join(',\n');
              const replacement = `\n${formattedElements},\n${baseIndent}`;

              return fixer.replaceTextRange([openBracket.range[1], closeBracket.range[0]], replacement);
            },
          });
        }

        return {
          ArrayExpression: check,
        };
      },
    },
  },
};
