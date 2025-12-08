import React from 'react';
import { AuditLog, User } from '../types';
import { RefreshCw, AlertTriangle, User as UserIcon, CheckCircle2, FileEdit } from 'lucide-react';
import { motion } from 'framer-motion';

interface TicketHistoryTimelineProps {
    logs: AuditLog[];
    users: User[];
}

const getActionIcon = (type: string) => {
    switch (type) {
        case 'STATUS_CHANGE': return <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
        case 'PRIORITY_CHANGE': return <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
        case 'ASSIGNMENT': return <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
        default: return <FileEdit className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
};

const getActionColor = (type: string) => {
    switch (type) {
        case 'STATUS_CHANGE': return 'bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30';
        case 'PRIORITY_CHANGE': return 'bg-orange-100 dark:bg-orange-500/20 border-orange-200 dark:border-orange-500/30';
        case 'ASSIGNMENT': return 'bg-purple-100 dark:bg-purple-500/20 border-purple-200 dark:border-purple-500/30';
        default: return 'bg-gray-100 dark:bg-gray-500/20 border-gray-200 dark:border-gray-500/30';
    }
};

export const TicketHistoryTimeline: React.FC<TicketHistoryTimelineProps> = ({ logs, users }) => {
    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                    <FileEdit className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No history recorded yet</p>
                <p className="text-xs text-gray-400 mt-1">Changes to status, priority, and assignee will appear here.</p>
            </div>
        );
    }

    return (
        <div className="relative pl-4 space-y-6 before:content-[''] before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200 dark:before:bg-slate-700">
            {logs.map((log, index) => {
                const actor = users.find(u => u.id === log.actorId) || { name: 'Unknown User', avatar: '' };

                // Construct readable message
                let message = '';
                if (log.actionType === 'STATUS_CHANGE') message = `changed status from ${log.oldValue} to ${log.newValue}`;
                else if (log.actionType === 'PRIORITY_CHANGE') message = `changed priority from ${log.oldValue} to ${log.newValue}`;
                else if (log.actionType === 'ASSIGNMENT') message = `assigned ticket to ${users.find(u => u.id === log.newValue)?.name || 'Unassigned'}`;
                else message = `updated ${log.fieldChanged}`;

                const timeDiff = Math.floor((new Date().getTime() - new Date(log.createdAt).getTime()) / 60000); // minutes
                let timeString = '';
                if (timeDiff < 1) timeString = 'Just now';
                else if (timeDiff < 60) timeString = `${timeDiff}m ago`;
                else if (timeDiff < 1440) timeString = `${Math.floor(timeDiff / 60)}h ago`;
                else timeString = `${Math.floor(timeDiff / 1440)}d ago`;

                return (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={log.id}
                        className="relative flex items-start group"
                    >
                        {/* Timeline Dot */}
                        <div className={`absolute left-[-21px] mt-1.5 w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 border-white dark:border-slate-800 ${getActionColor(log.actionType)}`}>
                            {getActionIcon(log.actionType)}
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex-1 ml-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center">
                                    <img src={actor.avatar || "https://ui-avatars.com/api/?name=?"} alt="" className="w-5 h-5 rounded-full mr-2" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{actor.name}</span>
                                </div>
                                <span className="text-xs text-gray-400 font-medium">{timeString}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 pl-7">
                                {message}
                            </p>
                            <div className="pl-7 mt-1 text-xs text-gray-400">
                                {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};
