import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Quote as QuoteIcon, 
  RefreshCw, 
  Copy, 
  Check, 
  Database, 
  Sparkles, 
  Share2,
  AlertTriangle,
  Search,
  X,
  Filter,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Printer,
  ChevronDown,
  Bookmark
} from 'lucide-react';
import { getQuotesFromDb, seedQuotesInDb } from './api';
import { testConnection, auth, signOutUser, db, handleFirestoreError, OperationType } from './firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Quote } from './types';
import { AuthGate } from './components/AuthGate';

/**
 * Helper to dynamically retrieve elegant metadata tags for filtering and categorization.
 */
export function getQuoteTags(q: Quote): string[] {
  const tags: string[] = [];
  const text = (q.text || '').toLowerCase();
  const author = (q.author || '').toLowerCase();

  if (
    text.includes('code') || 
    text.includes('software') || 
    text.includes('computer') || 
    text.includes('machines') || 
    text.includes('programming') || 
    text.includes('programs') || 
    author.includes('gates') || 
    author.includes('torvalds') || 
    author.includes('abelson')
  ) {
    tags.push('TECHNOLOGY');
  }
  if (
    text.includes('people') || 
    text.includes('love') || 
    text.includes('person') || 
    text.includes('mind') || 
    text.includes('ideas') || 
    author.includes('einstein') || 
    author.includes('allen')
  ) {
    tags.push('HUMANITY');
  }
  if (
    text.includes('great') || 
    text.includes('strive') || 
    text.includes('success') || 
    text.includes('predict') || 
    text.includes('invent') || 
    author.includes('jobs') || 
    author.includes('kay')
  ) {
    tags.push('PERSISTENCE');
  }
  if (
    text.includes('simpl') || 
    text.includes('sophistication') || 
    author.includes('vinci') || 
    author.includes('draper')
  ) {
    tags.push('MINIMALISM');
  }
  
  if (tags.length === 0) {
    if (q.sentiment === 'philosophical') tags.push('PHILOSOPHY');
    else if (q.sentiment === 'stoic') tags.push('STOICISM');
    else if (q.sentiment === 'ambitious') tags.push('AMBITION');
    else tags.push('SERENITY');
  }
  
  return tags;
}

