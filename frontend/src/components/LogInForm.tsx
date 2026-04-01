
// interface LogInFormProps{
//     email: string;
//     password: string;
// }

import { useState } from "react"

// This is a Controlled form example
// this is wrong email 
interface LogInFormProps(
    handleLogIn: (FormData: loginFormData) => void;
)
export defualt function LogInForm({handleLogIn}: LogInFormProps){

    const [FormData, setFromData] = useState()

    return <div>
    <p>email</p>
    <p>password</p>
    </div>

}