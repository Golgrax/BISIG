import React, { useState, useEffect, useMemo } from 'react';
import { 
  Languages, Camera, Video, Type, Settings2, RotateCcw, Sparkles, 
  MessageSquare, Volume2, History, BookOpen, Users, 
  Search, ChevronRight, Github, ExternalLink, Mail, User,
  Mic, Star, ThumbsUp, ThumbsDown, X, Play, Trophy, Sliders,
  ArrowRight, Shield, Zap, Globe, Heart, LogIn, UserPlus, LogOut
} from 'lucide-react';
import { auth, db } from './firebase';
import dictionaryData from './data/dictionary.json';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

/* --- Shared Layout Components --- */

const Nav = ({ page, setPage, onOpenPanel, user, onLogout }: any) => (
  <header className="container" style={{ padding: '2rem 0' }}>
    <div className="flex justify-between items-center">
      <div className="flex" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
        <div style={{ background: 'var(--accent)', width: '44px', height: '44px', borderRadius: '12px', border: '2px solid var(--border)', boxShadow: 'var(--sh-pop)' }}>
          {/* Logo Placeholder */}
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-1px', lineHeight: '44px' }}>BISIG</h2>
        </div>
      </div>
      <div className="flex">
        <button className={`btn ghost ${page === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}>Home</button>
        <button className={`btn ghost ${page === 'translator' ? 'active' : ''}`} onClick={() => setPage('translator')}>Translator</button>
        <button className={`btn ghost ${page === 'learn' ? 'active' : ''}`} onClick={() => setPage('learn')}>Dictionary</button>
        <button className={`btn ghost ${page === 'about' ? 'active' : ''}`} onClick={() => setPage('about')}>Research</button>
        
        <div className="flex" style={{ marginLeft: '1rem', borderLeft: '2px solid var(--border)', paddingLeft: '1rem', gap: '0.5rem' }}>
          <button className="btn ghost" onClick={() => onOpenPanel('history')} style={{ padding: '0.6rem' }} title="History"><History size={20} /></button>
          <button className="btn ghost" onClick={() => onOpenPanel('settings')} style={{ padding: '0.6rem' }} title="Settings"><Settings2 size={20} /></button>
          
          {user ? (
            <div className="flex gap-2 items-center">
              <div
                onClick={() => onOpenPanel('profile')}
                style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid var(--border)', background: 'var(--tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '2px 2px 0 var(--border)' }}
              >
                <User size={20} strokeWidth={2.5} />
              </div>
              <button className="btn ghost" onClick={onLogout} style={{ padding: '0.6rem' }} title="Logout"><LogOut size={20} /></button>
            </div>
          ) : (
            <div className="flex" style={{ gap: '0.5rem' }}>
              <button className="btn ghost" onClick={() => onOpenPanel('auth', 'login')} style={{ fontWeight: 800 }}>
                Login
              </button>
              <button className="btn primary animate-pop" onClick={() => onOpenPanel('auth', 'signup')} style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}>
                Join BISIG
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  </header>
);

const Foot = () => (
  <footer className="container" style={{ padding: '8rem 0 4rem' }}>
    <div className="card" style={{ background: 'var(--fg)', color: 'white', padding: '4rem' }}>
      <div className="grid grid-2">
        <div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Bridge the Gap.</h2>
          <p style={{ opacity: 0.6, fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '400px' }}>A BSIT 3-2 university initiative empowering the Filipino deaf community.</p>
          <div className="flex">
            <button className="btn primary">Join Initiative</button>
            <button className="btn ghost" style={{ color: 'white' }}>Contact Us</button>
          </div>
        </div>
        <div className="grid grid-2" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '3rem' }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: '0.7rem', opacity: 0.4, marginBottom: '1.5rem', textTransform: 'uppercase' }}>Research Team</p>
            <ul style={{ listStyle: 'none', opacity: 0.8, fontSize: '0.9rem' }}>
              <li>Bughaw, Karl Benjamin</li>
              <li>Sanchez, Lennon</li>
              <li>Azuela, Benz</li>
              <li>Habitan, Suzanne</li>
            </ul>
          </div>
          <div className="flex" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <p style={{ fontWeight: 800, fontSize: '0.7rem', opacity: 0.4, marginBottom: '1.5rem', textTransform: 'uppercase' }}>Social</p>
            <div className="flex" style={{ gap: '1.5rem' }}>
              <div style={{ cursor: 'pointer' }}><Github size={20} /></div>
              <div style={{ cursor: 'pointer' }}><ExternalLink size={20} /></div>
              <div style={{ cursor: 'pointer' }}><Mail size={20} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

/* --- Panels --- */

const SidePanel = ({ isOpen, type, onClose, data, user, onLogin, onSignup, initialAuthMode }: any) => {
  const [authMode, setAuthMode] = useState(initialAuthMode || 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen && initialAuthMode) {
      setAuthMode(initialAuthMode);
    }
  }, [isOpen, initialAuthMode]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (authMode === 'login') {
      onLogin(username, password);
    } else {
      onSignup(username, password);
    }
  };

  return (
    <>
      <div className={`panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`side-panel ${isOpen ? 'open' : ''}`}>
        <div className="flex justify-between items-center mb-12">
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>
            {type === 'history' ? 'History' : type === 'settings' ? 'Settings' : type === 'auth' ? (authMode === 'login' ? 'Login' : 'Sign Up') : 'Profile'}
          </h2>
          <button className="btn ghost" onClick={onClose} style={{ padding: '0.5rem' }}><X size={32} /></button>
        </div>
        
        {type === 'history' ? (
          /* ... existing history content ... */
          <div className="flex flex-col gap-4">
            <div className="badge secondary" style={{ marginBottom: '1rem' }}>{user ? 'ACCOUNT HISTORY' : 'LOCAL SESSIONS'}</div>
            {data.length === 0 ? <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '4rem' }}>No recent translations.</p> : data.map((item: any, i: number) => (
              <div key={i} className="card" style={{ padding: '1.5rem' }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="badge" style={{ fontSize: '0.6rem' }}>{item.mode === 's2t' ? 'Sign to Text' : 'Text to Sign'}</div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{item.time}</span>
                </div>
                <p style={{ fontWeight: 800 }}>{item.text}</p>
              </div>
            ))}
            {!user && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--tertiary)', borderRadius: 'var(--rd-sm)', border: '2px solid var(--border)' }}>
                <p style={{ fontWeight: 800, fontSize: '0.8rem' }}>Save to Account?</p>
                <p style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '1rem' }}>Log in to sync your history across devices.</p>
                <button className="btn primary w-full" onClick={() => { onClose(); /* Trigger Auth logic */ }}>Sign Up Now</button>
              </div>
            )}
          </div>
        ) : type === 'auth' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="settings-group">
              <label className="settings-label" style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '2px' }}>USERNAME</label>
              <input 
                type="text" 
                className="pop-input" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="settings-group">
              <label className="settings-label" style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '2px' }}>PASSWORD</label>
              <input 
                type="password" 
                className="pop-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn primary heavy-shadow w-full" style={{ padding: '1.2rem', borderRadius: 'var(--rd-sm)', fontSize: '1rem' }}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
            <p className="text-center" style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '1rem' }}>
              {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button 
                type="button" 
                className="btn ghost" 
                style={{ color: 'var(--accent)', padding: '0 0.5rem', fontWeight: 900 }}
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              >
                {authMode === 'login' ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </form>
        ) : type === 'profile' ? (
          <div className="flex flex-col gap-8">
            <div className="card text-center" style={{ padding: '2rem', borderStyle: 'dashed' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--tertiary)', border: '3px solid var(--border)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={40} />
              </div>
              <h3 style={{ fontSize: '1.5rem' }}>{user?.username || 'User Guest'}</h3>
              <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Level 5 Signer</p>
            </div>
            <div className="grid grid-2 gap-4">
              <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <h4 style={{ color: 'var(--accent)' }}>124</h4>
                <p style={{ fontSize: '0.6rem', fontWeight: 800 }}>SIGNS LEARNED</p>
              </div>
              <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <h4 style={{ color: 'var(--secondary)' }}>12</h4>
                <p style={{ fontSize: '0.6rem', fontWeight: 800 }}>STREAK DAYS</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8" style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', marginRight: '-1rem' }}>
            <div className="settings-group">
              <label className="settings-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                Design Styles
                <span className="badge accent" style={{ fontSize: '0.6rem', border: 'none' }}>30 UNIQUE</span>
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { name: 'Monochrome', mode: 'Light' }, { name: 'Bauhaus', mode: 'Light' }, { name: 'Modern Dark', mode: 'Dark' },
                  { name: 'Newsprint', mode: 'Light' }, { name: 'SaaS', mode: 'Light' }, { name: 'Luxury', mode: 'Light' },
                  { name: 'Terminal', mode: 'Dark' }, { name: 'Swiss Minimalist', mode: 'Light' }, { name: 'Kinetic', mode: 'Dark' },
                  { name: 'Flat Design', mode: 'Light' }, { name: 'Art Deco', mode: 'Dark' }, { name: 'Material Design', mode: 'Light' },
                  { name: 'Neo Brutalism', mode: 'Light' }, { name: 'Bold Typography', mode: 'Dark' }, { name: 'Academia', mode: 'Light' },
                  { name: 'Cyberpunk', mode: 'Dark' }, { name: 'Web3', mode: 'Dark' }, { name: 'Playful Geometric', mode: 'Light', active: true },
                  { name: 'Minimal Dark', mode: 'Dark' }, { name: 'Claymorphism', mode: 'Light' }, { name: 'Professional', mode: 'Light' },
                  { name: 'Botanical', mode: 'Light' }, { name: 'Vaporwave', mode: 'Dark' }, { name: 'Enterprise', mode: 'Light' },
                  { name: 'Sketch', mode: 'Light' }, { name: 'Industrial', mode: 'Light' }, { name: 'Neumorphism', mode: 'Light' },
                  { name: 'Organic', mode: 'Light' }, { name: 'Maximalism', mode: 'Light' }, { name: 'Retro', mode: 'Light' }
                ].map((style) => (
                  <button key={style.name} className={`btn ghost ${style.active ? 'active' : ''}`} style={{ justifyContent: 'space-between', padding: '1rem', fontSize: '0.9rem', width: '100%', borderRadius: 'var(--rd-sm)' }}>
                    <span style={{ fontWeight: 800 }}>{style.name}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 900, textTransform: 'uppercase', background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px' }}>{style.mode}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/* --- Page Components --- */

const LandingPage = ({ setPage }: any) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="animate-pop">
      <section className="container hero-gradient" style={{ padding: '6rem 0', borderRadius: 'var(--rd-lg)', marginTop: '2rem', overflow: 'hidden' }}>
        <div className="grid grid-2 items-center">
          <div style={{ padding: '2rem', transform: `translateY(${scrollY * 0.15}px)`, transition: 'transform 0.1s ease-out' }}>
            <h1 style={{ fontSize: '5rem', marginBottom: '1.5rem', lineHeight: 1, letterSpacing: '-4px' }}>
              Signs to Speech, <br/>
              <span style={{ color: 'var(--accent)' }}>Instantly.</span>
            </h1>
            <p style={{ fontSize: '1.4rem', color: 'var(--muted)', marginBottom: '3rem', maxWidth: '500px' }}>
              The world's first pose-based bidirectional interface for Filipino Sign Language. Empowering 1.2M+ Filipinos.
            </p>
            <div className="flex" style={{ gap: '1.5rem' }}>
              <button className="btn primary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem' }} onClick={() => setPage('translator')}>
                Launch Translator <ArrowRight size={20} />
              </button>
              <button className="btn secondary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem' }} onClick={() => setPage('learn')}>
                FSL Dictionary
              </button>
            </div>
          </div>
          <div style={{ position: 'relative', transform: `translateY(${scrollY * -0.1}px)`, transition: 'transform 0.1s ease-out' }}>
             <div className="card featured" style={{ transform: 'rotate(3deg)', padding: '1rem' }}>
                <div style={{ background: 'var(--fg)', borderRadius: 'var(--rd)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                   <div className="loading" style={{ width: '60px', height: '60px', border: '4px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                </div>
             </div>
             <div className="card" style={{ position: 'absolute', bottom: '-20px', left: '-20px', padding: '1.5rem', transform: `rotate(-5deg) translateY(${scrollY * 0.05}px)`, width: '200px' }}>
                <div className="flex" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Heart size={16} color="var(--secondary)" fill="var(--secondary)" />
                  <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>Community First</span>
                </div>
                <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>Designed with the deaf community in mind.</p>
             </div>
          </div>
        </div>
      </section>
      
      {/* Minimal Feature Row */}
      <section className="container grid grid-3" style={{ padding: '8rem 0' }}>
        <div className="card" style={{ transform: `translateY(${scrollY * 0.05}px)` }}><Zap size={32} color="var(--tertiary)" /><h3 className="mt-4">Real-time</h3><p style={{opacity: 0.6}}>Under 750ms latency.</p></div>
        <div className="card" style={{ transform: `translateY(${scrollY * 0.02}px)` }}><Shield size={32} color="var(--accent)" /><h3 className="mt-4">Privacy</h3><p style={{opacity: 0.6}}>On-device pose processing.</p></div>
        <div className="card" style={{ transform: `translateY(${scrollY * 0.08}px)` }}><Globe size={32} color="var(--quaternary)" /><h3 className="mt-4">Localized</h3><p style={{opacity: 0.6}}>FSL trained models.</p></div>
      </section>
    </div>
  );
};

const TranslatorPage = ({ addToHistory }: any) => {
  const [mode, setMode] = useState('sign-to-text');
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [translatedVideos, setTranslatedVideos] = useState<any[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  // Dynamically determine the API Base URL
  const getApiBase = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    // Handle GitHub Codespaces URLs (port 5173 -> 8000)
    if (hostname.includes('github.dev')) {
      return `https://${hostname.replace('-5173', '-8000')}`;
    }
    return 'http://localhost:8000'; // Default fallback
  };

  const API_BASE = getApiBase();

  const translateText = async (text: string) => {
    if (!text.trim()) {
      setTranslatedVideos([]);
      return;
    }
    setIsTranslating(true);
    try {
      const response = await fetch(`${API_BASE}/translate?text=${encodeURIComponent(text)}`);
      const data = await response.json();
      setTranslatedVideos(data.videos || []);
      setCurrentVideoIndex(0);
      addToHistory({ mode: 't2s', text: text, time: 'Just now' });
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Real-time translation with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputText.trim()) {
        translateText(inputText);
      } else {
        setTranslatedVideos([]);
      }
    }, 800); // Wait 800ms after last keystroke
    return () => clearTimeout(timer);
  }, [inputText]);

  const handleVideoEnd = () => {
    if (currentVideoIndex < translatedVideos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else {
      setTimeout(() => setCurrentVideoIndex(0), 1000);
    }
  };

  const toggleMic = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        const result = "Hello";
        setInputText(result);
      }, 2000);
    }
  };

  return (
    <div className="animate-pop">
      <section className="container" style={{ padding: '4rem 0' }}>
        <h1 style={{ fontSize: '4rem', maxWidth: '800px', marginBottom: '1.5rem' }}>
          Bridging Signs with <span style={{ color: 'var(--accent)', position: 'relative' }}>Intelligence.</span>
        </h1>
      </section>

      <section className="container">
        <div className="grid grid-12">
          <div className="col-6" style={{ gridColumn: 'span 6' }}>
            <div className={`card ${mode === 'sign-to-text' ? 'featured' : ''}`} style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between mb-6">
                <div className="flex">
                  <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '12px', border: '2px solid var(--border)' }}>
                    {mode === 'sign-to-text' ? <Camera color="var(--accent)" /> : <Type color="var(--muted)" />}
                  </div>
                  <span style={{ fontWeight: 800 }}>{mode === 'sign-to-text' ? 'Sign Input' : 'Text Input'}</span>
                </div>
                <div className="badge" style={{ fontSize: '0.7rem' }}>FSL MODE</div>
              </div>
              <div className="view-port" style={{ flex: 1, flexDirection: 'column' }}>
                {mode === 'sign-to-text' ? (
                  <>
                    <div className="loading" style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '50%', 
                      border: '6px solid var(--accent-soft)', 
                      borderTopColor: 'var(--accent)', 
                      marginBottom: '1.5rem' 
                    }}></div>
                    <p style={{ fontWeight: 800, opacity: 0.4, fontSize: '0.75rem', letterSpacing: '2px', textAlign: 'center' }}>SEARCHING FOR CAMERA...</p>
                  </>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                      <button 
                        className={`btn ${isListening ? 'mic-active' : ''}`} 
                        onClick={toggleMic} 
                        style={{ width: '56px', height: '56px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-pop)' }}
                      >
                        <Mic size={24} />
                      </button>
                    </div>
                    <textarea 
                      style={{ width: '100%', flex: 1, background: 'none', border: 'none', outline: 'none', padding: '2rem', fontSize: '2.2rem', fontWeight: 800, fontFamily: 'inherit', resize: 'none' }}
                      placeholder="Type message..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-6" style={{ gridColumn: 'span 6' }}>
            <div className={`card ${mode !== 'sign-to-text' ? 'featured' : ''}`} style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between mb-6">
                <div className="flex">
                  <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '12px', border: '2px solid var(--border)' }}>
                    {mode !== 'sign-to-text' ? <Video color="var(--accent)" /> : <MessageSquare color="var(--muted)" />}
                  </div>
                  <span style={{ fontWeight: 800 }}>{mode !== 'sign-to-text' ? 'Avatar View' : 'Translated Text'}</span>
                </div>
                <div className="badge" style={{ fontSize: '0.7rem' }}>LIVE API</div>
              </div>
              <div className="view-port dark" style={{ flex: 1, overflowY: 'hidden', padding: '0' }}>
                {mode !== 'sign-to-text' ? (
                  isTranslating ? (
                    <div className="text-center">
                      <div className="loading" style={{ width: '60px', height: '60px', border: '4px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                      <p style={{ marginTop: '1.5rem', fontWeight: 800, letterSpacing: '2px', fontSize: '0.7rem', opacity: 0.6 }}>TRANSLATING...</p>
                    </div>
                  ) : translatedVideos.length > 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full" style={{ background: '#000', position: 'relative' }}>
                       <video 
                         key={currentVideoIndex}
                         src={translatedVideos[currentVideoIndex].url} 
                         autoPlay 
                         onEnded={handleVideoEnd}
                         style={{ height: '100%', width: '100%', objectFit: 'contain' }} 
                       />
                       <div style={{ position: 'absolute', bottom: '2rem', left: '0', right: '0', textAlign: 'center' }}>
                          <span className="badge accent" style={{ fontSize: '1.2rem', padding: '0.5rem 1.5rem', color: 'black', fontWeight: 900 }}>
                            {translatedVideos[currentVideoIndex].word.toUpperCase()}
                          </span>
                          <div className="flex justify-center gap-1 mt-4">
                            {translatedVideos.map((_, i) => (
                              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === currentVideoIndex ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }}></div>
                            ))}
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p style={{ fontWeight: 800, opacity: 0.4, fontSize: '0.8rem' }}>AWAITING TEXT...</p>
                    </div>
                  )
                ) : (
                  <div className="text-center">
                    <h2 style={{ fontSize: '3.5rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>"..."</h2>
                    <p style={{ fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px' }}>Awaiting Sign Input</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="switcher-pill">
          <button className={`btn ${mode === 'sign-to-text' ? 'active' : 'ghost'}`} onClick={() => setMode('sign-to-text')} style={{ border: 'none' }}>Sign to Text</button>
          <div onClick={() => setMode(mode === 'sign-to-text' ? 'text-to-sign' : 'sign-to-text')} style={{ width: '44px', height: '44px', background: 'var(--tertiary)', borderRadius: '50%', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RotateCcw size={20} strokeWidth={3} className={mode === 'text-to-sign' ? 'loading' : ''} />
          </div>
          <button className={`btn ${mode !== 'sign-to-text' ? 'active' : 'ghost'}`} onClick={() => setMode('text-to-sign')} style={{ border: 'none' }}>Text to Sign</button>
        </div>
      </section>
    </div>
  );
};

const DictionaryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dictionary, setDictionary] = useState<any[]>(dictionaryData);
  const [loading, setLoading] = useState(false);

  const getApiBase = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    if (hostname.includes('github.dev')) {
      return `https://${hostname.replace('-5173', '-8000')}`;
    }
    return 'http://localhost:8000';
  };

  const API_BASE = getApiBase();

  const filteredData = useMemo(() => {
    return dictionary.filter(item => 
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, dictionary]);


  return (
    <div className="animate-pop container" style={{ padding: '4rem 0' }}>
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>FSL <span style={{ color: 'var(--tertiary)' }}>Dictionary</span></h1>
          <p style={{ opacity: 0.6, fontSize: '1.2rem' }}>Browse sign entries powered by BISIG API.</p>
        </div>
        <div style={{ position: 'relative', width: '300px' }}>
          <input 
            type="text" 
            className="pop-input" 
            placeholder="Search signs..." 
            style={{ paddingLeft: '3rem' }} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
        </div>
      </div>
      
      {loading ? (
        <div style={{ padding: '8rem 0', textAlign: 'center' }}>
          <div className="loading" style={{ width: '40px', height: '40px', border: '4px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto' }}></div>
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ padding: '8rem 0', textAlign: 'center', opacity: 0.5 }}>
          <Search size={48} style={{ marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>No signs found for "{searchTerm}"</p>
        </div>
      ) : (
        <div className="dictionary-grid">
          {filteredData.map((item) => (
            <div key={item.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ background: 'var(--fg)', borderRadius: 'var(--rd-sm)', aspectRatio: '4/3', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <video 
                  src={`${API_BASE}/videos/${item.word.toLowerCase()}.mp4`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onMouseOver={e => (e.target as HTMLVideoElement).play()}
                  onMouseOut={e => {
                    const v = (e.target as HTMLVideoElement);
                    v.pause();
                    v.currentTime = 0;
                  }}
                  muted
                  loop
                />
              </div>
              <div className="flex justify-between">
                <div>
                  <h3 style={{ fontSize: '1.2rem' }}>{item.word}</h3>
                  <p style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>{item.category}</p>
                </div>
                <div className="badge">FSL</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ResearchPage = () => (
  <div className="animate-pop container" style={{ padding: '4rem 0' }}>
    <div className="grid grid-2" style={{ alignItems: 'center', marginBottom: '8rem' }}>
      <div>
        <h1 style={{ fontSize: '4rem', lineHeight: 1, marginBottom: '2rem' }}>Empowering through <span style={{ color: 'var(--accent)' }}>Technology.</span></h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.6, marginBottom: '2.5rem' }}>
          BISIG (FSL Intelligence) is a university-led initiative focused on bridging the communication gap between the deaf and hearing communities in the Philippines using real-time pose estimation and AI.
        </p>
        <div className="flex">
          <button className="btn primary">Read Paper</button>
          <button className="btn ghost">Dataset Source</button>
        </div>
      </div>
      <div className="card featured" style={{ padding: '3rem', transform: 'rotate(2deg)' }}>
        <Users size={48} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ marginBottom: '1rem' }}>User-Centric Design</h2>
        <p style={{ opacity: 0.6 }}>Our models are trained on real-world FSL data collected from local deaf volunteers, ensuring cultural and linguistic accuracy.</p>
      </div>
    </div>

    <div className="text-center mb-12">
      <h2 style={{ fontSize: '2.5rem' }}>Meet the <span style={{ color: 'var(--secondary)' }}>Team</span></h2>
    </div>

    <div className="grid grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
      {[
        { name: 'Bughaw, Karl Benjamin', role: 'Lead Developer' },
        { name: 'Sanchez, Lennon', role: 'AI Researcher' },
        { name: 'Azuela, Benz', role: 'UI/UX Designer' },
        { name: 'Habitan, Suzanne', role: 'Data Specialist' }
      ].map((member) => (
        <div key={member.name} className="card text-center" style={{ padding: '2rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--surface)', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border)' }}>
            <User size={40} opacity={0.3} />
          </div>
          <h4 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>{member.name.split(',')[1]}</h4>
          <p style={{ fontWeight: 900, fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase' }}>{member.role}</p>
        </div>
      ))}
    </div>
  </div>
);

/* --- Main App --- */

const App = () => {
  const [page, setPage] = useState('home');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('history');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Listen for Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ id: firebaseUser.uid, username: firebaseUser.email?.split('@')[0] });
        fetchHistory(firebaseUser.uid);
      } else {
        setUser(null);
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => window.scrollTo(0, 0), [page]);

  const fetchHistory = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'history'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        time: (doc.data() as any).createdAt?.toDate()?.toLocaleTimeString() || 'Just now'
      }));
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const onLogin = async (u: string, p: string) => {
    try {
      // Assuming u is email for simplicity in Firebase, otherwise we'd need a lookup
      const email = u.includes('@') ? u : `${u}@bisig.app`;
      await signInWithEmailAndPassword(auth, email, p);
      setIsPanelOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const onSignup = async (u: string, p: string) => {
    try {
      const email = u.includes('@') ? u : `${u}@bisig.app`;
      await createUserWithEmailAndPassword(auth, email, p);
      setIsPanelOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const onLogout = async () => {
    await signOut(auth);
  };

  const addToHistory = async (entry: any) => {
    const newEntry = { 
      ...entry, 
      createdAt: new Date(),
      userId: user?.id || 'guest' 
    };

    if (user) {
      try {
        await addDoc(collection(db, 'history'), {
          ...entry,
          userId: user.id,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Error saving history to Firestore:', err);
      }
    }
    setHistory([newEntry, ...history]);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav 
        page={page} 
        setPage={setPage} 
        onOpenPanel={(t:any, m?: string) => { 
          setActivePanel(t); 
          if (m) setAuthMode(m); 
          setIsPanelOpen(true); 
        }} 
        user={user} 
        onLogout={() => { setUser(null); setHistory([]); }} 
      />
      <main style={{ flex: 1 }}>
        {page === 'home' ? (
          <LandingPage setPage={setPage} />
        ) : page === 'translator' ? (
          <TranslatorPage addToHistory={addToHistory} />
        ) : page === 'learn' ? (
          <DictionaryPage />
        ) : (
          <ResearchPage />
        )}
      </main>
      <Foot />
      <SidePanel 
        isOpen={isPanelOpen} 
        type={activePanel} 
        initialAuthMode={authMode} 
        onClose={() => setIsPanelOpen(false)} 
        data={history} 
        user={user} 
        onLogin={onLogin} 
        onSignup={onSignup} 
      />
    </div>
  );
};

export default App;
