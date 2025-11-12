import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { User } from '../../types';

interface MentionTextareaProps {
  value: string; // Always in markdown format: @[Name](id)
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  wrapperClassName?: string;
  availableUsers?: User[];
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  disabled?: boolean;
}

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
  wrapperClassName = '',
  availableUsers = [],
  onKeyDown,
  disabled = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const editableRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  // Convert markdown to HTML for display
  const markdownToHTML = (markdown: string): string => {
    if (!markdown) return '';
    
    let html = '';
    let lastIndex = 0;
    const regex = new RegExp(MENTION_REGEX.source, 'g');
    let match;
    
    while ((match = regex.exec(markdown)) !== null) {
      // Add text before mention (escape HTML)
      const textBefore = markdown.substring(lastIndex, match.index);
      html += escapeHtml(textBefore);
      
      // Add mention as styled chip
      const name = match[1];
      const id = match[2];
      html += `<span class="mention-chip" data-mention-name="${escapeHtml(name)}" data-mention-id="${escapeHtml(id)}" contenteditable="false">@${escapeHtml(name)}</span>`;
      
      lastIndex = regex.lastIndex;
    }
    
    // Add remaining text (escape HTML)
    html += escapeHtml(markdown.substring(lastIndex));
    
    // Replace newlines with <br>
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Convert contenteditable HTML back to markdown
  const htmlToMarkdown = (element: HTMLDivElement): string => {
    let markdown = '';
    
    const processNode = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        markdown += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        
        if (el.classList && el.classList.contains('mention-chip')) {
          const name = el.getAttribute('data-mention-name') || '';
          const id = el.getAttribute('data-mention-id') || '';
          markdown += `@[${name}](${id})`;
        } else if (el.tagName === 'BR') {
          markdown += '\n';
        } else if (el.tagName === 'DIV' && markdown && !markdown.endsWith('\n')) {
          // Handle div as line break (common in contenteditable)
          markdown += '\n';
          node.childNodes.forEach(processNode);
          return;
        } else {
          // Process children for other elements
          node.childNodes.forEach(processNode);
        }
      }
    };
    
    element.childNodes.forEach(processNode);
    
    return markdown;
  };

  // Save cursor position before updates
  const saveCursorPosition = (): { node: Node | null; offset: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    return {
      node: range.startContainer,
      offset: range.startOffset
    };
  };

  // Restore cursor position after updates
  const restoreCursorPosition = (pos: { node: Node | null; offset: number } | null) => {
    if (!pos || !pos.node) return;
    
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Verify the node is still in the DOM
      if (editableRef.current?.contains(pos.node)) {
        range.setStart(pos.node, Math.min(pos.offset, pos.node.textContent?.length || 0));
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    } catch (e) {
      // Cursor restoration failed, ignore
    }
  };

  // Update contenteditable display when value changes externally
  useEffect(() => {
    if (!editableRef.current || isComposingRef.current) return;
    
    const currentMarkdown = htmlToMarkdown(editableRef.current);
    
    // Only update if value actually changed (avoid unnecessary cursor resets)
    if (currentMarkdown !== value) {
      const cursorPos = saveCursorPosition();
      const html = markdownToHTML(value);
      editableRef.current.innerHTML = html || '';
      
      // Try to restore cursor if we can
      if (cursorPos) {
        restoreCursorPosition(cursorPos);
      }
    }
  }, [value]);

  const handleInput = () => {
    if (!editableRef.current || isComposingRef.current) return;
    
    const newMarkdown = htmlToMarkdown(editableRef.current);
    onChange(newMarkdown);
    
    // Check for @ trigger for autocomplete
    checkForMentionTrigger();
  };

  const checkForMentionTrigger = () => {
    if (availableUsers.length === 0) {
      setShowSuggestions(false);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowSuggestions(false);
      return;
    }
    
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
      const textBeforeCursor = textNode.textContent.substring(0, range.startOffset);
      const atMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (atMatch) {
        setShowSuggestions(true);
        setSuggestionQuery(atMatch[1].toLowerCase());
        setHighlightedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredSuggestions[highlightedIndex]);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredSuggestions[highlightedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Backspace') {
      handleSmartDeletion(e);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Allow enter for new lines, but not if suggestions are showing
      if (showSuggestions) {
        e.preventDefault();
      }
    }

    onKeyDown?.(e);
  };

  const handleSmartDeletion = (e: KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // If there's a selection range, let default behavior handle it
    if (!range.collapsed) return;
    
    // Check if we're right after a mention chip
    let nodeToCheck: Node | null = null;
    
    // Case 1: Cursor is in a text node right after a mention
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
      nodeToCheck = range.startContainer.previousSibling;
    }
    // Case 2: Cursor is in the parent element after a mention
    else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      const childBefore = range.startContainer.childNodes[range.startOffset - 1];
      if (childBefore) {
        nodeToCheck = childBefore;
      }
    }
    
    // If we found a mention chip, delete it
    if (nodeToCheck && 
        nodeToCheck.nodeType === Node.ELEMENT_NODE && 
        (nodeToCheck as HTMLElement).classList.contains('mention-chip')) {
      e.preventDefault();
      (nodeToCheck as Element).remove();
      
      if (editableRef.current) {
        const newMarkdown = htmlToMarkdown(editableRef.current);
        onChange(newMarkdown);
      }
    }
  };

  const insertMention = (user: User) => {
    if (!editableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
      const textBeforeCursor = textNode.textContent.substring(0, range.startOffset);
      const atMatch = textBeforeCursor.match(/@\w*$/);
      
      if (atMatch) {
        // Remove the @ and partial query
        const startOffset = range.startOffset - atMatch[0].length;
        const textAfterCursor = textNode.textContent.substring(range.startOffset);
        
        // Create mention chip
        const mentionSpan = document.createElement('span');
        mentionSpan.className = 'mention-chip';
        mentionSpan.setAttribute('data-mention-name', user.name);
        mentionSpan.setAttribute('data-mention-id', user.id);
        mentionSpan.setAttribute('contenteditable', 'false');
        mentionSpan.textContent = `@${user.name}`;
        
        // Split the text node and insert mention
        const beforeText = textNode.textContent.substring(0, startOffset);
        textNode.textContent = beforeText;
        
        // Insert mention after the text
        const afterTextNode = document.createTextNode(' ' + textAfterCursor);
        textNode.parentNode?.insertBefore(mentionSpan, textNode.nextSibling);
        textNode.parentNode?.insertBefore(afterTextNode, mentionSpan.nextSibling);
        
        // Set cursor after the space
        const newRange = document.createRange();
        newRange.setStart(afterTextNode, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        setShowSuggestions(false);
        
        // Update markdown
        if (editableRef.current) {
          const newMarkdown = htmlToMarkdown(editableRef.current);
          onChange(newMarkdown);
        }
      }
    }
  };

  const getBusinessUnitLabel = (user?: User) => (user?.businessUnitName?.trim() ? user.businessUnitName : 'No BU');
  const filteredSuggestions = availableUsers.filter(user =>
    user.name.toLowerCase().includes(suggestionQuery)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        editableRef.current &&
        !editableRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle composition events (for IME input)
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    handleInput();
  };

  const heightStyle = rows ? { minHeight: `${rows * 1.5}rem` } : {};

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div
        ref={editableRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed overflow-y-auto ${className}`}
        style={heightStyle}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((user, index) => (
            <div
              key={user.id}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur on editable
                insertMention(user);
              }}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === highlightedIndex
                  ? 'bg-indigo-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="font-medium">
                {user.name} <span className="text-xs font-normal opacity-80">({getBusinessUnitLabel(user)})</span>
              </div>
              <div className={`text-xs ${index === highlightedIndex ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {user.email}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
          position: absolute;
        }
        .dark [contenteditable][data-placeholder]:empty:before {
          color: #6B7280;
        }
        .mention-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          background-color: #E0E7FF;
          color: #3730A3;
          cursor: default;
          user-select: none;
        }
        .dark .mention-chip {
          background-color: #312E81;
          color: #C7D2FE;
        }
      `}</style>
    </div>
  );
};

export default MentionTextarea;
