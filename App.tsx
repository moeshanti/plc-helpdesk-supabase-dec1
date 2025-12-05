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
    Filter,
    Kanban,
    List,
    BarChart3,
    PieChart as PieChartIcon
} from 'lucide-react';
import { withTimeout } from './utils/timeout';
import { SlaHealthCard } from './components/SlaHealthCard';
import { SlaTimer } from './components/SlaTimer';
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
import {
    User, UserRole, Ticket, TicketStatus, TicketPriority, RelationType, Attachment, Comment, TicketRelation, StatusConfig,
    ModuleConfig,
    SlaConfig
} from './types';
import { ImagePart } from './services/geminiService';
import { StorageService } from './services/storageService';
import { TicketDetailView } from './components/TicketDetailView';
import { supabase } from './services/supabaseClient';
import { TicketKanbanView } from './components/TicketKanbanView';
import { ReportsView } from './components/ReportsView';
import { SmartInputTabs, SmartInputTab } from './components/SmartInputTabs';
import { AdminConfigView } from './components/AdminConfigView';
import { StatusBadge } from './components/StatusBadge';
import { PriorityBadge } from './components/PriorityBadge';
import { TicketListView } from './components/TicketListView';
import { ReactMediaRecorder } from "react-media-recorder";
import { analyzeTicketImages, analyzeTicketVideo } from './services/geminiService';

