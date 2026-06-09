import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGooglePopup, registerWithEmail, signInWithEmail } from '../firebase';

interface AuthGateProps {
  theme: {
    id: 'quotidian' | 'obsidian' | 'sepia';
    name: string;
    textClass: string;
    textMutedClass: string;
    borderClass: string;
    borderHoverClass: string;
    borderSolidClass: string;
    dividerClass: string;
    quoteMarkColor: string;
    buttonHoverClass: string;
    buttonActiveClass: string;
    fontSerifClass: string;
    fontSansClass: string;
    fontMonoClass: string;
    sentimentBgs: {
      philosophical: string;
      stoic: string;
      ambitious: string;
      serene: string;
      default: string;
    };
  };
  activeTheme: 'quotidian' | 'obsidian' | 'sepia';
  onThemeChange: (themeKey: 'quotidian' | 'obsidian' | 'sepia') => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ theme, activeTheme, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [readerName, setReaderName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgClass = theme.sentimentBgs.default;
  const c_text = theme.textClass;
  const c_textMuted = theme.textMutedClass;
  const c_borderHover = theme.borderHoverClass;
  const c_borderSolid = theme.borderSolidClass;
  const c_divider = theme.dividerClass;
  
  const f_serif = theme.fontSerifClass;
  const f_sans = theme.fontSansClass;
  const f_mono = theme.fontMonoClass;

  const c_bgInverse = theme.id === 'obsidian' ? 'bg-[#EAE8E0]' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]');
  const c_borderFull = theme.id === 'obsidian' ? 'border-[#EAE8E0]' : (theme.id === 'sepia' ? 'border-[#4A2E1C]' : 'border-[#1A1A1A]');

