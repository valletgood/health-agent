"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Activity, History, User, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { href: "/", label: "문진", icon: ClipboardList },
    { href: "/tracker", label: "일지", icon: Activity },
    { href: "/history", label: "기록", icon: History },
] as const;

// /chat 경로에서는 숨김
const HIDDEN_PATHS = ["/chat"];

export function BottomNav() {
    const pathname = usePathname();
    const { user, isLoading, signInWithGoogle, signOut } = useAuth();

    if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-2xl mx-auto flex items-center justify-around h-16">
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors",
                                    isActive ? "text-primary" : "text-cs-outline-variant hover:text-cs-on-surface-variant",
                                )}>
                                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                                <span className={cn("text-[10px] font-bold", isActive && "text-primary")}>{label}</span>
                            </Link>
                        );
                    })}

                    {/* 프로필 / 로그인 */}
                    {!isLoading && (
                        user ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm("로그아웃 하시겠어요?")) {
                                        void signOut();
                                    }
                                }}
                                className="flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors text-cs-outline-variant hover:text-destructive"
                                aria-label="로그아웃"
                            >
                                {user.user_metadata?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={user.user_metadata.avatar_url as string}
                                        alt=""
                                        className="w-5 h-5 rounded-full object-cover border border-border"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <LogOut className="w-5 h-5" strokeWidth={2} />
                                )}
                                <span className="text-[10px] font-bold">로그아웃</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void signInWithGoogle()}
                                className="flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors text-cs-outline-variant hover:text-cs-on-surface-variant"
                                aria-label="로그인"
                            >
                                <User className="w-5 h-5" strokeWidth={2} />
                                <span className="text-[10px] font-bold">로그인</span>
                            </button>
                        )
                    )}
                </div>
            </nav>
        </>
    );
}
