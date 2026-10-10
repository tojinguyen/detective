"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Users, Clock, AlertTriangle, CheckCircle2, Search, Download, Eye, Award, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app-header';

interface SessionRecord {
  question_id: number;
  findMisses: number;
  repairMisses: number;
  findSeconds: number;
  repairSeconds: number;
  roomSeconds?: number;
  hintOpened: boolean;
  traceStatus: string;
}

interface InvestigationSession {
  id: string | number;
  user_id: string | null;
  user_name: string | null;
  case_id: string;
  won: boolean;
  active_seconds: number;
  inactive_seconds: number;
  tab_exits: number;
  created_at: string;
  records?: SessionRecord[];
  summary?: {
    immediate?: number;
    independent?: number;
    assisted?: number;
    board_seconds?: number;
    room_times?: number[];
    score?: number;
    rank?: string;
    conclusion_attempts?: number;
    score_breakdown?: {
      roomsTotal?: number;
      totalScore?: number;
      conclusion?: { total?: number };
    };
    completed_cases_count?: number;
    career_score?: number;
  };
}

export default function AdminDashboardPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<InvestigationSession[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InvestigationSession | null>(null);

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from('investigation_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setSessions(data as InvestigationSession[]);
        });
    }
  }, [isAdmin]);

  const filtered = sessions.filter(s =>
    (s.user_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalWon = sessions.filter(s => s.won).length;
  const avgTime = sessions.length
    ? Math.round(sessions.reduce((a, b) => a + (b.active_seconds || 0), 0) / sessions.length)
    : 0;

  function fmt(s: number) {
    const safe = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(safe / 60);
    const sec = safe % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  function exportCSV() {
    const header = [
      'Học sinh',
      'Điểm vụ án',
      'Cấp bậc',
      'Thời gian phá án',
      'Thời gian xem hồ sơ',
      'Rời tab (lần)',
      'Treo máy / Ẩn tab',
      'Số lần kết luận',
      'Kết quả',
      'Ngày giờ'
    ];
    const rows = filtered.map(s => [
      `"${s.user_name || ''}"`,
      s.summary?.score !== undefined ? s.summary.score : '',
      `"${s.summary?.rank || ''}"`,
      fmt(s.active_seconds),
      fmt(s.summary?.board_seconds || 0),
      s.tab_exits || 0,
      fmt(s.inactive_seconds),
      s.summary?.conclusion_attempts || 1,
      s.won ? 'Thành công' : 'Chưa đúng',
      new Date(s.created_at).toLocaleString('vi-VN')
    ]);
    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `erase-tracking-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  if (authLoading) return <div className="p-10 text-center text-[#ceac79]">Đang tải quyền quản trị...</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#101d24] text-[#e9e5d9]">
        <AppHeader currentView="dashboard" />
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <AlertTriangle size={42} className="text-[#d3765e] mb-2" />
          <h1 className="text-xl font-serif text-[#efe9dc]">Chỉ dành cho Quản trị viên</h1>
          <p className="text-xs text-[#879896] mt-1 mb-4">Bạn cần đăng nhập bằng 1 trong các tài khoản Admin để xem Dashboard.</p>
          <Link href="/" className="px-4 py-2 bg-[#ceac79] text-[#101d24] font-bold text-xs rounded">Quay về Danh mục Vụ án</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101d24] text-[#e9e5d9]">
      <AppHeader currentView="dashboard" />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#34474e] pb-4 mb-6">
          <div>
            <p className="text-[10px] tracking-widest text-[#bb9c70] font-bold">GIÁM SÁT HỌC TẬP THỜI GIAN THỰC</p>
            <h1 className="text-2xl font-serif text-[#efe9dc]">Nhật ký điều tra của học sinh</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportCSV} variant="outline" className="text-xs gap-1 border-[#4a5b60]">
              <Download size={14} /> Xuất CSV
            </Button>
          </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#15242b] border border-[#34474e] p-4 rounded-lg flex items-center gap-3">
          <Users size={24} className="text-[#ceac79]" />
          <div><p className="text-xs text-[#879896]">Tổng lượt tham gia</p><p className="text-xl font-bold font-serif">{sessions.length}</p></div>
        </div>
        <div className="bg-[#15242b] border border-[#34474e] p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 size={24} className="text-[#7e9473]" />
          <div><p className="text-xs text-[#879896]">Tỉ lệ phá án thành công</p><p className="text-xl font-bold font-serif">{sessions.length ? Math.round((totalWon / sessions.length) * 100) : 0}%</p></div>
        </div>
        <div className="bg-[#15242b] border border-[#34474e] p-4 rounded-lg flex items-center gap-3">
          <Clock size={24} className="text-[#e0b875]" />
          <div><p className="text-xs text-[#879896]">Thời gian giải trung bình</p><p className="text-xl font-bold font-mono">{fmt(avgTime)}</p></div>
        </div>
      </div>

      <div className="mb-4 bg-[#142129] p-2 border border-[#34474e] rounded flex items-center gap-2">
        <Search size={16} className="text-[#879896] ml-2" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm tên học sinh..."
          className="bg-transparent border-none text-xs outline-none w-full text-[#e9e5d9]"
        />
      </div>

      <div className="bg-[#142129] border border-[#34474e] rounded overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1a2c33] border-b border-[#34474e] text-[#baa785]">
            <tr>
              <th className="p-3">Học sinh</th>
              <th className="p-3">Kết quả</th>
              <th className="p-3">Điểm</th>
              <th className="p-3">Cấp bậc</th>
              <th className="p-3">Thời gian phá án</th>
              <th className="p-3">Xem hồ sơ</th>
              <th className="p-3">Rời tab</th>
              <th className="p-3">Ngày làm</th>
              <th className="p-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#243740]">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-[#1f313a] transition-colors">
                <td className="p-3 font-semibold text-[#f1ecdf]">{s.user_name}</td>
                <td className="p-3">{s.won ? <span className="text-[#7e9473] font-bold">✓ Phá án thành công</span> : <span className="text-[#d3765e]">✕ Sai/Chưa xong</span>}</td>
                <td className="p-3 font-bold text-[#deb97b]">
                  {s.summary?.score !== undefined ? `${s.summary.score}/100` : '--'}
                </td>
                <td className="p-3 text-[#d2baa3]">
                  {s.summary?.rank ? (
                    <span className="px-2 py-0.5 bg-[#253840] border border-[#405660] rounded text-[11px] font-medium text-[#ffd78a]">
                      {s.summary.rank}
                    </span>
                  ) : '--'}
                </td>
                <td className="p-3 font-mono text-[#ceac79]">{fmt(s.active_seconds)}</td>
                <td className="p-3 font-mono text-[#9bb0a5]">{fmt(s.summary?.board_seconds || 0)}</td>
                <td className="p-3">{s.tab_exits > 0 ? <span className="text-[#d3765e] font-semibold">{s.tab_exits} lần ({fmt(s.inactive_seconds)})</span> : <span className="text-[#7e9473]">Tập trung</span>}</td>
                <td className="p-3 text-[#879896]">{new Date(s.created_at).toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setSelected(s)} className="p-1.5 bg-[#263b42] hover:bg-[#324b54] rounded text-[#ceac79] inline-flex items-center gap-1">
                    <Eye size={13} /> Xem phiếu
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-w-lg w-full bg-[#132229] border border-[#ceac79] p-5 rounded-lg text-xs max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#354850] pb-3 mb-3">
              <div>
                <h3 className="text-base font-serif text-[#f1ecdf] font-bold mb-0.5">Chi tiết: {selected.user_name}</h3>
                <p className="text-[#879896]">Vụ án: {selected.case_id} · {new Date(selected.created_at).toLocaleString('vi-VN')}</p>
              </div>
              {selected.summary?.rank && (
                <div className="text-right">
                  <span className="text-[10px] text-[#8fa298] block">CẤP BẬC</span>
                  <strong className="text-[#ffd78a] text-xs">{selected.summary.rank}</strong>
                </div>
              )}
            </div>

            {/* Khối thống kê tổng quan của lượt chơi */}
            <div className="grid grid-cols-3 gap-2 bg-[#0c1a20] p-3 rounded border border-[#2b3e46] mb-4 text-center">
              <div>
                <span className="text-[10px] text-[#869892] block">Điểm vụ án</span>
                <strong className="text-sm font-bold text-[#deb97b]">
                  {selected.summary?.score !== undefined ? `${selected.summary.score}/100` : '--'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#869892] block">Thời gian phá án</span>
                <strong className="text-sm font-mono text-[#f1ecdf]">{fmt(selected.active_seconds)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#869892] block">Thời gian xem hồ sơ</span>
                <strong className="text-sm font-mono text-[#9bb0a5]">{fmt(selected.summary?.board_seconds || 0)}</strong>
              </div>
            </div>

            {/* Chi tiết từng phòng */}
            <p className="text-[11px] font-bold text-[#baa785] uppercase tracking-wider mb-2">Tiến trình từng phòng:</p>
            <div className="space-y-2 mb-4">
              {selected.records?.map((r: SessionRecord, idx: number) => {
                const roomTime = selected.summary?.room_times?.[idx] ?? r.roomSeconds ?? (r.findSeconds + r.repairSeconds);
                return (
                  <div key={idx} className="p-2.5 bg-[#0e1c22] border border-[#34474e] rounded flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[#deb97b]">Phòng {idx + 1} (Bài {r.question_id})</strong>
                        <span className="text-[10px] text-[#82998f] font-mono">⏱ {fmt(roomTime)}</span>
                      </div>
                      <div className="text-[#879896] text-[11px] mt-0.5">
                        Tìm sai: {r.findMisses} lần ({fmt(r.findSeconds)}) · Sửa sai: {r.repairMisses} lần ({fmt(r.repairSeconds)})
                      </div>
                    </div>
                    <span className="text-[10px] self-center px-2 py-0.5 bg-[#263b42] rounded text-[#baa785] border border-[#3a5059]">
                      {r.hintOpened ? 'Đã dùng gợi ý' : 'Không dùng gợi ý'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Thống kê rời tab & kết luận */}
            <div className="p-2.5 bg-[#17272f] border border-[#2b3e46] rounded text-[11px] text-[#a4b5ac] mb-4 space-y-1">
              <div>• <strong>Số lần gửi kết luận:</strong> {selected.summary?.conclusion_attempts || 1} lần</div>
              <div>• <strong>Tập trung:</strong> {selected.tab_exits > 0 ? `Rời tab ${selected.tab_exits} lần (khoảng ${fmt(selected.inactive_seconds)})` : 'Hoàn toàn tập trung, không rời tab'}</div>
            </div>

            <Button onClick={() => setSelected(null)} className="gold-button w-full justify-center">Đóng</Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
