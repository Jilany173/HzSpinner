import React, { useState } from 'react';
import { Teacher, TeacherList } from '../types';
import { Plus, Trash2, Edit2, Check, X, UserPlus, Users, ChevronRight, ChevronLeft, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TeacherManagerProps {
  lists: TeacherList[];
  allTeachers: Teacher[];
  currentListId: string | null;
  onSwitchList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onEditList: (id: string, newName: string) => void;
  onCreateList: () => void;
  teachers: Teacher[];
  onAddTeacher: (name: string) => void;
  onBulkAddTeachers: (names: string[]) => void;
  onDeleteTeacher: (id: string) => void;
  onEditTeacher: (id: string, newName: string) => void;
  onReset: () => void;
}

const TeacherManager: React.FC<TeacherManagerProps> = ({ 
  lists, 
  allTeachers,
  currentListId, 
  onSwitchList, 
  onDeleteList,
  onEditList,
  onCreateList,
  teachers, 
  onAddTeacher, 
  onBulkAddTeachers, 
  onDeleteTeacher, 
  onEditTeacher, 
  onReset 
}) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListValue, setEditListValue] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [view, setView] = useState<'lists' | 'members'>('lists');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddTeacher(newName.trim());
      setNewName('');
    }
  };

  const handleBulkAddSubmit = () => {
    const names = bulkText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (names.length > 0) {
      onBulkAddTeachers(names);
      setBulkText('');
      setShowBulkAdd(false);
    }
  };

  const startEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setEditValue(teacher.name);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      onEditTeacher(editingId, editValue.trim());
      setEditingId(null);
    }
  };

  const startEditList = (e: React.MouseEvent, list: TeacherList) => {
    e.stopPropagation();
    setEditingListId(list.id);
    setEditListValue(list.name);
  };

  const saveEditList = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ('stopPropagation' in e) e.stopPropagation();
    if (editingListId && editListValue.trim()) {
      onEditList(editingListId, editListValue.trim());
      setEditingListId(null);
    }
  };

  const handleListClick = (listId: string) => {
    if (editingListId === listId) return;
    onSwitchList(listId);
    setView('members');
  };

  const currentList = lists.find(l => l.id === currentListId);

  if (view === 'lists') {
    return (
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              My Lists
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {lists.length} TOTAL LISTS
            </p>
          </div>
          <button
            onClick={onCreateList}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <PlusCircle className="w-4 h-4" />
            Create New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {lists.map((list) => {
              const memberCount = allTeachers.filter(t => t.listId === list.id).length;
              const isEditing = editingListId === list.id;
              
              return (
                <motion.div
                  key={list.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`group relative flex items-center justify-between p-5 bg-white rounded-2xl border transition-all ${isEditing ? 'border-blue-500 shadow-md' : 'border-slate-100 hover:border-blue-200 hover:shadow-md cursor-pointer'}`}
                  onClick={() => handleListClick(list.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editListValue}
                            onChange={(e) => setEditListValue(e.target.value)}
                            className="w-full px-3 py-1 rounded-lg border-2 border-blue-500 focus:outline-none font-black text-slate-900 text-lg"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && saveEditList(e)}
                          />
                          <button onClick={saveEditList} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                            <Check className="w-5 h-5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingListId(null); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors truncate">{list.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">
                              {new Date(list.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                              {memberCount} MEMBERS
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 ml-4">
                      <button
                        onClick={(e) => startEditList(e, list)}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-slate-50 border border-slate-100 rounded-xl transition-all active:scale-95"
                        title="Edit List"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteList(list.id);
                        }}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 bg-slate-50 border border-slate-100 rounded-xl transition-all active:scale-95"
                        title="Delete List"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="ml-1 p-1 text-slate-300 group-hover:text-blue-600 transition-all">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {lists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No lists found</p>
              <p className="text-slate-300 text-xs mt-1">Create your first list to get started</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[700px]">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('lists')}
              className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-500"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {currentList?.name || 'List Members'}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {teachers.length} ACTIVE MEMBERS
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBulkAdd(!showBulkAdd)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-widest transition-all border-2 ${
              showBulkAdd 
              ? 'bg-slate-900 border-slate-900 text-white' 
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
            }`}
          >
            {showBulkAdd ? 'SINGLE ADD' : 'BULK ADD'}
          </button>
        </div>

        {showBulkAdd ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Paste names here (one per line)..."
              className="w-full h-32 px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:outline-none bg-white resize-none text-sm font-medium"
            />
            <button
              onClick={handleBulkAddSubmit}
              disabled={!bulkText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              IMPORT {bulkText.split('\n').filter(n => n.trim()).length} MEMBERS
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add team member..."
                className="w-full pl-4 pr-10 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:outline-none bg-white font-bold text-slate-900 transition-all"
              />
              <UserPlus className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            </div>
            <button
              type="submit"
              disabled={!newName.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-2xl transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-6 h-6" />
            </button>
          </form>
        )}
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
        <AnimatePresence mode="popLayout">
          {teachers.map((teacher, index) => (
            <motion.div
              key={teacher.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 group hover:border-blue-200 hover:shadow-sm transition-all"
            >
              {editingId === teacher.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border-2 border-blue-500 focus:outline-none font-bold text-slate-900"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <div className="flex gap-1">
                    <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {index + 1}
                    </div>
                    <span className="font-bold text-slate-700 truncate group-hover:text-slate-900">{teacher.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 transition-all">
                    <button
                      onClick={() => startEdit(teacher)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-slate-50 border border-slate-100 rounded-xl transition-all active:scale-95"
                      title="Edit member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTeacher(teacher.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 bg-slate-50 border border-slate-100 rounded-xl transition-all active:scale-95"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {teachers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No members added</p>
            <p className="text-slate-300 text-xs mt-1">Add people to start spinning</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {teachers.length > 0 && (
        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={onReset}
            className="w-full py-3 px-4 text-slate-400 hover:text-red-600 font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Members
          </button>
        </div>
      )}
    </div>
  );
};

export default TeacherManager;
