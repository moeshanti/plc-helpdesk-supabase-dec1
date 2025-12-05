import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { Ticket, MasterData, TicketStatus, TicketPriority } from '../types';

interface SlaHealthCardProps {
    tickets: Ticket[];
    masterData: MasterData;
    isDark: boolean;
}

export const SlaHealthCard: React.FC<SlaHealthCardProps> = ({ tickets, masterData, isDark }) => {

    const stats = useMemo(() => {
        const now = new Date();
        let breached = 0;
        let atRisk = 0;
        let failedTickets = 0;
        const totalTickets = tickets.length;

        const getSlaHours = (priority: TicketPriority): number => {
            const sla = masterData.slas.find(s => s.priority === priority);
            return sla ? sla.resolution_hours : 24;
        };

        tickets.forEach(ticket => {
            const slaHours = getSlaHours(ticket.priority);
            const created = new Date(ticket.createdAt);
            const deadline = new Date(created.getTime() + slaHours * 60 * 60 * 1000);

            const isResolved = ticket.status === TicketStatus.RESOLVED ||
                ticket.status === TicketStatus.CLOSED ||
                ticket.status === TicketStatus.PARTIALLY_CLOSED;

            if (isResolved) {
                const resolvedAt = new Date(ticket.updatedAt);
                if (resolvedAt > deadline) {
                    failedTickets++;
                }
            } else {
                if (now > deadline) {
                    breached++;
                    failedTickets++;
                } else {
                    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
                    if (deadline <= fourHoursFromNow) {
                        atRisk++;
                    }
                }
            }
        });

        const complianceRate = totalTickets > 0
            ? Math.round(((totalTickets - failedTickets) / totalTickets) * 100)
            : 100;

        return { breached, atRisk, complianceRate };
    }, [tickets, masterData]);

    const data = [
        { name: 'Compliant', value: stats.complianceRate },
        { name: 'Non-Compliant', value: 100 - stats.complianceRate }
    ];

    // Gauge Color Logic
    const gaugeColor = stats.complianceRate >= 90 ? '#22c55e' : stats.complianceRate >= 70 ? '#eab308' : '#ef4444';
    const emptyColor = isDark ? '#334155' : '#e2e8f0';

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 h-full flex flex-col relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 dark:bg-slate-700/20 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                    SLA Performance
                </h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Gauge Chart */}
                <div className="relative w-64 h-32 -mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="100%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={80}
                                outerRadius={100}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                <Cell fill={gaugeColor} />
                                <Cell fill={emptyColor} />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-0 left-0 w-full text-center mb-4">
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{stats.complianceRate}%</span>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Compliance Rate</p>
                    </div>
                </div>
            </div>

            {/* Bottom Stats Row */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                <div className="flex flex-col items-center p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">{stats.breached}</span>
                    <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Breached
                    </span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">{stats.atRisk}</span>
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> At Risk
                    </span>
                </div>
            </div>

            {(stats.breached === 0 && stats.atRisk === 0) && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
                    <CheckCircle2 className="w-48 h-48 text-green-500" />
                </div>
            )}
        </div>
    );
};
