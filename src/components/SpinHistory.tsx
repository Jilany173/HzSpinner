import React from 'react';
import { SpinResult } from '../types';
import { History, Clock, User, Trophy, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpinHistoryProps {
  history: SpinResult[];
}

const SpinHistory: React.FC<SpinHistoryProps> = ({ history }) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[700px]">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Spin History
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
          {history.length} TOTAL SPINS
        </p>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
        <AnimatePresence mode="popLayout">
          {history.length > 0 ? (
            history.map((result, index) => (
              <motion.div
                key={result.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                className={`relative group p-4 rounded-2xl border-2 transition-all ${
                  index === 0 
                    ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                    : 'bg-white border-slate-50 hover:border-slate-200'
                }`}
              >
                {index === 0 && (
                  <div className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-blue-100 flex items-center gap-1">
                    <Trophy className="w-2.5 h-2.5" />
                    LATEST WINNER
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                    index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                  }`}>
                    <User className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={`font-black truncate ${index === 0 ? 'text-blue-900 text-lg' : 'text-slate-700'}`}>
                        {result.teacherName}
                      </h3>
                      <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(result.timestamp)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(result.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        TOPIC
                      </span>
                      <p className="text-xs font-bold text-slate-500 truncate italic">
                        {result.topic}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <History className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No history yet</p>
              <p className="text-slate-300 text-xs mt-1">Winners will appear here after spinning</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SpinHistory;
