"use client";

import { useEffect, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import type { Team } from "@/types/interface";
import { TransitionLink } from "@/components/common/TransitionLink";

const paymentStatusConfig = {
  pending: {
    label: "Payment Pending",
    className: "bg-amber-950/40 text-amber-300 border border-amber-500/30",
  },
  completed: {
    label: "Payment Complete",
    className: "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30",
  },
  failed: {
    label: "Payment Failed",
    className: "bg-red-950/40 text-red-300 border border-red-500/30",
  },
} as const;

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
        message: "Team name updated successfully",
      });
    } catch (error) {
      console.error(error);
      setNotification({
        type: "error",
        message: "Failed to update team name",
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
        message: data.message || "Member removed successfully",
      });
      setMemberToRemove(null);
    } catch (error: any) {
      console.error(error);
      setNotification({
        type: "error",
        message: error.message || "Error removing member",
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
        title="Remove Guild Member"
        name={memberToRemove?.name}
        confirmLabel="Remove"
        loading={updating}
        description={
          <p>
            Are you sure you want to dismiss{" "}
            <span className="text-gold font-semibold">
              {memberToRemove?.name}
            </span>{" "}
            from this team?
          </p>
        }
        onConfirm={executeRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      <div className="relative rounded-2xl border border-gold/40 bg-[#070b0e]/90 p-5 sm:p-8 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(217,164,65,0.08)]">
        <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-gold/15" />

        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-nasyhama text-2xl sm:text-3xl text-gold">
              My Guilds & Teams
            </h2>
            <p className="font-taiganja text-xs uppercase tracking-[0.25em] text-parchment/60">
              Alliances forged in the cosmos
            </p>
          </div>

          {notification && (
            <div
              className={`p-3 rounded-lg text-sm text-center border font-taiganja tracking-wider ${
                notification.type === "success"
                  ? "bg-green-950/40 border-green-500/40 text-green-300"
                  : "bg-red-950/40 border-red-500/40 text-red-300"
              }`}
            >
              {notification.message}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="font-taiganja text-xs uppercase tracking-widest text-parchment/60">
                Summoning your alliances...
              </p>
            </div>
          ) : teams.length > 0 ? (
            <div className="space-y-4 w-full">
              {teams.map((team) => {
                const isOpen = openTeamId === team._id;
                const teamSize = getTeamSize(team);
                const minMembers = team.eventId.minMembersPerTeam ?? 1;
                const isPaidEvent = Boolean(team.eventId.isPaidEvent);
                const paymentStatus = team.paymentStatus;
                const statusConfig = paymentStatus
                  ? paymentStatusConfig[paymentStatus]
                  : null;

                return (
                  <div
                    key={team._id}
                    className="rounded-xl border border-gold/30 bg-black/40 overflow-hidden transition-all duration-300 hover:border-gold/50"
                  >
                    <div
                      role="button"
                      onClick={() => setOpenTeamId(isOpen ? null : team._id)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 cursor-pointer group hover:bg-gold/5 transition-colors select-none"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex flex-col items-start">
                            <h3 className="font-nasyhama text-lg sm:text-xl text-gold">
                              {team.teamName || "Unnamed Team"}
                            </h3>
                            <span className="text-xs text-parchment/70 font-serif">
                              {team.eventId.eventName}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-taiganja tracking-wider bg-gold/15 text-gold border border-gold/30">
                            {team.eventId.category}
                          </span>
                          {isPaidEvent && statusConfig && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-taiganja tracking-wider ${statusConfig.className}`}
                            >
                              {statusConfig.label}
                            </span>
                          )}
                        </div>
                        <p className="font-taiganja text-[11px] text-parchment/50 mt-1 uppercase tracking-wider">
                          {teamSize} / {team.eventId.maxMembersPerTeam ?? "-"} Members
                        </p>
                      </div>

                      <div
                        className="flex items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => copyTeamCode(team.teamCode, team._id)}
                          className="px-3 py-1.5 rounded-lg border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-taiganja uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          {copiedId === team._id ? "COPIED" : "COPY CODE"}
                        </button>
                      </div>

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className={`shrink-0 text-gold/70 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>

                    {isOpen && (
                      <div className="border-t border-gold/20 px-4 py-4 space-y-4 bg-black/60">
                        <div className="rounded-lg border border-gold/20 bg-black/50 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-taiganja text-[11px] uppercase tracking-wider text-parchment/60">
                              Team Name
                            </span>
                            {editingTeamId !== team._id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTeamId(team._id);
                                  setNewTeamName(team.teamName || "");
                                }}
                                className="text-xs text-gold hover:underline font-taiganja tracking-wider uppercase cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </div>

                          {editingTeamId === team._id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded bg-black/80 border border-gold/40 text-sm text-parchment focus:border-gold outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateTeamName(team._id)}
                                disabled={updating || !newTeamName.trim()}
                                className="px-3 py-1 bg-gold text-black rounded text-xs font-taiganja uppercase tracking-wider font-semibold cursor-pointer disabled:opacity-50"
                              >
                                {updating ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTeamId(null);
                                  setNewTeamName("");
                                }}
                                className="px-3 py-1 border border-gold/30 text-parchment rounded text-xs font-taiganja uppercase tracking-wider cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="font-nasyhama text-xl text-gold">
                              {team.teamName || "Unnamed Team"}
                            </p>
                          )}

                          <div className="pt-2 border-t border-gold/10">
                            <span className="font-taiganja text-[11px] uppercase tracking-wider text-parchment/60 block">
                              Team Code
                            </span>
                            <span className="font-mono text-sm text-parchment font-semibold tracking-wider">
                              {team.teamCode}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg border border-gold/20 bg-black/50 p-2.5">
                            <span className="font-taiganja text-[10px] uppercase tracking-wider text-parchment/60 block">
                              Team Size
                            </span>
                            <span className="font-semibold text-parchment text-sm">
                              {teamSize}
                            </span>
                          </div>
                          <div className="rounded-lg border border-gold/20 bg-black/50 p-2.5">
                            <span className="font-taiganja text-[10px] uppercase tracking-wider text-parchment/60 block">
                              Team Limit
                            </span>
                            <span className="font-semibold text-parchment text-sm">
                              {team.eventId.maxMembersPerTeam ?? "-"}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-gold/20 bg-black/50 p-3 space-y-2">
                          <span className="font-taiganja text-xs uppercase tracking-wider text-parchment/70 block">
                            Teammates
                          </span>
                          {team.members && team.members.length > 0 ? (
                            <div className="space-y-2">
                              {team.members.map((member) => {
                                const displayName =
                                  member.fullName || member.username || "Anonymous";
                                const isThisMemberLeader = member.isLeader;
                                const leaderMember = team.members?.find((m) => m.isLeader);
                                const viewerIsLeader =
                                  Boolean(currentUserId) &&
                                  Boolean(leaderMember) &&
                                  leaderMember?._id === currentUserId;
                                const isRemovingThisMember =
                                  removingMemberId === member._id;

                                return (
                                  <div
                                    key={member._id}
                                    className="flex items-center justify-between text-xs text-parchment bg-black/40 p-2.5 rounded-md border border-gold/10"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-serif">{displayName}</span>
                                      {isThisMemberLeader && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40 font-taiganja uppercase tracking-wider">
                                          Leader
                                        </span>
                                      )}
                                    </div>

                                    {!isThisMemberLeader &&
                                      viewerIsLeader &&
                                      (!team.eventId.isPaidEvent ||
                                        team.paymentStatus !== "completed") && (
                                        <button
                                          type="button"
                                          disabled={updating}
                                          onClick={() =>
                                            setMemberToRemove({
                                              teamId: team._id,
                                              memberId: member._id,
                                              name: displayName,
                                            })
                                          }
                                          className="text-[10px] font-taiganja uppercase tracking-wider px-2.5 py-1 rounded bg-red-950/30 border border-red-500/30 text-red-300 hover:bg-red-900/40 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                          {isRemovingThisMember
                                            ? "Removing..."
                                            : "Remove"}
                                        </button>
                                      )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-parchment/50 font-serif">
                              No teammates have joined yet.
                            </p>
                          )}
                        </div>

                        <TransitionLink
                          href={`/events/${team.eventId._id}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold font-taiganja uppercase tracking-wider text-xs transition-all duration-200"
                        >
                          View Event Details →
                        </TransitionLink>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
              <div className="text-4xl text-gold/60">✦</div>
              <h3 className="font-nasyhama text-2xl text-parchment">
                No Guilds Formed Yet
              </h3>
              <p className="font-taiganja text-xs uppercase tracking-widest text-parchment/50">
                Join or create a team from an event page to see your team here
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
