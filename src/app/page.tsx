"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing/landing-page";

export default function Page() {
  const [view, setView] = useState<"landing" | "workbench">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "workbench" || params.get("view") === "app") {
        return "workbench";
      }
    }
    return "landing";
  });
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();

  const handleEnterWorkbench = (prompt?: string) => {
    if (prompt) {
      setInitialPrompt(prompt);
    }
    setView("workbench");
  };

  if (view === "workbench") {
    return <AppShell initialPrompt={initialPrompt} />;
  }

  return <LandingPage onEnterWorkbench={handleEnterWorkbench} />;
}
