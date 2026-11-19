"use client";

import { useEffect, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import type { Team } from "@/types/interface";
import { TransitionLink } from "@/components/common/TransitionLink";
import { ASSETS } from "@/constants/assets";

const paymentStatusConfig = {
  pending: {
    label: "PAYMENT PENDING",
    className: "text-amber-300 border-amber-500/40 bg-amber-950/30",
  },
  completed: {
    label: "PAYMENT COMPLETE",
    className: "text-emerald-300 border-emerald-500/40 bg-emerald-950/30",
  },
  failed: {
    label: "PAYMENT FAILED",
    className: "text-red-300 border-red-500/40 bg-red-950/30",
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
        message: "Guild name updated successfully",
      });
    } catch (error) {
      console.error(error);
      setNotification({
        type: "error",
        message: "Failed to update guild name",
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
        message: data.message || "Member dismissed successfully",
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
        title="Dismiss Guild Member"
        name={memberToRemove?.name}
        confirmLabel="Dismiss"
        loading={updating}
        description={
          <p>
            Are you sure you want to dismiss{" "}
            <span className="text-gold font-semibold">
              {memberToRemove?.name}
            </span>{" "}
            from this team roster?
          </p>
        }
        onConfirm={executeRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      <div className="profile-chamber-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gold/20 pb-4 gap-2">
          <div>
            <h2 className="font-nasyhama text-2xl sm:text-3xl text-gold">
              Alliances & Guilds
            </h2>
            <p className="font-taiganja text-[11px] uppercase tracking-[0.25em] text-parchment/60">
              Your registered team rosters and guild codes
            </p>
          </div>
          <span className="font-mono text-xs text-gold/70 tracking-wider">
            TOTAL: {teams.length.toString().padStart(2, "0")}
          </span>
        </div>

        {notification && (
          <div
            className={`p-3 text-xs text-center border font-taiganja tracking-wider ${
              notification.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-red-950/40 border-red-500/40 text-red-300"
            }`}
          >
            {notification.message}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent animate-spin" />
            <p className="font-taiganja text-[11px] uppercase tracking-widest text-parchment/60">
              Retrieving guild rosters...
            </p>
          </div>
        ) : teams.length > 0 ? (
          <div className="space-y-4 w-full">
            {teams.map((team) => {
              const isOpen = openTeamId === team._id;
              const teamSize = getTeamSize(team);
              const isPaidEvent = Boolean(team.eventId.isPaidEvent);
              const paymentStatus = team.paymentStatus;
              const statusConfig = paymentStatus
                ? paymentStatusConfig[paymentStatus]
                : null;

              return (
                <div
                  key={team._id}
                  className="border border-gold/30 bg-[#090d12]/70 overflow-hidden transition-all duration-300 hover:border-gold/50"
                >
                  <div
                    role="button"
                    onClick={() => setOpenTeamId(isOpen ? null : team._id)}
                    className="w-full px-5 py-4 flex items-center gap-4 cursor-pointer group hover:bg-gold/5 transition-colors select-none"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-nasyhama text-lg sm:text-xl text-gold">
                          {team.teamName || "Unnamed Guild"}
                        </h3>
                        <span className="text-xs text-parchment/70 font-serif">
                          — {team.eventId.eventName}
                        </span>
                        <span className="profile-arch-tag">
                          {team.eventId.category}
                        </span>
                        {isPaidEvent && statusConfig && (
                          <span
                            className={`profile-arch-tag ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </span>
                        )}
                      </div>
                      <p className="font-taiganja text-[11px] text-parchment/50 mt-1 uppercase tracking-wider">
                        ROSTER: {teamSize} / {team.eventId.maxMembersPerTeam ?? "—"} MEMBERS
                      </p>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => copyTeamCode(team.teamCode, team._id)}
                        className="px-3 py-1.5 border border-gold/40 bg-black/60 hover:border-gold text-gold text-[10px] font-taiganja uppercase tracking-[0.2em] transition-colors cursor-pointer"
                      >
                        {copiedId === team._id ? "COPIED" : "COPY CODE"}
                      </button>
                    </div>

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
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
                        strokeWidth={1.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gold/20 px-5 py-5 space-y-4 bg-black/50">
                      <div className="border border-gold/20 bg-black/60 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-taiganja text-[10px] uppercase tracking-[0.2em] text-gold/60">
                            GUILD IDENTITY
                          </span>
                          {editingTeamId !== team._id && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTeamId(team._id);
                                setNewTeamName(team.teamName || "");
                              }}
                              className="text-[11px] text-gold hover:underline font-taiganja tracking-wider uppercase cursor-pointer"
                            >
                              [ RENAME ]
                            </button>
                          )}
                        </div>

                        {editingTeamId === team._id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newTeamName}
                              onChange={(e) => setNewTeamName(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-black border border-gold/40 text-sm text-parchment focus:border-gold outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateTeamName(team._id)}
                              disabled={updating || !newTeamName.trim()}
                              className="px-4 py-1 bg-gold text-black text-xs font-taiganja uppercase tracking-wider font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {updating ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTeamId(null);
                                setNewTeamName("");
                              }}
                              className="px-3 py-1 border border-gold/30 text-parchment text-xs font-taiganja uppercase tracking-wider cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="font-nasyhama text-xl text-gold">
                            {team.teamName || "Unnamed Guild"}
                          </p>
                        )}

                        <div className="pt-2 border-t border-gold/10 flex justify-between items-center">
                          <span className="font-taiganja text-[10px] uppercase tracking-[0.2em] text-parchment/60">
                            INVITE CODE:
                          </span>
                          <span className="font-mono text-xs text-gold font-semibold tracking-widest">
                            {team.teamCode}
                          </span>
                        </div>
                      </div>

                      <div className="border border-gold/20 bg-black/60 p-4 space-y-3">
                        <span className="font-taiganja text-[10px] uppercase tracking-[0.2em] text-gold/70 block border-b border-gold/15 pb-2">
                          GUILD ROSTER
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
                                  className="flex items-center justify-between text-xs text-parchment bg-black/40 p-2.5 border border-gold/15"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-serif">{displayName}</span>
                                    {isThisMemberLeader && (
                                      <span className="profile-arch-tag text-gold border-gold/50">
                                        LEADER
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
                                        className="text-[10px] font-taiganja uppercase tracking-wider px-2.5 py-1 border border-red-500/40 text-red-300 hover:bg-red-900/40 transition-colors disabled:opacity-50 cursor-pointer"
                                      >
                                        {isRemovingThisMember
                                          ? "Dismissing..."
                                          : "Dismiss"}
                                      </button>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-parchment/50 font-serif">
                            No teammates have enlisted yet.
                          </p>
                        )}
                      </div>

                      <TransitionLink
                        href={`/events/${team.eventId._id}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold font-taiganja uppercase tracking-wider text-xs transition-all duration-200"
                      >
                        View Event Dossier →
                      </TransitionLink>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
            <img
              src={ASSETS.cloudinary.divider}
              alt=""
              aria-hidden
              className="-my-2 w-48 opacity-60 pointer-events-none"
            />
            <h3 className="font-nasyhama text-2xl text-parchment">
              No Guilds Formed
            </h3>
            <p className="font-taiganja text-[11px] uppercase tracking-widest text-parchment/50 max-w-sm">
              Form an alliance or enlist via code from any team event in the atlas.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
