export function tokeniseMath(value: string) {
  const source = value
    .trim()
    .replace(/^=\s*/, '')
    .replace(/\\(?:left|right)/g, '');
  return source.match(/-?\\frac\{[^{}]+\}\{[^{}]+\}|-?\d+(?:\{,\}\d+|[.,]\d+)?|\\(?:cdot|times|div)|[A-Za-z]+|[=+\-:*/^()[\]]|\S/g) ?? [];
}
