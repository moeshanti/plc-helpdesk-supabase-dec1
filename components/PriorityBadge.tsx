
import React from 'react';
import { TicketPriority } from '../types';

interface PriorityBadgeProps {
    priority: TicketPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
    const colors = {
        [TicketPriority.LOW]: 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
        [TicketPriority.MEDIUM]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
        [TicketPriority.HIGH]: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
        [TicketPriority.CRITICAL]: 'text-red-700 bg-red-50 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900',
    };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[priority]}`}>{priority}</span>;
};
