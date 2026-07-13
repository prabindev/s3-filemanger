import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getS3Client, listObjects, generateUploadUrl, generateDownloadUrl, moveObject, deleteObject } from "@/lib/s3";

async function getAuthorizedBucket(bucketId: string, userId: string) {
  const bucket = await prisma.bucketConfig.findFirst({
    where: { id: bucketId, userId },
  });
  if (!bucket) throw new Error("Bucket not found or unauthorized");
  return bucket;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, bucketId, prefix, key, destKey, contentType } = await req.json();
    const bucketConfig = await getAuthorizedBucket(bucketId, session.user.id);
    const client = getS3Client(bucketConfig);

    switch (action) {
      case "list":
        const listData = await listObjects(client, bucketConfig.bucketName, prefix);
        return NextResponse.json(listData);

      case "getUploadUrl":
        const uploadUrl = await generateUploadUrl(client, bucketConfig.bucketName, key, contentType);
        return NextResponse.json({ url: uploadUrl });

      case "getDownloadUrl":
        const downloadUrl = await generateDownloadUrl(client, bucketConfig.bucketName, key);
        return NextResponse.json({ url: downloadUrl });

      case "move":
        await moveObject(client, bucketConfig.bucketName, key, destKey);
        return NextResponse.json({ success: true });

      case "delete":
        await deleteObject(client, bucketConfig.bucketName, key);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("S3 API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
