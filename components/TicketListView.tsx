
import React from 'react';
import { Ticket, User, StatusConfig, ModuleConfig, SlaConfig, TicketPriority, UserRole } from '../types';
import { StatusBadge } from './StatusBadge'; // Assuming this exists or is exported
import { PriorityBadge } from './PriorityBadge'; // Need to check if this exists
import { SlaTimer } from './SlaTimer';
import { X, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface TicketListViewProps {
    tickets: Ticket[];
    users: User[];
    masterData: {
        statuses: StatusConfig[];
        modules: ModuleConfig[];
        slas: SlaConfig[];
    };
    filters: {
        status: string;
        priority: string;
        module: string;
        assignee: string;
    };
    setFilters: React.Dispatch<React.SetStateAction<{
        status: string;
        priority: string;
        module: string;
        assignee: string;
    }>>;
    setSelectedTicketId: (id: string | null) => void;
    setCurrentView: (view: 'dashboard' | 'list' | 'detail' | 'new' | 'board' | 'reports') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export const TicketListView: React.FC<TicketListViewProps> = ({
    tickets,
    users,
    masterData,
    filters,
    setFilters,
    setSelectedTicketId,
    setCurrentView,
    searchQuery,
    setSearchQuery
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-full">
            {/* Filters Toolbar */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-wrap gap-3 items-center bg-gray-50/50 dark:bg-slate-800/50">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    />
                </div>

                <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

                <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="p-2 pl-3 pr-8 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                >
                    <option value="">All Statuses</option>
                    {masterData.statuses.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                </select>

                <select
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    className="p-2 pl-3 pr-8 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                >
                    <option value="">All Priorities</option>
                    {Object.values(TicketPriority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                    value={filters.module}
                    onChange={(e) => setFilters(prev => ({ ...prev, module: e.target.value }))}
                    className="p-2 pl-3 pr-8 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                >
                    <option value="">All Modules</option>
                    {masterData.modules.length > 0
                        ? masterData.modules.map(m => <option key={m.id} value={m.label}>{m.label}</option>)
                        : ['Finance', 'Sales', 'Inventory', 'Manufacturing', 'HR', 'System'].map(m => <option key={m} value={m}>{m}</option>)
                    }
                </select>

                <select
                    value={filters.assignee}
                    onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
                    className="p-2 pl-3 pr-8 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                >
                    <option value="">All Assignees</option>
                    {users.filter(u => u.role !== UserRole.REPORTER).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>

                {(filters.status || filters.priority || filters.module || filters.assignee) && (
                    <motion.button
                        onClick={() => setFilters({ status: '', priority: '', assignee: '', module: '' })}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="ml-auto text-sm text-red-500 hover:text-red-700 font-medium flex items-center"
                    >
                        <X className="h-3 w-3 mr-1" /> Clear Filters
                    </motion.button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50/80 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <th className="p-4 font-semibold border-b dark:border-slate-700">ID</th>
                            <th className="p-4 font-semibold border-b dark:border-slate-700">Subject</th>
                            <th className="p-4 font-semibold border-b dark:border-slate-700">Module</th>
                            <th className="p-4 font-semibold border-b dark:border-slate-700">Status</th>
                            <th className="p-4 font-semibold border-b dark:border-slate-700">Priority</th>
                            <th className="p-4 font-semibold border-b dark:border-slate-700">SLA</th>
                            <th className="p-4 font-semibold border-b dark:border-slate-700">Assignee</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {tickets.map((ticket, index) => {
                            const assignee = users.find(u => u.id === ticket.assigneeId);
                            return (
                                <motion.tr
                                    key={ticket.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
                                    onClick={() => { setSelectedTicketId(ticket.id); setCurrentView('detail'); }}
                                >
                                    <td className="p-4 text-sm font-mono font-medium text-gray-500 dark:text-gray-400">{ticket.number}</td>
                                    <td className="p-4">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{ticket.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{ticket.description}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                        <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md text-xs">{ticket.module}</span>
                                    </td>
                                    <td className="p-4"><StatusBadge status={ticket.status} config={masterData.statuses} /></td>
                                    <td className="p-4"><PriorityBadge priority={ticket.priority} /></td>
                                    <td className="p-4"><SlaTimer ticket={ticket} slas={masterData.slas} /></td>
                                    <td className="p-4">
                                        {assignee ? (
                                            <div className="flex items-center space-x-2">
                                                <img src={assignee.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-600" />
                                                <span className="text-sm text-gray-600 dark:text-gray-300">{assignee.name}</span>
                                            </div>
                                        ) : <span className="text-xs text-gray-400 italic">Unassigned</span>}
                                    </td>
                                </motion.tr>
                            );
                        })}
                        {tickets.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    No tickets found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
