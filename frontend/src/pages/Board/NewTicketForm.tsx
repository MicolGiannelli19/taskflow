import { useState } from "react";
import styles from "./NewTicketForm.module.css";
import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import type { TicketFormData } from "../../types";
import { Button } from "@/components/ui/button";

interface BoardOutletContext {
  handleNewTicket: (formData: TicketFormData) => void;
}

// Maybe this should be within a modal not a new page
export default function NewTicketForm() {
  const { handleNewTicket: handleSubmit } = useOutletContext<BoardOutletContext>();
  const navigate = useNavigate();
  const { boardId } = useParams();
  const [formData, setFormData] = useState<TicketFormData>({
    column_id: "",
    title: "",
    description: "",
    priority: undefined,
    due_date: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

  };

  return (
    <div className={styles.NewTicketForm}>
      <div className={styles.header}>
        <h1>New Ticket</h1>

        <Button variant="ghost" onClick={() => navigate(`/board/${boardId}`)}>Close</Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(formData);
        }}
      >
        <input
          type="text"
          name="title"
          placeholder="title"
          value={formData.title}
          onChange={handleChange}
        />
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          cols={50}
        />
          <input
          type="date"
          name="due_date"
          value={formData.due_date ?? ""}
          onChange={handleChange}
        />

        <select
          name="priority"
          value={formData.priority}
          onChange={handleChange}
        >
          <option value="">Select priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <Button type="submit">Submit</Button>
      </form>
    </div>
  );
}
