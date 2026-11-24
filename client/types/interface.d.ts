import mongoose, { Types } from "mongoose";

export type EventCategory =
  | "Celeste"
  | "Taal Tarang"
  | "Anubhuti"
  | "BakyaRongo"
  | "Aetheria"
  | "Cadence"
  | "Brahmand";

export interface IAtlasCategory {
  /** Slug id, e.g. "kalakriti". */
  id: string;
  name: string;
  kind: string;
  line: string;
  /** Cloudinary URL for the category artwork. */
  image: string;
}

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  /** Free-form for now; nothing enforces or reads roles yet. */
  roles: string[];
  passwordHash?: string;
  image?: string;
  avatar?: number;
  provider: "google" | "credentials";
  emailVerified?: Date;
  verified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  fullName?: string;
  phoneNumber?: string;
  college?: string;
  stream?: string;
  isProfileComplete: boolean;
}

export interface IPoc {
  name: string;
  mobile: string;
}

export interface IEvent {
  /** Atlas id (e.g. "short-film"); ties the record to its artwork. */
  slug: string;
  eventName: string;
  category: EventCategory;
  /** Short genre label shown in the atlas (e.g. "Filmmaking"). */
  kind?: string;
  duration: string;
  venue: string;
  /** Fest day "2027-01-16" (IST); null until announced. */
  scheduleDate?: string | null;
  /** "14:30", 24-hour IST. */
  startTime?: string | null;
  endTime?: string | null;
  description: string;
  banner?: string | null;
  rules: string[];
  clubs: string[];
  isTeamEvent: boolean;
  isActive: boolean;
  doc?: string;
  pocs: IPoc[];
  maxMembersPerTeam: number;
  minMembersPerTeam: number;
  teamLimit?: number;
  prizePool: string;
  isPaidEvent: boolean;
  isFoodProvided: boolean;
  maxFoodServingsPerParticipant: number;
  fees: number;
  registrations: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicEventProps {
  _id: string;
  slug: string;
  eventName: string;
  category: EventCategory;
  kind?: string;
  description: string;
  banner?: string | null;
  clubs: string[];
  scheduleDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  venue: string;
  isTeamEvent: boolean;
  minMembersPerTeam: number;
  maxMembersPerTeam: number;
  prizePool: string;
  isActive: boolean;
}

export interface IRegistration {
  eventId: Types.ObjectId;
  registrationCode?: string;
  isInTeam: boolean;
  teamId?: Types.ObjectId;
  participant: Types.ObjectId;
  verified: boolean;
  checkedIn: boolean;
  checkedInAt?: Date;
  checkedInBy?: Types.ObjectId;
  checkedInByEmail?: string;
  foodServedCount: number;
  lastFoodServedAt?: Date;
  referredByCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeam {
  eventId: Types.ObjectId;
  teamCode: string;
  teamName?: string;
  teamLeader: Types.ObjectId;
  team: Types.ObjectId[];
  paymentStatus?: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface RegiEventProps {
  _id: string;
  slug?: string;
  eventName: string;
  category: EventCategory;
  banner?: string | null;
  scheduleDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  venue: string;
  minMembersPerTeam?: number;
  maxMembersPerTeam?: number;
  isPaidEvent?: boolean;
}

export interface Registration {
  _id: string;
  registrationCode?: string;
  /** False for team members: their leader pays. */
  isPayer?: boolean;
  eventId: RegiEventProps;
  isInTeam: boolean;
  participant: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface Team {
  _id: string;
  eventId: RegiEventProps;
  teamLeader:
    | string
    | {
        _id: string;
        username?: string;
        fullName?: string;
      };
  teamCode: string;
  teamName?: string;
  paymentStatus?: "pending" | "completed" | "failed";
  team: (
    | string
    | {
        _id: string;
        username?: string;
        fullName?: string;
      }
  )[];
  members?: {
    _id: string;
    username?: string;
    fullName?: string;
    isLeader: boolean;
  }[];
  teamSize?: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface PopulatedTeamUser {
  _id: mongoose.Types.ObjectId;
  username?: string;
  fullName?: string;
}

export interface RegistrationLean {
  _id: mongoose.Types.ObjectId;
  isInTeam?: boolean;
  teamId?: mongoose.Types.ObjectId;
  verified?: boolean;
  createdAt?: Date;
}

export interface TeamLean {
  _id: mongoose.Types.ObjectId;
  teamCode: string;
  teamName?: string;
  teamLeader?: PopulatedTeamUser;
  team?: PopulatedTeamUser[];
  paymentStatus?: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface MyTeamResponse {
  _id: string;
  teamCode: string;
  teamName?: string;
  paymentStatus?: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
  isTeamLeader?: boolean;
  members: {
    _id: string;
    username: string;
    fullName: string;
    isLeader: boolean;
  }[];
  teamSize: number;
}

export interface TeamMember {
  _id: string;
  username?: string;
  fullName?: string;
  isLeader?: boolean;
}

export interface TeamDetails {
  _id: string;
  teamCode: string;
  teamName?: string;
  teamSize: number;
  isTeamLeader?: boolean;
  paymentStatus?: "pending" | "completed" | "failed";
  members: TeamMember[];
}

export interface EventDetails {
  _id: string;
  eventName: string;
  category: string;
  scheduleDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  duration?: string;
  venue: string;
  description: string;
  banner?: string;
  rules?: string[];
  clubs?: string[];
  pocs?: { name: string; mobile: string }[];
  isTeamEvent: boolean;
  isActive: boolean;
  doc?: string;
  minMembersPerTeam: number;
  maxMembersPerTeam: number;
  isPaidEvent: boolean;
  fees: number;
  prizePool: string;
  userRegistration?: {
    isRegistered: boolean;
    isInTeam: boolean;
    verified: boolean;
    registrationId?: string | null;
  };
  myTeam?: TeamDetails | null;
}

export interface ProfileData {
  username: string;
  avatar: number | null;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  college?: string;
  stream?: string;
  isProfileComplete?: boolean;
  qrPayload?: string;
}

export interface ICampusAmbassadorData {
  id?: string;
  userId: string;
  name: string;
  college: string;
  graduationYear: number;
  ambassadorCode: string;
  status: "active" | "pending" | "suspended";
  referralCount: number;
  createdAt?: string;
}

