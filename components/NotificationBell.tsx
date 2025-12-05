import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { Notification } from '../types';

interface NotificationBellProps {
    notifications: Notification[];
    onRead: (id: string) => void;
    onNavigate: (ticketId: string) => void;
    currentUserId?: string; // To possibly format formatting like "You" vs Name
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onRead, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (n: Notification) => {
        if (!n.is_read) {
            onRead(n.id);
        }
        onNavigate(n.ticket_id);
        setIsOpen(false);
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'ASSIGN': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
            case 'COMMENT': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
            case 'STATUS': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
            default: return 'text-gray-500 bg-gray-50';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 transition-colors"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden z-[100] animate-fade-in">
                    <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full font-bold">
                                {unreadCount} New
                            </span>
                        )}
                    </div>

                    <div className="max-h-[320px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleItemClick(n)}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors relative group ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                    >
                                        {!n.is_read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
                                        )}
                                        <div className="flex gap-3">
                                            {/* Icon could be dynamic based on type */}
                                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-brand-500' : 'bg-transparent'}`}></div>

                                            <div className="flex-1">
                                                <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                    {n.message}
                                                </p>
                                                <div className="flex items-center mt-1.5 space-x-2">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-transparent ${getIconColor(n.type)}`}>
                                                        {n.type}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {n.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
