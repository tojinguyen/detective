import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: 'student' }
          }
        });
        if (error) throw error;
        setSuccessMsg('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
        setIsLogin(true);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="paper-modal w-full max-w-md bg-[#132229] border border-[#a88a5d] text-[#e8e2d5] p-6 rounded-lg shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#9caba2] hover:text-[#e0b875]"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <p className="paper-eyebrow text-[#cfa86e] text-xs font-bold tracking-widest">E·RASE BẢO MẬT</p>
          <h2 className="text-2xl font-serif text-[#f2e5cf] mt-1">
            {isLogin ? 'Nhận diện thám tử' : 'Đăng ký hồ sơ điều tra'}
          </h2>
        </div>

        <div className="flex border-b border-[#3d5053] mb-5">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${isLogin ? 'text-[#e0b875] border-b-2 border-[#e0b875]' : 'text-[#81948e]'}`}
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${!isLogin ? 'text-[#e0b875] border-b-2 border-[#e0b875]' : 'text-[#81948e]'}`}
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
          >
            Đăng ký học sinh
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-[#3a2020] border border-[#d3765e] text-[#f29a7e] rounded mb-4 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-[#203a27] border border-[#7e9473] text-[#b5d1ac] rounded mb-4 text-xs">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {!isLogin && (
            <div>
              <label className="block text-xs text-[#9caba2] mb-1 font-medium">Họ và tên thám tử</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687670]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0c181d] border border-[#485b56] rounded text-[#eee7d8] focus:border-[#c5a16e] outline-none"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#9caba2] mb-1 font-medium">Email định danh</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687670]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0c181d] border border-[#485b56] rounded text-[#eee7d8] focus:border-[#c5a16e] outline-none"
                placeholder="thamtu@erase.edu.vn"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#9caba2] mb-1 font-medium">Mật khẩu</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687670]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0c181d] border border-[#485b56] rounded text-[#eee7d8] focus:border-[#c5a16e] outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-gradient-to-r from-[#cca66e] to-[#a9824f] text-[#142329] font-bold rounded shadow hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Đang xác minh...' : isLogin ? 'Vào hiện trường' : 'Tạo thẻ điều tra'}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-[#23353b] text-center text-xs text-[#718580]">
          Mặc định 5 Admin có sẵn: <code className="text-[#deb97b]">admin1@erase.edu.vn</code> (Mật khẩu: <code className="text-[#deb97b]">Password@123</code>)
        </div>
      </div>
    </div>
  );
};
