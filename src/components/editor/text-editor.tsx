'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Heading1, Heading2 } from 'lucide-react';
import { EditorActions } from './editor-actions';
import { clsx } from 'clsx';
import { useState } from 'react';

const DEFAULT_CONTENT = `<p>Hello, I am the JeFocus distraction-free text editor.</p><p>Here you can write plain text without distractions.</p><p>I support Markdown syntax and I will save your text automatically to your profile. However, since I am still in beta, please consider saving your text regularly by using the download function on the right.</p><p>Have a relaxing, distraction-free time with your writing :)</p>`;

const EDITOR_CLASS = 'outline-none min-h-[60vh] prose prose-neutral max-w-none text-brand-text leading-relaxed font-[family-name:var(--font-inconsolata)]';

export function TextEditor() {
  const [showMenu, setShowMenu] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      CharacterCount,
    ],
    content: DEFAULT_CONTENT,
    editorProps: {
      attributes: { class: EDITOR_CLASS },
    },
    onSelectionUpdate: () => setShowMenu(true),
    onBlur: () => setShowMenu(false),
  });

  return (
    <>
      <EditorActions
        editor={editor}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview((v) => !v)}
      />

      {editor && showMenu && !isPreview && (
        <div className="fixed left-1/2 -translate-x-1/2 top-24 flex items-center gap-0.5 bg-[#ffffff] shadow-md rounded-xl p-1 border border-brand-hairline z-50 animate-fade-in-up">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={clsx(
              'px-2 py-1 rounded-lg text-sm font-bold transition-all',
              editor.isActive('bold') ? 'bg-brand-surface text-brand-text' : 'text-brand-muted hover:bg-brand-light'
            )}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={clsx(
              'px-2 py-1 rounded-lg text-sm italic transition-all',
              editor.isActive('italic') ? 'bg-brand-surface text-brand-text' : 'text-brand-muted hover:bg-brand-light'
            )}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={clsx(
              'flex items-center justify-center px-2 py-1 rounded-lg transition-all',
              editor.isActive('heading', { level: 1 }) ? 'bg-brand-surface text-brand-text' : 'text-brand-muted hover:bg-brand-light'
            )}
          >
            <Heading1 size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={clsx(
              'flex items-center justify-center px-2 py-1 rounded-lg transition-all',
              editor.isActive('heading', { level: 2 }) ? 'bg-brand-surface text-brand-text' : 'text-brand-muted hover:bg-brand-light'
            )}
          >
            <Heading2 size={14} />
          </button>
        </div>
      )}

      <div className="max-w-[690px] mx-auto px-8 py-12">
        {isPreview ? (
          <div
            className={EDITOR_CLASS}
            dangerouslySetInnerHTML={{ __html: editor?.getHTML() ?? '' }}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </>
  );
}
