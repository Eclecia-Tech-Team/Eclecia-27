"use client";

import { useEffect, useState } from "react";
import { Crown, Drama, Users } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";
import CopyCode from "./CopyCode";
import TabHeading from "./TabHeading";
import type { Team } from "@/types/interface";
import { GoldButton } from "@/components/common/GoldButton";

export default function TeamsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
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
          <div className="pf-list mt-6" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="pf-row" data-team>
                <div className="space-y-2">
                  <div className="h-5 w-44 animate-pulse bg-parchment/10" />
                  <div className="h-3 w-64 max-w-full animate-pulse bg-parchment/5" />
                </div>
              </div>
            ))}
          </div>
        ) : teams.length > 0 ? (
          <>
          <TabHeading kicker="Teams you're a part of" count={teams.length} title="Your constellations" />
          <ul className="pf-list">
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
              // Beside the name on narrow screens, under the details otherwise; CSS shows one.
              const seal = (place: "title" | "side") => (
                <span className={`pf-seal ${place === "side" ? "mt-2.5" : ""}`} data-place={place} data-tone={status.tone}>
                  {status.text}
                </span>
              );

              return (
                <li key={team._id} className="pf-team">
                  <div className="pf-row" data-team>
                    <button
                      type="button"
                      onClick={() => setOpenTeamId(isOpen ? null : team._id)}
                      aria-expanded={isOpen}
                      className="group min-w-0 text-left"
                    >
                      <span className="pf-row-title block">
                        <span className="flex items-center gap-2.5">
                          <span className="pf-row-name wrap-anywhere group-hover:text-[#f0c96d]">{team.teamName || "Unnamed team"}</span>
                          <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-gold transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                        {seal("title")}
                      </span>
                      <span className="pf-row-meta">
                        <span className="pf-meta-item">
                          <Drama aria-hidden />
                          {team.eventId.eventName}
                        </span>
                        <span className="pf-meta-item">
                          <Users aria-hidden />
                          {teamSize}
                          {max ? ` of ${max}` : ""} member{teamSize === 1 ? "" : "s"}
                        </span>
                        {viewerIsLeader && (
                          <span className="pf-meta-item">
                            <Crown aria-hidden />
                            You lead
                          </span>
                        )}
                      </span>
                      {seal("side")}
                    </button>
                    <div className="pf-row-side">
                      {viewerIsLeader && paid && !locked && team.registrationCode && (
                        <CopyCode code={team.registrationCode} label="Pay with this registration ID" />
                      )}
                      <CopyCode code={team.teamCode} label="Team code" />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="profile-tab-pane pf-crew">
                      <p className="pf-crew-title">Members</p>
                      <ol className="pf-roster">
                        {(team.members ?? []).map((member, i) => {
                          const name = member.fullName || member.username || "Member";
                          const isViewer = member._id === currentUserId;
                          const canRemove = !member.isLeader && viewerIsLeader && !locked;
                          return (
                            <li key={member._id} className="pf-member" data-leader={member.isLeader}>
                              <span className="pf-member-no" aria-hidden>
                                {i + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] text-parchment/90" title={name}>
                                  {name}
                                </span>
                                {(member.isLeader || isViewer) && (
                                  <span className="block font-mono text-[9.5px] uppercase tracking-[0.2em] text-gold/75">
                                    {[member.isLeader && "Leader", isViewer && "You"].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                              </span>
                              {canRemove && (
                                <button
                                  type="button"
                                  className="pf-member-remove"
                                  disabled={updating}
                                  aria-label={`Remove ${name}`}
                                  onClick={() => setMemberToRemove({ teamId: team._id, memberId: member._id, name })}
                                >
                                  {removingMemberId === member._id ? "Removing…" : "Remove"}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                      {teamSize < min && (
                        <p className="mt-4 text-[13.5px] text-[#e6c06a]">
                          Share the code: {team.eventId.eventName} needs at least {min} members.
                        </p>
                      )}

                      <div className="pf-crew-actions">
                        {viewerIsLeader &&
                          (editingTeamId === team._id ? (
                            <form
                              className="flex w-full max-w-md flex-wrap items-end gap-4"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void updateTeamName(team._id);
                              }}
                            >
                              <input className="pf-input" aria-label="Team name" value={newTeamName} maxLength={40} autoFocus onChange={(e) => setNewTeamName(e.target.value)} />
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
                              className="pf-add"
                              onClick={() => {
                                setEditingTeamId(team._id);
                                setNewTeamName(team.teamName || "");
                              }}
                            >
                              Rename team
                            </button>
                          ))}
                        <div className="pf-crew-event">
                          <GoldButton href={`/events/${team.eventId.slug ?? team.eventId._id}`} size="sm" variant="ghost">
                            Event page
                          </GoldButton>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          </>
        ) : (
          <div className="pb-10">
            <TabHeading kicker="Teams you're a part of" title="No stars aligned yet" />
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-parchment/60">
              Start a team from a team event&apos;s page and share the code, or join a friend&apos;s with theirs.
            </p>
            <div className="mt-7 flex justify-end pr-2.5">
              <GoldButton href="/events" size="sm" variant="ghost">
                Find a team event
              </GoldButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
