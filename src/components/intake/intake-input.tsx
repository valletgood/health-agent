"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type IntakeInputProps = ComponentPropsWithoutRef<"input">;

export const IntakeInput = ({ className, ...props }: IntakeInputProps) => {
    return (
        <input
            className={cn(
                "w-full bg-white border-none rounded-xl px-4 py-3",
                "text-foreground placeholder:text-cs-outline-variant text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white",
                "transition-all duration-200",
                className
            )}
            {...props}
        />
    );
};
