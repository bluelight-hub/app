import React, { createContext, ReactNode, useEffect, useState } from 'react';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

// Mock-User für Entwicklungszwecke
const MOCK_USER: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
};

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simuliere das Laden des Benutzers beim ersten Rendern
        const token = localStorage.getItem('auth_token');
        if (token) {
            // In einer realen Anwendung würden wir hier den Token verifizieren
            setUser(MOCK_USER);
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);

        // Simuliere API-Aufruf mit Verzögerung
        return new Promise<boolean>((resolve) => {
            setTimeout(() => {
                // Mock-Authentifizierung - in der Produktion würde hier ein echter API-Aufruf stehen
                if (email === 'test@example.com' && password === 'password') {
                    setUser(MOCK_USER);
                    localStorage.setItem('auth_token', 'mock_jwt_token');
                    setIsLoading(false);
                    resolve(true);
                } else {
                    setIsLoading(false);
                    resolve(false);
                }
            }, 1000);
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auth_token');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext; 