import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Input from '../Common/Input';
import Button from '../Common/Button';
import { APP_NAME } from '../../constants';
import Alert from '../Common/Alert';
// FIX: Corrected react-router-dom import to use a standard named import.
import { useNavigate, Link } from "react-router-dom";


const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSuperAdminAccess = () => {
    const secretCode = prompt('🔒 Enter Super Admin Access Code:');
    const SUPER_ADMIN_CODE = 'SYNCLY2025'; // Change this to your own secret code
    
    if (secretCode === SUPER_ADMIN_CODE) {
      navigate('/super-admin');
    } else if (secretCode !== null) {
      alert('❌ Invalid access code');
    }
  };

  useEffect(() => {
    if (currentUser) {
      // The router in App.tsx will now handle directing to the correct dashboard
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password, or account is suspended.');
    }
  };

  return (
    <div 
      className="w-full h-screen flex items-center justify-center p-4"
    >
      <div className="bg-surface-primary/70 dark:bg-dark-surface-primary/70 backdrop-blur-xl p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-border-primary dark:border-dark-border">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-primary to-secondary dark:from-sky-500 dark:to-cyan-400 text-white p-4 rounded-full mb-4 shadow-lg">
            <i className="fas fa-infinity text-3xl"></i>
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary dark:from-sky-400 dark:to-cyan-400">{APP_NAME}</h1>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-1">The Future. In Sync.</p>
        </div>
        
        {error && <Alert type="error" message={error} />}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            autoComplete="email"
          />
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading} size="lg">
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-6 text-center">
            By signing in, you agree to our{' '}
            <Link to="/terms-of-service" className="text-primary hover:underline">
                Terms of Service
            </Link>.
            <br />
            &copy; {new Date().getFullYear()} Syncly. All rights reserved.
        </p>
        
        {/* Super Admin Access - Owner Only */}
        <button
          type="button"
          onClick={handleSuperAdminAccess}
          className="mt-4 w-full py-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 transition-colors opacity-50 hover:opacity-100"
        >
          Admin Setup
        </button>
      </div>
    </div>
  );
};

export default LoginForm;