import React, { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const TOOLBAR_BUTTONS = [
  { label: 'B', command: 'bold', tooltip: 'Bold' },
  { label: 'I', command: 'italic', tooltip: 'Italic' },
  { label: 'U', command: 'underline', tooltip: 'Underline' },
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ label, value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    const html = editorRef.current?.innerHTML || '';
    onChange(html);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-semibold text-slate-600 dark:text-slate-200">{label}</label>}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.command}
            type="button"
            title={btn.tooltip}
            className="w-8 h-8 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-sm font-semibold hover:bg-primary/10"
            onClick={() => exec(btn.command)}
          >
            {btn.label}
          </button>
        ))}
        <select
          className="h-8 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-sm px-2"
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'paragraph') exec('formatBlock', 'P');
            if (val === 'h1') exec('formatBlock', 'H1');
            if (val === 'h2') exec('formatBlock', 'H2');
            e.target.value = '';
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Format
          </option>
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading</option>
          <option value="h2">Subheading</option>
        </select>
        <select
          className="h-8 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-sm px-2"
          onChange={(e) => {
            const size = e.target.value;
            if (size) exec('fontSize', size);
            e.target.value = '';
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Size
          </option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">X-Large</option>
        </select>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[180px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-4 py-3 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={handleInput}
      />
    </div>
  );
};

export default RichTextEditor;
