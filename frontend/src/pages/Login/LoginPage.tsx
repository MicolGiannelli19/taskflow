import { SignIn } from "@clerk/react";
import { useLocation } from "react-router-dom";
import { paths } from "@/routes";

/**
 * Sign-in route. Clerk's component owns the form, validation and error
 * states — TaskFlow only decides where to land afterwards.
 */
export default function LoginPage() {
  const location = useLocation();
  // RequireAuth stashes the page the user was denied; send them back there
  // once they're through.
  const from = (location.state as { from?: { pathname: string } } | null)?.from;

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <SignIn
        routing="path"
        path={paths.login}
        signUpUrl={paths.signUp}
        forceRedirectUrl={from?.pathname ?? paths.home}
      />
    </div>
  );
}
