import { useState } from "react";
import { LogOut } from "lucide-react";
import { supabaseBrowser } from "@/db/supabase.browser";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await supabaseBrowser.auth.signOut();
      // Redirect to login page after successful logout
      window.location.href = "/login";
    } catch {
      // Silent fail - just stop loading state
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoading}
      variant="ghost"
      size="icon"
      aria-label="Wyloguj się"
      data-testid="logout-button"
    >
      {/* {isLoading ? "Wylogowywanie..." : "Wyloguj się"} */}
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
