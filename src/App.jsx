import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  Trophy, Users, Phone, User, Activity, CheckCircle, AlertCircle,
  Calendar, MapPin, Sun, Volume2, VolumeX, Sparkles, Medal, ShieldAlert,
  ChevronRight
} from 'lucide-react';

// --- ක්‍රීඩා සැකසුම් (CONFIGURATION) ---
const SPORTS_CONFIG = {
  Cricket: {
    name: 'ක්‍රිකට්',
    icon: <Medal className="w-6 h-6 md:w-8 md:h-8" />,
    players: 6,
    allowedGenders: ['Men'],
    maxTeams: 15,
    description: "එක් පිලකට ක්‍රීඩකයින් 6යි. (පිරිමි පමණයි)"
  },
  Elle: {
    name: 'එල්ලේ',
    icon: <Users className="w-6 h-6 md:w-8 md:h-8" />,
    players: 16,
    allowedGenders: ['Women'],
    maxTeams: 10,
    description: "එක් පිලකට ක්‍රීඩිකාවන් 16යි. (කාන්තා පමණයි)"
  },
  Volleyball: {
    name: 'වොලිබෝල්',
    icon: <Trophy className="w-6 h-6 md:w-8 md:h-8" />,
    players: 6,
    allowedGenders: ['Men', 'Women'],
    maxTeams: 10,
    description: "එක් පිලකට ක්‍රීඩකයින් 6යි. (පිරිමි සහ කාන්තා අංශ)"
  }
};

