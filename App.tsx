import React, { useState, useEffect, useMemo, useRef } from 'react';

import {
    LayoutDashboard,
    Ticket as TicketIcon,
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
    PieChart as PieChartIcon,
    Plus,
    Bolt
} from 'lucide-react';
import { withTimeout } from './utils/timeout';
import { SlaHealthCard } from './components/SlaHealthCard';
import { SlaTimer } from './components/SlaTimer';
import { NotificationBell } from './components/NotificationBell';
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
    SlaConfig,
    Notification as AppNotification, MasterData, AppSettings
} from './types';
import { ImagePart } from './services/geminiService';
import { StorageService } from './services/storageService';
import { TicketDetailView } from './components/TicketDetailView';
import { supabase } from './services/supabaseClient';
import { TicketKanbanView } from './components/TicketKanbanView';
import { ReportsView } from './components/ReportsView';
import { SmartInputTabs, SmartInputTab } from './components/SmartInputTabs';
import { AdminConfigView } from './components/AdminConfigView';
import { BrandLogo } from './components/BrandLogo';
import { EditProfileModal } from './components/EditProfileModal';
import { StatusBadge } from './components/StatusBadge';
import { AnimatePresence, motion } from 'framer-motion';
import PageTransition from './components/PageTransition';
import { Skeleton } from './components/ui/Skeleton';
import { DashboardSkeleton, TicketListSkeleton, KanbanSkeleton } from './components/ViewSkeletons';
import { TicketListView } from './components/TicketListView';
import { TicketStatusPortal } from './components/TicketStatusPortal';
import { ReactMediaRecorder } from "react-media-recorder";
import { analyzeTicketImages, analyzeTicketVideo, analyzeTicketVideoBackground } from './services/geminiService';
import { CreateTicketView } from './components/CreateTicketView';

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

const VideoPreview = ({ stream }: { stream: MediaStream | null }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) {
        return null;
    }

    return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />;
};

