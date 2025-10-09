// components/ui/TiptapEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import { Bold, Italic, Strikethrough, Heading2, List, ListOrdered } from 'lucide-react';
import { Button } from './button';
import { useEffect } from 'react';

// Deklarasi tipe untuk FontSize
type FontSizeOptions = {
  types: string[];
};

// Extend Commands interface untuk TypeScript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

// Ekstensi FontSize
export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',
  
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

// MenuBar Component
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const handleFontSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value) {
      editor.chain().focus().setFontSize(value).run();
    } else {
      editor.chain().focus().unsetFontSize().run();
    }
  };

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();
  const toggleH2 = () => editor.chain().focus().toggleHeading({ level: 2 }).run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();

  return (
    <div className="border border-input bg-transparent rounded-t-md p-2 flex flex-wrap items-center gap-2">
      <select
        onChange={handleFontSizeChange}
        value={editor.getAttributes('textStyle').fontSize || ''}
        className="bg-background border border-input rounded-md px-2 py-1 text-sm h-9"
      >
        <option value="">Default</option>
        <option value="12px">Kecil</option>
        <option value="16px">Normal</option>
        <option value="20px">Besar</option>
        <option value="24px">Sangat Besar</option>
      </select>

      <div className="h-6 border-l border-gray-300 mx-1"></div>

      <Button
        type="button"
        onClick={toggleBold}
        variant={editor.isActive('bold') ? 'default' : 'outline'}
        size="sm"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        onClick={toggleItalic}
        variant={editor.isActive('italic') ? 'default' : 'outline'}
        size="sm"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        onClick={toggleStrike}
        variant={editor.isActive('strike') ? 'default' : 'outline'}
        size="sm"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        onClick={toggleH2}
        variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
        size="sm"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        onClick={toggleBulletList}
        variant={editor.isActive('bulletList') ? 'default' : 'outline'}
        size="sm"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        onClick={toggleOrderedList}
        variant={editor.isActive('orderedList') ? 'default' : 'outline'}
        size="sm"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Props interface
interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Main TiptapEditor Component
export function TiptapEditor({ value, onChange, placeholder }: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // ✅ Perbaikan untuk SSR di Next.js
    extensions: [StarterKit, TextStyle, FontSize],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[200px]',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input bg-background rounded-md">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}