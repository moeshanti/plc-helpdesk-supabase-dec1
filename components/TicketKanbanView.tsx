import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { Ticket as TicketIcon, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface TicketKanbanViewProps {
    tickets: Ticket[];
    onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
    onTicketClick: (id: string) => void;
}

const COLUMNS = [
    {
        id: 'backlog',
        title: 'Backlog',
        statuses: [TicketStatus.OPEN, TicketStatus.REOPENED],
        color: 'bg-gray-100 dark:bg-slate-800',
        icon: TicketIcon
    },
    {
        id: 'active',
        title: 'Active',
        statuses: [TicketStatus.IN_PROGRESS, TicketStatus.TO_BE_INVESTIGATED, TicketStatus.OPEN_BUG],
        color: 'bg-blue-50 dark:bg-blue-900/20',
        icon: Clock
    },
    {
        id: 'waiting',
        title: 'Waiting',
        statuses: [TicketStatus.PENDING_USER, TicketStatus.USER_ACCEPTANCE],
        color: 'bg-orange-50 dark:bg-orange-900/20',
        icon: AlertCircle
    },
    {
        id: 'done',
        title: 'Done',
        statuses: [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.PARTIALLY_CLOSED],
        color: 'bg-green-50 dark:bg-green-900/20',
        icon: CheckCircle2
    }
];

export const TicketKanbanView: React.FC<TicketKanbanViewProps> = ({ tickets, onUpdateTicket, onTicketClick }) => {

    const onDragEnd = (result: DropResult) => {
        const { destination, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === result.source.droppableId &&
            destination.index === result.source.index
        ) {
            return;
        }

        const targetColumnId = destination.droppableId;
        let newStatus: TicketStatus;

        switch (targetColumnId) {
            case 'backlog':
                newStatus = TicketStatus.OPEN;
                break;
            case 'active':
                newStatus = TicketStatus.IN_PROGRESS;
                break;
            case 'waiting':
                newStatus = TicketStatus.PENDING_USER;
                break;
            case 'done':
                newStatus = TicketStatus.RESOLVED;
                break;
            default:
                return;
        }

        onUpdateTicket(draggableId, { status: newStatus });
    };

    const getPriorityColor = (priority: TicketPriority) => {
        switch (priority) {
            case TicketPriority.CRITICAL: return 'text-red-600 bg-red-50 border-red-100';
            case TicketPriority.HIGH: return 'text-orange-600 bg-orange-50 border-orange-100';
            case TicketPriority.MEDIUM: return 'text-blue-600 bg-blue-50 border-blue-100';
            case TicketPriority.LOW: return 'text-gray-600 bg-gray-50 border-gray-100';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-6 overflow-x-auto pb-4">
                {COLUMNS.map(column => {
                    const columnTickets = tickets.filter(t => column.statuses.includes(t.status));

                    return (
                        <div key={column.id} className="flex-shrink-0 w-80 flex flex-col bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 h-full max-h-[calc(100vh-12rem)]">
                            <div className={`p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-inherit rounded-t-xl z-10`}>
                                <div className="flex items-center space-x-2">
                                    <div className={`p-1.5 rounded-lg ${column.color}`}>
                                        <column.icon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                                    </div>
                                    <h3 className="font-bold text-gray-700 dark:text-gray-200">{column.title}</h3>
                                </div>
                                <span className="bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs font-bold px-2 py-1 rounded-full border border-gray-200 dark:border-slate-700">
                                    {columnTickets.length}
                                </span>
                            </div>

                            <Droppable droppableId={column.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 p-3 space-y-3 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                    >
                                        {columnTickets.map((ticket, index) => (
                                            <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => onTicketClick(ticket.id)}
                                                        className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow group cursor-pointer ${snapshot.isDragging ? 'rotate-2 shadow-lg ring-2 ring-indigo-500 ring-opacity-50 z-50' : ''}`}
                                                        style={provided.draggableProps.style}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs font-mono text-gray-400">{ticket.number}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getPriorityColor(ticket.priority)}`}>
                                                                {ticket.priority}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 line-clamp-2 leading-snug">
                                                            {ticket.title}
                                                        </h4>
                                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50 dark:border-slate-700/50">
                                                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                                                <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                                                                    {formatStatus(ticket.status)}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                                    {ticket.module}
                                                                </span>
                                                            </div>
                                                            {ticket.assigneeId && (
                                                                <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0 ml-2">
                                                                    {/* Placeholder for avatar since we don't have user list here easily, or could pass it in props */}
                                                                    {ticket.assigneeId.substring(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
};
