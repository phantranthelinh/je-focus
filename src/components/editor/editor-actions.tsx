'use client';

import { Download, Eye, EyeOff, Check } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useAuthSafe as useAuth } from '@/lib/clerk-hooks';
import { clsx } from 'clsx';

type Props = {
  editor: Editor | null;
  isPreview: boolean;
  onTogglePreview: () => void;
};

function getPlainText(html: string): string {
  if (typeof window === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
}

export function EditorActions({ editor, isPreview, onTogglePreview }: Props) {
  const { isSignedIn } = useAuth();

  const wordCount = editor
    ? ((editor.storage as { characterCount?: { words?: () => number } })?.characterCount?.words?.() ?? 0)
    : 0;

  const handleDownload = () => {
    if (!editor) return;
    const text = getPlainText(editor.getHTML());
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'note.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (!editor || !isSignedIn) return;
    // Save placeholder — persistence not implemented yet
  };

  const btnClass = 'flex items-center justify-center w-9 h-9 rounded-full bg-[#faf9f5] border border-brand-hairline text-brand-muted/60 hover:text-brand-muted hover:bg-brand-light transition-all shadow-sm';

  return (
    <>
      {/* Top-right icons */}
      <div className="fixed top-20 right-6 flex items-center gap-2 z-40">
        {/* Preview toggle */}
        <button
          onClick={onTogglePreview}
          className={clsx(btnClass, isPreview && 'text-black/70 bg-white/80')}
          aria-label={isPreview ? 'Edit' : 'Preview'}
        >
          {isPreview ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        {/* Save (auth-gated) */}
        <button
          onClick={handleSave}
          disabled={!isSignedIn}
          className={clsx(btnClass, !isSignedIn && 'opacity-30 cursor-not-allowed')}
          aria-label={isSignedIn ? 'Save' : 'Sign in to save'}
          title={isSignedIn ? 'Save' : 'Sign in to save'}
        >
          <Check size={16} />
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className={btnClass}
          aria-label="Download as text"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Bottom-right word count */}
      <div className="fixed bottom-6 right-6 z-40">
        <span className="text-sm text-brand-muted/50 tabular-nums font-[family-name:var(--font-inconsolata)]">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>
    </>
  );
}
