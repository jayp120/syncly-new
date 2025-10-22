import React from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';

const ThemeToggle: React.FC = () => {
  // Default to user's system preference if available, otherwise 'light'
  const systemPrefersDark = typeof window.matchMedia !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', systemPrefersDark ? 'dark' : 'light');

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative w-[74px] h-[38px] bg-slate-900 rounded-full flex items-center justify-between p-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-slate-950 shadow-inner"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-pressed={theme === 'dark'}
      type="button"
    >
      {/* Sliding thumb */}
      <div
        className="absolute top-[3px] left-[3px] w-8 h-8 bg-white rounded-full shadow-lg transform transition-transform duration-300 ease-in-out"
        style={{ transform: theme === 'dark' ? 'translateX(36px)' : 'translateX(0)' }}
      />

      {/* Icons */}
      <div className="relative z-10 w-8 h-8 flex items-center justify-center">
        <i className={`fas fa-sun transition-colors duration-300 ${theme === 'light' ? 'text-yellow-400' : 'text-slate-500'}`}></i>
      </div>
      <div className="relative z-10 w-8 h-8 flex items-center justify-center">
        <i className={`fas fa-moon transition-colors duration-300 ${theme === 'dark' ? 'text-yellow-300' : 'text-slate-500'}`}></i>
      </div>
    </button>
  );
};

export default ThemeToggle;
