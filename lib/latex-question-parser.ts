import { parseArithmetic } from '@/lib/game';
import type { Question, QuestionKind, QuestionOption } from '@/lib/content';
import { tokeniseMath } from '@/lib/math-tokenizer';

export { tokeniseMath } from '@/lib/math-tokenizer';

export type ParsedQuestion = {
  question: Question;
  sourceNumber: number;
  wrongToken: string;
  correctedToken: string;
  interaction: string;
  answerKey: string;
  numericAnswer: number | null;
  warnings: string[];
};

const LABEL = {
  problem: /\\textbf\{(?:\d+[a-z]?\.\s*)?Đề bài:\}/i,
  solution: /\\textbf\{(?:\d+[a-z]?\.\s*)?Lời giải:\}/i,
  wrongToken: /\\textbf\{(?:\d+[a-z]?\.\s*)?Token bắt đầu sai:\}/i,
  explanation: /\\textbf\{(?:\d+[a-z]?\.\s*)?Giải thích lỗi:\}/i,
  repair: /\\textbf\{(?:\d+[a-z]?\.\s*)?Sửa lại:\}/i,
} as const;

function clean(value: string) {
  return value.trim().replace(/^\$|\$$/g, '').replace(/\\,/g, ' ').replace(/&/g, '').trim();
}

function plainText(value: string) {
  return value
    .replace(/\\text(?:bf|it)\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:medskip|noindent)/g, ' ')
    .replace(/\\\\/g, ' ')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/``|''/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function displayMath(value: string) {
  return clean(value.match(/\\\[([\s\S]*?)\\\]/)?.[1] ?? '');
}

function inlineMath(value: string) {
  return clean(value.match(/\$([^$]+)\$/)?.[1] ?? '');
}

function firstMath(value: string) {
  return displayMath(value) || inlineMath(value);
}

function field(block: string, pattern: RegExp) {
  return plainText(block.match(pattern)?.[1] ?? '');
}

function section(block: string, start: RegExp, end?: RegExp) {
  const startMatch = start.exec(block);
  if (!startMatch) return '';
  const rest = block.slice(startMatch.index + startMatch[0].length);
  const endMatch = end?.exec(rest);
  return endMatch ? rest.slice(0, endMatch.index) : rest;
}

function solutionLines(block: string) {
  const part = section(block, LABEL.solution, LABEL.wrongToken);
  const align = part.match(/\\begin\{align\*\}([\s\S]*?)\\end\{align\*\}/)?.[1] ?? '';
  if (align.includes('&=')) {
    const rows = align.split(/&=/);
    const original = clean(rows[0]);
    const transformations = rows.slice(1).map(row => '= ' + clean(row.replace(/\\\\\s*$/, '')));
    return [original, ...transformations].filter(line => line.replace(/^=\s*/, '').trim());
  }
  return align.split(/\\\\(?:[ \t]*\r?\n|[ \t]*$)/).map(line => clean(line)).filter(Boolean);
}

function normaliseToken(value: string) {
  return value
    .replace(/\s+/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/\\(?:left|right|,)/g, '')
    .replace(/\{,\}/g, ',')
    .replace(/\\times|\\cdot/g, '*')
    .replace(/\\div|:/g, '/');
}

function choiceOptions(repairSection: string): QuestionOption[] {
  const markers = [...repairSection.matchAll(/\\item\[([A-D])\.\]/g)];
  return markers.map((marker, index) => {
    const body = repairSection.slice(marker.index! + marker[0].length, markers[index + 1]?.index ?? repairSection.length);
    const beforeAnswer = body.split(/\\textit\{Đáp án:\}/i)[0];
    return {
      key: marker[1],
      value: firstMath(beforeAnswer) || plainText(beforeAnswer),
    };
  }).filter(option => option.value);
}

function canonicalSymbol(value: string) {
  const candidate = normaliseToken(value.replace(/^[A-D]\.\s*/, ''));
  if (candidate === '*' || candidate === '+' || candidate === '-') return candidate;
  if (candidate === '/') return '/';
  return '';
}

function answerKey(rawAnswer: string, options: QuestionOption[]) {
  const direct = rawAnswer.match(/(?:^|\s)([A-D])(?:\.|\s|$)/i)?.[1]?.toUpperCase();
  if (direct && options.some(option => option.key === direct)) return direct;
  const normalised = normaliseToken(rawAnswer);
  return options.find(option => normaliseToken(option.value) === normalised)?.key ?? '';
}

