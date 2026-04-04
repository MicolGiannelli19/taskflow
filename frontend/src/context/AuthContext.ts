import type { UserType } from "../types";
import { createContext } from "react";

export interface AuthContextType {
    user: UserType | null;
    login: (user: UserType, token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);
