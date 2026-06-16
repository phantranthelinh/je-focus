'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Heading1, Heading2 } from 'lucide-react';
import { EditorActions } from './editor-actions';
import { clsx } from 'clsx';
import { useState } from 'react';

export function TextEditor() {
  const [showMenu, setShowMenu] = useState(false);

  const defaultContent = `<p>Hello, I am the JeFocus distraction-free text editor.</p><p>Here you can write plain text without distractions.</p><p>I support Markdown syntax and I will save your text automatically to your profile. However, since I am still in beta, please consider saving your text regularly by using the download function on the right.</p><p>Have a relaxing, distraction-free time with your writing :)</p>`;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      CharacterCount,
    ],
    content: defaultContent,
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[60vh] prose prose-neutral max-w-none text-brand-text leading-relaxed font-[family-name:var(--font-inconsolata)]',
      },
    },
    onSelectionUpdate: () => setShowMenu(true),
    onBlur: () => setShowMenu(false),
  });

  return (
    <>
      <EditorActions editor={editor} />

      {editor && showMenu && (
        <div className="fixed left-1/2 -translate-x-1/2 top-24 flex items-center gap-0.5 bg-white/90 backdrop-blur shadow-lg rounded-xl p-1 border border-black/5 z-50 animate-fade-in-up">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={clsx(
              'px-2 py-1 rounded-lg text-sm font-bold transition-all',
              editor.isActive('bold')
                ? 'bg-brand-light text-brand-text'
                : 'text-black/60 hover:bg-brand-light/50'
            )}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={clsx(
              'px-2 py-1 rounded-lg text-sm italic transition-all',
              editor.isActive('italic')
                ? 'bg-brand-light text-brand-text'
                : 'text-black/60 hover:bg-brand-light/50'
            )}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={clsx(
              'flex items-center justify-center px-2 py-1 rounded-lg transition-all',
              editor.isActive('heading', { level: 1 })
                ? 'bg-brand-light text-brand-text'
                : 'text-black/60 hover:bg-brand-light/50'
            )}
          >
            <Heading1 size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={clsx(
              'flex items-center justify-center px-2 py-1 rounded-lg transition-all',
              editor.isActive('heading', { level: 2 })
                ? 'bg-brand-light text-brand-text'
                : 'text-black/60 hover:bg-brand-light/50'
            )}
          >
            <Heading2 size={14} />
          </button>
        </div>
      )}

      <div className="max-w-[1080px] mx-auto px-8 py-12">
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
