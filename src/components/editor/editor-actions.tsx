'use client';

import { FileText, Download } from 'lucide-react';
import { useState } from 'react';
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
  const [showCount, setShowCount] = useState(false);

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
    <div className="fixed top-20 right-6 flex flex-col gap-2 z-40">
      {/* Word count */}
      <div className="relative">
        <button
          onMouseEnter={() => setShowCount(true)}
          onMouseLeave={() => setShowCount(false)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/60 backdrop-blur text-black/40 hover:text-black/70 hover:bg-white/80 transition-all shadow-sm"
          aria-label={`${wordCount} words`}
        >
          <FileText size={16} />
        </button>
        {showCount && (
          <div className="absolute right-11 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded-lg">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>
        )}
      </div>

      {/* Download */}
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
