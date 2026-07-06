"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Read theme from localStorage or document attribute on mount
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const current = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
      if (current) {
        setTheme(current);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      className="rounded-lg p-2 hover:bg-card-border/30 transition-colors relative h-9 w-9 flex items-center justify-center"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-muted hover:text-foreground transition-colors" />
      ) : (
        <Moon className="h-5 w-5 text-muted hover:text-foreground transition-colors" />
      )}
    </Button>
  );
}
