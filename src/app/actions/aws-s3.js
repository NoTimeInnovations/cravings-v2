"use server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_S3_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY,
    secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_KEY,
  },
  requestTimeout: 120000,
  maxAttempts: 3,
});

export async function uploadFileToS3(file, filename) {
  try {
    if (!file) throw new Error("File not provided");

    if (typeof file === "string" && file.includes("cravingsbucket")) {
      return file;
    }

    let buffer;
    let contentType;
    let fileName = filename || `menu/${Date.now()}.jpg`;

    if (typeof file === "string" && file.startsWith("data:")) {
      const base64Data = file.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
      contentType = file.match(/^data:(.*?);base64/)?.[1] || "image/jpeg";
    } else if (file instanceof Buffer) {
      buffer = file;
      contentType = "application/octet-stream";
    } else if (file instanceof Blob) {
      buffer = Buffer.from(await file.arrayBuffer());
      contentType = file.type || "image/jpeg";
    } else {
      throw new Error("Unsupported file format");
    }

    const uploadParams = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    return `https://${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Error in uploadFileToS3:", error);
    throw error;
  }
}

export async function deleteFileFromS3(fileUrl) {
  try {
    if (!fileUrl) throw new Error("File URL is required");

    const key = decodeURIComponent(
      new URL(fileUrl).pathname.replace(/^\/+/, "")
    );

    const deleteParams = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));

    return true;
  } catch (error) {
    console.error("Error in deleteFileFromS3:", error);
    throw error;
  }
}


export async function deletePartnerFilesFromS3(partnerId) {
  if (!partnerId) throw new Error("Partner ID is required");

  try {
    // 1. List all objects under the partner's prefix (including nested "folders")
    const listParams = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
      Prefix: `${partnerId}/`, // The trailing slash ensures we target the "folder"
    };

    let isTruncated = true;
    let contents = [];

    // Paginate through all objects (S3 returns max 1000 objects per request)
    while (isTruncated) {
      const response = await s3Client.send(new ListObjectsV2Command(listParams));
      if (response.Contents) {
        contents.push(...response.Contents);
      }
      isTruncated = response.IsTruncated;
      if (isTruncated) {
        listParams.ContinuationToken = response.NextContinuationToken;
      }
    }

    // 2. If no files found, exit early
    if (contents.length === 0) {
      console.log(`No files found for partner ${partnerId}`);
      return true;
    }

    // 3. Delete all objects in batches (S3 allows up to 1000 objects per delete request)
    const BATCH_SIZE = 1000;
    for (let i = 0; i < contents.length; i += BATCH_SIZE) {
      const batch = contents.slice(i, i + BATCH_SIZE);
      const deleteParams = {
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
        Delete: {
          Objects: batch.map(({ Key }) => ({ Key })),
          Quiet: true, // Set to false if you want to see errors per object
        },
      };

      await s3Client.send(new DeleteObjectsCommand(deleteParams));
      console.log(`Deleted batch ${i / BATCH_SIZE + 1}`);
    }

    console.log(`Successfully deleted all files for partner ${partnerId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete files for partner ${partnerId}:`, error);
    throw error;
  }
}