"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Folder, File, Download, Trash2, ArrowLeft, Cloud, Database } from "lucide-react";
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Area */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0 w-full sm:w-auto">
            <Link href="/dashboard" className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className="text-gray-400 font-light">/</span>
            <button onClick={() => fetchContents("")} className="px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              root
            </button>
            
            {currentPrefix.split("/").filter(Boolean).map((part, idx, arr) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-400 font-light">/</span>
                <button 
                  onClick={() => navigateToFolder(arr.slice(0, idx+1).join("/") + "/")}
                  className="px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                >
                  {part}
                </button>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search in folder..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Dropzone */}
        <div 
          {...getRootProps()} 
          className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-inner' 
              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-3">
            <div className={`p-3 rounded-full ${isDragActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
              <Cloud size={28} />
            </div>
            {isDragActive ? (
              <p className="text-blue-600 dark:text-blue-400 font-medium">Drop files here to upload...</p>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 font-medium">Drag & drop files here, or click to select files</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">Uploads securely and directly to your S3 bucket</p>
          </div>
        </div>

        {/* File List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex-1">
          <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            
            {/* Parent Directory Link */}
            {currentPrefix && (
              <div onClick={navigateUp} className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors group">
                <Folder size={20} className="text-blue-500 dark:text-blue-400 mr-4 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">..</span>
              </div>
            )}

            {/* Folders */}
            {filteredFolders.map((folder) => (
              <div 
                key={folder.Prefix} 
                onClick={() => navigateToFolder(folder.Prefix)}
                className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors group"
              >
                <Folder size={20} className="text-yellow-400 dark:text-yellow-500 mr-4 group-hover:scale-110 transition-transform" fill="currentColor" fillOpacity={0.2} />
                <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {folder.Prefix.replace(currentPrefix, "").replace("/", "")}
                </span>
              </div>
            ))}

            {/* Files */}
            {filteredFiles.filter(f => f.Key !== currentPrefix).map((file) => (
              <div key={file.Key} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group">
                <div className="flex items-center flex-1 min-w-0 pr-4">
                  <File size={20} className="text-gray-400 dark:text-gray-500 mr-4 flex-shrink-0" />
                  <span className="truncate text-gray-700 dark:text-gray-300">
                    {file.Key.replace(currentPrefix, "")}
                  </span>
                </div>
                
                <div className="flex items-center gap-6">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right hidden sm:block">
                    {(file.Size / 1024).toFixed(1)} KB
                  </span>
                  <span className="text-xs text-gray-400 w-24 text-right hidden md:block">
                    {new Date(file.LastModified).toLocaleDateString()}
                  </span>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownload(file.Key); }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.Key); }}
                      className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {!loading && filteredFiles.length === 0 && filteredFolders.length === 0 && !currentPrefix && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                <Database size={40} className="text-gray-300 dark:text-gray-600" />
                <p>No files found in this bucket yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
