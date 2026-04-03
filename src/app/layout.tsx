import type { Metadata } from "next";
import Script from "next/script";
import { BottomNav } from "@/components/ui/bottom-nav";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
    title: "나음",
    description: "증상을 입력하면 AI가 가능성 분석, 자가관리 방법, 진료 권고 기준을 안내합니다.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" className="antialiased">
            <body className="min-h-screen">
                <AuthProvider>
                    {children}
                    <BottomNav />
                </AuthProvider>
                {process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID && <Script src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`} strategy="afterInteractive" />}
            </body>
        </html>
    );
}
