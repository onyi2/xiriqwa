/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import logo from '../assets/logo.png';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { ArrowRight, MessageSquare, Video, Users, Copy, HelpCircle, Camera, LogIn, Plus, User, Volume2, VolumeX, Search, Share2, Globe, Bell, BellOff } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { auth } from './lib/firebase';
import { Lobby } from './components/Lobby';
import { ParticleCanvas } from './components/ParticleCanvas';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNotifications } from './hooks/useNotifications';
import { Language, translations } from './i18n';

type SpaceCategory = 'Public' | 'Professional' | 'Casual';
type SpaceInfo = { name: string; tags: string[]; activeUsers?: number; category?: SpaceCategory; lastVisited?: number };

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return '';
  const diffInSeconds = Math.floor((Date.now() - Math.max(timestamp, Date.now() - 31536000000)) / 1000); // capped at 1 year just in case

  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default function App() {
  const { sendNotification } = useNotifications();
  const [language, setLanguage] = useState<Language>(() => {
    const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
    if (['en', 'es', 'fr', 'de'].includes(browserLang)) {
      return browserLang as Language;
    }
    return 'en';
  });
  const t = translations[language];
  const [spaceCode, setSpaceCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const shakeControls = useAnimation();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeSpacesCount, setActiveSpacesCount] = useState(28);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSpacesCount(prev => prev + Math.floor(Math.random() * 7) - 3);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [spaceCategory, setSpaceCategory] = useState<SpaceCategory>('Casual');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ['Tech', 'Music', 'Gaming', 'Art', 'Design', 'Science', 'Writing', 'Finance', 'Social', 'Fitness'];
  const [presence, setPresence] = useState<'online' | 'busy' | 'quiet'>('online');
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [interactionSoundsEnabled, setInteractionSoundsEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSpaces, setRecentSpaces] = useState<SpaceInfo[]>(() => {
    const saved = localStorage.getItem('recentSpaces');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed.map((name: string) => ({ name, tags: [], activeUsers: Math.floor(Math.random() * 15) + 1, category: 'Casual' as SpaceCategory }));
        }
        return parsed.map((spaceInfo: SpaceInfo) => ({ ...spaceInfo, activeUsers: spaceInfo.activeUsers || Math.floor(Math.random() * 15) + 1, category: spaceInfo.category || 'Casual' as SpaceCategory }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [lobbyInfo, setLobbyInfo] = useState<{ roomName: string; participantCount: number } | null>(null);

  const [tourStep, setTourStep] = useState(() => {
    return localStorage.getItem('hasSeenTour') ? 0 : 1;
  });

  const completeTour = () => {
    setTourStep(0);
    localStorage.setItem('hasSeenTour', 'true');
  };

  const nextTourStep = () => {
    if (tourStep >= 3) {
      completeTour();
    } else {
      setTourStep(prev => prev + 1);
    }
  };

  const trendingSpaces = [
    "🔥 Trending: rift-valley-alpha (42 active)",
    "💬 Active now: general-chat (15 active)",
    "🎵 Popular: lo-fi-beats (89 active)",
    "🌍 Global: 1,024 spaces active right now"
  ];
  const [trendingIndex, setTrendingIndex] = useState(0);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrendingIndex((prev) => (prev + 1) % trendingSpaces.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('recentSpaces', JSON.stringify(recentSpaces));
  }, [recentSpaces]);

  useEffect(() => {
    if (!isScanning) return;
    setPermissionDenied(false);
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 }, false);
    scanner.render((decodedText) => {
      setSpaceCode(decodedText);
      setIsScanning(false);
      scanner.clear();
    }, (error) => {
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || '';
      if (errorMessage.includes('NotAllowedError')) {
        setPermissionDenied(true);
      }
      if (!errorMessage.includes('No MultiFormat Readers')) {
        console.warn(errorMessage);
      }
    });
    return () => { scanner.clear(); };
  }, [isScanning]);
  
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      signInWithEmailLink(auth, email!, window.location.href)
        .then(() => {
          window.localStorage.removeItem('emailForSignIn');
          playSuccessSound();
          sendNotification('Sign In Successful', 'You have successfully signed in to Sirikwa.');
          alert('Successfully signed in!');
        })
        .catch(console.error);
    }
  }, []);

  const getPresenceColor = (p: string) => {
    switch (p) {
      case 'busy': return 'bg-rose-500';
      case 'quiet': return 'bg-amber-500';
      default: return 'bg-emerald-500';
    }
  };

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      alert('Check your email for the sign-in link!');
      setIsAuthModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Failed to send magic link. Please check your email address.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoadingAuth(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/contacts');
    try {
      await signInWithPopup(auth, provider);
      playSuccessSound();
      sendNotification('Sign In Successful', 'You have successfully signed in with Google.');
      setIsAuthModalOpen(false);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/popup-closed-by-user') {
        // User closed the popup, silent failure
      } else if (e.code === 'auth/operation-not-allowed') {
        alert('Google Sign-In is not enabled. Please enable it in your Firebase project settings.');
      } else {
        alert('Failed to sign in with Google: ' + e.message);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const fetchContacts = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // In a real app, you would need to get the credential accessToken
    // For simplicity with Firebase Auth popup, we might use a different approach or Firebase ID token
    // But since this is a client-side app following the skill docs:
    // "All API calls happen in the browser using the access token from the OAuth flow"
    // I need to have obtained the token.
    
    // For now, let's just log that we are attempting to fetch.
    console.log("Fetching contacts...");
    alert("Functionality to fetch contacts will be implemented here, dependent on token retrieval.");
  };

  const playSuccessSound = () => {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play().catch(e => console.error("Audio playback blocked", e));
  };

  const handleJoinSpace = () => {
    let codeToUse = spaceCode.trim();

    // Check if it's a URL
    try {
      const url = new URL(codeToUse);
      // Try query param 'code' first
      const codeParam = url.searchParams.get('code');
      if (codeParam) {
        codeToUse = codeParam;
      } else {
        // Fallback to last pathname segment
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          codeToUse = pathParts[pathParts.length - 1];
        }
      }
    } catch (e) {
      // Not a valid URL, treat as code
    }

    // Validation
    const codeRegex = /^[a-zA-Z0-9-]+$/;
    if (codeToUse && !codeRegex.test(codeToUse)) {
      setCodeError("Invalid code. Only letters, numbers, and hyphens are allowed.");
      shakeControls.start({ x: [-8, 8, -8, 8, 0], transition: { duration: 0.4 } });
      return;
    }

    setCodeError("");
    if (codeToUse) {
      setRecentSpaces(prev => {
        const existing = prev.find(s => s.name === codeToUse);
        const others = prev.filter(s => s.name !== codeToUse);
        if (existing) {
          return [{ ...existing, lastVisited: Date.now() }, ...others].slice(0, 5);
        } else {
          return [{ name: codeToUse, tags: [], activeUsers: Math.floor(Math.random() * 15) + 1, category: 'Casual', lastVisited: Date.now() }, ...others].slice(0, 5);
        }
      });
    }
    // Simulate setting lobby info
    setLobbyInfo({ roomName: codeToUse, participantCount: Math.floor(Math.random() * 10) + 1 });
  };

  const handleCopy = () => {
    if (spaceCode) {
      navigator.clipboard.writeText(spaceCode);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/assets/background.jpg')] bg-cover bg-center text-slate-800 font-sans flex flex-col pb-20 md:pb-0 relative overflow-hidden">
      <ParticleCanvas />
      {/* Background Light Sweep */}
      <motion.div 
        animate={{ opacity: [0, 0.08, 0], x: ['-50%', '150%'] }} 
        transition={{ duration: 4, repeat: Infinity, repeatDelay: 14, ease: "easeInOut" }} 
        className="absolute -inset-y-full -left-[100%] w-[300%] rotate-45 pointer-events-none z-0 bg-gradient-to-r from-transparent via-white to-transparent"
      />
      <header className="px-6 py-8 flex justify-between items-center max-w-5xl w-full mx-auto relative z-10">
        <a href="https://drive.google.com/file/d/1sxwsqwE98cBS9ywm9_OsYeuTgBCHYz_i/view?usp=drive_link" target="_blank" rel="noopener noreferrer">
          <img src={logo} alt="SIRIKWA" className="h-10 w-auto animate-dance origin-bottom" />
        </a>

        {/* Cycling Trending Spaces */}
        <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="hidden lg:flex flex-1 mx-8 justify-center items-center h-10 relative overflow-hidden bg-gradient-to-r from-rose-500/20 via-red-500/20 to-rose-500/20 rounded-full border border-rose-300/30 backdrop-blur-sm shadow-inner group cursor-default">
          {/* Subtle glow pulse */}
          <motion.div animate={{ opacity: [0, 0.4, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 bg-rose-400/20 rounded-full blur-[4px]"></motion.div>
          <AnimatePresence mode="wait">
            <motion.p
              key={trendingIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="text-lg text-white italic absolute w-full text-center whitespace-nowrap drop-shadow-[0_2px_4px_rgba(225,29,72,0.8)]"
              style={{ fontFamily: "'Caveat', cursive", letterSpacing: "1px" }}
            >
              {trendingSpaces[trendingIndex]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        <div className="flex items-center gap-6">
          <div className="relative group hidden sm:flex items-center z-50">
            <button className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition text-sm font-semibold uppercase tracking-wider">
              <Globe size={16} />
              {language}
            </button>
            <div className="absolute right-0 top-full pt-2 w-32 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200">
              <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                {['en', 'es', 'fr', 'de'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang as Language)}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition ${language === lang ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : lang === 'fr' ? 'Français' : 'Deutsch'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200">
            <button
               onClick={() => setInteractionSoundsEnabled((prev) => !prev)}
               className="text-slate-500 hover:text-blue-600 transition focus:outline-none"
               title="Toggle Interaction Sounds"
            >
              {interactionSoundsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="text-slate-500 hover:text-blue-600 transition focus:outline-none"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume} 
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (parseFloat(e.target.value) > 0) setIsMuted(false);
              }}
              className="w-20 md:w-24 accent-blue-600 focus:outline-none"
              aria-label="Volume control"
            />
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200">
            <div className={`w-2 h-2 rounded-full ${getPresenceColor(presence)}`} />
            <select
              value={presence}
              onChange={(e) => setPresence(e.target.value as 'online' | 'busy' | 'quiet')}
              className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="online">Online</option>
              <option value="busy">Busy</option>
              <option value="quiet">Quiet Mode</option>
            </select>
          </div>
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="text-sm font-semibold text-white bg-blue-600 px-5 py-2 rounded-full hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <LogIn size={16} />
            Sign In
          </button>
        </div>
      </header>

      <main className="flex-grow p-6 flex flex-col items-center justify-center">
        <section className="text-center mb-12">
          <div className="absolute top-1/2 left-1/2 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none w-full h-full max-w-6xl overflow-hidden opacity-30 mix-blend-color-burn">
            {/* Background Emojis - larger movement */}
            <motion.div animate={{ y: [-25, 25, -25], x: [-15, 15, -15], scale: [1, 1.03, 1] }} transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }} className="floating-emoji absolute top-[10%] left-[15%] text-7xl blur-[2px] opacity-60">🌐</motion.div>
            <motion.div animate={{ y: [30, -30, 30], x: [20, -20, 20], scale: [1, 1.03, 1] }} transition={{ duration: 14, ease: "easeInOut", repeat: Infinity, delay: 2 }} className="floating-emoji absolute bottom-[20%] right-[10%] text-8xl blur-[3px] opacity-40">🚀</motion.div>
            <motion.div animate={{ y: [-20, 20, -20], x: [25, -25, 25], scale: [1, 1.03, 1] }} transition={{ duration: 10, ease: "easeInOut", repeat: Infinity, delay: 1 }} className="floating-emoji absolute top-[25%] right-[25%] text-6xl blur-[1px] opacity-70">💡</motion.div>
            
            {/* Foreground Emojis - smaller movement */}
            <motion.div animate={{ y: [-10, 10, -10], x: [-8, 8, -8], scale: [1, 1.03, 1] }} transition={{ duration: 8, ease: "easeInOut", repeat: Infinity, delay: 3 }} className="floating-emoji absolute bottom-[30%] left-[20%] text-5xl opacity-90 drop-shadow-lg">✨</motion.div>
            <motion.div animate={{ y: [12, -12, 12], x: [10, -10, 10], scale: [1, 1.03, 1] }} transition={{ duration: 9, ease: "easeInOut", repeat: Infinity, delay: 0.5 }} className="floating-emoji absolute top-[40%] left-[30%] text-4xl opacity-80 drop-shadow-md">🔥</motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
          >
            <h1 className="relative text-6xl md:text-7xl font-extrabold tracking-tighter text-slate-900 mb-6 flex gap-3 flex-wrap justify-center">
              {t.connect.split(' ').map((word, index, arr) => (
                <motion.span 
                  key={index} 
                  initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, delay: 0.8 + index * 0.15 }}
                  className={index === arr.length - 1 ? "text-blue-600" : ""}
                >
                  {word}
                </motion.span>
              ))}
            </h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="text-xl text-slate-600 max-w-lg mx-auto leading-relaxed relative z-10"
          >
            {t.subtitle}
          </motion.p>
        </section>

        <AnimatePresence mode="wait">
        {lobbyInfo ? (
          <Lobby 
            key="lobby"
            roomName={lobbyInfo.roomName}
            participantCount={lobbyInfo.participantCount}
            onEnter={() => setLobbyInfo(null)}
            interactionSoundsEnabled={interactionSoundsEnabled}
            volume={isMuted ? 0 : volume}
          />
        ) : (
          <motion.div
            key="join-section"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              whileHover={{ y: -6, scale: 1.02, boxShadow: "0 40px 90px rgba(255,20,80,.25)" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 1.2 }}
              className="relative p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(225,29,72,0.4)] w-full max-w-sm border border-rose-400/40 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/95 via-red-600/95 to-rose-800/95 backdrop-blur-xl z-0"></div>
              <div className="absolute inset-0 bg-[url('/assets/preview.webp')] bg-cover bg-center opacity-20 mix-blend-overlay z-0"></div>
              
              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="bg-white/10 p-4 rounded-3xl mb-6 shadow-inner border border-white/20 backdrop-blur-md">
                   <Users className="text-white w-8 h-8 opacity-90" />
                </div>
                <h2 className="text-3xl font-extrabold mb-1 tracking-tight text-white drop-shadow-sm text-center">{t.joinSpace}</h2>
                <p className="text-rose-100/90 text-sm mb-8 text-center font-medium">{t.enterCode}</p>
                
                <motion.div animate={shakeControls} className="relative w-full group">
                  <input
                    type="text"
                    id="space-code"
                    value={spaceCode}
                    onChange={(e) => {
                        setSpaceCode(e.target.value);
                        setCodeError("");
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinSpace()}
                    placeholder="e.g. rift-valley-alpha"
                    className={`peer w-full p-4 pl-5 pr-28 rounded-2xl border relative z-10 bg-transparent focus:outline-none transition-colors text-sm text-white placeholder:text-rose-200/70 ${codeError ? 'border-amber-300 bg-red-900/40' : 'border-white/20'}`}
                    autoFocus
                  />
                  {/* Focus Glow Background */}
                  <div className="absolute inset-0 rounded-2xl bg-white/10 peer-focus:bg-rose-500/10 peer-focus:shadow-[0_0_20px_rgba(255,20,80,0.4)] transition-all duration-250 opacity-100 border border-transparent peer-focus:border-rose-400 z-0"></div>

                  {codeError && <p className="text-amber-200 text-xs mt-2 font-medium px-2 z-10 relative">{codeError}</p>}
                  
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-1 z-20">
                    <button
                        onClick={() => setIsScanning(!isScanning)}
                        className={`p-2.5 rounded-xl ${isScanning ? 'bg-white/20 text-white' : 'text-rose-200/70'} hover:text-white hover:bg-white/10 transition backdrop-blur-sm`}
                        title="Scan QR Code"
                    >
                        <Camera size={18} />
                    </button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      onClick={handleJoinSpace}
                      disabled={!spaceCode.trim()}
                      className={`p-2.5 rounded-xl transition shadow-sm flex items-center justify-center relative overflow-hidden group/btn ${spaceCode.trim().length > 0 ? 'bg-white text-rose-600 hover:bg-rose-50 cursor-pointer shadow-white/30' : 'bg-white/10 text-rose-300/40 cursor-not-allowed hidden'}`}
                    >
                      {/* Ripple effect on active */}
                      <span className="absolute inset-0 w-full h-full bg-rose-200 opacity-0 group-active/btn:animate-ping rounded-xl"></span>
                      <ArrowRight size={18} className="relative z-10" />
                    </motion.button>
                  </div>
                </motion.div>

                {/* Live Activity Simulation */}
                <div className="mt-4 pb-2">
                  <motion.p key={activeSpacesCount} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="text-xs text-rose-100/80 font-medium tracking-wide flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {activeSpacesCount} spaces active now
                  </motion.p>
                </div>
              </div>
            </motion.div>

            {isScanning && (
              <div className="mt-4 w-full max-w-sm">
                {permissionDenied ? (
                  <div className="w-full rounded-2xl p-6 border border-rose-200 bg-rose-50 text-center shadow-sm">
                    <Camera className="mx-auto h-8 w-8 text-rose-500 mb-2 opacity-80" />
                    <p className="text-rose-800 font-bold mb-1">Camera access denied</p>
                    <p className="text-rose-600/80 text-xs px-2">Please allow camera access in your browser settings to scan QR codes.</p>
                  </div>
                ) : (
                  <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border border-rose-200 shadow-sm bg-white/50 backdrop-blur-sm p-2"></div>
                )}
              </div>
            )}

            {recentSpaces.length > 0 && (
              <div className="mt-8 w-full max-w-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="h-px bg-slate-300/60 flex-1"></div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">{t.recentSpaces}</p>
                  <div className="h-px bg-slate-300/60 flex-1"></div>
                  <button onClick={() => setRecentSpaces([])} className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-rose-500 font-bold whitespace-nowrap transition-colors">{t.clearHistory || 'Clear'}</button>
                </div>

                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t.searchSpaces}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/50 backdrop-blur-md border border-slate-200/60 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-400/50 shadow-inner text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <motion.div 
                  className="flex flex-wrap gap-2 justify-center"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
                    hidden: { opacity: 0 }
                  }}
                >
                  {recentSpaces
                    .filter(space => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return space.name.toLowerCase().includes(query) || (space.category && space.category.toLowerCase().includes(query)) || (space.tags && space.tags.some(t => t.toLowerCase().includes(query)));
                    })
                    .map(space => (
                    <motion.div 
                      key={space.name} 
                      className="relative group/item flex items-center"
                      variants={{
                        hidden: { opacity: 0, x: -20, y: 10 },
                        visible: { opacity: 1, x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                      }}
                    >
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={() => {
                          setSpaceCode(space.name);
                          setCodeError('');
                          setLobbyInfo({ roomName: space.name, participantCount: space.activeUsers || Math.floor(Math.random() * 10) + 1 });
                          setRecentSpaces(prev => {
                            const existing = prev.find(s => s.name === space.name);
                            const others = prev.filter(s => s.name !== space.name);
                            if (existing) {
                              return [{ ...existing, lastVisited: Date.now() }, ...others].slice(0, 5);
                            }
                            return prev;
                          });
                        }}
                        className="px-4 py-2 pr-9 bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 hover:shadow-sm transition-all flex flex-col items-center gap-1.5 group"
                      >
                        <div className="flex items-center gap-2">
                          <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${space.name}`} alt="" className="w-5 h-5 rounded-full bg-slate-100" />
                          <span>{space.name}</span>
                          <span className="flex items-center gap-1 text-[9px] text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded-md font-medium group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors" title={`${space.activeUsers} active user${space.activeUsers === 1 ? '' : 's'}`}>
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            {space.activeUsers}
                            {space.lastVisited && <span className="ml-0.5 opacity-70 border-l border-slate-300 pl-1 group-hover:border-rose-300">{formatRelativeTime(space.lastVisited)}</span>}
                          </span>
                        </div>
                        {(space.tags && space.tags.length > 0 || space.category) && (
                          <div className="flex gap-1 items-center mt-0.5">
                            {space.category && (
                               <span className={`text-[8.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold border ${
                                 space.category === 'Public' ? 'bg-blue-50 text-blue-500 border-blue-200/50' :
                                 space.category === 'Professional' ? 'bg-purple-50 text-purple-500 border-purple-200/50' :
                                 'bg-emerald-50 text-emerald-500 border-emerald-200/50'
                               }`}>
                                 {space.category}
                               </span>
                            )}
                            {space.tags?.map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100/50 text-slate-400 font-medium border border-slate-200/50">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </motion.button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`${window.location.origin}/?code=${space.name}`);
                          sendNotification('Copied!', 'Space link copied to clipboard.');
                        }}
                        title="Copy deep-link"
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/80 rounded-lg transition-all"
                      >
                        <Copy size={13} />
                      </button>
                    </motion.div>
                  ))}
                  {recentSpaces.filter(space => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return space.name.toLowerCase().includes(query) || (space.category && space.category.toLowerCase().includes(query)) || (space.tags && space.tags.some(t => t.toLowerCase().includes(query)));
                  }).length === 0 && (
                    <p className="text-xs text-slate-500 mt-2 text-center w-full">{t.noMatching}</p>
                  )}
                </motion.div>
              </div>
            )}

            {isCreateModalOpen && (
              <div className="fixed inset-0 bg-[#2C211A]/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                <div className="bg-white p-8 rounded-3xl w-full max-w-sm border border-[#E5E1DA] shadow-xl">
                  <h3 className="text-xl font-bold mb-4">{t.createSpace}</h3>
                  <input type="text" placeholder="Space Name" className="w-full p-3 mb-3 border border-[#E5E1DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} />
                  <textarea placeholder="Description" className="w-full p-3 mb-3 border border-[#E5E1DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]" value={newSpaceDesc} onChange={e => setNewSpaceDesc(e.target.value)} />
                  
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Select Tags (Up to 3)</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTags(selectedTags.filter(t => t !== tag));
                              } else if (selectedTags.length < 3) {
                                setSelectedTags([...selectedTags, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isSelected 
                                ? 'bg-rose-100 text-rose-800 border-rose-300 border shadow-sm' 
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Category</p>
                    <div className="flex gap-2">
                      {(['Public', 'Professional', 'Casual'] as SpaceCategory[]).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSpaceCategory(cat)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                            spaceCategory === cat
                              ? 'bg-[#1D4ED8] text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 mb-6">
                    <input type="checkbox" className="w-4 h-4 text-[#1D4ED8]" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                    <span className="text-sm text-[#8B7E74]">Private Space</span>
                  </label>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm text-[#8B7E74]">Cancel</button>
                    <button
                      disabled={isLoadingCreate}
                      onClick={async () => {
                        setIsLoadingCreate(true);
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        const codeToJoin = newSpaceName.trim().toLowerCase().replace(/\s+/g, '-');
                        if (codeToJoin) {
                          setSpaceCode(codeToJoin);
                          setRecentSpaces(prev => {
                            const existing = prev.find(s => s.name === codeToJoin);
                            const others = prev.filter(s => s.name !== codeToJoin);
                            if (existing) {
                              return [{ ...existing, tags: selectedTags, category: spaceCategory, lastVisited: Date.now() }, ...others].slice(0, 5);
                            } else {
                              return [{ name: codeToJoin, tags: selectedTags, activeUsers: 1, category: spaceCategory, lastVisited: Date.now() }, ...others].slice(0, 5);
                            }
                          });
                          setLobbyInfo({ roomName: codeToJoin, participantCount: 1 });
                        }

                        setIsCreateModalOpen(false);
                        setNewSpaceName('');
                        setNewSpaceDesc('');
                        setIsPrivate(false);
                        setSelectedTags([]);
                        setSpaceCategory('Casual');
                        setIsLoadingCreate(false);
                      }}
                      className="px-4 py-2 text-sm bg-[#1D4ED8] text-white rounded-xl hover:bg-[#1e40af] transition disabled:opacity-50"
                    >
                      {isLoadingCreate ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isAuthModalOpen && (
              <div className="fixed inset-0 bg-[#2C211A]/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white p-8 rounded-3xl w-full max-w-sm border border-[#E5E1DA] shadow-2xl"
                >
                  <h3 className="text-2xl font-bold mb-2">Passwordless Login</h3>
                  <p className="text-[#8B7E74] text-sm mb-6">Enter your email and we'll send a secure login link. No password required.</p>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="w-full p-4 mb-6 border border-[#E5E1DA] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] transition bg-[#FAF7F2]"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <div className="flex flex-col gap-3">
                    <button
                      disabled={isLoadingAuth}
                      onClick={handleGoogleSignIn}
                      className="w-full p-4 text-sm font-semibold border border-[#E5E1DA] rounded-2xl hover:bg-[#FAF7F2] transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </button>
                    <div className="text-center text-xs text-[#8B7E74] my-1">OR</div>
                    <button
                      disabled={isLoadingAuth}
                      onClick={handleSignIn}
                      className="w-full p-4 text-sm font-semibold bg-[#1D4ED8] text-white rounded-2xl hover:bg-[#1e40af] transition disabled:opacity-50"
                    >
                      {isLoadingAuth ? 'Sending Link...' : 'Continue without a password'}
                    </button>
                    <button
                      onClick={() => setIsAuthModalOpen(false)}
                      className="w-full p-4 text-sm font-medium text-[#8B7E74] hover:text-[#2C211A] transition"
                    >
                     Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
            <button onClick={() => setIsCreateModalOpen(true)} className="w-full mt-6 text-sm font-semibold text-[#8B7E74] hover:text-[#1D4ED8] transition">{t.orCreate}</button>
          </motion.div>
        )}
        </AnimatePresence>


      </main>

      <AnimatePresence>
        {tourStep > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-slate-200/60 p-6 w-[calc(100vw-2rem)] md:w-80 shadow-rose-900/10"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                {tourStep === 1 && <><ArrowRight className="text-blue-500" size={20} /> Join Spaces</>}
                {tourStep === 2 && <><Plus className="text-emerald-500" size={20} /> Create Spaces</>}
                {tourStep === 3 && <><Search className="text-rose-500" size={20} /> Find Spaces</>}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">{tourStep} / 3</span>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {tourStep === 1 && "Enter a unique code to instantly jump into private collaboration rooms. Real-time, fast, and secure."}
              {tourStep === 2 && "Start your own space for teams or friends, tag it, and share the link to get people together."}
              {tourStep === 3 && "Easily search through your recent and favorite spaces using name or custom tags."}
            </p>

            <div className="flex items-center justify-between">
              <button onClick={completeTour} className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1">
                Skip tour
              </button>
              <button 
                onClick={nextTourStep} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
              >
                {tourStep === 3 ? "Get Started" : "Next"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex md:hidden justify-around items-center z-40">
        <button 
          onClick={() => document.getElementById('space-code')?.focus()}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition"
        >
          <ArrowRight size={24} />
          <span className="text-[10px] font-semibold uppercase">{t.join}</span>
        </button>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition"
        >
          <Plus size={24} />
          <span className="text-[10px] font-semibold uppercase">{t.create}</span>
        </button>
        <button 
          onClick={() => setIsAuthModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition"
        >
          <User size={24} />
          <span className="text-[10px] font-semibold uppercase">{t.account}</span>
        </button>
      </nav>

      <footer className="p-8 text-center text-xs text-slate-500 font-medium tracking-wide">
        © 2026 SIRIKWA | Created by <a href="mailto:jamenya1988@gmail.com" className="hover:text-blue-600 font-semibold underline underline-offset-4">Kepler Camp Codes</a>
      </footer>
    </div>
  );
}

