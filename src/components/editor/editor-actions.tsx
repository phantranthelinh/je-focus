'use client';

import { Download } from 'lucide-react';
import type { Editor } from '@tiptap/react';

type Props = {
  editor: Editor | null;
};

function getPlainText(html: string): string {
  if (typeof window === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
}

export function EditorActions({ editor }: Props) {
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

  return (
    <div className="fixed top-20 right-6 flex items-center gap-3 z-40">
      <span className="text-sm text-black/40 tabular-nums">
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </span>
      <button
        onClick={handleDownload}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/60 backdrop-blur text-black/40 hover:text-black/70 hover:bg-white/80 transition-all shadow-sm"
        aria-label="Download as text"
      >
        <Download size={16} />
      </button>
    </div>
  );
}
