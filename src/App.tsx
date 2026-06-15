/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import logo from '../assets/logo.png';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MessageSquare, Video, Users, Copy, HelpCircle, Camera, LogIn, Plus, User, Volume2, VolumeX } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { auth } from './lib/firebase';
import { Lobby } from './components/Lobby';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNotifications } from './hooks/useNotifications';

export default function App() {
  const { sendNotification } = useNotifications();
  const [spaceCode, setSpaceCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [presence, setPresence] = useState<'online' | 'busy' | 'quiet'>('online');
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [recentSpaces, setRecentSpaces] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSpaces');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [lobbyInfo, setLobbyInfo] = useState<{ roomName: string; participantCount: number } | null>(null);

  const trendingSpaces = [
    "🔥 Trending: rift-valley-alpha (42 active)",
    "💬 Active now: general-chat (15 active)",
    "🎵 Popular: lo-fi-beats (89 active)",
    "🌍 Global: 1,024 spaces active right now"
  ];
  const [trendingIndex, setTrendingIndex] = useState(0);

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
      return;
    }

    setCodeError("");
    if (codeToUse && !recentSpaces.includes(codeToUse)) {
      setRecentSpaces(prev => [codeToUse, ...prev].slice(0, 5));
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
    <div className="min-h-screen bg-[url('/assets/background.jpg')] bg-cover bg-center text-slate-800 font-sans flex flex-col pb-20 md:pb-0">
      <header className="px-6 py-8 flex justify-between items-center max-w-5xl w-full mx-auto relative">
        <a href="https://drive.google.com/file/d/1sxwsqwE98cBS9ywm9_OsYeuTgBCHYz_i/view?usp=drive_link" target="_blank" rel="noopener noreferrer">
          <img src={logo} alt="SIRIKWA" className="h-10 w-auto animate-dance origin-bottom" />
        </a>

        {/* Cycling Trending Spaces */}
        <div className="hidden lg:flex flex-1 mx-8 justify-center items-center h-10 relative overflow-hidden bg-gradient-to-r from-rose-500/20 via-red-500/20 to-rose-500/20 rounded-full border border-rose-300/30 backdrop-blur-sm shadow-inner">
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
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200">
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
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter text-slate-900 mb-6">Connect and <span className="text-blue-600">collaborate.</span></h1>
          <p className="text-xl text-slate-600 max-w-lg mx-auto leading-relaxed">Secure, private, and instant connectivity for your community. Join a space to get started.</p>
        </section>

        <AnimatePresence mode="wait">
        {lobbyInfo ? (
          <Lobby 
            roomName={lobbyInfo.roomName}
            participantCount={lobbyInfo.participantCount}
            onEnter={() => setLobbyInfo(null)}
          />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(225,29,72,0.4)] w-full max-w-sm border border-rose-400/40 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/95 via-red-600/95 to-rose-800/95 backdrop-blur-xl z-0"></div>
              <div className="absolute inset-0 bg-[url('/assets/preview.webp')] bg-cover bg-center opacity-20 mix-blend-overlay z-0"></div>
              
              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="bg-white/10 p-4 rounded-3xl mb-6 shadow-inner border border-white/20 backdrop-blur-md">
                   <Users className="text-white w-8 h-8 opacity-90" />
                </div>
                <h2 className="text-3xl font-extrabold mb-1 tracking-tight text-white drop-shadow-sm text-center">Join a space</h2>
                <p className="text-rose-100/90 text-sm mb-8 text-center font-medium">Enter your code to connect</p>
                
                <div className="relative w-full">
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
                    className={`w-full p-4 pl-5 pr-28 rounded-2xl border ${codeError ? 'border-amber-300 bg-red-900/40' : 'border-white/20 bg-white/10'} focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all text-sm text-white placeholder:text-rose-200/70 shadow-inner backdrop-blur-md`}
                    autoFocus
                  />
                  {codeError && <p className="text-amber-200 text-xs mt-2 font-medium px-2">{codeError}</p>}
                  
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                    <button
                        onClick={() => setIsScanning(!isScanning)}
                        className={`p-2.5 rounded-xl ${isScanning ? 'bg-white/20 text-white' : 'text-rose-200/70'} hover:text-white hover:bg-white/10 transition backdrop-blur-sm`}
                        title="Scan QR Code"
                    >
                        <Camera size={18} />
                    </button>
                    <button 
                      onClick={handleJoinSpace}
                      disabled={!spaceCode.trim()}
                      className={`p-2.5 rounded-xl transition shadow-sm flex items-center justify-center ${spaceCode.trim().length > 0 ? 'bg-white text-rose-600 hover:bg-rose-50 cursor-pointer shadow-white/30' : 'bg-white/10 text-rose-300/40 cursor-not-allowed hidden'}`}
                    >
                      <ArrowRight size={18} className={spaceCode.trim().length > 0 ? '' : ''} />
                    </button>
                  </div>
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
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-px bg-slate-300/60 flex-1"></div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Recent Spaces</p>
                  <div className="h-px bg-slate-300/60 flex-1"></div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {recentSpaces.map(code => (
                    <button 
                      key={code}
                      onClick={() => setSpaceCode(code)}
                      className="px-4 py-2 bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 hover:shadow-sm transition-all"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isCreateModalOpen && (
              <div className="fixed inset-0 bg-[#2C211A]/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                <div className="bg-white p-8 rounded-3xl w-full max-w-sm border border-[#E5E1DA] shadow-xl">
                  <h3 className="text-xl font-bold mb-4">Create Space</h3>
                  <input type="text" placeholder="Space Name" className="w-full p-3 mb-3 border border-[#E5E1DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} />
                  <textarea placeholder="Description" className="w-full p-3 mb-3 border border-[#E5E1DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]" value={newSpaceDesc} onChange={e => setNewSpaceDesc(e.target.value)} />
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
                        setIsCreateModalOpen(false);
                        setNewSpaceName('');
                        setNewSpaceDesc('');
                        setIsPrivate(false);
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
            <button onClick={() => setIsCreateModalOpen(true)} className="w-full mt-6 text-sm font-semibold text-[#8B7E74] hover:text-[#1D4ED8] transition">Or create a new space</button>
          </>
        )}
        </AnimatePresence>


      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex md:hidden justify-around items-center z-40">
        <button 
          onClick={() => document.getElementById('space-code')?.focus()}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition"
        >
          <ArrowRight size={24} />
          <span className="text-[10px] font-semibold uppercase">Join</span>
        </button>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition"
        >
          <Plus size={24} />
          <span className="text-[10px] font-semibold uppercase">Create</span>
        </button>
        <button 
          onClick={() => setIsAuthModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition"
        >
          <User size={24} />
          <span className="text-[10px] font-semibold uppercase">Profile</span>
        </button>
      </nav>

      <footer className="p-8 text-center text-xs text-slate-500 font-medium tracking-wide">
        © 2026 SIRIKWA | Created by <a href="mailto:jamenya1988@gmail.com" className="hover:text-blue-600 font-semibold underline underline-offset-4">Kepler Camp Codes</a>
      </footer>
    </div>
  );
}