function latexArithmetic(value: string) {
  let source = value.replace(/^=\s*/, '').replace(/\{,\}/g, '.').replace(/,/g, '.').replace(/\\(?:cdot|times)/g, '*').replace(/\\div/g, '/').replace(/:/g, '/').replace(/\\(?:left|right)/g, '');
  let previous = '';
  while (previous !== source) {
    previous = source;
    source = source.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
  }
  source = source.replace(/[{}]/g, match => match === '{' ? '(' : ')').replace(/\s+/g, '');
  const result = parseArithmetic(source);
  return result ? Number(result.n) / Number(result.d) : null;
}

function inferGrade(knowledge: string, problem: string) {
  return /hữu tỉ|chuyển vế|\\frac|\d[,.]\d/i.test(knowledge + ' ' + problem) ? 7 : 6;
}

function inferDifficulty(raw: string) {
  const count = (raw.match(/\*/g) ?? []).length + (raw.match(/\\star/g) ?? []).length;
  return count <= 1 ? 'Dễ' : count === 2 ? 'Trung bình' : 'Khó';
}

function hintFor(knowledge: string) {
  if (/dấu ngoặc/i.test(knowledge)) return 'Kiểm tra dấu đứng trước ngoặc và dấu của từng số hạng sau khi bỏ ngoặc.';
  if (/chuyển vế/i.test(knowledge)) return 'Khi chuyển một số hạng sang vế kia, hãy kiểm tra dấu của số hạng đó.';
  if (/thứ tự/i.test(knowledge)) return 'Đối chiếu thứ tự: lũy thừa, rồi nhân chia, cuối cùng cộng trừ.';
  return 'Đối chiếu từng bước với quy tắc được nêu trong mạch kiến thức.';
}

function correctedDisplay(answer: string) {
  if (answer === '*') return '\\cdot';
  if (answer === '/') return ':';
  return answer;
}

function interactionFor(kind: QuestionKind) {
  if (kind === 'symbol') return 'Chọn dấu';
  if (kind === 'choice') return 'Chọn phép biến đổi';
  if (kind === 'value') return 'Nhập giá trị';
  return 'Viết lại bước biến đổi';
}

