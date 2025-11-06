import Board from "./components/board"; // capitalize to match file name
import "./App.css";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Board></Board>} />
      </Routes>
    </div>
  );
}

export default App;
