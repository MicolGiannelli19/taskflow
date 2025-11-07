// import { useState } from "react";

import { useState } from "react";

interface NewTicketFormProps {
  handleSubmit: () => void;
}

export default function NewTicketForm({ handleSubmit }: NewTicketFormProps) {
  // const [newTitle, setNewTitle] = useState("")
  const [newTitle, setNewTitle] = useState("");

  const handleNewTitle = (title: string) => {
    console.log(title);
    setNewTitle("");
  };
  return (
    <div>
      <h1>Form review how to make forms in react</h1>
      <form
        action="submit"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          value={newTitle}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            handleNewTitle(event.target.value)
          }
        />
      </form>
    </div>
  );
}
