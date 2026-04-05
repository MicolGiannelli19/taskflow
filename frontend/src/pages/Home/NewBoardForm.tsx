import { useState } from "react";
import styles from "./NewBoardForm.module.css";
import instance from "../../api/axios";
import { useNavigate } from "react-router-dom";

export default function NewBoardForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await instance.post("/boards", formData);
      navigate("/");
    } catch (err) {
      console.error("failed to create board:", err);
    }
  };

  return (
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
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