  const validateForm = (): boolean => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password fields are required.");
      return false;
    }
    if (password.length < 6) {
      setError("Security safeguard: password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'register') {
        await registerWithEmail(email.trim(), password, readerName.trim() || undefined);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      let localizedError = err?.message || "An authentication error occurred.";
      if (err?.code === 'auth/email-already-in-use') {
        localizedError = "This email is already registered in the ledger.";
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        localizedError = "Invalid journal reader credentials.";
      } else if (err?.code === 'auth/invalid-email') {
        localizedError = "Please express a valid email format.";
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGooglePopup();
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || "Authentication aborted or failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="qg-auth-gate-container" className={`min-h-screen ${bgClass} ${c_text} ${f_serif} overflow-auto select-none border-8 ${c_borderSolid} flex flex-col justify-between relative shadow-inner transition-all duration-1000 ease-in-out`}>
      {/* Letterpress tactile paper noise/grain overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none opacity-[0.028] ${theme.id === 'obsidian' ? 'mix-blend-overlay' : 'mix-blend-multiply'} z-0 select-none`}
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      ></div>

      {/* Background radial gradient blur for publication feel */}
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-neutral-900/5 rounded-full blur-3xl -mr-32 -mb-32 pointer-events-none select-none"></div>

      {/* Decorative vertical line */}
      <div className="absolute top-0 right-16 hidden lg:flex items-center h-full pointer-events-none select-none">
        <div className={`writing-mode-vertical text-[9px] uppercase tracking-[0.5em] ${f_sans} font-bold opacity-10`}>
          AUTHENTICATION GATEWAY &bull; PRESS MEMBERS ONLY
        </div>
      </div>

      {/* Login Header with Theme Switcher */}
      <header className="flex justify-between items-center px-6 sm:px-16 pt-12 pb-6 max-w-7xl w-full mx-auto z-10">
        <div className="flex flex-col">
          <span className={`text-[10px] tracking-[0.3em] ${f_sans} font-bold uppercase opacity-60`}>A JOURNAL OF REFLECTION</span>
          <span className={`text-[13px] ${f_serif} italic font-semibold mt-1`}>The Editorial Edition</span>
        </div>

        {/* Minimalist Theme Swappable indicators */}
        <div className="flex gap-4 sm:gap-6">
          {(['quotidian', 'obsidian', 'sepia'] as const).map((tKey) => (
            <button
              key={tKey}
              onClick={() => onThemeChange(tKey)}
              className={`text-[9px] ${f_mono} font-bold tracking-widest uppercase transition-all duration-300 relative py-1 cursor-pointer`}
            >
              {tKey}
              {activeTheme === tKey && (
                <motion.div 
                  layoutId="activeThemeLineGate"
                  className={`absolute bottom-0 left-0 right-0 h-[1.5px] ${theme.id === 'obsidian' ? 'bg-[#EAE8E0]' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]')}`} 
                />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Landing Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 sm:px-16 max-w-md w-full mx-auto z-10 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center w-full"
        >
          {/* Subtle logo mark */}
          <div className={`w-8 h-[1px] ${c_bgInverse} opacity-30 mb-6`}></div>

          <h1 className={`${f_serif} text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-2 break-words uppercase text-center`}>
            THE QUOTIDIAN LEDGER
          </h1>

          <p className={`text-[11px] ${f_sans} tracking-[0.15em] uppercase leading-relaxed ${c_textMuted} mb-8 max-w-sm text-center`}>
            ESTABLISHED IN STOIC TRADITION &bull; CERTIFIED PRESS
          </p>

          {/* SPLIT-TAB EDITORIAL FORM BOX */}
          <div className={`w-full border ${c_borderFull} bg-transparent p-6 sm:p-8 relative`}>
            
            {/* Split Tab Header */}
            <div className="flex w-full border-b border-current opacity-70 mb-8 pb-3 justify-start gap-6">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(null); }}
                className={`text-[10px] ${f_mono} tracking-widest uppercase relative pb-1 cursor-pointer opacity-80 hover:opacity-100 transition-opacity font-bold`}
              >
                [ EXISTING READER ]
                {activeTab === 'login' && (
                  <motion.div
                    layoutId="activeAuthTabLine"
                    className={`absolute bottom-0 left-0 right-0 h-[2.5px] ${theme.id === 'obsidian' ? 'bg-amber-400' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]')}`}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(null); }}
                className={`text-[10px] ${f_mono} tracking-widest uppercase relative pb-1 cursor-pointer opacity-80 hover:opacity-100 transition-opacity font-bold`}
              >
                [ REGISTER ACCOUNT ]
                {activeTab === 'register' && (
                  <motion.div
                    layoutId="activeAuthTabLine"
                    className={`absolute bottom-0 left-0 right-0 h-[2.5px] ${theme.id === 'obsidian' ? 'bg-amber-400' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]')}`}
                  />
                )}
              </button>
            </div>

            {/* Editorial Credentials Form */}
            <form onSubmit={handleEmailAuth} className="flex flex-col text-left">
              <AnimatePresence mode="wait">
                {activeTab === 'register' && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mb-6"
                  >
                    <label className={`block text-[9px] ${f_sans} font-bold uppercase tracking-[0.2em] opacity-60 mb-2`}>
                      Reader Name (Optional)
                    </label>
                    <input
                      key="reg-name-input"
                      type="text"
                      autoFocus
                      placeholder="e.g. Marcus Aurelius"
                      value={readerName}
                      onChange={(e) => setReaderName(e.target.value)}
                      disabled={loading}
                      style={{ color: 'inherit' }}
                      className={`w-full px-1 py-2 sm:py-2.5 bg-transparent border-b ${c_borderFull} focus:outline-none text-[13px] ${f_serif} italic tracking-wide transition-all duration-300 placeholder-current placeholder:opacity-30`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-6">
                <label className={`block text-[9px] ${f_sans} font-bold uppercase tracking-[0.2em] opacity-60 mb-2`}>
                  Email Address
                </label>
                <input
                  key={`email-input-${activeTab}`}
                  type="email"
                  required
                  autoFocus={activeTab === 'login'}
                  placeholder="reader@ledger.domain"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ color: 'inherit' }}
                  className={`w-full px-1 py-2 sm:py-2.5 bg-transparent border-b ${c_borderFull} focus:outline-none text-[13px] ${f_serif} italic tracking-wide transition-all duration-300 placeholder-current placeholder:opacity-30`}
                />
              </div>

              <div className="mb-8">
                <label className={`block text-[9px] ${f_sans} font-bold uppercase tracking-[0.2em] opacity-60 mb-2`}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={showPassword ? "your-security-key" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={{ color: 'inherit' }}
                    className={`w-full pl-1 pr-16 py-2 sm:py-2.5 bg-transparent border-b ${c_borderFull} focus:outline-none text-[13px] ${f_serif} italic tracking-wide transition-all duration-300 placeholder-current placeholder:opacity-30`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className={`absolute right-1 bottom-2.5 text-[8.5px] ${f_mono} uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity bg-transparent focus:outline-none cursor-pointer`}
                  >
                    {showPassword ? '[ MASK ]' : '[ UNMASK ]'}
                  </button>
                </div>
              </div>

              {/* PRIMARY UNIFIED ACTION button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 border ${c_borderFull} hover:bg-current group transition-all duration-300 cursor-pointer text-center relative flex items-center justify-center ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <span className={`text-[10px] ${f_sans} font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${
                  theme.id === 'obsidian' 
                    ? 'group-hover:text-[#121212]' 
                    : (theme.id === 'sepia' ? 'group-hover:text-[#EADCBE]' : 'group-hover:text-white')
                }`}>
                  {loading 
                    ? "[[ PROCESSING... ]]" 
                    : (activeTab === 'login' ? "[[ INITIALIZE SESSION ]]" : "[[ CREATE LEDGER ACCOUNT ]]")}
                </span>
              </button>

              {/* Secure popup error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  className={`text-[10px] ${f_mono} uppercase tracking-wider mt-5 font-semibold text-center break-words`}
                  style={{ color: theme.id === 'obsidian' ? '#F43F5E' : '#B91C1C' }}
                >
                  [ SIGN-IN Safeguard: {error} ]
                </motion.p>
              )}
            </form>

            <div className="flex items-center my-6">
              <div className="flex-1 h-[1px] bg-current opacity-15"></div>
              <span className={`px-3 text-[8px] ${f_mono} opacity-40 uppercase tracking-[0.2em]`}>OR ALTERNATIVELY</span>
              <div className="flex-1 h-[1px] bg-current opacity-15"></div>
            </div>

            {/* SECONDARY HIGH-IMPACT GOOGLE GATEWAY */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full py-4 border ${c_borderFull} hover:bg-current group transition-all duration-300 cursor-pointer text-center relative flex items-center justify-center ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <span className={`text-[10px] ${f_sans} font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${
                theme.id === 'obsidian' 
                  ? 'group-hover:text-[#121212]' 
                  : (theme.id === 'sepia' ? 'group-hover:text-[#EADCBE]' : 'group-hover:text-white')
              }`}>
                {loading ? "[ PROCESSING... ]" : "[ SIGN IN WITH GOOGLE ]"}
              </span>
            </button>
          </div>

          <div className={`w-8 h-[1px] ${c_bgInverse} opacity-30 mt-12`}></div>
        </motion.div>
      </main>

      {/* Styled Footer */}
      <footer className="px-6 sm:px-16 pb-12 pt-6 max-w-7xl w-full mx-auto z-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] tracking-widest uppercase opacity-45 font-semibold">
        <span className={f_mono}>Est. 2026 &bull; Antigravity Edition</span>
        <span className={f_mono}>Strictly Peer-reviewed Typography</span>
      </footer>
    </div>
  );
};