const ACTIVE_ERP_SYSTEM = "1C:Enterprise";

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
    if (stats.total === 0) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center h-80">
                    <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-full mb-4">
                        <BarChart3 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">No Data Available</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs">
                        There are no tickets to display. Create a new ticket to see dashboard insights.
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center h-80">
                    <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-full mb-4">
                        <PieChartIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">No Distribution Data</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs">
                        Module and status distribution will appear here once tickets are created.
                    </p>
                </div>
            </div>
        );
    }

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

    const [currentView, setCurrentView] = useState<'dashboard' | 'list' | 'detail' | 'new' | 'board' | 'reports'>('dashboard');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const selectedTicket = tickets.find(t => t.id === selectedTicketId);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [showUserSwitcher, setShowUserSwitcher] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [showAdminConfig, setShowAdminConfig] = useState(false);

    // Master Data State
    const [masterData, setMasterData] = useState<{ statuses: StatusConfig[], modules: ModuleConfig[], slas: SlaConfig[] }>({ statuses: [], modules: [], slas: [] });

    const sidebarItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'list', icon: TicketIcon, label: 'All Tickets' },
        { id: 'board', icon: Kanban, label: 'Board View' },
        { id: 'reports', icon: FileText, label: 'Reports' },
        { id: 'create', icon: Plus, label: 'New Ticket' },
    ];
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleViewChange = (view: typeof currentView) => {
        setCurrentView(view);
        setSearchQuery('');
    };

    // Lifted state for TicketListView

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

    // Ref to track selected ticket ID for realtime updates
    const selectedTicketIdRef = useRef<string | null>(null);

    // Update ref when state changes
    useEffect(() => {
        selectedTicketIdRef.current = selectedTicketId;
        if (selectedTicketId) {
            // Fetch full details when selected
            StorageService.fetchTicketDetails(selectedTicketId).then(fullTicket => {
                if (fullTicket) {
                    setTickets(prev => prev.map(t => t.id === fullTicket.id ? fullTicket : t));
                }
            });
        }
    }, [selectedTicketId]);

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
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, async (payload) => {
                const newTicketData = payload.new;

                setTickets(prev => prev.map(t => {
                    if (t.id !== newTicketData.id) return t;

                    // Safety check: ensure critical fields exist before mapping
                    if (!newTicketData.title || !newTicketData.status) {
                        return t;
                    }

                    const updatedTicket = StorageService.mapDbTicketToLocal(newTicketData);

                    // Preserve local attachments if payload has them as null (common with TOASTed columns in realtime)
                    if ((!updatedTicket.attachments || updatedTicket.attachments.length === 0) && t.attachments.length > 0) {
                        updatedTicket.attachments = t.attachments;
                    }

                    // Preserve comments if payload has them as null/empty but we have them locally
                    // (Realtime payload might not include joined data or large JSONB fields)
                    if ((!updatedTicket.comments || updatedTicket.comments.length === 0) && t.comments.length > 0) {
                        updatedTicket.comments = t.comments;
                    }

                    // Preserve AI analysis if not present in payload
                    if (!updatedTicket.aiAnalysis && t.aiAnalysis) {
                        updatedTicket.aiAnalysis = t.aiAnalysis;
                    }

                    return updatedTicket;
                }));
            })
            .subscribe();

        const loadData = async () => {
            try {
                console.log("Starting data load...");
                console.log("Supabase URL:", (import.meta as any).env.VITE_SUPABASE_URL);

                const pTickets = withTimeout(StorageService.fetchTickets(), 60000, 'fetchTickets')
                    .then(res => { console.log("Tickets fetched"); return res; })
                    .catch(err => { console.error("Tickets fetch failed:", err); return []; });

                const pUsers = withTimeout(StorageService.fetchUsers(), 60000, 'fetchUsers')
                    .then(res => { console.log("Users fetched"); return res; })
                    .catch(err => { console.error("Users fetch failed:", err); return []; });

                const pMaster = withTimeout(StorageService.fetchMasterData(), 60000, 'fetchMasterData')
                    .then(res => { console.log("Master data fetched"); return res; })
                    .catch(err => { console.error("Master data fetch failed:", err); return { statuses: [], modules: [], slas: [] }; });

                const [loadedTickets, loadedUsers, loadedMasterData] = await Promise.all([pTickets, pUsers, pMaster]);

                setTickets(loadedTickets || []);
                setUsers(loadedUsers || []);
                setMasterData(loadedMasterData);

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
        handleViewChange('dashboard');
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
        handleViewChange('list');

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
        // Filter tickets that are considered "resolved" for calculation purposes
        const resolvedTickets = tickets.filter(t => t.status === TicketStatus.CLOSED || t.status === TicketStatus.RESOLVED || t.status === TicketStatus.PARTIALLY_CLOSED);
        const closed = resolvedTickets.length;
        const reopened = tickets.filter(t => t.status === TicketStatus.REOPENED).length;

        // Calculate Average Resolution Time (in Hours)
        // using updatedAt as a proxy for resolution time for resolved tickets
        const totalResolutionTimeMs = resolvedTickets.reduce((acc, t) => {
            const duration = t.updatedAt.getTime() - t.createdAt.getTime();
            return acc + duration;
        }, 0);

        const avgResolution = closed > 0
            ? Math.round((totalResolutionTimeMs / closed) / (1000 * 60 * 60))
            : 0;

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
            avgResolution, // Added computed metric
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
                            { label: 'Avg Resolution', value: `${dashboardStats.avgResolution} hrs`, icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
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
                        onClick={() => handleViewChange('create')}
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column: Ticket Volume Chart */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                                <TrendingUp className="h-5 w-5 mr-2 text-brand-600 dark:text-brand-400" />
                                Ticket Volume
                            </h3>
                            <p className="text-sm text-gray-400">Tickets created vs resolved (7 days)</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[400px]">
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

                {/* Right Column: Performance Stack */}
                <div className="flex flex-col gap-6">

                    {/* 1. Satisfaction Card */}
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

                    {/* 2. SLA Health Card */}
                    <div className="flex-1 min-h-[240px]">
                        <SlaHealthCard tickets={tickets} masterData={masterData} isDark={isDark} />
                    </div>
                </div>
            </div>
        </div>
    );

    const CreateTicketView = () => {
        const [title, setTitle] = useState('');
        const [description, setDescription] = useState('');
        const [module, setModule] = useState('System');
        const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
        const [steps, setSteps] = useState('');
        const [files, setFiles] = useState<File[]>([]);
        const [videoFile, setVideoFile] = useState<File | null>(null);
        const [activeTab, setActiveTab] = useState<SmartInputTab>('image');
        const [isAnalyzing, setIsAnalyzing] = useState(false);
        const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
        const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
        const [suggestedSteps, setSuggestedSteps] = useState<string | null>(null);
        const [status, setStatus] = useState<TicketStatus>(TicketStatus.OPEN);
        const [isSubmitting, setIsSubmitting] = useState(false);

        // UI Feedback state
        const [applyStatus, setApplyStatus] = useState({
            title: false,
            steps: false,
            description: false
        });

        const isStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEVELOPER;

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                if (activeTab === 'image') {
                    const newFiles = Array.from(e.target.files);
                    setFiles(prev => [...prev, ...newFiles]);
                } else if (activeTab === 'upload-video') {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > 25 * 1024 * 1024) {
                            alert("Video file size must be less than 25MB.");
                            e.target.value = ''; // Reset on error
                            return;
                        }
                        setVideoFile(file);
                    }
                }
                // Reset input value to allow selecting the same file again or new files reliably
                e.target.value = '';
            }
        };

        const handleAnalyze = async (mediaBlobUrl?: string) => {
            setIsAnalyzing(true);
            try {
                let result = "";

                if (activeTab === 'image') {
                    if (files.length === 0) return;
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
                        result = await analyzeTicketImages(attachments, description || "New ticket creation analysis", true);
                    }
                } else if (activeTab === 'upload-video' && videoFile) {
                    const reader = new FileReader();
                    const base64 = await new Promise<string>((resolve) => {
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.readAsDataURL(videoFile);
                    });
                    result = await analyzeTicketVideo(base64, videoFile.type, "1C:Enterprise", module);
                } else if (activeTab === 'record-video' && mediaBlobUrl) {
                    const blob = await fetch(mediaBlobUrl).then(r => r.blob());
                    if (blob.size > 4 * 1024 * 1024) {
                        alert("Recording is too large (>4MB) for AI analysis. Please record a shorter clip (max 5-10 seconds).");
                        setIsAnalyzing(false);
                        return;
                    }
                    const reader = new FileReader();
                    const base64 = await new Promise<string>((resolve) => {
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.readAsDataURL(blob);
                    });
                    result = await analyzeTicketVideo(base64, blob.type, "1C:Enterprise", module);
                }

                if (result) {
                    // Parse JSON result for video or extract from text for images
                    let parsedTitle = "";
                    let parsedSteps = "";
                    let parsedDescription = result;

                    if (activeTab !== 'image') {
                        try {
                            const json = JSON.parse(result);
                            parsedTitle = json.title;
                            parsedSteps = json.steps;
                            parsedDescription = json.description;
                            // Also set module if available? User requested module in JSON but we don't have a setter for it in the UI feedback logic yet, 
                            // but we can set the form field directly if we want. 
                            // For now let's stick to the requested state variables.
                            if (json.module) setModule(json.module);
                        } catch (e) {
                            console.error("Failed to parse JSON from video analysis", e);
                            // Fallback to text parsing if JSON fails
                        }
                    } else {
                        // Existing regex logic for images
                        const titleMatch = result.match(/\*\*Suggested Title:\*\*\s*(.*)/);
                        if (titleMatch && titleMatch[1]) parsedTitle = titleMatch[1].trim();

                        const stepsMatch = result.match(/\*\*Steps to Reproduce:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
                        if (stepsMatch && stepsMatch[1]) parsedSteps = stepsMatch[1].trim();
                    }

                    setAiAnalysis(parsedDescription);
                    if (parsedTitle) setSuggestedTitle(parsedTitle);
                    if (parsedSteps) setSuggestedSteps(parsedSteps);
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
                // Clean up the analysis text
                let cleanAnalysis = aiAnalysis;
                // Remove the "Mock Analysis" header if present
                cleanAnalysis = cleanAnalysis.replace(/\*\*Mock Analysis \(Localhost\):\*\*\s*/, '');

                setDescription(prev => {
                    const separator = prev ? '\n\n' : '';
                    return `${prev}${separator}--- AI Analysis ---\n${cleanAnalysis}`;
                });

                setApplyStatus(prev => ({ ...prev, description: true }));
                setTimeout(() => setApplyStatus(prev => ({ ...prev, description: false })), 2000);
            } else {
                console.warn('AI Analysis is empty, nothing to append.');
            }
        };

        const handleSubmit = async () => {
            if (isSubmitting) return;
            if (!title || !description) return;

            setIsSubmitting(true);
            try {
                const attachments: Attachment[] = [];

                // Handle Image Files
                if (activeTab === 'image' && files.length > 0) {
                    const imageAttachments = await Promise.all(files.map(async (file) => {
                        const path = await StorageService.uploadFile(file);
                        const url = path ? StorageService.getPublicUrl(path) : '';

                        // Keep base64 for immediate UI preview if needed, but ideally we use URL
                        // For now, we won't store base64 in DB.
                        return {
                            id: `a${Date.now()}-${Math.random()}`,
                            name: file.name,
                            type: 'image' as const,
                            url: url,
                            storagePath: path || undefined,
                            mimeType: file.type
                        };
                    }));
                    attachments.push(...imageAttachments);
                }

                // Handle Uploaded Video
                if (activeTab === 'upload-video' && videoFile) {
                    const path = await StorageService.uploadFile(videoFile);
                    const url = path ? StorageService.getPublicUrl(path) : '';

                    attachments.push({
                        id: `v${Date.now()}-${Math.random()}`,
                        name: videoFile.name,
                        type: 'video',
                        url: url,
                        storagePath: path || undefined,
                        mimeType: videoFile.type
                    });
                }

                // Handle Recorded Video
                if (activeTab === 'record-video' && recordedVideoBlob) {
                    const file = new File([recordedVideoBlob], `Screen Recording ${new Date().toLocaleString()}.webm`, { type: 'video/webm' });
                    const path = await StorageService.uploadFile(file);
                    const url = path ? StorageService.getPublicUrl(path) : '';

                    attachments.push({
                        id: `r${Date.now()}-${Math.random()}`,
                        name: file.name,
                        type: 'video',
                        url: url,
                        storagePath: path || undefined,
                        mimeType: 'video/webm'
                    });
                }

                await handleCreateTicket({
                    title,
                    description,
                    module,
                    priority,
                    status: isStaff ? status : TicketStatus.OPEN,
                    stepsToReproduce: steps,
                    attachments,
                    aiAnalysis: aiAnalysis // Persist AI Analysis
                });
            } catch (error) {
                console.error('Error creating ticket:', error);
                setIsSubmitting(false);
            }
        };

        return (
            <div className="max-w-5xl mx-auto animate-fade-in pb-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Plus className="mr-2 text-brand-600" /> Log New ERP Ticket
                    </h2>
                    <button onClick={() => handleViewChange('list')} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
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
                            Upload a screenshot or video of your 1C error. Our AI will analyze the problem, suggest a title, and detect steps to reproduce instantly.
                        </p>

                        <SmartInputTabs activeTab={activeTab} onTabChange={setActiveTab} />

                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1 w-full">
                                {activeTab === 'image' && (
                                    <label className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                                    ${files.length > 0 ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/50'}
                                `}>
                                        {files.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                                {files.map((file, i) => (
                                                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-white/20 group/file">
                                                        <img src={URL.createObjectURL(file)} alt="prev" className="w-full h-full object-cover" />
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
                                        <input type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*" />
                                    </label>
                                )}

                                {activeTab === 'upload-video' && (
                                    <label className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                                    ${videoFile ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/50'}
                                `}>
                                        {videoFile ? (
                                            <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden group/file">
                                                <video src={URL.createObjectURL(videoFile)} className="w-full h-full object-contain" controls />
                                                <button onClick={(e) => { e.preventDefault(); setVideoFile(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover/file:opacity-100 transition-opacity z-10">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
                                                    <Video className="h-6 w-6 text-white" />
                                                </div>
                                                <span className="text-lg font-bold text-white">Drop video file here</span>
                                                <span className="text-sm text-indigo-200 mt-1">Max size: 25MB</span>
                                            </>
                                        )}
                                        <input type="file" onChange={handleFileChange} className="hidden" accept="video/*" />
                                    </label>
                                )}

                                {activeTab === 'record-video' && (
                                    <ReactMediaRecorder
                                        screen
                                        render={({ status, startRecording, stopRecording, mediaBlobUrl }) => (
                                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-2xl bg-white/5">
                                                {status === 'recording' ? (
                                                    <div className="text-center">
                                                        <div className="animate-pulse flex items-center justify-center mb-4">
                                                            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                                                            <span className="text-red-400 font-bold">Recording...</span>
                                                        </div>
                                                        <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full font-bold transition-colors">
                                                            Stop Recording
                                                        </button>
                                                    </div>
                                                ) : mediaBlobUrl ? (
                                                    <div className="w-full max-w-sm">
                                                        <video src={mediaBlobUrl} controls className="w-full rounded-lg mb-4" />
                                                        <div className="flex justify-center gap-4">
                                                            <button onClick={() => { startRecording(); }} className="text-white/70 hover:text-white text-sm underline">Record Again</button>
                                                            <button
                                                                onClick={() => handleAnalyze(mediaBlobUrl)}
                                                                className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold hover:bg-indigo-50 transition-colors"
                                                                disabled={isAnalyzing}
                                                            >
                                                                {isAnalyzing ? 'Analyzing...' : 'Analyze Recording'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <button onClick={startRecording} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold transition-colors flex items-center mx-auto">
                                                            <div className="w-3 h-3 bg-white rounded-full mr-2"></div> Start Recording
                                                        </button>
                                                        <p className="text-white/50 text-sm mt-3">Grant camera/mic permissions</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    />
                                )}
                            </div>

                            {activeTab !== 'record-video' && (
                                <button
                                    onClick={() => handleAnalyze()}
                                    disabled={isAnalyzing || (activeTab === 'image' && files.length === 0) || (activeTab === 'upload-video' && !videoFile)}
                                    className={`px-8 py-6 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center transition-all min-w-[200px] w-full md:w-auto
                                    ${isAnalyzing
                                            ? 'bg-white/20 text-white cursor-wait'
                                            : (activeTab === 'image' && files.length === 0) || (activeTab === 'upload-video' && !videoFile)
                                                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                                : 'bg-white text-indigo-600 hover:bg-indigo-50 transform hover:-translate-y-1'
                                        }
                                `}
                                >
                                    {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing...</> : 'Analyze Now'}
                                </button>
                            )}
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
                                {masterData.modules.length > 0
                                    ? masterData.modules.map(m => <option key={m.id} value={m.label}>{m.label}</option>)
                                    : ['Finance', 'Sales', 'Inventory', 'Manufacturing', 'HR', 'System'].map(m => <option key={m} value={m}>{m}</option>)
                                }
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
                                    {masterData.statuses.length > 0
                                        ? masterData.statuses.map(s => <option key={s.id} value={s.label}>{s.label}</option>)
                                        : Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)
                                    }
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
                        <button onClick={() => handleViewChange('list')} className="px-8 py-4 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 rounded-2xl transition-colors">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={!title || !description || isSubmitting}
                            className="px-10 py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 text-lg"
                        >
                            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating...</> : 'Create Ticket'}
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
                {/* System Configuration (Admins Only) */}
                {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEVELOPER) && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">System</h3>
                        <button
                            onClick={() => setShowAdminConfig(true)}
                            className="w-full flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors group"
                        >
                            <div className="flex items-center">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg mr-4 text-indigo-600 dark:text-indigo-300">
                                    <Settings className="h-6 w-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 dark:text-white">System Configuration</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage Ticket Statuses & Modules</p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                        </button>
                    </div>
                )}

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

                    {sidebarItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { handleViewChange(item.id as any); setIsMobileMenuOpen(false); }}
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
                        onClick={() => { handleViewChange('settings'); setIsMobileMenuOpen(false); }}
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
                            {currentView === 'board' && 'Kanban Board'}
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
                    {currentView === 'list' && (
                        <TicketListView
                            tickets={visibleTickets.filter(t => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return (
                                    t.title.toLowerCase().includes(query) ||
                                    t.number.toLowerCase().includes(query) ||
                                    (t.description && t.description.toLowerCase().includes(query))
                                );
                            })}
                            users={users}
                            masterData={masterData}
                            filters={filters}
                            setFilters={setFilters}
                            setSelectedTicketId={setSelectedTicketId}
                            setCurrentView={handleViewChange}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                        />
                    )}
                    {currentView === 'board' && <TicketKanbanView tickets={tickets} onUpdateTicket={handleUpdateTicket} onTicketClick={(id) => { setSelectedTicketId(id); handleViewChange('detail'); }} />}
                    {currentView === 'reports' && <ReportsView tickets={tickets} />}
                    {currentView === 'create' && <CreateTicketViewWrapper />}
                    {currentView === 'detail' && selectedTicket && (
                        <TicketDetailView
                            key={selectedTicket.id}
                            ticket={selectedTicket}
                            tickets={tickets}
                            currentUser={currentUser}
                            users={users}
                            masterData={masterData}
                            onClose={() => handleViewChange('list')}
                            onUpdateTicket={handleUpdateTicket}
                            onTicketUpdated={(updatedTicket) => {
                                setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
                            }}
                            onSelectTicket={(id) => {
                                setSelectedTicketId(id);
                            }}
                        />
                    )}
                    {currentView === 'settings' && <SettingsView />}
                </div>
            </main>

            <UserSwitcherModal />
            <ImageLightbox />

            {showAdminConfig && (
                <AdminConfigView
                    onClose={() => setShowAdminConfig(false)}
                    initialStatuses={masterData.statuses}
                    initialModules={masterData.modules}
                    initialSlas={masterData.slas}
                    onUpdate={async () => {
                        const data = await StorageService.fetchMasterData();
                        setMasterData(data);
                    }}
                />
            )}
        </div>
    );
}