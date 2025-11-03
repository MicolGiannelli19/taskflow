import Board from "./components/board"; // capitalize to match file name
import "./App.css";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Board></Board>} />
    </Routes>
  );
}

export default App;
