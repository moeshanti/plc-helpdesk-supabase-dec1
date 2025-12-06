
import React, { useState, useEffect } from 'react';
import { StatusConfig, ModuleConfig, SlaConfig } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Trash2, X, Check, AlertCircle, Loader2, Settings, Clock } from 'lucide-react';

interface AdminConfigViewProps {
    onClose: () => void;
    initialStatuses: StatusConfig[];
    initialModules: ModuleConfig[];
    initialSlas: SlaConfig[];
    onUpdate: () => void; // Callback to refresh master data in App
}

export const AdminConfigView: React.FC<AdminConfigViewProps> = ({ onClose, initialStatuses, initialModules, initialSlas, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'statuses' | 'modules' | 'slas'>('statuses');
    const [statuses, setStatuses] = useState<StatusConfig[]>(initialStatuses);
    const [modules, setModules] = useState<ModuleConfig[]>(initialModules);
    const [slas, setSlas] = useState<SlaConfig[]>(initialSlas);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemLabel, setNewItemLabel] = useState('');
    const [newItemColor, setNewItemColor] = useState('#3b82f6'); // Default blue
    const [newItemSortOrder, setNewItemSortOrder] = useState(10);

    // SLA Edit State
    const [editingSlaId, setEditingSlaId] = useState<number | null>(null);
    const [editingSlaHours, setEditingSlaHours] = useState<number>(0);

    // Custom Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        id: number | null;
        type: 'status' | 'module' | null;
        label: string;
    }>({
        isOpen: false,
        id: null,
        type: null,
        label: ''
    });

    useEffect(() => {
        setStatuses(initialStatuses);
        setModules(initialModules);
        setSlas(initialSlas);
    }, [initialStatuses, initialModules, initialSlas]);

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
                setStatuses(prev => [...prev, newStatus].sort((a, b) => a.sortOrder - b.sortOrder));
                onUpdate();
                setShowAddModal(false);
                resetForm();
            } else if (activeTab === 'modules') {
                const newModule = await StorageService.createModule({
                    label: newItemLabel,
                    sortOrder: newItemSortOrder
                });
                setModules(prev => [...prev, newModule].sort((a, b) => a.sortOrder - b.sortOrder));
                onUpdate();
                setShowAddModal(false);
                resetForm();
            }
        } catch (err: any) {
            setError(err.message || "An error occurred.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number, type: 'status' | 'module', label: string, isDefault?: boolean) => {
        if (isDefault) {
            setError(`Cannot delete '${label}' because it is a system default.`);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Check dependencies
            const count = await StorageService.checkDependency(type, label);

            if (count > 0) {
                setError(`Cannot delete '${label}'. It is currently used by ${count} tickets. Please reassign them first.`);
                setIsLoading(false);
                return;
            }

            // If safe, open custom confirmation modal
            setDeleteConfirm({
                isOpen: true,
                id,
                type,
                label
            });
            setIsLoading(false);

        } catch (err: any) {
            setError(err.message || "An error occurred during dependency check.");
            console.error(err);
            setIsLoading(false);
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirm.id || !deleteConfirm.type) return;

        setIsLoading(true);
        setError(null);

        try {
            const { id, type } = deleteConfirm;

            if (type === 'status') {
                const success = await StorageService.deleteStatus(id);
                if (success) {
                    setStatuses(prev => prev.filter(s => s.id !== id));
                    onUpdate();
                    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                } else {
                    setError(`Failed to delete status '${deleteConfirm.label}'. It might not exist or an error occurred.`);
                }
            } else {
                const success = await StorageService.deleteModule(id);
                if (success) {
                    setModules(prev => prev.filter(m => m.id !== id));
                    onUpdate();
                    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                } else {
                    setError(`Failed to delete module '${deleteConfirm.label}'.`);
                }
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during deletion.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSlaUpdate = async (id: number) => {
        setIsLoading(true);
        try {
            const success = await StorageService.updateSla(id, editingSlaHours);
            if (success) {
                setSlas(prev => prev.map(s => s.id === id ? { ...s, resolution_hours: editingSlaHours } : s));
                onUpdate();
                setEditingSlaId(null);
            } else {
                setError("Failed to update SLA.");
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
                    <button
                        onClick={() => setActiveTab('slas')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'slas' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        SLA Policies
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
                            {activeTab === 'statuses' ? 'Manage Statuses' : activeTab === 'modules' ? 'Manage Modules' : 'SLA Resolution Times'}
                        </h3>
                        {activeTab !== 'slas' && (
                            <button
                                onClick={() => { setShowAddModal(true); resetForm(); }}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add {activeTab === 'statuses' ? 'Status' : 'Module'}
                            </button>
                        )}
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
                                    <button
                                        onClick={() => handleDelete(status.id, 'status', status.label, status.isDefault)}
                                        disabled={status.isDefault}
                                        className={`p-2 rounded-full transition-colors ${status.isDefault
                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                                            }`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : activeTab === 'modules' ? (
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
                                    <button
                                        onClick={() => handleDelete(module.id, 'module', module.label, module.isDefault)}
                                        disabled={module.isDefault}
                                        className={`p-2 rounded-full transition-colors ${module.isDefault
                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                                            }`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            slas.map(sla => (
                                <div key={sla.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: sla.color_hex }}>
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-900 dark:text-white block text-lg">{sla.priority}</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Target Resolution Time</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        {editingSlaId === sla.id ? (
                                            <div className="flex items-center space-x-2 animate-fade-in">
                                                <input
                                                    type="number"
                                                    value={editingSlaHours}
                                                    onChange={(e) => setEditingSlaHours(Number(e.target.value))}
                                                    className="w-20 p-2 border border-blue-500 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-center font-bold"
                                                    autoFocus
                                                />
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">hours</span>
                                                <button
                                                    onClick={() => handleSlaUpdate(sla.id)}
                                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingSlaId(null)}
                                                    className="p-2 bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-4">
                                                <span className="text-2xl font-bold text-gray-800 dark:text-white">{sla.resolution_hours} <span className="text-sm font-normal text-gray-500">hours</span></span>
                                                <button
                                                    onClick={() => { setEditingSlaId(sla.id); setEditingSlaHours(sla.resolution_hours); }}
                                                    className="px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {(activeTab === 'statuses' ? statuses.length === 0 : activeTab === 'modules' ? modules.length === 0 : slas.length === 0) && (
                            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                                No items found.
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

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm.isOpen && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-slate-600 animate-scale-in">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h4 className="text-lg font-bold mb-2 text-center text-gray-900 dark:text-white">Delete Item?</h4>
                        <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
                            Are you sure you want to delete <strong>{deleteConfirm.label}</strong>? This action cannot be undone.
                        </p>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md flex items-center"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />} Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
