"use client";

import React from 'react';
import { CaseDefinition, CASES } from '@/lib/cases';
import { Button } from '@/components/ui/button';
import { FolderSearch, Clock, MapPin, Users, Lock, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import type { DetectiveRank } from '@/lib/scoring';

interface CaseSelectorProps {
  userName: string;
  rankTitle: DetectiveRank;
  careerScore: number;
  completedCasesCount: number;
  completedCaseIds: string[];
  onSelectCase: (caseData: CaseDefinition) => void;
}

export function CaseSelector({
  userName,
  rankTitle,
  careerScore,
  completedCasesCount,
  completedCaseIds,
  onSelectCase,
}: CaseSelectorProps) {
  return (
    <div className="case-selector-container w-full min-h-[calc(100vh-64px)] pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Hero Welcome Banner */}
        <div className="case-hub-hero p-6 sm:p-8 lg:p-10 rounded-2xl border border-[#3b535d] bg-gradient-to-br from-[#172c35] via-[#10222a] to-[#0a171c] shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden mb-10">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#7d653f] bg-[#292317] text-[#deb97b] text-[11px] font-semibold tracking-wider uppercase mb-3">
              <FolderSearch size={14} />
              BẢNG PHÂN CÔNG ÁN TÍCH
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#f4eee2] font-normal tracking-tight mb-3">
              Hồ Sơ Vụ Án Thám Tử Toán Học
            </h1>

            <p className="text-[#a6bcb3] text-xs sm:text-sm leading-relaxed mb-6">
              Chào mừng thám tử <span className="text-[#f0ece1] font-semibold">{userName}</span> đến với Tổng cục điều tra E·RASE. Hãy chọn một hồ sơ bên dưới để theo dõi bối cảnh và nhận lệnh khám nghiệm hiện trường.
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
              <div className="p-3.5 rounded-xl border border-[#2b414b] bg-[#12232a]/80 backdrop-blur-sm">
                <span className="block text-[10px] uppercase tracking-wider text-[#799187] mb-1">Cấp bậc nghiệp vụ</span>
                <strong className="block text-sm sm:text-base text-[#f0dfba] font-serif font-normal">{rankTitle}</strong>
              </div>
              <div className="p-3.5 rounded-xl border border-[#2b414b] bg-[#12232a]/80 backdrop-blur-sm">
                <span className="block text-[10px] uppercase tracking-wider text-[#799187] mb-1">Điểm nghiệp vụ</span>
                <strong className="block text-sm sm:text-base text-[#54c48a] font-serif font-normal">{careerScore} pts</strong>
              </div>
              <div className="p-3.5 rounded-xl border border-[#2b414b] bg-[#12232a]/80 backdrop-blur-sm col-span-2 sm:col-span-1">
                <span className="block text-[10px] uppercase tracking-wider text-[#799187] mb-1">Vụ án hoàn thành</span>
                <strong className="block text-sm sm:text-base text-[#deb97b] font-serif font-normal">{completedCasesCount} / {CASES.length}</strong>
              </div>
            </div>
          </div>

          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-radial from-[#deb97b]/10 to-transparent pointer-events-none rounded-full" />
        </div>

        {/* Section Title */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-widest text-[#d8b375] uppercase">
              DANH MỤC VỤ ÁN ĐANG LƯU TRỮ
            </h2>
            <span className="h-px w-16 bg-[#3f515a] hidden sm:inline-block" />
          </div>
          <span className="text-xs text-[#7d938b] font-medium">{CASES.length} hồ sơ khả dụng</span>
        </div>

        {/* Case Dossier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {CASES.map((caseItem) => {
            const isCompleted = completedCaseIds.includes(caseItem.id);
            const isAvailable = caseItem.status !== 'upcoming';

            return (
              <div
                key={caseItem.id}
                className={`case-dossier-card rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
                  isAvailable
                    ? 'border-[#334d58] bg-[#12232b] hover:border-[#deb97b] hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] hover:-translate-y-1'
                    : 'border-[#22333b] bg-[#0f1a1f] opacity-75'
                }`}
              >
                {/* Card Top Stamp & Badge */}
                <div className="p-6 sm:p-7 pb-4">
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded border border-[#83693f] bg-[#272115] text-[#ecd7ad] text-[10px] font-mono font-bold tracking-wider">
                        HỒ SƠ #{caseItem.number}
                      </span>
                      {caseItem.topicBadge && (
                        <span className="px-2 py-0.5 rounded bg-[#1c353f] text-[#8ce0c2] text-[10px] border border-[#2f5564]">
                          {caseItem.topicBadge}
                        </span>
                      )}
                    </div>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#2f6f4c] bg-[#123122] text-[#54c48a] text-[10px] font-semibold">
                        <CheckCircle2 size={12} /> ĐÃ GIẢI
                      </span>
                    ) : isAvailable ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#83693f] bg-[#2b2315] text-[#deb97b] text-[10px] font-semibold">
                        <Sparkles size={11} /> ĐANG MỞ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#3b474c] bg-[#1a2327] text-[#86969b] text-[10px]">
                        <Lock size={11} /> SẮP RA MẮT
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl text-[#f3ece0] font-normal mb-2 leading-snug">
                    {caseItem.title}
                  </h3>

                  <p className="text-xs sm:text-[13px] text-[#9eb2a8] leading-relaxed mb-5 line-clamp-3">
                    {caseItem.story.summary}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-3.5 text-[11px] text-[#7d938b] pt-3 border-t border-[#233842]">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#c7a469]" /> {caseItem.rooms.length} phòng hiện trường
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={13} className="text-[#c7a469]" /> {caseItem.people.length} nhân vật
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} className="text-[#c7a469]" /> {caseItem.estimatedTime || '20 phút'}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 sm:p-5 bg-[#0d181e]/90 border-t border-[#22353e] flex items-center justify-between">
                  <div className="text-[11px] text-[#849a90]">
                    Độ khó: <b className="text-[#e2dacb] font-medium">{caseItem.difficulty || 'Trung bình'}</b>
                  </div>

                  {isAvailable ? (
                    <Button
                      onClick={() => onSelectCase(caseItem)}
                      className="gold-button text-xs font-semibold py-1.5 px-4 h-9 shadow-sm"
                    >
                      {isCompleted ? 'Khám nghiệm lại' : 'Nhận vụ án & Xem bối cảnh'}
                      <ArrowRight size={14} className="ml-1" />
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="ghost"
                      className="text-xs text-[#63757a] border border-[#27373e] bg-[#121c21] h-9 px-4 cursor-not-allowed"
                    >
                      <Lock size={13} className="mr-1" /> Đang khóa hồ sơ
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
