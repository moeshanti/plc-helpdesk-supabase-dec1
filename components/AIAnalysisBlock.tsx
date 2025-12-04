import React, { useState } from 'react';
import { Bot, ThumbsUp, ThumbsDown, ChevronUp, ChevronDown } from 'lucide-react';

interface AIAnalysisBlockProps {
    analysis: string;
    onFeedback: (type: 'positive' | 'negative') => void;
    feedback?: 'positive' | 'negative';
}

export const AIAnalysisBlock: React.FC<AIAnalysisBlockProps> = ({ analysis, onFeedback, feedback }) => {
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
