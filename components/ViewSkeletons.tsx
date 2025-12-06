import { Skeleton } from './ui/Skeleton';

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ))}
            </div>

            {/* Middle Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <div key={i} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-80">
                        <div className="flex justify-between items-center mb-6">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="w-full h-56 rounded-xl" />
                    </div>
                ))}
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-64">
                        <Skeleton className="h-6 w-32 mb-4" />
                        <Skeleton className="w-full h-40 rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TicketListSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Skeleton className="h-10 w-24 rounded-xl" />
                    <Skeleton className="h-10 w-24 rounded-xl" />
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-4 w-24" />)}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div key={i} className="p-4 flex items-center gap-4">
                            <Skeleton className="h-4 w-12" /> {/* ID */}
                            <Skeleton className="h-4 w-64 flex-1" /> {/* Subject */}
                            <Skeleton className="h-4 w-20 hidden md:block" /> {/* Module */}
                            <Skeleton className="h-6 w-24 rounded-full" /> {/* Status */}
                            <Skeleton className="h-6 w-20 rounded-full hidden sm:block" /> {/* Priority */}
                            <div className="flex items-center gap-2 hidden lg:flex">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function KanbanSkeleton() {
    return (
        <div className="h-full overflow-x-auto animate-in fade-in duration-500">
            <div className="flex gap-6 pb-6 min-w-max">
                {/* Render 4 columns */}
                {[1, 2, 3, 4].map((col) => (
                    <div key={col} className="w-80 flex-shrink-0 flex flex-col gap-4">
                        {/* Column Header */}
                        <div className="flex justify-between items-center p-1">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-8 rounded-full" />
                        </div>

                        {/* Cards in column */}
                        <div className="space-y-3">
                            {[1, 2, 3].map((card) => (
                                <div key={card} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex justify-between mb-3">
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-3/4 mb-4" />
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-6 w-20 rounded-full" />
                                        <Skeleton className="h-6 w-6 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
