import React from 'react';

interface BrandLogoProps {
    name: string;
    tagline?: string;
    logoUrl?: string | null;
    className?: string;
    isCollapsed?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ name, tagline, logoUrl, className = '', isCollapsed = false }) => {
    if (logoUrl) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <img
                    src={logoUrl}
                    alt={`${name} Logo`}
                    className="object-contain h-10 w-auto max-w-[150px]"
                />
            </div>
        );
    }

    // Fallback: Gradient box with first letter
    const initial = (name || "A").charAt(0).toUpperCase();

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg rounded-lg w-10 h-10 flex-shrink-0">
                {initial}
            </div>
            {!isCollapsed && (
                <div className="flex flex-col animate-fade-in">
                    <span className="font-bold text-lg tracking-tight leading-tight text-white/90">
                        {name}
                    </span>
                    {tagline && (
                        <span className="text-xs text-white/60 font-medium tracking-wide leading-tight">
                            {tagline}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
