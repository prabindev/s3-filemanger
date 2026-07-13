import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { buckets: true },
    });

    return NextResponse.json({ buckets: user?.buckets || [] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch buckets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { name, provider, endpoint, region, accessKey, secretKey, bucketName } = data;

    if (!name || !provider || !endpoint || !region || !accessKey || !secretKey || !bucketName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const bucket = await prisma.bucketConfig.create({
      data: {
        name,
        provider,
        endpoint,
        region,
        accessKey,
        secretKey,
        bucketName,
        userId: userId,
      },
    });

    return NextResponse.json({ bucket }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to add bucket:", error);
    return NextResponse.json({ error: `Failed to add bucket: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { id, name, provider, endpoint, region, accessKey, secretKey, bucketName } = data;

    if (!id || !name || !provider || !region || !accessKey || !secretKey || !bucketName) {
      return NextResponse.json({ error: "All fields except endpoint are required" }, { status: 400 });
    }

    // Verify ownership
    const existingBucket = await prisma.bucketConfig.findUnique({
      where: { id },
    });

    if (!existingBucket || existingBucket.userId !== userId) {
      return NextResponse.json({ error: "Bucket not found or unauthorized" }, { status: 404 });
    }

    const bucket = await prisma.bucketConfig.update({
      where: { id },
      data: {
        name,
        provider,
        endpoint,
        region,
        accessKey,
        secretKey,
        bucketName,
      },
    });

    return NextResponse.json({ bucket }, { status: 200 });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update bucket" }, { status: 500 });
  }
}
