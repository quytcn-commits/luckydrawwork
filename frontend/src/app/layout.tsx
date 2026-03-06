import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "LuckyDraw – Nền tảng quay thưởng sự kiện",
  description: "Tạo phòng quay thưởng chuyên nghiệp trong 2 phút. Đăng ký qua QR Code, hiển thị realtime, quay thưởng minh bạch cho sự kiện doanh nghiệp.",
  keywords: "quay thưởng, lucky draw, sự kiện, event, QR code, quay số, bốc thăm",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
