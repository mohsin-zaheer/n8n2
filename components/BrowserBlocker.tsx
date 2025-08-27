'use client';

import { useEffect, useState } from 'react';

interface BrowserInfo {
  name: string;
  version: number;
  isSupported: boolean;
}

const MINIMUM_VERSIONS = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
  opera: 76,
};

export function BrowserBlocker() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const detectBrowser = (): BrowserInfo => {
      const userAgent = navigator.userAgent;
      
      // Chrome
      if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        const match = userAgent.match(/Chrome\/(\d+)/);
        const version = match ? parseInt(match[1]) : 0;
        return {
          name: 'Chrome',
          version,
          isSupported: version >= MINIMUM_VERSIONS.chrome
        };
      }
      
      // Edge
      if (userAgent.includes('Edg')) {
        const match = userAgent.match(/Edg\/(\d+)/);
        const version = match ? parseInt(match[1]) : 0;
        return {
          name: 'Edge',
          version,
          isSupported: version >= MINIMUM_VERSIONS.edge
        };
      }
      
      // Firefox
      if (userAgent.includes('Firefox')) {
        const match = userAgent.match(/Firefox\/(\d+)/);
        const version = match ? parseInt(match[1]) : 0;
        return {
          name: 'Firefox',
          version,
          isSupported: version >= MINIMUM_VERSIONS.firefox
        };
      }
      
      // Safari
      if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        const match = userAgent.match(/Version\/(\d+)/);
        const version = match ? parseInt(match[1]) : 0;
        return {
          name: 'Safari',
          version,
          isSupported: version >= MINIMUM_VERSIONS.safari
        };
      }
      
      // Opera
      if (userAgent.includes('OPR')) {
        const match = userAgent.match(/OPR\/(\d+)/);
        const version = match ? parseInt(match[1]) : 0;
        return {
          name: 'Opera',
          version,
          isSupported: version >= MINIMUM_VERSIONS.opera
        };
      }
      
      // Unknown or very old browser
      return {
        name: 'Unknown',
        version: 0,
        isSupported: false
      };
    };

    const info = detectBrowser();
    setBrowserInfo(info);
    setShowWarning(!info.isSupported);
  }, []);

  if (!showWarning || !browserInfo) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Browser Not Supported
            </h3>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-3">
            Your browser ({browserInfo.name} {browserInfo.version}) is not supported. 
            This application requires a modern browser for optimal performance and security.
          </p>
          
          <p className="text-sm text-gray-700 mb-3">
            Please update to one of these supported browsers:
          </p>
          
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Chrome {MINIMUM_VERSIONS.chrome}+</li>
            <li>• Firefox {MINIMUM_VERSIONS.firefox}+</li>
            <li>• Safari {MINIMUM_VERSIONS.safari}+</li>
            <li>• Edge {MINIMUM_VERSIONS.edge}+</li>
            <li>• Opera {MINIMUM_VERSIONS.opera}+</li>
          </ul>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowWarning(false)}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Continue Anyway
          </button>
          <a
            href="https://browsehappy.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors text-center"
          >
            Update Browser
          </a>
        </div>
      </div>
    </div>
  );
}
