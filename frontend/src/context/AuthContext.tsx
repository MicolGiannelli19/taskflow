import { UserType } from "../types";
import { createContext } from "react";

interface AuthContextType {
    user: UserType | null;
    login: (user: UserType, token: string) => void;
    logout: () => void;
    isLoading: boolean;
  }

const AuthContext = createContext<AuthContextType | null>(null);