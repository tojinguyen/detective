/** Chuẩn hóa cách viết LaTeX tắt: \frac12 → \frac{1}{2}, \frac5{13} → \frac{5}{13}; bỏ \displaystyle. */
export function normaliseLatex(value: string) {
  return value
    .replace(/\\displaystyle\s*/g, '')
    .replace(/\\frac\s*(\d|\{[^{}]+\})\s*(\d|\{[^{}]+\})/g, (_, a: string, b: string) =>
      '\\frac' + (a.startsWith('{') ? a : '{' + a + '}') + (b.startsWith('{') ? b : '{' + b + '}'));
}

export function tokeniseMath(value: string) {
  const source = normaliseLatex(value)
    .trim()
    .replace(/^=\s*/, '')
    .replace(/\\(?:left|right)/g, '');
  const tokens = source.match(/-?\\frac\{[^{}]+\}\{[^{}]+\}|-?\d+(?:\{,\}\d+|[.,]\d+)?|\^(?:\d+|\{[^{}]+\})|\\(?:cdot|times|div)|\\[{}]|[A-Za-z]+|[=+\-:*/^()[\]]|\S/g) ?? [];
  // Dấu trừ đứng sau một số hạng là phép trừ, tách thành token riêng để bấm chọn được (214-36 → 214, -, 36);
  // dấu trừ ở đầu dòng hoặc sau ngoặc mở/phép toán vẫn dính với số (số âm).
  const split = tokens.flatMap((token, index) => {
    const previous = tokens[index - 1];
    const isBinary = token.length > 1 && token.startsWith('-') && previous !== undefined && /(?:[\d)\]}]|[A-Za-z]|\\})$/.test(previous) && previous !== '\\cdot' && previous !== '\\times' && previous !== '\\div';
    return isBinary ? ['-', token.slice(1)] : [token];
  });
  // Số mũ dính vào cơ số (2^5, )^2) để hiển thị liền một khối, không thành chữ số lơ lửng.
  return split.reduce<string[]>((result, token) => {
    if (token.startsWith('^') && token.length > 1 && result.length) result[result.length - 1] += token;
    else result.push(token);
    return result;
  }, []);
}

/** Dạng so sánh của một token: bỏ khoảng trắng, quy ×/· về *, :/÷ về /. */
export function normaliseToken(value: string) {
  return normaliseLatex(value)
    .replace(/\s+/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/\\(?:left|right|,)/g, '')
    .replace(/\{,\}/g, ',')
    .replace(/\\times|\\cdot/g, '*')
    .replace(/\\div|:/g, '/');
}

/**
 * Vị trí của token sai trong dòng, -1 nếu không có. Ưu tiên `preferred` khi token ở đó khớp
 * (giữ đúng lần xuất hiện khi dòng có nhiều token giống nhau). "-36" khớp với dấu "-" đứng trước 36.
 */
export function findTokenIndex(tokens: string[], wanted: string, preferred = -1) {
  const key = normaliseToken(wanted);
  if (!key) return -1;
  if (preferred >= 0 && normaliseToken(tokens[preferred] ?? '') === key) return preferred;
  const exact = tokens.findIndex(token => normaliseToken(token) === key);
  if (exact >= 0) return exact;
  // Cơ số sai của một lũy thừa: "6" khớp với token "6^5".
  const base = tokens.findIndex(token => token.includes('^') && normaliseToken(token).split('^')[0] === key);
  if (base >= 0) return base;
  if (key.length > 1 && key.startsWith('-')) {
    const rest = key.slice(1);
    const sign = tokens.findIndex((token, index) => token === '-' && normaliseToken(tokens[index + 1] ?? '') === rest);
    if (sign >= 0) return sign;
  }
  // Token sai viết kèm phần đứng sau để chỉ rõ vị trí (vd. "+45" → dấu + trước 45): chọn token đầu của cụm khớp.
  const run = tokeniseMath(wanted).map(normaliseToken);
  if (run.length > 1) {
    const start = tokens.findIndex((_, index) => run.every((part, offset) => normaliseToken(tokens[index + offset] ?? '') === part));
    if (start >= 0) return start;
  }
  return key.length > 1 ? tokens.findIndex(token => normaliseToken(token).includes(key)) : -1;
}
