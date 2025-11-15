import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles, Stars, X } from 'lucide-react';
import { askJay, JayMessage, JayVariant } from '../../services/aiAssistantService';
import useLocalStorage from '../../hooks/useLocalStorage';
import { User } from '../../types';

type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isPending?: boolean;
  isError?: boolean;
  timestamp: number;
};

const VARIANT_COPY: Record<
  JayVariant,
  {
    greeting: string;
    subtitle: string;
    badge: string;
    suggestions: string[];
    placeholder: string;
  }
> = {
  app: {
    greeting:
      "Hey, I'm Jay—your Syncly co-pilot. Need help with EODs, leave flows, announcements, or performance insights? Ask away!",
    subtitle: 'Smarter workflows in one chat',
    badge: 'Jay • Syncly AI',
    suggestions: [
      'Give me ideas to improve EOD consistency for my team.',
      'Walk me through setting up an HR announcement board.',
      'How do I coach someone using Performance Hub insights?',
      "What's the best way to plan future leaves in Syncly?",
    ],
    placeholder: 'Ask Jay anything about Syncly...',
  },
  landing: {
    greeting:
      "Hey, I'm Jay—your Syncly tour guide. Curious about our AI-native workspace assistant or pricing? I can help you explore before you sign up.",
    subtitle: 'Ask about pricing, features, and onboarding',
    badge: 'Chat with Jay • Syncly',
    suggestions: [
      'How is Syncly different from other ops tools?',
      'Show me the AI features teams love.',
      'What plans do you offer and what’s included?',
      'How do I book a live demo with your team?',
    ],
    placeholder: 'Ask Jay about Syncly’s product or plans...',
  },
};

const createGreeting = (variant: JayVariant): ConversationMessage => ({
  id: `jay-greeting-${variant}`,
  role: 'assistant',
  content: VARIANT_COPY[variant].greeting,
  timestamp: Date.now(),
});

interface JayAssistantProps {
  onDeactivate?: () => void;
  currentUser?: User | null;
  variant?: JayVariant;
}

