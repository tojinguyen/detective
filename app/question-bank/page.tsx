"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import katex from 'katex';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, CopyPlus, Download, Eye, EyeOff, FileCheck2, Link2, Pencil, RotateCcw, ScanSearch, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [content, setContent] = useState<LocalContent>(DEFAULT_LOCAL_CONTENT);
  const [latex, setLatex] = useState('');
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [room, setRoom] = useState('0');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<BankFilter>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const completeBank = useMemo(() => allQuestions(content, true), [content]);
  const bank = useMemo(() => completeBank.filter(question => !content.hiddenQuestionIds.includes(question.id)), [completeBank, content.hiddenQuestionIds]);
  const visibleQuestions = useMemo(() => {
    if (filter === 'hidden') return completeBank.filter(question => content.hiddenQuestionIds.includes(question.id));
    if (filter === 'unset') return bank.filter(question => !question.difficulty);
    if (filter === 'all') return bank;
    return bank.filter(question => question.difficulty === filter);
  }, [bank, completeBank, content.hiddenQuestionIds, filter]);
  const assignedQuestionIds = questionIdsForCase(content, CASE_01);
  const editingQuestion = editingId === null ? null : completeBank.find(question => question.id === editingId) ?? null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setContent(readLocalContent()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function persist(next: LocalContent, feedback: string) {
    setContent(next); writeLocalContent(next); setMessage(feedback);
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
    setEditingId(question.id); setDraft(draftFrom(question)); setEditMessage('');
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
    const id = Math.max(0, ...completeBank.map(item => item.id)) + 1;
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
    const ids = [...assignedQuestionIds]; ids[roomIndex] = questionId;
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

  function analyse(event: FormEvent) {
    event.preventDefault();
    if (!latex.trim()) { setMessage('Hãy dán ít nhất một khối câu hỏi LaTeX.'); return; }
    const firstId = Math.max(0, ...completeBank.map(question => question.id)) + 1;
    const result = parseLatexQuestionBank(latex, firstId);
    setParsed(result);
    setMessage(result.length ? 'Đã đọc được ' + result.length + ' câu. Kiểm tra thẻ phân tích trước khi lưu.' : 'Chưa đọc được câu hỏi theo cấu trúc 1–7.');
  }

  function saveParsed() {
    if (!parsed.length) return;
    const newQuestions = parsed.map(item => item.question);
    const nextIds = [...assignedQuestionIds];
    if (newQuestions.length === CASE_01.rooms.length) newQuestions.forEach((question, index) => { nextIds[index] = question.id; });
    else nextIds[Number(room)] = newQuestions[0].id;
    persist(
      { ...content, customQuestions: [...content.customQuestions, ...newQuestions], caseQuestionIds: { ...content.caseQuestionIds, [CASE_01.id]: nextIds } },
      newQuestions.length === CASE_01.rooms.length
        ? 'Đã thêm ' + newQuestions.length + ' bài dưới trạng thái Cần duyệt và gán lần lượt vào các phòng.'
        : 'Đã thêm Bài ' + newQuestions[0].id + ' và gán vào ' + ROOM_NAMES[Number(room)] + '.',
    );
    setParsed([]); setLatex('');
  }

  function exportContent() {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'erase-kho-bai-tap.json'; link.click(); URL.revokeObjectURL(url);
    setMessage('Đã xuất dữ liệu Kho bài tập.');
  }

  const warningCount = parsed.reduce((sum, item) => sum + item.warnings.length, 0);

  return (
    <main className="content-studio">
      <header className="studio-topbar"><Link href="/" className="studio-back"><ArrowLeft size={18} />Trở về Vụ {CASE_01.number}</Link><div><small>E·RASE · KHU VỰC BIÊN TẬP</small><strong>Kho bài tập</strong></div><Button className="studio-export" onClick={exportContent}><Download size={16} />Xuất JSON</Button></header>

      <section className="studio-intro latex-studio-intro"><div><span className="studio-kicker"><Sparkles size={15} /> NHẬP TRỰC TIẾP TỪ KHO LATEX</span><h1>Dán một lần, tạo cả bộ câu hỏi.</h1><p>Giữ nguyên cấu trúc kho đề. Hệ thống tự phân biệt chọn dấu, chọn phép biến đổi, nhập giá trị và viết lại bước tính.</p></div><div className="studio-stats"><span><b>{bank.length}</b><small>Bài trong kho</small></span><span><b>{assignedQuestionIds.length}/{CASE_01.rooms.length}</b><small>Phòng đã gán</small></span><span><b>{content.customQuestions.length}</b><small>Bài đã nhập</small></span></div></section>

      <div className="studio-grid latex-studio-grid">
        <section className="studio-panel latex-import-panel">
          <div className="studio-panel-heading"><div><span>MỘT CÂU HOẶC NGUYÊN CỤM NĂM CÂU</span><h2>Nhập đề bằng LaTeX</h2></div><ScanSearch size={23} /></div>
          <form onSubmit={analyse} className="latex-import-form">
            <label><span>Dán nguyên khối bắt đầu từ <code>\subsection*&#123;Câu ...&#125;</code></span><textarea value={latex} onChange={event => { setLatex(event.target.value); setParsed([]); setMessage(''); }} placeholder={'\\subsection*{Câu 1}\n\n\\noindent\\textbf{1. Mạch kiến thức:} ...\n\\noindent\\textbf{2. Độ khó:} *\n...'} /></label>
            <div className="import-guidance"><Sparkles size={14} /><span>Không cần đổi cách viết các phương án. Nếu muốn chốt chính xác vị trí, có thể thêm <code>\textbf&#123;Dòng bắt đầu sai:&#125; 2</code>.</span></div>
            <div className="import-actions"><small>Hệ thống đọc cả công thức dạng <code>$...$</code> và <code>\[...\]</code>.</small><Button type="submit" className="studio-save"><ScanSearch size={17} />Phân tích tự động</Button></div>
          </form>

          {parsed.length > 0 && <div className="parsed-results">
            <div className="parsed-heading"><div><span>KẾT QUẢ PHÂN TÍCH</span><h3>{parsed.length} câu đã được nhận diện</h3></div><span className={warningCount ? 'has-warning' : 'clear'}>{warningCount ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}{warningCount ? warningCount + ' mục cần kiểm tra' : 'Đủ trường dữ liệu'}</span></div>
            <div className="parsed-card-list">{parsed.map((item, index) => <article key={item.question.id}>
              <div className="parsed-card-top"><span><b>Câu nguồn {item.sourceNumber}</b><small>→ Bài {item.question.id}</small></span><em>Cần duyệt</em></div>
              <h4>{item.question.topic}</h4>
              <div className="parsed-facts"><span><small>ĐỘ KHÓ</small><b>{item.question.difficulty}</b></span><span><small>LỖI ĐẦU TIÊN</small><b>Dòng {(item.question.errorLine ?? 0) + 1}</b></span><span><small> TOKEN SAI</small><b>{item.wrongToken ? <MathText value={item.wrongToken} /> : '?'}</b></span><span><small>CÁCH SỬA</small><b>{item.interaction}</b></span></div>
              {item.question.kind === 'choice' ? <div className="parsed-answer"><span>Đáp án đúng <b>{item.answerKey || '?'}</b></span>{item.correctedToken && <MathText value={item.correctedToken} />}</div> : <div className="parsed-answer"><span>Sửa</span><MathText value={item.wrongToken || '?'} /><span>thành</span><MathText value={item.correctedToken || '?'} /></div>}
              {item.question.options?.length ? <div className="parsed-option-list">{item.question.options.map(option => <span className={option.key === item.answerKey ? 'is-answer' : ''} key={option.key}><b>{option.key}</b><MathText value={option.value} /></span>)}</div> : null}
              {item.warnings.map(warning => <div className="parser-warning" key={warning}><AlertTriangle size={14} />{warning}</div>)}
              {parsed.length === CASE_01.rooms.length && <small className="auto-room">Tự gán vào Phòng {CASE_01.rooms[index].no} · {ROOM_NAMES[index]}</small>}
            </article>)}</div>
            {parsed.length !== CASE_01.rooms.length && <label className="single-room-select">Gán câu này vào<select value={room} onChange={event => setRoom(event.target.value)}>{ROOM_NAMES.map((name, index) => <option value={index} key={name}>Phòng {CASE_01.rooms[index].no} · {name}</option>)}</select></label>}
            <div className="parsed-save-row"><p><FileCheck2 size={15} />Tất cả câu nhập từ file được giữ ở trạng thái <b>Cần duyệt</b> trước khi dùng chính thức.</p><Button onClick={saveParsed} className="studio-save"><CheckCircle2 size={17} />{parsed.length === CASE_01.rooms.length ? 'Lưu và gán vào ' + CASE_01.rooms.length + ' phòng' : 'Lưu và gán vào phòng'}</Button></div>
          </div>}
          {message && <p className="studio-message parser-message" role="status">{message}</p>}
        </section>

        <section className="studio-panel assignment-panel compact-assignment-panel">
          <div className="studio-panel-heading"><div><span>VỤ ÁN {CASE_01.number}</span><h2>{CASE_01.rooms.length} phòng đang dùng bài nào?</h2></div><Button variant="ghost" onClick={resetAssignments}><RotateCcw size={15} />Bài gốc</Button></div>
          <p className="studio-note"><Link2 size={15} />Có thể đổi nhanh một bài mà không cần nhập lại nội dung.</p>
          <div className="room-assignment-list">{ROOM_NAMES.map((name, index) => <label key={name}><span><b>{CASE_01.rooms[index].no}</b><span><strong>{name}</strong><small>{CASE_01.rooms[index].final ? 'Manh mối quyết định M' + (index + 1) : 'Manh mối M' + (index + 1)}</small></span></span><select value={assignedQuestionIds[index]} onChange={event => assignQuestion(index, Number(event.target.value))}>{bank.map(question => <option value={question.id} key={question.id}>Bài {question.id} · Lớp {question.grade}</option>)}</select></label>)}</div>
          <div className="bank-heading"><h3>Danh sách đề</h3><small>{QUESTION_BANK.length} bài gốc · {content.customQuestions.length} bài đã nhập</small></div>
          <div className="bank-filter-bar" role="group" aria-label="Lọc bài theo mức độ">{FILTERS.map(item => <button className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)} key={item.value}>{item.label}{item.value === 'unset' && <b>{bank.filter(question => !question.difficulty).length}</b>}{item.value === 'hidden' && <b>{content.hiddenQuestionIds.length}</b>}</button>)}</div>
          <div className="bank-list compact-bank-list managed-bank-list">{visibleQuestions.map(question => {
            const isCustom = content.customQuestions.some(item => item.id === question.id);
            const isHidden = content.hiddenQuestionIds.includes(question.id);
            return <article className="managed-bank-card" key={question.id}>
              <span className={'audit-badge ' + question.auditStatus}>{question.auditStatus === 'approved' ? <CheckCircle2 size={13} /> : <FileCheck2 size={13} />}{question.auditStatus === 'approved' ? 'Đã duyệt' : question.auditStatus === 'needs_review' ? 'Cần duyệt' : 'Bản nháp'}</span>
              <b>Bài {question.id}</b><strong>{question.topic}</strong><small>Lớp {question.grade} · {isCustom ? 'Bài giáo viên' : 'Bài gốc'}</small>
              <label className="card-difficulty"><span>Mức độ</span><select value={question.difficulty ?? ''} onChange={event => setDifficulty(question, event.target.value)}><option value="">Chưa gắn mức</option><option value="Dễ">* · Dễ</option><option value="Trung bình">** · Trung bình</option><option value="Khó">***–**** · Khó</option></select></label>
              <div className="bank-card-actions">{isHidden ? <Button variant="ghost" onClick={() => restoreQuestion(question)}><Eye size={14} />Khôi phục</Button> : <>{question.auditStatus !== 'approved' && <Button variant="ghost" onClick={() => approveQuestion(question)}><CheckCircle2 size={14} />Đã kiểm tra</Button>}<Button variant="ghost" onClick={() => openEditor(question)}><Pencil size={14} />Chỉnh sửa</Button><Button variant="ghost" onClick={() => duplicateQuestion(question)}><CopyPlus size={14} />Nhân bản</Button><Button variant="ghost" className={isCustom ? 'delete-action' : ''} onClick={() => removeOrHide(question)}>{isCustom ? <Trash2 size={14} /> : <EyeOff size={14} />}{isCustom ? 'Xóa' : 'Ẩn'}</Button></>}</div>
            </article>;
          })}{visibleQuestions.length === 0 && <div className="bank-empty"><ScanSearch size={20} /><span>Không có bài nào trong nhóm này.</span></div>}</div>
        </section>
      </div>

      <Dialog open={editingId !== null} onOpenChange={open => { if (!open) { setEditingId(null); setDraft(null); setEditMessage(''); } }}>
        <DialogContent className="question-editor" aria-describedby="question-editor-description">
          <DialogHeader><span className="paper-eyebrow">CHỈNH SỬA BÀI {editingQuestion?.id}</span><DialogTitle>Cập nhật câu hỏi</DialogTitle><DialogDescription id="question-editor-description">Sửa nhanh thông tin ở trên; chỉ mở phần nâng cao khi cần thay đổi nội dung Toán hoặc logic chấm.</DialogDescription></DialogHeader>
          {draft && <div className="question-editor-form">
            <div className="editor-primary"><label>Mạch kiến thức<input value={draft.topic} onChange={event => setDraft({ ...draft, topic: event.target.value })} /></label><label>Lớp<select value={draft.grade} onChange={event => setDraft({ ...draft, grade: event.target.value })}>{[6, 7, 8, 9].map(grade => <option value={grade} key={grade}>Lớp {grade}</option>)}</select></label><label>Mức độ<select value={draft.difficulty} onChange={event => setDraft({ ...draft, difficulty: event.target.value as QuestionDraft['difficulty'] })}><option value="">Chưa gắn mức</option><option value="Dễ">* · Dễ</option><option value="Trung bình">** · Trung bình</option><option value="Khó">***–**** · Khó</option></select></label></div>
            <details className="editor-advanced"><summary>Sửa nội dung và logic chấm</summary><div>
              <div className="editor-row"><label>Dòng bắt đầu sai<input type="number" min="1" value={draft.errorLine} onChange={event => setDraft({ ...draft, errorLine: event.target.value })} /></label><label>Token sai<input value={draft.wrongToken} onChange={event => setDraft({ ...draft, wrongToken: event.target.value })} /></label></div>
              <div className="editor-row"><label>Cách sửa<select value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as QuestionKind })}><option value="symbol">Chọn dấu</option><option value="choice">Chọn phép biến đổi</option><option value="value">Nhập giá trị</option><option value="expression">Viết lại bước biến đổi</option></select></label><label>Đáp án<input value={draft.answer} onChange={event => setDraft({ ...draft, answer: event.target.value })} /></label></div>
              {draft.kind === 'choice' && <label>Các phương án <small>Mỗi dòng theo mẫu: A. biểu thức</small><textarea value={draft.options} onChange={event => setDraft({ ...draft, options: event.target.value })} /></label>}
              <label>Lời giải có lỗi <small>Mỗi dòng nhập trên một hàng.</small><textarea value={draft.bad} onChange={event => setDraft({ ...draft, bad: event.target.value })} /></label>
              <label>Lời giải đúng <small>Mỗi dòng nhập trên một hàng.</small><textarea value={draft.correct} onChange={event => setDraft({ ...draft, correct: event.target.value })} /></label>
              <label>Gợi ý<textarea value={draft.hint} onChange={event => setDraft({ ...draft, hint: event.target.value })} /></label>
              <label>Giải thích lỗi<textarea value={draft.explanation} onChange={event => setDraft({ ...draft, explanation: event.target.value })} /></label>
            </div></details>
            {editMessage && <p className="editor-error"><AlertTriangle size={15} />{editMessage}</p>}
            <div className="editor-actions"><Button variant="ghost" onClick={() => { setEditingId(null); setDraft(null); }}>Hủy</Button><Button className="studio-save" onClick={saveEdit}><CheckCircle2 size={16} />Lưu thay đổi</Button></div>
          </div>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={pendingDeleteId !== null} onOpenChange={open => { if (!open) setPendingDeleteId(null); }}><AlertDialogContent className="delete-question-dialog"><AlertDialogHeader><AlertDialogTitle>Xóa Bài {pendingDeleteId}?</AlertDialogTitle><AlertDialogDescription>Bài giáo viên đã nhập sẽ bị xóa khỏi kho trên thiết bị này. Thao tác này không ảnh hưởng đến các bài gốc.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Giữ lại</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Xóa khỏi kho</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}
