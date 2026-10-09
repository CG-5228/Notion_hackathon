import React, { useEffect, useState, useRef } from 'react';
import {
  BuddyMatchView,
  ChatMessage,
  RevealedProfile,
} from '../types.js';
import {
  agreeToGo,
  fetchMatch,
  fetchMessages,
  fetchRevealedProfiles,
  leaveMatch,
  sendMessage,
  subscribeToMessages,
} from '../services/chatService.js';
import { ConsentBanner } from './ConsentBanner.js';
import { RevealedProfilesCard } from './RevealedProfilesCard.js';
import { ConfirmedPlanView } from './ConfirmedPlanView.js';
import { ReliabilityBadge } from './ReliabilityBadge.js';
import { ReportModal } from './ReportModal.js';
import { BlockModal } from './BlockModal.js';
import { IcebreakerSuggestions } from './IcebreakerSuggestions.js';

interface BuddyChatProps {
  matchId: string;
  onNavigateToCheckIn?: () => void;
  onExit?: () => void;
}

export const BuddyChat: React.FC<BuddyChatProps> = ({
  matchId,
  onNavigateToCheckIn,
  onExit,
}) => {
  const [match, setMatch] = useState<BuddyMatchView | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [revealedProfiles, setRevealedProfiles] = useState<RevealedProfile[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Safety modals state
  const [reportingPseudonym, setReportingPseudonym] = useState<string | null>(null);
  const [blockingPseudonym, setBlockingPseudonym] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const m = await fetchMatch(matchId);
      setMatch(m);

      const msgs = await fetchMessages(matchId);
      setMessages(msgs);

      if (m.status === 'revealed') {
        const profiles = await fetchRevealedProfiles(matchId);
        setRevealedProfiles(profiles);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load match and chat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToMessages(matchId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return () => {
      unsubscribe();
    };
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const text = inputText;
    try {
      setSending(true);
      setErrorMsg(null);
      const created = await sendMessage(matchId, text);
      setMessages((prev) => [...prev, created]);
      setInputText('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleAgreeToGo = async () => {
    if (!match) return;
    const res = await agreeToGo(matchId, match.membershipVersion);
    if (!res.success && res.error === 'stale_version') {
      alert(res.message);
      await loadData();
      return;
    }

    // Refresh match state
    const updated = await fetchMatch(matchId);
    setMatch(updated);

    if (updated.status === 'revealed') {
      const profiles = await fetchRevealedProfiles(matchId);
      setRevealedProfiles(profiles);
    }
  };

  const handleLeaveMatch = async () => {
    await leaveMatch(matchId);
    if (onExit) onExit();
  };

  if (loading && !match) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-3" />
        Connecting to private student chat...
      </div>
    );
  }

  if (!match) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Match not found or closed.</p>
        <p className="text-xs text-slate-500 mt-1">This buddy conversation is no longer active.</p>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            Back to Activities
          </button>
        )}
      </div>
    );
  }

  const isGroup = match.mode === 'group';
  const isForming = match.status === 'forming';
  const isChatDisabled = isGroup ? match.memberCount < 3 : match.memberCount < 2;

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[750px] max-w-4xl mx-auto overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              {match.eventSummary?.title || 'Student Activity Meetup'}
            </h2>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isGroup
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {isGroup ? `Group (${match.memberCount}/${match.maxSize})` : '1-on-1 Pair'}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-mono">
              Status: {match.status}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            You are chatting as <strong className="text-slate-800">{match.myPseudonym}</strong>
          </p>
        </div>

        {/* Participant list with coarse reliability badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {match.participants.map((p) => (
            <div
              key={p.pseudonym}
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg text-xs"
            >
              <span className="font-medium text-slate-800">
                {p.pseudonym} {p.pseudonym === match.myPseudonym && '(You)'}
              </span>
              <ReliabilityBadge
                band={p.reliabilityBand}
                pseudonym={p.pseudonym}
              />
              {p.pseudonym !== match.myPseudonym && (
                <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => setReportingPseudonym(p.pseudonym)}
                    className="text-[10px] text-slate-400 hover:text-rose-600"
                    title={`Report ${p.pseudonym}`}
                  >
                    Flag
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockingPseudonym(p.pseudonym)}
                    className="text-[10px] text-slate-400 hover:text-rose-600"
                    title={`Block ${p.pseudonym}`}
                  >
                    Block
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Consent & Warnings Banner */}
        <ConsentBanner
          mode={match.mode}
          status={match.status}
          membershipVersion={match.membershipVersion}
          participants={match.participants}
          myPseudonym={match.myPseudonym}
          onAgree={handleAgreeToGo}
          onLeave={handleLeaveMatch}
        />

        {/* Revealed Profiles if unanimous consent achieved */}
        {match.status === 'revealed' && revealedProfiles.length > 0 && (
          <RevealedProfilesCard
            profiles={revealedProfiles}
            onReport={(pseudo) => setReportingPseudonym(pseudo)}
            onBlock={(pseudo) => setBlockingPseudonym(pseudo)}
          />
        )}

        {/* Confirmed Plan View when revealed */}
        {match.status === 'revealed' && (
          <ConfirmedPlanView
            matchId={matchId}
            mode={match.mode}
            eventSummary={match.eventSummary}
            onNavigateToCheckIn={onNavigateToCheckIn}
          />
        )}

        {/* Forming / Waiting Guard Notice */}
        {isChatDisabled && (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
            <span className="text-2xl">⏳</span>
            <h3 className="text-sm font-semibold text-slate-900">
              {isGroup
                ? `Group forming (${match.memberCount} of at least 3 members joined)`
                : 'Waiting for your buddy to connect...'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isGroup
                ? 'Chat activates automatically once 3 verified students join. This ensures conversations only begin with a viable group size.'
                : 'Chat will activate as soon as your matched student buddy enters the room.'}
            </p>
          </div>
        )}

        {/* Message Stream */}
        {!isChatDisabled && (
          <div className="space-y-3 pt-2">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No messages yet. Say hello or select an icebreaker below!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.isOwn ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-700">
                      {msg.senderPseudonym} {msg.isOwn && '(You)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed break-words ${
                      msg.isOwn
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Area */}
      {!isChatDisabled && (
        <div className="bg-white border-t border-slate-200 p-4 space-y-2">
          {/* Optional Icebreaker Suggestions */}
          <IcebreakerSuggestions
            category={match.eventSummary?.category}
            onSelectSuggestion={(txt) => setInputText(txt)}
          />

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message as ${match.myPseudonym}...`}
              maxLength={2000}
              className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              {sending ? '...' : 'Send'}
            </button>
          </form>

          {errorMsg && (
            <p className="text-[11px] text-rose-600 mt-1">{errorMsg}</p>
          )}
        </div>
      )}

      {/* Safety Modals */}
      {reportingPseudonym && (
        <ReportModal
          matchId={matchId}
          targetPseudonym={reportingPseudonym}
          onClose={() => setReportingPseudonym(null)}
        />
      )}

      {blockingPseudonym && (
        <BlockModal
          matchId={matchId}
          targetPseudonym={blockingPseudonym}
          onBlocked={() => {
            loadData();
            if (onExit) onExit();
          }}
          onClose={() => setBlockingPseudonym(null)}
        />
      )}
    </div>
  );
};
