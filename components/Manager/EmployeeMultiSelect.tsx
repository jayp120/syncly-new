import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';

interface EmployeeMultiSelectProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  teamMembers: User[];
}

const getInitials = (name: string = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

const EmployeeMultiSelect: React.FC<EmployeeMultiSelectProps> = ({ selectedIds, onSelectionChange, teamMembers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedMembers = teamMembers.filter(m => selectedIds.includes(m.id));
  const availableMembers = teamMembers.filter(m => 
    !selectedIds.includes(m.id) &&
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && availableMembers.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [searchTerm, isOpen, availableMembers.length]);

  const handleSelect = (memberId: string) => {
    onSelectionChange([...selectedIds, memberId]);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleDeselect = (memberId: string) => {
    onSelectionChange(selectedIds.filter(id => id !== memberId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % availableMembers.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + availableMembers.length) % availableMembers.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && availableMembers[highlightedIndex]) {
            handleSelect(availableMembers[highlightedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="w-full">
      <label className="block text-sm font-medium text-darktext dark:text-slate-300">Attendees</label>
      <div className="mt-1 relative border border-slate-300 dark:border-slate-600 rounded-lg p-2 min-h-[44px] flex flex-wrap gap-2 items-center bg-white dark:bg-slate-900/50" onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}>
        {selectedMembers.map(member => (
          <span key={member.id} className="flex items-center gap-1.5 bg-primary-light dark:bg-sky-500/20 text-primary dark:text-sky-300 text-sm font-medium pl-2 pr-1 py-1 rounded-full">
            <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
              {getInitials(member.name)}
            </div>
            {member.name}
            <button 
                onClick={(e) => { e.stopPropagation(); handleDeselect(member.id); }} 
                className="ml-1 w-4 h-4 rounded-full bg-primary/20 dark:bg-sky-500/30 text-primary/70 dark:text-sky-300/70 hover:bg-primary/40 dark:hover:bg-sky-500/50 hover:text-primary dark:hover:text-sky-200 flex items-center justify-center transition-colors"
                aria-label={`Remove ${member.name}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedIds.length > 0 ? "Add more..." : "Search team members..."}
          className="flex-grow bg-transparent focus:outline-none text-sm text-darktext dark:text-slate-200 placeholder:text-slate-400"
        />
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {availableMembers.length > 0 ? (
            <ul>
              {availableMembers.map((member, index) => (
                <li
                  key={member.id}
                  onClick={() => handleSelect(member.id)}
                  className={`px-4 py-2 cursor-pointer text-sm text-darktext dark:text-slate-200 flex items-center ${highlightedIndex === index ? 'bg-primary-light dark:bg-slate-700' : 'hover:bg-primary-light dark:hover:bg-slate-700'}`}
                >
                  <div className="w-6 h-6 mr-3 rounded-full bg-secondary text-white text-xs flex items-center justify-center font-bold">
                    {getInitials(member.name)}
                  </div>
                  {member.name} <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">({member.designation})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">No matching members found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeMultiSelect;