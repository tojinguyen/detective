"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, X } from 'lucide-react';

export function AuthModal({
  open,
  onOpenChange,
  mandatory = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mandatory?: boolean;
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onOpenChange(false);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: 'student' } }
        });
        if (error) throw error;
        if (data?.session) {
          onOpenChange(false);
        } else {
          alert('Đăng ký thành công! Hãy đăng nhập ngay với thông tin vừa tạo.');
          setIsLogin(true);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi xác thực, vui lòng thử lại.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!mandatory) onOpenChange(val); }}>
      <DialogContent
        className="border border-[#40545c] bg-gradient-to-b from-[#162830] to-[#0e1c22] text-[#ede8db] shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-w-md w-[calc(100%-2rem)] p-7 rounded-lg"
        showCloseButton={false}
        overlayClassName="bg-black/35 backdrop-blur-[2px]"
        onPointerDownOutside={(e) => {
          if (mandatory) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (mandatory) e.preventDefault();
        }}
      >
        {!mandatory && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-[#8a9b97] hover:text-[#ede8db] p-1 rounded-full transition-colors"
            aria-label="Đóng"
          >
            <X size={19} />
          </button>
        )}
        <DialogHeader className="gap-1.5">
          <span className="text-[10px] tracking-[2px] font-bold text-[#c9a76c] uppercase">
            XÁC THỰC THÁM TỬ
          </span>
          <DialogTitle className="font-serif text-2xl font-normal text-[#f4eee3] tracking-wide">
            {isLogin ? 'Đăng nhập vào hiện trường' : 'Đăng ký hồ sơ điều tra'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#8c9e9a] leading-relaxed">
            {mandatory
              ? 'Bạn cần đăng nhập hoặc đăng ký tài khoản thám tử để mở khóa hồ sơ hiện trường vụ án.'
              : isLogin
                ? 'Nhập tài khoản để ghi nhận tiến độ và nhật ký điều tra.'
                : 'Tài khoản thám tử mới tham gia khám phá các vụ án.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-[#2d4149] mb-3 mt-1">
          <button
            type="button"
            className={`flex-1 pb-2.5 text-xs font-semibold transition-colors ${
              isLogin
                ? 'text-[#dfbd88] border-b-2 border-[#caa56d]'
                : 'text-[#728580] hover:text-[#a0b2ad]'
            }`}
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`flex-1 pb-2.5 text-xs font-semibold transition-colors ${
              !isLogin
                ? 'text-[#dfbd88] border-b-2 border-[#caa56d]'
                : 'text-[#728580] hover:text-[#a0b2ad]'
            }`}
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
          >
            Đăng ký thám tử
          </button>
        </div>

        {errorMsg && (
          <p className="bg-[#451e18]/50 border border-[#8a3e30] text-xs text-[#f49f90] p-2.5 rounded flex items-center gap-1.5">
            <AlertCircle size={15} /> {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {!isLogin && (
            <div>
              <label className="text-xs text-[#9eb0ab] font-medium block mb-1">
                Họ và tên thám tử
              </label>
              <Input
                required
                className="bg-[#0b171d] border-[#364b52] text-[#f0ece1] placeholder-[#576c67] focus-visible:border-[#c9a76c] focus-visible:ring-[#c9a76c]/30 text-sm h-10"
                placeholder="Thám Tử Học Đường"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-[#9eb0ab] font-medium block mb-1">Email</label>
            <Input
              type="email"
              required
              className="bg-[#0b171d] border-[#364b52] text-[#f0ece1] placeholder-[#576c67] focus-visible:border-[#c9a76c] focus-visible:ring-[#c9a76c]/30 text-sm h-10"
              placeholder="thamtutre@erase.edu.vn hoặc email của bạn"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[#9eb0ab] font-medium block mb-1">Mật khẩu</label>
            <Input
              type="password"
              required
              className="bg-[#0b171d] border-[#364b52] text-[#f0ece1] placeholder-[#576c67] focus-visible:border-[#c9a76c] focus-visible:ring-[#c9a76c]/30 text-sm h-10"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="gold-button w-full mt-2 justify-center">
            {loading ? 'Đang kiểm tra…' : isLogin ? 'Bắt đầu điều tra' : 'Tạo hồ sơ'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
