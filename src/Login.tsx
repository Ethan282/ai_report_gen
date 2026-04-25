import { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, User, ShieldCheck } from 'lucide-react';
import turnitinLogoSrc from './lib/asset/330px-Turnitin_logo_(2021).svg.png';

interface LoginProps {
  onLogin: () => void;
}

// Simple hardcoded credentials — change as needed
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'kolkata@1';

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 900));

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      onLogin();
    } else {
      setError('Invalid username or password. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/40 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-100/60 border border-white/60 p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600/10 rounded-2xl p-3 mb-4">
              <img src={turnitinLogoSrc} alt="Turnitin" className="h-9 w-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Turnitin Report Generator</h1>
            <p className="text-sm text-gray-400 mt-1">Sign in to access your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="w-full pl-10 pr-4 h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-10 pr-12 h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Hint */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Credentials are required to access the report generator.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 ai_check_by_tufan · All processing is client-side
        </p>
      </motion.div>
    </div>
  );
}
