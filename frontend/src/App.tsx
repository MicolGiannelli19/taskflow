import { Outlet } from "react-router-dom";
import "./App.css";

/** Root layout: the shell every route renders inside. */
export default function App() {
  return (
    <div className="App">
      <Outlet />
    </div>
  );
}
