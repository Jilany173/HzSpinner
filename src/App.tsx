import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Users, History as HistoryIcon, RotateCcw, LogOut, LogIn, X, ChevronDown, PlusCircle, Trash, LayoutDashboard, Settings } from 'lucide-react';
import SpinnerWheel from './components/SpinnerWheel';
import TeacherManager from './components/TeacherManager';
import SpinHistory from './components/SpinHistory';
import { Teacher, SpinResult, TeacherList } from './types';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc, 
  getDoc,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import ErrorBoundary from './components/ErrorBoundary';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [history, setHistory] = useState<SpinResult[]>([]);
  const [lists, setLists] = useState<TeacherList[]>([]);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState('Daily Content Task');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [lastWinner, setLastWinner] = useState<Teacher | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [activeTab, setActiveTab] = useState<'spinner' | 'teachers' | 'history' | 'settings'>('spinner');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Test Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync: Teachers
  useEffect(() => {
    if (!user || !currentListId) {
      setTeachers([]);
      return;
    }

    const q = query(
      collection(db, 'teachers'), 
      where('uid', '==', user.uid),
      where('listId', '==', currentListId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teacherData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Teacher[];
      setTeachers(teacherData);
    }, (error) => {
      console.error("Firestore Error (Teachers):", error);
    });

    return () => unsubscribe();
  }, [user, currentListId]);

  // Firestore Sync: All Teachers (for counts)
  useEffect(() => {
    if (!user) {
      setAllTeachers([]);
      return;
    }

    const q = query(
      collection(db, 'teachers'), 
      where('uid', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teacherData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Teacher[];
      setAllTeachers(teacherData);
    }, (error) => {
      console.error("Firestore Error (All Teachers):", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Lists
  useEffect(() => {
    if (!user) {
      setLists([]);
      return;
    }

    const q = query(collection(db, 'lists'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as TeacherList[];
      
      const sortedLists = listData.sort((a, b) => a.createdAt - b.createdAt);
      setLists(sortedLists);

      // Auto-create default list if none exists after loading
      if (sortedLists.length === 0 && !currentListId) {
        const createDefault = async () => {
          console.log("No lists found, creating default...");
          const listRef = doc(collection(db, 'lists'));
          const newList = {
            id: listRef.id,
            name: 'Default List',
            uid: user.uid,
            createdAt: Date.now()
          };
          try {
            await setDoc(listRef, newList);
            handleSwitchList(listRef.id);
          } catch (e) {
            console.error("Error creating default list:", e);
          }
        };
        createDefault();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lists');
    });

    return () => unsubscribe();
  }, [user, currentListId]);

  // Firestore Sync: History
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    console.log("Setting up history listener for user:", user.uid);
    // Simplified query to check if data exists at all
    const q = query(
      collection(db, 'history'), 
      where('uid', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("History snapshot received, size:", snapshot.size);
      const historyData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SpinResult[];
      
      // Sort manually if index is missing
      const sortedHistory = historyData.sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp as any)?.toMillis?.() || 0;
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp as any)?.toMillis?.() || 0;
        return timeB - timeA;
      }).slice(0, 10);
      
      setHistory(sortedHistory);
    }, (error) => {
      console.error("Firestore Error (History):", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Config
  useEffect(() => {
    if (!user) return;

    const configRef = doc(db, 'configs', user.uid);
    const unsubscribe = onSnapshot(configRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.currentTopic !== undefined) {
          setCurrentTopic(data.currentTopic);
        }
        if (data.currentListId !== undefined) {
          setCurrentListId(data.currentListId);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTeacher = async (name: string) => {
    if (!user || !currentListId) return;
    try {
      await addDoc(collection(db, 'teachers'), {
        name,
        uid: user.uid,
        listId: currentListId,
        id: Math.random().toString(36).substr(2, 9)
      });
    } catch (error) {
      console.error("Error adding teacher:", error);
    }
  };

  const handleBulkAddTeachers = async (names: string[]) => {
    if (!user || !currentListId) return;
    try {
      const batch = writeBatch(db);
      names.forEach(name => {
        const newDocRef = doc(collection(db, 'teachers'));
        batch.set(newDocRef, {
          name,
          uid: user.uid,
          listId: currentListId,
          id: newDocRef.id
        });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error bulk adding teachers:", error);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'teachers', id));
    } catch (error) {
      console.error("Error deleting teacher:", error);
    }
  };

  const handleEditTeacher = async (id: string, newName: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'teachers', id), { name: newName });
    } catch (error) {
      console.error("Error editing teacher:", error);
    }
  };

  const handleTopicChange = async (topic: string) => {
    setCurrentTopic(topic);
    if (!user) return;
    try {
      await setDoc(doc(db, 'configs', user.uid), { 
        currentTopic: topic,
        currentListId: currentListId,
        uid: user.uid 
      }, { merge: true });
    } catch (error) {
      console.error("Error updating topic:", error);
    }
  };

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;

    try {
      const listRef = doc(collection(db, 'lists'));
      const newList = {
        id: listRef.id,
        name: newListName.trim(),
        uid: user.uid,
        createdAt: Date.now()
      };
      await setDoc(listRef, newList);
      await handleSwitchList(listRef.id);
      setNewListName('');
      setShowCreateListModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'lists');
    }
  };

  const handleSwitchList = async (listId: string) => {
    setCurrentListId(listId);
    if (user) {
      try {
        await setDoc(doc(db, 'configs', user.uid), { 
          currentListId: listId,
          uid: user.uid 
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'configs');
      }
    }
  };

  const handleDeleteList = async (listId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    
    setConfirmModal({
      show: true,
      title: 'Delete List',
      message: 'Are you sure you want to delete this list and all its members? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          
          // Delete all teachers in this list
          const teachersInList = allTeachers.filter(t => t.listId === listId);
          teachersInList.forEach(t => {
            batch.delete(doc(db, 'teachers', t.id));
          });

          // Delete the list itself
          batch.delete(doc(db, 'lists', listId));

          await batch.commit();
          
          if (currentListId === listId) {
            const otherList = lists.find(l => l.id !== listId);
            handleSwitchList(otherList ? otherList.id : '');
          }
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `lists/${listId}`);
        }
      }
    });
  };

  const handleEditList = async (listId: string, newName: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'lists', listId), {
        name: newName
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lists/${listId}`);
    }
  };

  const handleReset = async () => {
    if (!user) return;
    setConfirmModal({
      show: true,
      title: 'Factory Reset',
      message: 'Are you sure you want to reset everything? This will clear all lists, members, and history. This action is permanent.',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          
          // Delete teachers
          allTeachers.forEach(t => {
            batch.delete(doc(db, 'teachers', t.id));
          });

          // Delete lists
          lists.forEach(l => {
            batch.delete(doc(db, 'lists', l.id));
          });

          // Delete history
          history.forEach(h => {
            batch.delete(doc(db, 'history', h.id));
          });

          await batch.commit();
          setLastWinner(null);
          setShowWinner(false);
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (error) {
          console.error("Error resetting:", error);
        }
      }
    });
  };

  const handleSpinStart = () => {
    if (teachers.length < 2) {
      alert('Please add at least 2 teachers to spin!');
      return;
    }
    setIsSpinning(true);
    setShowWinner(false);
    setSpinTrigger(prev => prev + 1);
  };

  const handleSpinEnd = useCallback(async (winner: Teacher) => {
    setIsSpinning(false);
    setLastWinner(winner);
    setShowWinner(true);

    if (user) {
      console.log("Attempting to save history for winner:", winner.name);
      try {
        const docRef = await addDoc(collection(db, 'history'), {
          teacherName: winner.name,
          topic: currentTopic,
          timestamp: Date.now(), // Using Date.now() for now as rules expect number
          uid: user.uid,
          id: Math.random().toString(36).substr(2, 9)
        });
        console.log("History saved successfully, doc ID:", docRef.id);
      } catch (error) {
        console.error("Error saving history:", error);
      }
    }

    // Confetti effect (Blue and Red only)
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563eb', '#dc2626', '#3b82f6', '#ef4444']
    });
  }, [user, currentTopic]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login failed:", error);
      alert("Login failed! Please make sure hz-spinner.vercel.app is added to Authorized Domains in Firebase Console.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-md w-full text-center space-y-8 border-4 border-white">
          <div className="relative h-24 flex items-center justify-center">
            <img 
              src="https://storage.googleapis.com/mcp-user-content-ipp7by4hi4kidsekr4wyqj/534094005481/81720875-189f-4318-971c-772877028441.png" 
              alt="Logo" 
              className="h-24 mx-auto object-contain relative z-10"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl';
                  fallback.innerText = 'HZ';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-blue-600 font-black text-sm uppercase tracking-widest">Hexa's Zindabazar Spinner</h2>
            <h1 className="text-3xl font-black text-slate-900">Welcome Back!</h1>
            <p className="text-slate-500 font-medium">Sign in to save your teacher lists and spin history.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl hover:scale-105 active:scale-95"
          >
            <LogIn className="w-6 h-6" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen block md:flex bg-slate-50">
        {/* Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <RotateCcw className="w-6 h-6 text-white animate-spin-slow" />
              </div>
              <span className="font-black text-xl tracking-tight text-slate-900">HEXA'S SPINNER</span>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('spinner')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'spinner' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('teachers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'teachers' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-5 h-5" />
                Teacher Lists
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'history' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <HistoryIcon className="w-5 h-5" />
                Spin History
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'settings' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-6 p-2 rounded-xl bg-slate-50">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                alt={user.displayName || 'User'} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full min-w-0">
          {/* Top Header (Mobile Only) */}
          <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-blue-600" />
              <span className="font-black text-lg tracking-tight">HEXA'S SPINNER</span>
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto">
              {/* Page Header */}
              <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
                    {activeTab === 'spinner' && "Hexa's Zindabazar Spinner"}
                    {activeTab === 'teachers' && 'Teacher Management'}
                    {activeTab === 'history' && 'Spin History'}
                    {activeTab === 'settings' && 'App Settings'}
                  </h1>
                  <p className="text-slate-500 font-medium">
                    {activeTab === 'spinner' && 'Assign tasks fairly with a single click'}
                    {activeTab === 'teachers' && 'Manage your teacher lists and team members'}
                    {activeTab === 'history' && 'Review past assignments and winners'}
                    {activeTab === 'settings' && 'Configure your preferences and manage data'}
                  </p>
                </div>
                
                {/* Mobile Tab Nav */}
                <div className="md:hidden flex overflow-x-auto bg-white p-1 rounded-xl shadow-sm border border-slate-200 custom-scrollbar">
                  <button 
                    onClick={() => setActiveTab('spinner')}
                    className={`flex-1 whitespace-nowrap py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'spinner' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    Spinner
                  </button>
                  <button 
                    onClick={() => setActiveTab('teachers')}
                    className={`flex-1 whitespace-nowrap py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'teachers' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    Lists
                  </button>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 whitespace-nowrap py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    History
                  </button>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 whitespace-nowrap py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    Settings
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'teachers' && (
                  <motion.div
                    key="teachers"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 gap-8">
                      <TeacherManager
                        lists={lists}
                        allTeachers={allTeachers}
                        currentListId={currentListId}
                        onSwitchList={handleSwitchList}
                        onDeleteList={handleDeleteList}
                        onEditList={handleEditList}
                        onCreateList={() => setShowCreateListModal(true)}
                        teachers={teachers}
                        onAddTeacher={handleAddTeacher}
                        onBulkAddTeachers={handleBulkAddTeachers}
                        onDeleteTeacher={handleDeleteTeacher}
                        onEditTeacher={handleEditTeacher}
                        onReset={handleReset}
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'spinner' && (
                  <motion.div
                    key="spinner"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    {/* Controls Column */}
                    <div className="lg:col-span-4 space-y-6">
                      {/* List Selector Card */}
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="mb-4">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active List</label>
                        </div>
                        <div className="relative group">
                          <select
                            value={currentListId || ''}
                            onChange={(e) => handleSwitchList(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:outline-none font-bold text-slate-900 appearance-none bg-slate-50 cursor-pointer transition-all"
                          >
                            <option value="" disabled>Select a list...</option>
                            {lists.map(list => (
                              <option key={list.id} value={list.id}>{list.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="mt-4">
                          <button 
                            onClick={() => setActiveTab('teachers')}
                            className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all rounded-xl border border-slate-100"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Manage Lists & Members
                          </button>
                        </div>
                      </div>

                      {/* Topic Card */}
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Spin Topic</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={currentTopic}
                            onChange={(e) => handleTopicChange(e.target.value)}
                            placeholder="e.g., Daily Content Task"
                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:outline-none font-bold text-slate-900 bg-slate-50 transition-all"
                          />
                          {currentTopic && (
                            <button
                              onClick={() => handleTopicChange('')}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stats Card */}
                      <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-100 text-white">
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Team Members</p>
                        <p className="text-4xl font-black">{teachers.length}</p>
                        <div className="mt-4 pt-4 border-t border-blue-500/30 flex items-center justify-between">
                          <span className="text-xs font-medium text-blue-100">Ready to spin</span>
                          <div className="flex -space-x-2">
                            {teachers.slice(0, 4).map((t, i) => (
                              <div key={i} className="w-6 h-6 rounded-full bg-blue-400 border-2 border-blue-600 flex items-center justify-center text-[10px] font-bold">
                                {t.name[0]}
                              </div>
                            ))}
                            {teachers.length > 4 && (
                              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-blue-600 flex items-center justify-center text-[10px] font-bold">
                                +{teachers.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Spinner Column */}
                    <div className="lg:col-span-8 flex flex-col items-center">
                      <div className="relative w-full max-w-[550px] aspect-square bg-white rounded-[40px] md:rounded-[60px] p-6 md:p-12 shadow-2xl shadow-slate-200 border-4 md:border-8 border-slate-50 flex items-center justify-center">
                        <SpinnerWheel
                          teachers={teachers}
                          isSpinning={isSpinning}
                          onSpinEnd={handleSpinEnd}
                          spinTrigger={spinTrigger}
                        />
                        
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                          <button
                            onClick={handleSpinStart}
                            disabled={isSpinning || teachers.length < 2}
                            className={`
                              w-28 h-28 rounded-full font-black text-2xl transition-all shadow-2xl flex items-center justify-center border-8 border-white
                              ${isSpinning || teachers.length < 2
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-110 active:scale-95 shadow-blue-200'
                              }
                            `}
                          >
                            {isSpinning ? '...' : 'SPIN'}
                          </button>
                        </div>
                      </div>

                      {/* Winner Announcement */}
                      <AnimatePresence>
                        {showWinner && lastWinner && (
                          <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.9 }}
                            className="mt-12 text-center p-6 md:p-10 bg-white rounded-[32px] md:rounded-[40px] shadow-2xl border-2 border-blue-50 relative overflow-hidden w-full max-w-lg"
                          >
                            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-600 to-indigo-600" />
                            <div className="flex items-center justify-center gap-2 text-blue-600 font-black uppercase tracking-[0.2em] text-xs mb-4">
                              <Trophy className="w-4 h-4" />
                              WINNER ANNOUNCEMENT
                            </div>
                            <p className="text-slate-500 font-bold text-sm mb-2">{currentTopic}</p>
                            <h2 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tight mb-6">
                              {lastWinner.name}
                            </h2>
                            <div className="flex items-center justify-center gap-4">
                              <div className="h-px flex-1 bg-slate-100" />
                              <Sparkles className="text-amber-400 w-8 h-8" />
                              <div className="h-px flex-1 bg-slate-100" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-3xl mx-auto"
                  >
                    <SpinHistory history={history} />
                  </motion.div>
                )}

                {activeTab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-2xl mx-auto"
                  >
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-8 border-b border-slate-100">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          <Settings className="w-5 h-5 text-blue-600" />
                          Data Management
                        </h2>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Danger Zone</p>
                      </div>
                      
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between p-6 bg-red-50 rounded-2xl border border-red-100">
                          <div>
                            <h3 className="font-black text-red-900">Clear Spin History</h3>
                            <p className="text-sm text-red-600/70 font-medium">This will permanently delete all your past spin results.</p>
                          </div>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                show: true,
                                title: 'Clear History',
                                message: 'Are you sure you want to clear all spin history? This cannot be undone.',
                                onConfirm: async () => {
                                  const batch = writeBatch(db);
                                  history.forEach(h => {
                                    batch.delete(doc(db, 'history', h.id));
                                  });
                                  await batch.commit();
                                  setConfirmModal(prev => ({ ...prev, show: false }));
                                }
                              });
                            }}
                            className="px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-black rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                          >
                            CLEAR HISTORY
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-200">
                          <div>
                            <h3 className="font-black text-slate-900">Reset Application</h3>
                            <p className="text-sm text-slate-500 font-medium">Wipe all lists, teachers, and history to start fresh.</p>
                          </div>
                          <button 
                            onClick={handleReset}
                            className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200"
                          >
                            FACTORY RESET
                          </button>
                        </div>
                      </div>

                      <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">App Version 2.0.0 • Professional Edition</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      {/* Footer */}
      <footer className="mt-auto pt-12 pb-24 md:pb-6 text-center text-blue-300 text-sm font-medium border-t border-blue-50">
        <p>© 2026 Hexa's Zindabazar. All rights reserved. | Powered by Jilany</p>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('spinner')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'spinner' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Spin</span>
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'teachers' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Lists</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <HistoryIcon className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">History</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Settings</span>
        </button>
      </nav>
      </div>

      {/* Create List Modal */}
      <AnimatePresence>
        {showCreateListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-blue-600">New List</h3>
                <button onClick={() => setShowCreateListModal(false)} className="text-blue-300 hover:text-red-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-2">List Name</label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Class 10, Office"
                    className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                  />
                </div>
                <button
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                >
                  Create List
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6 border border-slate-100"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">{confirmModal.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-4 rounded-2xl font-black text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100 transition-all"
                >
                  DELETE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
