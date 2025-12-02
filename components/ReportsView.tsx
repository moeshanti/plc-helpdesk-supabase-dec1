import React, { useState } from 'react';
import { Ticket } from '../types';
import { generateExecutiveSummary } from '../services/geminiService';
import { Sparkles, Loader2, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface ReportsViewProps {
    tickets: Ticket[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tickets }) => {
    const [summary, setSummary] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const criticalCount = tickets.filter(t => t.priority === 'Critical').length;
    const highCount = tickets.filter(t => t.priority === 'High').length;

    // Calculate System Health Score
    // Base 100, minus 10 for each critical, 5 for each high
    const healthScore = Math.max(0, 100 - (criticalCount * 10) - (highCount * 5));

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            const result = await generateExecutiveSummary(tickets);
            setSummary(result);
        } catch (error) {
            console.error("Failed to generate report:", error);
            setSummary("Failed to generate report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Briefing</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">AI-powered insights for IT leadership</p>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Weekly Report
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* System Health Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                            System Health
                        </h3>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className={`text-6xl font-bold ${getHealthColor(healthScore)}`}>
                            {healthScore}%
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Operational Stability</p>
                    </div>
                    <div className="space-y-3 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                                Critical Issues
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">{criticalCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                                High Priority
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">{highCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center">
                                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                Total Tickets
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">{tickets.length}</span>
                        </div>
                    </div>
                </div>

                {/* AI Summary Card */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 min-h-[300px] flex flex-col">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                        Executive Summary
                    </h3>

                    <div className="flex-1 bg-gray-50 dark:bg-slate-900/50 rounded-lg p-6 border border-gray-100 dark:border-slate-700/50">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                <p>Analyzing system data...</p>
                            </div>
                        ) : summary ? (
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                                    {summary}
                                </p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <p>Click "Generate Weekly Report" to receive an AI-driven analysis of the current helpdesk status.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
