"use client";

import type { ReactNode } from "react";

interface IntakeSectionCardProps {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}

export function IntakeSectionCard({ icon, title, children }: IntakeSectionCardProps) {
    return (
        <section className="bg-secondary rounded-2xl p-7 space-y-5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-cs-on-primary-container flex-shrink-0">{icon}</div>
                <h2 className="text-lg font-bold text-cs-on-surface-strong">{title}</h2>
            </div>
            {children}
        </section>
    );
}