function parseBlock(block: string, generatedId: number): ParsedQuestion | null {
  const sourceNumber = Number(block.match(/\\subsection\*\{Câu\s+(\d+)\}/i)?.[1] ?? generatedId);
  const knowledge = field(block, /\\textbf\{(?:\d+[a-z]?\.\s*)?Mạch kiến thức:\}\s*([^\r\n]+)/i) || 'Chưa phân loại';
  const difficultyRaw = field(block, /\\textbf\{(?:\d+[a-z]?\.\s*)?Độ khó:\}\s*([^\r\n]+)/i);
  const problemPart = section(block, LABEL.problem, LABEL.solution);
  const problem = displayMath(problemPart);
  const bad = solutionLines(block);
  const tokenPart = section(block, LABEL.wrongToken, LABEL.explanation);
  const wrongToken = displayMath(tokenPart);
  const explanationPart = section(block, LABEL.explanation, LABEL.repair);
  const explanation = plainText(explanationPart);
  const repairPart = section(block, LABEL.repair);
  const format = field(repairPart, /\\textit\{Dạng câu hỏi:\}\s*([^\r\n]+)/i);
  const answerPart = section(repairPart, /\\textit\{Đáp án:\}/i);
  const rawAnswer = displayMath(answerPart) || plainText(answerPart).split(/\r?\n/)[0]?.trim() || '';
  const options = choiceOptions(repairPart);
  const isChoice = /trắc nghiệm/i.test(format) || options.length > 0;
  const selectedKey = isChoice ? answerKey(rawAnswer, options) : '';
  const selectedOption = options.find(option => option.key === selectedKey);
  const allOptionsAreSymbols = options.length > 0 && options.every(option => canonicalSymbol(option.value));
  const repairQuestion = field(repairPart, /\\textit\{Câu hỏi:\}\s*([^\r\n]+)/i);
  const numericAnswer = isChoice ? null : latexArithmetic(rawAnswer);
  const kind: QuestionKind = isChoice
    ? allOptionsAreSymbols ? 'symbol' : 'choice'
    : numericAnswer !== null && !/viết lại|phép biến đổi|bước tính/i.test(repairQuestion) ? 'value' : 'expression';
  const symbolAnswer = kind === 'symbol' ? canonicalSymbol(selectedOption?.value ?? rawAnswer) : '';
  const answer: string | number = kind === 'symbol'
    ? symbolAnswer
    : kind === 'choice'
      ? selectedKey
      : numericAnswer ?? rawAnswer;
  const warnings: string[] = [];
  if (!problem || bad.length < 2) warnings.push('Thiếu đề bài hoặc các bước lời giải.');
  if (!wrongToken) warnings.push('Chưa đọc được token bắt đầu sai.');
  if (isChoice && !options.length) warnings.push('Chưa đọc được các phương án trắc nghiệm.');
  if (isChoice && options.length && !selectedKey) warnings.push('Chưa xác định được phương án đáp án.');
  if (answer === '' || answer === null) warnings.push('Chưa đọc được đáp án sửa.');
  if (!isChoice && numericAnswer === null) warnings.push('Đáp án tự luận chưa quy đổi được thành giá trị để chấm tự động.');
  if (kind === 'symbol' && wrongToken && !canonicalSymbol(wrongToken)) warnings.push('Token sai không phải một dấu độc lập; cần xác nhận lại phạm vi sửa.');

  const explicitLine = Number(field(block, /\\textbf\{(?:\d+[a-z]?\.\s*)?(?:Dòng|Bước) bắt đầu sai:\}\s*([^\r\n]+)/i));
  let errorLine = Number.isInteger(explicitLine) && explicitLine > 0 && explicitLine <= bad.length ? explicitLine - 1 : -1;
  let segments: string[] = [];
  let target = -1;
  const candidateLines = errorLine >= 0 ? [errorLine] : bad.map((_, index) => index).slice(1);
  for (const index of candidateLines) {
    const rowTokens = tokeniseMath(bad[index]);
    const wanted = normaliseToken(wrongToken);
    let found = rowTokens.findIndex(token => normaliseToken(token) === wanted);
    if (found < 0 && wanted.length > 1) found = rowTokens.findIndex(token => normaliseToken(token).includes(wanted));
    if (found >= 0) { errorLine = index; segments = rowTokens; target = found; break; }
  }
  if (target < 0) {
    errorLine = Math.min(1, Math.max(0, bad.length - 1));
    segments = tokeniseMath(bad[errorLine] ?? problem);
    target = 0;
    warnings.push('Không tìm thấy token trong lời giải; cần xác nhận lại vùng bấm.');
  }

  const replacement = kind === 'symbol'
    ? correctedDisplay(String(answer))
    : kind === 'choice'
      ? selectedOption?.value ?? ''
      : rawAnswer;
  const correctedSegments = [...segments];
  if (kind === 'symbol') correctedSegments[target] = replacement;
  const correctedLine = (bad[errorLine]?.trim().startsWith('=') ? '= ' : '') + (kind === 'symbol' ? correctedSegments.join(' ') : replacement.replace(/^=\s*/, ''));
  const correct = [...bad.slice(0, errorLine), correctedLine];
  const interaction = interactionFor(kind);

  return {
    sourceNumber,
    wrongToken,
    correctedToken: replacement,
    interaction,
    answerKey: selectedKey,
    numericAnswer,
    warnings,
    question: {
      id: generatedId,
      grade: inferGrade(knowledge, problem),
      topic: knowledge,
      auditStatus: 'needs_review',
      kind,
      answer,
      options: options.length ? options : undefined,
      target,
      errorLine,
      segments,
      intro: 'Kiểm tra lời giải và tìm lỗi đầu tiên xuất hiện.',
      hint: hintFor(knowledge),
      explanation: explanation || ('Lỗi đầu tiên bắt đầu tại “' + wrongToken + '”.'),
      repairLabel: kind === 'symbol'
        ? 'Thay dấu đã chọn bằng dấu đúng.'
        : kind === 'choice'
          ? 'Chọn phép biến đổi được thực hiện đúng.'
          : kind === 'value'
            ? 'Nhập giá trị đúng.'
            : 'Viết lại phép biến đổi cho đúng.',
      difficulty: inferDifficulty(difficultyRaw),
      givenLine: errorLine + 1,
      bad,
      correct,
      sourceLatex: block.trim(),
    },
  };
}

export function parseLatexQuestionBank(source: string, firstGeneratedId: number) {
  const markers = [...source.matchAll(/\\subsection\*\{Câu\s+\d+\}/gi)];
  const blocks = markers.length ? markers.map((match, index) => source.slice(match.index!, markers[index + 1]?.index ?? source.length)) : [source];
  return blocks.map((block, index) => parseBlock(block, firstGeneratedId + index)).filter((item): item is ParsedQuestion => item !== null);
}
