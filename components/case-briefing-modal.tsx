"use client";

import React, { useEffect, useState } from 'react';
import { CaseDefinition } from '@/lib/cases';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, AlertTriangle, ArrowLeft, Play, ShieldAlert, Sparkles, FastForward } from 'lucide-react';

interface CaseBriefingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: CaseDefinition | null;
  onStartInvestigation: () => void;
  onBackToSelector: () => void;
}

const TYPE_SPEED_MS = 28;

/** Gõ dần từng ký tự của `text`, trả về số ký tự đã hiện. */
function useTypewriter(text: string, running: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
  }, [text]);
  useEffect(() => {
    if (!running || count >= text.length) return;
    const timer = window.setTimeout(() => setCount(c => c + 1), TYPE_SPEED_MS);
    return () => window.clearTimeout(timer);
  }, [running, count, text]);
  return [count, setCount] as const;
}

export function CaseBriefingModal({
  open,
  onOpenChange,
  caseData,
  onStartInvestigation,
  onBackToSelector,
}: CaseBriefingModalProps) {
  const prologue = caseData?.prologue;
  const background = prologue?.background || caseData?.story.summary || '';
  const incident = prologue?.incident || 'Chiếc huy hiệu đã biến mất khỏi vị trí ban đầu. Các đầu mối thông tin bị chia nhỏ tại các phòng hiện trường.';

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const [backgroundCount, setBackgroundCount] = useTypewriter(background, open);
  const backgroundDone = backgroundCount >= background.length;
  const [incidentCount, setIncidentCount] = useTypewriter(incident, open && backgroundDone);
  const typingDone = backgroundDone && incidentCount >= incident.length;

  const skipTyping = () => {
    setBackgroundCount(background.length);
    setIncidentCount(incident.length);
  };

  // Mở lại hồ sơ thì gõ lại từ đầu; người dùng giảm chuyển động thì hiện ngay toàn bộ.
  useEffect(() => {
    if (!open) return;
    if (reducedMotion) {
      setBackgroundCount(background.length);
      setIncidentCount(incident.length);
    } else {
      setBackgroundCount(0);
      setIncidentCount(0);
    }
  }, [open, reducedMotion, background.length, incident.length, setBackgroundCount, setIncidentCount]);

  if (!caseData) return null;

  const caret = <span className="typewriter-caret" aria-hidden="true" />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="case-briefing-modal max-w-3xl w-[calc(100%-2rem)] max-h-[95dvh] overflow-y-auto p-5 sm:p-7 md:p-8 bg-gradient-to-b from-[#14252c] to-[#0a161b] border border-[#3b535d] text-[#e3ece7] shadow-[0_30px_100px_rgba(0,0,0,0.9)] rounded-xl"
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

        {/* Bối cảnh & Sự kiện bất thường, hiện dần như máy đánh chữ */}
        <div className="flex flex-col gap-3 sm:gap-4 my-4 sm:my-5">
          <div className="story-card p-4 rounded-lg border border-[#2d434d] bg-[#112128]/85 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#deb97b] text-xs font-semibold tracking-wider uppercase">
              <Sparkles size={14} />
              <span>1. BỐI CẢNH SỰ VIỆC</span>
            </div>
            {/* Giữ toàn văn ẩn để khung không nhảy kích thước khi đang gõ */}
            <p className="typewriter-text text-[13px] sm:text-sm text-[#c7d7d0] leading-relaxed" aria-label={background}>
              <span aria-hidden="true">{background.slice(0, backgroundCount)}</span>
              {!backgroundDone && caret}
              <span className="invisible" aria-hidden="true">{background.slice(backgroundCount)}</span>
            </p>
          </div>

          <div className="story-card p-4 rounded-lg border border-[#6b4733]/60 bg-[#241a15]/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#e89c72] text-xs font-semibold tracking-wider uppercase">
              <AlertTriangle size={14} />
              <span>2. SỰ KIỆN BẤT THƯỜNG</span>
            </div>
            <p className="typewriter-text text-[13px] sm:text-sm text-[#d9c4b7] leading-relaxed" aria-label={incident}>
              <span aria-hidden="true">{incident.slice(0, incidentCount)}</span>
              {backgroundDone && !typingDone && caret}
              <span className="invisible" aria-hidden="true">{incident.slice(incidentCount)}</span>
            </p>
          </div>
        </div>

        {/* Khối nút hành động chính */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={onBackToSelector}
            className="w-full sm:w-auto text-xs text-[#8fa79d] hover:text-[#f4eee2] hover:bg-[#182d36] h-10 px-3"
          >
            <ArrowLeft size={14} className="mr-1.5" />
            Chọn vụ án khác
          </Button>

          {typingDone ? (
            <Button
              onClick={onStartInvestigation}
              className="w-full sm:w-auto gold-button text-xs sm:text-sm font-semibold h-11 px-8 shadow-[0_4px_16px_rgba(222,185,123,0.35)] flex items-center justify-center gap-2"
            >
              <Play size={16} fill="currentColor" />
              Bắt đầu phá án
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={skipTyping}
              className="w-full sm:w-auto text-xs text-[#deb97b] border border-[#83693f] hover:bg-[#292215] hover:text-[#f3d9a6] h-11 px-6 flex items-center justify-center gap-2"
            >
              <FastForward size={15} />
              Hiện toàn bộ hồ sơ
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
