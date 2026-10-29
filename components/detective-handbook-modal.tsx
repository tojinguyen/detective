"use client";

import React from 'react';
import { ArrowRight, BookOpen, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DetectiveHandbookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetectiveHandbookModal({ open, onOpenChange }: DetectiveHandbookModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="detective-handbook-modal help-modal w-[94vw] sm:w-[88vw] md:w-[78vw] lg:w-[68vw] max-w-4xl max-h-[92vh] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] !gap-2.5 p-4 sm:p-5 border border-[#3c545e] bg-gradient-to-br from-[#15272e] to-[#0c181e] text-[#f1ece1] rounded-2xl shadow-[0_35px_120px_rgba(0,0,0,0.85)]"
        showCloseButton={true}
      >
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#deb97b] uppercase">
            <BookOpen size={15} />
            <span>SỔ TAY THÁM TỬ TOÁN HỌC</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-serif font-bold text-[#f4efe4] tracking-wide">
            Tự mình bước vào hiện trường
          </DialogTitle>
          <DialogDescription className="sr-only">
            Cẩm nang hướng dẫn điều tra hiện trường, phát hiện sai sót toán học và truy tìm thủ phạm.
          </DialogDescription>
        </DialogHeader>

        {/* 3 Bước điều tra chính */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0f1f26]/90 border border-[#233b47] hover:border-[#3a5866] transition-colors">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-[#deb97b] leading-none">01</span>
              <strong className="text-xs sm:text-sm font-semibold text-[#f1ece1]">Chọn căn phòng</strong>
            </div>
            <p className="text-xs text-[#9eb2a8] leading-relaxed m-0">
              Bấm vào căn phòng, thám tử sẽ tự đến chỗ vật chứng.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0f1f26]/90 border border-[#233b47] hover:border-[#3a5866] transition-colors">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-[#deb97b] leading-none">02</span>
              <strong className="text-xs sm:text-sm font-semibold text-[#f1ece1]">Tìm lỗi & sửa lỗi</strong>
            </div>
            <p className="text-xs text-[#9eb2a8] leading-relaxed m-0">
              Bấm Điều tra, tìm lỗi sai đầu tiên rồi sửa đúng để mở manh mối.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0f1f26]/90 border border-[#233b47] hover:border-[#3a5866] transition-colors">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-[#deb97b] leading-none">03</span>
              <strong className="text-xs sm:text-sm font-semibold text-[#f1ece1]">Đối chiếu & kết luận</strong>
            </div>
            <p className="text-xs text-[#9eb2a8] leading-relaxed m-0">
              Manh mối sẽ tự cập nhật vào Bảng hồ sơ. Loại dần những người không phù hợp rồi bấm Bản kết luận.
            </p>
          </div>
        </div>

        {/* Chuỗi quy tắc phá án */}
        <div className="p-3 rounded-xl bg-[#0c181e] border border-[#263e4b] border-l-4 border-l-[#deb97b] space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-[#deb97b]" />
            <strong className="text-xs font-bold uppercase tracking-wider text-[#ffd78a]">Chuỗi quy tắc phá án</strong>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-[#b9ccc3] leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-[#deb97b] font-mono font-bold">1.</span>
              <p className="m-0">Thu thập đủ manh mối ở các phòng để mở Buồng an ninh.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#deb97b] font-mono font-bold">2.</span>
              <p className="m-0">Dùng HỒ SƠ NHÂN VẬT để đối chiếu và loại dần những người không phù hợp. Loại nhầm thì bấm lại hồ sơ đó để khôi phục.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#deb97b] font-mono font-bold">3.</span>
              <p className="m-0">Bấm &quot;Bản kết luận&quot; để công bố phán đoán, nhận Bảng điểm nghiệp vụ và thăng cấp Thám tử.</p>
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <Button
          className="gold-button w-full h-9 sm:h-10 font-bold text-xs sm:text-sm tracking-wide justify-center shadow-[0_4px_18px_rgba(222,185,123,0.25)]"
          onClick={() => onOpenChange(false)}
        >
          Mình đã hiểu rõ<ArrowRight size={15} className="ml-1.5" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
