# Multi-Cloud S3 File Manager

A premium, minimal, and professional web application for managing files across various cloud storage providers that support the S3 API (Amazon S3, Cloudflare R2, Google Cloud Storage, MinIO, etc.).

## Features

- **Multi-Cloud Support**: Connect to AWS, Cloudflare R2, GCP, and more.
- **Direct S3 Uploads**: Files are uploaded directly from your browser to S3 using Presigned URLs (bypassing the server for high performance).
- **Drag & Drop**: Easily drag files into the folder view to upload.
- **Virtual Folders**: Navigate through prefixes just like a standard file explorer.
- **File Management**: Move, delete, and download files.
- **Authentication**: Secure NextAuth login backed by SQLite.

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```
4. Setup the database:
   ```bash
   npx prisma db push
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

## CORS Configuration (Critical)

For the direct drag-and-drop uploads to work, you **must** configure CORS on your S3 buckets.

### AWS S3 CORS Policy Example

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST",
            "DELETE",
            "GET"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://your-production-domain.com"
        ],
        "ExposeHeaders": []
    }
]
```

### Cloudflare R2 CORS Policy Example

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```
