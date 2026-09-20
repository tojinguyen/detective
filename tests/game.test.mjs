import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import katex from 'katex';
import { CASE_01 } from '../lib/cases.ts';
import { matchesClue, candidates, comparisonFeedback, verdict, parseArithmetic, equalsInteger, equalsArithmetic, isDetectionCorrect, isCorrectionCorrect } from '../lib/game.ts';
import { tokeniseMath } from '../lib/math-tokenizer.ts';
import { formatInvestigationTime, investigationReport, traceStatus } from '../lib/investigation-report.ts';
const questions = JSON.parse(readFileSync(new URL('../lib/questions.json', import.meta.url), 'utf8'));
const all = [0, 1, 2, 3, 4];

test('the evidence filters narrow five profiles one step at a time', () => {
  assert.deepEqual(CASE_01.people.map(person => person.name), ['Cô Hạ', 'Thầy Khải', 'Cô Ngân', 'Anh Phúc', 'Cô Vy']);
  assert.ok(CASE_01.people.every(person => person.role && !('shoe' in person.facts) && !('bag' in person.facts)));
  assert.deepEqual(CASE_01.people.map(person => person.facts.height), [158, 171, 166, 174, 169]);
  assert.deepEqual(CASE_01.people.map(person => person.facts.arrived), ['15:52', '15:38', '15:48', '15:55', '16:02']);
  assert.deepEqual(CASE_01.people.map(person => person.facts.caseLength), [24, 32, 18, 28, 28]);
  assert.equal(new Set(CASE_01.people.map(person => person.facts.height)).size, CASE_01.people.length, 'profile heights should feel individual rather than cloned');
  assert.equal(candidates(CASE_01, []).length, 5);
  assert.deepEqual(all.map(index => candidates(CASE_01, all.slice(0, index + 1)).length), [4, 3, 2, 2, 1]);
  assert.deepEqual(candidates(CASE_01, [0, 1, 2, 3]), [3, 4], 'M4 must still leave two people');
  assert.deepEqual(candidates(CASE_01, all), [3]);
  for (let mask = 0; mask < 31; mask++) {
    const revealed = all.filter(index => mask & (1 << index));
    if (revealed.length === 5) continue;
    const messages = all.map(accused => verdict(CASE_01, [0, 1, 2, 3], revealed, accused));
    assert.ok(messages.every(result => !result.won));
    assert.equal(new Set(messages.map(result => result.text)).size, 1, 'Early feedback cannot reveal whether a name is correct');
  }
});

test('each clue compares an age-appropriate profile field', () => {
  assert.equal(matchesClue(CASE_01, 0, 0), false);
  assert.equal(matchesClue(CASE_01, 1, 0), true);
  assert.equal(matchesClue(CASE_01, 1, 1), false);
  assert.equal(matchesClue(CASE_01, 2, 1), true);
  assert.equal(matchesClue(CASE_01, 2, 2), false);
  assert.equal(matchesClue(CASE_01, 3, 2), true);
  assert.equal(matchesClue(CASE_01, 3, 3), true);
  assert.equal(matchesClue(CASE_01, 4, 3), true);
  assert.equal(matchesClue(CASE_01, 3, 4), true, 'The final frame must identify Phúc after M4');
  assert.equal(matchesClue(CASE_01, 4, 4), false, 'The final frame must distinguish Vy from Phúc');
  assert.equal(matchesClue(CASE_01, 99, 0), false);
});

test('verdict requires all evidence, a consistent elimination board and the surviving profile', () => {
  assert.equal(verdict(CASE_01, [0, 1, 2, 4], [0, 1, 2, 3], 3).won, false);
  assert.equal(verdict(CASE_01, [0, 1, 2], all, 3).won, false);
  assert.equal(verdict(CASE_01, [0, 1, 2, 3, 4], all, 3).won, false);
  assert.equal(verdict(CASE_01, [0, 1, 2, 3], all, 4).won, false);
  assert.equal(verdict(CASE_01, [0, 1, 2, 4], all, null).won, false);
  assert.equal(verdict(CASE_01, [0, 1, 2, 4], all, 0).won, false);
  assert.equal(verdict(CASE_01, [0, 1, 2, 4], all, 3).won, true);
});

test('comparison feedback explains the exact conflict shown on the profile board', () => {
  const feedback = comparisonFeedback(CASE_01, [0, 1, 2, 3], all);
  assert.equal(feedback.aligned, false);
  assert.match(feedback.text, /Anh Phúc vẫn khớp với đủ 5 dữ kiện/);
  assert.match(feedback.text, /Cô Vy không khớp M5 “Cầu thang”/);
  assert.match(feedback.text, /hồ sơ ghi “Thang máy”/);
  assert.equal(verdict(CASE_01, [0, 1, 2, 3], all, 4).text, feedback.text);
});

test('the investigation journal classifies process without grading speed', () => {
  const base = { stage: 'done', findMisses: 0, repairMisses: 0, findSeconds: 500, repairSeconds: 400, hintOpened: false, tabExits: 0, inactiveSeconds: 0 };
  assert.equal(traceStatus(base), 'immediate', 'a long active time must not lower the process status');
  assert.equal(traceStatus({ ...base, findMisses: 2 }), 'independent');
  assert.equal(traceStatus({ ...base, hintOpened: true }), 'assisted');
  assert.equal(traceStatus({ ...base, stage: 'repair' }), 'unfinished');
});

