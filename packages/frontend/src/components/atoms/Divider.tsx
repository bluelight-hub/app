import React from 'react';
import { twMerge } from 'tailwind-merge';
import { BaseAtomProps } from '../../utils/types';

/**
 * Eine einfache Trennlinie für visuelle Separation von Inhalten
 */
type DividerProps = BaseAtomProps;

const Divider: React.FC<DividerProps> = ({
    className,
    'data-testid': dataTestId = 'divider'
}) => {
    return (
        <div
            data-testid={dataTestId}
            className={twMerge(`border-t border-gray-800/10 dark:border-gray-200/10 my-3`, className)}
        ></div>
    );
};

export default Divider; 