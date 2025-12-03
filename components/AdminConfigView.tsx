
import React, { useState, useEffect } from 'react';
import { StatusConfig, ModuleConfig } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Trash2, X, Check, AlertCircle } from 'lucide-react';

interface AdminConfigViewProps {
    onClose: () => void;
    initialStatuses: StatusConfig[];
    initialModules: ModuleConfig[];
    onUpdate: () => void; // Callback to refresh master data in App
}

export const AdminConfigView: React.FC<AdminConfigViewProps> = ({ onClose, initialStatuses, initialModules, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'statuses' | 'modules'>('statuses');
    const [statuses, setStatuses] = useState<StatusConfig[]>(initialStatuses);
    const [modules, setModules] = useState<ModuleConfig[]>(initialModules);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemLabel, setNewItemLabel] = useState('');
    const [newItemColor, setNewItemColor] = useState('#3b82f6'); // Default blue
    const [newItemSortOrder, setNewItemSortOrder] = useState(10);

    useEffect(() => {
        setStatuses(initialStatuses);
        setModules(initialModules);
    }, [initialStatuses, initialModules]);

    const handleAdd = async () => {
        if (!newItemLabel.trim()) return;
        setIsLoading(true);
        setError(null);

        try {
            if (activeTab === 'statuses') {
                const newStatus = await StorageService.createStatus({
                    label: newItemLabel,
                    colorHex: newItemColor,
                    sortOrder: newItemSortOrder
                });
                if (newStatus) {
                    setStatuses(prev => [...prev, newStatus].sort((a, b) => a.sortOrder - b.sortOrder));
                    onUpdate();
                    setShowAddModal(false);
                    resetForm();
                } else {
                    setError("Failed to create status.");
                }
            } else {
                const newModule = await StorageService.createModule({
                    label: newItemLabel,
                    sortOrder: newItemSortOrder
                });
                if (newModule) {
                    setModules(prev => [...prev, newModule].sort((a, b) => a.sortOrder - b.sortOrder));
                    onUpdate();
                    setShowAddModal(false);
                    resetForm();
                } else {
                    setError("Failed to create module.");
                }
            }
        } catch (err) {
            setError("An error occurred.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item? This might affect existing tickets.")) return;
        setIsLoading(true);
        try {
            if (activeTab === 'statuses') {
                const success = await StorageService.deleteStatus(id);
                if (success) {
                    setStatuses(prev => prev.filter(s => s.id !== id));
                    onUpdate();
                } else {
                    setError("Failed to delete status.");
                }
            } else {
                const success = await StorageService.deleteModule(id);
                if (success) {
                    setModules(prev => prev.filter(m => m.id !== id));
                    onUpdate();
                } else {
                    setError("Failed to delete module.");
                }
            }
        } catch (err) {
            setError("An error occurred.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setNewItemLabel('');
        setNewItemColor('#3b82f6');
        setNewItemSortOrder(10);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Settings className="mr-2 text-slate-500" /> System Configuration
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('statuses')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'statuses' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        Ticket Statuses
                    </button>
                    <button
                        onClick={() => setActiveTab('modules')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'modules' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        ERP Modules
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" /> {error}
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            {activeTab === 'statuses' ? 'Manage Statuses' : 'Manage Modules'}
                        </h3>
                        <button
                            onClick={() => { setShowAddModal(true); resetForm(); }}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add {activeTab === 'statuses' ? 'Status' : 'Module'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {activeTab === 'statuses' ? (
                            statuses.map(status => (
                                <div key={status.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-500 shadow-inner" style={{ backgroundColor: status.colorHex }}></div>
                                        <div>
                                            <span className="font-medium text-gray-900 dark:text-white block">{status.label}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Order: {status.sortOrder}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(status.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            modules.map(module => (
                                <div key={module.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold text-xs">
                                            {module.label.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-900 dark:text-white block">{module.label}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Order: {module.sortOrder}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(module.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}

                        {(activeTab === 'statuses' ? statuses.length === 0 : modules.length === 0) && (
                            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                                No items found. Add one to get started.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Item Modal */}
            {showAddModal && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-slate-600 animate-scale-in">
                        <h4 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Add New {activeTab === 'statuses' ? 'Status' : 'Module'}</h4>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={newItemLabel}
                                    onChange={e => setNewItemLabel(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. In Review"
                                    autoFocus
                                />
                            </div>

                            {activeTab === 'statuses' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="color"
                                            value={newItemColor}
                                            onChange={e => setNewItemColor(e.target.value)}
                                            className="h-10 w-20 p-1 rounded border border-gray-300 dark:border-slate-600 cursor-pointer"
                                        />
                                        <span className="text-sm text-gray-500">{newItemColor}</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
                                <input
                                    type="number"
                                    value={newItemSortOrder}
                                    onChange={e => setNewItemSortOrder(parseInt(e.target.value) || 0)}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium">Cancel</button>
                            <button onClick={handleAdd} disabled={!newItemLabel.trim() || isLoading} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for loading icon since I used it above but didn't import it in the file content string initially
// Adding it to imports now.
import { Loader2, Settings } from 'lucide-react';
