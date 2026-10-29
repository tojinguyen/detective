"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Target, Map } from 'lucide-react';

/** Nhiệm vụ chung cho mọi vụ án, hiện sau khi bấm "Bắt đầu phá án". */
const DETECTIVE_MISSION = [
  'Tìm lỗi sai và sửa lại để khôi phục vật chứng.',
  'Thu thập manh mối từ các phòng hiện trường.',
  'Đối chiếu hồ sơ nhân vật, loại dần và kết luận có căn cứ.',
];

interface DetectiveMissionModalProps {
  open: boolean;
  onClose: () => void;
}

export function DetectiveMissionModal({ open, onClose }: DetectiveMissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <DialogContent
        className="max-w-lg w-[calc(100%-2rem)] p-6 sm:p-7 bg-gradient-to-b from-[#12261e] to-[#0a1814] border border-[#2b5940] text-[#e3ece7] shadow-[0_30px_100px_rgba(0,0,0,0.9)] rounded-xl"
        showCloseButton={false}
      >
        <DialogHeader className="text-left space-y-1.5">
          <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#2b5940] bg-[#10251c] text-[#54c48a] text-[10px] font-bold tracking-widest uppercase">
            <Target size={12} />
            Chỉ thị điều tra
          </span>
          <DialogTitle className="font-serif text-2xl text-[#f3ece0] font-normal tracking-tight">
            NHIỆM VỤ THÁM TỬ
          </DialogTitle>
          <DialogDescription className="sr-only">Ba nhiệm vụ cần hoàn thành trong vụ án.</DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 my-2">
          {DETECTIVE_MISSION.map((mission, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-[#bce0ce] leading-relaxed">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1b3b2c] text-[#54c48a] text-xs font-bold shrink-0 border border-[#2b5940]">
                {index + 1}
              </span>
              <span className="pt-0.5">{mission}</span>
            </li>
          ))}
        </ol>

        <Button
          onClick={onClose}
          className="w-full gold-button text-sm font-semibold h-11 flex items-center justify-center gap-2"
        >
          <Map size={16} />
          Đã rõ, mở sơ đồ hiện trường
        </Button>
      </DialogContent>
    </Dialog>
  );
}
