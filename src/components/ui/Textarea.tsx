"use client";

import { forwardRef } from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, className = "", id, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={textareaId}
            className={`label ${required ? "label-required" : ""}`}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`input min-h-[100px] resize-y ${error ? "input-error" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-accent-500 mt-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
