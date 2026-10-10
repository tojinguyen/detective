"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import katex from 'katex';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  CopyPlus,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileDown,
  FileText,
  FolderOpen,
  Link2,
  Pencil,
  Plus,
  RotateCcw,
  ScanSearch,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app-header';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  DEFAULT_LOCAL_CONTENT,
  QUESTION_BANK,
  allQuestions,
  questionIdsForCase,
  readLocalContent,
  writeLocalContent,
  type LocalContent,
  type Question,
  type QuestionKind,
} from '@/lib/content';
import { CASE_01 } from '@/lib/cases';
import { parseLatexQuestionBank, tokeniseMath, type ParsedQuestion } from '@/lib/latex-question-parser';
import { downloadJsonTemplate, parseQuestionsFromJson, QUESTION_TEMPLATE_JSON } from '@/lib/json-template';

const ROOM_NAMES = CASE_01.rooms.map(room => room.name);
const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Dễ', label: 'Dễ' },
  { value: 'Trung bình', label: 'Trung bình' },
  { value: 'Khó', label: 'Khó' },
  { value: 'unset', label: 'Chưa gắn mức' },
  { value: 'hidden', label: 'Đã ẩn' },
] as const;
type BankFilter = typeof FILTERS[number]['value'];

type QuestionDraft = {
  grade: string;
  topic: string;
  difficulty: '' | 'Dễ' | 'Trung bình' | 'Khó';
  errorLine: string;
  wrongToken: string;
  kind: QuestionKind;
  answer: string;
  options: string;
  bad: string;
  correct: string;
  hint: string;
  explanation: string;
};

function draftFrom(question: Question): QuestionDraft {
  return {
    grade: String(question.grade),
    topic: question.topic,
    difficulty: question.difficulty === 'Dễ' || question.difficulty === 'Trung bình' || question.difficulty === 'Khó' ? question.difficulty : '',
    errorLine: String((question.errorLine ?? 1) + 1),
    wrongToken: question.segments[question.target] ?? '',
    kind: question.kind,
    answer: String(question.answer),
    options: question.options?.map(option => option.key + '. ' + option.value).join('\n') ?? '',
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

function parseOptionLines(value: string) {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const match = line.match(/^([A-Z])\s*[.):-]\s*(.+)$/i);
    return match ? { key: match[1].toUpperCase(), value: match[2].trim() } : null;
  }).filter((option): option is { key: string; value: string } => option !== null);
}

function MathText({ value }: { value: string }) {
  return <span className="math parsed-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' }) }} />;
}

