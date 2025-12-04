import React from 'react';
import { Ticket, SlaConfig, TicketStatus } from '../types';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface SlaTimerProps {
    ticket: Ticket;
    slas: SlaConfig[];
}

export const SlaTimer: React.FC<SlaTimerProps> = ({ ticket, slas }) => {
    // Don't show timer for closed/resolved tickets
    if (
        ticket.status === TicketStatus.RESOLVED ||
        ticket.status === TicketStatus.CLOSED ||
        ticket.status === TicketStatus.PARTIALLY_CLOSED
    ) {
        return null;
    }

    const slaConfig = slas.find(s => s.priority === ticket.priority);

    if (!slaConfig) {
        return null;
    }

    const createdTime = new Date(ticket.createdAt).getTime();
    const resolutionTimeMs = slaConfig.resolution_hours * 60 * 60 * 1000;
    const targetTime = createdTime + resolutionTimeMs;
    const now = Date.now();
    const timeRemaining = targetTime - now;

    const isOverdue = timeRemaining < 0;
    const isWarning = !isOverdue && timeRemaining < 2 * 60 * 60 * 1000; // Less than 2 hours left

    // Format time string
    const formatDuration = (ms: number) => {
        const absMs = Math.abs(ms);
        const hours = Math.floor(absMs / (1000 * 60 * 60));
        const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        return `${hours}h ${minutes}m`;
    };

    const timeString = formatDuration(timeRemaining);

    let badgeClass = '';
    let icon = <Clock className="w-3 h-3 mr-1" />;
    let text = '';

    if (isOverdue) {
        badgeClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        text = `Overdue by ${timeString}`;
    } else if (isWarning) {
        badgeClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
        text = `${timeString} left`;
    } else {
        badgeClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
        text = `${timeString} left`;
    }

    return (
        <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${badgeClass}`} title={`Target: ${new Date(targetTime).toLocaleString()}`}>
            {icon}
            {text}
        </div>
    );
};
