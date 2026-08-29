import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./NewBoardForm.module.css";
import { useCreateBoard } from "../../hooks/useCreateBoard";
import { Button } from "@/components/ui/button";

export default function NewBoardForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", description: "" });

  const createBoard = useCreateBoard();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBoard.mutate(formData, {
      onSuccess: () => navigate("/"),
    });
  };

  return (
    <div className={styles.page}>
    <div className={styles.NewBoardForm}>
      <div className={styles.header}>
        <h2>New Board</h2>
        <Button variant="ghost" onClick={() => navigate("/")}>Close</Button>
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Board name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
        />
        <Button type="submit" disabled={createBoard.isPending}>
          {createBoard.isPending ? "Creating…" : "Create"}
        </Button>
      </form>
    </div>
    </div>
  );
}