export default function QuestionBankPage() {
  const { isAdmin, loading } = useAuth();
  const [content, setContent] = useState<LocalContent>(DEFAULT_LOCAL_CONTENT);
  const [activeTab, setActiveTab] = useState<'bank' | 'case' | 'import'>('bank');
  const [importMode, setImportMode] = useState<'json' | 'latex'>('json');

  // Search & Filter state for Tab 1
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [filter, setFilter] = useState<BankFilter>('all');

  // LaTeX state
  const [latex, setLatex] = useState('');
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [latexTargetRoom, setLatexTargetRoom] = useState('0');

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

  const completeBank = useMemo(() => allQuestions(content, true), [content]);
  const bank = useMemo(() => completeBank.filter(question => !content.hiddenQuestionIds.includes(question.id)), [completeBank, content.hiddenQuestionIds]);
  const maxQuestionId = useMemo(() => Math.max(0, ...completeBank.map(q => q.id)), [completeBank]);

  // Lọc danh sách câu hỏi Tab 1
  const visibleQuestions = useMemo(() => {
    let list = completeBank;
    if (filter === 'hidden') list = completeBank.filter(q => content.hiddenQuestionIds.includes(q.id));
    else if (filter === 'unset') list = bank.filter(q => !q.difficulty);
    else if (filter !== 'all') list = bank.filter(q => q.difficulty === filter);
    else list = bank;

    if (selectedGrade !== 'all') {
      list = list.filter(q => q.grade === selectedGrade);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        item.id.toString().includes(q) || 
        item.topic.toLowerCase().includes(q) ||
        item.bad.some(line => line.toLowerCase().includes(q))
      );
    }

    return list;
  }, [bank, completeBank, content.hiddenQuestionIds, filter, selectedGrade, searchQuery]);

  const assignedQuestionIds = questionIdsForCase(content, CASE_01);
  const editingQuestion = editingId === null ? null : completeBank.find(question => question.id === editingId) ?? null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setContent(readLocalContent()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function persist(next: LocalContent, feedback: string) {
    setContent(next);
    writeLocalContent(next);
    setMessage(feedback);
  }

  function storeQuestion(question: Question, feedback: string) {
    const isCustom = content.customQuestions.some(item => item.id === question.id);
    const next = isCustom
      ? { ...content, customQuestions: content.customQuestions.map(item => item.id === question.id ? question : item) }
      : { ...content, questionOverrides: [...content.questionOverrides.filter(item => item.id !== question.id), question] };
    persist(next, feedback);
  }

  function setDifficulty(question: Question, difficulty: string) {
    const value = difficulty === 'Dễ' || difficulty === 'Trung bình' || difficulty === 'Khó' ? difficulty : null;
    storeQuestion({ ...question, difficulty: value, givenLine: value === 'Dễ' ? (question.errorLine ?? 1) + 1 : null }, 'Đã cập nhật mức độ cho Bài ' + question.id + '.');
  }

  function openEditor(question: Question) {
    setEditingId(question.id);
    setDraft(draftFrom(question));
    setEditMessage('');
  }

  function openCreateNew() {
    const newId = maxQuestionId + 1;
    const newQuestion: Question = {
      id: newId,
      grade: 7,
      topic: 'Bài tập mới #' + newId,
      difficulty: 'Dễ',
      errorLine: 1,
      givenLine: 2,
      segments: ['2x', '=', '6'],
      target: 2,
      kind: 'value',
      answer: '3',
      intro: 'Tìm và sửa bước sai trong lời giải sau:',
      bad: ['2x = 6', 'x = 2'],
      correct: ['2x = 6', 'x = 3'],
      hint: 'Thực hiện chia hai vế cho 2',
      explanation: '6 chia 2 bằng 3',
      repairLabel: repairLabel('value'),
      auditStatus: 'draft',
      sourceLatex: '',
    };
    persist(
      { ...content, customQuestions: [...content.customQuestions, newQuestion] },
      'Đã tạo bản nháp Bài #' + newId + '. Bạn có thể chỉnh sửa nội dung bên dưới.',
    );
    setEditingId(newId);
    setDraft(draftFrom(newQuestion));
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
    const options = draft.kind === 'choice' ? parseOptionLines(draft.options) : editingQuestion.options;
    const answer = draft.kind === 'choice' ? draft.answer.trim().toUpperCase() : draft.answer.trim();
    if (draft.kind === 'choice' && (!options || options.length < 2)) {
      setEditMessage('Câu chọn phép biến đổi cần ít nhất hai phương án, mỗi dòng theo mẫu “A. biểu thức”.'); return;
    }
    if (draft.kind === 'choice' && !options?.some(option => option.key === answer)) {
      setEditMessage('Đáp án cần là ký hiệu của một phương án đang có, ví dụ A, B, C hoặc D.'); return;
    }
    const mathChanged = draft.errorLine !== String((editingQuestion.errorLine ?? 1) + 1)
      || draft.wrongToken !== (editingQuestion.segments[editingQuestion.target] ?? '')
      || draft.kind !== editingQuestion.kind
      || answer !== String(editingQuestion.answer)
      || draft.options !== (editingQuestion.options?.map(option => option.key + '. ' + option.value).join('\n') ?? '')
      || draft.bad !== editingQuestion.bad.join('\n')
      || draft.correct !== editingQuestion.correct.join('\n')
      || draft.hint !== editingQuestion.hint
      || draft.explanation !== editingQuestion.explanation;

    const updated: Question = {
      ...editingQuestion,
      grade: Number(draft.grade),
      topic: draft.topic.trim(),
      difficulty: draft.difficulty || null,
      errorLine,
      givenLine: draft.difficulty === 'Dễ' ? requestedLine : null,
      segments,
      target,
      kind: draft.kind,
      answer: mathChanged ? answer : editingQuestion.answer,
      options,
      bad,
      correct: correct.length ? correct : editingQuestion.correct,
      hint: draft.hint.trim(),
      explanation: draft.explanation.trim(),
      repairLabel: repairLabel(draft.kind),
      auditStatus: mathChanged ? 'needs_review' : editingQuestion.auditStatus,
      sourceLatex: mathChanged ? '' : editingQuestion.sourceLatex,
    };
    storeQuestion(updated, 'Đã lưu thay đổi cho Bài ' + updated.id + (mathChanged ? ' và chuyển về trạng thái Cần duyệt.' : '.'));
    setEditingId(null); setDraft(null); setEditMessage('');
  }

  function duplicateQuestion(question: Question) {
    const id = maxQuestionId + 1;
    const duplicate: Question = { ...question, id, topic: question.topic + ' · Bản sao', auditStatus: 'draft', sourceLatex: '' };
    persist({ ...content, customQuestions: [...content.customQuestions, duplicate] }, 'Đã tạo Bài ' + id + ' từ Bài ' + question.id + '.');
    setFilter('all');
  }

  function approveQuestion(question: Question) {
    storeQuestion({ ...question, auditStatus: 'approved' }, 'Đã đánh dấu Bài ' + question.id + ' là Đã duyệt.');
  }

  function removeOrHide(question: Question) {
    if (assignedQuestionIds.includes(question.id)) {
      setMessage('Bài ' + question.id + ' đang được dùng trong Vụ ' + CASE_01.number + '. Hãy đổi bài ở phòng đó trước khi xóa hoặc ẩn.'); return;
    }
    if (content.customQuestions.some(item => item.id === question.id)) {
      setPendingDeleteId(question.id);
      return;
    }
    persist({ ...content, hiddenQuestionIds: [...new Set([...content.hiddenQuestionIds, question.id])] }, 'Đã ẩn Bài ' + question.id + '. Có thể khôi phục trong bộ lọc Đã ẩn.');
  }

  function restoreQuestion(question: Question) {
    persist({ ...content, hiddenQuestionIds: content.hiddenQuestionIds.filter(id => id !== question.id) }, 'Đã khôi phục Bài ' + question.id + '.');
  }

  function confirmDelete() {
    if (pendingDeleteId === null) return;
    persist({ ...content, customQuestions: content.customQuestions.filter(item => item.id !== pendingDeleteId), questionOverrides: content.questionOverrides.filter(item => item.id !== pendingDeleteId) }, 'Đã xóa Bài ' + pendingDeleteId + ' khỏi kho.');
    setPendingDeleteId(null);
  }

  function assignQuestion(roomIndex: number, questionId: number) {
    const ids = [...assignedQuestionIds];
    ids[roomIndex] = questionId;
    persist({ ...content, caseQuestionIds: { ...content.caseQuestionIds, [CASE_01.id]: ids } }, 'Đã gán Bài ' + questionId + ' vào ' + ROOM_NAMES[roomIndex] + '.');
  }

  function resetAssignments() {
    const defaultIds = new Set<number>(CASE_01.defaultQuestionIds);
    persist({
      ...content,
      caseQuestionIds: { ...content.caseQuestionIds, [CASE_01.id]: [...CASE_01.defaultQuestionIds] },
      hiddenQuestionIds: content.hiddenQuestionIds.filter(id => !defaultIds.has(id)),
    }, 'Vụ ' + CASE_01.number + ' đã trở về bộ bài gốc.');
  }

  function exportContent() {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'erase-kho-bai-tap.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Đã xuất dữ liệu Kho bài tập.');
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

  async function handleSaveJsonQuestions() {
    if (jsonParsedQuestions.length === 0) return;
    try {
      // 1. Lưu vào LocalStorage
      const nextCustom = [...content.customQuestions, ...jsonParsedQuestions];
      persist(
        { ...content, customQuestions: nextCustom },
        `Đã nhập thành công ${jsonParsedQuestions.length} câu hỏi vào kho trên thiết bị.`
      );

      // 2. Thử đồng bộ lên Supabase nếu có
      try {
        const { error } = await supabase.from('questions').upsert(jsonParsedQuestions);
        if (!error) {
          setMessage(`Đã lưu ${jsonParsedQuestions.length} câu hỏi vào thiết bị và đồng bộ Supabase.`);
        }
      } catch (err) {
        console.warn('Supabase sync skipped/error:', err);
      }

      setJsonParsedQuestions([]);
      setJsonText('');
      setActiveTab('bank');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu';
      setJsonErrors([msg]);
    }
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
    if (newQuestions.length === CASE_01.rooms.length) newQuestions.forEach((question, index) => { nextIds[index] = question.id; });
    else nextIds[Number(latexTargetRoom)] = newQuestions[0].id;
    persist(
      { ...content, customQuestions: [...content.customQuestions, ...newQuestions], caseQuestionIds: { ...content.caseQuestionIds, [CASE_01.id]: nextIds } },
      newQuestions.length === CASE_01.rooms.length
        ? 'Đã thêm ' + newQuestions.length + ' bài dưới trạng thái Cần duyệt và gán lần lượt vào các phòng.'
        : 'Đã thêm Bài ' + newQuestions[0].id + ' và gán vào ' + ROOM_NAMES[Number(latexTargetRoom)] + '.',
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

  return (
    <main className="min-h-screen bg-[#0d1a20] text-[#e8e4d8] font-sans">
      {/* ==================== GLOBAL TOPBAR ==================== */}
      <AppHeader currentView="question-bank" />

      {/* ==================== HERO STATS & ACTIONS ==================== */}
      <section className="py-4 px-6 border-b border-[#22353e] bg-[#0f2128]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1440px] mx-auto w-full">
          <div>
            <span className="flex items-center gap-1.5 text-xs text-[#ceac79] font-bold tracking-wider mb-1">
              <Sparkles size={14} /> HỆ THỐNG BIÊN SOẠN TOÁN TRINH THÁM
            </span>
            <h1 className="text-xl md:text-2xl font-serif text-[#f2ebd9] m-0">Quản trị nội dung & Đề bài</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-4 py-2 bg-[#14262e] border border-[#2b414a] rounded-lg text-center min-w-[90px] shadow-sm">
              <b className="block text-lg font-bold text-[#ffd78a]">{completeBank.length}</b>
              <small className="text-[11px] text-[#8fa298] font-medium">Tổng số bài</small>
            </div>
            <div className="px-4 py-2 bg-[#14262e] border border-[#2b414a] rounded-lg text-center min-w-[90px] shadow-sm">
              <b className="block text-lg font-bold text-[#54c48a]">{CASE_01.rooms.length}/{CASE_01.rooms.length}</b>
              <small className="text-[11px] text-[#8fa298] font-medium">Phòng đã gán</small>
            </div>
            <div className="px-4 py-2 bg-[#14262e] border border-[#2b414a] rounded-lg text-center min-w-[90px] shadow-sm">
              <b className="block text-lg font-bold text-[#ceac79]">{content.customQuestions.length}</b>
              <small className="text-[11px] text-[#8fa298] font-medium">Bài tự tạo</small>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Button
                onClick={openCreateNew}
                className="bg-[#243d46] hover:bg-[#2d4d58] text-[#e2edf0] border border-[#3b5a66] text-xs h-9 px-3 gap-1.5 font-medium rounded-lg shadow-sm"
              >
                <Plus size={15} /> Thêm bài mới
              </Button>
              <Button
                onClick={exportContent}
                title="Tải toàn bộ kho bài về máy dưới dạng JSON"
                className="bg-[#ceac79] hover:bg-[#deb97b] text-[#0f2026] text-xs h-9 px-3 gap-1.5 font-bold rounded-lg shadow-sm"
              >
                <Download size={15} /> Xuất JSON
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Thông báo thao tác */}
      {message && (
        <div className="bg-[#17332c] border-b border-[#2d5c4e] px-6 py-2.5 text-xs text-[#b8ebd8] flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#54c48a]" /> {message}</span>
          <button onClick={() => setMessage('')} className="text-[#8fa8a2] hover:text-white px-1">✕</button>
        </div>
      )}

      {/* ==================== 3 TAB ĐIỀU HƯỚNG CHÍNH ==================== */}
      <nav className="bg-[#0a151b] border-b border-[#22353e] px-6">
        <div className="max-w-[1440px] mx-auto flex items-center gap-2 overflow-x-auto">
          <button
            className={`flex items-center gap-2.5 px-5 py-3.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bank'
                ? 'border-[#deb97b] text-[#deb97b] bg-[#deb97b]/10'
                : 'border-transparent text-[#8ca097] hover:text-[#eee4d3] hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('bank')}
          >
            <FolderOpen size={16} /> 1. Kho câu hỏi & Bài tập ({visibleQuestions.length})
          </button>
          <button
            className={`flex items-center gap-2.5 px-5 py-3.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'case'
                ? 'border-[#deb97b] text-[#deb97b] bg-[#deb97b]/10'
                : 'border-transparent text-[#8ca097] hover:text-[#eee4d3] hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('case')}
          >
            <Link2 size={16} /> 2. Phân phối phòng Vụ án {CASE_01.number}
          </button>
          <button
            className={`flex items-center gap-2.5 px-5 py-3.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'import'
                ? 'border-[#deb97b] text-[#deb97b] bg-[#deb97b]/10'
                : 'border-transparent text-[#8ca097] hover:text-[#eee4d3] hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('import')}
          >
            <Upload size={16} /> 3. Trung tâm nhập đề (JSON / LaTeX)
          </button>
        </div>
      </nav>

      {/* ==================== WORKSPACE BODY ==================== */}
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        {/* ==================== TAB 1: KHO CÂU HỎI (QUESTION BANK) ==================== */}
        {activeTab === 'bank' && (
          <section className="space-y-5">
            {/* Toolbar lọc & tìm kiếm */}
            <div className="bg-[#12232b] border border-[#263c45] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4 flex-wrap flex-1">
                {/* Search */}
                <div className="relative min-w-[260px] flex-1 max-w-sm">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#687e77]" />
                  <input
                    type="text"
                    placeholder="Tìm theo chủ đề, ID, công thức..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0a161b] border border-[#304750] focus:border-[#deb97b] focus:outline-none rounded-lg pl-10 pr-9 py-2 text-xs md:text-sm text-[#f1ecdf] placeholder-[#627770]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#718780] hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Grade */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-[#8ca097] mr-1">Lớp:</span>
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      selectedGrade === 'all'
                        ? 'bg-[#ceac79] text-[#0f2026] border-[#deb97b] shadow-sm'
                        : 'bg-[#162932] text-[#93a69e] border-[#31464f] hover:text-white hover:border-[#455f6b]'
                    }`}
                    onClick={() => setSelectedGrade('all')}
                  >
                    Tất cả
                  </button>
                  {[6, 7, 8, 9].map(grade => (
                    <button
                      key={grade}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                        selectedGrade === grade
                          ? 'bg-[#ceac79] text-[#0f2026] border-[#deb97b] shadow-sm'
                          : 'bg-[#162932] text-[#93a69e] border-[#31464f] hover:text-white hover:border-[#455f6b]'
                      }`}
                      onClick={() => setSelectedGrade(grade)}
                    >
                      Lớp {grade}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Difficulty */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-[#8ca097] mr-1">Mức độ:</span>
                {FILTERS.map(item => (
                  <button
                    key={item.value}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      filter === item.value
                        ? 'bg-[#ceac79] text-[#0f2026] border-[#deb97b] shadow-sm'
                        : 'bg-[#162932] text-[#93a69e] border-[#31464f] hover:text-[#f0ece1] hover:border-[#455f6b]'
                    }`}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                    {item.value === 'unset' && ` (${bank.filter(q => !q.difficulty).length})`}
                    {item.value === 'hidden' && ` (${content.hiddenQuestionIds.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách câu hỏi */}
            {visibleQuestions.length === 0 ? (
              <div className="p-16 text-center border-2 border-dashed border-[#2b414a] rounded-xl bg-[#102128]">
                <ScanSearch size={36} className="mx-auto text-[#5f756e] mb-3" />
                <p className="text-sm font-medium text-[#a0b2aa]">Không tìm thấy bài tập nào phù hợp với bộ lọc hiện tại.</p>
                <Button
                  variant="ghost"
                  className="mt-3 text-xs text-[#ceac79] hover:bg-[#ceac79]/10"
                  onClick={() => { setSearchQuery(''); setSelectedGrade('all'); setFilter('all'); }}
                >
                  Xóa toàn bộ bộ lọc
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleQuestions.map(question => {
                  const isCustom = content.customQuestions.some(item => item.id === question.id);
                  const isHidden = content.hiddenQuestionIds.includes(question.id);
                  const isAssigned = assignedQuestionIds.includes(question.id);
                  const assignedRoomIdx = assignedQuestionIds.indexOf(question.id);

                  return (
                    <article
                      key={question.id}
                      className="bg-[#12232b] border border-[#263c45] hover:border-[#deb97b]/50 rounded-xl p-5 shadow-lg transition-all space-y-4"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#1f333c]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-1 bg-[#09151a] border border-[#deb97b]/40 rounded font-mono font-bold text-xs text-[#deb97b] shadow-inner">
                            BÀI #{question.id}
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded bg-[#1c313a] border border-[#2f4853] text-[#a5bbb1] font-semibold">
                            Lớp {question.grade}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded font-semibold border ${
                            question.auditStatus === 'approved'
                              ? 'bg-[#153428] text-[#78d6a8] border-[#295c47]'
                              : question.auditStatus === 'needs_review'
                              ? 'bg-[#3b2d18] text-[#ffd082] border-[#74552b]'
                              : 'bg-[#212f36] text-[#9fb1a9] border-[#384a53]'
                          }`}>
                            {question.auditStatus === 'approved' ? '✓ Đã duyệt' : question.auditStatus === 'needs_review' ? '⚠ Cần duyệt' : 'Bản nháp'}
                          </span>
                          {isAssigned && (
                            <span className="text-xs px-2.5 py-1 rounded bg-[#41341c] text-[#ffd98a] border border-[#836430] font-semibold flex items-center gap-1">
                              ★ Đang dùng ở {ROOM_NAMES[assignedRoomIdx]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-[#8fa298]">
                            <span>Mức độ:</span>
                            <select
                              value={question.difficulty ?? ''}
                              onChange={e => setDifficulty(question, e.target.value)}
                              className="bg-[#09151a] border border-[#304750] text-xs rounded-lg px-2.5 py-1 text-[#f1ecdf] focus:border-[#deb97b] focus:outline-none"
                            >
                              <option value="">Chưa gắn mức</option>
                              <option value="Dễ">* · Dễ (Khoanh dòng lỗi)</option>
                              <option value="Trung bình">** · Trung bình</option>
                              <option value="Khó">*** · Khó</option>
                            </select>
                          </label>
                        </div>
                      </div>

                      {/* Topic Title */}
                      <h3 className="font-serif text-base text-[#f2ebd9] font-bold tracking-wide m-0">
                        {question.topic}
                      </h3>

                      {/* Khối hiển thị công thức lời giải lỗi & lời giải đúng */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cột 1: Lời giải có lỗi */}
                        <div className="bg-[#0a161b] border border-[#1f333c] rounded-xl p-3.5 space-y-2">
                          <span className="text-[10px] uppercase font-bold text-[#e59b6b] tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1f333c]">
                            <AlertTriangle size={13} /> Lời giải có lỗi (Đang trình bày):
                          </span>
                          <div className="space-y-1.5 pt-1">
                            {question.bad.map((line, idx) => (
                              <div
                                key={idx}
                                className={`text-xs md:text-sm leading-relaxed px-2.5 py-1 rounded transition-colors ${
                                  idx === question.errorLine
                                    ? 'bg-[#ce8c46]/20 border-l-4 border-[#ce8c46] text-[#ffd5a8]'
                                    : 'text-[#c8d4ce]'
                                }`}
                              >
                                <span className="font-mono text-[11px] text-[#698078] mr-2">[{idx + 1}]</span>
                                <MathText value={line} />
                                {idx === question.errorLine && (
                                  <span className="text-[10px] text-[#ffbf78] ml-2 font-bold uppercase tracking-wider">
                                    ← Bước có lỗi
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Cột 2: Lời giải sửa đúng */}
                        <div className="bg-[#0a161b] border border-[#1f333c] rounded-xl p-3.5 space-y-2">
                          <span className="text-[10px] uppercase font-bold text-[#6dc797] tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1f333c]">
                            <CheckCircle2 size={13} /> Lời giải sửa chính xác:
                          </span>
                          <div className="space-y-1.5 pt-1">
                            {question.correct.map((line, idx) => (
                              <div key={idx} className="text-xs md:text-sm leading-relaxed px-2.5 py-1 text-[#c8d4ce]">
                                <span className="font-mono text-[11px] text-[#698078] mr-2">[{idx + 1}]</span>
                                <MathText value={line} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Chi tiết tương tác & đáp án */}
                      <div className="flex flex-wrap items-center gap-3 text-xs bg-[#0a161b] p-3 rounded-lg border border-[#1f333c] text-[#9fb0a7]">
                        <span>Hình thức sửa: <strong className="text-[#f1ecdf]">{repairLabel(question.kind)}</strong></span>
                        <span>•</span>
                        <span>Đáp án đúng: <strong className="text-[#ffd78a] font-mono bg-[#ffd78a]/10 px-2 py-0.5 rounded border border-[#ffd78a]/30">{String(question.answer)}</strong></span>
                        {question.options && question.options.length > 0 && (
                          <>
                            <span>•</span>
                            <span>Các lựa chọn: {question.options.map(o => `${o.key}. ${o.value}`).join(' | ')}</span>
                          </>
                        )}
                        {question.hint && (
                          <>
                            <span>•</span>
                            <span className="text-[#b5c7bc]">Gợi ý: <em>{question.hint}</em></span>
                          </>
                        )}
                      </div>

                      {/* Các nút thao tác */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1f333c] flex-wrap">
                        <span className="text-[11px] text-[#6c827a] font-medium">
                          {isCustom ? '📌 Bài tự biên soạn trên máy' : '🏛️ Bài mẫu chuẩn hệ thống'}
                        </span>
                        <div className="flex items-center gap-2">
                          {isHidden ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreQuestion(question)}
                              className="text-xs text-[#7ed8a7] hover:bg-[#7ed8a7]/10 h-8 gap-1.5"
                            >
                              <Eye size={14} /> Khôi phục bài
                            </Button>
                          ) : (
                            <>
                              {question.auditStatus !== 'approved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => approveQuestion(question)}
                                  className="text-xs text-[#7ed8a7] hover:bg-[#7ed8a7]/10 h-8 gap-1.5"
                                >
                                  <CheckCircle2 size={14} /> Xác nhận đã duyệt
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditor(question)}
                                className="text-xs text-[#ceac79] hover:bg-[#ceac79]/10 h-8 gap-1.5"
                              >
                                <Pencil size={14} /> Chỉnh sửa
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateQuestion(question)}
                                className="text-xs text-[#9eb2aa] hover:bg-white/5 h-8 gap-1.5"
                              >
                                <CopyPlus size={14} /> Nhân bản
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOrHide(question)}
                                className={`text-xs h-8 gap-1.5 ${
                                  isCustom
                                    ? 'text-[#e58a74] hover:bg-[#e58a74]/10'
                                    : 'text-[#859791] hover:bg-white/5'
                                }`}
                              >
                                {isCustom ? <Trash2 size={14} /> : <EyeOff size={14} />}
                                {isCustom ? 'Xóa' : 'Ẩn'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 2: PHÂN PHỐI PHÒNG VỤ ÁN ==================== */}
        {activeTab === 'case' && (
          <section className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4 bg-[#12232b] p-5 rounded-xl border border-[#263c45] shadow-md">
              <div>
                <span className="text-xs text-[#ceac79] font-bold tracking-widest uppercase block mb-1">
                  CẤU HÌNH VỤ ÁN #{CASE_01.number}
                </span>
                <h2 className="text-lg md:text-xl font-serif text-[#f2e9d7] m-0">
                  Phân bổ câu hỏi vào {CASE_01.rooms.length} phòng điều tra
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={resetAssignments}
                className="text-xs text-[#ceac79] border-[#4a636e] hover:bg-[#ceac79]/10 h-9 gap-1.5 bg-[#0f1f26]"
              >
                <RotateCcw size={14} /> Đặt lại bộ bài mặc định
              </Button>
            </div>

            {/* Grid 5 phòng */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {CASE_01.rooms.map((room, index) => {
                const currentQuestionId = assignedQuestionIds[index];
                const currentQuestion = bank.find(q => q.id === currentQuestionId) || completeBank.find(q => q.id === currentQuestionId);
                const clue = CASE_01.clues[index];

                return (
                  <div
                    key={room.no}
                    className={`rounded-xl p-5 border flex flex-col justify-between shadow-lg transition-all ${
                      room.final
                        ? 'bg-gradient-to-b from-[#1b2b30] to-[#111e24] border-[#b89354]'
                        : 'bg-[#12232b] border-[#263c45]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider border ${
                          room.final
                            ? 'bg-[#413624] text-[#ffd991] border-[#846a3d]'
                            : 'bg-[#1a3038] text-[#b3c8bf] border-[#314a54]'
                        }`}>
                          PHÒNG {room.no}
                        </span>
                        <span className="text-xs font-bold text-[#ceac79]">
                          {room.final ? 'M5 (Quyết định)' : `Manh mối M${index + 1}`}
                        </span>
                      </div>
                      <h3 className="font-serif text-base text-[#f0e7d5] font-bold mb-1">{room.name}</h3>
                      <p className="text-xs text-[#8ca097] mb-3">{room.object}</p>

                      {/* Manh mối mở ra */}
                      <div className="p-3 bg-[#0a161b] border border-[#1f333c] rounded-lg text-xs text-[#b8c9c0] mb-4">
                        <span className="text-[10px] text-[#deb97b] font-semibold block mb-0.5 uppercase tracking-wider">
                          Dữ kiện mở khóa:
                        </span>
                        <em className="text-[#d8e3dc]">"{clue?.text}"</em>
                      </div>

                      {/* Chọn bài gán */}
                      <label className="block mb-2">
                        <span className="text-xs text-[#9eb0ab] font-medium block mb-1">
                          Chọn bài tập gán cho phòng:
                        </span>
                        <select
                          value={currentQuestionId}
                          onChange={e => assignQuestion(index, Number(e.target.value))}
                          className="w-full bg-[#09151a] border border-[#3b515a] focus:border-[#deb97b] focus:outline-none text-[#f2ebe0] text-xs rounded-lg p-2.5 shadow-sm"
                        >
                          {bank.map(q => (
                            <option key={q.id} value={q.id}>
                              Bài #{q.id} · Lớp {q.grade} - {q.topic.slice(0, 30)}...
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Preview nội dung bài hiện tại */}
                    {currentQuestion && (
                      <div className="p-3 bg-[#0a161b] border border-[#21353e] rounded-lg text-xs mt-3">
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <strong className="text-[#ffd78a]">Bài #{currentQuestion.id}</strong>
                          <span className="text-[#8ba298]">{currentQuestion.difficulty || 'Chưa gắn mức'}</span>
                        </div>
                        <p className="text-xs text-[#a4b5ad] line-clamp-1 mb-1 font-medium">{currentQuestion.topic}</p>
                        <div className="text-[11px] text-[#7fa392] border-t border-[#1f333c] pt-1.5 mt-1 font-mono">
                          Lỗi: Dòng {currentQuestion.errorLine ? currentQuestion.errorLine + 1 : 2}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                          {parsed.length === CASE_01.rooms.length && (
                            <small className="block mt-1 text-[#deb97b] font-medium">
                              Tự gán vào Phòng {CASE_01.rooms[index].no} · {ROOM_NAMES[index]}
                            </small>
                          )}
                        </article>
                      ))}
                    </div>

                    {parsed.length !== CASE_01.rooms.length && (
                      <label className="text-xs text-[#9eb0ab] flex items-center gap-2 pt-2">
                        Gán câu này vào:
                        <select
                          value={latexTargetRoom}
                          onChange={e => setLatexTargetRoom(e.target.value)}
                          className="bg-[#09151a] border border-[#304750] text-[#f1ecdf] p-1.5 rounded-lg text-xs"
                        >
                          {ROOM_NAMES.map((name, index) => (
                            <option value={index} key={name}>
                              Phòng {CASE_01.rooms[index].no} · {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <div className="flex justify-end pt-3 border-t border-[#21353e]">
                      <Button onClick={saveParsedLatex} className="bg-[#ceac79] text-[#122227] hover:bg-[#deb97b] font-bold text-xs h-9 px-4">
                        <CheckCircle2 size={16} className="mr-1.5" />
                        {parsed.length === CASE_01.rooms.length
                          ? `Lưu và gán vào ${CASE_01.rooms.length} phòng`
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
        <DialogContent className="max-w-2xl bg-[#0f2026] text-[#e8e4d8] border border-[#2b414a] rounded-xl p-6 shadow-2xl">
          <DialogHeader>
            <span className="text-[10px] text-[#ceac79] font-bold tracking-widest uppercase block">
              CHỈNH SỬA BÀI #{editingQuestion?.id}
            </span>
            <DialogTitle className="font-serif text-lg text-[#f2ebd9]">Cập nhật nội dung câu hỏi</DialogTitle>
            <DialogDescription className="text-xs text-[#8ca097]">
              Sửa nhanh thông tin ở trên; chỉ mở phần nâng cao khi cần thay đổi nội dung Toán hoặc logic chấm.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4 pt-2">
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

              <details className="border border-[#23353e] bg-[#0a161b] rounded-lg p-3">
                <summary className="text-xs font-semibold text-[#ceac79] cursor-pointer">
                  Mở rộng: Sửa nội dung Toán và logic chấm
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

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-[#9eb0ab] space-y-1 block">
                      <span>Cách sửa</span>
                      <select
                        value={draft.kind}
                        onChange={event => setDraft({ ...draft, kind: event.target.value as QuestionKind })}
                        className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf]"
                      >
                        <option value="symbol">Chọn dấu</option>
                        <option value="choice">Chọn phép biến đổi</option>
                        <option value="value">Nhập giá trị</option>
                        <option value="expression">Viết lại bước biến đổi</option>
                      </select>
                    </label>
                    <label className="text-xs text-[#9eb0ab] space-y-1 block">
                      <span>Đáp án đúng</span>
                      <input
                        value={draft.answer}
                        onChange={event => setDraft({ ...draft, answer: event.target.value })}
                        className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf]"
                      />
                    </label>
                  </div>

                  {draft.kind === 'choice' && (
                    <label className="text-xs text-[#9eb0ab] space-y-1 block">
                      <span>Các phương án <small className="text-[#6d847c]">(Mỗi dòng theo mẫu: A. biểu thức)</small></span>
                      <textarea
                        value={draft.options}
                        onChange={event => setDraft({ ...draft, options: event.target.value })}
                        className="w-full bg-[#0e1d24] border border-[#304750] rounded-lg p-2 text-xs text-[#f1ecdf] min-h-[70px]"
                      />
                    </label>
                  )}

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

              {editMessage && (
                <p className="text-xs text-[#ff9c8c] bg-[#3a1d1d] border border-[#7a3b3b] p-2.5 rounded-lg flex items-center gap-1.5">
                  <AlertTriangle size={15} /> {editMessage}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => { setEditingId(null); setDraft(null); }}
                  className="text-xs text-[#8ca097]"
                >
                  Hủy
                </Button>
                <Button
                  onClick={saveEdit}
                  className="bg-[#ceac79] hover:bg-[#deb97b] text-[#122227] font-bold text-xs h-9 px-4 gap-1.5"
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
              Bài tự tạo sẽ bị xóa vĩnh viễn khỏi kho câu hỏi trên thiết bị này. Thao tác này không ảnh hưởng đến các bài mẫu gốc.
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
