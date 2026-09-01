import Board from "./pages/Board/Board";
import NewTicketForm from "./pages/Board/NewTicketForm";
import Home from "./pages/Home/Home";
import NewBoardForm from "./pages/Home/NewBoardForm";
import ComingSoon from "./pages/ComingSoon";
import LogInForm from "./components/LogInForm";
import "./App.css";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { useState } from "react";
import instance from "./api/axios";
import { useAuth } from "./hooks/useAuth";
import type { LogInFromData, UserType } from "./types";

function App() {
  const navigate = useNavigate();
  const { user, isLoading, login } = useAuth();
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
      navigate("/");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setLoginError("Incorrect email or password");
      } else {
        setLoginError("Something went wrong. Please try again.");
      }
      console.error("login failed:", error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="/new-board" element={user ? <NewBoardForm /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<LogInForm handleLogIn={handleLogIn} error={loginError} />} />
        <Route path="/board/:boardId" element={user ? <Board /> : <Navigate to="/login" replace />}>
          <Route path="new-ticket" element={<NewTicketForm />} />
        </Route>
        <Route
          path="/board/:boardId/history"
          element={user ? <ComingSoon title="Board history" /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/board/:boardId/settings"
          element={user ? <ComingSoon title="Board settings" /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={user ? <ComingSoon title="Profile" /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
