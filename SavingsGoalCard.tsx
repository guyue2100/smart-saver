import React, { useState } from 'react';
// Update import path to be in the same directory
import { SavingsGoal } from './types';
import { Target, Plus, Trash2 } from 'lucide-react';

interface Props {
  goal: SavingsGoal;
  walletBalance: number;
  onDeposit: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
}

const SavingsGoalCard: React.FC<Props> = ({ goal, walletBalance, onDeposit, onDelete }) => {
  const [depositAmount, setDepositAmount] = useState('');
  const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    onDeposit(goal.id, amount);
    setDepositAmount('');
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 relative group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 w-full">
           {goal.imageUrl ? (
              <img 
                src={goal.imageUrl} 
                alt={goal.name} 
                className="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm shrink-0" 
              />
           ) : (
            <div className={`p-2 rounded-lg shrink-0 ${goal.isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                <Target size={18} />
            </div>
           )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 truncate">{goal.name}</h4>
            <p className="text-xs text-gray-500">目标: ¥{goal.targetAmount}</p>
          </div>
          <button 
            onClick={() => onDelete(goal.id)}
            className="text-gray-300 hover:text-red-500 transition-colors ml-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-600">进度</span>
          <span className={goal.isCompleted ? 'text-green-600' : 'text-blue-600'}>
            ¥{goal.currentAmount.toFixed(2)} ({progress.toFixed(0)}%)
          </span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${goal.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!goal.isCompleted && (
        <div className="flex gap-2 mt-2">
          <input
            type="number"
            placeholder="存入金额"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || parseFloat(depositAmount) > walletBalance}
            className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="存入资金"
          >
            <Plus size={20} />
          </button>
        </div>
      )}
      {goal.isCompleted && (
          <div className="mt-2 text-center text-xs font-bold text-green-600 bg-green-50 py-1 rounded">
              🎉 目标达成!
          </div>
      )}
    </div>
  );
};

export default SavingsGoalCard;