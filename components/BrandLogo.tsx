import React from 'react';

interface BrandLogoProps {
    name: string;
    logoUrl?: string | null;
    className?: string;
    isCollapsed?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ name, logoUrl, className = '', isCollapsed = false }) => {
    if (logoUrl) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <img
                    src={logoUrl}
                    alt={`${name} Logo`}
                    className="object-contain h-10 w-auto max-w-[150px]"
                />
                {/* 
                   If we have a real logo URL, usually it contains the text. 
                   But if the user wants "app name ... on the top left" even if logo is present, 
                   we might want to be careful. Usually logos include text.
                   However, the fallback path DEFINITELY needs the text.
                   For now, let's assume if logoUrl is present, it's the full logo (icon + text).
                   BUT, the user just said "If no logo is selected... default to just a letter AND the app name... should appear".
                   This implies the text is vital for the fallback.
                   I will add the text to the fallback path specifically. 
                   For the image path, I'll implicitly trust the image or add text if needed? 
                   Standard practice: Image replaces everything. Fallback replaces Image.
                */}
            </div>
        );
    }

    // Fallback: Gradient box with first letter (User requested "just a letter")
    const initial = (name || "A").charAt(0).toUpperCase();

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg rounded-lg w-10 h-10 flex-shrink-0">
                {initial}
            </div>
            {!isCollapsed && (
                <span className="font-bold text-lg tracking-tight truncate opacity-100 transition-opacity duration-300">
                    {name}
                </span>
            )}
        </div>
    );
};
