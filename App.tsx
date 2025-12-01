import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    LayoutDashboard,
    Ticket as TicketIcon,
    Plus,
    Settings,
    LogOut,
    UserCircle,
    Search,
    CheckCircle2,
    AlertCircle,
    Clock,
    ArrowRight,
    Paperclip,
    Bot,
    Link as LinkIcon,
    Video,
    X,
    Sparkles,
    History,
    TrendingUp,
    Activity,
    Sun,
    Moon,
    RefreshCw,
    Database,
    ShieldCheck,
    Lock,
    FileText,
    ThumbsUp,
    ThumbsDown,
    Zap,
    Users,
    Check,
    Bug,
    Search as SearchIcon,
    AlertTriangle,
    HelpCircle,
    GitPullRequest,
    Loader2,
    Copy,
    ArrowDownToLine,
    ListOrdered,
    Image as ImageIcon,
    Trash2,
    UploadCloud,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    Wand2,
    Lightbulb,
    Star,
    TestTube,
    FileSpreadsheet,
    Maximize2,
    Menu,
    Filter
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    Sector,
    Label
} from 'recharts';
import { User, UserRole, Ticket, TicketStatus, TicketPriority, RelationType, Attachment, Comment, TicketRelation } from './types';
import { analyzeTicketAttachment, ImagePart } from './services/geminiService';
import { StorageService } from './services/storageService';
import { supabase } from './services/supabaseClient';

// --- MOCK DATA FOR CHARTS ---
const MOCK_TREND_DATA = [
    { name: 'Mon', created: 4, resolved: 2 },
    { name: 'Tue', created: 3, resolved: 1 },
    { name: 'Wed', created: 7, resolved: 5 },
    { name: 'Thu', created: 2, resolved: 4 },
    { name: 'Fri', created: 5, resolved: 6 },
    { name: 'Sat', created: 1, resolved: 0 },
    { name: 'Sun', created: 2, resolved: 1 },
];

// --- HELPER COMPONENTS ---

const getStatusColor = (status: TicketStatus, isDark: boolean) => {
    switch (status) {
        case TicketStatus.OPEN: return '#3b82f6'; // Blue
        case TicketStatus.TO_BE_INVESTIGATED: return '#8b5cf6'; // Purple
        case TicketStatus.OPEN_BUG: return '#ef4444'; // Red
        case TicketStatus.IN_PROGRESS: return '#eab308'; // Yellow
        case TicketStatus.PENDING_USER: return '#f97316'; // Orange
        case TicketStatus.USER_ACCEPTANCE: return '#06b6d4'; // Cyan
        case TicketStatus.RESOLVED: return '#22c55e'; // Green
        case TicketStatus.PARTIALLY_CLOSED: return '#64748b'; // Slate
        case TicketStatus.CLOSED: return isDark ? '#4b5563' : '#374151'; // Gray
        case TicketStatus.REOPENED: return '#ec4899'; // Pink
        default: return '#9ca3af';
    }
};

const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
        case TicketStatus.OPEN: return TicketIcon;
        case TicketStatus.TO_BE_INVESTIGATED: return SearchIcon;
        case TicketStatus.OPEN_BUG: return Bug;
        case TicketStatus.IN_PROGRESS: return RefreshCw;
        case TicketStatus.PENDING_USER: return HelpCircle;
        case TicketStatus.USER_ACCEPTANCE: return CheckCircle2;
        case TicketStatus.RESOLVED: return Check;
        case TicketStatus.PARTIALLY_CLOSED: return AlertCircle;
        case TicketStatus.CLOSED: return Lock;
        case TicketStatus.REOPENED: return AlertTriangle;
        default: return TicketIcon;
    }
};

