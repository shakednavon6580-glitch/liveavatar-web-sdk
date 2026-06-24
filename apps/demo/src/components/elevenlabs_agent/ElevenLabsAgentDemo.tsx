"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Setup } from "./Setup";
import { SessionView } from "./SessionView";
import { ElevenLabsAgentProvider } from "./context";

export const ElevenLabsAgentDemo = () => {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState("");
  const [sessionApiUrl, setSessionApiUrl] = useState<string | undefined>();

  const handleStop = () => {
    setSessionToken("");
    setSessionApiUrl(undefined);
  };

  const handleSessionStarted = (sessionToken: string, apiUrl?: string) => {
    setSessionToken(sessionToken);
    setSessionApiUrl(apiUrl);
  };

  if (!sessionToken) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Setup
          onSessionStarted={handleSessionStarted}
          onBack={() => router.push("/")}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <ElevenLabsAgentProvider
        sessionAccessToken={sessionToken}
        apiUrl={sessionApiUrl}
      >
        <SessionView onSessionStopped={handleStop} />
      </ElevenLabsAgentProvider>
    </div>
  );
};
