"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  AgentEventsEnum,
  ConnectionQuality,
  ElevenLabsAgentSession,
  SessionEvent,
  SessionState,
  VoiceChatEvent,
  VoiceChatState,
  VoiceChatConfig,
} from "@heygen/liveavatar-web-sdk";
import { API_URL } from "../../../app/api/secrets";

export type ElevenLabsInboundEvent = {
  event_id: string;
  source_event_id?: string | null;
  session_id?: string;
  elevenlabs_event_type: string;
  data: Record<string, unknown>;
  receivedAt: number;
};

export type ElevenLabsSessionDebug = {
  lastEventType: string | null;
  lastEventAt: number | null;
  lastAgentResponseAt: number | null;
  eventCount: number;
  agentResponseCount: number;
  conversationId: string | null;
  audioFormats: string[];
  hasPcm24000Metadata: boolean | null;
  metadataReceivedAt: number | null;
  errorCount: number;
  consecutiveErrorCount: number;
  lastErrorType: string | null;
  lastErrorAt: number | null;
};

type ContextValue = {
  sessionRef: React.RefObject<ElevenLabsAgentSession>;
  sessionState: SessionState;
  isStreamReady: boolean;
  connectionQuality: ConnectionQuality;
  isMuted: boolean;
  voiceChatState: VoiceChatState;
  isUserTalking: boolean;
  isAvatarTalking: boolean;
  inboundEvents: ElevenLabsInboundEvent[];
  sessionDebug: ElevenLabsSessionDebug;
};

const initialSessionDebug: ElevenLabsSessionDebug = {
  lastEventType: null,
  lastEventAt: null,
  lastAgentResponseAt: null,
  eventCount: 0,
  agentResponseCount: 0,
  conversationId: null,
  audioFormats: [],
  hasPcm24000Metadata: null,
  metadataReceivedAt: null,
  errorCount: 0,
  consecutiveErrorCount: 0,
  lastErrorType: null,
  lastErrorAt: null,
};

const findStringByKey = (
  value: unknown,
  keyNames: Set<string>,
): string | null => {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, keyNames);
      if (found) return found;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (keyNames.has(key) && typeof nested === "string") return nested;
    const found = findStringByKey(nested, keyNames);
    if (found) return found;
  }

  return null;
};

const collectAudioFormats = (value: unknown): string[] => {
  const formats = new Set<string>();

  const visit = (nested: unknown, parentKey = "") => {
    if (typeof nested === "string") {
      const lowerValue = nested.toLowerCase();
      const lowerKey = parentKey.toLowerCase();
      const looksLikeAudioFormat =
        lowerValue.includes("pcm") ||
        lowerValue.includes("wav") ||
        lowerValue.includes("mp3") ||
        lowerValue.includes("opus") ||
        lowerValue.includes("ulaw") ||
        lowerValue.includes("alaw") ||
        lowerKey.includes("audio") ||
        lowerKey.includes("format");

      if (looksLikeAudioFormat) formats.add(nested);
      return;
    }

    if (!nested || typeof nested !== "object") return;

    if (Array.isArray(nested)) {
      nested.forEach((item) => visit(item, parentKey));
      return;
    }

    Object.entries(nested).forEach(([key, item]) => visit(item, key));
  };

  visit(value);
  return Array.from(formats);
};

const isAgentResponseEvent = (eventType: string) =>
  eventType === "agent_response" || eventType.endsWith(".agent_response");

const isMetadataEvent = (eventType: string) =>
  eventType === "conversation_initiation_metadata" ||
  eventType.endsWith(".conversation_initiation_metadata");

const isErrorEvent = (eventType: string) =>
  eventType.toLowerCase().includes("error");

const ElevenLabsAgentContext = createContext<ContextValue>({
  sessionRef: {
    current: null,
  } as unknown as React.RefObject<ElevenLabsAgentSession>,
  sessionState: SessionState.INACTIVE,
  isStreamReady: false,
  connectionQuality: ConnectionQuality.UNKNOWN,
  isMuted: true,
  voiceChatState: VoiceChatState.INACTIVE,
  isUserTalking: false,
  isAvatarTalking: false,
  inboundEvents: [],
  sessionDebug: initialSessionDebug,
});

type ProviderProps = {
  children: React.ReactNode;
  sessionAccessToken: string;
  voiceChatConfig?: boolean | VoiceChatConfig;
};

