import React from 'react';

// Import SVG icons as URLs
import openaiIcon from '../assets/icons/openai.svg';
import anthropicIcon from '../assets/icons/anthropic.svg';
import geminiIcon from '../assets/icons/gemini.svg';
import grokIcon from '../assets/icons/grok.svg';
import mistralIcon from '../assets/icons/mistral.svg';

interface ProviderIconProps {
    providerId?: string;
    className?: string;
}

const ProviderIcon: React.FC<ProviderIconProps> = ({ providerId, className = "w-4 h-4" }) => {
    const getIcon = (id?: string) => {
        switch (id?.toLowerCase()) {
            case 'openai': return <img src={openaiIcon} alt="OpenAI" className="w-full h-full" />;
            case 'anthropic': return <img src={anthropicIcon} alt="Anthropic" className="w-full h-full" />;
            case 'gemini': return <img src={geminiIcon} alt="Gemini" className="w-full h-full" />;
            case 'grok': return <img src={grokIcon} alt="Grok" className="w-full h-full" />;
            case 'mistral': return <img src={mistralIcon} alt="Mistral" className="w-full h-full" />;
            case 'mock':
                return (
                    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                        <rect x="9" y="9" width="6" height="6"></rect>
                    </svg>
                );
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <circle cx="12" cy="12" r="4"></circle>
                    </svg>
                );
        }
    };

    return (
        <div className={className}>
            {getIcon(providerId)}
        </div>
    );
};

export default ProviderIcon;
