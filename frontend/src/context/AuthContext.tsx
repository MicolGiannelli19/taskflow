import type { UserType } from "../types";
import { createContext, useState, useEffect } from "react";

export interface AuthContextType {
    user: UserType | null;
    login: (user: UserType, token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({children} : {children: React.ReactNode}){
    const [user, setUser] = useState<UserType | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(
        () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            if (token && savedUser){
                setUser(JSON.parse(savedUser));
            }
            setIsLoading(false)
        },
        []
    )

    const login = (user: UserType, token : string) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token)
        setUser(user)
    }

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null)

    }

      return (                                                                                                                                                                                   
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>                                                                                                                          
      {children}                                                                                                                                                                             
    </AuthContext.Provider>
    );

}

