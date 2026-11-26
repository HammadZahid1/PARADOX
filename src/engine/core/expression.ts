/**
 * Small, dependency-free arithmetic expression evaluator for derived variables.
 * Supports +, -, *, /, parentheses, numbers and identifiers. No eval or dynamic code.
 */

type Token = { kind: 'number' | 'identifier' | 'operator' | 'lparen' | 'rparen'; text: string };

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index]!;
    if (/\s/.test(char)) { index += 1; continue; }
    if (char === '(') { tokens.push({ kind: 'lparen', text: char }); index += 1; continue; }
    if (char === ')') { tokens.push({ kind: 'rparen', text: char }); index += 1; continue; }
    if ('+-*/'.includes(char)) { tokens.push({ kind: 'operator', text: char }); index += 1; continue; }
    if (/[0-9.]/.test(char)) {
      let number = '';
      while (index < expression.length && /[0-9.]/.test(expression[index]!)) number += expression[index++]!;
      tokens.push({ kind: 'number', text: number });
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let identifier = '';
      while (index < expression.length && /[A-Za-z0-9_]/.test(expression[index]!)) identifier += expression[index++]!;
      tokens.push({ kind: 'identifier', text: identifier });
      continue;
    }
    throw new Error(`Unsupported expression character: ${char}`);
  }
  return tokens;
}

const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

export function evaluateExpression(expression: string, variables: Readonly<Record<string, number>>): number {
  const tokens = tokenize(expression);
  if (tokens.length === 0) throw new Error('Empty expression');
  const values: number[] = [];
  const operators: Token[] = [];

  const reduce = (): void => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (!operator || left === undefined || right === undefined) throw new Error('Malformed expression');
    switch (operator.text) {
      case '+': values.push(left + right); break;
      case '-': values.push(left - right); break;
      case '*': values.push(left * right); break;
      case '/': values.push(right === 0 ? 0 : left / right); break;
      default: throw new Error(`Unknown operator ${operator.text}`);
    }
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    if (token.kind === 'number') {
      const value = Number(token.text);
      if (!Number.isFinite(value)) throw new Error(`Invalid number ${token.text}`);
      values.push(value);
    } else if (token.kind === 'identifier') {
      const value = variables[token.text];
      if (value === undefined) throw new Error(`Unknown variable ${token.text}`);
      values.push(value);
    } else if (token.kind === 'lparen') {
      operators.push(token);
    } else if (token.kind === 'rparen') {
      while (operators.length > 0 && operators[operators.length - 1]!.kind !== 'lparen') reduce();
      if (operators.pop()?.kind !== 'lparen') throw new Error('Unbalanced parentheses');
    } else if (token.kind === 'operator') {
      while (operators.length > 0) {
        const top = operators[operators.length - 1]!;
        if (top.kind !== 'operator' || precedence[top.text]! < precedence[token.text]!) break;
        reduce();
      }
      operators.push(token);
    }
  }
  while (operators.length > 0) {
    if (operators[operators.length - 1]!.kind === 'lparen') throw new Error('Unbalanced parentheses');
    reduce();
  }
  if (values.length !== 1) throw new Error('Malformed expression');
  return values[0]!;
}
