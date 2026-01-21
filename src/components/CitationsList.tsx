import React from 'react';
import { Citation } from '../types';

interface CitationsListProps {
  citations: Citation[];
}

const CitationsList: React.FC<CitationsListProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null;

  // De-duplicate citations by URL
  const uniqueCitations = citations.reduce((acc: Citation[], current) => {
    const x = acc.find(item => item.url === current.url);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  // Function to get high-res favicon if possible
  const getFavicon = (url: string) => {
    try {
      if (!url) return null;
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
      return null;
    }
  };

  const truncateTitle = (title: string, url: string) => {
    if (title) return title;
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url || 'Source';
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex -space-x-2 overflow-hidden">
          {uniqueCitations.slice(0, 5).map((citation, i) => (
            <img
              key={i}
              className="inline-block h-5 w-5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-white"
              src={getFavicon(citation.url) || ''}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3C/svg%3E';
              }}
            />
          ))}
          {uniqueCitations.length > 5 && (
            <div className="flex items-center justify-center h-5 w-5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-100 dark:bg-gray-700 text-[10px] font-medium text-gray-500">
              +{uniqueCitations.length - 5}
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sources</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {uniqueCitations.map((citation, index) => (
          <a
            key={index}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-900/60 border border-gray-100 dark:border-gray-700/30 transition-all group max-w-[200px]"
            title={citation.title || citation.url}
          >
            <img
              src={getFavicon(citation.url) || ''}
              className="w-3.5 h-3.5 rounded-sm opacity-80 group-hover:opacity-100 transition-opacity"
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {truncateTitle(citation.title, citation.url)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CitationsList;
