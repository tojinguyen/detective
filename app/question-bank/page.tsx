"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type FormEvent } from 'react';
import katex from 'katex';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Copy,
  Download,
  FileDown,
  FileText,
  Pencil,
  RotateCcw,
  ScanSearch,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchQuestionsFromDb, pushPendingQuestions } from '@/lib/questions-db';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app-header';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  DEFAULT_LOCAL_CONTENT,
  allQuestions,
  findLocalQuestion,
  mergeCloudQuestions,
  questionIdsForCase,
  readLocalContent,
  writeLocalContent,
  type LocalContent,
  type Question,
  type QuestionKind,
  type QuestionOption,
} from '@/lib/content';
import { CASE_01, CASES } from '@/lib/cases';
import { parseLatexQuestionBank, tokeniseMath, type ParsedQuestion } from '@/lib/latex-question-parser';
import { downloadJsonTemplate, parseQuestionsFromJson, QUESTION_TEMPLATE_JSON } from '@/lib/json-template';

const GRADES = [6, 7, 8, 9] as const;
const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Dễ', label: 'Dễ' },
  { value: 'Trung bình', label: 'Trung bình' },
  { value: 'Khó', label: 'Khó' },
  { value: 'unset', label: 'Chưa gắn' },
] as const;
type BankFilter = typeof FILTERS[number]['value'];
type SyncState = { state: 'idle' | 'syncing' | 'synced' | 'error'; error?: string };

const STATUS: Record<Question['auditStatus'], { label: string; dot: string }> = {
  approved: { label: 'Đã duyệt', dot: 'bg-[#6dc797]' },
  needs_review: { label: 'Cần duyệt', dot: 'bg-[#e8b35c]' },
  draft: { label: 'Bản nháp', dot: 'bg-[#6c827a]' },
};

// Cột của bảng Kho bài (chỉ áp dụng từ lg trở lên; nhỏ hơn thì xếp dọc).
const BANK_COLUMNS = 'lg:grid lg:grid-cols-[4rem_3.5rem_minmax(0,1fr)_9rem_12rem_7.5rem_6.5rem] lg:items-center lg:gap-x-4';

type QuestionDraft = {
  grade: string;
  topic: string;
  difficulty: '' | 'Dễ' | 'Trung bình' | 'Khó';
  errorLine: string;
  wrongToken: string;
  kind: QuestionKind;
  repairLabel: string;
  answerType: 'choice' | 'free_text';
  answer: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  bad: string;
  correct: string;
  hint: string;
  explanation: string;
};

function draftFrom(question: Question): QuestionDraft {
  const optMap: Record<string, string> = {};
  if (question.options) {
    question.options.forEach(option => {
      optMap[option.key.toUpperCase()] = option.value;
    });
  }
  const isChoice = question.kind === 'choice';
  return {
    grade: String(question.grade),
    topic: question.topic,
    difficulty: question.difficulty === 'Dễ' || question.difficulty === 'Trung bình' || question.difficulty === 'Khó' ? question.difficulty : '',
    errorLine: String((question.errorLine ?? 1) + 1),
    wrongToken: question.segments[question.target] ?? '',
    kind: question.kind,
    repairLabel: question.repairLabel || repairLabel(question.kind),
    answerType: isChoice ? 'choice' : 'free_text',
    answer: String(question.answer),
    optionA: optMap['A'] || '',
    optionB: optMap['B'] || '',
    optionC: optMap['C'] || '',
    optionD: optMap['D'] || '',
    bad: question.bad.join('\n'),
    correct: question.correct.join('\n'),
    hint: question.hint,
    explanation: question.explanation,
  };
}

function normaliseToken(value: string) {
  return value.replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/\\(?:left|right|,)/g, '').replace(/\{,\}/g, ',').replace(/\\times|\\cdot/g, '*').replace(/\\div|:/g, '/');
}

function repairLabel(kind: QuestionKind) {
  if (kind === 'symbol') return 'Thay dấu đã chọn bằng dấu đúng.';
  if (kind === 'choice') return 'Chọn phép biến đổi được thực hiện đúng.';
  if (kind === 'value') return 'Nhập giá trị đúng.';
  return 'Viết lại phép biến đổi cho đúng.';
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Lỗi không xác định';
}

function MathText({ value }: { value: string }) {
  return <span className="math parsed-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' }) }} />;
}

type Usage = { caseNo: string; roomNo: string };

/** "P01 · Vụ 01, 02; P03 · Vụ 03" — gom các vụ dùng bài ở cùng một phòng. */
function describeUsage(usages: Usage[]) {
  const byRoom = new Map<string, string[]>();
  usages.forEach(u => byRoom.set(u.roomNo, [...(byRoom.get(u.roomNo) ?? []), u.caseNo]));
  return [...byRoom].map(([roomNo, cases]) => `P${roomNo} · Vụ ${cases.join(', ')}`).join('; ');
}

function DifficultyMark({ value }: { value: string | null }) {
  const level = value === 'Dễ' ? 1 : value === 'Trung bình' ? 2 : value === 'Khó' ? 3 : 0;
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span aria-hidden className="flex gap-[3px]">
        {[1, 2, 3].map(i => (
          <span key={i} className={`size-[7px] rounded-full ${i <= level ? 'bg-[#ceac79]' : 'border border-[#3a525c]'}`} />
        ))}
      </span>
      <span className={level ? 'text-[#d9cfbb]' : 'text-[#6c827a] italic'}>{value || 'Chưa gắn mức'}</span>
    </span>
  );
}

