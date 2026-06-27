"use client";

import type { ReactNode } from "react";

interface ModalShellProps {
  open: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

export const ModalShell = ({
  open,
  title,
  description,
  footer,
  children,
  onClose,
}: ModalShellProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-8 backdrop-blur-md">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/95 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-zinc-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6 sm:px-8">
          {children}
        </div>
        {footer && (
          <div className="border-t border-white/10 px-6 py-4 sm:px-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
