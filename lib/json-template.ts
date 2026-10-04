import { type Question, type QuestionKind } from '@/lib/content';
import { tokeniseMath } from '@/lib/latex-question-parser';

export const QUESTION_TEMPLATE_JSON = JSON.stringify([
  {
    "id": 101,
    "grade": 7,
    "topic": "Số hữu tỉ · Đổi dấu số hạng",
    "difficulty": "Dễ",
    "kind": "symbol",
    "auditStatus": "approved",
    "errorLine": 1,
    "wrongToken": "+",
    "answer": "-",
    "bad": [
      "A = 3.5 - (-2.1)",
      "= 3.5 + 2.1",
      "= 5.6"
    ],
    "correct": [
      "A = 3.5 - (-2.1)",
      "= 3.5 + 2.1",
      "= 5.6"
    ],
    "hint": "Quy tắc trừ hai số hữu tỉ: a - (-b) = a + b.",
    "explanation": "Khi bỏ ngoặc trước có dấu trừ, ta phải đổi dấu số hạng bên trong ngoặc.",
    "repairLabel": "Thay dấu đã chọn bằng dấu đúng.",
    "intro": "Một lời giải nháp về số hữu tỉ bị tính sai dấu."
  },
  {
    "id": 102,
    "grade": 8,
    "topic": "Hằng đẳng thức đáng nhớ · Khai triển",
    "difficulty": "Trung bình",
    "kind": "value",
    "auditStatus": "approved",
    "errorLine": 1,
    "wrongToken": "6x",
    "answer": "6x",
    "bad": [
      "(x + 3)^2",
      "= x^2 + 3x + 9"
    ],
    "correct": [
      "(x + 3)^2",
      "= x^2 + 2 \\cdot x \\cdot 3 + 3^2",
      "= x^2 + 6x + 9"
    ],
    "hint": "(a + b)^2 = a^2 + 2ab + b^2, chú ý hạng tử 2ab.",
    "explanation": "Lời giải thiếu hệ số 2 trong tích hai lần số thứ nhất với số thứ hai.",
    "repairLabel": "Nhập giá trị đúng.",
    "intro": "Khai triển hằng đẳng thức bị thiếu số hạng giữa."
  },
  {
    "id": 103,
    "grade": 9,
    "topic": "Rút gọn căn thức bậc hai",
    "difficulty": "Khó",
    "kind": "choice",
    "auditStatus": "approved",
    "errorLine": 1,
    "wrongToken": "3\\sqrt{2}",
    "options": [
      { "key": "A", "value": "2\\sqrt{3}" },
      { "key": "B", "value": "3\\sqrt{2}" },
      { "key": "C", "value": "4\\sqrt{3}" },
      { "key": "D", "value": "6" }
    ],
    "answer": "A",
    "bad": [
      "\\sqrt{12}",
      "= 3\\sqrt{2}"
    ],
    "correct": [
      "\\sqrt{12}",
      "= \\sqrt{4 \\cdot 3}",
      "= 2\\sqrt{3}"
    ],
    "hint": "Phân tích 12 = 4 × 3 để đưa 4 ra ngoài căn.",
    "explanation": "Căn bậc hai của 12 là căn(4*3) = 2 căn(3), không phải 3 căn(2).",
    "repairLabel": "Chọn phép biến đổi được thực hiện đúng.",
    "intro": "Phép biến đổi đưa thừa số ra ngoài dấu căn bị nhầm lẫn."
  }
], null, 2);

function repairLabelFor(kind: QuestionKind) {
  if (kind === 'symbol') return 'Thay dấu đã chọn bằng dấu đúng.';
  if (kind === 'choice') return 'Chọn phép biến đổi được thực hiện đúng.';
  if (kind === 'value') return 'Nhập giá trị đúng.';
  return 'Viết lại phép biến đổi cho đúng.';
}

