"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, X } from 'lucide-react';

export function AuthModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: 'student' } }
        });
        if (error) throw error;
        alert('Đăng ký thành công! Hãy đăng nhập ngay.');
        setIsLogin(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi xác thực, vui lòng thử lại.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="paper-modal" showCloseButton={false}>
        <button onClick={() => onOpenChange(false)} className="close-button"><X size={19} /></button>
        <DialogHeader>
          <span className="paper-eyebrow">XÁC THỰC THẨM TỬ</span>
          <DialogTitle>{isLogin ? 'Đăng nhập vào hiện trường' : 'Đăng ký hồ sơ điều tra'}</DialogTitle>
          <DialogDescription>
            {isLogin ? 'Nhập tài khoản để ghi nhận tiến độ và nhật ký điều tra.' : 'Tài khoản học sinh mới tham gia khám phá các vụ án.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-[#cbbda280] mb-3">
          <button
            type="button"
            className={`flex-1 pb-2 text-xs font-bold ${isLogin ? 'text-[#8a663b] border-b-2 border-[#8a663b]' : 'text-[#877d68]'}`}
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`flex-1 pb-2 text-xs font-bold ${!isLogin ? 'text-[#8a663b] border-b-2 border-[#8a663b]' : 'text-[#877d68]'}`}
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
          >
            Đăng ký học sinh
          </button>
        </div>

        {errorMsg && (
          <p className="math-feedback text-xs text-[#a04b39] flex items-center gap-1">
            <AlertCircle size={14} /> {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isLogin && (
            <div>
              <label className="text-xs text-[#6e6a59] font-semibold block mb-1">Họ và tên thám tử</label>
              <Input
                required
                className="math-input text-sm"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-[#6e6a59] font-semibold block mb-1">Email</label>
            <Input
              type="email"
              required
              className="math-input text-sm"
              placeholder="admin1@erase.edu.vn hoặc email của bạn"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[#6e6a59] font-semibold block mb-1">Mật khẩu</label>
            <Input
              type="password"
              required
              className="math-input text-sm"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="gold-button w-full mt-2 justify-center">
            {loading ? 'Đang kiểm tra…' : isLogin ? 'Bắt đầu điều tra' : 'Tạo hồ sơ'}
          </Button>
        </form>

        <p className="text-[11px] text-[#8e856f] mt-2 text-center">
          5 Admin mặc định: <code className="text-[#8a663b]">admin1@erase.edu.vn</code> (Pass: <code className="text-[#8a663b]">Password@123</code>)
        </p>
      </DialogContent>
    </Dialog>
  );
}
