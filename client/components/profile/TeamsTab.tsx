"use client";

import { useEffect, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import type { Team } from "@/types/interface";
import { TransitionLink } from "@/components/common/TransitionLink";

export default function TeamsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{
    teamId: string;
    memberId: string;
    name: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch("/api/registration/my-teams", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        if (response.ok) {
          setTeams(data.teams || []);
          setCurrentUserId(data.currentUserId || null);
        }
      } catch (error) {
        console.error("Failed to fetch teams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const updateTeamName = async (teamId: string) => {
    try {
      setUpdating(true);
      const response = await fetch(
        `/api/registration/my-teams/update/${teamId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, teamName: newTeamName.trim() }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update team name");
      }

      setTeams((prev) =>
        prev.map((team) =>
          team._id === teamId
            ? { ...team, teamName: newTeamName.trim() }
            : team
        )
      );

      setEditingTeamId(null);
      setNewTeamName("");
      setNotification({
        type: "success",
        message: "Team renamed.",
      });
    } catch (error) {
      console.error(error);
      setNotification({
        type: "error",
        message: "Couldn't rename the team.",
      });
    } finally {
      setUpdating(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const executeRemoveMember = async () => {
    if (!memberToRemove) return;
    const { teamId, memberId } = memberToRemove;

    try {
      setUpdating(true);
      setRemovingMemberId(memberId);
      const response = await fetch(
        `/api/registration/my-teams/remove-members/${teamId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setTeams((prev) =>
        prev.map((team) =>
          team._id === teamId
            ? {
                ...team,
                members: team.members?.filter((m) => m._id !== memberId),
              }
            : team
        )
      );

      setNotification({
        type: "success",
        message: data.message || "Removed from the team.",
      });
      setMemberToRemove(null);
    } catch (error: unknown) {
      console.error(error);
      setNotification({
        type: "error",
        message: (error instanceof Error && error.message) || "Error removing member",
      });
    } finally {
      setUpdating(false);
      setRemovingMemberId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const copyTeamCode = (teamCode: string, registrationId: string) => {
    navigator.clipboard.writeText(teamCode);
    setCopiedId(registrationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTeamSize = (team: Team) =>
    team.teamSize ?? team.members?.length ?? team.team.length;

  return (
    <>
      <ConfirmationModal
        isOpen={Boolean(memberToRemove)}
        title="Remove from team?"
        name={memberToRemove?.name}
        confirmLabel="Remove"
        loading={updating}
        description={
          <p>
            <span className="text-parchment">{memberToRemove?.name}</span> will leave the team and lose their registration for this event.
          </p>
        }
        onConfirm={executeRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      <div>
        {notification && (
          <p role="status" className={`pt-5 text-[14px] ${notification.type === "success" ? "text-parchment/80" : "text-[#f6b7ab]"}`}>
            {notification.message}
          </p>
        )}

        {loading ? (
          <div aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="border-b border-parchment/[0.08] py-6">
                <div className="h-5 w-44 animate-pulse bg-parchment/10" />
                <div className="mt-2 h-3 w-64 animate-pulse bg-parchment/5" />
              </div>
            ))}
          </div>
        ) : teams.length > 0 ? (
          <ul>
            {teams.map((team) => {
              const isOpen = openTeamId === team._id;
              const teamSize = getTeamSize(team);
              const max = team.eventId.maxMembersPerTeam;
              const min = team.eventId.minMembersPerTeam ?? 1;
              const paid = Boolean(team.eventId.isPaidEvent);
              const status = !paid
                ? teamSize < min
                  ? { tone: "wait", text: `Needs ${min - teamSize} more` }
                  : { tone: "ok", text: "Confirmed" }
                : team.paymentStatus === "completed"
                  ? { tone: "ok", text: "Paid" }
                  : team.paymentStatus === "failed"
                    ? { tone: "bad", text: "Payment failed" }
                    : { tone: "wait", text: "Payment pending" };
              const leader = team.members?.find((m) => m.isLeader);
              const viewerIsLeader = Boolean(currentUserId) && leader?._id === currentUserId;
              const locked = paid && team.paymentStatus === "completed";

              return (
                <li key={team._id} className="border-b border-parchment/[0.08]">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-6">
                    <button
                      type="button"
                      onClick={() => setOpenTeamId(isOpen ? null : team._id)}
                      aria-expanded={isOpen}
                      className="group min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-display text-[24px] font-semibold leading-tight text-parchment transition-colors group-hover:text-gold">
                          {team.teamName || "Unnamed team"}
                        </span>
                        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-gold/60 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                      <span className="mt-1 block text-[13.5px] text-parchment/55">
                        {team.eventId.eventName} · {teamSize}
                        {max ? ` of ${max}` : ""} member{teamSize === 1 ? "" : "s"}
                        {viewerIsLeader && " · You lead"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyTeamCode(team.teamCode, team._id)}
                      className="group flex items-center gap-3 border border-gold/25 px-3.5 py-2 transition-colors hover:border-gold/60"
                      aria-label={`Copy team code ${team.teamCode}`}
                    >
                      <span className="font-mono text-[14px] tracking-[0.16em] text-gold">{team.teamCode}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-parchment/45 group-hover:text-parchment/80">
                        {copiedId === team._id ? "Copied" : "Copy"}
                      </span>
                    </button>

                    <span className="pf-status w-[9.5rem] max-sm:w-auto" data-tone={status.tone}>
                      {status.text}
                    </span>
                  </div>

                  {isOpen && (
                    <div className="profile-tab-pane grid gap-8 pb-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div>
                        <p className="pf-label">Members</p>
                        <ul className="mt-3">
                          {(team.members ?? []).map((member) => {
                            const name = member.fullName || member.username || "Member";
                            const canRemove = !member.isLeader && viewerIsLeader && !locked;
                            return (
                              <li key={member._id} className="flex items-center justify-between gap-4 border-b border-parchment/[0.06] py-2.5">
                                <span className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/30 font-display text-[15px] text-gold">
                                    {name.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="truncate text-[15px] text-parchment/90">{name}</span>
                                  {member.isLeader && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/80">Leader</span>}
                                  {member._id === currentUserId && !member.isLeader && (
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-parchment/40">You</span>
                                  )}
                                </span>
                                {canRemove && (
                                  <button
                                    type="button"
                                    className="pf-link"
                                    data-tone="danger"
                                    disabled={updating}
                                    onClick={() => setMemberToRemove({ teamId: team._id, memberId: member._id, name })}
                                  >
                                    {removingMemberId === member._id ? "Removing…" : "Remove"}
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {teamSize < min && (
                          <p className="mt-3 text-[13.5px] text-[#e6c06a]">
                            Share the code: {team.eventId.eventName} needs at least {min} members.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-6">
                        {viewerIsLeader && (
                          <div>
                            <p className="pf-label">Team name</p>
                            {editingTeamId === team._id ? (
                              <form
                                className="mt-1 flex items-end gap-4"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void updateTeamName(team._id);
                                }}
                              >
                                <input className="pf-input" value={newTeamName} maxLength={40} autoFocus onChange={(e) => setNewTeamName(e.target.value)} />
                                <button type="submit" className="pf-link text-gold" disabled={updating || newTeamName.trim().length < 2}>
                                  {updating ? "Saving…" : "Save"}
                                </button>
                                <button type="button" className="pf-link" onClick={() => setEditingTeamId(null)}>
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className="pf-add mt-2"
                                onClick={() => {
                                  setEditingTeamId(team._id);
                                  setNewTeamName(team.teamName || "");
                                }}
                              >
                                Rename team
                              </button>
                            )}
                          </div>
                        )}
                        <TransitionLink href={`/events/${team.eventId.slug ?? team.eventId._id}`} className="pf-link self-start text-gold">
                          Open event page →
                        </TransitionLink>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-14">
            <p className="font-display text-[26px] text-parchment">No teams yet.</p>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-parchment/55">
              Start one from a team event&apos;s page and share the code, or join a friend&apos;s with theirs.
            </p>
            <TransitionLink href="/events" className="pf-link mt-6 inline-block text-gold">
              Find a team event →
            </TransitionLink>
          </div>
        )}
      </div>
    </>
  );
}
