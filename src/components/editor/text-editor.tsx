'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { EditorActions } from './editor-actions';
import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc-client';
import { useAuthSafe as useAuth } from '@/lib/clerk-hooks';

const DEFAULT_CONTENT = `<p>Hello, I am the JeFocus distraction-free text editor.</p><p>Here you can write plain text without distractions.</p><p>I support Markdown syntax and I will save your text automatically to your profile. However, since I am still in beta, please consider saving your text regularly by using the download function on the right.</p><p>Have a relaxing, distraction-free time with your writing :)</p>`;

const EDITOR_CLASS = 'outline-none min-h-[60vh] prose prose-neutral max-w-none text-brand-text leading-relaxed font-[family-name:var(--font-inconsolata)]';

export function TextEditor() {
  const [isPreview, setIsPreview] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const zenRef = useRef(false);
  const contentLoadedRef = useRef(false);

  const { isSignedIn } = useAuth();
  const { data: savedNote } = trpc.note.get.useQuery(undefined, {
    enabled: !!isSignedIn,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      CharacterCount,
    ],
    content: DEFAULT_CONTENT,
    autofocus: false,
    editorProps: {
      attributes: { class: EDITOR_CLASS },
    },
    onFocus: () => setIsEditorFocused(true),
    onBlur: () => setIsEditorFocused(false),
  });

  // Restore saved note once editor + data are both ready
  useEffect(() => {
    if (!editor || !savedNote?.content || contentLoadedRef.current) return;
    contentLoadedRef.current = true;
    editor.commands.setContent(savedNote.content);
  }, [editor, savedNote]);

  useEffect(() => {
    const zen = isHovered || isEditorFocused;
    if (zen !== zenRef.current) {
      zenRef.current = zen;
      document.body.classList.toggle('editor-zen', zen);
    }
    return () => { document.body.classList.remove('editor-zen'); };
  }, [isHovered, isEditorFocused]);

  return (
    <>
      <EditorActions
        editor={editor}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview((v) => !v)}
      />

<div
        className="max-w-[690px] mx-auto px-8 py-12"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
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
