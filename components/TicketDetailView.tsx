import React, { useState, useEffect, useRef } from 'react';
import {
    X, FileText, Maximize2, List, Sparkles, CheckCircle2, TestTube, Activity,
    GitPullRequest, Check, Paperclip, ArrowRight, RefreshCw, AlertTriangle,
    Link as LinkIcon, Plus, Star
} from 'lucide-react';
import {
    Ticket, User, UserRole, TicketStatus, TicketPriority, RelationType,
    Attachment, Comment, TicketRelation, MasterData
} from '../types';
import { StorageService } from '../services/storageService';
import { analyzeTicketImages, ImagePart } from '../services/geminiService';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { SlaTimer } from './SlaTimer';
import { AIAnalysisBlock } from './AIAnalysisBlock';

interface TicketDetailViewProps {
    ticket: Ticket;
    tickets: Ticket[]; // Added for relation linking
    currentUser: User | null;
    users: User[];
    masterData: MasterData;
    onClose: () => void;
    onUpdateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
    onTicketUpdated: (ticket: Ticket) => void; // For full replacements or local state updates
    onSelectTicket: (id: string) => void; // For navigating to related tickets
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
    ticket,
    tickets,
    currentUser,
    users,
    masterData,
    onClose,
    onUpdateTicket,
    onTicketUpdated,
    onSelectTicket
}) => {
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
    const [isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const commentsEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEVELOPER;
    const isResolvedOrClosed = ticket?.status === TicketStatus.RESOLVED || ticket?.status === TicketStatus.CLOSED;

    const scrollToBottom = () => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [ticket?.comments.length]);

    // Fetch full details (comments, description, etc.) if they might be missing
    useEffect(() => {
        const loadDetails = async () => {
            if (ticket?.id) {
                const details = await StorageService.fetchTicketDetails(ticket.id);
                if (details) {
                    onTicketUpdated(details);
                }
            }
        };
        loadDetails();
    }, [ticket?.id]);

    if (!ticket) return <div>Ticket not found</div>;

    const handlePostComment = async () => {
        if (!commentText.trim() && commentFiles.length === 0) return;
        if (!currentUser) return;

        setIsSubmitting(true);
        try {
            // 1. Upload files to Storage (for DB)
            const uploadedAttachments: Attachment[] = await Promise.all(commentFiles.map(async (file) => {
                console.log('Starting upload for:', file.name);
                const path = await StorageService.uploadFile(file);
                console.log('Upload result path:', path);

                if (!path) {
                    console.error('Upload failed (path is null) for file:', file.name);
                    throw new Error(`Failed to upload file: ${file.name}`);
                }
                const url = StorageService.getPublicUrl(path);
                console.log('File uploaded, URL:', url);
                return {
                    id: `ca${Date.now()}-${Math.random()}`,
                    name: file.name,
                    type: file.type.startsWith('image') ? 'image' : 'document',
                    url: url,
                    storagePath: path || undefined,
                    mimeType: file.type
                };
            }));

            // 2. Read files to Base64 (for AI Analysis only)
            const aiAttachments: Attachment[] = await Promise.all(commentFiles.map(async (file) => {
                return new Promise<Attachment>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            id: `temp-${Date.now()}`, // ID doesn't matter for AI
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
            // Only auto-analyze if enabled
            const isAnalyzing = isAutoAnalyzeEnabled && aiAttachments.some(a => a.type === 'image');

            // Create new comment object
            const newComment: Comment = {
                id: commentId,
                userId: currentUser.id,
                text: commentText,
                timestamp: new Date(),
                attachments: uploadedAttachments,
                isAnalyzing: isAnalyzing
            };

            const updatedComments = [...ticket.comments, newComment];

            // Optimistic update
            onTicketUpdated({
                ...ticket,
                comments: updatedComments
            });

            // Persist
            await StorageService.updateTicket(ticket.id, { comments: updatedComments });

            // Trigger AI Analysis in background using aiAttachments (with base64)
            if (isAnalyzing) {
                const imageAttachments = aiAttachments.filter(a => a.type === 'image');
                const imageParts: ImagePart[] = imageAttachments.map(att => ({
                    inlineData: {
                        data: (att.base64 || '').split(',')[1],
                        mimeType: att.mimeType || 'image/jpeg'
                    }
                }));

                // Call Gemini Service
                // We don't await this so UI is unblocked
                analyzeTicketImages(imageParts, commentText || "User uploaded screenshot in comment")
                    .then(async (analysis) => {
                        // Update ticket with analysis
                        // We need to fetch the LATEST ticket state to avoid overwriting other comments
                        // But for now, let's just append to the local knowledge of comments or fetch fresh
                        // A safer way is to fetch fresh, update, and push.
                        // For this demo, we'll just assume we can append to the specific comment if we could find it.
                        // Actually, we need to update the SPECIFIC comment's `isAnalyzing` flag and add the analysis.

                        // Fetch fresh ticket to be safe
                        const freshTicket = await StorageService.fetchTicketDetails(ticket.id);
                        if (!freshTicket) return;

                        const commentIndex = freshTicket.comments.findIndex(c => c.id === commentId);
                        if (commentIndex === -1) return;

                        const updatedCommentsWithAnalysis = [...freshTicket.comments];
                        updatedCommentsWithAnalysis[commentIndex] = {
                            ...updatedCommentsWithAnalysis[commentIndex],
                            isAnalyzing: false,
                            aiAnalysis: analysis
                        };

                        await StorageService.updateTicket(ticket.id, { comments: updatedCommentsWithAnalysis });

                        // Notify UI
                        onTicketUpdated({
                            ...freshTicket,
                            comments: updatedCommentsWithAnalysis
                        });
                    })
                    .catch(err => {
                        console.error("AI Analysis Failed", err);
                        // Update comment to remove analyzing flag
                        StorageService.fetchTicketDetails(ticket.id).then(fresh => {
                            if (fresh) {
                                const idx = fresh.comments.findIndex(c => c.id === commentId);
                                if (idx !== -1) {
                                    const fixed = [...fresh.comments];
                                    fixed[idx] = { ...fixed[idx], isAnalyzing: false };
                                    StorageService.updateTicket(ticket.id, { comments: fixed });
                                    onTicketUpdated({ ...fresh, comments: fixed });
                                }
                            }
                        });
                    });
            }

        } catch (error: any) {
            console.error("Error posting comment:", error);
            alert(`Failed to post comment: ${error.message || error}`);
        } finally {
            setIsSubmitting(false);
            setCommentText('');
            setCommentFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleTriggerAnalysis = async (ticketId: string, commentId: string) => {
        const comment = ticket.comments.find(c => c.id === commentId);
        if (!comment || !comment.attachments) return;

        const imageAttachments = comment.attachments.filter(a => a.type === 'image');
        if (imageAttachments.length === 0) return;

        // Set analyzing state
        const commentsAnalyzing = ticket.comments.map(c =>
            c.id === commentId ? { ...c, isAnalyzing: true, aiAnalysis: undefined } : c
        );
        onTicketUpdated({ ...ticket, comments: commentsAnalyzing });

        // We need base64 for analysis. If it's not in memory, we might need to fetch it or use the URL if the AI service supports it.
        // The current `analyzeTicketImages` expects base64.
        // Since we don't store base64 in DB, we need to fetch the image from URL and convert to base64.

        try {
            const imageParts: ImagePart[] = await Promise.all(imageAttachments.map(async (att) => {
                const response = await fetch(att.url);
                const blob = await response.blob();
                return new Promise<ImagePart>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve({
                            inlineData: { data: base64, mimeType: att.mimeType || 'image/png' }
                        });
                    };
                    reader.readAsDataURL(blob);
                });
            }));

            const analysisPromise = analyzeTicketImages(imageParts, comment.text || "User uploaded screenshot in comment");
            const timeoutPromise = new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error("Analysis timed out")), 30000)
            );

            const analysis = await Promise.race([analysisPromise, timeoutPromise]);

            const commentsAnalyzed = ticket.comments.map(c =>
                c.id === commentId ? { ...c, isAnalyzing: false, aiAnalysis: analysis } : c
            );
            onTicketUpdated({ ...ticket, comments: commentsAnalyzed });
            await StorageService.updateTicket(ticket.id, { comments: commentsAnalyzed });

        } catch (err) {
            console.error("Manual AI Analysis failed:", err);
            const commentsFailed = ticket.comments.map(c =>
                c.id === commentId ? { ...c, isAnalyzing: false, aiAnalysis: "Failed to analyze image. Please try again." } : c
            );
            onTicketUpdated({ ...ticket, comments: commentsFailed });
        }
    };

    const handleCancelAnalysis = (ticketId: string, commentId: string) => {
        const commentsCancelled = ticket.comments.map(c =>
            c.id === commentId ? { ...c, isAnalyzing: false } : c
        );
        onTicketUpdated({ ...ticket, comments: commentsCancelled });
    };

    const handleResolve = async () => {
        if (!resolutionText.trim() || !currentUser) return;

        const attachments: Attachment[] = await Promise.all(resolveFiles.map(async (file) => {
            const path = await StorageService.uploadFile(file);
            const url = path ? StorageService.getPublicUrl(path) : '';
            return {
                id: `ra${Date.now()}-${Math.random()}`,
                name: file.name,
                type: file.type.startsWith('image') ? 'image' : 'document',
                url: url,
                storagePath: path || undefined,
                mimeType: file.type
            };
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
        onTicketUpdated({
            ...ticket,
            status: TicketStatus.RESOLVED,
            comments: updatedComments,
            updatedAt: new Date()
        });

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
        if (!reopenReasonText.trim() || !currentUser) return;

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
        onTicketUpdated({
            ...ticket,
            status: TicketStatus.REOPENED,
            comments: updatedComments,
            updatedAt: new Date()
        });

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
        onUpdateTicket(ticket.id, { relations: [...currentRelations, newRelation] });
        setShowRelationModal(false);
        setRelationTargetId('');
        setRelationType(RelationType.RELATED_TO);
    };

    const handleRateTicket = async (ticketId: string, rating: number) => {
        onUpdateTicket(ticketId, { satisfactionRating: rating });
        await StorageService.updateTicket(ticketId, { satisfactionRating: rating });
    };

    const handleCommentFeedback = (ticketId: string, commentId: string, type: 'positive' | 'negative') => {
        const updatedComments = ticket.comments.map(c =>
            c.id === commentId ? { ...c, aiAnalysisFeedback: type } : c
        );
        onTicketUpdated({ ...ticket, comments: updatedComments });
        // We might want to persist this feedback too, but StorageService.updateTicket updates the whole ticket or specific fields.
        // If comments are stored as JSONB, we need to update the whole comments array.
        StorageService.updateTicket(ticketId, { comments: updatedComments });
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
                            <StatusBadge status={ticket.status} config={masterData.statuses} />
                            <PriorityBadge priority={ticket.priority} />
                            <SlaTimer ticket={ticket} slas={masterData.slas} />
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{ticket.title}</h1>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{ticket.description}</p>

                    {/* Ticket Attachments Grid */}
                    {ticket.attachments && ticket.attachments.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {ticket.attachments.filter(att => att.url && !att.url.startsWith('blob:')).map((att, idx) => (
                                <div key={idx} className="relative group">
                                    {att.type === 'video' ? (
                                        <div className="w-64 h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 bg-black">
                                            <video
                                                src={att.url}
                                                controls
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setPreviewImage(att.url)}
                                            className="group relative block overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 w-24 h-24 transition-transform hover:scale-105"
                                        >
                                            {att.type === 'image' ? (
                                                <img
                                                    src={att.url}
                                                    alt={att.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        // Fallback for broken images that might slip through
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).parentElement?.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-center');
                                                        // Insert an icon if possible, or just leave blank
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center">
                                                    <FileText className="h-8 w-8 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 h-5 w-5" />
                                            </div>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* AI Analysis & Steps Section */}
                    {(ticket.aiAnalysis || ticket.stepsToReproduce) && (
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
                            {ticket.stepsToReproduce && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                                        <List className="w-4 h-4 mr-2 text-brand-600" />
                                        Steps to Reproduce
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                        {ticket.stepsToReproduce}
                                    </div>
                                </div>
                            )}

                            {ticket.aiAnalysis && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                                        <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                                        AI Analysis
                                    </h3>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {ticket.aiAnalysis}
                                    </div>
                                </div>
                            )}
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
                                                            {att.type === 'image' && att.url ? (
                                                                <img src={att.url} alt="att" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                            ) : <div className="w-full h-full flex items-center justify-center bg-gray-50"><FileText className="h-6 w-6 text-gray-400" /></div>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* AI Loading State with Cancel */}
                                            {comment.isAnalyzing && (
                                                <div className="mt-3 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                                    <div className="flex items-center space-x-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                                        <Sparkles className="h-3 w-3 animate-pulse" />
                                                        <span>AI is analyzing this screenshot...</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCancelAnalysis(ticket.id, comment.id)}
                                                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}

                                            {/* Manual Trigger Button */}
                                            {!comment.isAnalyzing && !comment.aiAnalysis && comment.attachments?.some(a => a.type === 'image') && (
                                                <div className="mt-2">
                                                    <button
                                                        onClick={() => handleTriggerAnalysis(ticket.id, comment.id)}
                                                        className="flex items-center space-x-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                                                    >
                                                        <Sparkles className="h-3 w-3" />
                                                        <span>Analyze with AI</span>
                                                    </button>
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
                        {/* Comment Input Area */}
                        <div className="flex items-end space-x-2 bg-gray-50 dark:bg-slate-900 p-2 rounded-2xl border border-gray-200 dark:border-slate-600 focus-within:border-brand-400 dark:focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all duration-200">
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                onChange={e => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setCommentFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                        e.target.value = ''; // Reset input to allow re-selecting same file
                                    }
                                }}
                                accept="image/*, .pdf"
                            />
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <Paperclip className="h-5 w-5" />
                            </button>
                            <div className="flex-1">
                                <textarea
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none py-2 max-h-32 text-gray-900 dark:text-white"
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
                                {/* Auto-Analyze Toggle */}
                                {commentFiles.some(f => f.type.startsWith('image')) && (
                                    <div className="flex items-center mt-1 mb-1">
                                        <input
                                            type="checkbox"
                                            id="autoAnalyze"
                                            checked={isAutoAnalyzeEnabled}
                                            onChange={(e) => setIsAutoAnalyzeEnabled(e.target.checked)}
                                            className="h-3 w-3 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="autoAnalyze" className="ml-2 block text-xs text-gray-500 dark:text-gray-400 flex items-center cursor-pointer">
                                            <Sparkles className="h-3 w-3 mr-1 text-indigo-500" />
                                            Analyze images with AI
                                        </label>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handlePostComment}
                                disabled={(!commentText.trim() && commentFiles.length === 0) || isSubmitting}
                                className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? (
                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <ArrowRight className="h-5 w-5" />
                                )}
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
                                        onChange={(e) => onUpdateTicket(ticket.id, { assigneeId: e.target.value })}
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
                                    onChange={(e) => onUpdateTicket(ticket.id, { status: e.target.value as TicketStatus })}
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
                                // We need to find the target ticket. 
                                // Since we don't have all tickets here, we might need to fetch it or rely on what's passed.
                                // But wait, we don't have `tickets` array here.
                                // We should probably just display the ID if we can't find it, or better, pass a `resolveTicket` function.
                                // Or pass `tickets` as a prop? 
                                // Passing all tickets might be heavy but it's what App.tsx did.
                                // Let's assume we can't easily resolve other tickets without the full list.
                                // I'll comment this out or handle it gracefully.
                                // Actually, I added `onSelectTicket` prop.
                                return (
                                    <div key={rel.id} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                                        <div className="text-xs text-gray-500 mb-1">{rel.type}</div>
                                        <button
                                            onClick={() => onSelectTicket(rel.targetTicketId)}
                                            className="text-sm font-bold text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 block text-left"
                                        >
                                            {/* We don't have the target ticket details here. We only have the ID. */}
                                            {/* We need to fetch it or pass `tickets` list. */}
                                            Ticket #{rel.targetTicketId}
                                        </button>
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

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in" onClick={() => setPreviewImage(null)}>
                    <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="h-8 w-8" /></button>
                    <img src={previewImage} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="Preview" onClick={e => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};
