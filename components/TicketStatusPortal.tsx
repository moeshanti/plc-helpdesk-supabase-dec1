import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { StorageService } from '../services/storageService';
import {
    Inbox,
    Search,
    Hammer,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Copy,
    Share2,
    Clock,
    Calendar,
    AlertTriangle,
    Check,
    Box,
    Sparkles,
    Activity
} from 'lucide-react';
import { SlaConfig } from '../types';

interface TicketStatusPortalProps {
    ticketNumber: string;
}

const STEPS = [
    { label: 'Received', icon: Inbox, statuses: [TicketStatus.OPEN] },
    { label: 'In Review', icon: Search, statuses: [TicketStatus.TO_BE_INVESTIGATED, TicketStatus.PENDING_USER] },
    { label: 'Working', icon: Hammer, statuses: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN_BUG] },
    { label: 'Resolved', icon: CheckCircle2, statuses: [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.PARTIALLY_CLOSED, TicketStatus.USER_ACCEPTANCE] }
];

export const TicketStatusPortal: React.FC<TicketStatusPortalProps> = ({ ticketNumber }) => {
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [slas, setSlas] = useState<SlaConfig[]>([]);
    const [appName, setAppName] = useState('PLC HelpDesk');
    const [appInitial, setAppInitial] = useState('P');

    const getStatusStyles = (status: TicketStatus) => {
        switch (status) {
            case TicketStatus.OPEN:
            case TicketStatus.OPEN_BUG:
                return 'bg-blue-50 text-blue-600 border-blue-100';
            case TicketStatus.IN_PROGRESS:
            case TicketStatus.TO_BE_INVESTIGATED:
                return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case TicketStatus.RESOLVED:
            case TicketStatus.USER_ACCEPTANCE:
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case TicketStatus.CLOSED:
                return 'bg-slate-50 text-slate-600 border-slate-100';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getPriorityStyles = (priority: TicketPriority) => {
        switch (priority) {
            case TicketPriority.CRITICAL:
                return 'bg-red-50 text-red-600 border-red-100';
            case TicketPriority.HIGH:
                return 'bg-orange-50 text-orange-600 border-orange-100';
            case TicketPriority.MEDIUM:
                return 'bg-blue-50 text-blue-600 border-blue-100';
            case TicketPriority.LOW:
                return 'bg-slate-50 text-slate-600 border-slate-100';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getStepIndex = (status: TicketStatus) => {
        const index = STEPS.findIndex(step => step.statuses.includes(status));
        if (index !== -1) return index;
        if (status === TicketStatus.REOPENED) return 1;
        return 0;
    };

    useEffect(() => {
        const loadTicket = async () => {
            try {
                setLoading(true);
                const data = await StorageService.fetchPublicTicket(ticketNumber);
                if (data) {
                    setTicket(data);

                    // Fetch Master Data (SLA & Branding)
                    const { slas: slaData, masterSettings } = await StorageService.fetchMasterData();
                    setSlas(slaData);

                    if (masterSettings?.app_name) {
                        setAppName(masterSettings.app_name);
                        setAppInitial(masterSettings.app_name.charAt(0).toUpperCase());
                    }

                    const idx = getStepIndex(data.status);
                    setCurrentStepIndex(idx);

                    if (idx === 3) {
                        setTimeout(() => {
                            confetti({
                                particleCount: 150,
                                spread: 70,
                                origin: { y: 0.6 },
                                colors: ['#60A5FA', '#3B82F6', '#2563EB', '#A78BFA']
                            });
                        }, 500);
                    }
                } else {
                    setError('Ticket not found.');
                }
            } catch (err) {
                setError('Failed to load status.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadTicket();
    }, [ticketNumber]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        const btn = document.getElementById('copy-btn');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<span class="text-green-400">Copied!</span>';
            setTimeout(() => btn.innerHTML = original, 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
                    <Loader2 className="h-16 w-16 text-blue-600 animate-spin relative z-10" />
                </div>
                <h2 className="text-xl font-medium text-slate-600 mt-6 tracking-wide">Tracking Ticket...</h2>
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100">
                    <div className="bg-red-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Ticket Not Found</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">{error || 'We could not find a ticket with that number.'}</p>
                    <button
                        onClick={() => window.location.href = window.location.origin}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 transition-all hover:scale-105"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    // Progress Calculation
    const progressPercents = [15, 40, 65, 100];
    const targetProgress = progressPercents[currentStepIndex];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
            {/* Ambient Background globs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10">
                {/* Main Card */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-white/60 backdrop-blur-sm"
                >
                    {/* Header */}
                    <div className="bg-[#0F172A] px-6 py-6 sm:px-10 sm:py-8 flex justify-between items-center relative overflow-hidden">
                        {/* Header Background Pattern */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>

                        {/* Logo Area */}
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                                <span className="font-bold text-white text-xl">{appInitial}</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-white text-lg tracking-wide">{appName}</h1>
                                <p className="text-slate-400 text-xs font-medium">Public Tracker</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <button
                            id="copy-btn"
                            onClick={handleCopyLink}
                            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white p-2.5 rounded-xl transition-all border border-slate-700/50 backdrop-blur-md"
                            title="Copy Link"
                        >
                            <Copy className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="p-8 sm:p-12">

                        {/* Ticket Title & Pills */}
                        <div className="text-center mb-16">
                            {/* Pills Row */}
                            <div className="flex flex-wrap justify-center gap-3 mb-6">
                                {/* Ticket ID Pill */}
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold font-mono tracking-wider border border-slate-200"
                                >
                                    {ticket.number}
                                </motion.div>

                                {/* Status Badge */}
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.05 }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border flex items-center ${getStatusStyles(ticket.status)}`}
                                >
                                    <Activity className="w-3 h-3 mr-1.5" />
                                    {ticket.status}
                                </motion.div>

                                {/* Priority Badge */}
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.08 }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border flex items-center ${getPriorityStyles(ticket.priority)}`}
                                >
                                    <AlertCircle className="w-3 h-3 mr-1.5" />
                                    {ticket.priority}
                                </motion.div>

                                {/* Module Pill */}
                                {ticket.module && (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold tracking-wide border border-indigo-100 flex items-center"
                                    >
                                        <Box className="w-3 h-3 mr-1.5" />
                                        {ticket.module}
                                    </motion.div>
                                )}

                                {/* Date Pills */}
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold tracking-wide border border-emerald-100 flex items-center"
                                    title="Created Date"
                                >
                                    <Calendar className="w-3 h-3 mr-1.5" />
                                    {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </motion.div>

                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold tracking-wide border border-blue-100 flex items-center"
                                    title="Last Updated"
                                >
                                    <Clock className="w-3 h-3 mr-1.5" />
                                    {new Date(ticket.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </motion.div>

                                {/* SLA Pill */}
                                {(() => {
                                    const config = slas.find(s => s.priority === ticket.priority);
                                    if (!config) return null;
                                    const elapsed = Date.now() - new Date(ticket.createdAt).getTime();
                                    const limit = config.resolution_hours * 3600000;
                                    const isOverdue = elapsed > limit;

                                    return (
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border flex items-center ${isOverdue
                                                ? 'bg-red-50 text-red-600 border-red-100'
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}
                                            title={isOverdue ? `Overdue by ${Math.round((elapsed - limit) / 3600000)}h` : `Target: ${config.resolution_hours}h`}
                                        >
                                            {isOverdue ? <AlertTriangle className="w-3 h-3 mr-1.5" /> : <Check className="w-3 h-3 mr-1.5" />}
                                            {isOverdue ? 'Overdue' : 'Within SLA'}
                                        </motion.div>
                                    );
                                })()}
                            </div>

                            <motion.h1
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl sm:text-5xl font-black text-slate-800 mb-4 leading-tight tracking-tight"
                            >
                                {ticket.title}
                            </motion.h1>
                        </div>

                        {/* PROGRESS TRACKER */}
                        <div className="px-2 sm:px-8">
                            <div className="relative h-32">
                                {/* 
                                    Line Alignment Fix:
                                    Circles are h-16 (64px) on sm, h-12 (48px) on mobile.
                                    Center is 32px (sm) and 24px (mobile).
                                    We set Layout: absolute top-6 (mobile) and top-8 (sm).
                                */}

                                {/* Background Line */}
                                <div className="absolute left-0 w-full h-1.5 bg-slate-100 rounded-full top-6 sm:top-8 -translate-y-1/2 z-0"></div>

                                {/* Active Progress Line (Gradient) */}
                                <motion.div
                                    className="absolute left-0 h-1.5 rounded-full top-6 sm:top-8 -translate-y-1/2 z-0 bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${targetProgress}%` }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                ></motion.div>

                                {/* Steps Icons */}
                                <div className="relative z-10 flex justify-between w-full">
                                    {STEPS.map((step, idx) => {
                                        const isActive = idx === currentStepIndex;
                                        const isCompleted = idx < currentStepIndex;
                                        const isPending = idx > currentStepIndex;

                                        return (
                                            <div key={idx} className="flex flex-col items-center group cursor-default">
                                                {/* Icon Circle */}
                                                <motion.div
                                                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border-[3px] transition-all duration-500 relative z-10
                                                        ${isActive ? 'bg-white border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)] scale-110' : ''}
                                                        ${isCompleted ? 'bg-blue-500 border-blue-500 text-white' : ''}
                                                        ${isPending ? 'bg-white border-slate-100 text-slate-300' : ''}
                                                    `}
                                                    initial={false}
                                                    animate={isActive ? {
                                                        boxShadow: ["0px 0px 0px rgba(59,130,246,0)", "0px 0px 20px rgba(59,130,246,0.6)", "0px 0px 0px rgba(59,130,246,0)"]
                                                    } : {}}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                >
                                                    <step.icon
                                                        strokeWidth={isActive ? 3 : 2.5}
                                                        className={`w-5 h-5 sm:w-7 sm:h-7 transition-colors duration-300
                                                            ${isActive ? 'text-blue-600 animate-pulse' : ''}
                                                            ${isCompleted ? 'text-white' : ''}
                                                            ${isPending ? 'text-slate-300' : ''}
                                                        `}
                                                    />

                                                    {/* Ripple Effect for Active */}
                                                    {isActive && (
                                                        <>
                                                            <span className="absolute inline-flex h-full w-full rounded-2xl bg-blue-400 opacity-20 animate-ping"></span>
                                                        </>
                                                    )}
                                                </motion.div>

                                                {/* Label */}
                                                <div className={`mt-4 sm:mt-6 text-center transition-all duration-300
                                                    ${isActive ? 'transform -translate-y-1' : ''}
                                                `}>
                                                    <span className={`text-[10px] sm:text-xs font-bold tracking-widest uppercase block mb-1
                                                        ${isActive ? 'text-blue-600' : 'text-slate-400'}
                                                    `}>
                                                        Step {idx + 1}
                                                    </span>
                                                    <span className={`text-xs sm:text-sm font-bold tracking-tight
                                                        ${isActive ? 'text-slate-800' : 'text-slate-400'}
                                                    `}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Message Footer */}
                    <div className="bg-slate-50/50 p-6 text-center border-t border-slate-100">
                        <p className="text-slate-500 text-sm">
                            {currentStepIndex === 3
                                ? "This ticket has been resolved. If you have further issues, please contact support."
                                : "We are processing your request. You can check back here for updates."}
                        </p>
                    </div>

                </motion.div>

                <div className="mt-8 text-center">
                    <p className="text-slate-400 text-sm font-medium">
                        Powered by <span className="text-slate-500 font-bold">AJ Squared 1C ERP HelpDesk</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
