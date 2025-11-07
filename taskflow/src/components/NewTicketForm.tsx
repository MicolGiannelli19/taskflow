// import { useState } from "react";

import { useState } from "react";
import styles from "./NewTicketForm.module.css";
import { Link } from "react-router-dom";

interface NewTicketFormProps {
  handleSubmit: () => void;
}

export default function NewTicketForm({ handleSubmit }: NewTicketFormProps) {
  // const [newTitle, setNewTitle] = useState("")
  interface TicketFormData {
    title: string;
    description: string;
    priority: string;
    date: string;
  }
  const [formData, setFormData] = useState<TicketFormData>({
    title: "",
    description: "",
    priority: "",
    date: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.NewTicketForm}>
      <div className={styles.header}>
        <h1>Form</h1>

        <Link to="/">
          <button>Close</button>
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          placeholder="title"
          value={formData.title}
          onChange={handleChange}
        />
        <input
          type="text"
          placeholder="description"
          value={formData.description}
          onChange={handleChange}
        />
        {/* <input 
        type="date"
        value={formData.date}
        onChange={handleChange} /> */}
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
