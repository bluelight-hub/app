import React from 'react';
import mobileLogo from "../../assets/brandbook/mobile-logo.png";
import mobileLogoWhite from "../../assets/brandbook/mobile-white.png";
import { useTheme } from "../../hooks/useTheme";

interface LogoProps {
    className?: string;
}

/**
 * Logo component that handles dark/light mode
 */
const Logo: React.FC<LogoProps> = ({ className }) => {
    const { isDark } = useTheme();

    return (
        <img
            src={isDark ? mobileLogoWhite : mobileLogo}
            alt="BlueLight Hub"
            className={className}
        />
    );
};

export default Logo; 