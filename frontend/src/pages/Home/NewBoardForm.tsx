import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./NewBoardForm.module.css";
import instance from "../../api/axios";

export default function NewBoardForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: "", description: "" });

  const createBoard = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      instance.post("/boards", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate("/");
    },
    onError: (err) => console.error("failed to create board:", err),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBoard.mutate(formData);
  };

  return (
    <div className={styles.page}>
    <div className={styles.NewBoardForm}>
      <div className={styles.header}>
        <h2>New Board</h2>
        <button onClick={() => navigate("/")}>Close</button>
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
        <button type="submit" disabled={createBoard.isPending}>
          {createBoard.isPending ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
    </div>
  );
}
