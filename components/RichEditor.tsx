import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, List, ListOrdered, Image as ImageIcon, 
  Heading1, Heading2, Quote, Undo, Redo 
} from 'lucide-react';

interface RichEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  className?: string;
  minHeight?: string;
}

const RichEditor: React.FC<RichEditorProps> = ({ initialContent, onChange, className = '', minHeight = '300px' }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Initialize content
  useEffect(() => {
    if (contentRef.current && !isTyping) {
      if (contentRef.current.innerHTML !== initialContent) {
        contentRef.current.innerHTML = initialContent;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const handleInput = () => {
    if (contentRef.current) {
      setIsTyping(true);
      onChange(contentRef.current.innerHTML);
    }
  };

  const handleBlur = () => {
    setIsTyping(false);
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      contentRef.current.focus();
      handleInput();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgUrl = e.target?.result as string;
        execCommand('insertImage', imgUrl);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Paste (specifically for images)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imgUrl = event.target?.result as string;
            execCommand('insertImage', imgUrl);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const ToolbarButton = ({ 
    icon: Icon, 
    command, 
    arg, 
    label 
  }: { 
    icon: React.ElementType, 
    command: string, 
    arg?: string, 
    label: string 
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss
        execCommand(command, arg);
      }}
      className="p-2 hover:bg-slate-200 text-slate-600 rounded transition-colors"
      title={label}
      type="button"
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 flex-wrap">
        <ToolbarButton icon={Bold} command="bold" label="Bold" />
        <ToolbarButton icon={Italic} command="italic" label="Italic" />
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <ToolbarButton icon={Heading1} command="formatBlock" arg="H1" label="Heading 1" />
        <ToolbarButton icon={Heading2} command="formatBlock" arg="H2" label="Heading 2" />
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <ToolbarButton icon={List} command="insertUnorderedList" label="Bullet List" />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" label="Numbered List" />
        <ToolbarButton icon={Quote} command="formatBlock" arg="blockquote" label="Quote" />
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button
          onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
          className="p-2 hover:bg-slate-200 text-slate-600 rounded transition-colors"
          title="Insert Image"
        >
          <ImageIcon size={18} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageUpload} 
        />
        <div className="flex-grow"></div>
        <ToolbarButton icon={Undo} command="undo" label="Undo" />
        <ToolbarButton icon={Redo} command="redo" label="Redo" />
      </div>

      {/* Editor Area */}
      <div 
        className="flex-grow p-4 overflow-y-auto bg-white editor-content"
        onClick={() => contentRef.current?.focus()}
      >
        <div
          ref={contentRef}
          contentEditable
          className="outline-none"
          style={{ minHeight }}
          onInput={handleInput}
          onBlur={handleBlur}
          onPaste={handlePaste}
        />
      </div>
    </div>
  );
};

export default RichEditor;
