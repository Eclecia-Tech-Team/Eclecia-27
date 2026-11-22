import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connect from "@/lib/mongoose";
import User, { IUserDocument } from "@/lib/models/User";
import CampusAmbassador, { ICampusAmbassadorDocument } from "@/lib/models/CampusAmbassador";
import { generateUniqueAmbassadorCode } from "@/lib/ambassador-code";
import { sendCampusAmbassadorEmail } from "@/lib/auth-mail";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connect();

    // 1. Check if user is already an ambassador
    const existingAmbassador = (await CampusAmbassador.findOne({
      userId: session.user.id,
    }).lean()) as ICampusAmbassadorDocument | null;

    if (existingAmbassador) {
      return NextResponse.json({
        isAmbassador: true,
        ambassador: {
          id: existingAmbassador._id.toString(),
          userId: existingAmbassador.userId.toString(),
          name: existingAmbassador.name,
          college: existingAmbassador.college,
          graduationYear: existingAmbassador.graduationYear,
          ambassadorCode: existingAmbassador.ambassadorCode,
          status: existingAmbassador.status,
          referralCount: existingAmbassador.referralCount ?? 0,
          createdAt: existingAmbassador.createdAt,
        },
      });
    }

    // 2. Otherwise return user profile data so form can prefill
    const user = (await User.findById(session.user.id)
      .select("fullName phoneNumber college stream isProfileComplete username email")
      .lean()) as IUserDocument | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      isAmbassador: false,
      user: {
        id: session.user.id,
        fullName: user.fullName || "",
        phoneNumber: user.phoneNumber || "",
        college: user.college || "",
        stream: user.stream || "",
        isProfileComplete: user.isProfileComplete || false,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("GET /api/cam error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ambassador details" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { graduationYear, fullName, college, phoneNumber, stream } = body;

    const parsedYear = Number(graduationYear);
    const currentYear = new Date().getFullYear();

    if (!parsedYear || isNaN(parsedYear) || parsedYear < currentYear - 1 || parsedYear > currentYear + 7) {
      return NextResponse.json(
        { error: "Please select a valid graduation year." },
        { status: 400 }
      );
    }

    await connect();

    // Check if already registered
    const alreadyRegistered = await CampusAmbassador.findOne({
      userId: session.user.id,
    });

    if (alreadyRegistered) {
      return NextResponse.json(
        {
          error: "You have already joined as a Campus Ambassador.",
          ambassador: alreadyRegistered,
        },
        { status: 409 }
      );
    }

    // Fetch user to ensure user exists & sync profile if missing
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // If profile fields were supplied/updated in this form, sync them to user
    const resolvedName = (fullName?.trim() || user.fullName || "").trim();
    const resolvedCollege = (college?.trim() || user.college || "").trim();
    const resolvedPhone = (phoneNumber?.trim() || user.phoneNumber || "").trim();
    const resolvedStream = (stream?.trim() || user.stream || "").trim();

    if (!resolvedName) {
      return NextResponse.json(
        { error: "Full name is required. Please fill in your name." },
        { status: 400 }
      );
    }

    if (!resolvedCollege) {
      return NextResponse.json(
        { error: "College name is required. Please provide your college/institute." },
        { status: 400 }
      );
    }

    // Update user profile fields if they weren't saved yet
    let userChanged = false;
    if (!user.fullName && resolvedName) {
      user.fullName = resolvedName;
      userChanged = true;
    }
    if (!user.college && resolvedCollege) {
      user.college = resolvedCollege;
      userChanged = true;
    }
    if (!user.phoneNumber && resolvedPhone) {
      user.phoneNumber = resolvedPhone;
      userChanged = true;
    }
    if (!user.stream && resolvedStream) {
      user.stream = resolvedStream;
      userChanged = true;
    }
    if (user.fullName && user.college && user.phoneNumber && user.stream && !user.isProfileComplete) {
      user.isProfileComplete = true;
      userChanged = true;
    }
    if (userChanged) {
      await user.save();
    }

    // Generate unique code format ECL27-CAP-<XXXX>
    const ambassadorCode = await generateUniqueAmbassadorCode();

    const newAmbassador = await CampusAmbassador.create({
      userId: user._id,
      name: resolvedName,
      college: resolvedCollege,
      graduationYear: parsedYear,
      ambassadorCode,
      status: "active",
      referralCount: 0,
    });

    // Send automated celestial induction email
    if (user.email) {
      try {
        await sendCampusAmbassadorEmail(user.email, {
          name: resolvedName,
          college: resolvedCollege,
          graduationYear: parsedYear,
          ambassadorCode,
        });
      } catch (mailErr) {
        console.error("Failed to send campus ambassador email:", mailErr);
      }
    }

    return NextResponse.json(
      {
        message: "Welcome to the Celestial Ambassador Guild!",
        ambassador: {
          id: newAmbassador._id.toString(),
          userId: newAmbassador.userId.toString(),
          name: newAmbassador.name,
          college: newAmbassador.college,
          graduationYear: newAmbassador.graduationYear,
          ambassadorCode: newAmbassador.ambassadorCode,
          status: newAmbassador.status,
          referralCount: newAmbassador.referralCount,
          createdAt: newAmbassador.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/cam error:", error);
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: "An ambassador account already exists for this user." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to submit Campus Ambassador application." },
      { status: 500 }
    );
  }
}
