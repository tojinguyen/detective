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
        className="detective-handbook-modal help-modal !max-w-2xl p-6 sm:p-7 border border-[#3c545e] bg-gradient-to-br from-[#15272e] to-[#0c181e] text-[#f1ece1] rounded-2xl shadow-[0_35px_120px_rgba(0,0,0,0.85)]"
        showCloseButton={true}
      >
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#deb97b] uppercase">
            <BookOpen size={16} />
            <span>SỔ TAY THÁM TỬ TOÁN HỌC</span>
          </div>
          <DialogTitle className="text-2xl font-serif font-bold text-[#f4efe4] tracking-wide">
            Tự mình bước vào hiện trường
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9eb2a8] leading-relaxed">
            Cẩm nang hướng dẫn điều tra hiện trường, phát hiện sai sót toán học và truy tìm thủ phạm.
          </DialogDescription>
        </DialogHeader>

        {/* 3 Bước điều tra chính */}
        <div className="space-y-2.5 my-2">
          <div className="flex items-start gap-3.5 p-3 sm:p-3.5 rounded-xl bg-[#0f1f26]/90 border border-[#233b47] hover:border-[#3a5866] transition-colors">
            <span className="font-serif text-2xl font-bold text-[#deb97b] shrink-0 w-8">01</span>
            <div>
              <strong className="block text-sm font-semibold text-[#f1ece1] mb-0.5">Chọn căn phòng</strong>
              <p className="text-xs text-[#9eb2a8] leading-relaxed m-0">
                Bấm vào từng căn phòng; thám tử sẽ tự động di chuyển tới cửa để tiếp cận vật chứng.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 sm:p-3.5 rounded-xl bg-[#0f1f26]/90 border border-[#233b47] hover:border-[#3a5866] transition-colors">
            <span className="font-serif text-2xl font-bold text-[#deb97b] shrink-0 w-8">02</span>
            <div>
              <strong className="block text-sm font-semibold text-[#f1ece1] mb-0.5">Kiểm tra & Sửa lỗi</strong>
              <p className="text-xs text-[#9eb2a8] leading-relaxed m-0">
                Bấm Điều tra. Tìm bước biến đổi sai đầu tiên, sau đó sửa lại cho đúng để giải mã manh mối bị phong ấn.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 sm:p-3.5 rounded-xl bg-[#0f1f26]/90 border border-[#233b47] hover:border-[#3a5866] transition-colors">
            <span className="font-serif text-2xl font-bold text-[#deb97b] shrink-0 w-8">03</span>
            <div>
              <strong className="block text-sm font-semibold text-[#f1ece1] mb-0.5">Đối chiếu & Kết luận</strong>
              <p className="text-xs text-[#9eb2a8] leading-relaxed m-0">
                Manh mối sẽ tự động cập nhật vào Bảng hồ sơ. Mở khóa Buồng an ninh cuối cùng để xác định duy nhất một thủ phạm.
              </p>
            </div>
          </div>
        </div>

        {/* Chuỗi quy tắc phá án */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#0c181e] border border-[#263e4b] border-l-4 border-l-[#deb97b] space-y-1.5 my-1">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldAlert size={15} className="text-[#deb97b]" />
            <strong className="text-xs font-bold uppercase tracking-wider text-[#ffd78a]">Chuỗi quy tắc phá án</strong>
          </div>
          <p className="text-xs text-[#b9ccc3] leading-relaxed m-0">
            1. Thu thập đủ tất cả manh mối ở các phòng thường để mở khóa Buồng an ninh.
          </p>
          <p className="text-xs text-[#b9ccc3] leading-relaxed m-0">
            2. Ở mức Dễ, dòng có lỗi được khoanh vùng sẵn. Từ mức Trung bình trở lên, hãy rà soát sai lệch trong toàn bộ lời giải.
          </p>
          <p className="text-xs text-[#b9ccc3] leading-relaxed m-0">
            3. Sử dụng nút loại trừ trên Bảng hồ sơ nhân vật để thu hẹp dần các đối tượng nghi vấn.
          </p>
          <p className="text-xs text-[#b9ccc3] leading-relaxed m-0">
            4. Bấm &quot;Bản kết luận&quot; để nộp phán quyết và nhận Bảng điểm nghiệp vụ &amp; thăng cấp Thám tử.
          </p>
        </div>

        {/* Nút hành động */}
        <Button
          className="gold-button w-full h-10 font-bold text-xs sm:text-sm tracking-wide justify-center mt-2 shadow-[0_4px_18px_rgba(222,185,123,0.25)]"
          onClick={() => onOpenChange(false)}
        >
          Mình đã hiểu rõ<ArrowRight size={16} className="ml-1.5" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
