import React from 'react';
import { NodeIcon } from './node-icon';

interface N8NPulseLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRings?: boolean;
  className?: string;
}

/**
 * Reusable n8n pulse loader component
 * Used in hero card and discovery phase
 */
export function N8NPulseLoader({ 
  size = 'lg', 
  showRings = false,
  className = ''
}: N8NPulseLoaderProps) {
  // Size mappings
  const sizes = {
    sm: { container: 'w-12 h-12', icon: 'md' as const },
    md: { container: 'w-16 h-16', icon: 'lg' as const },
    lg: { container: 'w-20 h-20', icon: 'xl' as const },
    xl: { container: 'w-24 h-24', icon: 'xl' as const }
  };

  const { container, icon } = sizes[size];

  return (
    <div className={`relative ${className}`}>
      <div className={`${container} bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 animate-pulse-slow`}>
        <NodeIcon name="n8n" size={icon} />
      </div>
      
      {/* Optional pulse rings */}
      {showRings && (
        <>
          <div className={`absolute inset-0 ${container} rounded-full border-2 border-emerald-400/30 animate-ping`}></div>
          <div className={`absolute inset-0 ${container} rounded-full border-2 border-emerald-400/20 animate-ping`} style={{ animationDelay: '0.5s' }}></div>
        </>
      )}
    </div>
  );
}