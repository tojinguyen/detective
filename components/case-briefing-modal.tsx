"use client";

import React from 'react';
import { CaseDefinition } from '@/lib/cases';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, AlertTriangle, Target, Users, LayoutGrid, ArrowLeft, Play, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';

interface CaseBriefingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: CaseDefinition | null;
  onStartInvestigation: () => void;
  onBackToSelector: () => void;
}

export function CaseBriefingModal({
  open,
  onOpenChange,
  caseData,
  onStartInvestigation,
  onBackToSelector,
}: CaseBriefingModalProps) {
  if (!caseData) return null;

  const prologue = caseData.prologue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="case-briefing-modal max-w-5xl w-[calc(100%-2rem)] max-h-[95dvh] overflow-y-auto p-5 sm:p-7 md:p-8 bg-gradient-to-b from-[#14252c] to-[#0a161b] border border-[#3b535d] text-[#e3ece7] shadow-[0_30px_100px_rgba(0,0,0,0.9)] rounded-xl"
        showCloseButton={false}
      >
        {/* Header: Thông tin vụ án & Metadata */}
        <DialogHeader className="text-left pb-4 border-b border-[#253c46] space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#83693f] bg-[#292215] text-[#deb97b] text-[10px] font-bold tracking-widest uppercase">
                  <ShieldAlert size={12} />
                  HỒ SƠ MẬT · VỤ ÁN #{caseData.number}
                </span>
                {caseData.topicBadge && (
                  <span className="px-2 py-0.5 rounded bg-[#18333e] text-[#8ce0c2] text-[10px] border border-[#2b515f]">
                    {caseData.topicBadge}
                  </span>
                )}
              </div>

              <DialogTitle className="font-serif text-2xl sm:text-3xl text-[#f3ece0] font-normal tracking-tight">
                {caseData.title}
              </DialogTitle>
            </div>

            {/* Quick Context Chips */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-[#9eb2a8]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1d23] border border-[#233b45]">
                <Clock size={13} className="text-[#deb97b]" />
                <span>{prologue?.time || caseData.discoveredAt}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1d23] border border-[#233b45]">
                <MapPin size={13} className="text-[#deb97b]" />
                <span>{prologue?.location || 'Hiện trường E·RASE'}</span>
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* 2-Column Wide Landscape Grid: Bối cảnh (Trái) & Nhiệm vụ / Hành động (Phải) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 my-4 sm:my-5 items-stretch">
          {/* CỘT 1 (TRÁI): Bối cảnh & Sự kiện mất tích */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Box 1: Bối cảnh sự việc */}
            <div className="story-card p-4 rounded-lg border border-[#2d434d] bg-[#112128]/85 space-y-1.5 flex-1">
              <div className="flex items-center gap-1.5 text-[#deb97b] text-xs font-semibold tracking-wider uppercase">
                <Sparkles size={14} />
                <span>1. BỐI CẢNH SỰ VIỆC</span>
              </div>
              <p className="text-xs sm:text-[13px] text-[#c7d7d0] leading-relaxed font-sans">
                {prologue?.background || caseData.story.summary}
              </p>
            </div>

            {/* Box 2: Sự kiện bất thường */}
            <div className="story-card p-4 rounded-lg border border-[#6b4733]/60 bg-[#241a15]/50 space-y-1.5 flex-1">
              <div className="flex items-center gap-1.5 text-[#e89c72] text-xs font-semibold tracking-wider uppercase">
                <AlertTriangle size={14} />
                <span>2. SỰ KIỆN BẤT THƯỜNG</span>
              </div>
              <p className="text-xs sm:text-[13px] text-[#d9c4b7] leading-relaxed font-sans">
                {prologue?.incident || 'Chiếc huy hiệu đã biến mất khỏi vị trí ban đầu. Các đầu mối thông tin bị chia nhỏ tại các phòng hiện trường.'}
              </p>
            </div>
          </div>

          {/* CỘT 2 (PHẢI): Nhiệm vụ thám tử & Nút hành động */}
          <div className="flex flex-col justify-between gap-3 sm:gap-4">
            {/* Box 3: Nhiệm vụ trọng tâm */}
            <div className="story-card p-4 rounded-lg border border-[#294c3e] bg-[#10251c]/60 space-y-2 flex-1">
              <div className="flex items-center gap-1.5 text-[#54c48a] text-xs font-semibold tracking-wider uppercase">
                <Target size={14} />
                <span>3. NHIỆM VỤ THÁM TỬ</span>
              </div>
              <ul className="space-y-2 text-xs sm:text-[13px] text-[#bce0ce]">
                {(prologue?.mission || [
                  'Kiểm tra 5 phòng hiện trường và sửa các phiếu Toán có lỗi.',
                  'Thu thập các mảnh dữ kiện về kích thước, thời gian và tuyến đường.',
                  'Đối chiếu với 5 hồ sơ nhân vật để đưa ra kết luận duy nhất chính xác.'
                ]).map((m, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#1b3b2c] text-[#54c48a] text-[10px] font-bold shrink-0 mt-0.5 border border-[#2b5940]">
                      {idx + 1}
                    </span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chips tổng quan hiện trường */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg border border-[#253942] bg-[#0e1c22] flex items-center gap-2">
                <LayoutGrid size={16} className="text-[#deb97b] shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="block text-[#7a9388]">Hiện trường</span>
                  <strong className="text-[#ded6c7] font-medium">{caseData.rooms.length} Căn phòng khóa</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#253942] bg-[#0e1c22] flex items-center gap-2">
                <Users size={16} className="text-[#deb97b] shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="block text-[#7a9388]">Đối tượng</span>
                  <strong className="text-[#ded6c7] font-medium">{caseData.people.length} Hồ sơ nhân vật</strong>
                </div>
              </div>
            </div>

            {/* Khối nút hành động chính: Bắt đầu phá án */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={onBackToSelector}
                className="w-full sm:w-auto text-xs text-[#8fa79d] hover:text-[#f4eee2] hover:bg-[#182d36] h-10 px-3"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Chọn vụ án khác
              </Button>

              <Button
                onClick={onStartInvestigation}
                className="w-full sm:flex-1 gold-button text-xs sm:text-sm font-semibold h-11 px-6 shadow-[0_4px_16px_rgba(222,185,123,0.35)] flex items-center justify-center gap-2"
              >
                <Play size={16} fill="currentColor" />
                Bắt đầu phá án
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