function Segmented<T extends string | number>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3 min-w-0 max-w-full">
      <span className="text-xs text-[#8ca097]">{label}</span>
      <div className="flex min-w-0 overflow-x-auto rounded-md border border-[#2b414a] bg-[#0b171d] p-0.5">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#deb97b] ${
              value === option.value ? 'bg-[#ceac79] text-[#0f2026]' : 'text-[#93a69e] hover:text-[#f0ece1]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SyncButton({ sync, pending, onSync }: { sync: SyncState; pending: number; onSync: () => void }) {
  const busy = sync.state === 'syncing';
  const failed = sync.state === 'error';
  const label = busy ? 'Đang đồng bộ…'
    : failed ? 'Chưa lên Cloud · Thử lại'
    : pending ? `${pending} thay đổi chưa đồng bộ`
    : sync.state === 'synced' ? 'Đã đồng bộ Cloud' : 'Đồng bộ Cloud';
  return (
    <button
      type="button"
      onClick={onSync}
      disabled={busy}
      title={failed ? sync.error : 'Gửi thay đổi trên máy này lên Cloud và tải bản mới nhất về'}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border text-xs font-medium transition-colors disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#deb97b] ${
        failed ? 'border-[#7a3b3b] bg-[#2a1717] text-[#ffb0a3] hover:bg-[#351c1c]' : 'border-[#2f4853] bg-[#12232b] text-[#b9c9c2] hover:bg-[#182d36]'
      }`}
    >
      {failed ? <CloudOff size={15} /> : <Cloud size={15} className={busy ? 'animate-pulse text-[#deb97b]' : pending ? 'text-[#e8b35c]' : 'text-[#6dc797]'} />}
      {label}
    </button>
  );
}

export default function QuestionBankPage() {
  const { isAdmin, loading } = useAuth();
  const [content, setContent] = useState<LocalContent>(DEFAULT_LOCAL_CONTENT);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<'bank' | 'case' | 'import'>('bank');
  const [importMode, setImportMode] = useState<'json' | 'latex'>('json');

  // Filter state for Tab 1
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [filter, setFilter] = useState<BankFilter>('all');

  // LaTeX state
  const [latex, setLatex] = useState('');
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [latexTargetRoom, setLatexTargetRoom] = useState('0');

  // Vụ án đang chọn ở tab Gán phòng (dùng chung cho nhập LaTeX)
  const [caseId, setCaseId] = useState(CASE_01.id);
  const selectedCase = CASES.find(c => c.id === caseId) ?? CASE_01;
  const roomNames = selectedCase.rooms.map(room => room.name);
  const [caseQuery, setCaseQuery] = useState('');
  const [onlyChangedCases, setOnlyChangedCases] = useState(false);
  const [pickerRoom, setPickerRoom] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  // JSON import state
  const [jsonText, setJsonText] = useState('');
  const [jsonParsedQuestions, setJsonParsedQuestions] = useState<Question[]>([]);
  const [jsonWarnings, setJsonWarnings] = useState<string[]>([]);
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [isCopiedTemplate, setIsCopiedTemplate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Common notification message
  const [message, setMessage] = useState('');

  // Edit & Delete modal states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Cloud sync
  const [sync, setSync] = useState<SyncState>({ state: 'idle' });
  const contentRef = useRef(content);

  const bank = useMemo(() => allQuestions(content), [content]);
  const maxQuestionId = useMemo(() => Math.max(0, ...bank.map(q => q.id)), [bank]);

  const visibleQuestions = useMemo(() => bank.filter(q =>
    (selectedGrade === 'all' || q.grade === selectedGrade)
    && (filter === 'all' || (filter === 'unset' ? !q.difficulty : q.difficulty === filter))
  ), [bank, filter, selectedGrade]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, selectedGrade, pageSize]);

  const totalItems = visibleQuestions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const firstShown = Math.min((safePage - 1) * pageSize + 1, totalItems);
  const lastShown = Math.min(safePage * pageSize, totalItems);

  const paginatedQuestions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return visibleQuestions.slice(start, start + pageSize);
  }, [visibleQuestions, safePage, pageSize]);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  function goToPage(page: number) {
    setCurrentPage(page);
    document.getElementById('question-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const assignedQuestionIds = questionIdsForCase(content, selectedCase);

  // Bài nào đang nằm ở phòng nào của vụ nào
  const usageById = useMemo(() => {
    const map = new Map<number, Usage[]>();
    CASES.forEach(c => questionIdsForCase(content, c).forEach((id, index) => {
      map.set(id, [...(map.get(id) ?? []), { caseNo: c.number, roomNo: c.rooms[index].no }]);
    }));
    return map;
  }, [content]);
  const usedQuestionCount = usageById.size;

  // Danh sách vụ án (tab Gán phòng)
  const changedCaseIds = useMemo(() => new Set(CASES
    .filter(c => questionIdsForCase(content, c).some((id, i) => id !== c.defaultQuestionIds[i]))
    .map(c => c.id)), [content]);
  const visibleCases = useMemo(() => {
    const query = caseQuery.trim().toLowerCase();
    return CASES.filter(c =>
      (!onlyChangedCases || changedCaseIds.has(c.id))
      && (!query || c.number.includes(query) || c.title.toLowerCase().includes(query))
    );
  }, [caseQuery, onlyChangedCases, changedCaseIds]);
  const changedRoomCount = assignedQuestionIds.filter((id, i) => id !== selectedCase.defaultQuestionIds[i]).length;

  // Bộ chọn bài cho một phòng: lọc theo mã, chủ đề, "lớp N"; giới hạn số dòng hiển thị
  const PICKER_LIMIT = 50;
  const pickerMatches = useMemo(() => {
    const terms = pickerQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return bank;
    return bank.filter(q => {
      const haystack = `#${q.id} ${q.id} ${q.topic} lớp ${q.grade} ${q.difficulty ?? ''}`.toLowerCase();
      return terms.every(term => haystack.includes(term));
    });
  }, [bank, pickerQuery]);
  const pickerResults = pickerMatches.slice(0, PICKER_LIMIT);
  const pickerTotal = pickerMatches.length;
  const editingQuestion = editingId === null ? null : bank.find(question => question.id === editingId) ?? null;

  /**
   * Đẩy pendingSyncIds lên Cloud, rồi (nếu pull) tải bản mới nhất về ghép vào.
   * Bài nào bị sửa tiếp trong lúc đang gửi thì vẫn giữ trong pending cho lần sau.
   */
  const syncNow = useCallback(async (pull: boolean, source?: LocalContent) => {
    setSync({ state: 'syncing' });
    const push = await pushPendingQuestions(source ?? contentRef.current)
      .catch((err): Awaited<ReturnType<typeof pushPendingQuestions>> => ({ synced: [], error: errorMessage(err) }));
    let cloud: Question[] | null = null;
    let pullError: string | undefined;
    if (pull) {
      try { cloud = await fetchQuestionsFromDb(); } catch (err) { pullError = errorMessage(err); }
    }
    const sent = new Map(push.synced.map(entry => [entry.id, entry.snapshot]));
    setContent(prev => {
      const next = {
        ...prev,
        pendingSyncIds: prev.pendingSyncIds.filter(id => !sent.has(id) || findLocalQuestion(prev, id) !== sent.get(id)),
      };
      return cloud ? mergeCloudQuestions(next, cloud) : next;
    });
    const error = push.error ?? pullError;
    setSync(error ? { state: 'error', error } : { state: 'synced' });
  }, []);

  useEffect(() => {
    const initial = readLocalContent();
    setContent(initial);
    setHydrated(true);
    syncNow(true, initial);
  }, [syncNow]);

  useEffect(() => {
    contentRef.current = content;
    if (hydrated) writeLocalContent(content);
  }, [content, hydrated]);

  /** Lưu thay đổi trên máy; changedIds (nếu có) được đánh dấu chờ và gửi lên Cloud ngay. */
  function persist(next: LocalContent, feedback: string, changedIds: number[] = []) {
    const withPending = changedIds.length ? { ...next, pendingSyncIds: [...new Set([...next.pendingSyncIds, ...changedIds])] } : next;
    setContent(withPending);
    setMessage(feedback);
    if (changedIds.length) syncNow(false, withPending);
  }

  function storeQuestion(question: Question, feedback: string) {
    const isCustom = content.customQuestions.some(item => item.id === question.id);
    const next = isCustom
      ? { ...content, customQuestions: content.customQuestions.map(item => item.id === question.id ? question : item) }
      : { ...content, questionOverrides: [...content.questionOverrides.filter(item => item.id !== question.id), question] };
    persist(next, feedback, [question.id]);
  }

  function openEditor(question: Question) {
    setEditingId(question.id);
    setDraft(draftFrom(question));
    setEditMessage('');
  }

  function saveEdit() {
    if (!editingQuestion || !draft) return;
    const bad = draft.bad.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const correct = draft.correct.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const requestedLine = Number(draft.errorLine);
    if (!draft.topic.trim() || !Number.isInteger(Number(draft.grade)) || Number(draft.grade) < 6 || Number(draft.grade) > 9) {
      setEditMessage('Hãy kiểm tra lại mạch kiến thức và lớp từ 6 đến 9.'); return;
    }
    if (bad.length < 2 || !Number.isInteger(requestedLine) || requestedLine < 1 || requestedLine > bad.length) {
      setEditMessage('Lời giải cần ít nhất hai dòng và số dòng lỗi phải nằm trong lời giải.'); return;
    }
    const errorLine = requestedLine - 1;
    const segments = tokeniseMath(bad[errorLine]);
    const target = segments.findIndex(token => normaliseToken(token) === normaliseToken(draft.wrongToken));
    if (target < 0) {
      setEditMessage('Không tìm thấy token sai trong dòng đã chọn. Hãy nhập đúng ký hiệu đang xuất hiện trên dòng đó.'); return;
    }
    let finalKind: QuestionKind = draft.kind;
    let finalOptions: QuestionOption[] | undefined = undefined;
    let finalAnswer = draft.answer.trim();

    if (draft.answerType === 'choice') {
      finalKind = 'choice';
      const constructedOptions = [
        { key: 'A', value: draft.optionA.trim() },
        { key: 'B', value: draft.optionB.trim() },
        { key: 'C', value: draft.optionC.trim() },
        { key: 'D', value: draft.optionD.trim() },
      ].filter(opt => opt.value.length > 0);

      if (constructedOptions.length < 2) {
        setEditMessage('Vui lòng nhập nội dung cho ít nhất 2 phương án trắc nghiệm.'); return;
      }
      finalAnswer = finalAnswer.toUpperCase();
      if (!constructedOptions.some(opt => opt.key === finalAnswer)) {
        setEditMessage('Hãy chọn phương án đúng bằng cách bấm vào chữ A, B, C hoặc D tương ứng.'); return;
      }
      finalOptions = constructedOptions;
    } else {
      if (finalKind === 'choice') {
        finalKind = 'value';
      }
      if (!finalAnswer) {
        setEditMessage('Vui lòng nhập đáp án đúng cho bài tập tự luận.'); return;
      }
      finalOptions = undefined;
    }

    const customRepairLabel = draft.repairLabel.trim() || repairLabel(finalKind);

    const mathChanged = draft.errorLine !== String((editingQuestion.errorLine ?? 1) + 1)
      || draft.wrongToken !== (editingQuestion.segments[editingQuestion.target] ?? '')
      || finalKind !== editingQuestion.kind
      || finalAnswer !== String(editingQuestion.answer)
      || JSON.stringify(finalOptions ?? []) !== JSON.stringify(editingQuestion.options ?? [])
      || draft.bad !== editingQuestion.bad.join('\n')
      || draft.correct !== editingQuestion.correct.join('\n')
      || draft.hint !== editingQuestion.hint
      || draft.explanation !== editingQuestion.explanation
      || customRepairLabel !== editingQuestion.repairLabel;

    const updated: Question = {
      ...editingQuestion,
      grade: Number(draft.grade),
      topic: draft.topic.trim(),
      difficulty: draft.difficulty || null,
      errorLine,
      givenLine: draft.difficulty === 'Dễ' ? requestedLine : null,
      segments,
      target,
      kind: finalKind,
      answer: mathChanged ? finalAnswer : editingQuestion.answer,
      options: finalOptions,
      bad,
      correct: correct.length ? correct : editingQuestion.correct,
      hint: draft.hint.trim(),
      explanation: draft.explanation.trim(),
      repairLabel: customRepairLabel,
      auditStatus: mathChanged ? 'needs_review' : editingQuestion.auditStatus,
      sourceLatex: mathChanged ? '' : editingQuestion.sourceLatex,
    };
    storeQuestion(updated, 'Đã lưu thay đổi cho Bài ' + updated.id + (mathChanged ? ' và chuyển về trạng thái Cần duyệt.' : '.'));
    setEditingId(null); setDraft(null); setEditMessage('');
  }

  function approveQuestion(question: Question) {
    storeQuestion({ ...question, auditStatus: 'approved' }, 'Đã đánh dấu Bài ' + question.id + ' là Đã duyệt.');
  }

  function removeQuestion(question: Question) {
    const usages = usageById.get(question.id);
    if (usages) {
      setMessage('Bài ' + question.id + ' đang được dùng ở ' + describeUsage(usages) + '. Hãy đổi bài ở các phòng đó trước khi xóa.');
      return;
    }
    setPendingDeleteId(question.id);
  }

  function confirmDelete() {
    if (pendingDeleteId === null) return;
    const idToDelete = pendingDeleteId;
    persist(
      { ...content, customQuestions: content.customQuestions.filter(item => item.id !== idToDelete) },
      'Đã xóa Bài ' + idToDelete + ' khỏi kho.',
      [idToDelete],
    );
    setPendingDeleteId(null);
  }

  function assignQuestion(roomIndex: number, questionId: number) {
    const ids = [...assignedQuestionIds];
    ids[roomIndex] = questionId;
    persist({ ...content, caseQuestionIds: { ...content.caseQuestionIds, [selectedCase.id]: ids } }, 'Đã gán Bài ' + questionId + ' vào ' + roomNames[roomIndex] + ' (Vụ ' + selectedCase.number + ').');
  }

  function resetAssignments() {
    persist({
      ...content,
      caseQuestionIds: { ...content.caseQuestionIds, [selectedCase.id]: [...selectedCase.defaultQuestionIds] },
    }, 'Vụ ' + selectedCase.number + ' đã trở về bộ bài gốc.');
  }

  function exportContent() {
    const { customQuestions, questionOverrides, caseQuestionIds } = content;
    const blob = new Blob([JSON.stringify({ customQuestions, questionOverrides, caseQuestionIds }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'erase-kho-bai-tap.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Đã tải bản sao kho đề về máy.');
  }

  // --- JSON IMPORT LOGIC ---
  function handleValidateJson(textToParse: string) {
    if (!textToParse.trim()) {
      setJsonErrors(['Vui lòng dán mã JSON hoặc chọn tệp .json trước khi kiểm tra.']);
      setJsonParsedQuestions([]);
      setJsonWarnings([]);
      return;
    }
    const result = parseQuestionsFromJson(textToParse, maxQuestionId);
    setJsonParsedQuestions(result.validQuestions);
    setJsonWarnings(result.warnings);
    setJsonErrors(result.errors);
    if (result.validQuestions.length > 0) {
      setMessage(`Đã kiểm tra: Nhận diện ${result.validQuestions.length} câu hỏi hợp lệ.`);
    }
  }

  function handleFileSelected(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonText(text);
      handleValidateJson(text);
    };
    reader.readAsText(file);
  }

  function handleDropFile(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      handleFileSelected(file);
    } else {
      setJsonErrors(['Tệp không đúng định dạng. Vui lòng chọn tệp .json.']);
    }
  }

  function handleSaveJsonQuestions() {
    if (jsonParsedQuestions.length === 0) return;
    persist(
      { ...content, customQuestions: [...content.customQuestions, ...jsonParsedQuestions] },
      `Đã thêm ${jsonParsedQuestions.length} câu hỏi vào kho.`,
      jsonParsedQuestions.map(q => q.id),
    );
    setJsonParsedQuestions([]);
    setJsonText('');
    setActiveTab('bank');
  }

  function copyTemplateJson() {
    navigator.clipboard.writeText(QUESTION_TEMPLATE_JSON);
    setIsCopiedTemplate(true);
    setTimeout(() => setIsCopiedTemplate(false), 2000);
  }

  // --- LATEX LOGIC ---
  function analyseLatex(event: FormEvent) {
    event.preventDefault();
    if (!latex.trim()) { setMessage('Hãy dán ít nhất một khối câu hỏi LaTeX.'); return; }
    const firstId = maxQuestionId + 1;
    const result = parseLatexQuestionBank(latex, firstId);
    setParsed(result);
    setMessage(result.length ? 'Đã đọc được ' + result.length + ' câu. Kiểm tra thẻ phân tích trước khi lưu.' : 'Chưa đọc được câu hỏi theo cấu trúc 1–7.');
  }

  function saveParsedLatex() {
    if (!parsed.length) return;
    const newQuestions = parsed.map(item => item.question);
    const nextIds = [...assignedQuestionIds];
    if (newQuestions.length === selectedCase.rooms.length) newQuestions.forEach((question, index) => { nextIds[index] = question.id; });
    else nextIds[Number(latexTargetRoom)] = newQuestions[0].id;
    persist(
      { ...content, customQuestions: [...content.customQuestions, ...newQuestions], caseQuestionIds: { ...content.caseQuestionIds, [selectedCase.id]: nextIds } },
      newQuestions.length === selectedCase.rooms.length
        ? 'Đã thêm ' + newQuestions.length + ' bài dưới trạng thái Cần duyệt và gán lần lượt vào các phòng của Vụ ' + selectedCase.number + '.'
        : 'Đã thêm Bài ' + newQuestions[0].id + ' và gán vào ' + roomNames[Number(latexTargetRoom)] + ' (Vụ ' + selectedCase.number + ').',
      newQuestions.map(q => q.id),
    );
    setParsed([]);
    setLatex('');
    setActiveTab('bank');
  }

  const warningCount = parsed.reduce((sum, item) => sum + item.warnings.length, 0);

  if (loading) return <div className="p-10 text-center text-[#e5bd7d]">Đang xác thực quyền Admin...</div>;

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#0d1a20] text-[#e8e4d8]">
        <AppHeader currentView="question-bank" />
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <h1 className="text-2xl font-serif text-[#efdcb9] mb-2">Khu vực dành riêng cho Quản trị viên</h1>
          <p className="text-sm text-[#9aaa9f] mb-6">Bạn đang đăng nhập với tư cách học sinh. Vui lòng đăng nhập tài khoản Admin để chỉnh sửa đề.</p>
          <Link href="/" className="px-4 py-2 bg-[#bd965c] text-[#132228] font-bold rounded">Trở về Danh mục Vụ án</Link>
        </div>
      </main>
    );
  }

  const tabs = [
    { id: 'bank', label: `Kho bài (${bank.length})` },
    { id: 'case', label: 'Gán phòng theo vụ án' },
    { id: 'import', label: 'Nhập đề' },
  ] as const;

  return (
    <main className="min-h-screen bg-[#0d1a20] text-[#e8e4d8] font-sans">
      <AppHeader currentView="question-bank" />

      {/* ==================== TIÊU ĐỀ, ĐỒNG BỘ & TAB ==================== */}
      <header className="border-b border-[#22353e] bg-[#0f2128]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-[#f2ebd9] m-0">Kho đề</h1>
            <p className="text-xs text-[#8fa298] mt-1 mb-0">
              {bank.length} bài, trong đó {content.customQuestions.length} bài tự tạo. {CASES.length} vụ án đang dùng {usedQuestionCount} bài khác nhau.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SyncButton sync={sync} pending={content.pendingSyncIds.length} onSync={() => syncNow(true)} />
            <Button
              variant="ghost"
              onClick={exportContent}
              title="Tải bản sao toàn bộ kho đề về máy (JSON)"
              className="h-9 px-3 gap-1.5 text-xs text-[#ceac79] hover:bg-[#ceac79]/10 hover:text-[#deb97b]"
            >
              <Download size={15} /> Tải bản sao
            </Button>
          </div>
        </div>
        <nav className="max-w-[1200px] mx-auto px-4 sm:px-6 mt-4 flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#deb97b] ${
                activeTab === tab.id ? 'border-[#deb97b] text-[#f2ebd9]' : 'border-transparent text-[#8ca097] hover:text-[#eee4d3]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {sync.state === 'error' && (
        <div className="bg-[#2a1717] border-b border-[#5c2e2e] px-6 py-2.5 text-xs text-[#ffb0a3]">
          <div className="max-w-[1200px] mx-auto flex items-center gap-2">
            <CloudOff size={15} className="shrink-0" />
            Không kết nối được Cloud ({sync.error}). Thay đổi vẫn được giữ trên máy này và sẽ gửi lại khi bạn bấm Thử lại.
          </div>
        </div>
      )}

      {message && (
        <div className="bg-[#17332c] border-b border-[#2d5c4e] px-6 py-2.5 text-xs text-[#b8ebd8]">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#54c48a] shrink-0" /> {message}</span>
            <button onClick={() => setMessage('')} aria-label="Đóng thông báo" className="text-[#8fa8a2] hover:text-white px-1">✕</button>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {/* ==================== TAB 1: KHO BÀI ==================== */}
        {activeTab === 'bank' && (
          <section>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-5">
              <Segmented
                label="Lớp"
                value={selectedGrade}
                options={[{ value: 'all' as const, label: 'Tất cả' }, ...GRADES.map(g => ({ value: g, label: String(g) }))]}
                onChange={setSelectedGrade}
              />
              <Segmented label="Mức độ" value={filter} options={FILTERS} onChange={setFilter} />
            </div>

            <div id="question-list-top" className="scroll-mt-6" />

            {visibleQuestions.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#2b414a] rounded-lg">
                <ScanSearch size={32} className="mx-auto text-[#5f756e] mb-3" />
                <p className="text-sm text-[#a0b2aa] m-0">Không có bài nào khớp bộ lọc.</p>
                <Button
                  variant="ghost"
                  className="mt-3 text-xs text-[#ceac79] hover:bg-[#ceac79]/10"
                  onClick={() => { setSelectedGrade('all'); setFilter('all'); }}
                >
                  Bỏ bộ lọc
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-[#22353e] overflow-hidden">
                {/* Hàng tiêu đề cột */}
                <div className={`hidden ${BANK_COLUMNS} px-4 py-2.5 bg-[#0b171d] border-b border-[#22353e] text-[11px] font-medium text-[#7d938b]`}>
                  <span>Mã</span>
                  <span>Lớp</span>
                  <span>Chủ đề</span>
                  <span>Mức độ</span>
                  <span>Đang dùng ở</span>
                  <span>Trạng thái</span>
                  <span className="sr-only">Thao tác</span>
                </div>

                <ul className="divide-y divide-[#1c2f37] m-0 p-0 list-none">
                  {paginatedQuestions.map(question => {
                    const isCustom = content.customQuestions.some(item => item.id === question.id);
                    const usage = usageById.get(question.id);
                    const isExpanded = expandedId === question.id;
                    const status = STATUS[question.auditStatus] ?? STATUS.draft;
                    const isPending = content.pendingSyncIds.includes(question.id);

                    return (
                      <li key={question.id} className={isExpanded ? 'bg-[#10222a]' : 'bg-[#12232b]'}>
                        <div className={`relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-4 py-3 ${BANK_COLUMNS} hover:bg-[#162b35] transition-colors`}>
                          <span className="hidden lg:block text-xs tabular-nums text-[#ceac79] font-semibold">#{question.id}</span>
                          <span className="hidden lg:block text-xs tabular-nums text-[#b5c5bd]">{question.grade}</span>

                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() => setExpandedId(isExpanded ? null : question.id)}
                            className="min-w-0 text-left flex items-start gap-2 group focus-visible:outline-2 focus-visible:outline-[#deb97b] rounded-sm after:absolute after:inset-0 after:content-['']"
                          >
                            <ChevronDown size={15} className={`mt-0.5 shrink-0 text-[#6c827a] group-hover:text-[#deb97b] transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            <span className="min-w-0">
                              <span className="block font-serif text-[15px] leading-snug text-[#f2ebd9] truncate">
                                <span className="lg:hidden tabular-nums text-[#ceac79] font-sans text-xs font-semibold mr-2">#{question.id}</span>
                                {question.topic}
                              </span>
                              {(isCustom || isPending) && (
                                <span className="block text-[11px] text-[#7d938b] mt-0.5">
                                  {isCustom && 'Bài tự tạo'}{isCustom && isPending && ', '}{isPending && <span className="text-[#e8b35c]">chưa lên Cloud</span>}
                                </span>
                              )}
                            </span>
                          </button>

                          {/* Mobile: meta gộp một dòng; lg: tách cột */}
                          <div className="col-start-1 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[23px] text-xs text-[#8fa298] lg:contents lg:pl-0">
                            <span className="lg:hidden">Lớp {question.grade}</span>
                            <DifficultyMark value={question.difficulty} />
                            <span className="truncate" title={usage ? describeUsage(usage) : undefined}>
                              {usage ? <span className="text-[#d9cfbb] tabular-nums">{describeUsage(usage)}</span> : <span className="hidden lg:inline text-[#4f6670]">Chưa dùng</span>}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[#b5c5bd]">
                              <span className={`size-1.5 rounded-full ${status.dot}`} /> {status.label}
                            </span>
                          </div>

                          <div className="relative z-10 col-start-2 row-start-1 row-span-2 lg:col-auto lg:row-auto flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditor(question)}
                              className="h-8 px-2.5 text-xs text-[#ceac79] hover:bg-[#ceac79]/10 hover:text-[#deb97b] gap-1"
                            >
                              <Pencil size={13} /> Sửa
                            </Button>
                            {isCustom && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(question)}
                                className="h-8 w-8 p-0 text-[#c98472] hover:bg-[#e58a74]/10 hover:text-[#e58a74]"
                                aria-label={`Xóa bài ${question.id}`}
                                title="Xóa bài"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 lg:pl-[calc(7.5rem+2rem+23px)] pb-5 pt-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h3 className="text-xs font-semibold text-[#e59b6b] mb-2 flex items-center gap-1.5">
                                  <AlertTriangle size={13} /> Lời giải có lỗi
                                </h3>
                                <ol className="m-0 p-0 list-none space-y-0.5">
                                  {question.bad.map((line, idx) => {
                                    const isError = idx === question.errorLine;
                                    return (
                                      <li
                                        key={idx}
                                        className={`grid grid-cols-[1.5rem_minmax(0,1fr)] items-baseline py-1 pl-2 pr-2 text-sm border-l-2 ${
                                          isError ? 'border-[#ce8c46] bg-[#ce8c46]/12 text-[#ffd5a8]' : 'border-transparent text-[#c8d4ce]'
                                        }`}
                                      >
                                        <span className="text-[11px] tabular-nums text-[#698078]">{idx + 1}</span>
                                        <span className="min-w-0 overflow-x-auto">
                                          <MathText value={line} />
                                          {isError && <span className="ml-2 text-[11px] font-medium text-[#ffbf78]">dòng lỗi</span>}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ol>
                              </div>
                              <div>
                                <h3 className="text-xs font-semibold text-[#6dc797] mb-2 flex items-center gap-1.5">
                                  <CheckCircle2 size={13} /> Lời giải đúng
                                </h3>
                                <ol className="m-0 p-0 list-none space-y-0.5">
                                  {question.correct.map((line, idx) => (
                                    <li key={idx} className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-baseline py-1 pl-2 pr-2 text-sm border-l-2 border-transparent text-[#c8d4ce]">
                                      <span className="text-[11px] tabular-nums text-[#698078]">{idx + 1}</span>
                                      <span className="min-w-0 overflow-x-auto"><MathText value={line} /></span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>

                            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs m-0 pt-3 border-t border-[#1f333c]">
                              <dt className="text-[#7d938b]">Yêu cầu sửa</dt>
                              <dd className="m-0 text-[#e8e4d8]">{question.repairLabel || repairLabel(question.kind)}</dd>
                              <dt className="text-[#7d938b]">Đáp án</dt>
                              <dd className="m-0 text-[#ffd78a] font-semibold">{String(question.answer)}</dd>
                              {question.options && question.options.length > 0 && (
                                <>
                                  <dt className="text-[#7d938b]">Phương án</dt>
                                  <dd className="m-0 text-[#c8d4ce]">{question.options.map(o => `${o.key}. ${o.value}`).join('   ')}</dd>
                                </>
                              )}
                              {question.hint && (
                                <>
                                  <dt className="text-[#7d938b]">Gợi ý</dt>
                                  <dd className="m-0 text-[#b5c7bc] italic">{question.hint}</dd>
                                </>
                              )}
                            </dl>

                            {question.auditStatus !== 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveQuestion(question)}
                                className="h-8 text-xs gap-1.5 border-[#295c47] bg-transparent text-[#7ed8a7] hover:bg-[#7ed8a7]/10 hover:text-[#7ed8a7]"
                              >
                                <CheckCircle2 size={13} /> Đánh dấu đã duyệt
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-xs text-[#8fa298]">
                <div className="flex items-center gap-4">
                  <span className="tabular-nums">{firstShown}–{lastShown} trong {totalItems} bài</span>
                  <label className="flex items-center gap-1.5">
                    <span className="sr-only">Số bài mỗi trang</span>
                    <select
                      value={pageSize}
                      onChange={e => setPageSize(Number(e.target.value))}
                      className="bg-[#09151a] border border-[#304750] rounded px-2 py-1 text-[#f1ecdf] focus:border-[#deb97b] focus:outline-none cursor-pointer"
                    >
                      <option value={20}>20 bài/trang</option>
                      <option value={50}>50 bài/trang</option>
                      <option value={100}>100 bài/trang</option>
                    </select>
                  </label>
                </div>

                {totalPages > 1 && (
                  <nav aria-label="Phân trang" className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={safePage === 1}
                      onClick={() => goToPage(safePage - 1)}
                      className="h-8 w-8 p-0 text-[#8fa298] hover:text-[#f1ecdf] disabled:opacity-30 hover:bg-[#1a2f38]"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    {pageNumbers.map((p, idx) =>
                      typeof p === 'number' ? (
                        <button
                          key={idx}
                          onClick={() => goToPage(p)}
                          aria-current={safePage === p ? 'page' : undefined}
                          className={`h-8 min-w-8 px-2 rounded text-xs tabular-nums transition-colors ${
                            safePage === p ? 'bg-[#ceac79] text-[#0c181e] font-semibold' : 'text-[#8fa298] hover:bg-[#1a2f38] hover:text-[#f1ecdf]'
                          }`}
                        >
                          {p}
                        </button>
                      ) : (
                        <span key={idx} className="px-1 text-[#4f6772]">…</span>
                      )
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={safePage === totalPages}
                      onClick={() => goToPage(safePage + 1)}
                      className="h-8 w-8 p-0 text-[#8fa298] hover:text-[#f1ecdf] disabled:opacity-30 hover:bg-[#1a2f38]"
                      aria-label="Trang sau"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </nav>
                )}
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 2: GÁN PHÒNG THEO VỤ ÁN ==================== */}
        {activeTab === 'case' && (
          <section className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] gap-6 items-start">
            {/* Danh sách vụ án: tìm kiếm + cuộn riêng, đủ cho hàng trăm vụ */}
            <aside className="lg:sticky lg:top-4 rounded-lg border border-[#22353e] bg-[#0f1f26] flex flex-col max-h-72 lg:max-h-[calc(100vh-2rem)]">
              <div className="p-3 border-b border-[#22353e] space-y-2">
                <label className="relative block">
                  <span className="sr-only">Tìm vụ án</span>
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6c827a] pointer-events-none" />
                  <input
                    type="search"
                    value={caseQuery}
                    onChange={e => setCaseQuery(e.target.value)}
                    placeholder="Tìm theo số hoặc tên vụ"
                    className="w-full h-9 pl-8 pr-2 rounded-md bg-[#09151a] border border-[#2b414a] text-xs text-[#f1ecdf] placeholder:text-[#5f756e] focus:border-[#deb97b] focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 text-[11px] text-[#8ca097] cursor-pointer select-none">
                  <input type="checkbox" checked={onlyChangedCases} onChange={e => setOnlyChangedCases(e.target.checked)} className="accent-[#ceac79]" />
                  Chỉ vụ đã đổi bài so với bộ gốc
                </label>
              </div>

              <ul role="listbox" aria-label="Vụ án" className="flex-1 overflow-y-auto m-0 p-1.5 list-none [scrollbar-width:thin] [scrollbar-color:#2f4650_transparent]">
                {visibleCases.length === 0 && (
                  <li className="px-3 py-6 text-center text-xs text-[#7d938b]">Không có vụ án nào khớp.</li>
                )}
                {visibleCases.map(c => {
                  const active = c.id === selectedCase.id;
                  return (
                    <li key={c.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => { setCaseId(c.id); setPickerRoom(null); }}
                        className={`w-full text-left grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-2 px-2.5 py-2 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-[#deb97b] ${
                          active ? 'bg-[#ceac79]/12 text-[#f2ebd9]' : 'text-[#b5c5bd] hover:bg-[#162b35]'
                        }`}
                      >
                        <span className={`text-xs tabular-nums ${active ? 'text-[#deb97b] font-semibold' : 'text-[#7d938b]'}`}>{c.number}</span>
                        <span className={`text-[13px] truncate ${active ? 'font-serif' : ''}`}>{c.title}</span>
                        {changedCaseIds.has(c.id)
                          ? <span className="size-1.5 rounded-full bg-[#e8b35c] self-center" title="Đã đổi bài so với bộ gốc" />
                          : <span />}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="px-3 py-2 border-t border-[#22353e] text-[11px] text-[#6c827a] tabular-nums">
                {visibleCases.length} / {CASES.length} vụ án
              </div>
            </aside>

            {/* Chi tiết vụ đang chọn */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[#22353e]">
                <div className="min-w-0">
                  <p className="text-xs text-[#deb97b] tabular-nums m-0">Vụ {selectedCase.number}</p>
                  <h2 className="font-serif text-xl text-[#f2ebd9] m-0 mt-0.5">{selectedCase.title}</h2>
                  <p className="text-xs text-[#8ca097] m-0 mt-1">
                    {selectedCase.rooms.length} phòng, học sinh đi theo thứ tự từ trên xuống.{' '}
                    {changedRoomCount > 0
                      ? <span className="text-[#e8b35c]">Đã đổi {changedRoomCount} bài so với bộ gốc.</span>
                      : 'Đang dùng bộ bài gốc.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={resetAssignments}
                  disabled={changedRoomCount === 0}
                  className="text-xs text-[#ceac79] border-[#3b5560] hover:bg-[#ceac79]/10 hover:text-[#deb97b] h-9 gap-1.5 bg-transparent disabled:opacity-40"
                >
                  <RotateCcw size={14} /> Đặt lại bộ bài gốc
                </Button>
              </div>

              <ol className="m-0 p-0 list-none divide-y divide-[#1c2f37]">
                {selectedCase.rooms.map((room, index) => {
                  const questionId = assignedQuestionIds[index];
                  const question = bank.find(q => q.id === questionId);
                  const clue = selectedCase.clues[index];
                  const isDefault = questionId === selectedCase.defaultQuestionIds[index];
                  const isPicking = pickerRoom === index;

                  return (
                    <li key={room.no} className="py-4">
                      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] md:grid-cols-[2.25rem_minmax(0,15rem)_minmax(0,1fr)_auto] gap-x-4 gap-y-3 items-start">
                        <span className={`row-span-2 md:row-span-1 font-serif text-2xl leading-none tabular-nums pt-0.5 ${room.final ? 'text-[#deb97b]' : 'text-[#4f6670]'}`}>
                          {room.no}
                        </span>

                        {/* Phòng */}
                        <div className="min-w-0">
                          <h3 className="font-serif text-[15px] text-[#f2ebd9] m-0 leading-snug">
                            {room.name}
                            {room.final && <span className="ml-2 font-sans text-[11px] text-[#deb97b] align-middle">Phòng quyết định</span>}
                          </h3>
                          <p className="text-xs text-[#7d938b] m-0 mt-0.5">{room.object}</p>
                          {clue?.text && (
                            <p className="text-xs text-[#a6bcb3] italic m-0 mt-2 line-clamp-2" title={clue.text}>
                              Mở khóa: &ldquo;{clue.text}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Bài đang gán */}
                        <div className="col-start-2 md:col-start-auto min-w-0">
                          {question ? (
                            <>
                              <p className="m-0 text-sm text-[#f2ebd9] truncate">
                                <span className="tabular-nums text-[#ceac79] font-semibold mr-2">#{question.id}</span>
                                {question.topic}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#8fa298]">
                                <span>Lớp {question.grade}</span>
                                <DifficultyMark value={question.difficulty} />
                                <span>Lỗi ở dòng {(question.errorLine ?? 1) + 1}</span>
                                {!isDefault && <span className="text-[#e8b35c]">Khác bộ gốc</span>}
                              </div>
                            </>
                          ) : (
                            <p className="m-0 text-sm text-[#ff9e8b]">Bài #{questionId} không còn trong kho. Hãy chọn bài khác.</p>
                          )}
                        </div>

                        <div className="col-start-2 md:col-start-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-expanded={isPicking}
                            onClick={() => { setPickerRoom(isPicking ? null : index); setPickerQuery(''); }}
                            className={`h-8 text-xs gap-1.5 bg-transparent ${isPicking ? 'border-[#ceac79] text-[#deb97b]' : 'border-[#3b5560] text-[#ceac79] hover:bg-[#ceac79]/10 hover:text-[#deb97b]'}`}
                          >
                            <Pencil size={13} /> {isPicking ? 'Đóng' : 'Đổi bài'}
                          </Button>
                        </div>
                      </div>

                      {/* Bộ chọn bài có tìm kiếm, mở ngay trong hàng */}
                      {isPicking && (
                        <div className="mt-3 md:ml-[calc(2.25rem+1rem)] rounded-lg border border-[#2b414a] bg-[#0b171d]">
                          <div className="p-2 border-b border-[#22353e]">
                            <label className="relative block">
                              <span className="sr-only">Tìm bài cho {room.name}</span>
                              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6c827a] pointer-events-none" />
                              <input
                                autoFocus
                                type="search"
                                value={pickerQuery}
                                onChange={e => setPickerQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Escape') setPickerRoom(null); }}
                                placeholder="Mã, chủ đề hoặc lớp, vd: chuyển vế lớp 7"
                                className="w-full h-9 pl-8 pr-2 rounded-md bg-[#09151a] border border-[#2b414a] text-xs text-[#f1ecdf] placeholder:text-[#5f756e] focus:border-[#deb97b] focus:outline-none"
                              />
                            </label>
                          </div>
                          <ul className="m-0 p-1 list-none max-h-72 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#2f4650_transparent]">
                            {pickerResults.length === 0 && (
                              <li className="px-3 py-5 text-center text-xs text-[#7d938b]">Không có bài nào khớp.</li>
                            )}
                            {pickerResults.map(q => {
                              const current = q.id === questionId;
                              const usage = usageById.get(q.id);
                              return (
                                <li key={q.id}>
                                  <button
                                    type="button"
                                    disabled={current}
                                    onClick={() => { assignQuestion(index, q.id); setPickerRoom(null); }}
                                    className={`w-full text-left grid grid-cols-[3rem_minmax(0,1fr)] sm:grid-cols-[3rem_minmax(0,1fr)_3.5rem_8rem] items-center gap-x-3 gap-y-0.5 px-2.5 py-2 rounded-md text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#deb97b] ${
                                      current ? 'bg-[#ceac79]/10 cursor-default' : 'hover:bg-[#162b35]'
                                    }`}
                                  >
                                    <span className="tabular-nums text-[#ceac79] font-semibold">#{q.id}</span>
                                    <span className="min-w-0">
                                      <span className="block text-[13px] text-[#f2ebd9] truncate">{q.topic}</span>
                                      <span className="block text-[11px] text-[#6c827a] truncate">
                                        {current ? 'Đang gán cho phòng này' : usage ? `Đang dùng ở ${describeUsage(usage)}` : 'Chưa dùng ở vụ nào'}
                                      </span>
                                    </span>
                                    <span className="hidden sm:block text-[#b5c5bd]">Lớp {q.grade}</span>
                                    <span className="hidden sm:block"><DifficultyMark value={q.difficulty} /></span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          {pickerTotal > pickerResults.length && (
                            <p className="m-0 px-3 py-2 border-t border-[#22353e] text-[11px] text-[#6c827a]">
                              Đang hiện {pickerResults.length} / {pickerTotal} bài. Gõ thêm để thu hẹp.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        )}

        {/* ==================== TAB 3: TRUNG TÂM NHẬP ĐỀ (IMPORT CENTER) ==================== */}
        {activeTab === 'import' && (
          <section className="space-y-5">
            {/* Chuyển đổi phương thức nhập JSON / LaTeX */}
            <div className="flex items-center gap-2 p-1.5 bg-[#0e1d24] border border-[#263c45] rounded-xl max-w-md shadow-inner">
              <button
                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                  importMode === 'json'
                    ? 'bg-[#ceac79] text-[#0f2026] shadow-sm'
                    : 'text-[#8ca298] hover:text-[#f0ece1]'
                }`}
                onClick={() => setImportMode('json')}
              >
                <FileDown size={15} className="inline mr-1.5" /> Nhập từ JSON (Khuyên dùng)
              </button>
              <button
                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                  importMode === 'latex'
                    ? 'bg-[#ceac79] text-[#0f2026] shadow-sm'
                    : 'text-[#8ca298] hover:text-[#f0ece1]'
                }`}
                onClick={() => setImportMode('latex')}
              >
                <FileText size={15} className="inline mr-1.5" /> Nhập từ mã LaTeX
              </button>
            </div>

            {/* --- PHÂN HỆ 1: NHẬP BẰNG JSON --- */}
            {importMode === 'json' && (
              <div className="space-y-5">
                {/* Banner Tải File mẫu JSON */}
                <div className="bg-gradient-to-r from-[#292215] via-[#1b2b30] to-[#122228] border border-[#7c6239] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-md">
                  <div>
                    <strong className="text-sm font-bold text-[#ffd78a] block mb-0.5">
                      Chưa có cấu trúc đề chuẩn?
                    </strong>
                    <span className="text-xs text-[#a0b3aa]">
                      Tải file mẫu JSON chuẩn hoặc sao chép nhanh cấu trúc JSON để điền bài tập.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                      onClick={downloadJsonTemplate}
                      className="bg-[#ceac79] text-[#122227] hover:bg-[#deb97b] font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
                    >
                      <Download size={15} /> Tải JSON Template (.json)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={copyTemplateJson}
                      className="border-[#516b77] text-[#e0ebe6] text-xs h-9 px-3.5 gap-1.5 bg-[#15272e] hover:bg-[#1a313b]"
                    >
                      {isCopiedTemplate ? <Check size={14} className="text-[#54c48a]" /> : <Copy size={14} />}
                      {isCopiedTemplate ? 'Đã sao chép' : 'Sao chép mẫu'}
                    </Button>
                  </div>
                </div>

                {/* Dropzone kéo thả file */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#ceac79] bg-[#142831]'
                      : 'border-[#304750] bg-[#0c181e] hover:border-[#ceac79] hover:bg-[#102028]'
                  }`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDropFile}
                  onClick={() => document.getElementById('json-file-input')?.click()}
                >
                  <Upload size={36} className="mx-auto text-[#ceac79] mb-3" />
                  <p className="text-sm font-semibold text-[#f1ecdf] mb-1">
                    Kéo & thả tệp tin <code className="text-[#ffd78a] bg-[#ffd78a]/10 px-1.5 py-0.5 rounded">.json</code> vào đây, hoặc bấm để duyệt file
                  </p>
                  <p className="text-xs text-[#7d938b]">
                    Hệ thống tự động kiểm tra định dạng và trích xuất danh sách câu hỏi.
                  </p>
                  <input
                    id="json-file-input"
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                  />
                </div>

                {/* Textarea dán trực tiếp JSON */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#9eb0ab] font-medium">
                      Hoặc dán trực tiếp mã JSON vào đây:
                    </label>
                    {jsonText && (
                      <button
                        onClick={() => { setJsonText(''); setJsonParsedQuestions([]); setJsonErrors([]); }}
                        className="text-xs text-[#8ca298] hover:text-[#e58a74] transition-colors"
                      >
                        Xóa nội dung
                      </button>
                    )}
                  </div>
                  <textarea
                    value={jsonText}
                    onChange={e => setJsonText(e.target.value)}
                    placeholder='[\n  {\n    "id": 101,\n    "grade": 7,\n    "topic": "Số hữu tỉ",\n    "bad": ["..."],\n    "correct": ["..."]\n  }\n]'
                    className="w-full min-h-[220px] p-3.5 bg-[#09151a] border border-[#2b414a] focus:border-[#deb97b] focus:outline-none rounded-xl font-mono text-xs text-[#eee6d7] leading-relaxed resize-y shadow-inner"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleValidateJson(jsonText)}
                      className="bg-[#243c45] text-[#deb97b] border border-[#4d6670] hover:bg-[#304d57] text-xs h-9 px-4 shadow-sm"
                    >
                      <ScanSearch size={15} className="mr-1.5" /> Kiểm tra cú pháp JSON
                    </Button>
                  </div>
                </div>

                {/* Hiển thị lỗi hoặc cảnh báo nếu có */}
                {jsonErrors.length > 0 && (
                  <div className="p-4 bg-[#381c1c] border border-[#803d3d] rounded-xl text-xs text-[#ffb0a3] space-y-1.5 shadow-md">
                    <div className="font-bold flex items-center gap-1.5 text-sm"><AlertTriangle size={16} /> Phát hiện lỗi cấu trúc JSON:</div>
                    {jsonErrors.map((err, i) => <div key={i} className="pl-5">• {err}</div>)}
                  </div>
                )}

                {jsonWarnings.length > 0 && (
                  <div className="p-4 bg-[#332a18] border border-[#6b562b] rounded-xl text-xs text-[#ffd991] space-y-1.5 shadow-md">
                    <div className="font-bold flex items-center gap-1.5 text-sm"><AlertTriangle size={16} /> Cảnh báo dữ liệu:</div>
                    {jsonWarnings.map((warn, i) => <div key={i} className="pl-5">• {warn}</div>)}
                  </div>
                )}

                {/* BẢNG PREVIEW CÂU HỎI HỢP LỆ TRƯỚC KHI LƯU */}
                {jsonParsedQuestions.length > 0 && (
                  <div className="p-5 bg-[#102228] border border-[#2b414a] rounded-xl space-y-3.5 shadow-md">
                    <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#21353e]">
                      <div>
                        <strong className="text-sm text-[#7ed8a7] block">
                          ✓ Đã nhận diện {jsonParsedQuestions.length} câu hỏi hợp lệ
                        </strong>
                        <span className="text-xs text-[#8ca298]">Kiểm tra danh sách trước khi thêm vào kho bài tập:</span>
                      </div>
                      <Button
                        onClick={handleSaveJsonQuestions}
                        className="bg-[#ceac79] text-[#122227] hover:bg-[#deb97b] font-bold text-xs h-9 px-5 gap-1.5 shadow-md"
                      >
                        <CheckCircle2 size={16} /> Xác nhận lưu {jsonParsedQuestions.length} câu vào kho
                      </Button>
                    </div>

                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {jsonParsedQuestions.map((q, idx) => (
                        <div key={idx} className="p-3 bg-[#0a161b] border border-[#1f333c] rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-[#ffd78a]">#{q.id} · {q.topic}</strong>
                            <span className="text-[11px] text-[#93a69e] bg-[#16272e] px-2 py-0.5 rounded border border-[#253942]">
                              Lớp {q.grade} · {q.difficulty || 'Mặc định'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#869c92]">
                            Dòng lỗi: {q.bad[q.errorLine ?? 1]} → Đáp án: <strong className="text-[#ceac79]">{String(q.answer)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- PHÂN HỆ 2: NHẬP BẰNG LATEX --- */}
            {importMode === 'latex' && (
              <div className="space-y-4">
                <form onSubmit={analyseLatex} className="p-5 bg-[#12232b] border border-[#263c45] rounded-xl space-y-3 shadow-md">
                  <label className="space-y-1.5 block">
                    <span className="text-xs font-bold text-[#deb97b] block">Dán mã LaTeX theo cấu trúc 1–7:</span>
                    <textarea
                      value={latex}
                      onChange={e => { setLatex(e.target.value); setParsed([]); setMessage(''); }}
                      placeholder={'\\subsection*{Câu 1}\n\n\\noindent\\textbf{1. Mạch kiến thức:} ...\n\\noindent\\textbf{2. Độ khó:} *\n...'}
                      className="w-full min-h-[220px] p-3.5 bg-[#09151a] border border-[#2b414a] focus:border-[#deb97b] focus:outline-none rounded-xl font-mono text-xs text-[#eee6d7] leading-relaxed resize-y shadow-inner"
                    />
                  </label>
                  <div className="flex items-center gap-2 text-xs text-[#8ca097] bg-[#0a161b] p-2.5 rounded-lg border border-[#1f333c]">
                    <Sparkles size={14} className="text-[#ceac79] shrink-0" />
                    <span>Hệ thống tự động nhận diện dạng chọn dấu, chọn phép tính, nhập giá trị và viết lại lời giải.</span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button type="submit" className="bg-[#ceac79] text-[#122227] hover:bg-[#deb97b] font-bold text-xs h-9 px-4">
                      <ScanSearch size={16} className="mr-1.5" /> Phân tích tự động
                    </Button>
                  </div>
                </form>

                {/* Kết quả phân tích LaTeX */}
                {parsed.length > 0 && (
                  <div className="p-5 bg-[#102228] border border-[#2b414a] rounded-xl space-y-3.5 shadow-md">
                    <div className="flex items-center justify-between pb-3 border-b border-[#21353e]">
                      <div>
                        <span className="text-[10px] text-[#8ca097] font-bold tracking-wider uppercase block">KẾT QUẢ PHÂN TÍCH LATEX</span>
                        <h3 className="text-sm font-serif text-[#f2e9d7] font-bold m-0">{parsed.length} câu đã được nhận diện</h3>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded font-semibold border flex items-center gap-1.5 ${
                        warningCount
                          ? 'bg-[#3b2d18] text-[#ffd082] border-[#74552b]'
                          : 'bg-[#153428] text-[#78d6a8] border-[#295c47]'
                      }`}>
                        {warningCount ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                        {warningCount ? `${warningCount} mục cần kiểm tra` : 'Đủ trường dữ liệu'}
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {parsed.map((item, index) => (
                        <article key={item.question.id} className="p-3 bg-[#0a161b] border border-[#1f333c] rounded-lg text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#ffd78a]">
                              Câu nguồn {item.sourceNumber} → Bài #{item.question.id}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-[#253239] text-[#9fb1a9] rounded border border-[#3b4e57]">
                              Cần duyệt
                            </span>
                          </div>
                          <h4 className="font-medium text-[#f1ecdf] m-0">{item.question.topic}</h4>
                          <div className="flex flex-wrap gap-3 text-[11px] text-[#8ca298] pt-1">
                            <span>Độ khó: <b className="text-[#ceac79]">{item.question.difficulty || 'Mặc định'}</b></span>
                            <span>Lỗi: <b>Dòng {(item.question.errorLine ?? 0) + 1}</b></span>
                            <span>Token sai: <b>{item.wrongToken ? <MathText value={item.wrongToken} /> : '?'}</b></span>
                            <span>Cách sửa: <b>{item.interaction}</b></span>
                          </div>
                          {parsed.length === selectedCase.rooms.length && (
                            <small className="block mt-1 text-[#deb97b] font-medium">
                              Tự gán vào Phòng {selectedCase.rooms[index].no} · {roomNames[index]}
                            </small>
                          )}
                        </article>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-[#9eb0ab]">
                      <label className="flex items-center gap-2">
                        Vụ án:
                        <select
                          value={selectedCase.id}
                          onChange={e => { setCaseId(e.target.value); setLatexTargetRoom('0'); }}
                          className="bg-[#09151a] border border-[#304750] text-[#f1ecdf] p-1.5 rounded-lg text-xs"
                        >
                          {CASES.map(c => (
                            <option value={c.id} key={c.id}>Vụ {c.number} · {c.title}</option>
                          ))}
                        </select>
                      </label>
                    {parsed.length !== selectedCase.rooms.length && (
                      <label className="flex items-center gap-2">
                        Phòng:
                        <select
                          value={latexTargetRoom}
                          onChange={e => setLatexTargetRoom(e.target.value)}
                          className="bg-[#09151a] border border-[#304750] text-[#f1ecdf] p-1.5 rounded-lg text-xs"
                        >
                          {roomNames.map((name, index) => (
                            <option value={index} key={name}>
                              Phòng {selectedCase.rooms[index].no} · {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    </div>

                    <div className="flex justify-end pt-3 border-t border-[#21353e]">
                      <Button onClick={saveParsedLatex} className="bg-[#ceac79] text-[#122227] hover:bg-[#deb97b] font-bold text-xs h-9 px-4">
                        <CheckCircle2 size={16} className="mr-1.5" />
                        {parsed.length === selectedCase.rooms.length
                          ? `Lưu và gán vào ${selectedCase.rooms.length} phòng`
                          : 'Lưu và gán vào phòng'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ==================== MODAL CHỈNH SỬA CÂU HỎI ==================== */}
      <Dialog open={editingId !== null} onOpenChange={open => { if (!open) { setEditingId(null); setDraft(null); setEditMessage(''); } }}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[750px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[#0f2026] text-[#e8e4d8] border border-[#2b414a] rounded-xl shadow-2xl">
          <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-[#233b47] shrink-0 text-left">
            <span className="text-[10px] text-[#ceac79] font-bold tracking-widest uppercase block">
              CHỈNH SỬA BÀI #{editingQuestion?.id}
            </span>
            <DialogTitle className="font-serif text-lg text-[#f2ebd9]">Cập nhật nội dung câu hỏi</DialogTitle>
            <DialogDescription className="text-xs text-[#8ca097]">
              Sửa nhanh thông tin ở trên; mở rộng chi tiết Toán và cách thức tương tác của học sinh bên dưới.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-xs text-[#9eb0ab] space-y-1 block md:col-span-1">
                  <span className="block font-medium">Mạch kiến thức</span>
                  <input
                    value={draft.topic}
                    onChange={event => setDraft({ ...draft, topic: event.target.value })}
                    className="w-full bg-[#09151a] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf]"
                  />
                </label>
                <label className="text-xs text-[#9eb0ab] space-y-1 block">
                  <span className="block font-medium">Lớp</span>
                  <select
                    value={draft.grade}
                    onChange={event => setDraft({ ...draft, grade: event.target.value })}
                    className="w-full bg-[#09151a] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf]"
                  >
                    {[6, 7, 8, 9].map(grade => (
                      <option value={grade} key={grade}>Lớp {grade}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-[#9eb0ab] space-y-1 block">
                  <span className="block font-medium">Mức độ</span>
                  <select
                    value={draft.difficulty}
                    onChange={event => setDraft({ ...draft, difficulty: event.target.value as QuestionDraft['difficulty'] })}
                    className="w-full bg-[#09151a] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf]"
                  >
                    <option value="">Chưa gắn mức</option>
                    <option value="Dễ">* · Dễ</option>
                    <option value="Trung bình">** · Trung bình</option>
                    <option value="Khó">*** · Khó</option>
                  </select>
                </label>
              </div>

              {/* Phần thiết lập Cách sửa & Đáp án */}
              <div className="space-y-3.5 border border-[#23353e] bg-[#09151a] rounded-xl p-4">
                {/* 1. Ô CÁCH SỬA / CÂU LỆNH TÙY Ý */}
                <label className="text-xs text-[#9eb0ab] space-y-1 block">
                  <span className="font-semibold text-[#deb97b]">Câu lệnh sửa / Yêu cầu sửa</span>
                  <span className="text-[11px] text-[#6d847c] block">
                    Tự do nhập câu lệnh hiển thị cho học sinh (Ví dụ: &quot;Chọn phép biến đổi đúng&quot;, &quot;Thay dấu đã chọn bằng dấu đúng&quot;, &quot;Nhập giá trị x đúng&quot;...)
                  </span>
                  <input
                    value={draft.repairLabel}
                    onChange={event => setDraft({ ...draft, repairLabel: event.target.value })}
                    placeholder="Nhập câu lệnh hướng dẫn học sinh sửa lỗi..."
                    className="w-full bg-[#0e1d24] border border-[#304750] focus:border-[#deb97b] rounded-lg p-2 text-xs text-[#f1ecdf]"
                  />
                </label>

                {/* 2. Ô ĐÁP ÁN: 2 OPTION TRẮC NGHIỆM VÀ TỰ LUẬN */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-semibold text-[#deb97b] uppercase tracking-wider">
                      Hình thức đáp án
                    </span>
                    <div className="flex items-center gap-1 bg-[#061014] p-1 rounded-lg border border-[#23353e]">
                      <button
                        type="button"
                        onClick={() => setDraft({
                          ...draft,
                          answerType: 'choice',
                          kind: 'choice',
                          answer: ['A', 'B', 'C', 'D'].includes(draft.answer.toUpperCase()) ? draft.answer.toUpperCase() : 'A'
                        })}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          draft.answerType === 'choice'
                            ? 'bg-[#ceac79] text-[#122227] font-bold shadow-sm'
                            : 'text-[#8fa49a] hover:text-[#f1ecdf]'
                        }`}
                      >
                        Trắc nghiệm (4 phương án A, B, C, D)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft({
                          ...draft,
                          answerType: 'free_text',
                          kind: draft.kind === 'choice' ? 'value' : draft.kind
                        })}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          draft.answerType === 'free_text'
                            ? 'bg-[#ceac79] text-[#122227] font-bold shadow-sm'
                            : 'text-[#8fa49a] hover:text-[#f1ecdf]'
                        }`}
                      >
                        Tự luận (Nhập đáp án tự do)
                      </button>
                    </div>
                  </div>

                  {draft.answerType === 'choice' ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] text-[#8fa49a] m-0">
                        Nhập nội dung các phương án và bấm vào chữ cái tròn để chọn phương án làm <strong>Đáp án đúng</strong>:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          { key: 'A', field: 'optionA' as const },
                          { key: 'B', field: 'optionB' as const },
                          { key: 'C', field: 'optionC' as const },
                          { key: 'D', field: 'optionD' as const },
                        ].map(({ key, field }) => {
                          const isSelected = draft.answer.toUpperCase() === key;
                          return (
                            <div
                              key={key}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                                isSelected
                                  ? 'border-[#ceac79] bg-[#142931]'
                                  : 'border-[#263c45] bg-[#0e1d24]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setDraft({ ...draft, answer: key })}
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-[#ceac79] text-[#122227]'
                                    : 'bg-[#1b2f38] text-[#8fa49a] hover:text-[#f1ecdf]'
                                }`}
                                title={`Bấm để chọn ${key} là đáp án đúng`}
                              >
                                {key}
                              </button>
                              <input
                                value={draft[field]}
                                onChange={e => setDraft({ ...draft, [field]: e.target.value })}
                                placeholder={`Nhập nội dung phương án ${key}...`}
                                className="w-full bg-transparent border-0 focus:outline-none text-xs text-[#f1ecdf] p-0"
                              />
                              {isSelected && (
                                <span className="text-[10px] uppercase font-bold text-[#ceac79] bg-[#ceac79]/20 px-1.5 py-0.5 rounded shrink-0">
                                  Đúng
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="text-xs text-[#9eb0ab] space-y-1 block">
                        <span>Đáp án đúng (số, phân số, biểu thức hoặc dấu)</span>
                        <input
                          value={draft.answer}
                          onChange={event => setDraft({ ...draft, answer: event.target.value })}
                          placeholder="Ví dụ: 3, -19/14, 2x+1, -..."
                          className="w-full bg-[#0e1d24] border border-[#304750] focus:border-[#deb97b] rounded-lg p-2 text-xs text-[#f1ecdf]"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Phần mở rộng chi tiết Toán */}
              <details className="border border-[#23353e] bg-[#0a161b] rounded-lg p-3">
                <summary className="text-xs font-semibold text-[#ceac79] cursor-pointer">
                  Mở rộng: Sửa nội dung Toán và dòng lỗi
                </summary>
                <div className="space-y-3 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-[#9eb0ab] space-y-1 block">
                      <span>Dòng bắt đầu sai (1-indexed)</span>
                      <input
                        type="number"
                        min="1"
                        value={draft.errorLine}
                        onChange={event => setDraft({ ...draft, errorLine: event.target.value })}
                        className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf]"
                      />
                    </label>
                    <label className="text-xs text-[#9eb0ab] space-y-1 block">
                      <span>Token sai</span>
                      <input
                        value={draft.wrongToken}
                        onChange={event => setDraft({ ...draft, wrongToken: event.target.value })}
                        className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf]"
                      />
                    </label>
                  </div>

                  <label className="text-xs text-[#9eb0ab] space-y-1 block">
                    <span>Lời giải có lỗi <small className="text-[#6d847c]">(Mỗi dòng trên một hàng)</small></span>
                    <textarea
                      value={draft.bad}
                      onChange={event => setDraft({ ...draft, bad: event.target.value })}
                      className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf] min-h-[70px]"
                    />
                  </label>
                  <label className="text-xs text-[#9eb0ab] space-y-1 block">
                    <span>Lời giải đúng <small className="text-[#6d847c]">(Mỗi dòng trên một hàng)</small></span>
                    <textarea
                      value={draft.correct}
                      onChange={event => setDraft({ ...draft, correct: event.target.value })}
                      className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf] min-h-[70px]"
                    />
                  </label>
                  <label className="text-xs text-[#9eb0ab] space-y-1 block">
                    <span>Gợi ý</span>
                    <textarea
                      value={draft.hint}
                      onChange={event => setDraft({ ...draft, hint: event.target.value })}
                      className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf] min-h-[50px]"
                    />
                  </label>
                  <label className="text-xs text-[#9eb0ab] space-y-1 block">
                    <span>Giải thích lỗi</span>
                    <textarea
                      value={draft.explanation}
                      onChange={event => setDraft({ ...draft, explanation: event.target.value })}
                      className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf] min-h-[50px]"
                    />
                  </label>
                </div>
              </details>
            </div>
          )}

          {draft && (
            <div className="p-4 sm:px-6 border-t border-[#233b47] bg-[#0c181e] flex items-center justify-between shrink-0">
              {editMessage ? (
                <p className="text-xs text-[#ff9c8c] bg-[#3a1d1d] border border-[#7a3b3b] px-3 py-1.5 rounded-lg flex items-center gap-1.5 m-0 max-w-[65%]">
                  <AlertTriangle size={14} className="shrink-0" /> <span className="truncate">{editMessage}</span>
                </p>
              ) : <div />}
              <div className="flex justify-end gap-2.5">
                <Button
                  variant="ghost"
                  onClick={() => { setEditingId(null); setDraft(null); }}
                  className="text-xs text-[#8ca097] hover:bg-[#16272e]"
                >
                  Hủy
                </Button>
                <Button
                  onClick={saveEdit}
                  className="bg-[#ceac79] hover:bg-[#deb97b] text-[#122227] font-bold text-xs h-9 px-4 gap-1.5 shadow-md"
                >
                  <CheckCircle2 size={16} /> Lưu thay đổi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== CONFIRM DELETE MODAL ==================== */}
      <AlertDialog open={pendingDeleteId !== null} onOpenChange={open => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent className="bg-[#0f2026] text-[#e8e4d8] border border-[#2b414a] rounded-xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg text-[#f2ebd9]">
              Xóa Bài #{pendingDeleteId}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#8ca097]">
              Bài sẽ bị xóa khỏi kho trên máy này và trên Cloud. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-[#16272e] border-[#304750] text-[#8ca097] hover:bg-[#1a3038] text-xs">
              Giữ lại
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#a84d3b] hover:bg-[#bd5844] text-white text-xs font-bold"
            >
              Xóa khỏi kho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
