import type { LogInFromData } from "../types";
import styles from "./LogInForm.module.css";
import { useState } from "react"
import { Button } from "@/components/ui/button"

// This is a Controlled form example
// this is wrong email 
interface LogInFormProps {
    handleLogIn: (FormData: LogInFromData) => void;
    error?: string | null;
}

export default function LogInForm({handleLogIn, error}: LogInFormProps){

    const [formData, setFromData] = useState<LogInFromData>({
        email: "",
        password: "",
        });
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        
        // I am slightly confused about this line 
        const {name, value} = e.target

        setFromData( (prev) => ({
            ...prev,
            [name]:value,
        }));

    }

    // NOTE: handle change is passed in automatically below
    return (<div className={styles.page}>
        <h1>LOG IN PAGE</h1>
        <form onSubmit={(e) =>{
            e.preventDefault()
            handleLogIn(formData)
            }
        }>
            <input type="text" 
            name="email"
            placeholder="email"
            value={formData.email}
            onChange={handleInputChange}/> 
            <input type="password"
            name="password"
            placeholder="password"
            value={formData.password}
            onChange={handleInputChange}/>
            <Button type="submit">Log In</Button>
        </form>
    </div>
    )

}