const JayAssistant: React.FC<JayAssistantProps> = ({
  onDeactivate,
  currentUser = null,
  variant = 'app',
}) => {
  const copy = VARIANT_COPY[variant];
  const storageKey = variant === 'landing' ? 'jay_assistant_history_landing_v1' : 'jay_assistant_history_app_v1';
  const panelStateKey =
    variant === 'landing' ? 'jay_assistant_is_open_landing' : 'jay_assistant_is_open_app';

  const [messages, setMessages] = useLocalStorage<ConversationMessage[]>(storageKey, []);
  const [isPanelOpen, setIsPanelOpen] = useLocalStorage<boolean>(panelStateKey, false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [draftSuggestion, setDraftSuggestion] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([createGreeting(variant)]);
    }
  }, [messages.length, setMessages, variant]);

  useEffect(() => {
    if (!isPanelOpen) return;
    const el = bodyRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
    return () => window.clearTimeout(id);
  }, [isPanelOpen]);

  const handleTogglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const pushMessage = useCallback(
    (message: ConversationMessage) => {
      setMessages((prev) => [...prev, message]);
    },
    [setMessages]
  );

  const updateMessage = useCallback(
    (id: string, updater: (message: ConversationMessage) => ConversationMessage) => {
      setMessages((prev) => prev.map((message) => (message.id === id ? updater(message) : message)));
    },
    [setMessages]
  );

  const buildContextMessage = useMemo<JayMessage>(() => {
    if (!currentUser) {
      return {
        role: 'user',
        content:
          'You are chatting with a visitor on the Syncly website. They have not logged in yet. Introduce Syncly clearly and focus on explaining value, pricing, AI capabilities, and onboarding steps.',
      };
    }

    const fullName = currentUser.name ?? 'Syncly user';
    const designation = currentUser.designation ?? currentUser.roleName ?? 'Member';
    const org = currentUser.tenant?.companyName ?? currentUser.tenantId ?? 'their workspace';

    const privileges: string[] = [];
    if (currentUser.isPlatformAdmin) privileges.push('Platform Admin');
    if (currentUser.isTenantAdmin) privileges.push('Tenant Admin');
    if (currentUser.roleName) privileges.push(currentUser.roleName);

    return {
      role: 'user',
      content: `Context about the person you're helping:
- Name: ${fullName}
- Role/Designation: ${designation}
- Organization: ${org}
- Privileges: ${privileges.length ? privileges.join(', ') : 'Standard employee'}

Use this context to tailor your advice.`,
    };
  }, [currentUser]);

  const conversationForJay = useCallback(
    (nextMessages?: ConversationMessage[]): JayMessage[] => {
      const source = nextMessages ?? messages;
      const relevant = source.filter((message) => !(message.role === 'assistant' && message.isPending));

      return [buildContextMessage, ...relevant.map((message) => ({
        role: message.role,
        content: message.content,
      }))];
    },
    [messages, buildContextMessage]
  );

  const handleSend = async (prompt?: string) => {
    if (isSending) return;
    const trimmed = (prompt ?? input).trim();
    if (!trimmed) return;

    setDraftSuggestion(null);
    setInput('');
    setIsSending(true);

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const assistantPlaceholder: ConversationMessage = {
      id: `jay-${Date.now()}`,
      role: 'assistant',
      content: '',
      isPending: true,
      timestamp: Date.now(),
    };

    const optimisticState = [...messages, userMessage, assistantPlaceholder];
    setMessages(optimisticState);

    try {
      const response = await askJay(conversationForJay(optimisticState), { variant });
      updateMessage(assistantPlaceholder.id, (msg) => ({
        ...msg,
        content: response,
        isPending: false,
        isError: false,
      }));
    } catch (error: any) {
      const errorCode = error?.code;
      if (errorCode === 'JAY_DISABLED') {
        onDeactivate?.();
        setIsPanelOpen(false);
        return;
      }

      updateMessage(assistantPlaceholder.id, (msg) => ({
        ...msg,
        content: error?.message || 'Jay is having trouble responding right now.',
        isPending: false,
        isError: true,
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setDraftSuggestion(suggestion);
    setInput(suggestion);
    handleSend(suggestion);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  if (variant === 'app' && !currentUser) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end space-y-3 text-gray-900 sm:bottom-5 sm:right-5">
      <div
        aria-hidden={!isPanelOpen}
        className={`pointer-events-auto flex w-[268px] max-h-[60vh] flex-col gap-3 rounded-[22px] border border-slate-100 bg-white/95 p-3 shadow-[0_16px_35px_rgba(15,23,42,0.2)] backdrop-blur-xl transition-all duration-300 origin-bottom-right sm:w-[310px] sm:max-h-[68vh] sm:p-4 dark:border-slate-700/60 dark:bg-slate-900/90 ${
          isPanelOpen
            ? 'translate-y-0 scale-100 opacity-100 visible'
            : 'translate-y-4 scale-95 opacity-0 invisible'
        }`}
      >
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/95 px-3 py-2 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/90">
          <div className="flex flex-1 items-center gap-2.5">
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-500">
              <Stars size={17} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{copy.badge}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTogglePanel}
            className="rounded-2xl border border-slate-200/80 bg-white/70 p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900/70"
            aria-label="Close Jay"
          >
            <X size={14} />
          </button>
        </div>

        <div
          ref={bodyRef}
          className="thin-scrollbar flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-100/80 bg-white/90 px-3 py-3 pr-1.5 text-sm shadow-inner min-h-[120px] max-h-[38vh] sm:max-h-[45vh] dark:border-slate-800/70 dark:bg-slate-900/60"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] sm:max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug shadow-sm ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-br from-indigo-50 via-white to-white text-slate-900 border border-indigo-100/70 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                } ${message.isError ? 'border border-rose-200 dark:border-rose-400/60' : ''}`}
              >
                {message.isPending ? (
                  <span className="flex items-center gap-2 text-slate-500">
                    <Loader2 size={14} className="animate-spin" />
                    Crafting a response...
                  </span>
                ) : (
                  <div className="space-y-1 whitespace-pre-line">
                    {message.role === 'assistant' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
                        <Stars size={12} />
                        Jay
                      </span>
                    )}
                    <span className="block text-[13px] leading-relaxed text-current">{message.content}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!messages.some((msg) => msg.role === 'user') && (
            <div className="flex flex-wrap gap-2 pt-1">
              {copy.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-full border border-slate-200/80 px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-inner transition focus-within:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/70">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={draftSuggestion ?? copy.placeholder}
            rows={2}
            className="w-full resize-none rounded-2xl bg-transparent px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              Powered by Gemini - Optimized for Syncly
            </span>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending}
              className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {isSending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  Send
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none h-14 sm:h-16">
        <button
          type="button"
          onClick={handleTogglePanel}
          className={`pointer-events-auto group flex h-full items-center gap-3 rounded-full border border-white/30 bg-white/95 px-4 py-2.5 text-left shadow-xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-2xl dark:border-slate-700/60 dark:bg-slate-900/85 ${
            isPanelOpen ? 'translate-y-1 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg">
            <Sparkles size={20} className="animate-pulse" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {variant === 'landing' ? 'Ask Jay about Syncly' : 'Jay is here'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {variant === 'landing' ? 'Pricing, AI features, onboarding' : 'Ask anything about Syncly'}
            </p>
          </div>
          <Bot size={22} className="text-indigo-500" />
        </button>
      </div>
    </div>
  );
};

export default JayAssistant;
