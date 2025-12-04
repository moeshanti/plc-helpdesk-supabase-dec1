import React, { useState, useEffect } from 'react';
import { Ticket, SlaConfig, TicketStatus } from '../types';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SlaTimerProps {
    ticket: Ticket;
    config?: SlaConfig;
}

export const SlaTimer: React.FC<SlaTimerProps> = ({ ticket, config }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        if (!config) return;

        const calculateTimeLeft = () => {
            const created = new Date(ticket.createdAt).getTime();
            const deadline = created + (config.resolution_hours * 60 * 60 * 1000);
            const now = Date.now();

            // If ticket is resolved/closed, check if it met SLA based on updatedAt
            if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
                const resolvedAt = new Date(ticket.updatedAt).getTime();
                return resolvedAt - deadline; // Negative means met SLA, Positive means missed
            }

            // If active, calculate time remaining
            return deadline - now;
        };

        const updateTimer = () => {
            const diff = calculateTimeLeft();
            setTimeLeft(diff);

            // Only consider overdue if it's active and time is negative
            if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
                setIsOverdue(diff < 0);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [ticket, config]);

    if (!config) return null;

    const formatDuration = (ms: number) => {
        const absMs = Math.abs(ms);
        const hours = Math.floor(absMs / (1000 * 60 * 60));
        const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    // Resolved/Closed State
    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
        const missed = timeLeft !== null && timeLeft > 0;
        return (
            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full border ${missed ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'}`}>
                {missed ? <XCircle className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                {missed ? `Missed by ${formatDuration(timeLeft || 0)}` : 'Met SLA'}
            </div>
        );
    }

    // Active State
    return (
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full border transition-all ${isOverdue ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 animate-pulse' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300'}`}>
            {isOverdue ? <AlertTriangle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
            {isOverdue ? `Overdue: ${formatDuration(timeLeft || 0)}` : `${formatDuration(timeLeft || 0)} left`}
        </div>
    );
};
