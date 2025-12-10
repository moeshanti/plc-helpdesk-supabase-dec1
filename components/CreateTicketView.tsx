import React, { useState } from 'react';
import {
    Plus,
    X,
    Bot,
    Sparkles,
    Wand2,
    UploadCloud,
    Video,
    AlertTriangle,
    Loader2,
    Lightbulb,
    Check,
    ArrowDownToLine,
    ListOrdered,
    ChevronDown,
    Copy,
    LayoutDashboard,
    Search as SearchIcon,
    RefreshCw,
    HelpCircle,
    CheckCircle2,
    Lock,
    AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ReactMediaRecorder } from "react-media-recorder";

import { SmartInputTabs, SmartInputTab } from './SmartInputTabs';
import { StorageService } from '../services/storageService';
import { analyzeTicketImages, analyzeTicketVideoBackground, ImagePart } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { withTimeout } from '../utils/timeout';
import {
    User,
    UserRole,
    Ticket,
    TicketStatus,
    TicketPriority,
    Attachment,
    MasterData
} from '../types';

const ACTIVE_ERP_SYSTEM = "1C:Enterprise";

interface CreateTicketViewProps {
    currentUser: User | null;
    onClose: () => void;
    onCreateTicket: (ticket: Partial<Ticket>) => Promise<void>;
    masterData: MasterData;
}

