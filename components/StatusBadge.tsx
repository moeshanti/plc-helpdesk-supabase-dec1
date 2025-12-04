
import React from 'react';
import { TicketStatus, StatusConfig } from '../types';

interface StatusBadgeProps {
    status: TicketStatus;
    config?: StatusConfig[];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, config }) => {
    // Try to find dynamic config first
    const statusConfig = config?.find(c => c.label === status);

    if (statusConfig) {
        return (
            <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap"
                style={{
                    backgroundColor: `${statusConfig.colorHex}20`, // 20% opacity for bg
                    color: statusConfig.colorHex,
                    borderColor: `${statusConfig.colorHex}40` // 40% opacity for border
                }}
            >
                {status}
            </span>
        );
    }

    // Fallback for legacy/hardcoded statuses
    const styles: Record<string, string> = {
        [TicketStatus.OPEN]: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        [TicketStatus.TO_BE_INVESTIGATED]: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        [TicketStatus.OPEN_BUG]: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
        [TicketStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
        [TicketStatus.PENDING_USER]: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
        [TicketStatus.USER_ACCEPTANCE]: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
        [TicketStatus.RESOLVED]: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        [TicketStatus.PARTIALLY_CLOSED]: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
        [TicketStatus.CLOSED]: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        [TicketStatus.REOPENED]: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
    };
    const styleClass = styles[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${styleClass}`}>
            {status}
        </span>
    );
};