export default function App() {
  // Firebase & Auth State
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [appId, setAppId] = useState('default-app-id');
  const [firebaseError, setFirebaseError] = useState('');

  // App State
  const [registrations, setRegistrations] = useState([]);
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'view'

  // Form State
  const [formData, setFormData] = useState({
    sport: '',
    gender: '',
    teamName: '',
    captainName: '',
    contactNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isMuted, setIsMuted] = useState(true);

  // --- TAILWIND CSS AUTO-INJECTOR ---
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // MONA KE MOO U BEHANG TLHOPHISO EA HAU EA FIREBASE (LOCAL CONFIG)
        // මෙහි ඔබගේ LOCAL FIREBASE CONFIG එක ලබා දෙන්න
        const localFirebaseConfig  = {
          apiKey: "AIzaSyCnZJIgSNjMkuGvtB-iqsmda3ykfzamBOg",
          authDomain: "onlinechat-a9869.firebaseapp.com",
          databaseURL: "https://onlinechat-a9869-default-rtdb.asia-southeast1.firebasedatabase.app",
          projectId: "onlinechat-a9869",
          storageBucket: "onlinechat-a9869.firebasestorage.app",
          messagingSenderId: "474977495278",
          appId: "1:474977495278:web:357daefb54fc0c8278abff",
          measurementId: "G-5KETSS1NQP"
        };

        const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
        const firebaseConfig = configStr ? JSON.parse(configStr) : localFirebaseConfig;

        if (!firebaseConfig || !firebaseConfig.projectId) {
          setFirebaseError("Firebase configuration එක නොමැත.");
          return;
        }

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const firestoreDb = getFirestore(app);

        setDb(firestoreDb);
        if (typeof __app_id !== 'undefined') {
          setAppId(__app_id);
        }

        // Authenticate
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error("Firebase Initialization Error:", err);
        setFirebaseError("දත්ත ගබඩාව හා සම්බන්ධ වීමට නොහැකි විය.");
      }
    };

    initFirebase();
  }, []);

  // Fetch Data
  useEffect(() => {
    if (!user || !db) return;

    const registrationsRef = collection(db, 'artifacts', appId, 'public', 'data', 'registrations');

    const unsubscribe = onSnapshot(registrationsRef,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setRegistrations(data);
        },
        (error) => {
          console.error("Error fetching registrations:", error);
          setFirebaseError("ලියාපදිංචි දත්ත ලබා ගැනීමට නොහැකි විය.");
        }
    );

    return () => unsubscribe();
  }, [user, db, appId]);

  // Capacity Checks
  const getCapacityInfo = (sport, gender) => {
    if (!sport) return null;

    const config = SPORTS_CONFIG[sport];
    let currentCount = 0;
    let max = config.maxTeams;

    if (sport === 'Volleyball') {
      if (!gender) return { current: 0, max, isFull: false };
      currentCount = registrations.filter(r => r.sport === sport && r.gender === gender).length;
    } else {
      currentCount = registrations.filter(r => r.sport === sport).length;
    }

    return {
      current: currentCount,
      max: max,
      isFull: currentCount >= max
    };
  };

  const capacityInfo = useMemo(() => {
    return getCapacityInfo(formData.sport, formData.gender);
  }, [formData.sport, formData.gender, registrations]);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'sport') {
        if (value === 'Cricket') newData.gender = 'Men';
        else if (value === 'Elle') newData.gender = 'Women';
        else newData.gender = '';
      }
      return newData;
    });
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !db) {
      showNotification("දත්ත ගබඩාව හා සම්බන්ධ වීමට නොහැක. කරුණාකර රැඳී සිටින්න.", "error");
      return;
    }

    if (capacityInfo?.isFull) {
      showNotification(`කණගාටුයි, ${SPORTS_CONFIG[formData.sport].name} ${formData.gender ? `(${formData.gender === 'Men' ? 'පිරිමි' : 'කාන්තා'})` : ''} සඳහා ලියාපදිංචිය පිරී ඇත.`, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const registrationsRef = collection(db, 'artifacts', appId, 'public', 'data', 'registrations');
      await addDoc(registrationsRef, {
        ...formData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      showNotification("කණ්ඩායම සාර්ථකව ලියාපදිංචි කරන ලදී! 🎉");
      setFormData({
        sport: '',
        gender: '',
        teamName: '',
        captainName: '',
        contactNumber: ''
      });
      setActiveTab('view');
    } catch (err) {
      console.error("Error adding document: ", err);
      showNotification("ලියාපදිංචි කිරීම අසාර්ථක විය. කරුණාකර නැවත උත්සාහ කරන්න.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI Components
  const NotificationBar = () => {
    if (!notification) return null;
    const isError = notification.type === 'error';
    return (
        <div className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-md z-50 animate-bounce-short">
          <div className={`px-4 md:px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-xl border ${isError ? 'bg-red-950/90 border-red-500/50 text-red-100' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'}`}>
            {isError ? <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-400" /> : <CheckCircle className="w-6 h-6 flex-shrink-0 text-emerald-400" />}
            <span className="font-semibold text-sm md:text-[15px]">{notification.message}</span>
          </div>
        </div>
    );
  };

  return (
      <div className="min-h-screen bg-zinc-950 font-sans text-slate-200 selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden relative z-0">

        {/* CSS Animations & Scrollbar */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          
          @keyframes bounce-short {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          .animate-bounce-short { animation: bounce-short 0.5s ease-in-out; }
          
          @keyframes glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .animate-glow { animation: glow 3s ease-in-out infinite; }

          /* Tlosa scrollbar thekong ea theknoloji molemong oa botle mohaleng */
          .scrollbar-hide::-webkit-scrollbar {
              display: none;
          }
          .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }
        `}} />

        {/* --- Background Video & Overlays --- */}
        <div className="fixed inset-0 w-full h-full z-[-1]">
          <video autoPlay loop muted={isMuted} playsInline className="w-full h-full object-cover opacity-30">
            <source src="/video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/40 via-red-950/80 to-zinc-950/95"></div>

          {/* Orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500 rounded-full mix-blend-screen filter blur-[100px] md:blur-[150px] opacity-20 animate-glow"></div>
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-rose-600 rounded-full mix-blend-screen filter blur-[100px] md:blur-[150px] opacity-20 animate-glow" style={{ animationDelay: '1.5s' }}></div>

          <button
              onClick={() => setIsMuted(!isMuted)}
              className="fixed bottom-6 right-4 md:right-6 z-50 p-3 md:p-4 bg-zinc-900/80 hover:bg-zinc-800 rounded-full text-white border border-white/10 backdrop-blur-xl transition-all shadow-2xl hover:scale-110 active:scale-95"
              title="හඬ වෙනස් කරන්න"
          >
            {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6 text-rose-400" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />}
          </button>
        </div>

        <NotificationBar />

        {/* --- Hero Section --- */}
        <div className="relative pt-12 md:pt-16 pb-8 md:pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in-up">
            <div className="flex flex-col items-center justify-center mb-6 relative">
              <div className="absolute w-24 h-24 md:w-32 md:h-32 bg-amber-400/20 rounded-full blur-2xl"></div>
              <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-20 md:h-32 object-contain drop-shadow-2xl relative z-10"
                  onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 tracking-tight mb-3 drop-shadow-lg leading-tight">
              මොරපතාව සියපත් සිය උදානය 2026<br/>
              <span className="text-2xl sm:text-3xl md:text-5xl text-white mt-2 md:mt-3 block font-bold tracking-normal drop-shadow-md">
                බක්මහ උළෙල
              </span>
            </h1>

            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium mb-6 md:mb-8 text-xs md:text-sm shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
              <span>මහා සංස්කෘතික මංගල්‍යය - ක්‍රීඩා ලියාපදිංචිය</span>
              <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 text-slate-300 text-sm font-medium">
              <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900/50 px-4 md:px-5 py-2.5 rounded-xl md:rounded-2xl border border-white/5 backdrop-blur-md shadow-xl">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                <span>දිනය පසුව දැනුම් දෙනු ලැබේ</span>
              </div>
              <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900/50 px-4 md:px-5 py-2.5 rounded-xl md:rounded-2xl border border-white/5 backdrop-blur-md shadow-xl">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />
                <span>සමනල ක්‍රීඩාංගනය, මොරපතාව</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Main Content --- */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 pb-24 md:pb-20">

          {firebaseError && (
              <div className="mb-6 p-4 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 flex items-center gap-3 backdrop-blur-md animate-fade-in-up">
                <ShieldAlert className="w-6 h-6 flex-shrink-0 text-rose-500" />
                <p className="font-medium text-sm md:text-base">{firebaseError}</p>
              </div>
          )}

          {/* --- Tab Navigation --- */}
          <div className="flex justify-center mb-8 animate-fade-in-up overflow-x-auto scrollbar-hide w-full" style={{ animationDelay: '0.1s' }}>
            <div className="bg-zinc-900/60 p-1.5 rounded-2xl md:rounded-full border border-white/10 flex flex-row backdrop-blur-xl shadow-2xl relative w-full sm:w-auto min-w-[280px]">
              <button
                  onClick={() => setActiveTab('register')}
                  className={`relative flex-1 sm:w-auto px-4 md:px-8 py-3.5 rounded-xl md:rounded-full font-bold text-sm md:text-base transition-all duration-500 flex items-center justify-center gap-2 z-10 ${activeTab === 'register' ? 'text-zinc-950' : 'text-slate-400 hover:text-white'}`}
              >
                {activeTab === 'register' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl md:rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] -z-10 animate-fade-in-up"></div>
                )}
                <User className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">ලියාපදිංචි වන්න</span>
              </button>

              <button
                  onClick={() => setActiveTab('view')}
                  className={`relative flex-1 sm:w-auto px-4 md:px-8 py-3.5 rounded-xl md:rounded-full font-bold text-sm md:text-base transition-all duration-500 flex items-center justify-center gap-2 z-10 ${activeTab === 'view' ? 'text-zinc-950' : 'text-slate-400 hover:text-white'}`}
              >
                {activeTab === 'view' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl md:rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] -z-10 animate-fade-in-up"></div>
                )}
                <Users className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="whitespace-nowrap">කණ්ඩායම් ({registrations.length})</span>
              </button>
            </div>
          </div>

          {/* ================= REGISTER TAB ================= */}
          {activeTab === 'register' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                {/* --- Form Column --- */}
                <div className="lg:col-span-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 opacity-90"></div>

                    <form onSubmit={handleSubmit} className="p-5 sm:p-8 md:p-10 space-y-6 md:space-y-8 relative z-10">

                      <div>
                        <h2 className="text-xl md:text-3xl font-bold text-white flex items-center gap-3">
                          <div className="p-2 md:p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                          </div>
                          කණ්ඩායම් ලියාපදිංචිය
                        </h2>
                        <p className="text-slate-400 mt-2 text-xs md:text-sm ml-12 md:ml-14">ඔබගේ කණ්ඩායමේ විස්තර පහතින් ඇතුලත් කරන්න.</p>
                      </div>

                      {/* --- Sport Selection --- */}
                      <div className="space-y-3 md:space-y-4">
                        <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                          ක්‍රීඩාව තෝරන්න <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                          {Object.entries(SPORTS_CONFIG).map(([key, config]) => {
                            const isSelected = formData.sport === key;
                            return (
                                <label
                                    key={key}
                                    className={`relative group flex sm:flex-col items-center sm:justify-center p-4 md:p-5 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                                        isSelected
                                            ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] sm:scale-[1.02]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                    } border`}
                                >
                                  {isSelected && <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none"></div>}
                                  <input
                                      type="radio"
                                      name="sport"
                                      value={key}
                                      checked={isSelected}
                                      onChange={handleInputChange}
                                      className="hidden"
                                      required
                                  />
                                  <div className={`mr-4 sm:mr-0 transition-transform duration-300 ${isSelected ? 'scale-110 text-amber-400 sm:mb-3' : 'text-slate-400 group-hover:text-slate-200 sm:mb-2'}`}>
                                    {config.icon}
                                  </div>
                                  <div className="flex flex-col sm:items-center">
                                  <span className={`font-bold text-base md:text-lg sm:text-center transition-colors ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>
                                    {config.name}
                                  </span>
                                    <span className={`text-[10px] md:text-xs sm:text-center mt-1 font-medium px-2 py-0.5 rounded-full ${isSelected ? 'bg-amber-500/20 text-amber-200' : 'bg-zinc-800 text-slate-400'}`}>
                                    ක්‍රීඩකයින් {config.players}
                                  </span>
                                  </div>
                                </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* --- Gender Selection (Volleyball Only) --- */}
                      {formData.sport === 'Volleyball' && (
                          <div className="space-y-3 md:space-y-4 animate-fade-in-up">
                            <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                              අංශය <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                              {['Men', 'Women'].map(gender => {
                                const isSelected = formData.gender === gender;
                                return (
                                    <label
                                        key={gender}
                                        className={`flex-1 flex items-center justify-center p-3 md:p-4 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-300 border ${
                                            isSelected
                                                ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                                        }`}
                                    >
                                      <input
                                          type="radio"
                                          name="gender"
                                          value={gender}
                                          checked={isSelected}
                                          onChange={handleInputChange}
                                          className="hidden"
                                          required
                                      />
                                      <span className="font-bold text-sm md:text-lg">{gender === 'Men' ? 'පිරිමි අංශය' : 'කාන්තා අංශය'}</span>
                                    </label>
                                );
                              })}
                            </div>
                          </div>
                      )}

                      {/* --- Capacity Warning --- */}
                      {capacityInfo && (
                          <div className={`p-4 md:p-5 rounded-2xl border backdrop-blur-sm flex items-start gap-3 md:gap-4 transition-all duration-500 ${
                              capacityInfo.isFull
                                  ? 'bg-rose-950/60 border-rose-500/40 shadow-[0_0_20px_rgba(225,29,72,0.15)]'
                                  : 'bg-zinc-900/60 border-white/10'
                          }`}>
                            <div className={`p-1.5 md:p-2 rounded-full mt-0.5 ${capacityInfo.isFull ? 'bg-rose-500/20' : 'bg-amber-500/10'}`}>
                              <Activity className={`w-4 h-4 md:w-6 md:h-6 flex-shrink-0 ${capacityInfo.isFull ? 'text-rose-400' : 'text-amber-500'}`} />
                            </div>
                            <div className="flex-1 w-full">
                              <p className="font-bold text-sm md:text-base text-slate-200">
                                {SPORTS_CONFIG[formData.sport].name} {formData.gender && `(${formData.gender === 'Men' ? 'පිරිමි' : 'කාන්තා'})`} ලියාපදිංචි සීමාව
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 md:mt-2">
                                <p className="text-xs md:text-sm text-slate-400 font-medium mb-1 sm:mb-0">
                                  ලියාපදිංචි වී ඇති සංඛ්‍යාව: <span className={`ml-1 ${capacityInfo.isFull ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}`}>{capacityInfo.current} / {capacityInfo.max}</span>
                                </p>
                              </div>

                              <div className="w-full h-1.5 md:h-2 bg-black/50 rounded-full overflow-hidden mt-2 md:mt-3">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                        capacityInfo.isFull ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                                            : capacityInfo.current / capacityInfo.max > 0.8 ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                                                : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                    }`}
                                    style={{ width: `${Math.min(100, (capacityInfo.current / capacityInfo.max) * 100)}%` }}
                                ></div>
                              </div>

                              {capacityInfo.isFull && (
                                  <p className="text-xs md:text-sm font-bold mt-2 md:mt-3 text-rose-400 flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3 md:w-4 md:h-4" /> මෙම අංශය සඳහා ලියාපදිංචිය අවසන් වී ඇත.
                                  </p>
                              )}
                            </div>
                          </div>
                      )}

                      {/* --- Text Inputs --- */}
                      <div className="space-y-5 md:space-y-6 pt-2">

                        <div>
                          <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                            කණ්ඩායමේ නම <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 md:pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-400 transition-colors">
                              <Users className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <input
                                type="text"
                                name="teamName"
                                value={formData.teamName}
                                onChange={handleInputChange}
                                required
                                placeholder="උදා: මොරපතාව ලයන්ස්"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-4 pl-10 md:pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner font-medium text-base md:text-lg"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                          <div>
                            <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                              <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                              නායකයාගේ නම <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3.5 md:pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-400 transition-colors">
                                <User className="w-4 h-4 md:w-5 md:h-5" />
                              </div>
                              <input
                                  type="text"
                                  name="captainName"
                                  value={formData.captainName}
                                  onChange={handleInputChange}
                                  required
                                  placeholder="සම්පූර්ණ නම"
                                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-4 pl-10 md:pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner font-medium text-base md:text-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                              <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                              දුරකථන අංකය <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3.5 md:pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-400 transition-colors">
                                <Phone className="w-4 h-4 md:w-5 md:h-5" />
                              </div>
                              <input
                                  type="tel"
                                  name="contactNumber"
                                  value={formData.contactNumber}
                                  onChange={handleInputChange}
                                  required
                                  pattern="[0-9]{10}"
                                  placeholder="07XXXXXXXX"
                                  title="කරුණාකර නිවැරදි ඉලක්කම් 10ක දුරකථන අංකයක් ඇතුලත් කරන්න"
                                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-4 pl-10 md:pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner font-medium text-base md:text-lg font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* --- Submit Button --- */}
                      <div className="pt-2 md:pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || capacityInfo?.isFull || !user}
                            className={`w-full relative group overflow-hidden rounded-xl md:rounded-2xl p-[1px] transition-all duration-300 ${
                                isSubmitting || capacityInfo?.isFull || !user
                                    ? 'opacity-60 cursor-not-allowed grayscale'
                                    : 'hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]'
                            }`}
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 opacity-80 group-hover:opacity-100 transition-opacity"></span>
                          <div className="relative bg-zinc-950/40 backdrop-blur-sm px-6 py-3.5 md:py-4 rounded-[11px] md:rounded-[15px] flex items-center justify-center gap-2">
                            <span className="text-lg md:text-xl font-bold text-white tracking-wide">
                              {isSubmitting
                                  ? 'ලියාපදිංචි කරමින් පවතී...'
                                  : capacityInfo?.isFull
                                      ? 'ලියාපදිංචිය අවසන්'
                                      : 'කණ්ඩායම ලියාපදිංචි කරන්න'
                              }
                            </span>
                            {!isSubmitting && !capacityInfo?.isFull && <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-amber-200" />}
                          </div>
                        </button>
                      </div>

                    </form>
                  </div>
                </div>

                {/* --- Rules & Contact Column --- */}
                <div className="lg:col-span-4 space-y-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>

                  {/* Rules Card */}
                  <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

                    <h3 className="text-lg md:text-xl font-bold text-white mb-5 md:mb-6 flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 bg-rose-500/10 rounded-lg text-rose-400">
                        <Activity className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      තරඟ නීතිරීති
                    </h3>

                    <div className="space-y-5 md:space-y-6 relative z-10">
                      {Object.values(SPORTS_CONFIG).map((sport) => (
                          <div key={sport.name} className="flex gap-3 md:gap-4 items-start group">
                            <div className="mt-1 p-2 md:p-2.5 bg-black/40 rounded-xl text-amber-500 border border-white/5 group-hover:border-amber-500/30 transition-colors shadow-inner">
                              {sport.icon}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-200 text-base md:text-lg group-hover:text-amber-400 transition-colors">{sport.name}</h4>
                              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-1.5 leading-relaxed">{sport.description}</p>
                              <div className="mt-2 md:mt-2.5 inline-flex items-center">
                                <span className="text-[10px] md:text-xs font-bold px-2 md:px-2.5 py-1 bg-white/5 text-slate-300 rounded-md border border-white/10 shadow-sm">
                                  උපරිම කණ්ඩායම්: {sport.maxTeams}යි
                                </span>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Card */}
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 md:p-8 shadow-2xl text-amber-950 relative overflow-hidden group">
                    <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                      <Sun className="w-32 h-32 md:w-40 md:h-40" />
                    </div>

                    <div className="relative z-10">
                      <div className="inline-block p-1.5 md:p-2 bg-white/20 rounded-lg mb-3 md:mb-4 backdrop-blur-sm">
                        <Phone className="w-4 h-4 md:w-5 md:h-5 text-amber-950" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-black mb-1 md:mb-2 tracking-tight">සහාය අවශ්‍යද?</h3>
                      <p className="text-xs md:text-sm font-bold opacity-80 mb-5 md:mb-6">වැඩිදුර විස්තර සඳහා සංවිධායක මණ්ඩලය අමතන්න.</p>

                      <div className="space-y-2 md:space-y-3 font-black text-base md:text-lg">
                        <a href="tel:0761202170" className="flex items-center gap-3 bg-white/20 hover:bg-white/30 p-2.5 md:p-3 rounded-xl transition-colors backdrop-blur-sm shadow-sm">
                          <Phone className="w-4 h-4 md:w-5 md:h-5 opacity-70" />
                          076 120 2170
                        </a>
                        <a href="tel:0742018193" className="flex items-center gap-3 bg-white/20 hover:bg-white/30 p-2.5 md:p-3 rounded-xl transition-colors backdrop-blur-sm shadow-sm">
                          <Phone className="w-4 h-4 md:w-5 md:h-5 opacity-70" />
                          074 201 8193
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
          )}

          {/* ================= VIEW TEAMS TAB ================= */}
          {activeTab === 'view' && (
              <div className="space-y-8 md:space-y-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {Object.keys(SPORTS_CONFIG).map((sportKey, sectionIdx) => {
                  const sportRegs = registrations.filter(r => r.sport === sportKey);
                  if (sportRegs.length === 0) return null;

                  return (
                      <div
                          key={sportKey}
                          className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
                          style={{ animationDelay: `${0.1 * sectionIdx}s` }}
                      >
                        {/* Section Header */}
                        <div className="bg-black/40 border-b border-white/5 p-4 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
                          <div className="absolute right-0 top-0 w-48 h-48 md:w-64 md:h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                          <div className="flex items-center gap-3 md:gap-4 relative z-10">
                            <div className="p-2.5 md:p-3.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl md:rounded-2xl text-amber-950 shadow-lg">
                              {SPORTS_CONFIG[sportKey].icon}
                            </div>
                            <div>
                              <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">{SPORTS_CONFIG[sportKey].name}</h2>
                              <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                                <span className="flex w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <p className="text-xs md:text-sm font-medium text-slate-400">කණ්ඩායම් {sportRegs.length} ක් ලියාපදිංචි වී ඇත</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cards Grid */}
                        <div className="p-4 md:p-8">
                          {sportKey === 'Volleyball' ? (
                              <div className="space-y-8 md:space-y-10">
                                {['Men', 'Women'].map(gender => {
                                  const genderRegs = sportRegs.filter(r => r.gender === gender);
                                  if (genderRegs.length === 0) return null;
                                  return (
                                      <div key={gender}>
                                        <div className="flex items-center gap-3 mb-4 md:mb-6">
                                          <h3 className="text-sm md:text-lg font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 md:px-4 py-1 md:py-1.5 rounded-lg border border-amber-500/20">
                                            {gender === 'Men' ? 'පිරිමි' : 'කාන්තා'} අංශය
                                          </h3>
                                          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                                          {genderRegs.map((team, idx) => <TeamCard key={team.id} team={team} index={idx} />)}
                                        </div>
                                      </div>
                                  );
                                })}
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                                {sportRegs.map((team, idx) => <TeamCard key={team.id} team={team} index={idx} />)}
                              </div>
                          )}
                        </div>
                      </div>
                  );
                })}

                {/* Empty State */}
                {registrations.length === 0 && (
                    <div className="text-center py-16 md:py-24 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden px-4">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none"></div>
                      <Users className="w-16 h-16 md:w-20 md:h-20 text-white/10 mx-auto mb-4 md:mb-6 relative z-10" />
                      <h3 className="text-xl md:text-3xl font-black text-white mb-2 md:mb-3 relative z-10">තවමත් කිසිදු කණ්ඩායමක් ලියාපදිංචි වී නොමැත</h3>
                      <p className="text-sm md:text-lg text-slate-400 mb-6 md:mb-8 font-medium relative z-10">බක්මහ උළෙල සඳහා ඔබේ කණ්ඩායම පළමුව ලියාපදිංචි කරන්න!</p>

                      <button
                          onClick={() => setActiveTab('register')}
                          className="relative z-10 w-full sm:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-amber-950 font-black rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 text-base md:text-lg"
                      >
                        දැන්ම ලියාපදිංචි වන්න
                      </button>
                    </div>
                )}
              </div>
          )}

        </div>

        {/* --- Footer --- */}
        <footer className="relative border-t border-white/10 bg-black/80 backdrop-blur-lg py-6 md:py-8 mt-4 md:mt-12 z-10">
          <div className="max-w-4xl mx-auto text-center px-4">
            <p className="text-slate-400 font-medium text-xs md:text-sm">
              © 2026 මොරපතාව සියපත් සිය උදානය සංවිධායක මණ්ඩලය. All Rights Reserved.
            </p>
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] md:text-xs text-slate-600">
              <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span>බක්මහ උළෙල - ක්‍රීඩා කමිටුව</span>
              <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
            </div>
          </div>
        </footer>

      </div>
  );
}

// --- Premium Team Card Component ---
function TeamCard({ team, index }) {
  return (
      <div className="bg-black/50 backdrop-blur-md border border-white/5 hover:border-amber-500/30 transition-all duration-300 rounded-2xl p-4 md:p-5 flex flex-col h-full group hover:shadow-[0_8px_30px_rgba(245,158,11,0.1)] relative overflow-hidden">

        <div className="absolute -top-10 -right-10 w-20 h-20 bg-amber-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div className="flex justify-between items-start mb-3 md:mb-4 relative z-10">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 text-[10px] md:text-xs font-black px-2 md:px-2.5 py-0.5 md:py-1 rounded-md shadow-sm">
            #{String(index + 1).padStart(2, '0')}
          </div>
          <div className="text-[9px] md:text-[10px] text-slate-500 font-mono font-medium px-2 py-0.5 md:py-1 bg-white/5 rounded-md">
            {team.createdAt ? new Date(team.createdAt.toMillis()).toLocaleDateString() : 'දැන්'}
          </div>
        </div>

        <h4 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors break-words relative z-10 leading-tight">
          {team.teamName}
        </h4>

        <div className="mt-auto pt-3 md:pt-4 space-y-2.5 md:space-y-3 relative z-10 border-t border-white/5">
          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-300">
            <div className="p-1 md:p-1.5 bg-white/5 rounded-md text-slate-400 group-hover:text-amber-400 transition-colors">
              <User className="w-3 h-3 md:w-4 md:h-4" />
            </div>
            <span className="truncate font-medium">{team.captainName}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-300">
            <div className="p-1 md:p-1.5 bg-white/5 rounded-md text-slate-400 group-hover:text-amber-400 transition-colors">
              <Phone className="w-3 h-3 md:w-4 md:h-4" />
            </div>
            <span className="font-mono tracking-wider opacity-80">{team.contactNumber.replace(/.(?=.{4})/g, '•')}</span>
          </div>
        </div>
      </div>
  );
}