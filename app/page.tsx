"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import katex from 'katex';
import Image from 'next/image';
import Link from 'next/link';
import { Search, ArrowRight, Users, RotateCcw, Lightbulb, Check, LockKeyhole, Camera, HelpCircle, X, Flag, ScanSearch, CheckCircle2, ArrowLeft, Clock3, MapPin, FileSearch, Gamepad2, CircleDot, Ruler, Package, Route, CreditCard, LogIn, LogOut, LayoutDashboard, BookOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/auth-modal';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { candidates, comparisonFeedback, verdict, isDetectionCorrect, isCorrectionCorrect } from '@/lib/game';
import { CASE_01, type Direction } from '@/lib/cases';
import { defaultQuestionsForCase, questionsForCase, readLocalContent, type Question } from '@/lib/content';
import { tokeniseMath } from '@/lib/latex-question-parser';
import { formatInvestigationTime, investigationReport, traceStatus, TRACE_STATUS_LABELS, type InvestigationRecord } from '@/lib/investigation-report';

type Work = InvestigationRecord & { selection: string | null; answer: string; message: string };
type Point = { x: number; y: number };
const caseData = CASE_01;
const initialWork = (): Work[] => caseData.rooms.map(() => ({ stage: 'detect', selection: null, answer: '', findMisses: 0, repairMisses: 0, message: '', hintOpened: false, findSeconds: 0, repairSeconds: 0, tabExits: 0, inactiveSeconds: 0 }));
const SPRITE_POSITIONS: Record<Direction, { idle: string; walk: string }> = {
  front: { idle: '0% 0%', walk: '33.333% 0%' },
  back: { idle: '66.667% 0%', walk: '100% 0%' },
  left: { idle: '0% 100%', walk: '33.333% 100%' },
  right: { idle: '66.667% 100%', walk: '100% 100%' },
};
const PROFILE_ICONS = { ruler: Ruler, clock: Clock3, card: CreditCard, package: Package, route: Route } as const;
const personStyle = (i: number): CSSProperties => ({ '--person': caseData.people[i].color }) as CSSProperties;
const portraitPosition = (index: number) => caseData.people.length === 1 ? 50 : (index / (caseData.people.length - 1)) * 100;
const factText = (person: number, field: number) => {
  const definition = caseData.profileFields[field];
  const facts = caseData.people[person].facts as Record<string, string | number>;
  return String(facts[definition.key]) + (definition.suffix ?? '');
};
function MathText({ value }: { value: string }) {
  return <span className="math" dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' }) }} />;
}
function Initial({ person, small = false }: { person: number; small?: boolean }) {
  const initial = caseData.people[person].name.trim().split(/\s+/).at(-1)?.[0] ?? '?';
  return <span className={'initial ' + (small ? 'small' : '')} style={personStyle(person)} aria-hidden="true">{initial}</span>;
}
function CloseButton() {
  return <DialogClose asChild><button className="close-button" aria-label="Đóng cửa sổ"><X size={19} /></button></DialogClose>;
}

export default function Home() {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState('rooms');
  const [work, setWork] = useState<Work[]>(initialWork);
  const [active, setActive] = useState<number | null>(null);
  const [screen, setScreen] = useState<'scene' | 'question'>('scene');
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [boardMessage, setBoardMessage] = useState('');
  const [help, setHelp] = useState(false);
  const [restart, setRestart] = useState(false);
  const [conclude, setConclude] = useState(false);
  const [accused, setAccused] = useState<string>('');
  const [conclusion, setConclusion] = useState('');
  const [won, setWon] = useState(false);
  const [logicHint, setLogicHint] = useState(false);
  const [player, setPlayer] = useState<Point>({ x: 50, y: 57 });
  const [facing, setFacing] = useState<Direction>('front');
  const [walking, setWalking] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(() => defaultQuestionsForCase(caseData));
  const [worldMessage, setWorldMessage] = useState('Chọn một căn phòng để thám tử tự di chuyển tới vật chứng.');
  const movementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenSession = useRef<{ startedAt: number; question: number } | null>(null);
  const revealed = work.flatMap((w, i) => w.stage === 'done' ? [i] : []);
  const sideRoomsDone = caseData.rooms.every((room, index) => room.final || work[index].stage === 'done');
  const allEvidenceDone = work.every(w => w.stage === 'done');
  const current = active === null ? null : work[active];
  const question = active === null ? null : questions[active];
  const fullSearch = question?.difficulty === 'Trung bình' || question?.difficulty === 'Khó';
  const nearbyRoom = caseData.rooms.findIndex(room => Math.hypot(player.x - room.door.x, player.y - room.door.y) <= 10);
  const latestClue = revealed.length ? Math.max(...revealed) + 1 : 0;
  const logicHintText = caseData.logicHints[Math.min(latestClue, caseData.logicHints.length - 1)];
  const sideRoomCount = caseData.rooms.filter(room => !room.final).length;
  const preFinalCandidates = candidates(caseData, caseData.clues.map((_, index) => index).filter(index => index !== caseData.finalRoomIndex)).length;
  const report = investigationReport(work);
  const timingContext = useRef({ active, screen, stage: current?.stage });
  useEffect(() => {
    timingContext.current = { active, screen, stage: current?.stage };
  }, [active, screen, current?.stage]);

  const openRoom = useCallback((index: number) => {
    if (caseData.rooms[index].final && !sideRoomsDone) {
      setWorldMessage(caseData.rooms[index].name + ' còn khóa. Hãy thu thập đủ chứng cứ ở các phòng trước.');
      return;
    }
    setActive(index);
    setScreen('scene');
  }, [sideRoomsDone]);

  const enterNearbyRoom = useCallback(() => {
    if (nearbyRoom < 0) {
      setWorldMessage('Chọn một căn phòng trước nhé.');
      return;
    }
    openRoom(nearbyRoom);
  }, [nearbyRoom, openRoom]);

  function approachRoom(index: number) {
    const room = caseData.rooms[index];
    if (room.final && !sideRoomsDone) {
      setWorldMessage('Cửa ' + room.no + ' đang khóa. Các đèn chứng cứ trước đó phải sáng.');
      return;
    }
    setPlayer(room.door);
    setFacing(room.facing);
    setWalking(true);
    setWorldMessage('Đang di chuyển tới ' + room.name + '…');
    if (movementTimer.current) clearTimeout(movementTimer.current);
    movementTimer.current = setTimeout(() => {
      setWalking(false);
      setWorldMessage('Đã tới ' + room.name + '. Bấm Điều tra để bước vào.');
    }, 520);
  }

  useEffect(() => () => { if (movementTimer.current) clearTimeout(movementTimer.current); }, []);
  useEffect(() => {
    if (active === null || screen !== 'question' || current?.stage === 'done') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setWork(old => old.map((record, index) => {
        if (index !== active || record.stage === 'done') return record;
        return record.stage === 'detect'
          ? { ...record, findSeconds: record.findSeconds + 1 }
          : { ...record, repairSeconds: record.repairSeconds + 1 };
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, screen, current?.stage]);
  useEffect(() => {
    function trackVisibility() {
      if (document.visibilityState === 'hidden') {
        const context = timingContext.current;
        if (context.active !== null && context.screen === 'question' && context.stage !== 'done') {
          hiddenSession.current = { startedAt: Date.now(), question: context.active };
        }
        return;
      }
      const session = hiddenSession.current;
      hiddenSession.current = null;
      if (!session) return;
      const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
      if (elapsed < 2) return;
      setWork(old => old.map((record, index) => index === session.question
        ? { ...record, tabExits: record.tabExits + 1, inactiveSeconds: record.inactiveSeconds + elapsed }
        : record));
    }
    document.addEventListener('visibilitychange', trackVisibility);
    return () => document.removeEventListener('visibilitychange', trackVisibility);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setQuestions(questionsForCase(readLocalContent(), caseData)));
    return () => cancelAnimationFrame(frame);
  }, []);

  function updateWork(patch: Partial<Work>) {
    if (active === null) return;
    setWork(old => old.map((w, i) => i === active ? { ...w, ...patch } : w));
  }
  function detect() {
    if (!question || !current) return;
    if (!current.selection) { updateWork({ message: 'Chọn phần bạn nghĩ là sai trước nhé.' }); return; }
    if (isDetectionCorrect(question.target, current.selection, question.errorLine ?? 1)) {
      updateWork({ stage: 'repair', message: 'Đã tìm thấy điểm bất thường! Sửa lại để mở khóa manh mối.' });
    } else {
      const selectedRow = Number(current.selection.split('-')[0]);
      const errorRow = question.errorLine ?? 1;
      const message = fullSearch && selectedRow > errorRow
        ? 'Dấu vết này là hậu quả của một sai lệch trước đó. Hãy kiểm tra các bước phía trên.'
        : fullSearch
          ? 'Phần này vẫn hợp lý. Hãy đối chiếu với bước ngay trước đó.'
          : 'Phần này chưa phải lỗi cần tìm. Hãy đối chiếu với dòng trước.';
      updateWork({ findMisses: current.findMisses + 1, message });
    }
  }
  function repair() {
    if (!question || !current) return;
    if (!current.answer.trim()) { updateWork({ message: 'Bạn chưa điền cách sửa.' }); return; }
    const right = isCorrectionCorrect(question.kind, question.answer, current.answer);
    if (right) updateWork({ stage: 'done', message: '' });
    else updateWork({ repairMisses: current.repairMisses + 1, message: 'Cách sửa chưa phù hợp. Bạn vẫn giữ kết quả tìm lỗi đã đúng; hãy thử lại phần sửa nhé.' });
  }
  function invalidateVerdict() { setWon(false); setAccused(''); setConclusion(''); }
  function toggleEliminated(person: number) {
    invalidateVerdict();
    const isOut = eliminated.includes(person);
    setEliminated(old => isOut ? old.filter(index => index !== person) : [...old, person]);
    setBoardMessage(isOut ? 'Đã khôi phục hồ sơ ' + caseData.people[person].name + '.' : 'Đã đánh dấu ' + caseData.people[person].name + ' là không phù hợp.');
  }
  function compare() {
    setBoardMessage(comparisonFeedback(caseData, eliminated, revealed).text);
  }
  async function submitConclusion() {
    const result = verdict(caseData, eliminated, revealed, accused === '' ? null : Number(accused));
    setConclusion(result.text);
    setWon(result.won);

    // Ghi dữ liệu về Supabase
    try {
      const rep = investigationReport(work);
      await supabase.from('investigation_sessions').insert({
        user_id: user?.id ?? null,
        user_name: profile?.full_name ?? 'Học sinh ẩn danh',
        case_id: caseData.id,
        won: result.won,
        accused_id: accused === '' ? null : Number(accused),
        active_seconds: rep.activeSeconds,
        inactive_seconds: rep.inactiveSeconds,
        tab_exits: rep.tabExits,
        records: work.map((w, i) => ({
          question_id: questions[i].id,
          findMisses: w.findMisses,
          repairMisses: w.repairMisses,
          findSeconds: w.findSeconds,
          repairSeconds: w.repairSeconds,
          hintOpened: w.hintOpened,
          traceStatus: traceStatus(w),
        })),
        summary: {
          immediate: rep.immediate,
          independent: rep.independent,
          assisted: rep.assisted,
        }
      });
    } catch (e) {
      console.error('Không thể lưu session:', e);
    }
  }
  function reset() {
    setWork(initialWork()); setEliminated([]); setActive(null); setScreen('scene');
    setBoardMessage(''); setAccused(''); setConclusion(''); setWon(false); setConclude(false); setTab('rooms'); setLogicHint(false);
    setPlayer({ x: 50, y: 57 }); setFacing('front'); setWalking(false); setWorldMessage('Chọn một căn phòng để thám tử tự di chuyển tới vật chứng.');
  }
  function showBoard() { setActive(null); setTab('board'); }

  if (loading) {
    return (
      <div className="game-shell min-h-screen flex items-center justify-center bg-[#171410] text-[#cbbda2]">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-9 h-9 border-2 border-[#8a663b] border-t-transparent rounded-full animate-spin" />
          <p className="font-serif italic text-base tracking-wide text-[#e8dfcf]">Đang kiểm tra hồ sơ thám tử...</p>
          <span className="text-xs text-[#877d68] uppercase tracking-widest">E·RASE · Viện Lưu trữ & Hiện trường</span>
        </div>
      </div>
    );
  }

  return (
    <div className="game-shell">
      <header className="topbar">
        <a className="wordmark" href="#main" aria-label="E·RASE"><Search size={25} /><span>E·RASE</span></a>
        <div className="top-actions">
          {isAdmin && (
            <>
              <Link href="/dashboard" className="quiet-button flex items-center gap-1 text-xs">
                <LayoutDashboard size={15} /> Dashboard
              </Link>
              <Link href="/question-bank" className="quiet-button flex items-center gap-1 text-xs">
                <BookOpen size={15} /> Kho đề
              </Link>
            </>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#deb97b] font-medium">{profile?.full_name || 'Thám tử'}</span>
              <Button variant="ghost" className="quiet-button" onClick={signOut} title="Đăng xuất"><LogOut size={16} /></Button>
            </div>
          ) : (
            <Button variant="ghost" className="quiet-button" onClick={() => setAuthOpen(true)}>
              <LogIn size={16} /> Đăng nhập
            </Button>
          )}
          <Button variant="ghost" className="quiet-button restart-top" onClick={() => setRestart(true)} aria-label="Bắt đầu lại vụ án">
            <RotateCcw size={17} />
          </Button>
        </div>
      </header>
      <main id="main" className="workspace game-workspace">
        <div className="play-layout hud-layout">
          <section className="play-area" aria-label="Khu vực điều tra">
            <Tabs value={tab} onValueChange={setTab} className="game-tabs">
              <div className="surface-toolbar game-toolbar">
                <div className="game-case-id"><span>{caseData.number}</span><div><small>VỤ ÁN</small><strong>{caseData.title}</strong></div></div>
                <TabsList className="view-switch"><TabsTrigger value="rooms"><Gamepad2 size={16} />Khám phá</TabsTrigger><TabsTrigger value="board"><Users size={16} />Hồ sơ</TabsTrigger></TabsList>
                <div className="hud-tools"><button onClick={() => setHelp(true)} aria-label="Mở cách chơi"><HelpCircle size={18} /></button></div>
              </div>
              <TabsContent value="rooms" className="room-tab">
                <div className="building-map game-stage">
                  <div className="world-hud"><span className="case-clock" title="Mốc thời gian vụ việc, không phải đồng hồ đếm ngược"><Clock3 size={13} />MỐC {caseData.discoveredAt}</span><span><CircleDot size={13} /> MỤC TIÊU</span><p>{allEvidenceDone ? caseData.objective.conclusion : sideRoomsDone ? caseData.objective.finalRoom : caseData.objective.initial}</p><div className="evidence-lights" aria-label={revealed.length + ' trên ' + caseData.clues.length + ' đèn dữ kiện đã sáng'}>{caseData.clues.map((_, i) => <i key={i} className={revealed.includes(i) ? 'lit' : ''} />)}</div></div>
                  <div className="floor-plan game-world" aria-label="Khu điều tra; chọn một căn phòng để thám tử tự di chuyển">
                    <div className="world-floor-lines" />
                    <div className="hud-anchor-marker suspect-counter" title={'Danh sách có ' + caseData.people.length + ' nhân vật'}><Users size={17} /><span>{caseData.people.length} NHÂN VẬT</span></div>
                    <div className="central-corridor"><MapPin size={18} /><span>HÀNH LANG TRUNG TÂM</span><small>Chọn một căn phòng để di chuyển</small></div>
                    {caseData.rooms.map((room, i) => {
                      const locked = room.final && !sideRoomsDone;
                      const done = work[i].stage === 'done';
                      return <button key={room.no} className={'room-node room-' + room.position + (done ? ' complete' : '') + (locked ? ' locked' : '') + (nearbyRoom === i ? ' nearby' : '')} onClick={() => approachRoom(i)} aria-label={'Đi tới cửa ' + room.name + (locked ? ', đang khóa' : done ? ', đã thu thập chứng cứ' : '')}>
                        <span className="room-visual" aria-hidden="true"><Image fill sizes="(max-width: 700px) 33vw, 28vw" unoptimized src={room.image} alt="" className="room-mini-scene" /><span className="room-depth-frame" /><span className="room-light-beam" /></span>
                        <span className="room-number">{room.no}</span>
                        <span className="room-icon room-evidence-beacon">{room.final ? locked ? <LockKeyhole size={20} /> : <Camera size={20} /> : done ? <Check size={20} /> : <FileSearch size={20} />}</span>
                        <span className="room-copy"><strong>{room.name}</strong><small>{locked ? 'Mở khi có ' + (caseData.rooms.length - 1) + '/' + caseData.rooms.length + ' chứng cứ' : done ? 'Đã thu thập' : work[i].stage === 'repair' ? 'Đang xử lý' : 'Có vật chứng'}</small></span>
                      </button>;
                    })}
                    <div className={'detective-player facing-' + facing + (walking ? ' is-walking' : '')} style={{ left: player.x + '%', top: player.y + '%' }} role="img" aria-label="Nhân vật thám tử tự di chuyển theo phòng người chơi chọn"><span className="detective-shadow" /><span className="detective-sprite" style={{ backgroundPosition: SPRITE_POSITIONS[facing][walking ? 'walk' : 'idle'] }} /></div>
                  </div>
                  <div className="game-console auto-console">
                    <div className="console-status"><span><CheckCircle2 size={14} /> TIẾN ĐỘ CHỨNG CỨ · {revealed.length}/{caseData.clues.length}</span><p role="status">{worldMessage}</p><small>Chọn phòng → nhân vật tự di chuyển → bấm Điều tra</small></div>
                    <Button className={'interact-button ' + (nearbyRoom >= 0 && !walking ? 'ready' : '')} disabled={nearbyRoom < 0 || walking} onClick={enterNearbyRoom}><Search size={21} /><span><small>{walking ? 'ĐANG DI CHUYỂN' : nearbyRoom >= 0 ? 'ĐÃ TỚI CỬA' : 'CHƯA CHỌN PHÒNG'}</small>{walking ? 'Chờ thám tử tới nơi…' : nearbyRoom >= 0 ? 'Điều tra ' + caseData.rooms[nearbyRoom].name : 'Điều tra'}</span></Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="board" className="board-tab">
                <div className="board-heading suspect-board-heading"><div><p className="tiny-label">PHÒNG PHÂN TÍCH DỮ KIỆN</p><h2>Hồ sơ nhân vật</h2></div>{eliminated.length > 0 && <Button variant="ghost" className="quiet-button" onClick={() => { invalidateVerdict(); setEliminated([]); setBoardMessage('Đã khôi phục toàn bộ hồ sơ.'); }}><RotateCcw size={16} />Khôi phục tất cả</Button>}</div>
                <p className="board-instruction"><ScanSearch size={15} /> Đối chiếu các dữ kiện đã mở. Chạm một hồ sơ để đánh dấu không phù hợp hoặc khôi phục.</p>
                <div className="evidence-filter-strip" aria-label="Các dữ kiện đã mở">
                  {caseData.clues.map((clue, index) => <div key={clue.shortLabel} className={'evidence-filter ' + (revealed.includes(index) ? 'unlocked' : 'locked')}><span>M{index + 1}</span><b>{revealed.includes(index) ? clue.shortLabel : '?'}</b></div>)}
                </div>
                <div className="suspect-grid" aria-label={caseData.people.length + ' hồ sơ nhân vật'}>
                  {caseData.people.map((profile, index) => { const isOut = eliminated.includes(index); const factsLabel = caseData.profileFields.map((field, fieldIndex) => field.label + ' ' + factText(index, fieldIndex)).join(', '); return <button key={profile.id} className={'suspect-card ' + (isOut ? 'eliminated' : '')} onClick={() => toggleEliminated(index)} aria-pressed={isOut} aria-label={(isOut ? 'Khôi phục ' : 'Đánh dấu không phù hợp ') + profile.name + ', ' + profile.role + ', ' + factsLabel}>
                    <span className="suspect-portrait" style={{ backgroundPosition: portraitPosition(index) + '% 9%' }} aria-hidden="true" />
                    <span className="suspect-name"><small>HỒ SƠ 0{index + 1} · {profile.role}</small><strong>{profile.name}</strong></span>
                    <span className="suspect-data">{caseData.profileFields.map((field, fieldIndex) => { const FactIcon = PROFILE_ICONS[field.icon]; return <span className={field.fullWidth ? 'full-fact' : ''} key={field.key}><FactIcon size={14} /><b>{factText(index, fieldIndex)}</b><small>{field.label}</small></span>; })}</span>
                    {isOut && <span className="eliminated-stamp"><X size={22} />KHÔNG KHỚP</span>}
                  </button>; })}
                </div>
                <div className="board-actions"><Button className="secondary-button" onClick={compare}><ScanSearch size={16} />Đối chiếu</Button><Button variant="ghost" className="quiet-button" onClick={() => setLogicHint(!logicHint)}><Lightbulb size={16} />Gợi ý suy luận</Button><Button className="gold-button conclude-button" onClick={() => { if (!won) setConclusion(''); setConclude(true); }}><Flag size={16} />Kết luận</Button></div>
                {logicHint && <div className="logic-hint"><Lightbulb size={17} /><p>{logicHintText}</p></div>}
                {boardMessage && <p className="board-feedback" role="status">{boardMessage}</p>}
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>

      <Dialog open={active !== null} onOpenChange={open => { if (!open) setActive(null); }}>
        <DialogContent className={screen === 'scene' ? 'paper-modal room-scene-modal' : 'paper-modal question-modal'} showCloseButton={false}>
          <CloseButton />
          {active !== null && current && question && screen === 'scene' && <div className="room-scene-content">
            <div className="room-scene-visual">
              <Image width={1672} height={941} unoptimized priority={active === 0} src={caseData.rooms[active].image} alt={'Không gian ' + caseData.rooms[active].name + ' trong vụ án ' + caseData.title + '.'} className="room-scene-image" draggable={false} />
              <div className="room-scene-overlay" />
              <span className="room-scene-number">PHÒNG {caseData.rooms[active].no}</span>
              <button className={'room-object-hotspot ' + (current.stage === 'done' ? 'found' : '')} onClick={() => setScreen('question')}><span>{current.stage === 'done' ? <Check size={19} /> : <Search size={19} />}</span><strong>{caseData.rooms[active].object}</strong><small>{current.stage === 'done' ? 'Xem chứng cứ đã thu thập' : 'Kiểm tra vật chứng'}</small></button>
            </div>
            <div className="room-object-card"><span className="paper-eyebrow">{caseData.rooms[active].final ? 'CHẶNG CUỐI' : 'KHU VỰC ĐIỀU TRA'}</span><h2>{caseData.rooms[active].name}</h2><p>{caseData.rooms[active].note}</p>{caseData.rooms[active].securityWarning && <div className="security-warning"><Camera size={17} /><span>{caseData.rooms[active].securityWarning}</span></div>}<div><Button className="gold-button" onClick={() => setScreen('question')}>{current.stage === 'done' ? 'Xem chứng cứ' : 'Kiểm tra vật chứng'}<ArrowRight size={16} /></Button><Button variant="ghost" className="quiet-paper-button" onClick={() => setActive(null)}>Quay lại sơ đồ tòa nhà</Button></div></div>
          </div>}
          {active !== null && current && question && screen === 'question' && <>
            <DialogHeader className="question-heading"><div className="modal-eyebrow"><FileSearch size={22} /><span>{caseData.rooms[active].source} <i>·</i> BÀI {question.id}</span></div><DialogTitle>{current.stage === 'done' ? 'Chứng cứ đã được mở khóa.' : 'Có gì chưa đúng ở đây?'}</DialogTitle><DialogDescription>{current.stage === 'done' ? 'Phiếu Toán đã sửa giúp bạn đọc được mảnh thông tin của căn phòng này.' : 'Vật chứng bị khóa bởi một lời giải sai. Tìm lỗi đầu tiên, rồi sửa đúng để mở.'}</DialogDescription></DialogHeader>
            {current.stage !== 'done' ? <>
              <div className="question-progress-row"><div className="math-stages"><span className={current.stage === 'detect' ? 'active' : 'finished'}>{current.stage === 'repair' ? <Check size={13} /> : <b>1</b>} Tìm lỗi</span><span className="stage-line" /><span className={current.stage === 'repair' ? 'active' : ''}><b>2</b> Sửa lỗi</span><span className="stage-line" /><span><LockKeyhole size={13} /> Manh mối</span></div><span className="investigation-timer" aria-label={'Thời gian điều tra ' + formatInvestigationTime(current.findSeconds + current.repairSeconds)}><Clock3 size={14} /><small>THỜI GIAN ĐIỀU TRA</small><b>{formatInvestigationTime(current.findSeconds + current.repairSeconds)}</b></span></div>
              <div className={'worksheet ' + (fullSearch ? 'scan-mode' : '')}><div className="worksheet-caption"><span>BÀI CÓ LỖI</span><span>{!fullSearch && question.givenLine ? 'Lỗi bắt đầu ở dòng ' + question.givenLine : 'Truy tìm lỗi sai đầu tiên'}</span></div><div className="equations">{question.bad.map((line, r) => { const errorRow = question.errorLine ?? 1; const tokens = fullSearch ? (r === errorRow ? question.segments : tokeniseMath(line)) : r === errorRow ? question.segments : null; const interactive = current.stage === 'detect' && tokens !== null; return <div className={'equation-row ' + (!fullSearch && r === errorRow && question.givenLine ? 'given-line' : '')} key={r}><span className="line-number">{r + 1}</span><div className="equation-content">{tokens ? <>{line.trim().startsWith('=') && tokens[0] !== '=' && <MathText value="=" />}{tokens.map((token, t) => interactive ? <button className={'math-token ' + (current.selection === r + '-' + t ? 'chosen' : '')} key={t} aria-pressed={current.selection === r + '-' + t} aria-label={'Dòng ' + (r + 1) + ', phần ' + (t + 1) + ': ' + token} onClick={() => updateWork({ selection: r + '-' + t, message: '' })}><MathText value={token} /></button> : <span className={'math-token fixed ' + (current.selection === r + '-' + t ? 'chosen' : '')} key={t}><MathText value={token} /></span>)}</> : <MathText value={line} />}</div></div>; })}</div></div>
              {current.stage === 'detect' ? <div className="question-action"><p>{fullSearch ? 'Tìm xem lời giải bắt đầu sai từ đâu, rồi sửa lại từ đó.' : 'Chọn số, dấu hoặc phần biến đổi sai trên dòng ' + (question.givenLine ?? (question.errorLine ?? 1) + 1) + '.'}</p><Button className="gold-button" onClick={detect}>Kiểm tra vị trí<ArrowRight size={16} /></Button></div> : <form className="repair-form" onSubmit={e => { e.preventDefault(); repair(); }}><label className="repair-label" htmlFor="repair-answer">{question.repairLabel}</label>{question.kind === 'symbol' ? <RadioGroup className="symbol-choices" value={current.answer} onValueChange={value => updateWork({ answer: value, message: '' })} aria-label="Chọn dấu thay thế">{[{ v: '+', label: '+', name: 'Cộng' }, { v: '-', label: '−', name: 'Trừ' }, { v: '*', label: '×', name: 'Nhân' }, { v: '/', label: ':', name: 'Chia' }].map(symbol => <label className={'symbol-choice ' + (current.answer === symbol.v ? 'selected' : '')} key={symbol.v}><RadioGroupItem value={symbol.v} id={'symbol-' + symbol.v} aria-label={symbol.name} /><span>{symbol.label}</span></label>)}</RadioGroup> : question.kind === 'choice' && question.options?.length ? <RadioGroup className="expression-choices" value={current.answer} onValueChange={value => updateWork({ answer: value, message: '' })} aria-label="Chọn phép biến đổi đúng">{question.options.map(option => <label className={'expression-choice ' + (current.answer === option.key ? 'selected' : '')} key={option.key}><RadioGroupItem value={option.key} id={'choice-' + option.key} /><b>{option.key}</b><MathText value={option.value} /></label>)}</RadioGroup> : <><Input id="repair-answer" className="math-input" value={current.answer} onChange={e => updateWork({ answer: e.target.value, message: '' })} autoComplete="off" maxLength={100} placeholder={question.kind === 'value' ? 'Nhập giá trị đúng…' : 'Nhập bước tính đúng…'} /><small className="input-help">{question.kind === 'expression' ? 'Dùng +, −, *, : và ngoặc. Chấp nhận các cách tính tương đương.' : 'Bạn có thể nhập số hoặc một biểu thức có cùng giá trị.'}</small></>}<Button type="submit" className="gold-button">Xác nhận cách sửa<Check size={16} /></Button></form>}
              {current.message && <p className={'math-feedback ' + (current.stage === 'repair' && current.repairMisses === 0 ? 'encourage' : '')} role="status">{current.message}</p>}
              {current.hintOpened ? <div className="math-hint"><Lightbulb size={18} /><p>{question.hint}</p></div> : <button className="hint-link" onClick={() => updateWork({ hintOpened: true })}><Lightbulb size={15} /> Cần một gợi ý nhỏ?</button>}
            </> : <div className="solved-content"><div className="received-clue"><span className="paper-eyebrow">MANH MỐI M{active + 1} · {caseData.rooms[active].source}</span><p>{caseData.clues[active].text}</p><span><CheckCircle2 size={15} /> Đã thêm vào bảng đối chiếu</span></div><details className="correct-solution"><summary>Xem lại cách sửa phiếu</summary><p>{question.explanation}</p><div className="correct-lines">{question.correct.map((line, i) => <div key={i}><MathText value={line} /></div>)}</div></details><div className="solved-actions"><Button className="gold-button" onClick={showBoard}>{caseData.rooms[active].final ? <><Flag size={17} />Đi đến kết luận</> : <><Users size={17} />Đối chiếu hồ sơ nhân vật</>}<ArrowRight size={16} /></Button><Button className="quiet-paper-button" variant="ghost" onClick={() => { setActive(null); setTab('rooms'); }}>{!caseData.rooms[active].final && sideRoomsDone ? caseData.rooms[caseData.finalRoomIndex].name + ' đã mở — quay lại hành lang' : 'Trở về sơ đồ tòa nhà'}</Button></div></div>}
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={help} onOpenChange={setHelp}><DialogContent className="paper-modal help-modal" showCloseButton={false}><CloseButton /><DialogHeader><p className="paper-eyebrow">SỔ TAY THÁM TỬ</p><DialogTitle>Tự mình bước vào hiện trường.</DialogTitle><DialogDescription>Chọn từng căn phòng để thám tử tự di chuyển tới cửa và trực tiếp mở dữ kiện.</DialogDescription></DialogHeader><div className="help-steps"><div><b>01</b><p><strong>Chọn căn phòng</strong>Bấm vào một căn phòng; thám tử sẽ tự đi tới cửa.</p></div><div><b>02</b><p><strong>Bấm Điều tra</strong>Khi thám tử đến nơi, bấm nút Điều tra. Tìm lỗi đầu tiên rồi sửa phiếu Toán.</p></div><div><b>03</b><p><strong>Đối chiếu và kết luận</strong>{sideRoomCount} manh mối đầu vẫn để lại {preFinalCandidates} nhân vật phù hợp. Dữ kiện M{caseData.finalRoomIndex + 1} mới giúp xác định một người duy nhất.</p></div></div><div className="rule-card"><strong>Chuỗi điều tra</strong><p>Ở mức Dễ, dòng có lỗi đã được khoanh vùng. Từ mức Trung bình, hãy quét toàn bộ lời giải để tìm nơi sai lệch bắt đầu.</p><p>{caseData.clues.length} đèn vàng biểu thị tiến độ của toàn bộ {caseData.clues.length} dữ kiện.</p><p>{sideRoomCount} dữ kiện đầu mở {caseData.rooms[caseData.finalRoomIndex].name.toLocaleLowerCase('vi')}, nhưng chưa đủ để kết luận.</p><p>M{caseData.finalRoomIndex + 1} là dữ kiện quyết định; bảng Hồ sơ sẽ đối chiếu đủ {caseData.clues.length} thông tin.</p></div><p className="help-note"><strong>{caseData.discoveredAt} là mốc thời gian phát hiện sự việc, không phải đồng hồ đếm ngược.</strong> Đồng hồ trong phiếu chỉ ghi thời gian điều tra và sẽ tạm dừng khi rời màn hình. Trò chơi không giới hạn thời gian; dùng gợi ý không làm mất tiến độ.</p><Button className="gold-button" onClick={() => setHelp(false)}>Mình hiểu rồi<ArrowRight size={16} /></Button></DialogContent></Dialog>

      <Dialog open={conclude} onOpenChange={setConclude}>
        <DialogContent className="paper-modal conclusion-modal" showCloseButton={false}>
          <CloseButton />
          <DialogHeader>
            <p className="paper-eyebrow">{won ? 'HỒ SƠ ' + caseData.number + ' · ĐÃ GIẢI' : 'BẢN KẾT LUẬN'}</p>
            <DialogTitle>{won ? 'Từng manh mối đã khớp.' : caseData.conclusionQuestion}</DialogTitle>
            <DialogDescription>{won ? caseData.solvedDescription : 'Chọn người duy nhất còn phù hợp với đủ ' + caseData.clues.length + ' manh mối. Hệ thống sẽ đối chiếu bảng hồ sơ và dữ kiện cuối.'}</DialogDescription>
          </DialogHeader>
          {won ? <div className="win-content">
            <div className="case-solved-stamp"><CheckCircle2 size={30} /><span>BÍ ẨN ĐÃ ĐƯỢC GIẢI ĐÁP</span></div>
            <p className="win-verdict">{conclusion}</p>
            <p className="paper-eyebrow">NHẬT KÝ ĐIỀU TRA</p>
            <div className="journal-summary">
              <span><b>{work.length}/{work.length}</b><small>Manh mối đã mở</small></span>
              <span><b>{report.immediate}</b><small>Xác định ngay</small></span>
              <span><b>{report.independent}</b><small>Tự xác minh</small></span>
              <span><b>{report.assisted}</b><small>Có hỗ trợ</small></span>
              <span><b>{formatInvestigationTime(report.activeSeconds)}</b><small>Thời gian điều tra</small></span>
            </div>
            <p className="journal-narrative">{report.narrative}</p>
            <Table className="results-table journal-table">
              <TableHeader><TableRow><TableHead>Phiếu</TableHead><TableHead>Tìm lỗi</TableHead><TableHead>Sửa lỗi</TableHead><TableHead>Dấu vết</TableHead></TableRow></TableHeader>
              <TableBody>{work.map((w, i) => {
                const status = traceStatus(w);
                return <TableRow key={i}><TableCell>Bài {questions[i].id}</TableCell><TableCell>Lần {w.findMisses + 1} · {formatInvestigationTime(w.findSeconds)}</TableCell><TableCell>Lần {w.repairMisses + 1} · {formatInvestigationTime(w.repairSeconds)}</TableCell><TableCell><span className={'trace-status ' + status}>{TRACE_STATUS_LABELS[status]}</span></TableCell></TableRow>;
              })}</TableBody>
            </Table>
            <div className="session-observation"><Clock3 size={16} /><span>{report.tabExits > 0 ? `Rời màn hình ${report.tabExits} lần · ${formatInvestigationTime(report.inactiveSeconds)}.` : 'Không rời màn hình trong lúc xử lý các vụ án.'}</span></div>
            <Button className="gold-button" onClick={() => { setConclude(false); setTab('board'); }}>Xem lại hồ sơ<Users size={16} /></Button>
          </div> : <>
            <RadioGroup value={accused} onValueChange={v => { setAccused(v); setConclusion(''); }} className="accused-choices" aria-label={caseData.conclusionQuestion}>{caseData.people.map((p, i) => <label key={p.id} className={'accused-choice ' + (accused === String(i) ? 'selected' : '')}><RadioGroupItem value={String(i)} id={'accused-' + i} /><Initial person={i} small /><strong>{p.name}</strong></label>)}</RadioGroup>
            {conclusion && <p className="conclusion-feedback" role="status">{conclusion}</p>}
            <Button className="gold-button" onClick={submitConclusion}><Flag size={16} />Gửi kết luận</Button>
            <Button variant="ghost" className="quiet-paper-button" onClick={() => { setConclude(false); setTab('board'); }}><ArrowLeft size={15} />Quay lại hồ sơ</Button>
          </>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={restart} onOpenChange={setRestart}><AlertDialogContent className="paper-modal"><AlertDialogHeader><AlertDialogTitle>Bắt đầu lại vụ án?</AlertDialogTitle><AlertDialogDescription>Các phiếu đã sửa, manh mối và bảng đối chiếu trong lượt này sẽ được đặt lại.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="secondary-paper-button">Tiếp tục lượt này</AlertDialogCancel><AlertDialogAction className="gold-button" onClick={reset}>Bắt đầu lại</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AuthModal
        open={!user ? true : authOpen}
        onOpenChange={setAuthOpen}
        mandatory={!user}
      />
    </div>
  );
}
