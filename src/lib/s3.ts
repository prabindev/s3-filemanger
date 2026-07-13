import { S3Client, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export function getS3Client(config: {
  endpoint?: string;
  region: string;
  accessKey: string;
  secretKey: string;
}) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    // Force path style for non-AWS endpoints like MinIO, but let AWS use virtual hosted
    forcePathStyle: !!config.endpoint && !config.endpoint.includes("amazonaws.com"),
  });
}

export async function listObjects(client: S3Client, bucket: string, prefix: string = "") {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: "/", // Essential for simulating folders
  });
  
  const response = await client.send(command);
  return {
    files: response.Contents || [],
    folders: response.CommonPrefixes || [],
  };
}

export async function generateUploadUrl(client: S3Client, bucket: string, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  
  // URL expires in 1 hour
  return await getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function generateDownloadUrl(client: S3Client, bucket: string, key: string) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return await getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function moveObject(client: S3Client, bucket: string, sourceKey: string, destKey: string) {
  // If moving a folder, we must move all objects with this prefix
  if (sourceKey.endsWith("/")) {
    // List all objects in the folder
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: sourceKey,
        ContinuationToken: continuationToken,
      });
      const listResponse = await client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Copy each object
        for (const obj of listResponse.Contents) {
          if (!obj.Key) continue;
          
          // Calculate new key: replace the old prefix with the new prefix
          const newObjKey = destKey + obj.Key.substring(sourceKey.length);
          
          await client.send(
            new CopyObjectCommand({
              Bucket: bucket,
              CopySource: encodeURI(`${bucket}/${obj.Key}`),
              Key: newObjKey,
            })
          );
          
          // Delete original
          await client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: obj.Key,
            })
          );
        }
      }
      isTruncated = listResponse.IsTruncated ?? false;
      continuationToken = listResponse.NextContinuationToken;
    }
  } else {
    // Moving a single file
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeURI(`${bucket}/${sourceKey}`),
        Key: destKey,
      })
    );
    
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
      })
    );
  }
}

export async function deleteObject(client: S3Client, bucket: string, key: string) {
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export async function createFolder(client: S3Client, bucket: string, key: string) {
  // To create a folder in S3, we simply create a 0-byte object with a trailing slash
  const folderKey = key.endsWith("/") ? key : `${key}/`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: folderKey,
      Body: "",
    })
  );
}
