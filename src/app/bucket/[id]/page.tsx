"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import styles from "./explorer.module.css";
import { Folder, File, Download, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BucketExplorer({ params }: { params: { id: string } }) {
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchContents = async (prefix = currentPrefix) => {
    setLoading(true);
    try {
      const res = await fetch("/api/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", bucketId: params.id, prefix }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setFiles(data.files || []);
      setFolders(data.folders || []);
      setCurrentPrefix(prefix);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents("");
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const key = `${currentPrefix}${file.name}`;
      
      // 1. Get Presigned URL
      const res = await fetch("/api/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getUploadUrl", bucketId: params.id, key, contentType: file.type }),
      });
      const { url } = await res.json();

      // 2. Upload directly to S3
      if (url) {
        await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });
      }
    }
    // Refresh listing
    fetchContents();
  }, [currentPrefix, params.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleDelete = async (key: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    await fetch("/api/s3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", bucketId: params.id, key }),
    });
    fetchContents();
  };

  const handleDownload = async (key: string) => {
    const res = await fetch("/api/s3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getDownloadUrl", bucketId: params.id, key }),
    });
    const { url } = await res.json();
    if (url) window.open(url, "_blank");
  };

  const navigateToFolder = (prefix: string) => {
    fetchContents(prefix);
  };

  const navigateUp = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split("/").filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join("/") + "/" : "";
    fetchContents(newPrefix);
  };

  // Basic search filter
  const filteredFiles = files.filter(f => f.Key.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFolders = folders.filter(f => f.Prefix.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          <Link href="/dashboard" className={styles.breadcrumbLink}><ArrowLeft size={24} /></Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbLink} onClick={() => fetchContents("")}>root</span>
          {currentPrefix.split("/").filter(Boolean).map((part, idx, arr) => (
            <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbLink} onClick={() => navigateToFolder(arr.slice(0, idx+1).join("/") + "/")}>{part}</span>
            </span>
          ))}
        </div>
        <div className={styles.actions}>
          <input 
            type="text" 
            placeholder="Search in folder..." 
            className={styles.searchBar}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ""}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className={styles.dropzoneText}>Drop files here to upload...</p>
        ) : (
          <p className={styles.dropzoneText}>Drag & drop files here, or click to select files to upload directly to S3</p>
        )}
      </div>

      <div className={styles.fileList}>
        {currentPrefix && (
          <div className={styles.fileRow} onClick={navigateUp} style={{ cursor: 'pointer' }}>
            <Folder className={`${styles.fileIcon} ${styles.folderIcon}`} />
            <span className={styles.fileName}>..</span>
          </div>
        )}

        {filteredFolders.map((folder) => (
          <div key={folder.Prefix} className={styles.fileRow}>
            <Folder className={`${styles.fileIcon} ${styles.folderIcon}`} />
            <span className={styles.fileName} onClick={() => navigateToFolder(folder.Prefix)}>
              {folder.Prefix.replace(currentPrefix, "").replace("/", "")}
            </span>
          </div>
        ))}

        {filteredFiles.filter(f => f.Key !== currentPrefix).map((file) => (
          <div key={file.Key} className={styles.fileRow}>
            <File className={styles.fileIcon} />
            <span className={styles.fileName}>{file.Key.replace(currentPrefix, "")}</span>
            <span className={styles.fileSize}>{(file.Size / 1024).toFixed(1)} KB</span>
            <span className={styles.fileDate}>{new Date(file.LastModified).toLocaleDateString()}</span>
            <div className={styles.fileActions}>
              <button className={styles.actionButton} onClick={() => handleDownload(file.Key)}><Download size={18} /></button>
              <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(file.Key)}><Trash2 size={18} /></button>
            </div>
          </div>
        ))}

        {!loading && filteredFiles.length === 0 && filteredFolders.length === 0 && !currentPrefix && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No files found in this bucket.</div>
        )}
      </div>
    </div>
  );
}
