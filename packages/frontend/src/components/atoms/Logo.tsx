import React from 'react';
import mobileLogo from "../../assets/brandbook/mobile-logo.png";
import mobileLogoWhite from "../../assets/brandbook/mobile-white.png";
import { useTheme } from "../../hooks/useTheme";
import { BaseAtomProps } from '../../utils/types';

type LogoProps = BaseAtomProps;

/**
 * Logo component that handles dark/light mode
 */
const Logo: React.FC<LogoProps> = ({
    className,
    'data-testid': dataTestId = 'logo'
}) => {
    const { isDark } = useTheme();

    return (
        <img
            src={isDark ? mobileLogoWhite : mobileLogo}
            alt="BlueLight Hub"
            className={className}
            data-testid={dataTestId}
        />
    );
};

export default Logo; 