const getStatusColor = (status: TicketStatus, isDark: boolean) => {
    switch (status) {
        case TicketStatus.OPEN: return '#3b82f6'; // Blue
        case TicketStatus.TO_BE_INVESTIGATED: return '#8b5cf6'; // Purple
        case TicketStatus.OPEN_BUG: return '#ef4444'; // Red
        case TicketStatus.IN_PROGRESS: return '#eab308'; // Yellow
        case TicketStatus.PENDING_USER: return '#f97316'; // Orange
        case TicketStatus.USER_ACCEPTANCE: return '#06b6d4'; // Cyan
        case TicketStatus.RESOLVED: return '#22c5e'; // Green
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

const CustomChartTooltip = ({ active, payload, label, isDark }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className={`p-3 rounded-lg shadow-lg border border-opacity-10 ${isDark ? 'bg-slate-800 border-white/20' : 'bg-white border-gray-200'}`}>
                <p className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className={`text-xs font-medium flex items-center mb-1 last:mb-0 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color || entry.fill }}></span>
                        <span className="capitalize mr-1">{entry.name}:</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
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

    // Animation State
    const [shouldAnimate, setShouldAnimate] = useState(true);

    useEffect(() => {
        // Disable animation after initial mount period to prevent re-animation on updates
        const timer = setTimeout(() => {
            setShouldAnimate(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

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
                            <Tooltip content={<CustomChartTooltip isDark={isDark} />} cursor={{ fill: isDark ? '#334155' : '#f1f5f9', opacity: 0.4 }} />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={shouldAnimate} />
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
                            <Tooltip content={<CustomChartTooltip isDark={isDark} />} />
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
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [currentView, setCurrentView] = useState<'dashboard' | 'list' | 'detail' | 'new' | 'board' | 'reports' | 'portal'>(() => {
        // Direct routing for portal
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.has('track') ? 'portal' : 'dashboard';
    });
    const [trackedTicketNumber] = useState(() => new URLSearchParams(window.location.search).get('track'));
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const selectedTicket = tickets.find(t => t.id === selectedTicketId);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [showUserSwitcher, setShowUserSwitcher] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
    const [showAdminConfig, setShowAdminConfig] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Master Data State
    const [masterData, setMasterData] = useState<{ statuses: StatusConfig[], modules: ModuleConfig[], slas: SlaConfig[] }>({ statuses: [], modules: [], slas: [] });

    const sidebarItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'list', icon: TicketIcon, label: 'All Tickets' },
        { id: 'board', icon: Kanban, label: 'Board View' },
        { id: 'reports', icon: FileSpreadsheet, label: 'Reports' },
        { id: 'create', icon: Plus, label: 'New Ticket' },
    ];
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [analysisStatus, setAnalysisStatus] = useState<string>("");

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

                const pAppSettings = withTimeout(StorageService.fetchAppSettings(), 60000, 'fetchAppSettings')
                    .then(res => { console.log("App settings fetched"); return res; })
                    .catch(err => { console.error("App settings fetch failed:", err); return null; });

                // Fetch Notifications if user is logged in
                const pNotifications = currentUser
                    ? StorageService.fetchNotifications(currentUser.id)
                    : Promise.resolve([]);

                const [loadedTickets, loadedUsers, loadedMasterData, loadedSettings, loadedNotifications] = await Promise.all([pTickets, pUsers, pMaster, pAppSettings, pNotifications]);

                setTickets(loadedTickets || []);
                setUsers(loadedUsers || []);
                setMasterData(loadedMasterData);
                setAppSettings(loadedSettings);
                setNotifications(loadedNotifications || []);

                if (loadedSettings?.appName) {
                    document.title = loadedSettings.appName;
                } else {
                    document.title = "PLC HelpDesk";
                }

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

        // --- Real-time Subscriptions ---
        // 1. Tickets
        const ticketSub = supabase
            .channel('tickets_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
                const changedTicket = payload.new as any;
                if (!changedTicket) return; // Delete event or something
                setTickets(prev => {
                    const exists = prev.find(t => t.id === changedTicket.id);
                    // Use helper to ensure dates are Date objects, not strings
                    const mapped = StorageService.mapDbTicketToLocal(changedTicket);
                    if (exists) {
                        return prev.map(t => t.id === changedTicket.id ? mapped : t);
                    } else {
                        return [mapped, ...prev];
                    }
                });
            })
            .subscribe();

        // 2. Notifications (Only if logged in)
        let notifSub: any = null;
        if (currentUser) {
            // Use unique channel name per user to avoid collisions during switching
            const channelName = `notifications_${currentUser.id}`;
            notifSub = supabase
                .channel(channelName)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${currentUser.id}`
                }, payload => {
                    const newNotif = payload.new as any;
                    const mappedNotif: AppNotification = {
                        id: newNotif.id,
                        created_at: new Date(newNotif.created_at),
                        recipient_id: newNotif.recipient_id,
                        actor_id: newNotif.actor_id,
                        ticket_id: newNotif.ticket_id,
                        type: newNotif.type,
                        message: newNotif.message,
                        is_read: newNotif.is_read
                    };
                    setNotifications(prev => [mappedNotif, ...prev]);
                })
                .subscribe();
        }

        return () => {
            supabase.removeChannel(ticketSub);
            if (notifSub) supabase.removeChannel(notifSub);
        };
    }, [currentUser]); // Re-run when user changes to update notification subscription



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
        if (!ticketToUpdate || !currentUser) return;

        let updatedComments = ticketToUpdate.comments;
        const payload: Partial<Ticket> = { ...updates };

        // [Audit Trail] Log Assignment Change
        if (updates.assigneeId && updates.assigneeId !== ticketToUpdate.assigneeId) {
            await StorageService.logTicketChange(
                id,
                currentUser.id,
                'ASSIGN_CHANGE',
                'assignee',
                ticketToUpdate.assigneeId,
                updates.assigneeId
            );

            // Notify New Assignee
            if (updates.assigneeId !== currentUser.id) { // Don't notify self
                await StorageService.createNotification({
                    recipient_id: updates.assigneeId,
                    actor_id: currentUser.id,
                    ticket_id: id,
                    type: 'ASSIGN',
                    message: `${currentUser.name} assigned you Ticket #${ticketToUpdate.number}`
                });
            }
        }

        if (updates.priority && updates.priority !== ticketToUpdate.priority) {
            await StorageService.logTicketChange(
                id,
                currentUser.id,
                'PRIORITY_CHANGE',
                'priority',
                ticketToUpdate.priority,
                updates.priority
            );

            const systemComment: Comment = {
                id: `sys${Date.now()}`,
                userId: currentUser.id,
                text: `changed priority from ${ticketToUpdate.priority} to ${updates.priority}`,
                timestamp: new Date(),
                isSystem: true
            };
            updatedComments = [...updatedComments, systemComment];
            payload.comments = updatedComments;
        }

        if (updates.status && updates.status !== ticketToUpdate.status) {
            await StorageService.logTicketChange(
                id,
                currentUser.id,
                'STATUS_CHANGE',
                'status',
                ticketToUpdate.status,
                updates.status
            );

            const systemComment: Comment = {
                id: `sys${Date.now()}`,
                userId: currentUser.id,
                text: `changed status from ${ticketToUpdate.status} to ${updates.status}`,
                timestamp: new Date(),
                isSystem: true
            };
            updatedComments = [...updatedComments, systemComment];
            payload.comments = updatedComments;

            // Notify Reporter if someone else changed their status
            if (ticketToUpdate.reporterId !== currentUser.id) {
                await StorageService.createNotification({
                    recipient_id: ticketToUpdate.reporterId,
                    actor_id: currentUser.id,
                    ticket_id: id,
                    type: 'STATUS',
                    message: `Ticket #${ticketToUpdate.number} status updated to ${updates.status}`
                });
            }
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

        // [NOTIFICATION LOGIC]
        // 1. Notify Assignee (if commenter is NOT assignee)
        if (ticket.assigneeId && ticket.assigneeId !== currentUser.id) {
            await StorageService.createNotification({
                recipient_id: ticket.assigneeId,
                actor_id: currentUser.id,
                ticket_id: ticket.id,
                type: 'COMMENT',
                message: `${currentUser.name} commented on Ticket #${ticket.number}`
            });
        }
        // 2. Notify Reporter (if commenter is NOT reporter)
        if (ticket.reporterId && ticket.reporterId !== currentUser.id) {
            // Avoid double notification if Reporter == Assignee (edge case, handled by if checks usually)
            if (ticket.reporterId !== ticket.assigneeId) {
                await StorageService.createNotification({
                    recipient_id: ticket.reporterId,
                    actor_id: currentUser.id,
                    ticket_id: ticket.id,
                    type: 'COMMENT',
                    message: `${currentUser.name} commented on Ticket #${ticket.number}`
                });
            }
        }

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
        // Smart Scan: Look for the actual "changed status to Resolved" event in comments
        const validResolvedTickets = resolvedTickets.filter(t => {
            // We need a resolution date.
            // Strategy: Find the LATEST system comment that switched status to a resolved state.
            // If none found (legacy data), fall back to updatedAt.
            return true;
        });

        const totalResolutionTimeMs = validResolvedTickets.reduce((acc, t) => {
            let resolutionDate = t.updatedAt; // Default fallback

            // Try to find exact resolution event in history
            if (t.comments && t.comments.length > 0) {
                // Find all status change events to resolved states
                const resolutionEvents = t.comments.filter(c =>
                    c.isSystem &&
                    (c.text.includes('to Resolved') || c.text.includes('to Closed') || c.text.includes('to Partially Closed'))
                );

                if (resolutionEvents.length > 0) {
                    // Use the latest one
                    const lastEvent = resolutionEvents[resolutionEvents.length - 1];
                    resolutionDate = lastEvent.timestamp;
                }
            }

            const duration = resolutionDate.getTime() - t.createdAt.getTime();
            // Sanity check: ignore negative durations (time travel data)
            return duration >= 0 ? acc + duration : acc;
        }, 0);

        // We re-count valid tickets for the divisor because we might have excluded some negatives above
        const validCount = validResolvedTickets.reduce((count, t) => {
            let resolutionDate = t.updatedAt;
            if (t.comments && t.comments.length > 0) {
                const resolutionEvents = t.comments.filter(c =>
                    c.isSystem &&
                    (c.text.includes('to Resolved') || c.text.includes('to Closed') || c.text.includes('to Partially Closed'))
                );
                if (resolutionEvents.length > 0) {
                    resolutionDate = resolutionEvents[resolutionEvents.length - 1].timestamp;
                }
            }
            const duration = resolutionDate.getTime() - t.createdAt.getTime();
            return duration >= 0 ? count + 1 : count;
        }, 0);

        const avgResolution = validCount > 0
            ? Math.round((totalResolutionTimeMs / validCount) / (1000 * 60 * 60))
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
                                            <Wand2 className="h-3 w-3" />
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
            <div className="flex flex-col gap-8">
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

                {/* Quick Actions Restored Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg text-white flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-bold flex items-center mb-2">
                            <Bolt className="h-6 w-6 mr-3" />
                            Quick Actions
                        </h3>
                        <p className="text-blue-100 text-lg">
                            Need assistance with 1C ERP? Log a ticket instantly.
                        </p>
                    </div>
                    <button
                        onClick={() => handleViewChange('create')}
                        className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold shadow-md transition-all flex items-center whitespace-nowrap"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Log New Ticket
                    </button>
                </div>
            </div>

            {/* Charts Section (Highlighted Fixes) */}
            <DashboardCharts stats={dashboardStats} isDark={isDark} />

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
                                <Tooltip content={<CustomChartTooltip isDark={isDark} />} />
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

    const CreateTicketViewWrapper = () => (
        <CreateTicketView
            currentUser={currentUser}
            onClose={() => handleViewChange('list')}
            onCreateTicket={handleCreateTicket}
            masterData={masterData}
        />
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
                        <img src={currentUser?.avatar} alt="" className="w-12 h-12 rounded-full mr-4 object-cover" />
                        <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white">{currentUser?.name}</p>
                            <p className="text-sm text-gray-500">{currentUser?.email} • <span className="uppercase text-xs font-bold bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{currentUser?.role}</span></p>
                        </div>
                        <button
                            onClick={() => setShowEditProfile(true)}
                            className="px-4 py-2 text-sm font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg transition-colors"
                        >
                            Edit Profile
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );

    if (currentView === 'portal' && trackedTicketNumber) {
        return <TicketStatusPortal ticketNumber={trackedTicketNumber} />;
    }

    if (isLoading) {
        return (
            <div className={`flex h-screen bg-slate-50 dark:bg-slate-900 ${isDark ? 'dark' : ''}`}>
                {/* Sidebar Skeleton */}
                <aside className="w-64 bg-brand-900 hidden lg:flex flex-col">
                    <div className="p-6">
                        <div className="h-8 w-32 bg-brand-800 rounded-lg animate-pulse" />
                    </div>
                    <div className="flex-1 px-3 space-y-2 mt-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 w-full bg-brand-800/50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </aside>

                <main className="flex-1 p-4 sm:p-8 overflow-hidden">
                    {/* Header Skeleton */}
                    <div className="h-16 mb-8 flex justify-between items-center">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>

                    {/* View Specific Skeletons */}
                    {currentView === 'dashboard' && <DashboardSkeleton />}
                    {currentView === 'list' && <TicketListSkeleton />}
                    {currentView === 'board' && <KanbanSkeleton />}

                    {/* Fallback for other views */}
                    {['create', 'detail', 'settings', 'reports'].includes(currentView) && <DashboardSkeleton />}
                </main>
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
                        <BrandLogo
                            logoUrl={appSettings?.logoUrl}
                            name={appSettings?.appName || "PLC HelpDesk"}
                            isCollapsed={!isSidebarOpen}
                            className="text-white"
                        />
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-white/70 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-2">

                    {sidebarItems.map((item) => (
                        <motion.button
                            key={item.id}
                            onClick={() => { handleViewChange(item.id as any); setIsMobileMenuOpen(false); }}
                            whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group
                        ${currentView === item.id
                                    ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                                    : 'text-brand-100 hover:text-white'
                                } ${!isSidebarOpen && 'lg:justify-center'}`}
                        >
                            <item.icon className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'lg:mr-0 mr-3'} ${currentView === item.id ? 'text-blue-300' : 'text-brand-300 group-hover:text-white'}`} />
                            <span className={`${!isSidebarOpen && 'lg:hidden'}`}>{item.label}</span>
                        </motion.button>
                    ))}
                </nav>

                <div className="p-4 mt-auto">
                    <motion.button
                        onClick={() => { handleViewChange('settings'); setIsMobileMenuOpen(false); }}
                        whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 mb-2
                        ${currentView === 'settings' ? 'bg-white/10 text-white' : 'text-brand-100'}`}
                    >
                        <Settings className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'lg:mr-0 mx-auto'}`} />
                        <span className={`${!isSidebarOpen && 'lg:hidden'}`}>Settings</span>
                    </motion.button>

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
                    <div className="flex items-center space-x-3">
                        <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 transition-colors">
                            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>

                        <NotificationBell
                            notifications={notifications}
                            onRead={(id) => {
                                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                                StorageService.markNotificationRead(id);
                            }}
                            onNavigate={(ticketId) => {
                                setSelectedTicketId(ticketId);
                                handleViewChange('detail');
                            }}
                        />

                        <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Scrollable View Area */}
                <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {currentView === 'dashboard' && (
                            <PageTransition key="dashboard">
                                <DashboardView />
                            </PageTransition>
                        )}
                        {currentView === 'list' && (
                            <PageTransition key="list">
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
                            </PageTransition>
                        )}
                        {currentView === 'board' && (
                            <PageTransition key="board">
                                <TicketKanbanView tickets={tickets} onUpdateTicket={handleUpdateTicket} onTicketClick={(id) => { setSelectedTicketId(id); handleViewChange('detail'); }} />
                            </PageTransition>
                        )}
                        {currentView === 'reports' && (
                            <PageTransition key="reports">
                                <ReportsView tickets={tickets} />
                            </PageTransition>
                        )}
                        {currentView === 'create' && (
                            <PageTransition key="create">
                                <CreateTicketViewWrapper />
                            </PageTransition>
                        )}
                        {currentView === 'detail' && selectedTicket && (
                            <PageTransition key="detail">
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
                            </PageTransition>
                        )}
                        {currentView === 'settings' && (
                            <PageTransition key="settings">
                                <SettingsView />
                            </PageTransition>
                        )}
                    </AnimatePresence>
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
                        const [data, settings] = await Promise.all([
                            StorageService.fetchMasterData(),
                            StorageService.fetchAppSettings()
                        ]);
                        setMasterData(data);
                        setAppSettings(settings);
                        if (settings?.appName) document.title = settings.appName;
                    }}
                />
            )}

            {currentUser && (
                <EditProfileModal
                    isOpen={showEditProfile}
                    onClose={() => setShowEditProfile(false)}
                    user={currentUser}
                    onUpdate={(updatedUser) => {
                        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
                        setCurrentUser(updatedUser);
                    }}
                />
            )}
        </div>
    );
}