export const THEMES = {
  quotidian: {
    id: 'quotidian' as const,
    name: 'The Quotidian',
    textClass: 'text-[#1A1A1A]',
    textMutedClass: 'text-[#1A1A1A]/55',
    borderClass: 'border-[#1A1A1A]/10',
    borderHoverClass: 'border-[#1A1A1A]/30',
    borderSolidClass: 'border-white',
    dividerClass: 'bg-[#1A1A1A]',
    quoteMarkColor: 'text-[#1A1A1A]',
    buttonHoverClass: 'hover:bg-[#1A1A1A]/5',
    buttonActiveClass: 'bg-[#1A1A1A]/5 border-[#1A1A1A]/30',
    fontSerifClass: 'font-playfair',
    fontSansClass: 'font-space',
    fontMonoClass: 'font-mono',
    sentimentBgs: {
      philosophical: 'bg-[#EAE8E0]',
      stoic: 'bg-[#E7E9E1]',
      ambitious: 'bg-[#F2EBE0]',
      serene: 'bg-[#E8EDEE]',
      default: 'bg-[#F4F1EA]',
    }
  },
  obsidian: {
    id: 'obsidian' as const,
    name: 'The Obsidian Ledger',
    textClass: 'text-[#EAE8E0]',
    textMutedClass: 'text-[#EAE8E0]/50',
    borderClass: 'border-[#EAE8E0]/15',
    borderHoverClass: 'border-[#EAE8E0]/35',
    borderSolidClass: 'border-[#1A1A1A]',
    dividerClass: 'bg-[#EAE8E0]',
    quoteMarkColor: 'text-[#EAE8E0]',
    buttonHoverClass: 'hover:bg-[#EAE8E0]/10',
    buttonActiveClass: 'bg-[#EAE8E0]/10 border-[#EAE8E0]/30',
    fontSerifClass: 'font-cormorant',
    fontSansClass: 'font-mono',
    fontMonoClass: 'font-mono',
    sentimentBgs: {
      philosophical: 'bg-[#18181B]',
      stoic: 'bg-[#151715]',
      ambitious: 'bg-[#221A16]',
      serene: 'bg-[#141A1E]',
      default: 'bg-[#121212]',
    }
  },
  sepia: {
    id: 'sepia' as const,
    name: 'The Archive Sepia',
    textClass: 'text-[#4A2E1C]',
    textMutedClass: 'text-[#4A2E1C]/55',
    borderClass: 'border-[#4A2E1C]/15',
    borderHoverClass: 'border-[#4A2E1C]/35',
    borderSolidClass: 'border-[#EADCC2]',
    dividerClass: 'bg-[#4A2E1C]',
    quoteMarkColor: 'text-[#4A2E1C]',
    buttonHoverClass: 'hover:bg-[#4A2E1C]/5',
    buttonActiveClass: 'bg-[#4A2E1C]/5 border-[#4A2E1C]/30',
    fontSerifClass: 'font-ebgaramond',
    fontSansClass: 'font-courier',
    fontMonoClass: 'font-courier',
    sentimentBgs: {
      philosophical: 'bg-[#E8DFC9]',
      stoic: 'bg-[#E6DEC4]',
      ambitious: 'bg-[#EFDEC7]',
      serene: 'bg-[#E4DFD8]',
      default: 'bg-[#EADCBE]',
    }
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sync auth state across browser reloads
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Track and write user changes to localStorage cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('quotidian_cached_uid', user.uid);
        localStorage.setItem('quotidian_cached_user_email', user.email || '');
        localStorage.setItem('quotidian_cached_user_name', user.displayName || '');
      } else {
        localStorage.removeItem('quotidian_cached_uid');
        localStorage.removeItem('quotidian_cached_user_email');
        localStorage.removeItem('quotidian_cached_user_name');
      }
    }
  }, [user]);

  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user saved quotes in real time from cloud subcollections
  useEffect(() => {
    if (!user) {
      setSavedQuotes([]);
      return;
    }

    const path = `users/${user.uid}/savedQuotes`;
    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: Quote[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            text: data.text || '',
            author: data.author || '',
          });
        });
        setSavedQuotes(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const isQuoteSaved = currentQuote ? savedQuotes.some(q => q.id === currentQuote.id) : false;

  const handleToggleSave = async () => {
    if (!user || !currentQuote || !currentQuote.id) return;

    const path = `users/${user.uid}/savedQuotes`;
    const docRef = doc(db, path, currentQuote.id);

    try {
      if (isQuoteSaved) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          id: currentQuote.id,
          text: currentQuote.text,
          author: currentQuote.author,
          savedAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      handleFirestoreError(err, isQuoteSaved ? OperationType.DELETE : OperationType.WRITE, `${path}/${currentQuote.id}`);
    }
  };
  const [seeding, setSeeding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('---');

  // Dynamic Theme cycling
  const [activeTheme, setActiveTheme] = useState<'quotidian' | 'obsidian' | 'sepia'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quotidian_theme');
      if (saved === 'quotidian' || saved === 'obsidian' || saved === 'sepia') {
        return saved as 'quotidian' | 'obsidian' | 'sepia';
      }
    }
    return 'quotidian';
  });

  useEffect(() => {
    localStorage.setItem('quotidian_theme', activeTheme);
  }, [activeTheme]);

  const cycleTheme = () => {
    setActiveTheme(prev => {
      if (prev === 'quotidian') return 'obsidian';
      if (prev === 'obsidian') return 'sepia';
      return 'quotidian';
    });
  };

  // Drawer and filtering states with custom persistent state initializers
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogTab, setCatalogTab] = useState<'global' | 'personal'>('global');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('quotidian_selected_author') || null;
    }
    return null;
  });

  const [selectedTag, setSelectedTag] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('quotidian_selected_tag') || null;
    }
    return null;
  });

  // Track and write filter state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedAuthor) {
        localStorage.setItem('quotidian_selected_author', selectedAuthor);
      } else {
        localStorage.removeItem('quotidian_selected_author');
      }
    }
  }, [selectedAuthor]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedTag) {
        localStorage.setItem('quotidian_selected_tag', selectedTag);
      } else {
        localStorage.removeItem('quotidian_selected_tag');
      }
    }
  }, [selectedTag]);

  // Auditory Reading states with dynamic loading of speech synthesizers
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('quotidian_voice_preference') || '';
    }
    return '';
  });

  // Load and adapt SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Retain premium English voices as preferred or default to all voices
      const englishVoices = allVoices.filter(v => v.lang.toLowerCase().startsWith('en'));
      setVoices(englishVoices.length > 0 ? englishVoices : allVoices);
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Save selected voice preference to cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedVoiceName) {
        localStorage.setItem('quotidian_voice_preference', selectedVoiceName);
      } else {
        localStorage.removeItem('quotidian_voice_preference');
      }
    }
  }, [selectedVoiceName]);

  // Stop synthesis when quote, filters or component shifts
  useEffect(() => {
    if (speaking) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuote, selectedAuthor, selectedTag]);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      if (!currentQuote) return;
      
      window.speechSynthesis.cancel();

      // Read text and author clearly
      const textToSpeak = `"${currentQuote.text}" by ${currentQuote.author}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.9; // Measured, deliberate pace as requested

      // Find the specific preferred voice, or find the best English voice candidate
      let selectedVoice = voices.find(v => v.name === selectedVoiceName);
      
      if (!selectedVoice) {
        const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
        selectedVoice = englishVoices.find(v => 
          v.name.includes('Google') || 
          v.name.includes('Natural') || 
          v.name.includes('Premium') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel')
        ) || englishVoices[0] || voices[0];
        
        if (selectedVoice) {
          setSelectedVoiceName(selectedVoice.name);
        }
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        setSpeaking(false);
      };

      utterance.onerror = () => {
        setSpeaking(false);
      };

      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Load quotes and test connection
  const loadInitialData = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const isOk = await testConnection();
      setConnectionOk(isOk);

      const dbQuotes = await getQuotesFromDb();
      setQuotes(dbQuotes);
      
      if (dbQuotes && dbQuotes.length > 0) {
        // Choose a random quote initially
        const randomIndex = Math.floor(Math.random() * dbQuotes.length);
        setCurrentQuote(dbQuotes[randomIndex]);
      }

      const now = new Date();
      setLastRefreshTime(now.toUTCString().slice(17, 25) + ' UTC');
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err instanceof Error ? err.message : 'Database fetch issue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Active filtered selection pool of quotes
  const activePool = quotes.filter(q => {
    if (selectedAuthor && q.author !== selectedAuthor) return false;
    if (selectedTag) {
      const tags = getQuoteTags(q);
      if (!tags.includes(selectedTag)) return false;
    }
    return true;
  });

  // Toggle selection for Author filter
  const handleSelectAuthor = (author: string | null) => {
    setSelectedAuthor(prev => (prev === author ? null : author));
    setSelectedTag(null); // Reset Tag filter to avoid empty intersections
  };

  // Toggle selection for Tag filter
  const handleSelectTag = (tag: string | null) => {
    setSelectedTag(prev => (prev === tag ? null : tag));
    setSelectedAuthor(null); // Reset Author filter to avoid empty intersections
  };

  const handleClearFilters = () => {
    setSelectedAuthor(null);
    setSelectedTag(null);
  };

  // Automatically update the current quote when filters change to ensure it stays relevant
  useEffect(() => {
    if (quotes.length === 0) return;
    
    // Check if current quote is still in the active filtered pool
    const isValid = currentQuote && activePool.some(q => q.id === currentQuote.id);
    if (!isValid) {
      if (activePool.length > 0) {
        // Choose a random quote from the active pool
        const randomIndex = Math.floor(Math.random() * activePool.length);
        setCurrentQuote(activePool[randomIndex]);
      } else {
        setCurrentQuote(null);
      }
    }
  }, [selectedAuthor, selectedTag, quotes]);

  // Set randomized quote ensuring no immediate repetition if count exceeds 1 in active pool
  const handleNewQuote = () => {
    if (activePool.length === 0) return;
    if (activePool.length === 1) {
      setCurrentQuote(activePool[0]);
      return;
    }

    // Filter out current quote
    const filteredPool = activePool.filter(q => q.id !== currentQuote?.id);
    if (filteredPool.length === 0) {
      setCurrentQuote(activePool[Math.floor(Math.random() * activePool.length)]);
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredPool.length);
    setCurrentQuote(filteredPool[randomIndex]);
  };

  // Listen to Spacebar or ArrowRight keys to automatically cycle quotes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is focused on interactive inputs or textareas
      const target = event.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' || 
        target?.tagName === 'TEXTAREA' || 
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === ' ' || event.code === 'Space' || event.key === 'ArrowRight' || event.code === 'ArrowRight') {
        if (event.key === ' ' || event.code === 'Space') {
          // Intercept default spacebar scrolling for superior UX on single-screen apps
          event.preventDefault();
        }
        handleNewQuote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [quotes, currentQuote, selectedAuthor, selectedTag]);

  // Seed the Firestore database with initial 10 quality quotes
  const handleSeedDatabase = async () => {
    setSeeding(true);
    setErrorStatus(null);
    try {
      const seeded = await seedQuotesInDb();
      setQuotes(seeded);
      if (seeded && seeded.length > 0) {
        setCurrentQuote(seeded[0]);
      }
      const now = new Date();
      setLastRefreshTime(now.toUTCString().slice(17, 25) + ' UTC');
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Failed to seed database. Please check Firestore security rules.");
    } finally {
      setSeeding(false);
    }
  };

  // Copy quote text to user clipboard
  const handleCopy = async () => {
    if (!currentQuote) return;
    const fullText = `"${currentQuote.text}" — ${currentQuote.author}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Could not copy text: ", err);
    }
  };

  // Share quote via Web Share API or Twitter/X
  const handleShare = () => {
    if (!currentQuote) return;
    const shareText = `"${currentQuote.text}" — ${currentQuote.author}`;
    if (navigator.share) {
      navigator.share({
        title: 'Inspiring Quote',
        text: shareText,
        url: window.location.href
      }).catch(err => console.error("Web share failed", err));
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Helper to determine the optimal responsive font size class based on quote length
  const getFontSizeClass = (text?: string): string => {
    if (!text) return 'text-3xl sm:text-5xl lg:text-6xl';
    const len = text.length;
    if (len < 65) {
      return 'text-4xl sm:text-5xl lg:text-6xl';
    } else if (len < 120) {
      return 'text-3xl sm:text-4xl lg:text-5xl';
    } else {
      return 'text-2xl sm:text-3xl lg:text-3.5xl';
    }
  };

  // Helper to prevent typography orphans by replacing the last space with a non-breaking space
  const preventOrphans = (text?: string): string => {
    if (!text) return '';
    const lastSpaceIndex = text.lastIndexOf(' ');
    if (lastSpaceIndex === -1) return text;
    return text.substring(0, lastSpaceIndex) + '\u00A0' + text.substring(lastSpaceIndex + 1);
  };

  const theme = THEMES[activeTheme];

  // Map theme variables
  const currentSentiment = currentQuote?.sentiment?.toLowerCase() || 'default';
  const bgClass = theme.sentimentBgs[currentSentiment as keyof typeof theme.sentimentBgs] || theme.sentimentBgs.default;

  // Semantic variables for seamless style transitions across all components:
  const c_text = theme.textClass;
  const c_textMuted = theme.textMutedClass;
  const c_border = theme.borderClass;
  const c_borderHover = theme.borderHoverClass;
  const c_borderSolid = theme.borderSolidClass;
  const c_divider = theme.dividerClass;
  const c_quoteMark = theme.quoteMarkColor;
  const c_buttonHover = theme.buttonHoverClass;
  const c_buttonActive = theme.buttonActiveClass;

  const f_serif = theme.fontSerifClass;
  const f_sans = theme.fontSansClass;
  const f_mono = theme.fontMonoClass;

  const c_bgInverse = theme.id === 'obsidian' ? 'bg-[#EAE8E0]' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]');
  const c_textInverse = theme.id === 'obsidian' ? 'text-[#121212]' : (theme.id === 'sepia' ? 'text-[#EADCBE]' : 'text-white');
  const c_bgMuted = theme.id === 'obsidian' ? 'bg-[#EAE8E0]/10' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]/5' : 'bg-[#1A1A1A]/5');
  const c_borderStrong = theme.id === 'obsidian' ? 'border-[#EAE8E0]/40' : (theme.id === 'sepia' ? 'border-[#4A2E1C]/40' : 'border-[#1A1A1A]/40');
  const c_borderFull = theme.id === 'obsidian' ? 'border-[#EAE8E0]' : (theme.id === 'sepia' ? 'border-[#4A2E1C]' : 'border-[#1A1A1A]');
  const c_hoverInverse = theme.id === 'obsidian' ? 'hover:bg-[#EAE8E0] hover:text-[#121212]' : (theme.id === 'sepia' ? 'hover:bg-[#4A2E1C] hover:text-[#EADCBE]' : 'hover:bg-[#1A1A1A] hover:text-[#F4F1EA]');

  if (authLoading) {
    return (
      <div className={`min-h-screen ${bgClass} ${c_text} flex items-center justify-center border-8 ${c_borderSolid} select-none relative shadow-inner`}>
        {/* Letterpress tactile paper noise/grain overlay */}
        <div 
          className={`absolute inset-0 pointer-events-none opacity-[0.028] ${theme.id === 'obsidian' ? 'mix-blend-overlay' : 'mix-blend-multiply'} z-0 select-none`}
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        ></div>
        <div className={`text-[10px] ${f_mono} uppercase tracking-[0.25em] z-10 font-bold opacity-65 animate-pulse`}>
          [ INITIALIZING PRESS SYSTEM... ]
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate 
        theme={theme} 
        activeTheme={activeTheme} 
        onThemeChange={(themeKey) => setActiveTheme(themeKey)} 
      />
    );
  }

  return (
    <div id="qg-app-container" className={`min-h-screen ${bgClass} ${c_text} ${f_serif} overflow-hidden select-none border-8 ${c_borderSolid} flex flex-col justify-between relative shadow-inner transition-all duration-1000 ease-in-out`}>
      
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
          CURATED FROM THE FIRESTORE REPOSITORY &bull; 2026 ARCHIVE
        </div>
      </div>

      {/* Dynamic Header */}
      <header id="qg-header" className="flex justify-between items-center px-6 sm:px-16 pt-12 pb-6 max-w-7xl w-full mx-auto z-10">
        <div className="flex flex-col">
          <span className={`text-[10px] tracking-[0.3em] ${f_sans} font-bold uppercase opacity-60`}>{theme.name}</span>
          <span className={`text-[10px] tracking-[0.3em] ${f_sans} font-bold uppercase opacity-60 italic mt-0.5`}>Vol. 04 / No. 12</span>
        </div>
        
        <div className="flex items-center space-x-4 sm:space-x-6">
          <button
            onClick={cycleTheme}
            className={`flex items-center gap-1.5 ${f_sans} text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 hover:opacity-100 transition-all cursor-pointer border-b ${c_borderHover} pb-0.5 whitespace-nowrap`}
            title={`Cycle Newspaper Theme (Current: ${theme.name})`}
          >
            <Printer className="w-3.5 h-3.5" /> Print style
          </button>

          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex items-center gap-1.5 ${f_sans} text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 hover:opacity-100 transition-opacity cursor-pointer border-b ${c_borderHover} pb-0.5 whitespace-nowrap`}
            title="Open Quote Index"
          >
            <SlidersHorizontal className="w-3 h-3" /> Index Catalog
          </button>

          {user && (
            <>
              <span className={`text-[10px] ${f_mono} tracking-widest uppercase opacity-75 hidden md:inline-block`} title={user.email || ''}>
                [ Reader: {user.displayName || user.email?.split('@')[0] || 'Member'} ]
              </span>
              <button
                onClick={signOutUser}
                className={`flex items-center ${f_sans} text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity cursor-pointer border-b ${c_borderHover} pb-0.5 whitespace-nowrap`}
                title="Sign Out transition"
              >
                [ Disconnect ]
              </button>
            </>
          )}

          <div className={`h-[1px] w-4 sm:w-6 ${c_divider} opacity-20`}></div>
          {connectionOk === false ? (
            <span className={`text-[10px] tracking-[0.2em] ${f_sans} uppercase font-bold text-red-600 flex items-center gap-1.5`}>
              <AlertTriangle className="w-3.5 h-3.5" /> Client Offline Mode
            </span>
          ) : (
            <span className={`text-[10px] tracking-[0.2em] ${f_sans} uppercase font-medium`}>Firestore Stable</span>
          )}
          <div className={`w-2.5 h-2.5 rounded-full ${connectionOk === false ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
        </div>
      </header>

      {/* Main Display Stage */}
      <main id="qg-display" className="flex-grow flex flex-col justify-center items-center px-6 sm:px-24 py-12 max-w-5xl w-full mx-auto relative z-10">
        <div className={`absolute top-0 left-6 sm:left-24 w-[1px] h-32 ${c_divider} opacity-5 pointer-events-none`}></div>
        
        <AnimatePresence mode="wait">
          {loading ? (
            // Modern, minimalist Loading Spinner
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-24 mx-auto"
            >
              <RefreshCw className={`w-8 h-8 ${c_text} opacity-30 animate-spin`} />
              <p className={`${f_sans} text-[10px] ${c_text} opacity-40 uppercase tracking-[0.25em]`}>Synchronizing Archive...</p>
            </motion.div>
          ) : errorStatus ? (
            // Visually clear premium error card
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`max-w-2xl w-full border ${c_border} bg-red-50/10 p-8 sm:p-12 text-left relative`}
            >
              <AlertTriangle className="w-8 h-8 text-red-600 mb-4" />
              <p className={`${f_sans} text-[10px] font-bold tracking-[0.3em] uppercase text-red-600 mb-2`}>Connection Failure</p>
              <h2 className={`${f_serif} italic font-light text-3xl ${c_text} mb-3`}>Firestore Communication</h2>
              <p className={`${f_serif} text-sm opacity-85 max-w-lg mb-6 leading-relaxed`}>
                We encountered an issue interacting with the cloud database. Please check rules or reconnect the client.
              </p>
              <div className={`bg-white/5 border ${c_border} rounded p-4 ${f_mono} text-[10px] ${c_text} mb-8 break-words overflow-auto max-h-32`}>
                {errorStatus}
              </div>
              <button
                onClick={loadInitialData}
                className={`px-8 py-4 border ${c_borderFull} ${c_hoverInverse} ${c_text} ${f_sans} font-bold text-[10px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center gap-3 cursor-pointer bg-transparent`}
              >
                Try Reconnecting
              </button>
            </motion.div>
          ) : quotes.length === 0 ? (
            // Dynamic Seeding View
            <motion.div
              key="seed-state"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className={`max-w-2xl w-full py-12 border-t border-b ${c_border} text-left relative`}
            >
              <p className={`${f_sans} text-[10px] font-bold tracking-[0.3em] uppercase opacity-50 mb-2`}>System Setup</p>
              <h2 className={`${f_serif} italic font-light text-4xl ${c_text} mb-4`}>Initialize Quote Reservoir</h2>
              <p className={`${f_serif} text-base ${c_textMuted} leading-relaxed max-w-lg mb-8`}>
                Your Firestore database is currently vacant. Click below to automatically seed your database collection with 10 classic tech & life quotes.
              </p>
              
              <button
                onClick={handleSeedDatabase}
                disabled={seeding}
                className={`px-8 py-4 border ${c_borderFull} ${c_hoverInverse} ${c_text} ${f_sans} font-bold text-[10px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center gap-3 cursor-pointer bg-transparent disabled:opacity-40`}
              >
                {seeding ? (
                  <>
                     <RefreshCw className="w-4 h-4 animate-spin" /> Seeding Repository...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Seed 10 Classic Quotes
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            // Main Content Stage with pristine typographic layout
            <div className={`max-w-4xl w-full relative border-l ${c_border} pl-10 sm:pl-16 ml-1`}>
              
              {/* Giant elegant quotation symbol */}
              <span className={`text-9xl leading-none font-black opacity-[0.07] absolute -top-16 -left-14 sm:-left-20 ${f_serif} select-none pointer-events-none transition-colors duration-1000 ${c_quoteMark}`}>“</span>

              <div className="relative z-10 flex flex-col justify-between min-h-[350px] sm:min-h-[400px]">
                            {/* Smooth Fade Transition for text contents */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuote?.id || 'no-quote'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
                    className="flex-1 flex flex-col justify-center"
                  >
                    {/* Active Filter Indicators */}
                    {(selectedAuthor || selectedTag) && (
                      <div className={`flex items-center gap-2 mb-6 ${f_mono} text-[10px] tracking-wider ${c_textMuted} uppercase select-none flex-wrap`}>
                        <span>Viewing Filtered:</span>
                        <span className={`${c_bgMuted} px-2.5 py-1 border ${c_border} ${c_text} font-bold`}>
                          {selectedAuthor ? `Author: ${selectedAuthor}` : `Context: ${selectedTag}`}
                        </span>
                        <button
                          onClick={handleClearFilters}
                          className={`hover:text-red-600 transition-colors cursor-pointer border-b border-dashed ${c_borderStrong} pb-0.5 ml-1 font-bold text-[9px] ${c_textMuted} uppercase tracking-widest whitespace-nowrap`}
                        >
                          [ Clear Index Filter ]
                        </button>
                      </div>
                    )}

                    {currentQuote ? (
                      <>
                        <blockquote>
                          <h1 className={`${f_serif} ${getFontSizeClass(currentQuote?.text)} font-light italic leading-[1.2] tracking-tight mb-12 ${c_text} text-left`}>
                            {preventOrphans(currentQuote?.text)}
                          </h1>
                        </blockquote>
                        <cite className="not-italic flex justify-start">
                          <div className="flex items-end space-x-4">
                            <div className={`h-[1px] w-16 sm:w-24 ${c_divider} mb-3 opacity-30`}></div>
                            <div className="flex flex-col">
                              <p className={`text-lg sm:text-xl ${f_sans} font-bold tracking-wide uppercase ${c_text}`}>
                                {currentQuote?.author}
                              </p>
                              <p className={`text-[10px] ${f_sans} italic opacity-60 uppercase tracking-[0.15em] mt-1 flex items-center gap-1.5 flex-wrap`}>
                                Curated Contributor {currentQuote?.sentiment && (
                                  <>
                                    <span className="opacity-40">&bull;</span>
                                    <span className={`${f_mono} text-[9px] not-italic font-bold tracking-widest opacity-80 uppercase ${c_text}`}>{currentQuote.sentiment}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </cite>
                      </>
                    ) : (
                      <div className="py-12 text-left">
                        <p className={`${f_sans} text-[10px] font-bold tracking-[0.3em] uppercase opacity-50 mb-2`}>No Matching Insights</p>
                        <h2 className={`${f_serif} italic font-light text-2xl ${c_text} mb-4`}>No insights found matching this filter criteria in the database.</h2>
                        <button
                          onClick={handleClearFilters}
                          className={`px-6 py-3 border ${c_borderFull} ${c_hoverInverse} ${c_text} ${f_sans} font-bold text-[9px] uppercase tracking-[0.25em] transition-all duration-300 cursor-pointer bg-transparent`}
                        >
                          Show All Insights
                        </button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Micro Actions Bar inside quote box */}
                <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border-t ${c_border} mt-16 pt-8 gap-4`}>
                  {/* Left-side sharing */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopy}
                      title="Copy Quote to Clipboard"
                      className={`w-12 h-12 border ${c_border} flex items-center justify-center ${c_buttonHover} active:scale-95 transition-all duration-200 cursor-pointer group rounded`}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600 scale-110" />
                      ) : (
                        <Copy className={`w-4.5 h-4.5 opacity-60 group-hover:opacity-100 transition-opacity ${c_text}`} />
                      )}
                    </button>
                    <button
                      onClick={handleShare}
                      title="Share Quote"
                      className={`w-12 h-12 border ${c_border} flex items-center justify-center ${c_buttonHover} active:scale-95 transition-all duration-200 cursor-pointer group rounded`}
                    >
                      <Share2 className={`w-4.5 h-4.5 opacity-60 group-hover:opacity-100 transition-opacity ${c_text}`} />
                    </button>

                    <button
                      onClick={handleToggleSave}
                      title={isQuoteSaved ? "Remove from Saved Library" : "Bookmark Insight"}
                      className={`w-12 h-12 border ${c_border} flex items-center justify-center ${c_buttonHover} active:scale-95 transition-all duration-200 cursor-pointer group rounded relative overflow-hidden`}
                    >
                      <AnimatePresence mode="wait">
                        {isQuoteSaved ? (
                          <motion.div
                            key="saved-bookmark"
                            className="flex items-center justify-center"
                            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Bookmark className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="unsaved-bookmark"
                            className="flex items-center justify-center"
                            initial={{ scale: 0.5, opacity: 0, rotate: 45 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: -45 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Bookmark className={`w-4.5 h-4.5 opacity-60 group-hover:opacity-100 transition-opacity ${c_text}`} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleSpeech}
                        disabled={!currentQuote}
                        title={speaking ? "Stop Speech Reading" : "Auditory Speech Reading"}
                        className={`w-12 h-12 border ${c_border} flex items-center justify-center ${c_buttonHover} active:scale-95 transition-all duration-200 cursor-pointer group rounded disabled:opacity-30 disabled:pointer-events-none ${
                          speaking ? c_buttonActive : ''
                        }`}
                      >
                        {speaking ? (
                          <VolumeX className={`w-4.5 h-4.5 opacity-80 animate-pulse ${c_text}`} />
                        ) : (
                          <Volume2 className={`w-4.5 h-4.5 opacity-60 group-hover:opacity-100 transition-opacity ${c_text}`} />
                        )}
                      </button>

                      {voices.length > 0 && (
                        <div className="relative">
                          <select
                            value={selectedVoiceName}
                            onChange={(e) => setSelectedVoiceName(e.target.value)}
                            title="Select Auditory Voice"
                            className={`h-12 bg-transparent text-[9px] ${f_mono} font-bold tracking-wider border ${c_border} pl-2.5 pr-7 ${c_textMuted} hover:text-current focus:outline-none transition-all rounded cursor-pointer appearance-none uppercase max-w-[140px] sm:max-w-[180px] truncate`}
                          >
                            <option value="" className="bg-[#F4F1EA] text-[#1A1A1A]">Default Voice</option>
                            {voices.map(v => (
                              <option 
                                key={v.name} 
                                value={v.name}
                                className={theme.id === 'obsidian' ? 'bg-[#121212] text-[#EAE8E0]' : (theme.id === 'sepia' ? 'bg-[#EADCBE] text-[#4A2E1C]' : 'bg-[#F4F1EA] text-[#1A1A1A]')}
                              >
                                {v.name.replace(/Microsoft|Google|Apple|Natural/g, '').trim() || v.name}
                              </option>
                            ))}
                          </select>
                          <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${c_textMuted} opacity-40`}>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {speaking && (
                          <motion.div
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 0.5, x: 0 }}
                            exit={{ opacity: 0, x: 6 }}
                            transition={{ duration: 0.15 }}
                            className={`${f_mono} text-[9px] font-bold tracking-widest uppercase flex items-center gap-2 select-none h-12 ml-1`}
                          >
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                theme.id === 'obsidian' ? 'bg-amber-400' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]')
                              }`}></span>
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                theme.id === 'obsidian' ? 'bg-amber-500' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]')
                              }`}></span>
                            </span>
                            <span>[ UTTERANCE ACTIVE ]</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <AnimatePresence>
                      {copied && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 0.5, x: 0 }}
                          exit={{ opacity: 0, x: 6 }}
                          transition={{ duration: 0.2 }}
                          className={`${f_mono} text-[10px] tracking-tight uppercase select-none ml-1 ${
                            theme.id === 'obsidian' ? 'text-emerald-400' : 'text-emerald-700'
                          }`}
                        >
                          Insight Copied
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Generate / New Quote action button */}
                  <div className="flex flex-col items-center sm:items-end gap-2">
                    <button
                      onClick={handleNewQuote}
                      className={`px-8 py-5 border ${c_borderFull} ${c_hoverInverse} active:scale-[0.98] transition-all duration-300 group flex items-center justify-center gap-4 cursor-pointer bg-transparent`}
                    >
                      <span className={`text-[10px] ${f_sans} font-bold uppercase tracking-[0.25em]`}>Generate New Insight</span>
                      <RefreshCw className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <span className={`hidden sm:block text-[9px] ${f_mono} ${c_textMuted} tracking-[0.15em] uppercase opacity-45 font-semibold select-none pointer-events-none mt-1`}>
                      [ ␣ Spacebar / → ] to advance
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </AnimatePresence>

      </main>

      {/* Persistent Elegant Footer */}
      <footer id="qg-footer" className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 sm:px-16 pb-16 pt-8 max-w-7xl w-full mx-auto gap-6 z-10">
        <div className="flex space-x-12">
          <div className="flex flex-col">
            <span className={`text-[9px] uppercase tracking-widest ${f_sans} font-bold ${c_textMuted} mb-1.5`}>Database ID</span>
            <span className={`text-xs ${f_mono} tracking-tighter ${c_textMuted}`}>RESONANT-ROPE-NCF5X</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-[9px] uppercase tracking-widest ${f_sans} font-bold ${c_textMuted} mb-1.5`}>Last Refresh</span>
            <span className={`text-xs ${f_mono} tracking-tighter ${c_textMuted}`}>{lastRefreshTime}</span>
          </div>
        </div>

        <div className={`flex items-center gap-4 text-xs ${f_mono} ${c_textMuted}`}>
          <button 
            onClick={loadInitialData}
            className={`hover:text-current transition-colors cursor-pointer ${f_sans} text-[10px] font-bold uppercase tracking-widest border-b ${c_border} pb-0.5`}
          >
            Reconnect db
          </button>
          <span>&bull;</span>
          <span>Offline Protected</span>
        </div>
      </footer>

      {/* Index Drawer Slider Panel */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-[#1A1A1A]/30 backdrop-blur-xs z-40 cursor-pointer"
            />

            {/* Slider Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className={`fixed right-0 top-0 bottom-0 w-full sm:w-[420px] ${theme.sentimentBgs.default} ${c_text} z-50 flex flex-col justify-between shadow-2xl border-l ${c_border} ${f_sans} overflow-hidden`}
              style={{ padding: '0px' }}
            >
              {/* Solid thick decorative border mimicking main app container */}
              <div className={`absolute inset-0 border-8 ${c_borderSolid} pointer-events-none z-50`}></div>

              {/* Letterpress tactile paper noise/grain overlay for sheet */}
              <div 
                className={`absolute inset-0 pointer-events-none opacity-[0.028] ${theme.id === 'obsidian' ? 'mix-blend-overlay' : 'mix-blend-multiply'} z-30 select-none`}
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                }}
              ></div>

              {/* Drawer Inside Shell */}
              <div className="flex-grow flex flex-col p-8 sm:p-10 relative z-10 h-full overflow-y-auto">
                
                {/* Header */}
                <div className={`flex items-center justify-between border-b ${c_border} pb-6 mb-8 mt-4`}>
                  <div>
                    <h3 className={`text-xs ${f_mono} font-bold uppercase tracking-[0.3em] ${c_text}`}>Index Catalog</h3>
                    <p className={`text-[10px] ${c_textMuted} ${f_sans} italic mt-1`}>
                      {quotes.length} total curated insights
                    </p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className={`p-2 border ${c_border} ${c_buttonHover} active:scale-95 transition-all ${c_textMuted} hover:text-current cursor-pointer rounded`}
                    title="Close Catalog"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Catalog Tabs Selector */}
                <div className="flex border-b border-current/10 gap-6 mb-8 pb-3 justify-start relative">
                  <button
                    type="button"
                    onClick={() => setCatalogTab('global')}
                    className={`text-[10px] ${f_mono} uppercase tracking-[0.15em] font-bold cursor-pointer relative pb-1 opacity-85 hover:opacity-100 transition-opacity`}
                  >
                    [ EDITORIAL INDEX ]
                    {catalogTab === 'global' && (
                      <motion.div
                        layoutId="activeCatalogTab"
                        className={`absolute bottom-0 left-0 right-0 h-[2px] ${theme.id === 'obsidian' ? 'bg-[#EAE8E0]' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]')}`}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogTab('personal')}
                    className={`text-[10px] ${f_mono} uppercase tracking-[0.15em] font-bold cursor-pointer relative pb-1 opacity-85 hover:opacity-100 transition-opacity`}
                  >
                    [[ MY CURATED LEDGER ]]
                    {catalogTab === 'personal' && (
                      <motion.div
                        layoutId="activeCatalogTab"
                        className={`absolute bottom-0 left-0 right-0 h-[2px] ${theme.id === 'obsidian' ? 'bg-[#EAE8E0]' : (theme.id === 'sepia' ? 'bg-[#4A2E1C]' : 'bg-[#1A1A1A]')}`}
                      />
                    )}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {catalogTab === 'personal' ? (
                    <motion.div
                      key="personal-ledger-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-grow flex flex-col"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className={`text-[9.5px] uppercase tracking-[0.2em] ${f_mono} font-bold opacity-60`}>
                          [ Bookmarked Observations ]
                        </span>
                        <span className={`text-[9px] ${f_mono} opacity-50 uppercase tracking-widest`}>
                          {savedQuotes.length} Entry{savedQuotes.length !== 1 ? 'ies' : ''}
                        </span>
                      </div>

                      {savedQuotes.length === 0 ? (
                        <div className={`flex-grow flex flex-col items-center justify-center border border-dashed ${c_border} p-8 text-center rounded bg-white/5 min-h-[280px]`}>
                          <Bookmark className="w-8 h-8 opacity-25 mb-4 animate-[pulse_3s_infinite]" />
                          <p className={`text-xs ${f_serif} italic opacity-60 max-w-[240px] leading-relaxed`}>
                            This custom ledger is empty. Click the Bookmark Ribbon on any insight to begin recording your private catalog.
                          </p>
                        </div>
                      ) : (
                        <div className={`flex-grow overflow-y-auto max-h-[500px] border ${c_border} bg-white/5 p-4 rounded space-y-3`}>
                          {savedQuotes.map((savedQuote, index) => {
                            const isActive = currentQuote?.id === savedQuote.id;
                            return (
                              <button
                                key={savedQuote.id || index}
                                onClick={() => {
                                  setCurrentQuote(savedQuote);
                                  setDrawerOpen(false);
                                }}
                                className={`w-full text-left p-4 border transition-all cursor-pointer flex flex-col gap-2 rounded relative group ${
                                  isActive
                                    ? `border-current bg-current/5 font-semibold`
                                    : `${c_border} hover:border-current/30 hover:bg-white/5`
                                }`}
                              >
                                <div className={`text-[8.5px] ${f_mono} opacity-45 uppercase tracking-[0.15em] flex justify-between items-center`}>
                                  <span>Entry #{String(index + 1).padStart(2, '0')}</span>
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">[ SEND TO DESKTOP ]</span>
                                </div>
                                <p className={`${f_serif} leading-relaxed tracking-wide italic text-xs ${c_text}`}>
                                  "{savedQuote.text}"
                                </p>
                                <div className="flex justify-between items-center mt-1.5 pt-2 border-t border-current/5">
                                  <span className={`${f_sans} font-bold text-[9px] uppercase opacity-75 tracking-wider`}>
                                    &mdash; {savedQuote.author}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="global-catalog-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-grow flex flex-col"
                    >
                      {/* Search field */}
                      <div className="mb-8">
                        <span className={`text-[9px] uppercase tracking-widest ${f_mono} font-bold ${c_textMuted} block mb-2`}>Search Contributor</span>
                        <div className="relative">
                          <Search className={`w-4 h-4 absolute left-3 top-3.5 opacity-40 ${c_text}`} />
                          <input
                            type="text"
                            placeholder="Type author's name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full bg-white/5 border ${c_border} py-3 pl-10 pr-4 text-xs ${f_sans} ${c_text} tracking-wide placeholder-current/35 focus:outline-0 focus:ring-1 focus:ring-current focus:border-current transition-all rounded`}
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className={`p-1 absolute right-3 top-3 ${c_textMuted} hover:text-current text-xs cursor-pointer bg-transparent`}
                            >
                              [clear]
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filter Tags / Sentiments Section */}
                      <div className="mb-8">
                        <span className={`text-[9px] uppercase tracking-widest ${f_mono} font-bold ${c_textMuted} block mb-2.5`}>Filter by context</span>
                        <div className="flex flex-wrap gap-2">
                          {(Array.from(new Set(quotes.flatMap(q => getQuoteTags(q)))) as string[]).sort().map((tag: string) => {
                            const isSelected = selectedTag === tag;
                            const count = quotes.filter(q => getQuoteTags(q).includes(tag)).length;
                            return (
                              <button
                                key={tag}
                                onClick={() => handleSelectTag(tag)}
                                className={`text-[10px] ${f_mono} tracking-wider px-3 py-1.5 transition-all cursor-pointer rounded ${
                                  isSelected 
                                    ? `${c_bgInverse} ${c_textInverse} font-semibold` 
                                    : `bg-white/5 ${c_textMuted} hover:${c_buttonHover} border ${c_border}`
                                }`}
                              >
                                [ {tag} ({count}) ]
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Unique Authors Section */}
                      <div className="flex-grow flex flex-col min-h-[180px]">
                        <span className={`text-[9px] uppercase tracking-widest ${f_mono} font-bold ${c_textMuted} block mb-2.5`}>Filter by contributor</span>
                        <div className={`flex-grow overflow-y-auto max-h-[300px] border ${c_border} bg-white/5 p-4 rounded space-y-1`}>
                          {(Array.from(new Set(quotes.map(q => q.author))) as string[])
                            .sort()
                            .filter((author: string) => author.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((author: string) => {
                              const isSelected = selectedAuthor === author;
                              const count = quotes.filter(q => q.author === author).length;
                              return (
                                <button
                                  key={author}
                                  onClick={() => handleSelectAuthor(author)}
                                  className={`w-full text-left text-xs ${f_serif} py-2 px-3 transition-all cursor-pointer flex justify-between items-center rounded ${
                                    isSelected
                                      ? 'bg-current/10 text-current font-bold'
                                      : `${c_textMuted} hover:${c_buttonHover} hover:text-current`
                                  }`}
                                >
                                  <span className="tracking-wide">{author}</span>
                                  <span className={`${f_mono} text-[9px] opacity-55`}>({count})</span>
                                </button>
                              );
                            })}
                          {(Array.from(new Set(quotes.map(q => q.author))) as string[])
                            .filter((author: string) => author.toLowerCase().includes(searchQuery.toLowerCase()))
                            .length === 0 && (
                            <p className={`text-[10px] ${c_textMuted} ${f_sans} italic text-center py-6`}>
                              No contributors match search
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Active Filter Clear Action */}
                      {(selectedAuthor || selectedTag) && (
                        <div className={`border-t ${c_border} mt-6 pt-6 flex justify-between items-center`}>
                          <div className={`text-[10px] ${f_sans} ${c_textMuted} italic`}>
                            Active: {activePool.length} of {quotes.length} matched
                          </div>
                          <button
                            onClick={handleClearFilters}
                            className={`text-[10px] ${f_mono} uppercase font-bold tracking-widest ${c_textMuted} hover:text-red-700 cursor-pointer border-b ${c_border} pb-0.5`}
                          >
                            Clear filters
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

