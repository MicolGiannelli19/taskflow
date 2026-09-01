import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LogInForm from "@/components/LogInForm";
import instance from "@/api/axios";
import { useAuth } from "@/hooks/useAuth";
import { paths } from "@/routes";
import type { LogInFromData, UserType } from "@/types";

/** Login route: owns the auth call; LogInForm stays a presentational form. */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogIn = async (logInDetails: LogInFromData) => {
    setLoginError(null);

    // OAuth2PasswordRequestForm expects x-www-form-urlencoded `username`/`password`.
    const formData = new URLSearchParams();
    formData.append("username", logInDetails.email);
    formData.append("password", logInDetails.password);

    try {
      const { data } = await instance.post("/auth/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      // Persist the token first so the request interceptor attaches it to /auth/me.
      localStorage.setItem("token", data.access_token);
      const { data: currentUser } = await instance.get<UserType>("/auth/me");
      login(currentUser, data.access_token);
      navigate(paths.home);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setLoginError("Incorrect email or password");
      } else {
        setLoginError("Something went wrong. Please try again.");
      }
      console.error("login failed:", error);
    }
  };

  return <LogInForm handleLogIn={handleLogIn} error={loginError} />;
}