export function downloadJsonTemplate() {
  const blob = new Blob([QUESTION_TEMPLATE_JSON], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'erase-question-template.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ParseJsonResult = {
  validQuestions: Question[];
  warnings: string[];
  errors: string[];
};

export function parseQuestionsFromJson(rawText: string, existingMaxId: number): ParseJsonResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validQuestions: Question[] = [];

  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi cú pháp JSON';
    return { validQuestions: [], warnings: [], errors: [`Cú pháp JSON không hợp lệ: ${msg}`] };
  }

  // Chấp nhận mảng câu hỏi hoặc object có thuộc tính customQuestions / questions
  let rawList: unknown[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.customQuestions)) {
      rawList = obj.customQuestions;
    } else if (Array.isArray(obj.questions)) {
      rawList = obj.questions;
    } else {
      return {
        validQuestions: [],
        warnings: [],
        errors: ['JSON phải là một mảng các câu hỏi `[...]` hoặc object chứa trường `customQuestions` hoặc `questions`.'],
      };
    }
  }

  if (rawList.length === 0) {
    return { validQuestions: [], warnings: [], errors: ['Không tìm thấy câu hỏi nào trong dữ liệu JSON.'] };
  }

  let nextAutoId = existingMaxId + 1;

  rawList.forEach((item, index) => {
    const itemPrefix = `Câu ${index + 1}`;
    if (!item || typeof item !== 'object') {
      errors.push(`${itemPrefix}: Dữ liệu câu hỏi phải là một object.`);
      return;
    }

    const q = item as Record<string, unknown>;

    // Kiểm tra bad & correct
    const bad = Array.isArray(q.bad) ? q.bad.map(String).filter(Boolean) : [];
    if (bad.length < 2) {
      errors.push(`${itemPrefix}: 'bad' (lời giải có lỗi) phải là mảng ít nhất 2 dòng.`);
      return;
    }

    const correct = Array.isArray(q.correct) ? q.correct.map(String).filter(Boolean) : [...bad];

    // Xử lý errorLine
    let errorLine = 1;
    if (typeof q.errorLine === 'number' && Number.isInteger(q.errorLine)) {
      errorLine = q.errorLine;
      if (errorLine < 0 || errorLine >= bad.length) {
        warnings.push(`${itemPrefix}: 'errorLine' (${errorLine}) vượt giới hạn số dòng, tự gán về dòng 1 (hàng thứ 2).`);
        errorLine = 1;
      }
    }

    // Xử lý segments và tokenise
    const errorString = bad[errorLine] || bad[0] || '';
    const segments = Array.isArray(q.segments) && q.segments.length > 0 
      ? q.segments.map(String) 
      : tokeniseMath(errorString);

    // Xác định target
    let target = 0;
    if (typeof q.target === 'number' && q.target >= 0 && q.target < segments.length) {
      target = q.target;
    } else if (q.wrongToken && typeof q.wrongToken === 'string') {
      const foundIdx = segments.findIndex(s => s.trim() === (q.wrongToken as string).trim());
      if (foundIdx >= 0) target = foundIdx;
    }

    // Kind
    const validKinds: QuestionKind[] = ['symbol', 'value', 'choice', 'expression'];
    const kind: QuestionKind = validKinds.includes(q.kind as QuestionKind) 
      ? (q.kind as QuestionKind) 
      : 'symbol';

    // Difficulty
    let difficulty: string | null = null;
    if (q.difficulty === 'Dễ' || q.difficulty === 'Trung bình' || q.difficulty === 'Khó') {
      difficulty = q.difficulty;
    }

    const grade = typeof q.grade === 'number' && q.grade >= 6 && q.grade <= 9 ? q.grade : 7;
    const topic = typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim() : `Bài tập tự tạo ${nextAutoId}`;
    const id = typeof q.id === 'number' && Number.isInteger(q.id) && q.id > 0 ? q.id : nextAutoId++;

    const question: Question = {
      id,
      grade,
      topic,
      auditStatus: q.auditStatus === 'approved' || q.auditStatus === 'needs_review' ? q.auditStatus : 'approved',
      kind,
      answer: q.answer !== undefined ? String(q.answer) : (kind === 'choice' ? 'A' : '+'),
      options: Array.isArray(q.options) ? q.options as Question['options'] : undefined,
      target,
      errorLine,
      segments,
      intro: typeof q.intro === 'string' ? q.intro : 'Lời giải kiểm tra tại hiện trường.',
      hint: typeof q.hint === 'string' ? q.hint : 'Quan sát kỹ bước biến đổi để tìm lỗi sai.',
      explanation: typeof q.explanation === 'string' ? q.explanation : 'Xem kỹ các quy tắc biến đổi tương đương.',
      repairLabel: typeof q.repairLabel === 'string' ? q.repairLabel : repairLabelFor(kind),
      difficulty,
      givenLine: difficulty === 'Dễ' ? errorLine + 1 : null,
      bad,
      correct,
      sourceLatex: typeof q.sourceLatex === 'string' ? q.sourceLatex : '',
    };

    validQuestions.push(question);
  });

  return { validQuestions, warnings, errors };
}

