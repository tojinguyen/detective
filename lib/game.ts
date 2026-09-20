import type { CaseDefinition, FactValue, RuleOperator } from './cases';

function compareFact(actual: FactValue | undefined, operator: RuleOperator, expected: FactValue) {
  if (actual === undefined) return false;
  if (operator === 'eq') return actual === expected;
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (operator === 'gt') return actual > expected;
    if (operator === 'gte') return actual >= expected;
    if (operator === 'lt') return actual < expected;
    return actual <= expected;
  }
  if (typeof actual === 'string' && typeof expected === 'string') {
    if (operator === 'gt') return actual > expected;
    if (operator === 'gte') return actual >= expected;
    if (operator === 'lt') return actual < expected;
    return actual <= expected;
  }
  return false;
}

export function matchesClue(caseData: CaseDefinition, person: number, index: number) {
  const profile = caseData.people[person];
  const clue = caseData.clues[index];
  return Boolean(profile && clue && compareFact(profile.facts[clue.rule.field], clue.rule.operator, clue.rule.value));
}

export function candidates(caseData: CaseDefinition, revealed: number[]) {
  const filters = revealed.filter(index => index >= 0 && index < caseData.clues.length);
  return caseData.people.map((_, index) => index).filter(person => filters.every(clue => matchesClue(caseData, person, clue)));
}

function displayFact(caseData: CaseDefinition, person: number, fieldKey: string) {
  const field = caseData.profileFields.find(item => item.key === fieldKey);
  const value = caseData.people[person]?.facts[fieldKey];
  return value === undefined ? 'không có dữ liệu' : String(value) + (field?.suffix ?? '');
}

export function comparisonFeedback(caseData: CaseDefinition, eliminated: number[], revealed: number[]) {
  const filters = [...new Set(revealed)].filter(index => index >= 0 && index < caseData.clues.length);
  if (!filters.length) {
    return { aligned: false, text: 'Bạn chưa có dữ liệu để lọc. Hãy điều tra một căn phòng trên sơ đồ tòa nhà.' };
  }

  const expected = candidates(caseData, filters);
  const wronglyEliminated = expected.filter(index => eliminated.includes(index));
  const wronglyKept = caseData.people
    .map((_, index) => index)
    .filter(index => !eliminated.includes(index) && !expected.includes(index));

  if (wronglyEliminated.length || wronglyKept.length) {
    const messages: string[] = [];
    if (wronglyEliminated.length) {
      const names = wronglyEliminated.map(index => caseData.people[index].name).join(', ');
      const evidenceCount = filters.length === caseData.clues.length ? `đủ ${filters.length}` : String(filters.length);
      messages.push(`${names} vẫn khớp với ${evidenceCount} dữ kiện đã mở; hãy khôi phục ${wronglyEliminated.length > 1 ? 'các hồ sơ này' : 'hồ sơ này'}.`);
    }
    if (wronglyKept.length) {
      const person = wronglyKept[0];
      const failedClue = filters.find(index => !matchesClue(caseData, person, index));
      if (failedClue !== undefined) {
        const clue = caseData.clues[failedClue];
        messages.push(`${caseData.people[person].name} không khớp M${failedClue + 1} “${clue.shortLabel}”: hồ sơ ghi “${displayFact(caseData, person, clue.rule.field)}”.`);
      }
    }
    return { aligned: false, text: messages.join(' ') };
  }

  const remaining = caseData.people.length - eliminated.length;
  const nextStep = filters.length === caseData.clues.length
    ? remaining === 1 ? 'Bạn có thể đưa ra kết luận.' : 'Hãy để lại đúng một hồ sơ phù hợp.'
    : 'Tiếp tục điều tra để thu hẹp thêm.';
  return { aligned: true, text: `Bảng đối chiếu đã khớp với ${filters.length} dữ kiện. ${nextStep}` };
}

