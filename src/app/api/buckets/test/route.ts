import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getS3Client, listObjects } from "@/lib/s3";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, endpoint, region, accessKey, secretKey, bucketName } = body;

    if (!region || !accessKey || !secretKey || !bucketName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const s3Client = getS3Client({
      endpoint,
      region,
      accessKey,
      secretKey,
    });

    // Test the connection by trying to list objects with a max limit of 1
    // This will throw an error if credentials, region, or bucket are invalid.
    await listObjects(s3Client, bucketName, "");

    return NextResponse.json({ success: true, message: "Connection successful!" });
  } catch (error: any) {
    console.error("S3 Test Connection Error:", error);
    return NextResponse.json(
      { error: `Connection failed: ${error.message}` },
      { status: 400 }
    );
  }
}
