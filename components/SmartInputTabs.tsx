import React from 'react';
import { Camera, Upload, Video } from 'lucide-react';

export type SmartInputTab = 'image' | 'upload-video' | 'record-video';

interface SmartInputTabsProps {
    activeTab: SmartInputTab;
    onTabChange: (tab: SmartInputTab) => void;
}

export const SmartInputTabs: React.FC<SmartInputTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="flex justify-center mb-6">
            <div className="bg-white/10 p-1 rounded-xl inline-flex relative">
                {/* Sliding Background Indicator */}
                <div
                    className={`absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300 ease-out
                    ${activeTab === 'image' ? 'left-1 w-[140px]' : ''}
                    ${activeTab === 'upload-video' ? 'left-[145px] w-[150px]' : ''}
                    ${activeTab === 'record-video' ? 'left-[300px] w-[150px]' : ''}
                    `}
                />

                <button
                    onClick={() => onTabChange('image')}
                    className={`relative z-10 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold transition-colors w-[140px]
                    ${activeTab === 'image' ? 'text-indigo-600' : 'text-white/70 hover:text-white'}
                    `}
                >
                    <Camera className="w-4 h-4 mr-2" /> Screenshot
                </button>

                <button
                    onClick={() => onTabChange('upload-video')}
                    className={`relative z-10 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold transition-colors w-[150px]
                    ${activeTab === 'upload-video' ? 'text-indigo-600' : 'text-white/70 hover:text-white'}
                    `}
                >
                    <Upload className="w-4 h-4 mr-2" /> Upload Video
                </button>

                <button
                    onClick={() => onTabChange('record-video')}
                    className={`relative z-10 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold transition-colors w-[150px]
                    ${activeTab === 'record-video' ? 'text-red-500' : 'text-white/70 hover:text-white'}
                    `}
                >
                    <Video className="w-4 h-4 mr-2" /> Record Screen
                </button>
            </div>
        </div>
    );
};
