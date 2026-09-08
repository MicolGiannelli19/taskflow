import type { UserType } from "../types";
import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserType | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            const { exp } = JSON.parse(atob(token.split('.')[1]));
            if (exp * 1000 > Date.now()) {
                setUser(JSON.parse(savedUser));
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false)
    }, [])

    const login = (user: UserType, token: string) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token)
        setUser(user)
    }

    // The sidebar reads its name and avatar from here, so an edited profile has
    // to land in the cache too or it reverts on the next reload.
    const updateUser = (user: UserType) => {
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user)
    }

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, login, updateUser, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}
