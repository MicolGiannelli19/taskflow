import Board from "./pages/Board/Board";
import NewTicketForm from "./pages/Board/NewTicketForm";
import Home from "./pages/Home/Home";
import LogInForm from "./components/LogInForm";
import "./App.css";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import type { LogInFromData } from "./types";
import instance from "./api/axios";
import { useAuth } from "./hooks/useAuth";

function App() {
  const navigate = useNavigate();
  const { user, isLoading, login } = useAuth();

  // const handleLogIn = async (logInDetails: LogInFromData) => {
  const handleLogIn = async () => {
    const formData = new URLSearchParams();

    const mockemail = "user@example.com";
    const mockpassword = "string";

    formData.append("username", mockemail);
    formData.append("password", mockpassword);

    try {
      const { data } = await instance.post("/auth/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const mockUser = { id: "mock", email: mockemail, name: null, avatar: null, created_at: new Date().toISOString() };
      login(mockUser, data.access_token);
      navigate("/");
      console.log("Login Successfull")
    } catch (error) {
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
        <Route path="/login" element={<LogInForm handleLogIn={handleLogIn} />} />
        <Route path="/board/:boardId" element={user ? <Board /> : <Navigate to="/login" replace />}>
          <Route path="new-ticket" element={<NewTicketForm />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