export const CreateTicketView: React.FC<CreateTicketViewProps> = ({
    currentUser,
    onClose,
    onCreateTicket,
    masterData
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [module, setModule] = useState('System');
    const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
    const [steps, setSteps] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
    const [activeTab, setActiveTab] = useState<SmartInputTab>('image');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
    const [suggestedSteps, setSuggestedSteps] = useState<string | null>(null);
    const [status, setStatus] = useState<TicketStatus>(TicketStatus.OPEN);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [suggestedDescription, setSuggestedDescription] = useState<string | null>(null);
    const [suggestedModule, setSuggestedModule] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisStatus, setAnalysisStatus] = useState<string>("Analyzing...");

    // UI Feedback state
    const [applyStatus, setApplyStatus] = useState({
        title: false,
        steps: false,
        description: false
    });

    const isStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEVELOPER;


    const resetAnalysisState = () => {
        setAiAnalysis(null);
        setAnalysisError(null); // Clear error
        setSuggestedTitle(null);
        setSuggestedDescription(null);
        setSuggestedSteps(null);
        setSuggestedModule(null);
        setApplyStatus({ title: false, steps: false, description: false });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            resetAnalysisState(); // Clear previous analysis
            if (activeTab === 'image') {
                const newFiles = Array.from(e.target.files);
                setFiles(prev => [...prev, ...newFiles]);
            } else if (activeTab === 'upload-video') {
                const file = e.target.files[0];
                // Always clear error and previous file when selecting new one
                setUploadError(null);
                setVideoFile(null);

                if (file) {
                    if (file.size > 100 * 1024 * 1024) {
                        setUploadError("Video file size must be less than 100MB.");
                        e.target.value = ''; // Reset input to allow re-selecting same oversized file if needed
                        return;
                    }
                    setVideoFile(file);
                }
            }
            // Reset input value to allow selecting the same file again or new files reliably
            e.target.value = '';
        }
    };

    const handleTabChangeWrapper = (tab: SmartInputTab) => {
        setActiveTab(tab);
        resetAnalysisState();
        setFiles([]);
        setVideoFile(null);
        setRecordedVideoBlob(null);
        setUploadError(null);
    };


    const handleAnalyze = async (specificBlob?: string) => {


        if (!videoFile && files.length === 0 && !recordedVideoBlob && !specificBlob) return;

        setIsAnalyzing(true);
        setAnalysisError(null);

        // --- VIDEO ANALYSIS (Background Mode) ---
        let blobToAnalyze: Blob | File | null = videoFile;
        // Logic fix: if specificBlob is passed (from recorder), use it
        if (activeTab === 'record-video' && recordedVideoBlob) blobToAnalyze = recordedVideoBlob;

        // Note: The specificBlob argument from ReactMediaRecorder is a URL string, not a blob.
        // If passed, we need to fetch it. (The original code had fetch logic in the recorder render prop, not here?)
        // Wait, looking at original code:
        /*
                                                    <button
                                                        onClick={() => handleAnalyze(mediaBlobUrl)}
        */
        // But handleAnalyze signature was `const handleAnalyze = async () =>`. It ignored arguments!
        // And relied on `recordedVideoBlob` state.
        // However, `recordedVideoBlob` is set inside the recorder render:
        /*
                                                fetch(mediaBlobUrl).then(r => r.blob()).then(blob => {
                                                    const file = new File([blob], "recorded-video.mp4", { type: "video/mp4" });
                                                    setVideoFile(file); // WAIT, it sets VIDEOFILE?
                                                });
        */
        // If it sets videoFile, then blobToAnalyze line is: `let blobToAnalyze = videoFile`. So it works.
        // The `if (activeTab === 'record-video' && recordedVideoBlob)` implies recordedVideoBlob is used. 
        // But the recorder code sets `videoFile`!
        // Let's stick to the existing logic which seemed to check `videoFile`.

        if (blobToAnalyze) {
            try {
                setAnalysisStatus("Authenticating...");
                const session = await withTimeout(
                    supabase.auth.getSession(),
                    5000,
                    "Authentication Check timed out"
                );
                const accessToken = session.data.session?.access_token;

                // 1. Upload Video First using StorageService
                let fileToUpload: File;
                if (blobToAnalyze instanceof File) {
                    fileToUpload = blobToAnalyze;
                } else {
                    fileToUpload = new File([blobToAnalyze], `recording_${Date.now()}.webm`, { type: 'video/webm' });
                }

                setAnalysisStatus("Uploading Video..."); // START UPLOAD

                const path = await withTimeout(
                    StorageService.uploadFile(fileToUpload),
                    120000,
                    "Video upload timed out (120s). Please check your connection."
                );

                if (!path) throw new Error("Failed to upload video to storage");

                // Get Public URL
                const videoUrl = StorageService.getPublicUrl(path);


                setAnalysisStatus("Starting AI Analysis..."); // UPLOAD DONE


                // 2. Call Background Analysis Service (Polling)
                let analysisResult = await analyzeTicketVideoBackground(
                    videoUrl,
                    ACTIVE_ERP_SYSTEM,
                    "System",
                    accessToken // Pass token for RLS
                );

                setAnalysisStatus("Processing Result..."); // DONE

                // Ensure result is parsed JSON
                if (typeof analysisResult === 'string') {
                    console.warn("Analysis returned string instead of object. Attempting parse...");
                    try {
                        // Clean markdown ticks if present
                        const cleaned = analysisResult.replace(/```json\n?|\n?```/g, '').trim();
                        analysisResult = JSON.parse(cleaned);
                    } catch (e) {
                        console.error("Failed to parse string result:", e);
                        throw new Error("Received invalid format from analysis service.");
                    }
                }

                // 3. Process Result
                let { title, description, steps, module } = analysisResult;


                // Fallback parsing (Self-Healing)
                if (!steps && description) {
                    const stepsMatch = description.match(/(?:Steps to reproduce|Reproduction steps):?\s*([\s\S]*?)(?:$|Expected result)/i);
                    if (stepsMatch) {
                        steps = stepsMatch[1].trim();
                        // Clean description to remove the steps part
                        description = description.replace(stepsMatch[0], '').trim();
                    }
                }

                // Clean Title
                if (title) {
                    title = title.replace(/^Ticket Title:\s*/i, '').replace(/^Subject:\s*/i, '').replace(/^Title:\s*/i, '').replace(/^Issue:\s*/i, '').replace(/"/g, '').trim();
                }

                setSuggestedTitle(title);
                setSuggestedDescription(description);
                setSuggestedSteps(steps);
                setSuggestedModule(module);

                // Set AI Analysis state to trigger UI suggestions
                setAiAnalysis(JSON.stringify(analysisResult));

            } catch (error: any) {
                console.error("Background Video Analysis Failed:", error);
                setAnalysisError(error.message || "Failed to analyze video (Timeout or Error)");
            } finally {
                setIsAnalyzing(false);
            }
            return;
        }

        // --- IMAGE ANALYSIS ---
        try {
            // Upload images first
            const uploadedUrls = await Promise.all(files.map(async (file) => {
                const path = await StorageService.uploadFile(file);
                if (!path) throw new Error(`Failed to upload image: ${file.name}`);
                return StorageService.getPublicUrl(path);
            }));

            // Convert to parts
            const imageParts: ImagePart[] = await Promise.all(files.map(async (file, index) => ({
                inlineData: {
                    data: await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    }).then(s => s.split(',')[1]),
                    mimeType: file.type
                }
            })));

            const context = `${ACTIVE_ERP_SYSTEM} (Module: System)`;
            const result = await analyzeTicketImages(imageParts, context, true); // Corrected signature
            console.log("DEBUG: Raw AI Response from Backend:", result);

            let parsedResult;
            try {
                parsedResult = JSON.parse(result);
                // Handle Array Response (Robustness Fix)
                if (Array.isArray(parsedResult)) {
                    console.warn("DEBUG: AI returned array, using first item.");
                    parsedResult = parsedResult[0] || {};
                }
                console.log("DEBUG: Parsed JSON:", parsedResult);
            } catch (e) {
                console.error("DEBUG: Failed to parse result as JSON:", result);
                parsedResult = {};
            }

            let { title, description, steps, module } = parsedResult;

            // Self-Healing Parsing Logic
            if (!steps && description) {
                const stepsMatch = description.match(/(?:Steps to reproduce|Reproduction steps):?\s*([\s\S]*?)(?:$|Expected result)/i);
                if (stepsMatch) {
                    steps = stepsMatch[1].trim();
                    description = description.replace(stepsMatch[0], '').trim();
                }
            }

            if (title) {
                title = title.replace(/^Ticket Title:\s*/i, '').replace(/^Subject:\s*/i, '').replace(/^Title:\s*/i, '').replace(/^Issue:\s*/i, '').replace(/"/g, '').trim();
            }

            setSuggestedTitle(title);
            setSuggestedDescription(description);
            setSuggestedSteps(steps);
            setSuggestedModule(module);

            setAiAnalysis(result);

        } catch (error: any) {
            console.error("Image Analysis Error:", error);
            let errorMessage = error.message || "Failed to analyze images";
            if (errorMessage.includes("JSON")) {
                errorMessage = "AI response format invalid. Retrying usually fixes this.";
            }
            setAnalysisError(errorMessage);
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
            let formattedText = '';
            try {
                // Try parsing if it's JSON
                const analysisObj = JSON.parse(aiAnalysis);
                formattedText = `
--- AI Analysis ---
${analysisObj.description || 'N/A'}
`.trim();
            } catch (e) {
                // Fallback for plain text or failed parse
                formattedText = aiAnalysis;
            }

            setDescription(prev => {
                // Determine separator: if prev exists, add TWO newlines.
                const separator = prev ? '\n\n' : '';
                return `${prev}${separator}${formattedText}`;
            });

            setApplyStatus(prev => ({ ...prev, description: true }));
            setTimeout(() => setApplyStatus(prev => ({ ...prev, description: false })), 2000);
            return;
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
                try {
                    const path = await withTimeout(
                        StorageService.uploadFile(videoFile),
                        120000,
                        "Video upload timed out (120s). Please check your connection."
                    );
                    const url = path ? StorageService.getPublicUrl(path) : '';

                    attachments.push({
                        id: `v${Date.now()}-${Math.random()}`,
                        name: videoFile.name,
                        type: 'video',
                        url: url,
                        storagePath: path || undefined,
                        mimeType: videoFile.type
                    });
                } catch (e: any) {
                    console.error('Video upload failed:', e);
                    alert(`Video upload failed: ${e.message}`);
                    setIsSubmitting(false);
                    return;
                }
            }

            // Handle Recorded Video
            if (activeTab === 'record-video' && recordedVideoBlob) {
                try {
                    const file = new File([recordedVideoBlob], `Screen Recording ${new Date().toLocaleString()}.webm`, { type: 'video/webm' });
                    const path = await withTimeout(
                        StorageService.uploadFile(file),
                        120000,
                        "Recording upload timed out (120s). Please check your connection."
                    );
                    const url = path ? StorageService.getPublicUrl(path) : '';

                    attachments.push({
                        id: `r${Date.now()}-${Math.random()}`,
                        name: file.name,
                        type: 'video',
                        url: url,
                        storagePath: path || undefined,
                        mimeType: 'video/webm'
                    });
                } catch (e: any) {
                    console.error('Recording upload failed:', e);
                    alert(`Recording upload failed: ${e.message}`);
                    setIsSubmitting(false);
                    return;
                }
            }

            await onCreateTicket({
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


    // Original had setAnalysisStatus("Authenticating..."). Where was it defined?
    // It was likely missed in my read or implicit string literal updates? 
    // Ah, lines 1252: setAnalysisStatus("Authenticating...");
    // But I don't see `const [analysisStatus, setAnalysisStatus] = useState(...)` in the view_file output.
    // Let me check lines 1160-1200 again.
    // Line 1171 is aiAnalysis.
    // Line 1174 is status (TicketStatus).
    // I missed `analysisStatus` in the useState definitions?
    // Let me check if I truncated it or if it's missing.
    // Lines 1160-1180: title, description, module, priority, steps, files, videoFile, recordedVideoBlob, activeTab, isAnalyzing, aiAnalysis, suggestedTitle, ...
    // I don't see `analysisStatus` state.
    // BUT line 1252 uses `setAnalysisStatus`.
    // Maybe it was just outside the view range? No, 1160 to 1180 covers all useStates typically.
    // Ah, look at line 1739: `isAnalyzing ? <><Loader2 ... /> {analysisStatus}</> : 'Analyze Now'`
    // So `analysisStatus` DEFINITELY exists.
    // It must be defined around line 1180?
    // I will add it: `const [analysisStatus, setAnalysisStatus] = useState<string>("Analyzing...");`

    return (
        <div className="max-w-5xl mx-auto animate-fade-in pb-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Plus className="mr-2 text-brand-600" /> Log New ERP Ticket
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
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

                    <SmartInputTabs activeTab={activeTab} onTabChange={handleTabChangeWrapper} />

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
                                                    <button onClick={(e) => {
                                                        e.preventDefault();
                                                        setFiles(prev => {
                                                            const newFiles = prev.filter((_, idx) => idx !== i);
                                                            if (newFiles.length === 0) resetAnalysisState();
                                                            return newFiles;
                                                        });
                                                    }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-white/30 text-white/50 text-xs">
                                                <Wand2 className="h-4 w-4 mr-2" /> Add More
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
                                <label className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative
                                ${videoFile ? 'bg-white/10 border-white/40' : uploadError ? 'bg-red-500/10 border-red-400' : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/50'}
                            `}>
                                    {videoFile ? (
                                        <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden group/file">
                                            <video src={URL.createObjectURL(videoFile)} className="w-full h-full object-contain" controls />
                                            <button onClick={(e) => {
                                                e.preventDefault();
                                                setVideoFile(null);
                                                resetAnalysisState();
                                            }} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover/file:opacity-100 transition-opacity z-10">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${uploadError ? 'bg-red-500/20' : 'bg-white/10'}`}>
                                                {uploadError ? <AlertTriangle className="h-6 w-6 text-red-300" /> : <Video className="h-6 w-6 text-white" />}
                                            </div>
                                            <span className={`text-lg font-bold ${uploadError ? 'text-red-300' : 'text-white'}`}>
                                                {uploadError || "Drop video file here"}
                                            </span>
                                            <span className={`text-sm mt-1 px-4 text-center ${uploadError ? 'text-red-200' : 'text-indigo-200'}`}>
                                                {uploadError ? (
                                                    <>
                                                        Please choose a smaller file.
                                                        <br />
                                                        <span className="inline-block mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors cursor-pointer" onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setUploadError(null);
                                                            e.currentTarget.closest('label')?.querySelector('input')?.click();
                                                        }}>
                                                            Select another file
                                                        </span>
                                                    </>
                                                ) : "Max size: 100MB"}
                                            </span>
                                        </>
                                    )}
                                    <input type="file" onChange={handleFileChange} className="hidden" accept="video/*" />
                                </label>
                            )}

                            {activeTab === 'record-video' && (
                                <ReactMediaRecorder
                                    screen
                                    render={({ status, startRecording, stopRecording, mediaBlobUrl, previewStream }) => {
                                        if (mediaBlobUrl && status === 'stopped') {
                                            // Convert blob URL to File object for upload
                                            fetch(mediaBlobUrl).then(r => r.blob()).then(blob => {
                                                const file = new File([blob], "recorded-video.mp4", { type: "video/mp4" });
                                                setVideoFile(file);
                                            });
                                        }

                                        return (
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                {status === 'recording' ? (
                                                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                                                        <div className="relative">
                                                            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                                                            <div className="absolute top-0 left-0 w-4 h-4 rounded-full bg-red-500 animate-ping opacity-75"></div>
                                                        </div>
                                                        <p className="text-white/70 font-medium animate-pulse">Recording...</p>
                                                    </div>
                                                ) : mediaBlobUrl ? (
                                                    <video src={mediaBlobUrl} controls className="w-full max-w-md rounded-2xl border border-white/20 shadow-2xl" />
                                                ) : null}

                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center space-x-4">
                                                        {status !== 'recording' && !mediaBlobUrl && (
                                                            <button
                                                                onClick={startRecording}
                                                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/25 flex items-center"
                                                            >
                                                                <Video className="w-5 h-5 mr-2" /> Start Recording
                                                            </button>
                                                        )}
                                                        {status === 'recording' && (
                                                            <button
                                                                onClick={stopRecording}
                                                                className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold transition-all border border-gray-700 flex items-center"
                                                            >
                                                                <div className="w-4 h-4 bg-red-500 rounded-sm mr-2"></div> Stop Recording
                                                            </button>
                                                        )}
                                                        {status === 'stopped' && mediaBlobUrl && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleAnalyze(mediaBlobUrl)}
                                                                    disabled={isAnalyzing}
                                                                    className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center ${isAnalyzing ? 'bg-white/80 text-indigo-400 cursor-wait' : 'bg-white hover:bg-white/90 text-indigo-600 hover:shadow-white/25'}`}
                                                                >
                                                                    {isAnalyzing ? (
                                                                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing...</>
                                                                    ) : (
                                                                        <><Sparkles className="w-5 h-5 mr-2" /> Analyze Recording</>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setVideoFile(null);
                                                                        resetAnalysisState();
                                                                    }}
                                                                    className="text-sm text-white/50 hover:text-white underline transition-colors px-4 py-3"
                                                                >
                                                                    Record Again
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    {status !== 'recording' && !mediaBlobUrl && (
                                                        <p className="text-white/30 text-xs mt-4">Grant camera/mic permissions</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            )}
                        </div>

                        {activeTab !== 'record-video' && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAnalyze()}
                                disabled={isAnalyzing || (activeTab === 'image' && files.length === 0) || (activeTab === 'upload-video' && !videoFile)}
                                className={`px-8 py-6 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center transition-all w-full md:min-w-[300px] md:w-auto
                                ${isAnalyzing
                                        ? 'bg-white/20 text-white cursor-wait'
                                        : (activeTab === 'image' && files.length === 0) || (activeTab === 'upload-video' && !videoFile)
                                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                            : 'bg-white text-indigo-600 hover:bg-indigo-50 transform hover:-translate-y-1'
                                    }
                            `}
                            >
                                {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {analysisStatus}</> : 'Analyze Now'}
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Suggestions Grid - Appears after analysis */}
            {aiAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-slide-up">
                    {suggestedTitle && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="text-xs font-bold uppercase text-gray-400 flex items-center"><Lightbulb className="w-4 h-4 mr-2 text-yellow-500" /> Suggested Subject</h4>
                                <button onClick={() => setSuggestedTitle(null)} className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-2 -mt-2">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
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
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="text-xs font-bold uppercase text-gray-400 flex items-center"><ListOrdered className="w-4 h-4 mr-2 text-blue-500" /> Detected Steps</h4>
                                <button onClick={() => setSuggestedSteps(null)} className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-2 -mt-2">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
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
                        <details className="group bg-indigo-50 dark:bg-slate-800/50 rounded-xl border border-indigo-100 dark:border-slate-700 relative">
                            <summary className="flex items-center justify-between p-4 cursor-pointer list-none font-bold text-indigo-900 dark:text-indigo-200 text-sm pr-10">
                                <span className="flex items-center"><Bot className="w-4 h-4 mr-2" /> View Full Technical Analysis</span>
                                <ChevronDown className="w-4 h-4 transform group-open:rotate-180 transition-transform" />
                            </summary>
                            <button onClick={() => setAiAnalysis(null)} className="absolute top-3 right-3 text-indigo-300 hover:text-red-500 transition-colors bg-white/50 dark:bg-black/20 rounded-full p-1">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="p-4 pt-0 text-sm text-gray-600 dark:text-gray-300 border-t border-indigo-100 dark:border-slate-700/50 mt-2">
                                <div className="prose prose-sm dark:prose-invert max-w-none pt-4">
                                    {(() => {
                                        try {
                                            const analysisObj = JSON.parse(aiAnalysis);
                                            return (
                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="font-bold text-indigo-900 dark:text-indigo-300">Module:</span> {analysisObj.module}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-indigo-900 dark:text-indigo-300">Description:</span>
                                                        <p className="mt-1">{analysisObj.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        } catch (e) {
                                            return <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />;
                                        }
                                    })()}
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
                    <button onClick={onClose} className="px-8 py-4 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 rounded-2xl transition-colors">Cancel</button>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={!title || !description || isSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-10 py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg flex items-center justify-center min-w-[200px]"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating...
                            </span>
                        ) : 'Create Ticket'}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};
