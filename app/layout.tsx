import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "E·RASE — Chiếc huy hiệu biến mất",
  description: "Sửa lỗi Toán, khôi phục dữ liệu và đối chiếu hồ sơ nhân vật để tìm người đã di chuyển chiếc huy hiệu. Một vụ án chơi thử của E·RASE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
