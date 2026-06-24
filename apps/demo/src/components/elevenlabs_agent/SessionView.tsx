"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { SessionState } from "@heygen/liveavatar-web-sdk";
import { ElevenLabsInboundEvent, useElevenLabsAgentContext } from "./context";

const Btn: React.FC<{
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  children: React.ReactNode;
}> = ({ onClick, disabled, variant = "secondary", size = "md", children }) => {
  const sizes = { sm: "px-4 py-2 text-sm", md: "px-5 py-2.5 text-sm" };
  const variants = {
    primary: "bg-white text-black hover:bg-gray-100 active:bg-gray-200",
    secondary:
      "bg-white/10 text-white border border-white/10 hover:bg-white/15 active:bg-white/20",
    danger:
      "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:bg-red-500/30",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]}`}
    >
      {children}
    </button>
  );
};

type Props = { onSessionStopped: () => void };

const formatTimestamp = (timestamp: number | null) => {
  if (!timestamp) return "n/a";
  return new Date(timestamp).toLocaleTimeString();
};

const formatElapsed = (timestamp: number | null, now: number) => {
  if (!timestamp) return "n/a";
  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds < 60) return `${elapsedSeconds}s`;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const getPcm24000Status = (hasPcm24000Metadata: boolean | null) => {
  if (hasPcm24000Metadata === null) return "unknown";
  return hasPcm24000Metadata ? "present" : "missing";
};

const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

const DebugRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-gray-500">{label}</span>
    <span className="text-right text-gray-200 break-all">{value}</span>
  </div>
);

const EventLog = React.memo(function EventLog({
  events,
  eventLogEndRef,
}: {
  events: ElevenLabsInboundEvent[];
  eventLogEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 font-mono text-[11px]"
      style={{ scrollbarWidth: "none" }}
    >
      {events.length === 0 && (
        <p className="text-gray-500 text-center mt-8">
          Inbound elevenlabs_agent_event payloads will stream here
        </p>
      )}
      {events.map((evt, idx) => (
        <div
          key={`${evt.event_id}-${evt.receivedAt}-${idx}`}
          className="px-2 py-1.5 rounded bg-black/40 border border-white/5 text-gray-300"
        >
          <div className="text-purple-300 font-semibold">
            {evt.elevenlabs_event_type}
          </div>
          <pre className="whitespace-pre-wrap break-all text-gray-400 mt-0.5">
            {JSON.stringify(evt.data, null, 2)}
          </pre>
        </div>
      ))}
      <div ref={eventLogEndRef} />
    </div>
  );
});

export const SessionView: React.FC<Props> = ({ onSessionStopped }) => {
  const {
    sessionRef,
    sessionState,
    isStreamReady,
    connectionQuality,
    isUserTalking,
    isAvatarTalking,
    inboundEvents,
    sessionDebug,
    voiceChatState,
  } = useElevenLabsAgentContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const eventLogEndRef = useRef<HTMLDivElement>(null);
  const connectedAtRef = useRef<number | null>(null);
  const noEventsWarningRef = useRef(false);
  const missingPcmWarningRef = useRef(false);
  const repeatedErrorWarningAtRef = useRef<number | null>(null);

  const [userText, setUserText] = useState("");
  const [contextText, setContextText] = useState("");
  const [activityPing, setActivityPing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [browserInfo, setBrowserInfo] = useState("n/a");
  const [snapshotCopied, setSnapshotCopied] = useState(false);
  const snapshotCopiedTimeoutRef = useRef<number | null>(null);

  // Lifecycle: start once on mount, react to disconnect
  useEffect(() => {
    if (sessionState === SessionState.INACTIVE) {
      sessionRef.current.start();
    }
  }, [sessionRef, sessionState]);

  useEffect(() => {
    if (sessionState === SessionState.DISCONNECTED) {
      onSessionStopped();
    }
  }, [sessionState, onSessionStopped]);

  useEffect(() => {
    if (sessionState === SessionState.CONNECTED && !connectedAtRef.current) {
      connectedAtRef.current = Date.now();
      noEventsWarningRef.current = false;
    }

    if (sessionState !== SessionState.CONNECTED) {
      connectedAtRef.current = null;
      noEventsWarningRef.current = false;
    }
  }, [sessionState]);

  useEffect(() => {
    if (isStreamReady && videoRef.current) {
      sessionRef.current.attach(videoRef.current);
    }
  }, [isStreamReady, sessionRef]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const browserNavigator = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const browserParts = [
      browserNavigator.userAgentData?.platform ?? navigator.platform,
      navigator.language,
      navigator.userAgent.includes("Chrome")
        ? "Chrome"
        : navigator.userAgent.includes("Safari")
          ? "Safari"
          : navigator.userAgent.includes("Firefox")
            ? "Firefox"
            : "Browser",
    ].filter(Boolean);

    setBrowserInfo(browserParts.join(" / "));
  }, []);

  useEffect(() => {
    return () => {
      if (snapshotCopiedTimeoutRef.current) {
        window.clearTimeout(snapshotCopiedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    eventLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inboundEvents]);

  useEffect(() => {
    if (sessionDebug.eventCount > 0) {
      noEventsWarningRef.current = false;
      return;
    }

    if (
      sessionState === SessionState.CONNECTED &&
      connectedAtRef.current &&
      now - connectedAtRef.current > 30_000 &&
      !noEventsWarningRef.current
    ) {
      console.warn(
        "[ElevenLabs Debug] Session is CONNECTED but no inbound ElevenLabs events have arrived for 30s.",
      );
      noEventsWarningRef.current = true;
    }
  }, [now, sessionDebug.eventCount, sessionState]);

  useEffect(() => {
    if (
      sessionDebug.hasPcm24000Metadata === false &&
      !missingPcmWarningRef.current
    ) {
      console.warn(
        "[ElevenLabs Debug] conversation_initiation_metadata arrived without pcm_24000 audio metadata.",
        { audioFormats: sessionDebug.audioFormats },
      );
      missingPcmWarningRef.current = true;
    }
  }, [sessionDebug.audioFormats, sessionDebug.hasPcm24000Metadata]);

  useEffect(() => {
    if (
      sessionDebug.consecutiveErrorCount >= 3 &&
      sessionDebug.lastErrorAt &&
      repeatedErrorWarningAtRef.current !== sessionDebug.lastErrorAt
    ) {
      console.warn("[ElevenLabs Debug] Repeated inbound error events.", {
        consecutiveErrorCount: sessionDebug.consecutiveErrorCount,
        lastErrorType: sessionDebug.lastErrorType,
      });
      repeatedErrorWarningAtRef.current = sessionDebug.lastErrorAt;
    }
  }, [
    sessionDebug.consecutiveErrorCount,
    sessionDebug.lastErrorAt,
    sessionDebug.lastErrorType,
  ]);

  const stop = useCallback(() => sessionRef.current.stop(), [sessionRef]);

  const handleSendUserMessage = useCallback(() => {
    const trimmed = userText.trim();
    if (!trimmed) return;
    sessionRef.current.sendUserMessage(trimmed);
    setUserText("");
  }, [sessionRef, userText]);

  const handleSendContextualUpdate = useCallback(() => {
    const trimmed = contextText.trim();
    if (!trimmed) return;
    sessionRef.current.sendContextualUpdate(trimmed);
    setContextText("");
  }, [sessionRef, contextText]);

  const handleUserActivity = useCallback(() => {
    sessionRef.current.sendUserActivity();
    setActivityPing(true);
    setTimeout(() => setActivityPing(false), 600);
  }, [sessionRef]);

  const handleCopyDebugSnapshot = useCallback(async () => {
    const browserNavigator = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const snapshot = {
      timestamp: new Date().toISOString(),
      session: {
        status: sessionState,
        voice_chat_state: voiceChatState,
        connection_quality: connectionQuality,
      },
      event: {
        last_type: sessionDebug.lastEventType ?? null,
        count: sessionDebug.eventCount,
        agent_response_count: sessionDebug.agentResponseCount,
        error_count: sessionDebug.errorCount,
      },
      conversation_session_id: sessionDebug.conversationId ?? null,
      audio: {
        formats: sessionDebug.audioFormats,
        pcm_24000: getPcm24000Status(sessionDebug.hasPcm24000Metadata),
      },
      browser: {
        summary: browserInfo,
        platform:
          browserNavigator.userAgentData?.platform ??
          navigator.platform ??
          null,
        user_agent: navigator.userAgent,
      },
    };

    await copyTextToClipboard(JSON.stringify(snapshot, null, 2));
    setSnapshotCopied(true);
    if (snapshotCopiedTimeoutRef.current) {
      window.clearTimeout(snapshotCopiedTimeoutRef.current);
    }
    snapshotCopiedTimeoutRef.current = window.setTimeout(() => {
      setSnapshotCopied(false);
      snapshotCopiedTimeoutRef.current = null;
    }, 1600);
  }, [
    browserInfo,
    connectionQuality,
    sessionDebug.agentResponseCount,
    sessionDebug.audioFormats,
    sessionDebug.conversationId,
    sessionDebug.errorCount,
    sessionDebug.eventCount,
    sessionDebug.hasPcm24000Metadata,
    sessionDebug.lastEventType,
    sessionState,
    voiceChatState,
  ]);

  const qualityColor =
    connectionQuality === "GOOD"
      ? "text-green-400"
      : connectionQuality === "BAD"
        ? "text-red-400"
        : "text-gray-500";

  return (
    <div className="w-full max-w-[1400px] h-full flex flex-col gap-4 py-4">
      <div className="w-full flex flex-row items-start justify-center gap-4">
        {/* Video */}
        <div className="relative w-[960px] max-w-[calc(100vw-432px)] aspect-video overflow-hidden rounded-lg flex flex-col items-center justify-center bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-contain bg-black transition-opacity ${
              sessionState === SessionState.CONNECTED
                ? "opacity-100"
                : "opacity-0"
            }`}
          />
          {sessionState !== SessionState.CONNECTED && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
              Waiting for avatar and ElevenLabs agent…
            </div>
          )}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
              <div
                className={`w-2 h-2 rounded-full ${
                  sessionState === SessionState.CONNECTED
                    ? "bg-green-400"
                    : sessionState === SessionState.CONNECTING
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-gray-500"
                }`}
              />
              <span className="text-xs text-white/70 font-medium uppercase tracking-wider">
                {sessionState}
              </span>
            </div>
            <span
              className={`text-xs font-medium uppercase tracking-wider px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm ${qualityColor}`}
            >
              {connectionQuality}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors ${
                isUserTalking
                  ? "bg-blue-500/30 border border-blue-400/30"
                  : "bg-black/40"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-colors ${isUserTalking ? "bg-blue-400 animate-pulse" : "bg-gray-500"}`}
              />
              <span className="text-xs text-white/70 font-medium">You</span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors ${
                isAvatarTalking
                  ? "bg-purple-500/30 border border-purple-400/30"
                  : "bg-black/40"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-colors ${isAvatarTalking ? "bg-purple-400 animate-pulse" : "bg-gray-500"}`}
              />
              <span className="text-xs text-white/70 font-medium">Avatar</span>
            </div>
          </div>
          <button
            className="absolute bottom-3 right-3 px-4 py-2 text-sm font-medium rounded-lg bg-red-500/80 text-white hover:bg-red-500 backdrop-blur-sm transition-colors"
            onClick={stop}
          >
            End Session
          </button>
        </div>

        {/* ElevenLabs control panel */}
        <div className="w-[400px] shrink-0 overflow-hidden border border-white/10 rounded-lg bg-white/5 flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-white/10 shrink-0 flex items-center justify-between">
            <p className="font-medium text-sm text-white">ElevenLabs Agent</p>
            <span className="text-[10px] uppercase tracking-wider text-gray-500">
              agent-control
            </span>
          </div>

          <div className="shrink-0 border-b border-white/10 bg-black/20 px-3 py-2 font-mono text-[10px]">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                Session Health / Debug
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDebugSnapshot}
                  className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {snapshotCopied ? "Copied" : "Copy Debug Snapshot"}
                </button>
                <span className={qualityColor}>{connectionQuality}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <DebugRow label="session" value={sessionState} />
              <DebugRow label="voice" value={voiceChatState} />
              <DebugRow
                label="last event"
                value={sessionDebug.lastEventType ?? "n/a"}
              />
              <DebugRow
                label="since event"
                value={formatElapsed(sessionDebug.lastEventAt, now)}
              />
              <DebugRow label="events" value={sessionDebug.eventCount} />
              <DebugRow
                label="responses"
                value={sessionDebug.agentResponseCount}
              />
              <DebugRow
                label="last response"
                value={formatTimestamp(sessionDebug.lastAgentResponseAt)}
              />
              <DebugRow
                label="conversation"
                value={sessionDebug.conversationId ?? "n/a"}
              />
              <DebugRow
                label="audio"
                value={
                  sessionDebug.audioFormats.length > 0
                    ? sessionDebug.audioFormats.join(", ")
                    : "n/a"
                }
              />
              <DebugRow
                label="pcm_24000"
                value={getPcm24000Status(sessionDebug.hasPcm24000Metadata)}
              />
              <DebugRow label="errors" value={sessionDebug.errorCount} />
              <DebugRow label="browser" value={browserInfo} />
            </div>
          </div>

          <EventLog events={inboundEvents} eventLogEndRef={eventLogEndRef} />

          <div className="shrink-0 px-3 py-3 border-t border-white/10 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-500">
                user_message
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendUserMessage();
                  }}
                  placeholder="Type a message to the agent..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 text-white text-xs border border-white/10 focus:outline-none focus:border-white/30"
                />
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={handleSendUserMessage}
                >
                  Send
                </Btn>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-500">
                contextual_update
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="e.g. User navigated to pricing page"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 text-white text-xs border border-white/10 focus:outline-none focus:border-white/30"
                />
                <Btn size="sm" onClick={handleSendContextualUpdate}>
                  Update
                </Btn>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                user_activity (keepalive)
              </span>
              <Btn size="sm" onClick={handleUserActivity}>
                {activityPing ? "Pinged" : "Ping"}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
