import type { UserType } from "../types";
import { createContext } from "react";

export interface AuthContextType {
    user: UserType | null;
    login: (user: UserType, token: string) => void;
    /** Replaces the cached user without touching the token — for profile edits. */
    updateUser: (user: UserType) => void;
    logout: () => void;
    isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);
