import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
    return (
        <div
            className={`bg-white rounded-xl border border-surface-200 shadow-sm ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
