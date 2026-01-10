// import { useState } from "react";

import { useState} from "react";
import styles from "./NewTicketForm.module.css";
import { Link } from "react-router-dom";
import type { TicketFormData } from "../types";
interface NewTicketFormProps {
  handleSubmit: (formData: TicketFormData) => void;
}

export default function NewTicketForm({ handleSubmit }: NewTicketFormProps) {
  // const [newTitle, setNewTitle] = useState("")
  const [formData, setFormData] = useState<TicketFormData>({
    title: "",
    description: "",
    priority: undefined,
    date: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(formData);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

  };

  return (
    <div className={styles.NewTicketForm}>
      <div className={styles.header}>
        <h1>New Ticket</h1>

        <Link to="/">
          <button>Close</button>
        </Link>
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
          rows={4}        // optional: control height
          cols={50}       // optional: control width
        />
          <input
          type="date"
          name="date"
          value={formData.date}
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

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