test('the investigation journal keeps active and off-tab time separate', () => {
  const report = investigationReport([
    { stage: 'done', findMisses: 0, repairMisses: 0, findSeconds: 35, repairSeconds: 25, hintOpened: false, tabExits: 0, inactiveSeconds: 0 },
    { stage: 'done', findMisses: 1, repairMisses: 0, findSeconds: 50, repairSeconds: 30, hintOpened: false, tabExits: 1, inactiveSeconds: 36 },
  ]);
  assert.deepEqual({ immediate: report.immediate, independent: report.independent, assisted: report.assisted }, { immediate: 1, independent: 1, assisted: 0 });
  assert.equal(report.activeSeconds, 140);
  assert.equal(report.inactiveSeconds, 36);
  assert.equal(report.tabExits, 1);
  assert.equal(formatInvestigationTime(report.activeSeconds), '02:20');
  assert.match(report.narrative, /tự kiểm tra và điều chỉnh 1 phán đoán/);
});

test('the same engine accepts a second case configuration without new filtering code', () => {
  const otherCase = {
    ...CASE_01,
    id: 'case-test',
    number: 'T',
    rooms: [
      { ...CASE_01.rooms[0], no: '01', final: false },
      { ...CASE_01.rooms[4], no: '02', final: true },
    ],
    people: [
      { id: 'a', name: 'A', role: 'Điều phối', color: '#111', facts: { score: 1, route: 'Trái' } },
      { id: 'b', name: 'B', role: 'Kỹ thuật', color: '#222', facts: { score: 2, route: 'Phải' } },
      { id: 'c', name: 'C', role: 'Hậu cần', color: '#333', facts: { score: 3, route: 'Trái' } },
    ],
    profileFields: [
      { key: 'score', label: 'Điểm', icon: 'ruler' },
      { key: 'route', label: 'Lối đi', icon: 'route' },
    ],
    clues: [
      { text: 'Điểm từ 2.', shortLabel: '≥ 2', unlockedNote: '✓ Đã lọc', rule: { field: 'score', operator: 'gte', value: 2 } },
      { text: 'Đi bên phải.', shortLabel: 'Phải', unlockedNote: '✓ Quyết định', rule: { field: 'route', operator: 'eq', value: 'Phải' } },
    ],
    logicHints: ['Mở dữ kiện.', 'Lọc theo điểm.', 'Lọc theo lối đi.'],
    defaultQuestionIds: [1, 2],
    finalRoomIndex: 1,
    finalPersonIndex: 1,
    resolution: 'B là hồ sơ duy nhất phù hợp.',
  };
  assert.deepEqual(candidates(otherCase, [0]), [1, 2]);
  assert.deepEqual(candidates(otherCase, [0, 1]), [1]);
  assert.equal(verdict(otherCase, [0, 2], [0, 1], 1).won, true);
});

test('arithmetic respects priority, equal-priority left-to-right and exact fractions', () => {
  for (const input of ['10+18*3', '10 + 36 : 2 × 3', '10+54', '64', '(128/3)*(3/2)']) assert.equal(equalsInteger(input, 64), true, input);
  assert.equal(equalsInteger('46:2*3', 64), false);
  assert.equal(equalsInteger('2^3', 8), true);
  assert.deepEqual(parseArithmetic('0,1 + 0.2'), { n: 3n, d: 10n });
  assert.equal(equalsArithmetic('1/2', 0.5), true);
  assert.deepEqual(parseArithmetic('−2^2'), { n: -4n, d: 1n });
  assert.deepEqual(parseArithmetic('(-2)^2'), { n: 4n, d: 1n });
  for (const input of ['', '1/0', '2**3', '2..3', '(()', '<script>', 'alert(1)', '1;2', '9^99999', '1'.repeat(101)]) assert.equal(parseArithmetic(input), null, input);
});

test('all five source questions use first-error detection, and repairs accept the intended answers', () => {
  for (const question of questions) {
    assert.equal(isDetectionCorrect(question.target, '1-' + question.target), true);
    assert.equal(isDetectionCorrect(question.target, '2-' + question.target), false, 'Later propagation must not count as first error');
    assert.equal(isDetectionCorrect(question.target, null), false);
    assert.equal(isCorrectionCorrect(question.kind, question.answer, String(question.answer)), true);
    assert.equal(isCorrectionCorrect(question.kind, question.answer, '?'), false);
  }
  assert.equal(isDetectionCorrect(2, '3-2', 3), true, 'Custom questions may place the first error on any line');
  assert.equal(isCorrectionCorrect('expression', 64, '10+18×3'), true);
  assert.equal(isCorrectionCorrect('choice', 'C', 'C'), true);
  assert.equal(isCorrectionCorrect('choice', 'C', 'B'), false);
});

test('every displayed source step and clickable token renders valid mathematical notation', () => {
  for (const question of questions) {
    assert.ok(question.sourceLatex.includes('Bài ' + question.id));
    for (const latex of [...question.bad, ...question.correct, ...question.segments]) {
      assert.doesNotThrow(() => katex.renderToString(latex, { throwOnError: true, strict: 'error', trust: false }), 'Question ' + question.id + ': ' + latex);
    }
  }
});

test('sizing commands never become standalone clickable tokens', () => {
  const tokens = tokeniseMath('(-0{,}12) \\cdot \\left( x - \\frac{9}{10} \\right) = -1{,}2');
  assert.ok(!tokens.includes('\\left'));
  assert.ok(!tokens.includes('\\right'));
  for (const token of tokens) {
    assert.doesNotThrow(() => katex.renderToString(token, { throwOnError: true, strict: 'error', trust: false }), token);
  }
});