const StatusBadge = ({ status }: { status: TicketStatus }) => {
    const styles = {
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

const PriorityBadge = ({ priority }: { priority: TicketPriority }) => {
    const colors = {
        [TicketPriority.LOW]: 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
        [TicketPriority.MEDIUM]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
        [TicketPriority.HIGH]: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
        [TicketPriority.CRITICAL]: 'text-red-700 bg-red-50 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900',
    };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[priority]}`}>{priority}</span>;
};

const AIAnalysisBlock = ({ analysis, onFeedback, feedback }: { analysis: string, onFeedback: (type: 'positive' | 'negative') => void, feedback?: 'positive' | 'negative' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxLength = 280;
    const shouldTruncate = analysis.length > maxLength;

    const displayText = isExpanded || !shouldTruncate
        ? analysis
        : analysis.slice(0, maxLength).trim() + '...';

    return (
        <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 border border-indigo-100 dark:border-slate-600 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="flex items-start space-x-3">
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg shadow-sm flex-shrink-0">
                    <Bot className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase">Gemini AI Insight</span>
                        <div className="flex space-x-1">
                            <button onClick={() => onFeedback('positive')} className={`p-1 rounded hover:bg-white dark:hover:bg-slate-600 ${feedback === 'positive' ? 'text-green-600' : 'text-gray-400'}`}><ThumbsUp className="h-3 w-3" /></button>
                            <button onClick={() => onFeedback('negative')} className={`p-1 rounded hover:bg-white dark:hover:bg-slate-600 ${feedback === 'negative' ? 'text-red-600' : 'text-gray-400'}`}><ThumbsDown className="h-3 w-3" /></button>
                        </div>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-gray-700 dark:text-gray-300">
                        <div dangerouslySetInnerHTML={{ __html: displayText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                    </div>
                    {shouldTruncate && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center transition-colors"
                        >
                            {isExpanded ? (
                                <>Show Less <ChevronUp className="h-3 w-3 ml-1" /></>
                            ) : (
                                <>Read Full Analysis <ChevronDown className="h-3 w-3 ml-1" /></>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- CHART COMPONENTS ---

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            {/* Main Slice - Expanded slightly for flat highlight effect */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6} // Just slightly larger, no detached offset
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                className="drop-shadow-sm" // Minimal shadow for depth without 3D extrusion
            />
        </g>
    );
};

const DashboardCharts = ({ stats, isDark }: { stats: any, isDark: boolean }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const onPieLeave = () => {
        setActiveIndex(null);
    };

    const activeItem = activeIndex !== null ? stats.statusDistribution[activeIndex] : null;

    const CustomLabel = ({ viewBox }: any) => {
        const { cx, cy } = viewBox;
        if (!isFinite(cx) || !isFinite(cy)) return null;

        const primaryText = activeItem ? activeItem.value : stats.total;
        const secondaryText = activeItem ? activeItem.name : 'Total Tickets';

        return (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                <tspan x={cx} y={cy - 5} dy="-0.5em" fontSize="28" fontWeight="bold" fill={isDark ? "#ffffff" : "#111827"}>
                    {primaryText}
                </tspan>
                <tspan x={cx} y={cy + 10} dy="1.0em" fontSize="10" fontWeight="bold" fill={isDark ? "#94a3b8" : "#6b7280"} letterSpacing="0.05em" style={{ textTransform: 'uppercase' }}>
                    {secondaryText}
                </tspan>
            </text>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Module Distribution Chart - Bar Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Active Issues by Module</h3>
                <div className="h-64 flex-1">
                    <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                        <BarChart data={stats.moduleDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fill: isDark ? '#9ca3af' : '#64748b', fontSize: 11, fontWeight: 600 }}
                                width={80}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                itemStyle={{ color: '#6366f1' }}
                                cursor={{ fill: isDark ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Overall Distribution - Interactive Donut */}
            <div className="col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Overall Distribution</h3>
                <div className="h-64 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                        <PieChart>
                            <Pie
                                activeIndex={activeIndex !== null ? activeIndex : undefined}
                                activeShape={renderActiveShape}
                                data={stats.statusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                                cornerRadius={6}
                                onMouseEnter={onPieEnter}
                                onMouseLeave={onPieLeave}
                            >
                                {stats.statusDistribution.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                                <Label content={<CustomLabel />} position="center" />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: isDark ? '#fff' : '#000' }} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

export default function App() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [currentView, setCurrentView] = useState<'dashboard' | 'list' | 'create' | 'detail' | 'settings'>('dashboard');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [showUserSwitcher, setShowUserSwitcher] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- INITIALIZATION ---
    useEffect(() => {
        console.log("App mounted, starting data load...");

        // Real-time subscription
        const channel = supabase
            .channel('tickets-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
                const newTicket = StorageService.mapDbTicketToLocal(payload.new);
                setTickets(prev => {
                    if (prev.some(t => t.id === newTicket.id)) return prev;
                    return [newTicket, ...prev];
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, (payload) => {
                const updatedTicket = StorageService.mapDbTicketToLocal(payload.new);
                setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
            })
            .subscribe();

        const loadData = async () => {
            try {
                console.log("Fetching tickets and users...");
                const [loadedTickets, loadedUsers] = await Promise.all([
                    StorageService.fetchTickets(),
                    StorageService.fetchUsers()
                ]);
                console.log("Data fetched:", { tickets: loadedTickets?.length, users: loadedUsers?.length });

                setTickets(loadedTickets || []);
                setUsers(loadedUsers || []);

                if (!currentUser && loadedUsers && loadedUsers.length > 0) {
                    console.log("Setting initial user:", loadedUsers[0].name);
                    setCurrentUser(loadedUsers[0]);
                }
            } catch (err) {
                console.error("CRITICAL ERROR LOADING DATA:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();

        // Default to Light unless explicitly dark
        if (localStorage.getItem('theme') === 'dark') {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);



    // Handle Resize for Mobile Menu
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
        if (!isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleSync = async () => {
        // Sync logic removed for Supabase migration
        console.log("Sync not supported in Supabase version yet");
    };

    const handleLogout = () => {
        setShowUserSwitcher(true);
    };

    const handleSwitchUser = (user: User) => {
        setCurrentUser(user);
        setShowUserSwitcher(false);
        setCurrentView('dashboard');
        setIsMobileMenuOpen(false);
    };

    const handleCreateTicket = async (ticket: Partial<Ticket>) => {
        if (!currentUser) return;

        const existingNumbers = tickets.map(t => {
            const match = t.number.match(/TIC-(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });
        const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
        const nextNumber = Math.max(1000, maxNumber) + 1;

        const newTicketData: Ticket = {
            id: `t${Date.now()}`, // Temp ID, will be replaced by DB
            number: `TIC-${nextNumber}`,
            title: ticket.title!,
            description: ticket.description!,
            module: ticket.module!,
            status: ticket.status || TicketStatus.OPEN,
            priority: ticket.priority || TicketPriority.MEDIUM,
            reporterId: currentUser.id,
            assigneeId: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            stepsToReproduce: ticket.stepsToReproduce || '',
            attachments: ticket.attachments || [],
            comments: [],
            relations: [],
            aiAnalysisFeedback: ticket.aiAnalysisFeedback,
            satisfactionRating: undefined
        };

        // Optimistic update
        setTickets(prev => [newTicketData, ...prev]);
        setCurrentView('list');

        // Save to DB
        const createdTicket = await StorageService.createTicket(newTicketData);
        if (createdTicket) {
            // Update with real ID from DB
            setTickets(prev => prev.map(t => t.id === newTicketData.id ? createdTicket : t));
        }
    };

    const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
        const ticketToUpdate = tickets.find(t => t.id === id);
        if (!ticketToUpdate) return;

        let updatedComments = ticketToUpdate.comments;
        const payload: Partial<Ticket> = { ...updates };

        if (updates.status && updates.status !== ticketToUpdate.status && currentUser) {
            const systemComment: Comment = {
                id: `sys${Date.now()}`,
                userId: currentUser.id,
                text: `changed status from ${ticketToUpdate.status} to ${updates.status}`,
                timestamp: new Date(),
                isSystem: true
            };
            updatedComments = [...updatedComments, systemComment];
            payload.comments = updatedComments;
        }

        // Optimistic update
        setTickets(prev => prev.map(t => {
            if (t.id !== id) return t;
            return { ...t, ...updates, comments: updatedComments, updatedAt: new Date() };
        }));

        await StorageService.updateTicket(id, payload);
    };

    const handleAddComment = async (ticketId: string, text: string, attachments: Attachment[] = [], isResolution = false, customId?: string, isAnalyzing = false, uatSteps?: string) => {
        if (!currentUser) return;
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const newComment: Comment = {
            id: customId || `c${Date.now()}`,
            userId: currentUser.id,
            text,
            timestamp: new Date(),
            isResolution,
            attachments,
            isAnalyzing,
            uatSteps
        };

        const updatedComments = [...ticket.comments, newComment];

        // Optimistic Update
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, comments: updatedComments } : t));

        // Persist to DB
        await StorageService.updateTicket(ticketId, { comments: updatedComments });
    };

    const handleCommentFeedback = async (ticketId: string, commentId: string, feedback: 'positive' | 'negative') => {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const updatedComments = ticket.comments.map(c => c.id === commentId ? { ...c, aiAnalysisFeedback: feedback } : c);

        setTickets(prev => prev.map(t => {
            if (t.id !== ticketId) return t;
            return {
                ...t,
                comments: updatedComments
            };
        }));

        await StorageService.updateTicket(ticketId, { comments: updatedComments });
    };

    const handleRateTicket = async (ticketId: string, rating: number) => {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, satisfactionRating: rating } : t));
        await StorageService.updateTicket(ticketId, { satisfactionRating: rating });
    };

    // --- COMPUTED DASHBOARD ---
    const dashboardStats = useMemo(() => {
        const total = tickets.length;
        const closed = tickets.filter(t => t.status === TicketStatus.CLOSED || t.status === TicketStatus.RESOLVED || t.status === TicketStatus.PARTIALLY_CLOSED).length;
        const reopened = tickets.filter(t => t.status === TicketStatus.REOPENED).length;

        const statusCounts = tickets.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statusDistribution = Object.values(TicketStatus)
            .map(status => ({
                name: status,
                value: statusCounts[status] || 0,
                color: getStatusColor(status, isDark)
            }))
            .filter(item => item.value > 0);

        const moduleCounts = tickets.reduce((acc, t) => {
            acc[t.module] = (acc[t.module] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const moduleDistribution = Object.entries(moduleCounts).map(([name, value]) => ({ name, value }));

        // Satisfaction Stats
        const ratedTickets = tickets.filter(t => t.satisfactionRating !== undefined);
        const avgRating = ratedTickets.length > 0
            ? ratedTickets.reduce((acc, t) => acc + (t.satisfactionRating || 0), 0) / ratedTickets.length
            : 0;

        const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
            stars: r,
            count: ratedTickets.filter(t => t.satisfactionRating === r).length
        }));

        return {
            total,
            closed,
            closedPct: total ? Math.round((closed / total) * 100) : 0,
            reopenedPct: total ? Math.round((reopened / total) * 100) : 0,
            statusDistribution,
            moduleDistribution,
            statusCounts,
            avgRating,
            ratingCounts
        };
    }, [tickets, isDark]);


    const UserSwitcherModal = () => {
        if (!showUserSwitcher) return null;
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                            <Users className="mr-2 text-brand-600" /> Switch Account
                        </h3>
                        <button onClick={() => setShowUserSwitcher(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleSwitchUser(user)}
                                className={`flex items-center p-4 rounded-xl border transition-all text-left group
                                ${currentUser?.id === user.id
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-500'
                                        : 'border-gray-200 dark:border-slate-600 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <div className="relative">
                                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-gray-200 dark:border-slate-500" />
                                    {currentUser?.id === user.id && (
                                        <div className="absolute -bottom-1 -right-1 bg-brand-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800">
                                            <Check className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>
                                <div className="ml-4">
                                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{user.role}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Development Mode: Authentication Disabled</p>
                    </div>
                </div>
            </div>
        );
    };

    const ImageLightbox = () => {
        if (!previewImage) return null;
        return (
            <div
                className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
                onClick={() => setPreviewImage(null)}
            >
                <div className="relative max-w-7xl w-full max-h-screen flex items-center justify-center">
                    <img
                        src={previewImage}
                        alt="Full preview"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
                    >
                        <X className="h-8 w-8" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md border border-white/10">
                        Click background or X to close
                    </div>
                </div>
            </div>
        );
    };

    const DashboardView = () => (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Quick Actions & KPIs */}
            <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 space-y-4">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Tickets', value: dashboardStats.total, icon: TicketIcon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                            { label: 'Closed Rate', value: `${dashboardStats.closedPct}%`, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                            { label: 'Reopen Rate', value: `${dashboardStats.reopenedPct}%`, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                            { label: 'Avg Resolution', value: '18 hrs', icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between hover:shadow-md transition-all">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{stat.label}</p>
                                    <p className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions Card */}
                <div className="xl:w-80 bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold mb-2 flex items-center"><Zap className="h-5 w-5 mr-2" /> Quick Actions</h3>
                        <p className="text-brand-100 text-sm mb-6">Need assistance with 1C ERP? Log a ticket instantly.</p>
                    </div>
                    <button
                        onClick={() => setCurrentView('create')}
                        className="w-full bg-white text-brand-700 py-3 rounded-xl font-bold shadow-md hover:bg-brand-50 transition-colors flex items-center justify-center"
                    >
                        <Plus className="h-5 w-5 mr-2" /> Log New Ticket
                    </button>
                </div>
            </div>

            <DashboardCharts stats={dashboardStats} isDark={isDark} />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[
                    {
                        status: TicketStatus.OPEN,
                        label: 'Open',
                        count: dashboardStats.statusCounts[TicketStatus.OPEN] || 0,
                        colorClasses: {
                            bg: 'bg-blue-50 dark:bg-blue-900/20',
                            text: 'text-blue-600 dark:text-blue-400',
                            border: 'bg-blue-500'
                        }
                    },
                    {
                        status: TicketStatus.TO_BE_INVESTIGATED,
                        label: 'Investigating',
                        count: dashboardStats.statusCounts[TicketStatus.TO_BE_INVESTIGATED] || 0,
                        colorClasses: {
                            bg: 'bg-purple-50 dark:bg-purple-900/20',
                            text: 'text-purple-600 dark:text-purple-400',
                            border: 'bg-purple-500'
                        }
                    },
                    {
                        status: TicketStatus.OPEN_BUG,
                        label: 'Confirmed Bug',
                        count: dashboardStats.statusCounts[TicketStatus.OPEN_BUG] || 0,
                        colorClasses: {
                            bg: 'bg-red-50 dark:bg-red-900/20',
                            text: 'text-red-600 dark:text-red-400',
                            border: 'bg-red-500'
                        }
                    },
                    {
                        status: TicketStatus.IN_PROGRESS,
                        label: 'In Progress',
                        count: dashboardStats.statusCounts[TicketStatus.IN_PROGRESS] || 0,
                        colorClasses: {
                            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                            text: 'text-yellow-600 dark:text-yellow-400',
                            border: 'bg-yellow-500'
                        }
                    },
                    {
                        status: TicketStatus.RESOLVED,
                        label: 'Resolved',
                        count: dashboardStats.statusCounts[TicketStatus.RESOLVED] || 0,
                        colorClasses: {
                            bg: 'bg-green-50 dark:bg-green-900/20',
                            text: 'text-green-600 dark:text-green-400',
                            border: 'bg-green-500'
                        }
                    }
                ].map((item, idx) => {
                    const Icon = getStatusIcon(item.status);
                    return (
                        <div key={idx} className="group relative bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all duration-300 overflow-hidden cursor-default">
                            {/* Hover Glow / Top Border */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${item.colorClasses.border} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>

                            <div className="flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">{item.count}</span>
                                    <div className={`p-2 rounded-lg ${item.colorClasses.bg} ${item.colorClasses.text}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.label}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                                <TrendingUp className="h-5 w-5 mr-2 text-brand-600 dark:text-brand-400" />
                                Ticket Volume
                            </h3>
                            <p className="text-sm text-gray-400">Tickets created vs resolved (7 days)</p>
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                            <AreaChart data={MOCK_TREND_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#9ca3af' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#9ca3af' }} />
                                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: isDark ? '#e2e8f0' : '#1f2937' }} />
                                <Area type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCreated)" />
                                <Area type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* User Satisfaction Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center">
                            <Star className="h-5 w-5 mr-2 text-yellow-500 fill-yellow-500" />
                            Satisfaction
                        </h3>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-baseline">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white mr-2">{dashboardStats.avgRating.toFixed(1)}</span>
                                <span className="text-sm text-gray-400">/ 5.0</span>
                            </div>
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(dashboardStats.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-slate-600'}`} />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {dashboardStats.ratingCounts.map(rc => (
                                <div key={rc.stars} className="flex items-center text-xs">
                                    <span className="w-8 font-medium text-gray-500 dark:text-gray-400 flex items-center justify-end mr-2">
                                        {rc.stars} <Star className="w-3 h-3 ml-0.5 text-gray-400" />
                                    </span>
                                    <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-400 rounded-full"
                                            style={{ width: `${(dashboardStats.total > 0 ? (rc.count / dashboardStats.total) * 100 : 0)}%` }}
                                        ></div>
                                    </div>
                                    <span className="w-6 text-right text-gray-400 ml-2">{rc.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Status (Existing) */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col flex-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Detailed Status</h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {Object.values(TicketStatus).map(status => {
                                const count = dashboardStats.statusCounts[status] || 0;
                                if (count === 0) return null;
                                const pct = Math.round((count / dashboardStats.total) * 100);
                                return (
                                    <div key={status} className="flex flex-col">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-300 font-medium flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getStatusColor(status, isDark) }}></div>
                                                {status}
                                            </span>
                                            <span className="text-gray-900 dark:text-white font-bold">{count}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: getStatusColor(status, isDark) }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const TicketListView = () => {
        const [searchQuery, setSearchQuery] = useState('');
        const [filters, setFilters] = useState({
            status: '' as TicketStatus | '',
            priority: '' as TicketPriority | '',
            assignee: '',
            module: ''
        });

        const visibleTickets = useMemo(() => {
            let filtered = currentUser?.role === UserRole.REPORTER
                ? tickets.filter(t => t.reporterId === currentUser.id)
                : tickets;

            // Search Query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(t =>
                    t.number.toLowerCase().includes(query) ||
                    t.title.toLowerCase().includes(query) ||
                    (t.description && t.description.toLowerCase().includes(query))
                );
            }

            // Apply Filters
            if (filters.status) filtered = filtered.filter(t => t.status === filters.status);
            if (filters.priority) filtered = filtered.filter(t => t.priority === filters.priority);
            if (filters.assignee) filtered = filtered.filter(t => t.assigneeId === filters.assignee);
            if (filters.module) filtered = filtered.filter(t => t.module === filters.module);

            return filtered;
        }, [tickets, currentUser, searchQuery, filters]);

        const handleExportToCSV = () => {
            // Define headers
            const headers = [
                'ID',
                'Subject',
                'Module',
                'Status',
                'Priority',
                'Assignee',
                'Reporter',
                'Created At',
                'Updated At',
                'Description',
                'Steps to Reproduce',
                'Resolution',
                'User Satisfaction',
                'Comment Count'
            ];

            // Map tickets to rows
            const rows = visibleTickets.map(ticket => {
                const assignee = users.find(u => u.id === ticket.assigneeId)?.name || 'Unassigned';
                const reporter = users.find(u => u.id === ticket.reporterId)?.name || 'Unknown';
                const resolution = ticket.comments.find(c => c.isResolution)?.text || '';

                // Helper to escape quotes and handle newlines for CSV format
                const safe = (str: string | undefined | number) => {
                    if (str === undefined || str === null) return '""';
                    const stringified = String(str);
                    return `"${stringified.replace(/"/g, '""')}"`;
                };

                return [
                    safe(ticket.number),
                    safe(ticket.title),
                    safe(ticket.module),
                    safe(ticket.status),
                    safe(ticket.priority),
                    safe(assignee),
                    safe(reporter),
                    safe(new Date(ticket.createdAt).toLocaleString()),
                    safe(new Date(ticket.updatedAt).toLocaleString()),
                    safe(ticket.description),
                    safe(ticket.stepsToReproduce),
                    safe(resolution),
                    safe(ticket.satisfactionRating || ''),
                    safe(ticket.comments.length)
                ].join(',');
            });

            // Combine with BOM for Excel UTF-8 compatibility
            const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `tickets_export_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in transition-colors">
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 dark:bg-slate-800/50 gap-4">
                    <div className="flex items-center w-full md:w-auto">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center mr-4 whitespace-nowrap">
                            <TicketIcon className="h-5 w-5 mr-2 text-brand-600 dark:text-brand-400" /> All Tickets
                        </h2>
                        <div className="relative flex-1 md:w-64">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none w-full shadow-sm bg-white dark:bg-slate-900 dark:text-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex space-x-3 w-full md:w-auto justify-end">
                        <button
                            onClick={handleExportToCSV}
                            className="flex bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium items-center transition-all shadow-sm hover:shadow-md"
                            title="Export visible tickets"
                        >
                            <FileSpreadsheet className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Export</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('create')}
                            className="flex bg-brand-600 hover:bg-brand-700 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium items-center transition-all shadow-sm hover:shadow-md"
                        >
                            <Plus className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">New Ticket</span>
                        </button>
                    </div>
                </div>

                {/* Filters Toolbar */}
                <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex flex-wrap gap-3 items-center">
                    <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">
                        <Filter className="h-4 w-4 mr-1.5" /> Filters:
                    </div>

                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TicketStatus | '' }))}
                        className="p-2 pl-3 pr-8 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                    >
                        <option value="">All Statuses</option>
                        {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select
                        value={filters.priority}
                        onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as TicketPriority | '' }))}
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
                        {['Finance', 'Sales', 'Inventory', 'Manufacturing', 'HR', 'System'].map(m => <option key={m} value={m}>{m}</option>)}
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
                        <button
                            onClick={() => setFilters({ status: '', priority: '', assignee: '', module: '' })}
                            className="ml-auto text-sm text-red-500 hover:text-red-700 font-medium flex items-center"
                        >
                            <X className="h-3 w-3 mr-1" /> Clear Filters
                        </button>
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
                                <th className="p-4 font-semibold border-b dark:border-slate-700">Assignee</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {visibleTickets.map(ticket => {
                                const assignee = users.find(u => u.id === ticket.assigneeId);
                                return (
                                    <tr key={ticket.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer" onClick={() => { setSelectedTicketId(ticket.id); setCurrentView('detail'); }}>
                                        <td className="p-4 text-sm font-mono font-medium text-gray-500 dark:text-gray-400">{ticket.number}</td>
                                        <td className="p-4">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{ticket.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{ticket.description}</p>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md text-xs">{ticket.module}</span>
                                        </td>
                                        <td className="p-4"><StatusBadge status={ticket.status} /></td>
                                        <td className="p-4"><PriorityBadge priority={ticket.priority} /></td>
                                        <td className="p-4">
                                            {assignee ? (
                                                <div className="flex items-center space-x-2">
                                                    <img src={assignee.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-600" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-300">{assignee.name}</span>
                                                </div>
                                            ) : <span className="text-xs text-gray-400 italic">Unassigned</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                            {visibleTickets.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
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

    const TicketDetailView = () => {
        const ticket = tickets.find(t => t.id === selectedTicketId);
        const [commentText, setCommentText] = useState('');
        const [commentFiles, setCommentFiles] = useState<File[]>([]);
        const [showResolveModal, setShowResolveModal] = useState(false);
        const [showReopenModal, setShowReopenModal] = useState(false);
        const [showRelationModal, setShowRelationModal] = useState(false);
        const [resolutionText, setResolutionText] = useState('');
        const [uatSteps, setUatSteps] = useState('');
        const [resolveFiles, setResolveFiles] = useState<File[]>([]);
        const [reopenReasonText, setReopenReasonText] = useState('');
        const [relationTargetId, setRelationTargetId] = useState('');
        const [relationType, setRelationType] = useState<RelationType>(RelationType.RELATED_TO);

        const commentsEndRef = useRef<HTMLDivElement>(null);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const isStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEVELOPER;
        const isResolvedOrClosed = ticket?.status === TicketStatus.RESOLVED || ticket?.status === TicketStatus.CLOSED;

        const scrollToBottom = () => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        };

        useEffect(() => {
            scrollToBottom();
        }, [ticket?.comments]);

        if (!ticket) return <div>Ticket not found</div>;

        const handlePostComment = async () => {
            if (!commentText.trim() && commentFiles.length === 0) return;

            const attachments: Attachment[] = await Promise.all(commentFiles.map(async (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            id: `ca${Date.now()}-${Math.random()}`,
                            name: file.name,
                            type: file.type.startsWith('image') ? 'image' : 'document',
                            url: reader.result as string,
                            base64: reader.result as string,
                            mimeType: file.type
                        });
                    };
                    reader.readAsDataURL(file);
                });
            }));

            const commentId = `c${Date.now()}`;
            const isAnalyzing = attachments.some(a => a.type === 'image');

            handleAddComment(ticket.id, commentText, attachments, false, commentId, isAnalyzing);
            setCommentText('');
            setCommentFiles([]);

            // Trigger AI Analysis in background
            if (isAnalyzing) {
                const imageAttachments = attachments.filter(a => a.type === 'image');
                if (imageAttachments.length > 0) {
                    const imageParts: ImagePart[] = imageAttachments.map(att => ({
                        inlineData: { data: (att.base64 as string).split(',')[1], mimeType: att.mimeType || 'image/png' }
                    }));

                    analyzeTicketAttachment(imageParts, commentText || "User uploaded screenshot in comment").then(analysis => {
                        setTickets(prev => prev.map(t => {
                            if (t.id !== ticket.id) return t;
                            return {
                                ...t,
                                comments: t.comments.map(c => c.id === commentId ? { ...c, isAnalyzing: false, aiAnalysis: analysis } : c)
                            };
                        }));
                    });
                }
            }
        };

        const handleResolve = async () => {
            if (!resolutionText.trim()) return;

            const attachments: Attachment[] = await Promise.all(resolveFiles.map(async (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            id: `ra${Date.now()}-${Math.random()}`,
                            name: file.name,
                            type: file.type.startsWith('image') ? 'image' : 'document',
                            url: reader.result as string,
                            base64: reader.result as string,
                            mimeType: file.type
                        });
                    };
                    reader.readAsDataURL(file);
                });
            }));

            const resolutionComment: Comment = {
                id: `c${Date.now()}`,
                userId: currentUser.id,
                text: resolutionText,
                timestamp: new Date(),
                isResolution: true,
                attachments,
                isAnalyzing: false,
                uatSteps
            };

            const systemComment: Comment = {
                id: `sys${Date.now() + 1}`,
                userId: currentUser.id,
                text: `changed status from ${ticket.status} to ${TicketStatus.RESOLVED}`,
                timestamp: new Date(),
                isSystem: true
            };

            const updatedComments = [...ticket.comments, resolutionComment, systemComment];

            // Optimistic Update
            setTickets(prev => prev.map(t => {
                if (t.id !== ticket.id) return t;
                return {
                    ...t,
                    status: TicketStatus.RESOLVED,
                    comments: updatedComments,
                    updatedAt: new Date()
                };
            }));

            // Persist
            await StorageService.updateTicket(ticket.id, {
                status: TicketStatus.RESOLVED,
                comments: updatedComments
            });

            setShowResolveModal(false);
            setResolutionText('');
            setUatSteps('');
            setResolveFiles([]);
        };

        const handleReopen = async () => {
            if (!reopenReasonText.trim()) return;

            const reopenComment: Comment = {
                id: `c${Date.now()}`,
                userId: currentUser.id,
                text: `Re-opened ticket. Reason: ${reopenReasonText}`,
                timestamp: new Date(),
                isResolution: false,
                attachments: [],
                isAnalyzing: false
            };

            const systemComment: Comment = {
                id: `sys${Date.now() + 1}`,
                userId: currentUser.id,
                text: `changed status from ${ticket.status} to ${TicketStatus.REOPENED}`,
                timestamp: new Date(),
                isSystem: true
            };

            const updatedComments = [...ticket.comments, reopenComment, systemComment];

            // Optimistic Update
            setTickets(prev => prev.map(t => {
                if (t.id !== ticket.id) return t;
                return {
                    ...t,
                    status: TicketStatus.REOPENED,
                    comments: updatedComments,
                    updatedAt: new Date()
                };
            }));

            // Persist
            await StorageService.updateTicket(ticket.id, {
                status: TicketStatus.REOPENED,
                comments: updatedComments
            });

            setShowReopenModal(false);
            setReopenReasonText('');
        };

        const handleAddRelation = () => {
            if (!relationTargetId) return;

            const newRelation: TicketRelation = {
                id: `r${Date.now()}`,
                targetTicketId: relationTargetId,
                type: relationType
            };

            const currentRelations = ticket.relations || [];
            handleUpdateTicket(ticket.id, { relations: [...currentRelations, newRelation] });
            setShowRelationModal(false);
            setRelationTargetId('');
            setRelationType(RelationType.RELATED_TO);
        };

        const resolutionComment = ticket.comments.find(c => c.isResolution);

        return (
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 animate-fade-in pb-12">
                {/* Left Column: Ticket Details & History */}
                <div className="flex-1 flex flex-col gap-6">

                    {/* Ticket Header Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex-shrink-0">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                                <span className="font-mono text-sm font-bold text-gray-400">{ticket.number}</span>
                                <StatusBadge status={ticket.status} />
                                <PriorityBadge priority={ticket.priority} />
                            </div>
                            <button onClick={() => setCurrentView('list')} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{ticket.title}</h1>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{ticket.description}</p>

                        {/* Ticket Attachments Grid */}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {ticket.attachments.map((att, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setPreviewImage(att.url)}
                                        className="group relative block overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 w-24 h-24 transition-transform hover:scale-105"
                                    >
                                        {att.type === 'image' ? (
                                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center">
                                                <FileText className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Maximize2 className="text-white opacity-0 group-hover:opacity-100 h-5 w-5" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Resolution Details Card */}
                    {isResolvedOrClosed && resolutionComment && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800 shadow-sm flex-shrink-0">
                            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center">
                                <CheckCircle2 className="h-5 w-5 mr-2" /> Official Resolution
                            </h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{resolutionComment.text}</p>
                            </div>

                            {resolutionComment.uatSteps && (
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-emerald-100 dark:border-slate-700 mb-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                                        <TestTube className="h-3 w-3 mr-1" /> Steps to Test (UAT)
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono text-xs">{resolutionComment.uatSteps}</p>
                                </div>
                            )}

                            {resolutionComment.attachments && resolutionComment.attachments.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Proofs & Screenshots</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {resolutionComment.attachments.map((att, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setPreviewImage(att.url)}
                                                className="block w-20 h-20 rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-800 hover:ring-2 ring-emerald-500 transition-all"
                                            >
                                                <img src={att.url} alt="proof" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Activity History */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center">
                            <Activity className="h-5 w-5 text-brand-600 mr-2" />
                            <h3 className="font-bold text-gray-900 dark:text-white">Activity History</h3>
                        </div>

                        <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-slate-900/50">
                            {ticket.comments.map((comment) => {
                                const user = users.find(u => u.id === comment.userId);
                                return (
                                    <div key={comment.id} className={`flex space-x-3 ${comment.isSystem ? 'justify-center' : ''}`}>
                                        {!comment.isSystem && (
                                            <img src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-600 flex-shrink-0" />
                                        )}

                                        {comment.isSystem ? (
                                            <div className="bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400 flex items-center border border-gray-200 dark:border-slate-700">
                                                <GitPullRequest className="h-3 w-3 mr-1.5" />
                                                <span className="font-semibold mr-1">{user?.name}</span> {comment.text}
                                                <span className="ml-2 text-[10px] opacity-70">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                        ) : (
                                            <div className={`flex-1 max-w-2xl ${comment.isResolution ? 'border-2 border-emerald-100 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700'} rounded-2xl rounded-tl-none p-4 shadow-sm`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{user?.name}</span>
                                                    <span className="text-xs text-gray-400">{new Date(comment.timestamp).toLocaleString()}</span>
                                                </div>

                                                {comment.isResolution && (
                                                    <div className="mb-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                                                        <Check className="h-3 w-3 mr-1" /> Solution
                                                    </div>
                                                )}

                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{comment.text}</p>

                                                {/* Attachments in Comment */}
                                                {comment.attachments && comment.attachments.length > 0 && (
                                                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {comment.attachments.map((att, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => setPreviewImage(att.url)}
                                                                className="block rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 h-20 relative group hover:ring-2 ring-brand-400 transition-all"
                                                            >
                                                                {att.type === 'image' ? (
                                                                    <img src={att.url} alt="att" className="w-full h-full object-cover" />
                                                                ) : <div className="w-full h-full flex items-center justify-center bg-gray-50"><FileText className="h-6 w-6 text-gray-400" /></div>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* AI Loading State */}
                                                {comment.isAnalyzing && (
                                                    <div className="mt-3 flex items-center space-x-2 text-xs font-medium text-indigo-500 animate-pulse">
                                                        <Sparkles className="h-3 w-3" />
                                                        <span>AI is analyzing this screenshot...</span>
                                                    </div>
                                                )}

                                                {/* AI Analysis Block */}
                                                {comment.aiAnalysis && (
                                                    <AIAnalysisBlock
                                                        analysis={comment.aiAnalysis}
                                                        feedback={comment.aiAnalysisFeedback}
                                                        onFeedback={(type) => handleCommentFeedback(ticket.id, comment.id, type)}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={commentsEndRef} />
                        </div>

                        {/* Comment Input */}
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl">
                            {/* Selected Files Preview */}
                            {commentFiles.length > 0 && (
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                                    {commentFiles.map((file, i) => (
                                        <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 group">
                                            {file.type.startsWith('image') ? (
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="prev" />
                                            ) : <div className="w-full h-full bg-gray-50 flex items-center justify-center"><FileText className="h-5 w-5 text-gray-400" /></div>}
                                            <button onClick={() => setCommentFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-end space-x-2 bg-gray-50 dark:bg-slate-900 p-2 rounded-2xl border border-gray-200 dark:border-slate-600 focus-within:border-brand-400 dark:focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all duration-200">
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={e => setCommentFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
                                    accept="image/*, .pdf"
                                />
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                    <Paperclip className="h-5 w-5" />
                                </button>
                                <textarea
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none py-2 max-h-32 text-gray-900 dark:text-white"
                                    placeholder="Type a comment..."
                                    rows={1}
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePostComment();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handlePostComment}
                                    disabled={!commentText.trim() && commentFiles.length === 0}
                                    className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Metadata & Actions */}
                <div className="lg:w-80 space-y-6 h-fit lg:sticky lg:top-0">
                    {/* Staff Actions Card */}
                    {isStaff && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Staff Actions</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Assignee</label>
                                    <div className="flex items-center p-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                                        <img src={users.find(u => u.id === ticket.assigneeId)?.avatar || "https://ui-avatars.com/api/?name=?"} className="w-6 h-6 rounded-full mr-2" alt="" />
                                        <select
                                            className="bg-transparent text-sm font-medium text-gray-800 dark:text-white outline-none w-full"
                                            value={ticket.assigneeId || ''}
                                            onChange={(e) => handleUpdateTicket(ticket.id, { assigneeId: e.target.value })}
                                        >
                                            <option value="">Unassigned</option>
                                            {users.filter(u => u.role !== UserRole.REPORTER).map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                                    <select
                                        className="w-full p-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-800 dark:text-white outline-none"
                                        value={ticket.status}
                                        onChange={(e) => handleUpdateTicket(ticket.id, { status: e.target.value as TicketStatus })}
                                    >
                                        {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                {!isResolvedOrClosed && (
                                    <button
                                        onClick={() => setShowResolveModal(true)}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center"
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve Ticket
                                    </button>
                                )}
                                {isResolvedOrClosed && (
                                    <button
                                        onClick={() => setShowReopenModal(true)}
                                        className="w-full py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-xl text-sm font-bold transition-colors flex items-center justify-center"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" /> Re-Open Ticket
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ticket Info</h3>
                        <dl className="space-y-4">
                            <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">Module</dt>
                                <dd className="text-sm font-medium text-gray-900 dark:text-white">{ticket.module}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">Created</dt>
                                <dd className="text-sm font-medium text-gray-900 dark:text-white">{new Date(ticket.createdAt).toLocaleDateString()}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">Last Updated</dt>
                                <dd className="text-sm font-medium text-gray-900 dark:text-white">{new Date(ticket.updatedAt).toLocaleDateString()}</dd>
                            </div>
                            <div className="flex justify-between items-center">
                                <dt className="text-sm text-gray-500">Reporter</dt>
                                <dd className="flex items-center">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">{users.find(u => u.id === ticket.reporterId)?.name}</span>
                                    <img src={users.find(u => u.id === ticket.reporterId)?.avatar} className="w-6 h-6 rounded-full" alt="" />
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Linked Tickets Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Linked Tickets</h3>
                            <button onClick={() => setShowRelationModal(true)} className="text-brand-600 hover:text-brand-800 dark:text-brand-400 text-xs font-bold flex items-center">
                                <Plus className="w-3 h-3 mr-1" /> Link
                            </button>
                        </div>

                        {ticket.relations && ticket.relations.length > 0 ? (
                            <div className="space-y-3">
                                {ticket.relations.map(rel => {
                                    const target = tickets.find(t => t.id === rel.targetTicketId);
                                    if (!target) return null;
                                    return (
                                        <div key={rel.id} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                                            <div className="text-xs text-gray-500 mb-1">{rel.type}</div>
                                            <button
                                                onClick={() => { setSelectedTicketId(target.id); setCurrentView('detail'); }}
                                                className="text-sm font-bold text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 block text-left"
                                            >
                                                {target.number}: {target.title}
                                            </button>
                                            <div className="mt-1 flex items-center space-x-2">
                                                <StatusBadge status={target.status} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No linked tickets</p>
                        )}
                    </div>

                    {/* User Satisfaction Rating */}
                    {isResolvedOrClosed && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">User Satisfaction</h3>
                            <div className="flex flex-col items-center">
                                <div className="flex space-x-1 mb-2">
                                    {[1, 2, 3, 4, 5].map(rating => (
                                        <button
                                            key={rating}
                                            onClick={() => handleRateTicket(ticket.id, rating)}
                                            className={`p-1 transition-all ${ticket.satisfactionRating && ticket.satisfactionRating >= rating ? 'scale-110' : 'hover:scale-110'}`}
                                        >
                                            <Star
                                                className={`w-8 h-8 ${ticket.satisfactionRating && ticket.satisfactionRating >= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-slate-600'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400">{ticket.satisfactionRating ? 'Thanks for your feedback!' : 'Rate the resolution quality'}</p>
                            </div>
                        </div>
                    )}

                </div>

                {/* RESOLVE TICKET MODAL */}
                {showResolveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-700 p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mr-2" /> Resolve Ticket
                                </h3>
                                <button onClick={() => setShowResolveModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Resolution Description</label>
                                    <textarea
                                        value={resolutionText}
                                        onChange={(e) => setResolutionText(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none h-32"
                                        placeholder="Describe how the issue was resolved..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Steps to Test / UAT</label>
                                    <textarea
                                        value={uatSteps}
                                        onChange={(e) => setUatSteps(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none h-24 font-mono text-xs"
                                        placeholder="1. Log in as user... 2. Verify invoice #102..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Attachments (Screenshots/Proofs)</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {resolveFiles.map((f, i) => (
                                            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                                {f.type.startsWith('image') ? <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gray-50 flex items-center justify-center"><FileText className="text-gray-400" /></div>}
                                                <button onClick={() => setResolveFiles(p => p.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                            <input type="file" multiple className="hidden" onChange={e => setResolveFiles(p => [...p, ...Array.from(e.target.files || [])])} />
                                            <Plus className="h-6 w-6 text-gray-400" />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                                    <button onClick={() => setShowResolveModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium">Cancel</button>
                                    <button onClick={handleResolve} disabled={!resolutionText.trim()} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">Confirm Resolution</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* REOPEN TICKET MODAL */}
                {showReopenModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-700 p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <AlertTriangle className="h-6 w-6 text-orange-500 mr-2" /> Re-Open Ticket
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please explain why this ticket is being re-opened.</p>

                            <textarea
                                value={reopenReasonText}
                                onChange={(e) => setReopenReasonText(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none h-32"
                                placeholder="Reason for re-opening..."
                                autoFocus
                            />

                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => setShowReopenModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium">Cancel</button>
                                <button onClick={handleReopen} disabled={!reopenReasonText.trim()} className="px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">Confirm Re-Open</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RELATION MODAL */}
                {showRelationModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700 p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <LinkIcon className="h-6 w-6 text-brand-500 mr-2" /> Link Related Ticket
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Ticket</label>
                                    <select
                                        value={relationTargetId}
                                        onChange={(e) => setRelationTargetId(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                                    >
                                        <option value="">Select a ticket...</option>
                                        {tickets.filter(t => t.id !== ticket.id).map(t => (
                                            <option key={t.id} value={t.id}>{t.number}: {t.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Relation Type</label>
                                    <select
                                        value={relationType}
                                        onChange={(e) => setRelationType(e.target.value as RelationType)}
                                        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                                    >
                                        {Object.values(RelationType).map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => setShowRelationModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium">Cancel</button>
                                <button onClick={handleAddRelation} disabled={!relationTargetId} className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">Add Link</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const CreateTicketView = () => {
        const [title, setTitle] = useState('');
        const [description, setDescription] = useState('');
        const [module, setModule] = useState('System');
        const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
        const [steps, setSteps] = useState('');
        const [files, setFiles] = useState<File[]>([]);
        const [isAnalyzing, setIsAnalyzing] = useState(false);
        const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
        const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
        const [suggestedSteps, setSuggestedSteps] = useState<string | null>(null);
        const [status, setStatus] = useState<TicketStatus>(TicketStatus.OPEN);

        // UI Feedback state
        const [applyStatus, setApplyStatus] = useState({
            title: false,
            steps: false,
            description: false
        });

        const isStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEVELOPER;

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) {
                setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
            }
        };

        const handleAnalyze = async () => {
            if (files.length === 0) return;
            setIsAnalyzing(true);
            try {
                const attachments: ImagePart[] = await Promise.all(files.filter(f => f.type.startsWith('image')).map(async (file) => {
                    return new Promise<ImagePart>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64 = (reader.result as string).split(',')[1];
                            resolve({
                                inlineData: { data: base64, mimeType: file.type }
                            });
                        };
                        reader.readAsDataURL(file);
                    });
                }));

                if (attachments.length > 0) {
                    const result = await analyzeTicketAttachment(attachments, description || "New ticket creation analysis", true);
                    setAiAnalysis(result);

                    // Extract Suggested Title
                    const titleMatch = result.match(/\*\*Suggested Title:\*\*\s*(.*)/);
                    if (titleMatch && titleMatch[1]) {
                        setSuggestedTitle(titleMatch[1].trim());
                    }

                    // Extract Steps
                    const stepsMatch = result.match(/\*\*Steps to Reproduce:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
                    if (stepsMatch && stepsMatch[1]) {
                        setSuggestedSteps(stepsMatch[1].trim());
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsAnalyzing(false);
            }
        };

        const handleApplyTitle = () => {
            if (suggestedTitle) {
                setTitle(suggestedTitle);
                setApplyStatus(prev => ({ ...prev, title: true }));
                setTimeout(() => setApplyStatus(prev => ({ ...prev, title: false })), 2000);
            }
        };

        const handleApplySteps = () => {
            if (suggestedSteps) {
                setSteps(suggestedSteps);
                setApplyStatus(prev => ({ ...prev, steps: true }));
                setTimeout(() => setApplyStatus(prev => ({ ...prev, steps: false })), 2000);
            }
        };

        const handleAppendDescription = () => {
            if (aiAnalysis) {
                setDescription(prev => `${prev}\n\n--- AI Analysis ---\n${aiAnalysis}`);
                setApplyStatus(prev => ({ ...prev, description: true }));
                setTimeout(() => setApplyStatus(prev => ({ ...prev, description: false })), 2000);
            }
        };

        const handleSubmit = async () => {
            if (!title || !description) return;

            const attachments: Attachment[] = await Promise.all(files.map(async (file) => {
                return new Promise<Attachment>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            id: `a${Date.now()}-${Math.random()}`,
                            name: file.name,
                            type: file.type.startsWith('image') ? 'image' : 'document',
                            url: reader.result as string,
                            base64: reader.result as string,
                            mimeType: file.type
                        });
                    };
                    reader.readAsDataURL(file);
                });
            }));

            handleCreateTicket({
                title,
                description,
                module,
                priority,
                status: isStaff ? status : TicketStatus.OPEN,
                stepsToReproduce: steps,
                attachments
            });
        };

        return (
            <div className="max-w-5xl mx-auto animate-fade-in pb-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Plus className="mr-2 text-brand-600" /> Log New ERP Ticket
                    </h2>
                    <button onClick={() => setCurrentView('list')} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Smart Start Hero Section */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 mb-8 shadow-xl text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                        <Bot className="w-64 h-64" />
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold mb-2 flex items-center">
                            <Sparkles className="w-8 h-8 mr-3 text-yellow-300" /> Smart Assistant
                        </h3>
                        <p className="text-indigo-100 text-lg mb-8 max-w-xl">
                            Upload a screenshot of your 1C error. Our AI will analyze the problem, suggest a title, and detect steps to reproduce instantly.
                        </p>

                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1 w-full">
                                <label className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                                ${files.length > 0 ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/50'}
                            `}>
                                    {files.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                            {files.map((file, i) => (
                                                <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-white/20 group/file">
                                                    {file.type.startsWith('image') ? (
                                                        <img src={URL.createObjectURL(file)} alt="prev" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-white/10 flex items-center justify-center"><FileText className="w-8 h-8 text-white/50" /></div>
                                                    )}
                                                    <button onClick={(e) => { e.preventDefault(); setFiles(prev => prev.filter((_, idx) => idx !== i)) }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-white/30 text-white/50 text-xs">
                                                <Plus className="w-6 h-6 mb-1" /> Add More
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="h-12 w-12 text-white/70 mb-3" />
                                            <span className="text-lg font-bold text-white">Drop screenshots here</span>
                                            <span className="text-sm text-indigo-200 mt-1">or click to browse</span>
                                        </>
                                    )}
                                    <input type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                                </label>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !files.some(f => f.type.startsWith('image'))}
                                className={`px-8 py-6 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center transition-all min-w-[200px] w-full md:w-auto
                                ${isAnalyzing
                                        ? 'bg-white/20 text-white cursor-wait'
                                        : !files.some(f => f.type.startsWith('image'))
                                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                            : 'bg-white text-indigo-600 hover:bg-indigo-50 transform hover:-translate-y-1'
                                    }
                             `}
                            >
                                {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing...</> : 'Analyze Now'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Suggestions Grid - Appears after analysis */}
                {aiAnalysis && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-slide-up">
                        {suggestedTitle && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center"><Lightbulb className="w-4 h-4 mr-2 text-yellow-500" /> Suggested Subject</h4>
                                <p className="text-lg font-bold text-gray-800 dark:text-white mb-4 line-clamp-2">"{suggestedTitle}"</p>
                                <button
                                    onClick={handleApplyTitle}
                                    className={`w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${applyStatus.title ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-slate-700 dark:text-indigo-300'}`}
                                >
                                    {applyStatus.title ? <><Check className="w-4 h-4 mr-2" /> Applied</> : <><ArrowDownToLine className="w-4 h-4 mr-2" /> Use This Subject</>}
                                </button>
                            </div>
                        )}

                        {suggestedSteps && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center"><ListOrdered className="w-4 h-4 mr-2 text-blue-500" /> Detected Steps</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 font-mono bg-gray-50 dark:bg-slate-900 p-2 rounded-lg">{suggestedSteps}</p>
                                <button
                                    onClick={handleApplySteps}
                                    className={`w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${applyStatus.steps ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-slate-700 dark:text-indigo-300'}`}
                                >
                                    {applyStatus.steps ? <><Check className="w-4 h-4 mr-2" /> Applied</> : <><ArrowDownToLine className="w-4 h-4 mr-2" /> Use Steps</>}
                                </button>
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <details className="group bg-indigo-50 dark:bg-slate-800/50 rounded-xl border border-indigo-100 dark:border-slate-700">
                                <summary className="flex items-center justify-between p-4 cursor-pointer list-none font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                                    <span className="flex items-center"><Bot className="w-4 h-4 mr-2" /> View Full Technical Analysis</span>
                                    <ChevronDown className="w-4 h-4 transform group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-4 pt-0 text-sm text-gray-600 dark:text-gray-300 border-t border-indigo-100 dark:border-slate-700/50 mt-2">
                                    <div className="prose prose-sm dark:prose-invert max-w-none pt-4">
                                        <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                                    </div>
                                    <button
                                        onClick={handleAppendDescription}
                                        className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
                                    >
                                        <Copy className="w-3 h-3 mr-1" /> {applyStatus.description ? 'Appended to Description!' : 'Append to Description Field'}
                                    </button>
                                </div>
                            </details>
                        </div>
                    </div>
                )}

                {/* Standard Form Fields */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-700 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 font-medium text-lg placeholder-gray-400"
                                placeholder="E.g., Cannot post sales invoice #1023..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Module</label>
                            <select value={module} onChange={e => setModule(e.target.value)} className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 h-[60px]">
                                {['Finance', 'Sales', 'Inventory', 'Manufacturing', 'HR', 'System'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                            <div className="grid grid-cols-4 gap-2 bg-gray-50 dark:bg-slate-900 p-1.5 rounded-xl border border-gray-200 dark:border-slate-600">
                                {Object.values(TicketPriority).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPriority(p)}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all ${priority === p ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isStaff && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Initial Status</label>
                                <select value={status} onChange={e => setStatus(e.target.value as TicketStatus)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500">
                                    {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 min-h-[160px] text-base leading-relaxed"
                            placeholder="Please describe the issue in detail..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Steps to Reproduce</label>
                        <textarea
                            value={steps}
                            onChange={e => setSteps(e.target.value)}
                            className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 min-h-[100px] font-mono text-sm"
                            placeholder="1. Go to...&#10;2. Click on..."
                        />
                    </div>

                    <div className="pt-8 border-t border-gray-100 dark:border-slate-700 flex justify-end space-x-4">
                        <button onClick={() => setCurrentView('list')} className="px-8 py-4 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 rounded-2xl transition-colors">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={!title || !description}
                            className="px-10 py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 text-lg"
                        >
                            Create Ticket
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const CreateTicketViewWrapper = () => (
        <CreateTicketView />
    );

    const SettingsView = () => (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center"><Settings className="mr-2" /> Settings</h2>

            <div className="space-y-8">
                {/* Data Sync */}


                {/* Appearance */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Appearance</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Dark Mode</span>
                        <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Account */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Account</h3>
                    <div className="flex items-center p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                        <img src={currentUser?.avatar} alt="" className="w-12 h-12 rounded-full mr-4" />
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{currentUser?.name}</p>
                            <p className="text-sm text-gray-500">{currentUser?.email} • <span className="uppercase text-xs font-bold bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{currentUser?.role}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">Loading HelpDesk...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center max-w-md p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
                    <ShieldCheck className="h-16 w-16 text-brand-600 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to PLC HelpDesk</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Please select a user to continue (Dev Mode)</p>

                    {users.length > 0 ? (
                        <div className="grid gap-3">
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setCurrentUser(u)}
                                    className="flex items-center p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-slate-700 transition-all text-left"
                                >
                                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full mr-3" />
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{u.name}</p>
                                        <p className="text-xs text-gray-500">{u.role}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-red-500 bg-red-50 p-4 rounded-lg">
                            <p className="font-bold">No users found.</p>
                            <p className="text-sm mt-1">Please check your database connection.</p>
                            <button
                                onClick={async () => {
                                    setIsLoading(true);
                                    await StorageService.seedDatabase();
                                    window.location.reload();
                                }}
                                className="mt-4 w-full py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors"
                            >
                                Seed Database with Mock Data
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 ${isDark ? 'dark' : ''}`}>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 bg-brand-900 text-white transition-all duration-300 shadow-xl lg:static lg:h-screen flex flex-col
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${isSidebarOpen ? 'w-64' : 'lg:w-20'}
        `}
            >
                <div className="p-6 flex items-center justify-between">
                    <div className={`font-bold text-2xl flex items-center ${!isSidebarOpen && 'justify-center w-full'}`}>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mr-2 shadow-lg">
                            <span className="font-bold text-white">P</span>
                        </div>
                        {isSidebarOpen && <span className="tracking-tight">PLC HelpDesk</span>}
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-white/70 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-2">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { id: 'list', icon: ListOrdered, label: 'All Tickets' },
                        { id: 'create', icon: Plus, label: 'New Ticket' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { setCurrentView(item.id as any); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group
                        ${currentView === item.id
                                    ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                                    : 'text-brand-100 hover:bg-white/5 hover:text-white'
                                } ${!isSidebarOpen && 'lg:justify-center'}`}
                        >
                            <item.icon className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'lg:mr-0 mr-3'} ${currentView === item.id ? 'text-blue-300' : 'text-brand-300 group-hover:text-white'}`} />
                            <span className={`${!isSidebarOpen && 'lg:hidden'}`}>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 mb-2
                        ${currentView === 'settings' ? 'bg-white/10 text-white' : 'text-brand-100 hover:bg-white/5'}`}
                    >
                        <Settings className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'lg:mr-0 mx-auto'}`} />
                        <span className={`${!isSidebarOpen && 'lg:hidden'}`}>Settings</span>
                    </button>

                    <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'lg:justify-center justify-between'} bg-brand-950/30 p-3 rounded-xl border border-brand-700/50`}>
                        <div className={`flex items-center overflow-hidden ${!isSidebarOpen && 'lg:hidden'}`}>
                            <img src={currentUser?.avatar} className="w-8 h-8 rounded-full border border-brand-500 mr-3" alt="avatar" />
                            <div className="flex flex-col truncate">
                                <span className="text-sm font-bold truncate">{currentUser?.name}</span>
                                <span className="text-[10px] text-brand-300 uppercase tracking-wider">{currentUser?.role}</span>
                            </div>
                        </div>

                        <div className="flex">
                            <button onClick={() => setShowUserSwitcher(true)} className="p-1.5 hover:bg-white/10 rounded-lg text-brand-200 hover:text-white transition-colors" title="Switch User">
                                <Users className="h-4 w-4" />
                            </button>
                            <button onClick={handleLogout} className="p-1.5 hover:bg-white/10 rounded-lg text-brand-200 hover:text-white transition-colors" title="Log Out">
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between px-4 sm:px-8 shadow-sm z-10">
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden mr-4 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 p-2 rounded-lg"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">
                            {currentView === 'dashboard' && 'Dashboard'}
                            {currentView === 'list' && 'Ticket Management'}
                            {currentView === 'create' && 'Create Ticket'}
                            {currentView === 'detail' && 'Ticket Details'}
                            {currentView === 'settings' && 'System Settings'}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>
                        <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Scrollable View Area */}
                <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar">
                    {currentView === 'dashboard' && <DashboardView />}
                    {currentView === 'list' && <TicketListView />}
                    {currentView === 'create' && <CreateTicketViewWrapper />}
                    {currentView === 'detail' && <TicketDetailView />}
                    {currentView === 'settings' && <SettingsView />}
                </div>
            </main>

            <UserSwitcherModal />
            <ImageLightbox />

        </div>
    );
}