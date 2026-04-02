"use client";

import type { ReactNode } from "react";

export function IntakeFieldLabel({ children }: { children: ReactNode }) {
    return <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">{children}</p>;
}