export function verdict(caseData: CaseDefinition, eliminated: number[], revealed: number[], accused: number | null) {
  const requiredClues = caseData.clues.map((_, index) => index);
  const sideRoomCount = caseData.rooms.filter(room => !room.final).length;
  const finalRoomName = caseData.rooms[caseData.finalRoomIndex]?.name.toLocaleLowerCase('vi') ?? 'phòng cuối';
  if (requiredClues.some(i => !revealed.includes(i))) return { won: false, text: `Hồ sơ chưa đủ: hãy hoàn tất ${sideRoomCount} phòng và mở ${finalRoomName} trước khi đưa ra kết luận.` };
  const comparison = comparisonFeedback(caseData, eliminated, revealed);
  if (!comparison.aligned) return { won: false, text: comparison.text };
  const survivors = caseData.people.map((_, index) => index).filter(index => !eliminated.includes(index));
  if (survivors.length !== 1) return { won: false, text: `Hãy để lại đúng một nhân vật phù hợp sau khi đối chiếu đủ ${caseData.clues.length} manh mối.` };
  if (accused === null) return { won: false, text: 'Hãy chọn nhân vật phù hợp với kết luận của bạn.' };
  if (survivors[0] !== accused) return { won: false, text: 'Tên bạn chọn chưa trùng với hồ sơ duy nhất còn phù hợp trên bảng đối chiếu.' };
  if (accused !== caseData.finalPersonIndex) return { won: false, text: `Dữ kiện cuối chưa khớp với kết luận này. Hãy kiểm tra lại cả ${caseData.clues.length} manh mối.` };
  return { won: true, text: caseData.resolution };
}
type Rational = { n: bigint; d: bigint };
function rational(n: bigint, d = 1n): Rational {
  if (d === 0n) throw new Error('Không chia được cho 0.');
  if (d < 0n) { n = -n; d = -d; }
  let a = n < 0n ? -n : n, b = d;
  while (b) [a, b] = [b, a % b];
  return { n: n / (a || 1n), d: d / (a || 1n) };
}
export function parseArithmetic(source: string): Rational | null {
  try {
    if (!source || source.length > 100) return null;
    const s = source.replace(/\s/g, '').replace(/,/g, '.').replace(/[×·]/g, '*').replace(/[÷:]/g, '/').replace(/−/g, '-');
    if (/[^0-9.+*/()^\-]/.test(s)) return null;
    const tokens = s.match(/(?:\d+(?:\.\d+)?|\.\d+)|[+*/()^\-]/g) ?? [];
    if (tokens.join('') !== s) return null;
    let i = 0, depth = 0;
    const add = (a: Rational, b: Rational, sign: bigint) => rational(a.n * b.d + sign * b.n * a.d, a.d * b.d);
    function atom(): Rational {
      if (++depth > 25) throw new Error('Biểu thức quá dài.');
      let value: Rational;
      if (tokens[i] === '(') {
        i++; value = sum(); if (tokens[i++] !== ')') throw new Error('Thiếu ngoặc.');
      } else {
        const token = tokens[i++];
        if (!token || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token) || token.length > 15) throw new Error('Cần một số.');
        const [integer, decimal = ''] = token.split('.');
        value = rational(BigInt((integer || '0') + decimal), 10n ** BigInt(decimal.length));
      }
      depth--; return value;
    }
    function power(): Rational {
      let a = atom();
      if (tokens[i] === '^') {
        i++; const b = unary();
        if (b.d !== 1n || b.n < 0n || b.n > 8n) throw new Error('Số mũ chưa hỗ trợ.');
        a = rational(a.n ** b.n, a.d ** b.n);
      }
      return a;
    }
    function unary(): Rational {
      if (tokens[i] === '+' || tokens[i] === '-') { const sign = tokens[i++] === '-' ? -1n : 1n; const a = unary(); return rational(a.n * sign, a.d); }
      return power();
    }
    function product(): Rational {
      let a = unary();
      while (tokens[i] === '*' || tokens[i] === '/') {
        const op = tokens[i++], b = unary();
        a = op === '*' ? rational(a.n * b.n, a.d * b.d) : rational(a.n * b.d, a.d * b.n);
      }
      return a;
    }
    function sum(): Rational {
      let a = product();
      while (tokens[i] === '+' || tokens[i] === '-') { const sign = tokens[i++] === '-' ? -1n : 1n; a = add(a, product(), sign); }
      return a;
    }
    const result = sum();
    return i === tokens.length ? result : null;
  } catch { return null; }
}
export function equalsInteger(input: string, expected: number) {
  const result = parseArithmetic(input);
  return result !== null && result.n === BigInt(expected) * result.d;
}
export function equalsArithmetic(input: string, expected: string | number) {
  const actual = parseArithmetic(input);
  const target = parseArithmetic(String(expected));
  return actual !== null && target !== null && actual.n * target.d === target.n * actual.d;
}
export function isDetectionCorrect(target: number, selection: string | null, errorLine = 1) {
  return selection === errorLine + '-' + target;
}
export function isCorrectionCorrect(kind: string, answer: string | number, input: string) {
  if (kind === 'symbol' || kind === 'choice') return input === String(answer);
  return equalsArithmetic(input, answer);
}
