import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  History, 
  CalendarCheck, 
  AlertCircle,
  PlusCircle,
  MinusCircle,
  Settings,
  Target,
  Flame,
  Filter,
  ArrowUpDown,
  Gem,
  Info,
  Edit,
  Lock,
  Trophy,
  Award,
  Crown,
  Sparkles,
  X,
  Image as ImageIcon,
  Upload,
  CalendarDays,
  Settings2,
  KeyRound,
  Download,
  Share,
  PlusSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { AppState, Transaction, INITIAL_STATE, SavingsGoal, Badge } from './types';
// Corrected import paths for flat structure
import StatsChart from './StatsChart';
import SavingsGoalCard from './SavingsGoalCard';

// Helper to generate ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Badge Definitions ---
const AVAILABLE_BADGES: Omit<Badge, 'unlocked'>[] = [
  {
    id: 'first_pot',
    name: '第一桶金',
    description: '总资产超过 100 元',
    icon: '💰',
    condition: (s) => s.totalAssets >= 100
  },
  {
    id: 'saver_elite',
    name: '小小银行家',
    description: '总资产超过 1500 元',
    icon: '🏦',
    condition: (s) => s.totalAssets >= 1500
  },
  {
    id: 'streak_master',
    name: '自律大师',
    description: '连续 5 周没有乱花钱',
    icon: '🔥',
    condition: (s) => s.consecutiveWeeksNoSpend >= 5
  },
  {
    id: 'goal_getter',
    name: '梦想达成者',
    description: '完成至少 1 个储蓄心愿',
    icon: '🎁',
    condition: (s) => s.savingsGoals.some(g => g.isCompleted)
  },
  {
    id: 'rich_kid',
    name: '大富翁',
    description: '总资产超过 5000 元',
    icon: '👑',
    condition: (s) => s.totalAssets >= 5000
  }
];

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('smartSaverState');
    let loadedState = saved ? JSON.parse(saved) : INITIAL_STATE;
    // Migration for existing data
    if (!loadedState.badges) loadedState.badges = [];
    if (!loadedState.lastSettlementDate) loadedState.lastSettlementDate = '';
    // Migration for settings
    if (loadedState.weeklyAllowance === undefined) loadedState.weeklyAllowance = 10;
    if (!loadedState.interestRateMode) loadedState.interestRateMode = 'TIERED';
    if (loadedState.fixedInterestRate === undefined) loadedState.fixedInterestRate = 0.1;
    // Migration for Tiered Config
    if (!loadedState.tieredInterestConfig) {
      loadedState.tieredInterestConfig = {
        lowThreshold: 400,
        highThreshold: 1500,
        lowRate: 0.20,
        midRate: 0.10,
        highRate: 0.05
      };
    }
    // Migration for App Name and Password
    if (!loadedState.appName) loadedState.appName = '彦仔宝库';
    if (!loadedState.adminPassword) loadedState.adminPassword = '8090';
    
    return loadedState;
  });

  // Refs for scrolling
  const goalsSectionRef = useRef<HTMLDivElement>(null);
  const prevTotalAssets = useRef(state.totalAssets);

  // Security State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const securityCallback = useRef<(() => void) | null>(null);

  // UI States
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showRateRulesModal, setShowRateRulesModal] = useState(false);
  const [showInitBalanceModal, setShowInitBalanceModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [newBadgeAlert, setNewBadgeAlert] = useState<string | null>(null);
  const [isWealthGrowing, setIsWealthGrowing] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [showAutoSettleAlert, setShowAutoSettleAlert] = useState(false);
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // Earnings Preview Modal State
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [pendingEarnings, setPendingEarnings] = useState<{
    allowance: number;
    interest: number;
    bonus: number;
    total: number;
    newTotal: number;
    prevTotal: number;
    newStreak: number;
  } | null>(null);

  // Inputs
  const [spendAmount, setSpendAmount] = useState('');
  const [spendReason, setSpendReason] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeReason, setIncomeReason] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalImage, setGoalImage] = useState(''); // Base64 string for new goal image
  const [limitInput, setLimitInput] = useState(state.spendingLimit.toString());
  const [initBalanceInput, setInitBalanceInput] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortType, setSortType] = useState('DATE_DESC');
  
  // Settings Inputs
  const [settingsAppName, setSettingsAppName] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsAllowance, setSettingsAllowance] = useState('');
  const [settingsRateMode, setSettingsRateMode] = useState<'TIERED' | 'FIXED'>('TIERED');
  const [settingsFixedRate, setSettingsFixedRate] = useState('');
  
  // Tiered Settings Inputs
  const [tier1RateInput, setTier1RateInput] = useState('');
  const [limit1Input, setLimit1Input] = useState('');
  const [tier2RateInput, setTier2RateInput] = useState('');
  const [limit2Input, setLimit2Input] = useState('');
  const [tier3RateInput, setTier3RateInput] = useState('');

  // --- Effects ---

  // Persist state
  useEffect(() => {
    localStorage.setItem('smartSaverState', JSON.stringify(state));
    // Update document title
    document.title = state.appName;
  }, [state]);

  // Install Prompt Listener
  useEffect(() => {
    // Detect Android/Chrome Install Prompt
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Automatic Settlement Check (Runs on mount and state change)
  useEffect(() => {
    const checkAutoSettlement = () => {
        const now = new Date();
        // Today at 00:00:00
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Find the most recent Sunday (could be today)
        const lastSunday = new Date(today);
        lastSunday.setDate(today.getDate() - today.getDay());
        const lastSundayStr = lastSunday.toDateString();

        // If we haven't settled for this Sunday yet
        const lastSettlementDate = state.lastSettlementDate;
        if (!lastSettlementDate) {
            // First time initialization:
            // If today is Sunday, settle now.
            // If not Sunday, mark last Sunday as "settled" so we wait until next Sunday.
            if (now.getDay() === 0) {
                performAutoSettlement();
            } else {
                setState(prev => ({ ...prev, lastSettlementDate: lastSundayStr }));
            }
            return;
        }

        const lastSettlement = new Date(lastSettlementDate);
        lastSettlement.setHours(0, 0, 0, 0);
        
        if (lastSettlement < lastSunday) {
            // We missed one or more Sundays
            performAutoSettlement();
        }
    };
    
    checkAutoSettlement();
  }, [state.lastSettlementDate, state.totalAssets, state.consecutiveWeeksNoSpend, state.hasSpentThisWeek, state.weeklyAllowance, state.interestRateMode, state.fixedInterestRate, state.tieredInterestConfig, state.weekCount]);

  // Check for wealth growth
  useEffect(() => {
    if (state.totalAssets > prevTotalAssets.current) {
        // Trigger wealth effect
        setIsWealthGrowing(true);
        triggerGoldRain();
        
        // Start collection animation
        const collectTimer = setTimeout(() => {
            setIsCollecting(true);
        }, 300); // Start earlier

        const resetTimer = setTimeout(() => {
            setIsWealthGrowing(false);
            setIsCollecting(false);
        }, 2500); // Give enough time for convergence
        
        return () => {
            clearTimeout(collectTimer);
            clearTimeout(resetTimer);
        };
    }
    prevTotalAssets.current = state.totalAssets;
  }, [state.totalAssets]);

  // Check for Badges
  useEffect(() => {
    let newBadges: string[] = [];
    
    AVAILABLE_BADGES.forEach(badge => {
      if (!state.badges.includes(badge.id)) {
        if (badge.condition(state)) {
          newBadges.push(badge.id);
        }
      }
    });

    if (newBadges.length > 0) {
      // Calculate 10% Bonus
      const currentAssets = state.totalAssets;
      const bonusAmount = currentAssets * 0.10;
      
      const bonusTx: Transaction = {
        id: generateId(),
        type: 'BONUS',
        amount: bonusAmount,
        description: `勋章奖励: 解锁 ${newBadges.length} 个成就 (奖励10%)`,
        date: new Date().toISOString(),
        balanceSnapshot: currentAssets + bonusAmount
      };

      setState(prev => ({
        ...prev,
        badges: [...prev.badges, ...newBadges],
        walletBalance: prev.walletBalance + bonusAmount,
        totalAssets: prev.totalAssets + bonusAmount,
        transactions: [bonusTx, ...prev.transactions]
      }));

      setNewBadgeAlert(newBadges[0]); // Show alert for the first new badge
      triggerConfetti();
    }
  }, [state.totalAssets, state.consecutiveWeeksNoSpend, state.savingsGoals]);

  // --- Logic ---
  
  const handleInstallApp = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
            setInstallPrompt(null);
        }
    });
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'],
      shapes: ['star', 'circle']
    });
  };

  const triggerGoldRain = () => {
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ['#FFD700', '#FDB931', '#FFFFE0', '#B8860B'];

    (function frame() {
      // Smoother rain with lower gravity and longer ticks
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.2 },
        colors: colors,
        shapes: ['circle'],
        scalar: 1.2,
        gravity: 0.8,
        drift: 0,
        ticks: 300
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.2 },
        colors: colors,
        shapes: ['circle'],
        scalar: 1.2,
        gravity: 0.8,
        drift: 0,
        ticks: 300
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const requestSecurity = (callback: () => void) => {
    securityCallback.current = callback;
    setShowSecurityModal(true);
    setPasswordInput('');
  };

  const handleSecuritySubmit = () => {
    const currentPassword = state.adminPassword || '8090';
    if (passwordInput === currentPassword) {
      setShowSecurityModal(false);
      if (securityCallback.current) {
        securityCallback.current();
        securityCallback.current = null;
      }
    } else {
      alert("密码错误");
      setPasswordInput('');
    }
  };

  const getInterestRate = (total: number, currentState: AppState) => {
    if (currentState.interestRateMode === 'FIXED') {
      return currentState.fixedInterestRate;
    }
    // Tiered Logic from State
    const { lowThreshold, highThreshold, lowRate, midRate, highRate } = currentState.tieredInterestConfig;
    
    if (total > highThreshold) return highRate;
    if (total > lowThreshold) return midRate;
    return lowRate;
  };

  // Logic used for both Preview and Actual Settlement
  const calculateEarningsData = (currentState: AppState) => {
    const prevTotal = currentState.totalAssets;
    const rate = getInterestRate(prevTotal, currentState);
    const interest = prevTotal * rate;
    const allowance = currentState.weeklyAllowance;
    
    let bonus = 0;
    let newStreak = currentState.consecutiveWeeksNoSpend;

    if (!currentState.hasSpentThisWeek) {
      newStreak += 1;
    } else {
      newStreak = 0;
    }

    // Check bonus condition (every 3 weeks)
    if (newStreak >= 3 && newStreak % 3 === 0 && !currentState.hasSpentThisWeek) {
      bonus = 10;
    }

    const total = allowance + interest + bonus;

    return {
        allowance,
        interest,
        bonus,
        total,
        newTotal: prevTotal + total,
        prevTotal,
        newStreak
    };
  };

  const handleCheckEarnings = () => {
    const data = calculateEarningsData(state);
    setPendingEarnings(data);
    setShowEarningsModal(true);
  };

  const performAutoSettlement = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());

    let currentState = { ...state };
    let lastSettlementDateStr = state.lastSettlementDate;
    
    if (!lastSettlementDateStr) return;

    let lastSettlement = new Date(lastSettlementDateStr);
    lastSettlement.setHours(0, 0, 0, 0);
    
    let weeksSettled = 0;
    
    while (lastSettlement < lastSunday) {
        // Move to next Sunday
        lastSettlement.setDate(lastSettlement.getDate() + 7);
        const currentSundayStr = lastSettlement.toDateString();
        
        const { allowance, interest, bonus, total, newTotal, newStreak, prevTotal } = calculateEarningsData(currentState);
        
        const weekTransactions: Transaction[] = [
          {
            id: generateId(),
            type: 'INCOME',
            amount: allowance,
            description: `自动结算: 第 ${currentState.weekCount + 1} 周零花钱`,
            date: lastSettlement.toISOString(),
            balanceSnapshot: prevTotal + allowance
          },
          {
            id: generateId(),
            type: 'INTEREST',
            amount: interest,
            description: `自动结算: 周利息 (利率 ${(getInterestRate(prevTotal, currentState) * 100).toFixed(0)}%)`,
            date: lastSettlement.toISOString(),
            balanceSnapshot: prevTotal + allowance + interest
          }
        ];

        if (bonus > 0) {
          weekTransactions.push({
            id: generateId(),
            type: 'BONUS',
            amount: bonus,
            description: '自动结算: 自律奖励 (连续3周)',
            date: lastSettlement.toISOString(),
            balanceSnapshot: newTotal
          });
        }

        currentState = {
          ...currentState,
          walletBalance: currentState.walletBalance + total,
          totalAssets: newTotal,
          weekCount: currentState.weekCount + 1,
          consecutiveWeeksNoSpend: bonus > 0 ? 0 : newStreak,
          hasSpentThisWeek: false, // Assume no spend if app wasn't opened
          transactions: [...weekTransactions, ...currentState.transactions],
          lastSettlementDate: currentSundayStr
        };
        weeksSettled++;
    }

    if (weeksSettled > 0) {
        setState(currentState);
        setShowAutoSettleAlert(true);
        triggerGoldRain();
        triggerConfetti();
    }
  };

  const handleIncome = (amount: number, reason: string) => {
    if (amount <= 0) return;
    
    const newTx: Transaction = {
      id: generateId(),
      type: 'INCOME',
      amount: amount,
      description: `额外收入: ${reason}`,
      date: new Date().toISOString(),
      balanceSnapshot: state.totalAssets + amount
    };

    setState(prev => ({
      ...prev,
      walletBalance: prev.walletBalance + amount,
      totalAssets: prev.totalAssets + amount,
      transactions: [newTx, ...prev.transactions]
    }));
  };

  const handleSpend = (amount: number, reason: string) => {
    if (amount <= 0) return;
    if (amount > state.walletBalance) {
      alert("余额不足！");
      return;
    }
    if (state.spendingLimit > 0 && amount > state.spendingLimit) {
      const confirm = window.confirm(`警告：这笔消费超过了限制 (¥${state.spendingLimit})。确定要继续吗？`);
      if (!confirm) return;
    }

    const newTx: Transaction = {
      id: generateId(),
      type: 'EXPENSE',
      amount: -amount,
      description: `消费: ${reason}`,
      date: new Date().toISOString(),
      balanceSnapshot: state.totalAssets - amount
    };

    setState(prev => ({
      ...prev,
      walletBalance: prev.walletBalance - amount,
      totalAssets: prev.totalAssets - amount,
      hasSpentThisWeek: true,
      consecutiveWeeksNoSpend: 0,
      transactions: [newTx, ...prev.transactions]
    }));
  };

  const addSavingsGoal = (name: string, target: number, image?: string) => {
    if (state.savingsGoals.length >= 3) {
      alert("愿望清单已满，请先完成或删除一个！");
      return;
    }

    const newGoal: SavingsGoal = {
      id: generateId(),
      name,
      targetAmount: target,
      currentAmount: 0,
      imageUrl: image,
      isCompleted: false
    };
    setState(prev => ({
      ...prev,
      savingsGoals: [...prev.savingsGoals, newGoal]
    }));
  };

  const deleteSavingsGoal = (id: string) => {
    const goal = state.savingsGoals.find(g => g.id === id);
    if (!goal) return;
    const refund = goal.currentAmount;
    setState(prev => ({
      ...prev,
      walletBalance: prev.walletBalance + refund,
      savingsGoals: prev.savingsGoals.filter(g => g.id !== id),
      transactions: refund > 0 ? [{
        id: generateId(),
        type: 'TRANSFER_IN',
        amount: refund,
        description: `删除目标退回: ${goal.name}`,
        date: new Date().toISOString(),
        balanceSnapshot: prev.totalAssets
      }, ...prev.transactions] : prev.transactions
    }));
  };

  const depositToGoal = (goalId: string, amount: number) => {
    if (amount > state.walletBalance) return;

    setState(prev => {
      let isGoalJustCompleted = false;
      const updatedGoals = prev.savingsGoals.map(g => {
        if (g.id === goalId) {
          const newAmount = g.currentAmount + amount;
          const completed = newAmount >= g.targetAmount;
          if (completed && !g.isCompleted) isGoalJustCompleted = true;
          return { ...g, currentAmount: newAmount, isCompleted: completed };
        }
        return g;
      });

      if (isGoalJustCompleted) triggerConfetti();

      return {
        ...prev,
        walletBalance: prev.walletBalance - amount,
        savingsGoals: updatedGoals,
        transactions: [{
          id: generateId(),
          type: 'TRANSFER_OUT',
          amount: -amount,
          description: `存入: ${prev.savingsGoals.find(g => g.id === goalId)?.name}`,
          date: new Date().toISOString(),
          balanceSnapshot: prev.totalAssets
        }, ...prev.transactions]
      };
    });
  };

  const handleSetSpendingLimit = (limit: number) => {
    setState(prev => ({
      ...prev,
      spendingLimit: limit
    }));
  };

  const handleSetInitialBalance = (amount: number) => {
    const currentSavings = state.savingsGoals.reduce((acc, g) => acc + g.currentAmount, 0);
    if (amount < currentSavings) {
        alert("总资产不能小于当前的储蓄目标总额！");
        return;
    }
    const newWallet = amount - currentSavings;
    const diff = amount - state.totalAssets;
    setState(prev => ({
        ...prev,
        totalAssets: amount,
        walletBalance: newWallet,
        transactions: diff !== 0 ? [{
            id: generateId(),
            type: diff > 0 ? 'INCOME' : 'EXPENSE',
            amount: diff,
            description: '管理员调整余额',
            date: new Date().toISOString(),
            balanceSnapshot: amount
        }, ...prev.transactions] : prev.transactions
    }));
  };
  
  const handleSaveSettings = () => {
    const newAllowance = parseFloat(settingsAllowance);
    const newFixedRate = parseFloat(settingsFixedRate);
    const newPassword = settingsPassword.trim();
    
    // Tiered parsing
    const t1Rate = parseFloat(tier1RateInput) / 100;
    const l1 = parseFloat(limit1Input);
    const t2Rate = parseFloat(tier2RateInput) / 100;
    const l2 = parseFloat(limit2Input);
    const t3Rate = parseFloat(tier3RateInput) / 100;

    if (isNaN(newAllowance) || newAllowance < 0) {
      alert("请输入有效的零花钱金额");
      return;
    }
    
    if (settingsRateMode === 'FIXED' && (isNaN(newFixedRate) || newFixedRate < 0)) {
      alert("请输入有效的固定利率");
      return;
    }
    
    if (newPassword === "") {
        alert("密码不能为空");
        return;
    }

    if (settingsRateMode === 'TIERED') {
       if (isNaN(t1Rate) || isNaN(l1) || isNaN(t2Rate) || isNaN(l2) || isNaN(t3Rate) || l1 < 0 || l2 < 0 || t1Rate < 0 || t2Rate < 0 || t3Rate < 0) {
           alert("请检查阶梯利率和金额是否正确填写");
           return;
       }
       if (l1 >= l2) {
           alert("第一档金额上限必须小于第二档金额上限");
           return;
       }
    }

    setState(prev => ({
      ...prev,
      appName: settingsAppName.trim() || '彦仔宝库',
      adminPassword: newPassword,
      weeklyAllowance: newAllowance,
      interestRateMode: settingsRateMode,
      fixedInterestRate: settingsRateMode === 'FIXED' ? newFixedRate / 100 : prev.fixedInterestRate,
      tieredInterestConfig: settingsRateMode === 'TIERED' ? {
        lowThreshold: l1,
        highThreshold: l2,
        lowRate: t1Rate,
        midRate: t2Rate,
        highRate: t3Rate
      } : prev.tieredInterestConfig
    }));
    
    setShowSettingsModal(false);
  };

  const openSettingsModal = () => {
    setSettingsAppName(state.appName);
    setSettingsPassword(state.adminPassword || '8090');
    setSettingsAllowance(state.weeklyAllowance.toString());
    setSettingsRateMode(state.interestRateMode);
    setSettingsFixedRate((state.fixedInterestRate * 100).toString());
    
    // Init tiered inputs
    setTier1RateInput((state.tieredInterestConfig.lowRate * 100).toString());
    setLimit1Input(state.tieredInterestConfig.lowThreshold.toString());
    setTier2RateInput((state.tieredInterestConfig.midRate * 100).toString());
    setLimit2Input(state.tieredInterestConfig.highThreshold.toString());
    setTier3RateInput((state.tieredInterestConfig.highRate * 100).toString());
    
    setShowSettingsModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit check
            alert("图片大小不能超过 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setGoalImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  // --- Render Helpers ---

  const currentRate = getInterestRate(state.totalAssets, state);
  const isStreakClose = state.consecutiveWeeksNoSpend === 2;
  const getFilteredTransactions = useCallback(() => {
    let result = [...state.transactions];
    if (filterType !== 'ALL') {
      if (filterType === 'TRANSFERS') {
         result = result.filter(t => t.type === 'TRANSFER_IN' || t.type === 'TRANSFER_OUT');
      } else {
         result = result.filter(t => t.type === filterType);
      }
    }
    result.sort((a, b) => {
      if (sortType === 'DATE_DESC') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortType === 'DATE_ASC') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortType === 'AMOUNT_DESC') return Math.abs(b.amount) - Math.abs(a.amount);
      if (sortType === 'AMOUNT_ASC') return Math.abs(a.amount) - Math.abs(b.amount);
      return 0;
    });
    return result;
  }, [state.transactions, filterType, sortType]);

  const displayedTransactions = getFilteredTransactions();
  const unlockedBadgesCount = state.badges.length;
  const today = new Date();

  return (
    <div className="min-h-screen pb-20 bg-[#FDF6E3]">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-amber-500 text-white p-6 pb-16 shadow-lg relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl"></div>
        
        <div className="max-w-md mx-auto flex justify-between items-start relative z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
                {/* Logo rotation removed as requested */}
                <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 p-2 rounded-xl shadow-lg border-2 border-yellow-100/50">
                    <Gem size={22} className="text-red-600 drop-shadow-sm" />
                </div>
                <h1 className="text-2xl font-black flex items-center tracking-tight drop-shadow-md">
                {state.appName}
                </h1>
                {/* REMOVED: Badge row next to name */}
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* REMOVED Share Button */}

            {/* Android Install Button */}
            {installPrompt && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInstallApp}
                    className="bg-emerald-500 text-white p-2 rounded-lg relative border border-emerald-400 shadow-md animate-pulse"
                    title="安装 App"
                >
                    <Download size={18} />
                </motion.button>
            )}
            
            {/* REMOVED iOS Install Guide Button */}

            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowBadgeModal(true)}
                className="bg-white/20 backdrop-blur-md text-white p-2 rounded-lg relative border border-white/20"
            >
                <Trophy size={18} className="text-yellow-200" />
                {unlockedBadgesCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold border border-white">
                        {unlockedBadgesCount}
                    </span>
                )}
            </motion.button>
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => requestSecurity(() => openSettingsModal())}
                className="bg-white/20 backdrop-blur-md text-white p-2 rounded-lg relative border border-white/20"
            >
                <Settings size={18} className="text-yellow-200" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-10 space-y-6 relative z-10">
        
        {/* Main Balance Card - OPTIMIZED LAYOUT */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={
                isWealthGrowing 
                ? { opacity: 1, y: 0, scale: 1.02, borderColor: "rgba(253, 224, 71, 0.8)", boxShadow: "0 25px 50px -12px rgba(234, 179, 8, 0.5)" } 
                : { opacity: 1, y: 0, scale: 1, borderColor: "rgba(254, 215, 170, 0.5)", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }
            }
            className="bg-treasure-flow rounded-3xl p-6 shadow-2xl border border-white/20 text-white relative overflow-hidden transition-colors"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 skew-x-12 translate-x-[-200%] animate-[shimmer_3s_infinite]"></div>
          
          {/* Golden Flash Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: isWealthGrowing ? [0, 0.6, 0] : 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-gradient-to-r from-yellow-300/0 via-yellow-200/50 to-yellow-300/0 z-30 pointer-events-none"
          />

          {/* Clean Layout: Top Row */}
          <div className="flex justify-between items-start relative z-10 mb-6">
            <div className="flex flex-col">
                 {/* Date - Subtle */}
                <div className="flex items-center gap-1.5 text-yellow-100/90 text-xs font-medium mb-1 opacity-90">
                    <CalendarDays size={12} className="opacity-80" />
                    <span>{today.getFullYear()}/{today.getMonth() + 1}/{today.getDate()} {today.toLocaleDateString('zh-CN', { weekday: 'short' })}</span>
                </div>
                {/* Title */}
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-white/95">总资产</span>
                    <button onClick={() => requestSecurity(() => { setInitBalanceInput(state.totalAssets.toString()); setShowInitBalanceModal(true); })} className="text-white/40 hover:text-white transition-colors"><Edit size={14} /></button>
                </div>
            </div>
            
            {/* Action Buttons - Compact stack on right */}
            <div className="flex flex-col items-end gap-1.5">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowRateRulesModal(true)}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full font-bold text-yellow-100 hover:bg-white/20 transition-colors"
              >
                <Gem size={10} className="text-yellow-300" />
                周息 {(currentRate * 100).toFixed(0)}%
              </motion.button>

              <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCheckEarnings}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-red-500/90 hover:bg-red-500 text-white border border-red-400/50 rounded-full font-bold shadow-sm transition-colors backdrop-blur-md"
              >
                  <TrendingUp size={10} /> 收益预览
              </motion.button>
            </div>
          </div>
          
          {/* Main Number - Centered and Big */}
          <div className="relative z-10 mb-8">
              <motion.div 
                className="text-6xl font-black text-white tracking-tighter flex items-baseline"
                animate={isWealthGrowing ? { scale: [1, 1.05, 1], textShadow: "0px 0px 20px rgba(255,215,0,0.8)" } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              >
                <span className="text-2xl font-bold opacity-60 mr-1">¥</span>
                {state.totalAssets.toFixed(2)}
              </motion.div>
          </div>
          
          {/* Clean Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3 relative z-10">
            <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-3 border border-white/5 flex flex-col justify-center">
              <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                 <Wallet size={10} /> 零钱
              </div>
              <div className="text-lg font-bold text-white">
                ¥{state.walletBalance.toFixed(2)}
              </div>
            </div>
            
            <motion.div 
              whileTap={{ scale: 0.98 }}
              onClick={() => goalsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10 flex flex-col justify-center cursor-pointer hover:bg-white/15 transition-colors"
            >
              <div className="text-yellow-100/80 text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                 <Target size={10} /> 愿望储蓄
              </div>
              <div className="text-lg font-bold text-yellow-100">
                ¥{state.savingsGoals.reduce((acc, curr) => acc + curr.currentAmount, 0).toFixed(2)}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
           <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => requestSecurity(() => setShowIncomeModal(true))}
            className="flex flex-col items-center justify-center gap-1 bg-white border border-emerald-100 text-emerald-600 font-bold py-3 rounded-2xl shadow-sm hover:shadow-md transition-all"
          >
            <div className="bg-emerald-100 p-2 rounded-full mb-1">
                <PlusCircle size={20} />
            </div>
            <span className="text-xs">记收入</span>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSpendModal(true)}
            className="flex flex-col items-center justify-center gap-1 bg-white border border-rose-100 text-rose-600 font-bold py-3 rounded-2xl shadow-sm hover:shadow-md transition-all"
          >
            <div className="bg-rose-100 p-2 rounded-full mb-1">
                <MinusCircle size={20} />
            </div>
            <span className="text-xs">记支出</span>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (state.savingsGoals.length >= 3) alert("愿望清单已满！");
              else {
                  setGoalImage(''); // Reset image state
                  setShowGoalModal(true);
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 border font-bold py-3 rounded-2xl shadow-sm transition-all ${
                state.savingsGoals.length >= 3 
                ? 'bg-gray-50 border-gray-100 text-gray-400' 
                : 'bg-white border-blue-100 text-blue-600 hover:shadow-md'
            }`}
          >
            <div className={`p-2 rounded-full mb-1 ${state.savingsGoals.length >= 3 ? 'bg-gray-100' : 'bg-blue-100'}`}>
                <Target size={20} />
            </div>
            <span className="text-xs">新愿望</span>
          </motion.button>
        </div>

        {/* Incentives */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ y: -2 }}
            className={`bg-white p-4 rounded-2xl shadow-sm border transition-all relative overflow-hidden ${isStreakClose ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100'}`}
          >
             {isStreakClose && <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-200/50 rounded-full blur-2xl animate-pulse"></div>}
             <div className="flex justify-between items-center relative z-10">
                <div className="text-xs text-gray-500 font-bold">自律挑战</div>
                <Flame size={16} className={`${isStreakClose ? 'text-orange-500 animate-pulse' : 'text-gray-300'}`} fill={isStreakClose ? "currentColor" : "none"} />
             </div>
             <div className="flex items-end gap-2 relative z-10 mt-2">
                <span className={`text-3xl font-black ${isStreakClose ? 'text-orange-500' : 'text-emerald-600'}`}>{state.consecutiveWeeksNoSpend}</span>
                <span className="text-xs text-gray-400 mb-1.5 font-medium">/ 3 周</span>
             </div>
             <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(Math.min(state.consecutiveWeeksNoSpend, 3) / 3) * 100}%` }}
                    className={`h-full rounded-full ${isStreakClose ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-emerald-500'}`}
                />
             </div>
             <p className="text-[10px] mt-2 text-gray-400 font-medium">{isStreakClose ? '坚持住！下周就有奖励！' : '达成 3 周得 ¥10 奖励'}</p>
          </motion.div>
          
          <motion.button 
             whileHover={{ y: -2 }}
             whileTap={{ scale: 0.98 }}
             onClick={() => requestSecurity(() => setShowLimitModal(true))}
             className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between text-left relative overflow-hidden"
          >
             <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-gray-50 rounded-full"></div>
             <div className="flex justify-between w-full relative z-10">
                <div className="text-xs text-gray-500 font-bold">单笔限额</div>
                <Settings size={14} className="text-gray-400" />
             </div>
             {state.spendingLimit > 0 ? (
                 <div className="relative z-10 mt-2">
                    <div className="text-2xl font-black text-gray-800">¥{state.spendingLimit}</div>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">超额将触发警报</p>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-full text-gray-400 relative z-10 mt-2">
                    <span className="text-sm font-medium">未设置</span>
                    <span className="text-[10px]">点击设置</span>
                 </div>
             )}
          </motion.button>
        </div>

        {/* Goals Section */}
        <motion.div 
            ref={goalsSectionRef} 
            layout
            className="scroll-mt-24"
        >
          <div className="flex justify-between items-end mb-3">
             <h3 className="text-gray-800 font-bold text-lg flex items-center gap-2">
                <Target size={20} className="text-blue-500" /> 愿望清单
             </h3>
             <span className="text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded-full border border-gray-100">
                {state.savingsGoals.length} / 3
             </span>
          </div>
          
          <div className="space-y-3 min-h-[100px]">
            <AnimatePresence mode='popLayout'>
            {state.savingsGoals.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center py-8 bg-white/50 border-2 border-dashed border-gray-200 rounded-2xl"
                >
                    <p className="text-gray-400 text-sm font-medium">还没有设立目标哦</p>
                    <button onClick={() => setShowGoalModal(true)} className="text-blue-500 text-sm font-bold mt-1 hover:underline">去添加一个</button>
                </motion.div>
            ) : (
                state.savingsGoals.map(goal => (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <SavingsGoalCard 
                        goal={goal} 
                        walletBalance={state.walletBalance}
                        onDeposit={depositToGoal}
                        onDelete={(id: string) => requestSecurity(() => deleteSavingsGoal(id))}
                    />
                  </motion.div>
                ))
            )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Charts */}
        <StatsChart transactions={state.transactions} />

        {/* Recent History */}
        <div className="pb-8">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex justify-between items-center">
                <h3 className="text-gray-800 font-bold text-lg flex items-center gap-2">
                <History size={20} className="text-purple-500" /> 最近动态
                </h3>
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                >
                  <option value="ALL">全部类型</option>
                  <option value="INCOME">零花钱</option>
                  <option value="EXPENSE">消费</option>
                  <option value="INTEREST">利息</option>
                  <option value="BONUS">奖励</option>
                  <option value="TRANSFERS">存取</option>
                </select>
              </div>
              <div className="relative flex-1">
                <ArrowUpDown size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select 
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                >
                  <option value="DATE_DESC">日期 (新→旧)</option>
                  <option value="DATE_ASC">日期 (旧→新)</option>
                  <option value="AMOUNT_DESC">金额 (高→低)</option>
                  <option value="AMOUNT_ASC">金额 (低→高)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {displayedTransactions.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                    <History size={24} className="text-gray-300" />
                  </div>
                  暂无相关记录
                </div>
            ) : (
                <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                <AnimatePresence initial={false} mode="popLayout">
                {displayedTransactions.slice(0, 20).map((tx, index) => (
                    <motion.li 
                        key={tx.id} 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="p-4 flex justify-between items-center hover:bg-gray-50/80 transition-colors"
                    >
                    <div className="flex gap-3 items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0 ${
                            tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                            {tx.type === 'INCOME' && '💵'}
                            {tx.type === 'EXPENSE' && '💸'}
                            {tx.type === 'INTEREST' && '📈'}
                            {tx.type === 'BONUS' && '🎁'}
                            {tx.type === 'TRANSFER_IN' && '📥'}
                            {tx.type === 'TRANSFER_OUT' && '📤'}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-sm">{tx.description}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                    </div>
                    <span className={`font-bold text-sm tabular-nums ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                    </span>
                    </motion.li>
                ))}
                </AnimatePresence>
                </ul>
            )}
          </div>
        </div>

      </main>

      {/* --- Modals --- */}
      
      {/* REMOVED iOS Install Guide Modal */}

      {/* Auto Settlement Alert */}
      <AnimatePresence>
        {showAutoSettleAlert && (
             <motion.div 
                initial={{ opacity: 0, y: -100 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -100 }}
                className="fixed top-0 left-0 right-0 z-[70] flex justify-center p-4 pointer-events-none"
             >
                <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-bold pointer-events-auto cursor-pointer" onClick={() => setShowAutoSettleAlert(false)}>
                    <Sparkles size={20} className="text-yellow-300" />
                    <span>本周零花钱已自动入账！</span>
                </div>
             </motion.div>
        )}
      </AnimatePresence>

      {/* Coin Collection Animation */}
      <AnimatePresence>
      {isCollecting && (
          <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"
          >
              <div className="relative">
                  {/* Flying Coins */}
                  {[...Array(8)].map((_, i) => {
                      const angle = (i / 8) * Math.PI * 2;
                      const radius = 150;
                      const startX = Math.cos(angle) * radius;
                      const startY = Math.sin(angle) * radius;
                      
                      return (
                        <motion.div
                            key={i}
                            initial={{ x: startX, y: startY, opacity: 0, scale: 0.5 }}
                            animate={{ 
                                x: 0, 
                                y: 0, 
                                opacity: [0, 1, 1, 0], // fade in then out as it hits center
                                scale: [0.5, 1, 0.2]
                            }}
                            transition={{ 
                                duration: 0.6,
                                delay: 0.2 + (i * 0.05), // Staggered
                                ease: "easeIn"
                            }}
                            className="absolute top-1/2 left-1/2 -ml-3 -mt-3 text-2xl z-10"
                        >
                            🪙
                        </motion.div>
                      );
                  })}
                  
                  {/* Impact Burst */}
                  <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: [0, 0.8, 0] }}
                      transition={{ delay: 0.8, duration: 0.4 }}
                      className="absolute inset-0 bg-yellow-300/40 rounded-full blur-xl z-0"
                  />
              </div>
          </motion.div>
      )}
      </AnimatePresence>
      
      {/* Badge Modal */}
      <AnimatePresence>
      {showBadgeModal && (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden relative"
          >
             <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 pb-20 shrink-0 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.5),transparent)]"></div>
                <Trophy size={48} className="mx-auto text-yellow-400 mb-2 drop-shadow-lg" />
                <h3 className="text-xl font-black">我的勋章墙</h3>
                <p className="text-white/60 text-xs mt-1">已收集 {unlockedBadgesCount} / {AVAILABLE_BADGES.length}</p>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 -mt-6 bg-white rounded-t-3xl relative z-10">
                <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_BADGES.map(badge => {
                        const isUnlocked = state.badges.includes(badge.id);
                        return (
                            <div key={badge.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 ${isUnlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100 grayscale opacity-60'}`}>
                                <div className="text-3xl drop-shadow-sm">{badge.icon}</div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{badge.name}</h4>
                                    <p className="text-[10px] text-gray-400 leading-tight mt-1">{badge.description}</p>
                                </div>
                                {isUnlocked && <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded font-bold mt-1">已获取</span>}
                            </div>
                        )
                    })}
                </div>
             </div>
             
             <div className="p-4 border-t border-gray-100">
                <button onClick={() => setShowBadgeModal(false)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors">
                    关闭
                </button>
             </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* New Badge Alert Overlay */}
      <AnimatePresence>
        {newBadgeAlert && (
             <motion.div 
                initial={{ opacity: 0, scale: 0.5 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-8 pointer-events-none"
             >
                <div className="bg-white rounded-3xl p-8 shadow-2xl text-center border-4 border-yellow-400 pointer-events-auto relative overflow-hidden w-full max-w-sm">
                    {/* Close Button */}
                    <button 
                        onClick={() => setNewBadgeAlert(null)}
                        className="absolute top-3 right-3 z-30 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 p-2 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Cartoon Sunburst Background */}
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                        className="absolute inset-0 -m-[100%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(250,204,21,0.2)_20deg,transparent_40deg,rgba(250,204,21,0.2)_60deg,transparent_80deg,rgba(250,204,21,0.2)_100deg,transparent_120deg,rgba(250,204,21,0.2)_140deg,transparent_160deg,rgba(250,204,21,0.2)_180deg,transparent_200deg,rgba(250,204,21,0.2)_220deg,transparent_240deg,rgba(250,204,21,0.2)_260deg,transparent_280deg,rgba(250,204,21,0.2)_300deg,transparent_320deg,rgba(250,204,21,0.2)_340deg,transparent_360deg)]"
                    />

                    <div className="absolute inset-0 bg-yellow-400/10 animate-[pulse_2s_infinite]"></div>
                    {/* Move sparkles slightly to avoid collision with close button */}
                    <Sparkles className="text-yellow-400 absolute top-4 left-4 animate-spin-slow" size={24} />
                    <Sparkles className="text-yellow-400 absolute bottom-4 right-4 animate-spin-slow" size={24} />
                    
                    <motion.div 
                        initial={{ scale: 0, rotate: -180, y: 50 }}
                        animate={{ 
                            scale: [0, 1.5, 1], 
                            rotate: [0, -15, 15, -10, 10, 0],
                            y: 0
                        }}
                        transition={{ 
                            type: "spring", 
                            bounce: 0.6,
                            duration: 1.5
                        }}
                        className="text-8xl mb-6 relative z-10 block filter drop-shadow-xl"
                    >
                        {AVAILABLE_BADGES.find(b => b.id === newBadgeAlert)?.icon}
                    </motion.div>
                    
                    <h2 className="text-2xl font-black text-gray-900 mb-2 relative z-10">解锁新勋章!</h2>
                    <p className="text-lg font-bold text-yellow-600 mb-6 relative z-10">{AVAILABLE_BADGES.find(b => b.id === newBadgeAlert)?.name}</p>
                    
                    <button 
                        onClick={() => setNewBadgeAlert(null)}
                        className="bg-yellow-400 text-yellow-900 px-8 py-3 rounded-xl font-bold hover:bg-yellow-300 transition-colors shadow-lg relative z-10 w-full transform hover:scale-105 active:scale-95"
                    >
                        太棒了!
                    </button>
                </div>
             </motion.div>
        )}
      </AnimatePresence>

      {/* Earnings Preview Modal (Modified to Read-Only) */}
      <AnimatePresence>
        {showEarningsModal && pendingEarnings && (
          <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 30 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
               {/* Header Background */}
               <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-28 absolute top-0 left-0 w-full"></div>
               <div className="relative z-10 pt-6 px-6 pb-6 text-center">
                  <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                      className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg border-4 border-emerald-100 mb-3 text-3xl"
                  >
                      💸
                  </motion.div>
                  <h3 className="text-xl font-black text-gray-900 mb-4">下周收益预览</h3>

                  <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-left space-y-3">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 固定零花钱
                          </span>
                          <span className="font-bold text-emerald-600">+¥{pendingEarnings.allowance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 利息收益 <span className="text-[10px] text-gray-400">({(getInterestRate(pendingEarnings.prevTotal, state) * 100).toFixed(0)}%)</span>
                          </span>
                          <span className="font-bold text-blue-600">+¥{pendingEarnings.interest.toFixed(2)}</span>
                      </div>
                      {pendingEarnings.bonus > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> 自律奖励
                            </span>
                            <span className="font-bold text-orange-600">+¥{pendingEarnings.bonus.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="h-px bg-gray-200 my-2"></div>
                      
                      <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800 text-sm">本周预计总计</span>
                          <span className="font-black text-xl text-red-500">+¥{pendingEarnings.total.toFixed(2)}</span>
                      </div>
                  </div>

                  <div className="text-center bg-yellow-50 rounded-xl p-3 border border-yellow-100 mb-4">
                      <p className="text-[10px] text-yellow-700 font-medium mb-1 uppercase tracking-wider">结算后预计总资产</p>
                      <div className="text-2xl font-black text-yellow-600 flex items-center justify-center gap-0.5">
                          <span className="text-lg opacity-80 mt-0.5">¥</span>
                          {pendingEarnings.newTotal.toFixed(2)}
                      </div>
                  </div>

                  <button 
                      onClick={() => setShowEarningsModal(false)}
                      className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl shadow-xl hover:bg-black transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                      好的，期待周日
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2">收益将在每周日自动发放到账</p>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Settings Modal (New) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Settings size={20} className="text-gray-600"/> 系统设置
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">应用名称</label>
                <input 
                  type="text" 
                  value={settingsAppName}
                  onChange={e => setSettingsAppName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-lg font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="彦仔宝库"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">家长管理密码</label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={settingsPassword}
                    onChange={e => setSettingsPassword(e.target.value)}
                    className="w-full pl-10 bg-gray-50 border border-gray-200 rounded-lg p-3 text-lg font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="8090"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">用于验证“支出”、“取款”等敏感操作</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">每周固定零花钱 (元)</label>
                <input 
                  type="number" 
                  value={settingsAllowance}
                  onChange={e => setSettingsAllowance(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-lg font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="10"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-2">周利息模式</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setSettingsRateMode('TIERED')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${settingsRateMode === 'TIERED' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    阶梯利率 (默认)
                  </button>
                  <button 
                    onClick={() => setSettingsRateMode('FIXED')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${settingsRateMode === 'FIXED' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    固定利率
                  </button>
                </div>
              </div>
              
              {settingsRateMode === 'FIXED' ? (
                <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}}>
                  <label className="text-xs text-gray-500 font-medium block mb-1">固定周利率 (%)</label>
                  <input 
                    type="number" 
                    value={settingsFixedRate}
                    onChange={e => setSettingsFixedRate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-lg font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="10"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">输入 10 代表 10% 的周利息</p>
                </motion.div>
              ) : (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="grid grid-cols-12 gap-2 mb-2 text-xs text-gray-400 font-bold text-center">
                        <div className="col-span-4 text-left pl-1">资产档位</div>
                        <div className="col-span-4">周利率(%)</div>
                        <div className="col-span-4">上限(¥)</div>
                    </div>

                    {/* Tier 1 */}
                    <div className="grid grid-cols-12 gap-2 items-center mb-2">
                        <div className="col-span-4 text-left">
                            <span className="text-xs font-bold text-gray-700">低资产</span>
                            <div className="text-[9px] text-blue-500 scale-90 origin-left">推荐高息</div>
                        </div>
                        <div className="col-span-4">
                             <input type="number" value={tier1RateInput} onChange={e => setTier1RateInput(e.target.value)} className="w-full p-1.5 rounded border border-gray-200 text-sm font-bold text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="col-span-4">
                             <input type="number" value={limit1Input} onChange={e => setLimit1Input(e.target.value)} className="w-full p-1.5 rounded border border-gray-200 text-sm font-bold text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>

                    {/* Tier 2 */}
                    <div className="grid grid-cols-12 gap-2 items-center mb-2">
                        <div className="col-span-4 text-left">
                            <span className="text-xs font-bold text-gray-700">中资产</span>
                        </div>
                        <div className="col-span-4">
                             <input type="number" value={tier2RateInput} onChange={e => setTier2RateInput(e.target.value)} className="w-full p-1.5 rounded border border-gray-200 text-sm font-bold text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="col-span-4">
                             <input type="number" value={limit2Input} onChange={e => setLimit2Input(e.target.value)} className="w-full p-1.5 rounded border border-gray-200 text-sm font-bold text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>

                    {/* Tier 3 */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4 text-left">
                            <span className="text-xs font-bold text-gray-700">高资产</span>
                            <div className="text-[9px] text-gray-400 scale-90 origin-left">&gt; 中资产上限</div>
                        </div>
                        <div className="col-span-4">
                             <input type="number" value={tier3RateInput} onChange={e => setTier3RateInput(e.target.value)} className="w-full p-1.5 rounded border border-gray-200 text-sm font-bold text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="col-span-4 text-center text-gray-300 text-lg leading-none">
                             ∞
                        </div>
                    </div>
                </motion.div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSettingsModal(false)} className="flex-1 py-3 text-gray-600 font-medium bg-gray-100 rounded-xl">取消</button>
              <button 
                onClick={handleSaveSettings}
                className="flex-1 py-3 text-white font-medium bg-blue-600 rounded-xl hover:bg-blue-700"
              >
                保存修改
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Spend Modal */}
      {showSpendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">支出记录</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">金额</label>
                <input 
                  type="number" 
                  value={spendAmount}
                  onChange={e => setSpendAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-lg font-medium text-gray-900 focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">用途</label>
                <input 
                  type="text" 
                  value={spendReason}
                  onChange={e => setSpendReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="买零食、文具..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSpendModal(false)} className="flex-1 py-3 text-gray-600 font-medium bg-gray-100 rounded-xl">取消</button>
              <button 
                onClick={() => {
                  handleSpend(parseFloat(spendAmount), spendReason || '其他消费');
                  setShowSpendModal(false);
                  setSpendAmount('');
                  setSpendReason('');
                }}
                disabled={!spendAmount}
                className="flex-1 py-3 text-white font-medium bg-rose-500 rounded-xl hover:bg-rose-600 disabled:opacity-50"
              >
                确认支出
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">额外收入</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">金额</label>
                <input 
                  type="number" 
                  value={incomeAmount}
                  onChange={e => setIncomeAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-lg font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">来源/原因</label>
                <input 
                  type="text" 
                  value={incomeReason}
                  onChange={e => setIncomeReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="家务奖励、礼物..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowIncomeModal(false)} className="flex-1 py-3 text-gray-600 font-medium bg-gray-100 rounded-xl">取消</button>
              <button 
                onClick={() => {
                  handleIncome(parseFloat(incomeAmount), incomeReason || '其他收入');
                  setShowIncomeModal(false);
                  setIncomeAmount('');
                  setIncomeReason('');
                }}
                disabled={!incomeAmount}
                className="flex-1 py-3 text-white font-medium bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                确认存入
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">新愿望</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">愿望名称</label>
                <input 
                  type="text" 
                  value={goalName}
                  onChange={e => setGoalName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="乐高、新书包..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">目标金额</label>
                <input 
                  type="number" 
                  value={goalTarget}
                  onChange={e => setGoalTarget(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">愿望图片 (可选)</label>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-200 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    {goalImage ? (
                        <div className="relative w-full h-full p-2">
                             <img src={goalImage} alt="Preview" className="w-full h-full object-contain" />
                             <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                <span className="text-white text-xs font-bold">更换图片</span>
                             </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
                            <Upload size={24} className="mb-1" />
                            <p className="text-[10px]">点击上传</p>
                        </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowGoalModal(false)} className="flex-1 py-3 text-gray-600 font-medium bg-gray-100 rounded-xl">取消</button>
              <button 
                onClick={() => {
                  addSavingsGoal(goalName, parseFloat(goalTarget), goalImage);
                  setShowGoalModal(false);
                  setGoalName('');
                  setGoalTarget('');
                  setGoalImage('');
                }}
                disabled={!goalName || !goalTarget}
                className="flex-1 py-3 text-white font-medium bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                创建目标
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">设置消费限额</h3>
            <p className="text-sm text-gray-500">设置单笔消费的最高警告金额。输入 0 表示不限制。</p>
            <div>
              <input 
                type="number" 
                value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-lg text-gray-900 outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowLimitModal(false)} className="flex-1 py-3 text-gray-600 font-medium bg-gray-100 rounded-xl">取消</button>
              <button 
                onClick={() => {
                  handleSetSpendingLimit(parseFloat(limitInput) || 0);
                  setShowLimitModal(false);
                }}
                className="flex-1 py-3 text-white font-medium bg-gray-800 rounded-xl hover:bg-gray-900"
              >
                保存设置
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Initial Balance Modal */}
      {showInitBalanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">设置总资产初始额度</h3>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-xs text-orange-700 flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>直接修改总资产通常用于初始资金设置。这将会调整您的可用余额。</p>
            </div>
            <div>
              <input 
                type="number" 
                value={initBalanceInput}
                onChange={e => setInitBalanceInput(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-lg text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowInitBalanceModal(false)} className="flex-1 py-3 text-gray-600 font-medium bg-gray-100 rounded-xl">取消</button>
              <button 
                onClick={() => {
                  handleSetInitialBalance(parseFloat(initBalanceInput) || 0);
                  setShowInitBalanceModal(false);
                }}
                className="flex-1 py-3 text-white font-medium bg-emerald-600 rounded-xl hover:bg-emerald-700"
              >
                确认修改
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Security Password Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-2xl w-full max-w-[300px] p-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <Lock size={24} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">管理员验证</h3>
            <p className="text-xs text-gray-500">此操作需要家长或管理员权限</p>
            
            <input 
              type="password" 
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-lg text-gray-900 tracking-widest outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="请输入密码"
              autoFocus
            />
            
            <button 
              onClick={handleSecuritySubmit}
              className="w-full py-3 text-white font-medium bg-gray-900 rounded-xl hover:bg-black shadow-lg"
            >
              验证
            </button>
            <button 
               onClick={() => {
                   setShowSecurityModal(false);
                   setPasswordInput('');
                   securityCallback.current = null;
               }}
               className="text-gray-400 text-xs hover:text-gray-600"
            >
               取消操作
            </button>
          </motion.div>
        </div>
      )}

      {/* Rate Rules Modal */}
      {showRateRulesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 relative overflow-hidden">
            {/* Decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-yellow-100 rounded-full blur-2xl opacity-50"></div>

            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 relative z-10">
              <TrendingUp className="text-emerald-500" size={20} /> 
              利率规则
            </h3>
            
            {state.interestRateMode === 'FIXED' ? (
                <div className="relative z-10 bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                    <p className="text-sm text-gray-600 mb-1">当前采用固定利率模式</p>
                    <div className="text-3xl font-black text-blue-600">{(state.fixedInterestRate * 100).toFixed(1)}%</div>
                    <p className="text-[10px] text-gray-400 mt-2">所有资金统一按此周利率计算收益</p>
                </div>
            ) : (
                <div className="space-y-3 relative z-10">
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">总资产 ≤ {state.tieredInterestConfig.lowThreshold}元</span>
                    <span className="text-lg font-bold text-emerald-600">{(state.tieredInterestConfig.lowRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">{state.tieredInterestConfig.lowThreshold}元 &lt; 总资产 ≤ {state.tieredInterestConfig.highThreshold}元</span>
                    <span className="text-lg font-bold text-blue-600">{(state.tieredInterestConfig.midRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">总资产 &gt; {state.tieredInterestConfig.highThreshold}元</span>
                    <span className="text-lg font-bold text-purple-600">{(state.tieredInterestConfig.highRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
            )}

            <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg leading-relaxed mt-2">
              {state.interestRateMode === 'FIXED' 
               ? '* 您已设置为固定利率，若需恢复阶梯利率请在设置中修改。' 
               : '* 利率会根据您的当前总资产规模（包含零钱和愿望储蓄）自动调整。'}
            </p>

            <button 
              onClick={() => setShowRateRulesModal(false)}
              className="w-full py-3 text-white font-medium bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200"
            >
              知道了
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}