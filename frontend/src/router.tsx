import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import AppLayout from "./components/layout/AppLayout";
import RequireAuth from "./components/RequireAuth";
import Board from "./pages/Board/Board";
import NewTicketForm from "./pages/Board/NewTicketForm";
import TicketPage from "./pages/Board/TicketPage";
import Home from "./pages/Home/Home";
import NewBoardForm from "./pages/Home/NewBoardForm";
import LoginPage from "./pages/Login/LoginPage";
import SignUpPage from "./pages/Login/SignUpPage";
import ComingSoon from "./pages/ComingSoon";
import BoardSettings from "./pages/Board/Settings/BoardSettings";
import ProfilePage from "./pages/Profile/ProfilePage";
import { routePatterns } from "./routes";

/**
 * The app's route tree. Paths come from `routes.ts`. Everything behind
 * `RequireAuth` needs a signed-in user and renders inside `AppLayout`
 * (sidebar + top bar); sign-in and sign-up are the pages with no app shell.
 */
export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: routePatterns.login, element: <LoginPage /> },
      { path: routePatterns.signUp, element: <SignUpPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: routePatterns.home, element: <Home /> },
              { path: routePatterns.newBoard, element: <NewBoardForm /> },
              {
                path: routePatterns.board,
                element: <Board />,
                // Renders as a Dialog over the board.
                children: [
                  { path: routePatterns.newTicket, element: <NewTicketForm /> },
                ],
              },
              { path: routePatterns.ticket, element: <TicketPage /> },
              {
                path: routePatterns.boardHistory,
                element: <ComingSoon title="Board history" />,
              },
              { path: routePatterns.boardSettings, element: <BoardSettings /> },
              { path: routePatterns.profile, element: <ProfilePage /> },
            ],
          },
        ],
      },
    ],
  },
]);