export const ElevenLabsAgentProvider = ({
  children,
  sessionAccessToken,
  voiceChatConfig = true,
}: ProviderProps) => {
  const sessionRef = useRef<ElevenLabsAgentSession>(
    new ElevenLabsAgentSession(sessionAccessToken, {
      voiceChat: voiceChatConfig,
      apiUrl: API_URL,
    }),
  );

  const [sessionState, setSessionState] = useState<SessionState>(
    SessionState.INACTIVE,
  );
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
    ConnectionQuality.UNKNOWN,
  );
  const [isMuted, setIsMuted] = useState(true);
  const [voiceChatState, setVoiceChatState] = useState<VoiceChatState>(
    VoiceChatState.INACTIVE,
  );
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);
  const [inboundEvents, setInboundEvents] = useState<ElevenLabsInboundEvent[]>(
    [],
  );
  const [sessionDebug, setSessionDebug] =
    useState<ElevenLabsSessionDebug>(initialSessionDebug);

  useEffect(() => {
    const session = sessionRef.current;

    // Bind named handlers so we can detach them on cleanup. React Strict Mode
    // mounts every effect twice in dev — without cleanup, every listener was
    // registered twice and every inbound event fired twice (which is what was
    // causing the duplicate `agent_response` rows).
    const onStateChanged = (state: SessionState) => {
      setSessionState(state);
      if (state === SessionState.DISCONNECTED) {
        setIsStreamReady(false);
      }
    };
    const onStreamReady = () => setIsStreamReady(true);
    const onUserSpeakStarted = () => setIsUserTalking(true);
    const onUserSpeakEnded = () => setIsUserTalking(false);
    const onAvatarSpeakStarted = () => setIsAvatarTalking(true);
    const onAvatarSpeakEnded = () => setIsAvatarTalking(false);
    const onMuted = () => setIsMuted(true);
    const onUnmuted = () => setIsMuted(false);
    const onElevenLabsEvent = (event: {
      event_id: string;
      source_event_id?: string | null;
      session_id?: string;
      elevenlabs_event_type: string;
      data: Record<string, unknown>;
    }) => {
      const receivedAt = Date.now();
      setInboundEvents((prev) => [
        ...prev,
        {
          event_id: event.event_id,
          source_event_id: event.source_event_id,
          session_id: event.session_id,
          elevenlabs_event_type: event.elevenlabs_event_type,
          data: event.data,
          receivedAt,
        },
      ]);
      setSessionDebug((prev) => {
        const eventType = event.elevenlabs_event_type;
        const metadataAudioFormats = isMetadataEvent(eventType)
          ? collectAudioFormats(event.data)
          : prev.audioFormats;
        const nextAudioFormats =
          metadataAudioFormats.length > 0
            ? metadataAudioFormats
            : prev.audioFormats;
        const nextConversationId =
          findStringByKey(
            event.data,
            new Set(["conversation_id", "conversationId"]),
          ) ??
          event.session_id ??
          prev.conversationId;
        const isAgentResponse = isAgentResponseEvent(eventType);
        const isError = isErrorEvent(eventType);
        const hasPcm24000 = nextAudioFormats.some((format) =>
          format.toLowerCase().includes("pcm_24000"),
        );

        return {
          lastEventType: eventType,
          lastEventAt: receivedAt,
          lastAgentResponseAt: isAgentResponse
            ? receivedAt
            : prev.lastAgentResponseAt,
          eventCount: prev.eventCount + 1,
          agentResponseCount:
            prev.agentResponseCount + (isAgentResponse ? 1 : 0),
          conversationId: nextConversationId,
          audioFormats: nextAudioFormats,
          hasPcm24000Metadata: isMetadataEvent(eventType)
            ? hasPcm24000
            : prev.hasPcm24000Metadata,
          metadataReceivedAt: isMetadataEvent(eventType)
            ? receivedAt
            : prev.metadataReceivedAt,
          errorCount: prev.errorCount + (isError ? 1 : 0),
          consecutiveErrorCount: isError ? prev.consecutiveErrorCount + 1 : 0,
          lastErrorType: isError ? eventType : prev.lastErrorType,
          lastErrorAt: isError ? receivedAt : prev.lastErrorAt,
        };
      });
    };

    session.on(SessionEvent.SESSION_STATE_CHANGED, onStateChanged);
    session.on(SessionEvent.SESSION_STREAM_READY, onStreamReady);
    session.on(
      SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED,
      setConnectionQuality,
    );
    session.voiceChat.on(VoiceChatEvent.MUTED, onMuted);
    session.voiceChat.on(VoiceChatEvent.UNMUTED, onUnmuted);
    session.voiceChat.on(VoiceChatEvent.STATE_CHANGED, setVoiceChatState);
    session.on(AgentEventsEnum.USER_SPEAK_STARTED, onUserSpeakStarted);
    session.on(AgentEventsEnum.USER_SPEAK_ENDED, onUserSpeakEnded);
    session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, onAvatarSpeakStarted);
    session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, onAvatarSpeakEnded);
    session.on(AgentEventsEnum.ELEVENLABS_AGENT_EVENT, onElevenLabsEvent);

    return () => {
      session.off(SessionEvent.SESSION_STATE_CHANGED, onStateChanged);
      session.off(SessionEvent.SESSION_STREAM_READY, onStreamReady);
      session.off(
        SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED,
        setConnectionQuality,
      );
      session.voiceChat.off(VoiceChatEvent.MUTED, onMuted);
      session.voiceChat.off(VoiceChatEvent.UNMUTED, onUnmuted);
      session.voiceChat.off(VoiceChatEvent.STATE_CHANGED, setVoiceChatState);
      session.off(AgentEventsEnum.USER_SPEAK_STARTED, onUserSpeakStarted);
      session.off(AgentEventsEnum.USER_SPEAK_ENDED, onUserSpeakEnded);
      session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onAvatarSpeakStarted);
      session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onAvatarSpeakEnded);
      session.off(AgentEventsEnum.ELEVENLABS_AGENT_EVENT, onElevenLabsEvent);
    };
  }, []);

  return (
    <ElevenLabsAgentContext.Provider
      value={{
        sessionRef,
        sessionState,
        isStreamReady,
        connectionQuality,
        isMuted,
        voiceChatState,
        isUserTalking,
        isAvatarTalking,
        inboundEvents,
        sessionDebug,
      }}
    >
      {children}
    </ElevenLabsAgentContext.Provider>
  );
};

export const useElevenLabsAgentContext = () =>
  useContext(ElevenLabsAgentContext);
