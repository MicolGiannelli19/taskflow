import { Link } from "react-router-dom";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComingSoonProps {
  title: string;
}

// Placeholder for sidebar destinations that aren't built yet.
export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        minHeight: "60vh",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <Construction size={48} aria-hidden />
      <h1>{title}</h1>
      <p style={{ color: "var(--muted-foreground, #6b7280)" }}>
        Feature set to be implemented.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Back to boards</Link>
      </Button>
    </div>
  );
}
