"use client";

export function IntakeHeader() {
    return (
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-sm">
            <div className="flex justify-between items-center px-6 py-4 max-w-3xl mx-auto">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                        </svg>
                    </div>
                    <span className="font-bold text-lg text-cs-on-surface-strong tracking-tight">건강 상담 AI</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none flex-shrink-0" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI 진단 보조</span>
                </div>
            </div>
        </header>
    );
}
