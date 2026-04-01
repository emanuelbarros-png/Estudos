import React, { useState, useEffect, useCallback } from 'react';
import { 
  Car, Download, Upload, Settings, BarChart3, Trophy, 
  ListChecks, Plus, BookOpen, CheckCircle, Settings2, 
  ChevronDown, ChevronRight, Pencil, Trash2, GripVertical,
  PlayCircle, FileText, Target, CheckCircle2, AlertCircle,
  LogOut, User, Lock, Loader2, Moon, Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Assunto {
  id: string;
  nome: string;
  videoAula: boolean;
  pdfLido: boolean;
  questoes: number;
  porcentagemAcerto: number;
  innerExpanded: boolean;
}

interface Materia {
  id: string;
  nome: string;
  assuntos: Assunto[];
  expanded: boolean;
}

interface AppConfig {
  goalQuestions: number;
  thresholdGreen: number;
  thresholdYellow: number;
  darkMode: boolean;
}

interface AppState {
  gerais: Materia[];
  especificos: Materia[];
  config: AppConfig;
}

const API_BASE = '/api'; // Caminho relativo para o InfinityFree

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [state, setState] = useState<AppState>({
    gerais: [],
    especificos: [],
    config: {
      goalQuestions: 100,
      thresholdGreen: 85,
      thresholdYellow: 70,
      darkMode: false
    }
  });

  const [activeTab, setActiveTab] = useState<'gerais' | 'especificos'>('gerais');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'materia' | 'assunto'>('materia');
  const [modalAction, setModalAction] = useState<'create' | 'rename'>('create');
  const [modalInput, setModalInput] = useState('');
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{ type: 'materia' | 'assunto', mId: string, aId?: string, title: string } | null>(null);

  // --- Auth Logic ---
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.username);
        loadData();
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    console.log("Dark mode changed:", state.config.darkMode);
    if (state.config.darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [state.config.darkMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username: usernameInput,
          password: passwordInput
        })
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        if (authMode === 'login') {
          setUser(data.username);
          loadData();
        } else {
          setAuthMode('login');
          setAuthError('Conta criada! Faça login.');
        }
      }
    } catch (e) {
      setAuthError('Erro na conexão com o servidor.');
    }
  };

  const handleLogout = async () => {
    // Feedback imediato limpando o estado local
    setUser(null);
    setState({
      gerais: [],
      especificos: [],
      config: { 
        goalQuestions: 100, 
        thresholdGreen: 85, 
        thresholdYellow: 70,
        darkMode: false 
      }
    });
    
    try {
      await fetch(`${API_BASE}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (e) {
      console.error("Erro ao deslogar no servidor", e);
    }
  };

  // --- Data Logic ---
  const loadData = async () => {
    try {
      const res = await fetch(`${API_BASE}/data.php`);
      const data = await res.json();
      if (data) {
        // Garantir que a estrutura do config esteja completa
        const sanitizedData = {
          ...data,
          config: {
            goalQuestions: 100,
            thresholdGreen: 85,
            thresholdYellow: 70,
            darkMode: false,
            ...(data.config || {})
          }
        };
        setState(sanitizedData);
      }
    } catch (e) {
      console.error("Failed to load data");
    }
  };

  const saveData = async (newState: AppState) => {
    setState(newState);
    if (!user) return;
    try {
      await fetch(`${API_BASE}/data.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState)
      });
    } catch (e) {
      console.error("Failed to save data");
    }
  };

  // --- Calculations ---
  const calcAssuntoProgress = (assunto: Assunto) => {
    let score = 0;
    if (assunto.videoAula) score += 33.33;
    if (assunto.pdfLido) score += 33.33;
    if (assunto.questoes >= state.config.goalQuestions) score += 33.34;
    return Math.min(Math.round(score), 100);
  };

  const calcMateriaProgress = (materia: Materia) => {
    if (materia.assuntos.length === 0) return 0;
    const total = materia.assuntos.reduce((acc, a) => acc + calcAssuntoProgress(a), 0);
    return Math.round(total / materia.assuntos.length);
  };

  const calcGlobalProgress = (tab: 'gerais' | 'especificos') => {
    const materias = state[tab];
    if (materias.length === 0) return 0;
    let totalAssuntos = 0;
    let totalScore = 0;
    materias.forEach(m => {
      totalAssuntos += m.assuntos.length;
      m.assuntos.forEach(a => totalScore += calcAssuntoProgress(a));
    });
    return totalAssuntos === 0 ? 0 : Math.round(totalScore / totalAssuntos);
  };

  const getPerformanceColor = (val: number) => {
    if (val >= state.config.thresholdGreen) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (val >= state.config.thresholdYellow) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400';
  };

  const getPerformanceTextClass = (val: number) => {
    if (val >= state.config.thresholdGreen) return 'text-emerald-600 dark:text-emerald-400';
    if (val >= state.config.thresholdYellow) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  // --- Actions ---
  const handleModalConfirm = () => {
    if (!modalInput.trim()) return;
    const newState = { ...state };
    
    if (modalAction === 'create') {
      if (modalType === 'materia') {
        newState[activeTab].push({
          id: crypto.randomUUID(),
          nome: modalInput,
          assuntos: [],
          expanded: true
        });
      } else if (currentParentId) {
        const materia = newState[activeTab].find(m => m.id === currentParentId);
        if (materia) {
          materia.assuntos.push({
            id: crypto.randomUUID(),
            nome: modalInput,
            videoAula: false,
            pdfLido: false,
            questoes: 0,
            porcentagemAcerto: 0,
            innerExpanded: false
          });
        }
      }
    } else {
      if (modalType === 'materia' && currentItemId) {
        const materia = newState[activeTab].find(m => m.id === currentItemId);
        if (materia) materia.nome = modalInput;
      } else if (currentParentId && currentItemId) {
        const materia = newState[activeTab].find(m => m.id === currentParentId);
        const assunto = materia?.assuntos.find(a => a.id === currentItemId);
        if (assunto) assunto.nome = modalInput;
      }
    }
    
    saveData(newState);
    setModalOpen(false);
    setModalInput('');
  };

  const updateAssunto = (mId: string, aId: string, field: keyof Assunto, value: any) => {
    const newState = { ...state };
    const materia = newState[activeTab].find(m => m.id === mId);
    const assunto = materia?.assuntos.find(a => a.id === aId);
    if (assunto) {
      (assunto as any)[field] = value;
      saveData(newState);
    }
  };

  const deleteItem = () => {
    if (!deleteInfo) return;
    const newState = { ...state };
    if (deleteInfo.type === 'materia') {
      newState[activeTab] = newState[activeTab].filter(m => m.id !== deleteInfo.mId);
    } else {
      const materia = newState[activeTab].find(m => m.id === deleteInfo.mId);
      if (materia) {
        materia.assuntos = materia.assuntos.filter(a => a.id !== deleteInfo.aId);
      }
    }
    saveData(newState);
    setDeleteModalOpen(false);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.download = `backup_estudo_${date}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') return;
        const imported = JSON.parse(result);
        if (imported.gerais || imported.especificos) {
          const newState = {
            ...state,
            ...imported,
            config: {
              ...state.config,
              ...(imported.config || {})
            }
          };
          saveData(newState);
          alert("Importação concluída com sucesso!");
        } else {
          throw new Error("Formato inválido");
        }
      } catch (err) {
        alert("Erro ao importar arquivo. Verifique o formato.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 mb-4">
              <Car className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">ESTUDO</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Controle de Estudos</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Apelido</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium dark:text-slate-200"
                  placeholder="Seu apelido"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="password" 
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium dark:text-slate-200"
                  placeholder="Sua senha"
                />
              </div>
            </div>

            {authError && (
              <p className="text-xs font-bold text-rose-500 text-center bg-rose-50 dark:bg-rose-900/20 py-2 rounded-lg">{authError}</p>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-[0.98] text-sm uppercase tracking-wider"
            >
              {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-tight"
            >
              {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-slate-950 pb-20 font-['Inter'] transition-colors duration-300">
      <header className="bg-blue-950 text-white shadow-xl sticky top-0 z-40 border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-800/50 p-2 rounded-xl backdrop-blur-md border border-blue-700/50">
              <Car className="w-5 h-5" />
            </div>
            <h1 className="text-base font-extrabold tracking-tight text-blue-50">ESTUDO</h1>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="hidden sm:flex items-center gap-2 mr-4 px-3 py-1 bg-blue-900/50 rounded-full border border-blue-800/50">
              <User className="w-3 h-3 text-blue-300" />
              <span className="text-[10px] font-bold text-blue-100 uppercase">{user}</span>
            </div>

            <button onClick={handleLogout} className="p-1.5 hover:bg-rose-800/50 rounded-lg transition-colors text-rose-200" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
            
            <div className="w-px h-4 bg-blue-800 mx-1" />

            <button onClick={() => setSettingsOpen(true)} className="p-1.5 hover:bg-blue-800/50 rounded-lg transition-colors text-blue-100">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Básicos</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">{calcGlobalProgress('gerais')}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${calcGlobalProgress('gerais')}%` }}
                  className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Específicos</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{calcGlobalProgress('especificos')}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${calcGlobalProgress('especificos')}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-slate-200/80 dark:bg-slate-900/80 backdrop-blur rounded-xl mb-3 max-w-md mx-auto border border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('gerais')}
            className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all duration-200 uppercase tracking-tight ${activeTab === 'gerais' ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Conhecimentos Básicos
          </button>
          <button 
            onClick={() => setActiveTab('especificos')}
            className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all duration-200 uppercase tracking-tight ${activeTab === 'especificos' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Conhecimentos Específicos
          </button>
        </div>

        {/* Materias List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded">
                <ListChecks className="text-slate-600 dark:text-slate-400 w-3.5 h-3.5" />
              </div>
              MATÉRIAS
            </h2>
            <button 
              onClick={() => {
                setModalType('materia');
                setModalAction('create');
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-800 transition-colors shadow-sm shadow-blue-700/20"
            >
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>

          <div className="space-y-3 pb-10">
            {state[activeTab].length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl p-10 text-center">
                <BookOpen className="mx-auto text-slate-300 dark:text-slate-700 mb-3 w-8 h-8" />
                <p className="text-slate-400 dark:text-slate-600 text-xs font-medium uppercase tracking-wider">Sem matérias registradas</p>
              </div>
            ) : (
              state[activeTab].map(materia => (
                <div key={materia.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md group/materia">
                  <div className="px-5 py-3.5 flex items-center gap-3 bg-white dark:bg-slate-900">
                    <button 
                      onClick={() => {
                        const newState = { ...state };
                        const m = newState[activeTab].find(x => x.id === materia.id);
                        if (m) m.expanded = !m.expanded;
                        saveData(newState);
                      }}
                      className="text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {materia.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 min-w-0">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[200px] group-hover/materia:text-blue-900 dark:group-hover/materia:text-blue-300 transition-colors">{materia.nome}</h3>
                      <div className="flex-1 flex items-center gap-2.5">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${calcMateriaProgress(materia) === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                            style={{ width: `${calcMateriaProgress(materia)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-8 text-right">{calcMateriaProgress(materia)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <button 
                        onClick={() => {
                          setModalType('materia');
                          setModalAction('rename');
                          setCurrentItemId(materia.id);
                          setModalInput(materia.nome);
                          setModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          setModalType('assunto');
                          setModalAction('create');
                          setCurrentParentId(materia.id);
                          setModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setDeleteInfo({ type: 'materia', mId: materia.id, title: materia.nome });
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-rose-300 dark:text-rose-700 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {materia.expanded && (
                    <div className="bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800">
                      {materia.assuntos.map(assunto => {
                        const assProg = calcAssuntoProgress(assunto);
                        const perfColor = getPerformanceColor(assunto.porcentagemAcerto);
                        const perfTxt = getPerformanceTextClass(assunto.porcentagemAcerto);
                        
                        let bgClass = assunto.innerExpanded ? 'bg-slate-50/80 dark:bg-slate-800/80' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50';
                        if (assProg === 100) bgClass = assunto.innerExpanded ? 'bg-emerald-100/60 dark:bg-emerald-900/40' : 'bg-emerald-50/40 dark:bg-emerald-900/20 hover:bg-emerald-100/40 dark:hover:bg-emerald-900/30';
                        else if (assProg > 0 && assProg < 34) bgClass = assunto.innerExpanded ? 'bg-rose-100/60 dark:bg-rose-900/40' : 'bg-rose-50/40 dark:bg-rose-900/20 hover:bg-rose-100/40 dark:hover:bg-rose-900/30';
                        else if (assProg >= 34 && assProg < 100) bgClass = assunto.innerExpanded ? 'bg-amber-100/60 dark:bg-amber-900/40' : 'bg-amber-50/40 dark:bg-amber-900/20 hover:bg-amber-100/40 dark:hover:bg-amber-900/30';

                        return (
                          <div key={assunto.id} className={`px-5 py-2.5 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors ${bgClass}`}>
                            <div className="flex items-center justify-between gap-4">
                              <div 
                                onClick={() => {
                                  const newState = { ...state };
                                  const m = newState[activeTab].find(x => x.id === materia.id);
                                  const a = m?.assuntos.find(x => x.id === assunto.id);
                                  if (a) a.innerExpanded = !a.innerExpanded;
                                  saveData(newState);
                                }}
                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                              >
                                {assProg === 100 ? (
                                  <CheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                                ) : (
                                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${assunto.innerExpanded ? 'border-blue-500 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 group-hover:border-blue-300 dark:group-hover:border-blue-500'}`} />
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs truncate text-slate-700 dark:text-slate-300 font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                    {assunto.nome}
                                  </span>
                                  {!assunto.innerExpanded && (
                                    <div className="flex items-center gap-2.5 mt-0.5">
                                      <div className="flex gap-1">
                                        <PlayCircle className={`w-2.5 h-2.5 ${assunto.videoAula ? 'text-blue-600 dark:text-blue-400' : 'text-slate-200 dark:text-slate-700'}`} />
                                        <FileText className={`w-2.5 h-2.5 ${assunto.pdfLido ? 'text-blue-600 dark:text-blue-400' : 'text-slate-200 dark:text-slate-700'}`} />
                                      </div>
                                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                        {assunto.questoes} Q | <span className={perfTxt}>{assunto.porcentagemAcerto}%</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className={`text-[11px] font-black text-right ${assProg === 100 ? 'text-emerald-500' : 'text-blue-700 dark:text-blue-400'}`}>{assProg}%</div>
                                <button className="p-1 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                  {assunto.innerExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <AnimatePresence>
                              {assunto.innerExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 pt-3 border-t border-blue-100/50 dark:border-blue-900/30 flex flex-wrap items-center gap-3 sm:gap-4">
                                    <div className="flex items-center gap-3 border-r border-slate-100 dark:border-slate-800 pr-3">
                                      <label className="flex items-center gap-1.5 cursor-pointer group/label">
                                        <input 
                                          type="checkbox" 
                                          checked={assunto.videoAula} 
                                          onChange={(e) => updateAssunto(materia.id, assunto.id, 'videoAula', e.target.checked)}
                                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-500 focus:ring-blue-500" 
                                        />
                                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 group-hover/label:text-blue-600 dark:group-hover/label:text-blue-400 transition-colors">
                                          <PlayCircle className="w-3 h-3" /> VÍDEO
                                        </span>
                                      </label>
                                      <label className="flex items-center gap-1.5 cursor-pointer group/label">
                                        <input 
                                          type="checkbox" 
                                          checked={assunto.pdfLido} 
                                          onChange={(e) => updateAssunto(materia.id, assunto.id, 'pdfLido', e.target.checked)}
                                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-500 focus:ring-blue-500" 
                                        />
                                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 group-hover/label:text-blue-600 dark:group-hover/label:text-blue-400 transition-colors">
                                          <FileText className="w-3 h-3" /> PDF
                                        </span>
                                      </label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Questões</span>
                                        <input 
                                          type="number" 
                                          value={assunto.questoes} 
                                          onChange={(e) => updateAssunto(materia.id, assunto.id, 'questoes', parseInt(e.target.value) || 0)}
                                          className="w-10 text-[10px] text-center outline-none font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded py-0.5 focus:border-blue-400 transition-colors" 
                                        />
                                      </div>
                                      <div className={`flex items-center gap-1 rounded border px-1.5 py-0.5 ${perfColor}`}>
                                        <Target className="w-2.5 h-2.5" />
                                        <input 
                                          type="number" 
                                          value={assunto.porcentagemAcerto} 
                                          onChange={(e) => updateAssunto(materia.id, assunto.id, 'porcentagemAcerto', Math.min(100, parseInt(e.target.value) || 0))}
                                          className="w-7 text-[10px] text-center outline-none font-black bg-transparent" 
                                        />
                                        <span className="text-[9px] font-black">%</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                      <button 
                                        onClick={() => {
                                          setModalType('assunto');
                                          setModalAction('rename');
                                          setCurrentParentId(materia.id);
                                          setCurrentItemId(assunto.id);
                                          setModalInput(assunto.nome);
                                          setModalOpen(true);
                                        }}
                                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setDeleteInfo({ type: 'assunto', mId: materia.id, aId: assunto.id, title: assunto.nome });
                                          setDeleteModalOpen(true);
                                        }}
                                        className="p-1.5 text-rose-300 dark:text-rose-700 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">
                {modalAction === 'create' ? `Nova ${modalType === 'materia' ? 'Matéria' : 'Assunto'}` : `Renomear ${modalType === 'materia' ? 'Matéria' : 'Assunto'}`}
              </h3>
              <textarea 
                autoFocus
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none h-24 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 dark:text-slate-200 transition-colors" 
                placeholder="Digite o nome..."
              />
              <div className="flex gap-3">
                <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 text-xs text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">CANCELAR</button>
                <button onClick={handleModalConfirm} className="flex-1 px-4 py-2.5 text-xs bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-700/30 hover:bg-blue-800 transition-all transform active:scale-95">CONFIRMAR</button>
              </div>
            </motion.div>
          </div>
        )}

        {settingsOpen && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Configurações</h3>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Meta de Questões (por assunto)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={state.config.goalQuestions}
                      onChange={(e) => {
                        const newState = { ...state, config: { ...state.config, goalQuestions: parseInt(e.target.value) || 0 } };
                        setState(newState);
                      }}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors pl-10" 
                    />
                    <Target className="absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500 w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-2">Mínimo Verde (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={state.config.thresholdGreen}
                        onChange={(e) => {
                          const newState = { ...state, config: { ...state.config, thresholdGreen: parseInt(e.target.value) || 0 } };
                          setState(newState);
                        }}
                        className="w-full border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-emerald-50 dark:bg-emerald-900/20 focus:bg-white dark:focus:bg-slate-900 transition-colors pl-9" 
                      />
                      <CheckCircle2 className="absolute left-3 top-2.5 text-emerald-400 dark:text-emerald-500 w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest mb-2">Mínimo Amarelo (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={state.config.thresholdYellow}
                        onChange={(e) => {
                          const newState = { ...state, config: { ...state.config, thresholdYellow: parseInt(e.target.value) || 0 } };
                          setState(newState);
                        }}
                        className="w-full border border-amber-100 dark:border-amber-900/30 rounded-xl px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-amber-50 dark:bg-amber-900/20 focus:bg-white dark:focus:bg-slate-900 transition-colors pl-9" 
                      />
                      <AlertCircle className="absolute left-3 top-2.5 text-amber-400 dark:text-amber-500 w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Tema</label>
                  <button 
                    onClick={() => {
                      const newState = { ...state, config: { ...state.config, darkMode: !state.config.darkMode } };
                      setState(newState);
                      // Aplicar imediatamente para feedback visual
                      if (newState.config.darkMode) {
                        document.documentElement.classList.add('dark');
                        document.documentElement.style.colorScheme = 'dark';
                      } else {
                        document.documentElement.classList.remove('dark');
                        document.documentElement.style.colorScheme = 'light';
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      state.config.darkMode 
                        ? 'bg-slate-800 border-slate-700 text-white' 
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {state.config.darkMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      <span className="text-sm font-bold">{state.config.darkMode ? 'Modo Escuro' : 'Modo Claro'}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${state.config.darkMode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${state.config.darkMode ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Backup de Dados</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={exportData}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Exportar
                    </button>
                    <button 
                      onClick={() => document.getElementById('import-input-settings')?.click()}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" /> Importar
                    </button>
                    <input 
                      type="file" 
                      id="import-input-settings" 
                      className="hidden" 
                      accept=".json" 
                      onChange={importData} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setSettingsOpen(false)} className="flex-1 px-4 py-2.5 text-xs text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">FECHAR</button>
                <button onClick={() => {
                  // Garantir que estamos salvando o estado mais recente
                  saveData(state);
                  setSettingsOpen(false);
                }} className="flex-1 px-4 py-2.5 text-xs bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-700/30 hover:bg-blue-800 transition-all">SALVAR</button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[320px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full mb-4 ring-4 ring-rose-50/50 dark:ring-rose-900/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir item?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{deleteInfo?.title}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg uppercase tracking-wider transition-colors">Voltar</button>
                <button onClick={deleteItem} className="flex-1 py-2.5 text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
