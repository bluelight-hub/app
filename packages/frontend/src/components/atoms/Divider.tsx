import React from 'react';
import { twMerge } from 'tailwind-merge';
/**
 * Eine einfache Trennlinie für visuelle Separation von Inhalten
 */
const Divider: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={twMerge(`border-t border-gray-800/10 dark:border-gray-200/10 my-3`, className)}></div>
    );
};

export default Divider; 