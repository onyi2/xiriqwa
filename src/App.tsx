/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import logo from '../assets/logo.png';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MessageSquare, Video, Users, Copy, HelpCircle, Camera, LogIn, Plus, User } from 'lucide-react';
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
  const [recentSpaces, setRecentSpaces] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSpaces');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [lobbyInfo, setLobbyInfo] = useState<{ roomName: string; participantCount: number } | null>(null);

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
      if (typeof error === 'string' && error.includes('NotAllowedError')) {
        setPermissionDenied(true);
      }
      console.error(error);
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
      case 'busy': return 'bg-[#EF4444]';
      case 'quiet': return 'bg-[#F59E0B]';
      default: return 'bg-[#10B981]';
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
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF7] to-[#F3EFE9] text-[#2C211A] font-sans flex flex-col pb-20 md:pb-0">
      <header className="px-6 py-8 flex justify-between items-center max-w-5xl w-full mx-auto">
        <a href="https://drive.google.com/file/d/1sxwsqwE98cBS9ywm9_OsYeuTgBCHYz_i/view?usp=drive_link" target="_blank" rel="noopener noreferrer">
          <img src={logo} alt="SIRIKWA" className="h-10 w-auto" />
        </a>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-[#E5E1DA]">
            <div className={`w-2 h-2 rounded-full ${getPresenceColor(presence)}`} />
            <select
              value={presence}
              onChange={(e) => setPresence(e.target.value as 'online' | 'busy' | 'quiet')}
              className="text-xs font-medium text-[#2C211A] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="online">Online</option>
              <option value="busy">Busy</option>
              <option value="quiet">Quiet Mode</option>
            </select>
          </div>
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="text-sm font-semibold text-white bg-[#1D4ED8] px-5 py-2 rounded-full hover:bg-[#1e40af] transition flex items-center gap-2 shadow-lg shadow-[#1D4ED8]/20"
          >
            <LogIn size={16} />
            Sign In
          </button>
        </div>
      </header>

      <main className="flex-grow p-6 flex flex-col items-center justify-center">
        <section className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter text-[#2C211A] mb-6">Connect and <span className="text-[#1D4ED8]">collaborate.</span></h1>
          <p className="text-xl text-[#8B7E74] max-w-lg mx-auto leading-relaxed">Secure, private, and instant connectivity for your community. Join a space to get started.</p>
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
              className="bg-white p-10 rounded-[2rem] shadow-2xl shadow-[#c7c1b8]/30 w-full max-w-sm border border-[#E5E1DA]"
            >
              <h2 className="text-2xl font-bold mb-8 tracking-tight">Join a space</h2>
              
              <div className="relative">
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
                  className={`w-full p-4 pr-36 rounded-2xl border ${codeError ? 'border-red-400' : 'border-[#E5E1DA]'} focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] transition bg-[#FAF7F2] text-sm`}
                />
                {codeError && <p className="text-red-500 text-xs mt-2">{codeError}</p>}
                
                <button 
                  onClick={handleJoinSpace}
                  className="absolute right-2 top-2 p-3 bg-[#1D4ED8] text-white rounded-xl hover:bg-[#1e40af] transition shadow-md shadow-[#1D4ED8]/20"
                >
                  <ArrowRight size={20} />
                </button>
                <button
                    onClick={() => setIsScanning(!isScanning)}
                    className={`absolute right-14 top-2 p-3 ${isScanning ? 'text-[#EF4444]' : 'text-[#8B7E74]'} hover:text-[#1D4ED8] transition`}
                >
                    <Camera size={20} />
                </button>
              </div>
            </motion.div>

            {isScanning && (
              <div className="mt-4">
                {permissionDenied ? (
                  <div className="w-full rounded-2xl p-6 border border-red-200 bg-red-50 text-center">
                    <Camera className="mx-auto h-8 w-8 text-red-500 mb-2" />
                    <p className="text-red-700 font-medium mb-1">Camera access denied</p>
                    <p className="text-red-600 text-xs">Please allow camera access in your browser settings to scan QR codes.</p>
                  </div>
                ) : (
                  <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border border-[#E5E1DA]"></div>
                )}
              </div>
            )}

            {recentSpaces.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-widest text-[#8B7E74] mb-3 font-semibold">Recent Spaces</p>
                <div className="flex flex-wrap gap-2">
                  {recentSpaces.map(code => (
                    <button 
                      key={code}
                      onClick={() => setSpaceCode(code)}
                      className="px-3 py-1.5 bg-[#FAF7F2] border border-[#E5E1DA] rounded-lg text-xs font-medium text-[#2C211A] hover:border-[#1D4ED8] transition"
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

      <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-[#E5E1DA] px-4 py-3 flex md:hidden justify-around items-center z-40">
        <button 
          onClick={() => document.getElementById('space-code')?.focus()}
          className="flex flex-col items-center gap-1 text-[#8B7E74] hover:text-[#1D4ED8] transition"
        >
          <ArrowRight size={24} />
          <span className="text-[10px] font-semibold uppercase">Join</span>
        </button>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex flex-col items-center gap-1 text-[#8B7E74] hover:text-[#1D4ED8] transition"
        >
          <Plus size={24} />
          <span className="text-[10px] font-semibold uppercase">Create</span>
        </button>
        <button 
          onClick={() => setIsAuthModalOpen(true)}
          className="flex flex-col items-center gap-1 text-[#8B7E74] hover:text-[#1D4ED8] transition"
        >
          <User size={24} />
          <span className="text-[10px] font-semibold uppercase">Profile</span>
        </button>
      </nav>

      <footer className="p-8 text-center text-xs text-[#8B7E74] font-medium tracking-wide">
        © 2026 SIRIKWA | Created by <a href="mailto:jamenya1988@gmail.com" className="hover:text-[#1D4ED8] font-semibold underline underline-offset-4">Kepler Camp Codes</a>
      </footer>
    </div>
  );
}

