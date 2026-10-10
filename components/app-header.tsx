"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, FolderSearch, HelpCircle, LayoutDashboard, BookOpen, ShieldCheck, ShieldAlert, RotateCcw, LogOut, LogIn, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, type UserProfile } from '@/lib/auth-context';
import type { User } from '@supabase/supabase-js';
import { DetectiveHandbookModal } from '@/components/detective-handbook-modal';

export interface AppHeaderProps {
  user?: User | null;
  profile?: UserProfile | null;
  isAdmin?: boolean;
  currentView?: 'selector' | 'game' | 'dashboard' | 'question-bank';
  caseTitle?: string;
  caseNumber?: string;
  onBackToCatalog?: () => void;
  onOpenHelp?: () => void;
  onResetCase?: () => void;
  onSignOut?: () => void;
  onSignIn?: () => void;
  rankTitle?: string;
  careerScore?: number;
}

export function AppHeader({
  user: propUser,
  profile: propProfile,
  isAdmin: propIsAdmin,
  currentView = 'selector',
  caseTitle,
  caseNumber,
  onBackToCatalog,
  onOpenHelp,
  onResetCase,
  onSignOut: propSignOut,
  onSignIn,
  rankTitle = 'Thám tử tập sự',
  careerScore = 0,
}: AppHeaderProps) {
  const auth = useAuth();
  const [internalHandbookOpen, setInternalHandbookOpen] = useState(false);

  // Lấy dữ liệu từ props hoặc fallback về context tự động
  const user = propUser !== undefined ? propUser : auth.user;
  const profile = propProfile !== undefined ? propProfile : auth.profile;
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : auth.isAdmin;
  const handleSignOut = propSignOut || auth.signOut;

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Thám tử';

  const isCaseView = currentView === 'selector' || currentView === 'game';
  const isDashboardView = currentView === 'dashboard';
  const isQuestionBankView = currentView === 'question-bank';

  function handleHandbookClick() {
    if (onOpenHelp) {
      onOpenHelp();
    } else {
      setInternalHandbookOpen(true);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-[64px] bg-[#0c181e]/95 backdrop-blur-md border-b border-[#253a44] px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Cụm trái: Logo & Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            onClick={currentView === 'game' && onBackToCatalog ? (e) => { e.preventDefault(); onBackToCatalog(); } : undefined}
            className="flex items-center gap-2 text-[#deb97b] hover:opacity-90 transition-opacity shrink-0 text-left"
            aria-label="Về trang chủ E·RASE"
          >
            <Search size={22} className="shrink-0" />
            <span className="font-serif text-2xl font-bold tracking-wider">E·RASE</span>
          </Link>

          <span className="h-4 w-px bg-[#354c57] hidden sm:block shrink-0" />

          {currentView === 'selector' && (
            <span className="text-[11px] tracking-widest text-[#8ea49a] uppercase hidden md:inline font-sans font-medium shrink-0">
              TỔNG CỤC THÁM TỬ TOÁN HỌC
            </span>
          )}

          {currentView === 'game' && (
            <div className="flex items-center gap-1.5 text-xs text-[#a3b7ae] truncate">
              <button
                onClick={onBackToCatalog}
                className="hover:text-[#deb97b] transition-colors shrink-0 flex items-center gap-1"
              >
                <FolderSearch size={14} />
                <span className="hidden sm:inline">Danh mục</span>
              </button>
              <ChevronRight size={13} className="text-[#556d78] shrink-0" />
              <span className="text-[#f1ece1] font-medium font-serif truncate">
                {caseNumber ? `Hồ sơ #${caseNumber}: ` : ''}{caseTitle || 'Vụ án'}
              </span>
            </div>
          )}

          {currentView === 'dashboard' && (
            <div className="flex items-center gap-1.5 text-xs text-[#a3b7ae] truncate">
              <Link
                href="/"
                className="hover:text-[#deb97b] transition-colors shrink-0 flex items-center gap-1"
              >
                <FolderSearch size={14} />
                <span className="hidden sm:inline">Danh mục</span>
              </Link>
              <ChevronRight size={13} className="text-[#556d78] shrink-0" />
              <span className="text-[#f1ece1] font-medium font-serif truncate">
                Giám sát & Nhật ký điều tra
              </span>
            </div>
          )}

          {currentView === 'question-bank' && (
            <div className="flex items-center gap-1.5 text-xs text-[#a3b7ae] truncate">
              <Link
                href="/"
                className="hover:text-[#deb97b] transition-colors shrink-0 flex items-center gap-1"
              >
                <FolderSearch size={14} />
                <span className="hidden sm:inline">Danh mục</span>
              </Link>
              <ChevronRight size={13} className="text-[#556d78] shrink-0" />
              <span className="text-[#f1ece1] font-medium font-serif truncate">
                Kho đề bài & Quản lý vụ án
              </span>
            </div>
          )}
        </div>

        {/* Cụm giữa: Điều hướng sắp xếp theo mức độ quan trọng (Vụ án -> Kho đề -> Dashboard -> Sổ tay) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* 1. NÚT VỤ ÁN (Quan trọng nhất) */}
          {currentView === 'game' && onBackToCatalog ? (
            <Button
              variant="ghost"
              onClick={onBackToCatalog}
              className={`h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-md transition-colors ${
                isCaseView
                  ? 'bg-[#1a2f38] text-[#f2ebe0] border border-[#3b5460]'
                  : 'text-[#9eb2a8] hover:text-[#f2ebe0] hover:bg-[#14262f]'
              }`}
            >
              <FolderSearch size={14} className={isCaseView ? 'text-[#deb97b]' : ''} />
              <span className="hidden sm:inline">Vụ án</span>
            </Button>
          ) : (
            <Link
              href="/"
              className={`inline-flex items-center h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-md transition-colors ${
                isCaseView
                  ? 'bg-[#1a2f38] text-[#f2ebe0] border border-[#3b5460]'
                  : 'text-[#9eb2a8] hover:text-[#f2ebe0] hover:bg-[#14262f]'
              }`}
            >
              <FolderSearch size={14} className={isCaseView ? 'text-[#deb97b]' : ''} />
              <span className="hidden sm:inline">Vụ án</span>
            </Link>
          )}

          {/* 2. NÚT KHO ĐỀ (Quản trị nội dung & thiết lập bài tập) - Chỉ Admin */}
          {isAdmin && (
            <Link
              href="/question-bank"
              className={`inline-flex items-center h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-md transition-colors ${
                isQuestionBankView
                  ? 'bg-[#1a2f38] text-[#f2ebe0] border border-[#3b5460]'
                  : 'text-[#9eb2a8] hover:text-[#f2ebe0] hover:bg-[#14262f]'
              }`}
            >
              <BookOpen size={14} className={isQuestionBankView ? 'text-[#deb97b]' : 'text-[#deb97b]/80'} />
              <span className="hidden md:inline">Kho đề</span>
            </Link>
          )}

          {/* 3. NÚT DASHBOARD (Giám sát nhật ký điều tra học sinh) - Chỉ Admin */}
          {isAdmin && (
            <Link
              href="/dashboard"
              className={`inline-flex items-center h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-md transition-colors ${
                isDashboardView
                  ? 'bg-[#1a2f38] text-[#f2ebe0] border border-[#3b5460]'
                  : 'text-[#9eb2a8] hover:text-[#f2ebe0] hover:bg-[#14262f]'
              }`}
            >
              <LayoutDashboard size={14} className={isDashboardView ? 'text-[#8cd2b8]' : 'text-[#8cd2b8]/80'} />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
          )}

          {/* 4. NÚT SỔ TAY THÁM TỬ (Cẩm nang hướng dẫn & luật chơi) */}
          <Button
            variant="ghost"
            onClick={handleHandbookClick}
            className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 text-[#9eb2a8] hover:text-[#f2ebe0] hover:bg-[#14262f] rounded-md transition-colors"
          >
            <HelpCircle size={14} />
            <span className="hidden sm:inline">Sổ tay</span>
          </Button>
        </nav>

        {/* Cụm phải: Tài khoản, Trạng thái & Hành động */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Badge người dùng */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border border-[#2f4550] bg-[#12232a] text-xs">
                {isAdmin ? (
                  <>
                    <ShieldAlert size={14} className="text-[#deb97b]" />
                    <span className="text-[#f1ece1] font-medium">{displayName}</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#2e2313] text-[#deb97b] text-[10px] font-semibold border border-[#785f36]">
                      Admin
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} className="text-[#54c48a]" />
                    <span className="text-[#f1ece1] font-medium">{displayName}</span>
                    <span className="text-[#546b76]">|</span>
                    <span className="text-[#deb97b] font-medium">{rankTitle}</span>
                  </>
                )}
              </div>

              {/* Nút Bắt đầu lại (chỉ hiện khi đang trong màn game) */}
              {currentView === 'game' && onResetCase && (
                <Button
                  variant="ghost"
                  onClick={onResetCase}
                  title="Bắt đầu lại lượt này"
                  className="h-8 px-2 text-[#9eb2a8] hover:text-[#ffb3a6] hover:bg-[#2e1c1c] rounded-md border border-[#30454f]"
                >
                  <RotateCcw size={15} />
                  <span className="hidden xl:inline text-xs ml-1">Làm lại</span>
                </Button>
              )}

              {/* Nút Đăng xuất */}
              <Button
                variant="ghost"
                onClick={handleSignOut}
                title="Đăng xuất"
                className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 text-[#9eb2a8] hover:text-[#f2ebe0] hover:bg-[#1a2f38] border border-[#2d424b] rounded-md"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={onSignIn}
              className="gold-button h-8 px-3 text-xs font-semibold"
            >
              <LogIn size={14} className="mr-1" />
              Đăng nhập
            </Button>
          )}
        </div>
      </header>

      {/* Sổ tay thám tử độc lập dự phòng nếu trang gọi không tự quản lý modal */}
      {!onOpenHelp && (
        <DetectiveHandbookModal
          open={internalHandbookOpen}
          onOpenChange={setInternalHandbookOpen}
        />
      )}
    </>
  );
}
