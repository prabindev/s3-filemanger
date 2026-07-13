"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Folder, File, Download, Trash2, ArrowLeft, Cloud, Database, Grid, List, MoreVertical, FolderPlus, MoveRight, Edit3 } from "lucide-react";
import Link from "next/link";

export default function BucketExplorer({ params }: { params: { id: string } }) {
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [viewMode, setViewMode] = useState<'grid'|'list'>('list');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // Modals
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [moveModalOpen, setMoveModalOpen] = useState<any | null>(null);
  const [moveDestPath, setMoveDestPath] = useState("");

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
      setActiveMenu(null);
    }
  };

  useEffect(() => {
    fetchContents("");
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const key = `${currentPrefix}${file.name}`;
      const res = await fetch("/api/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getUploadUrl", bucketId: params.id, key, contentType: file.type }),
      });
      const { url } = await res.json();

      if (url) {
        await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
      }
    }
    fetchContents();
  }, [currentPrefix, params.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    // Ensure no leading slash, and proper format
    const cleanName = newFolderName.replace(/^\/+|\/+$/g, '');
    const newKey = `${currentPrefix}${cleanName}/`;

    await fetch("/api/s3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createFolder", bucketId: params.id, key: newKey }),
    });

    setIsCreateFolderOpen(false);
    setNewFolderName("");
    fetchContents();
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveModalOpen) return;

    let finalDest = moveDestPath.replace(/^\/+/, ''); // remove leading slash
    if (finalDest && !finalDest.endsWith('/')) {
      finalDest += '/';
    }
    
    const fileName = moveModalOpen.isFolder 
      ? moveModalOpen.key.replace(currentPrefix, "") 
      : moveModalOpen.key.split('/').pop();
      
    const destKey = `${finalDest}${fileName}`;

    await fetch("/api/s3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "move", 
        bucketId: params.id, 
        key: moveModalOpen.key,
        destKey: destKey
      }),
    });

    setMoveModalOpen(null);
    setMoveDestPath("");
    fetchContents();
  };

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

  const navigateToFolder = (prefix: string) => fetchContents(prefix);

  const navigateUp = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split("/").filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join("/") + "/" : "";
    fetchContents(newPrefix);
  };

  const filteredFiles = files.filter(f => f.Key.toLowerCase().includes(searchQuery.toLowerCase()) && f.Key !== currentPrefix);
  const filteredFolders = folders.filter(f => f.Prefix.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderContextMenu = (item: any, isFolder: boolean) => {
    const key = isFolder ? item.Prefix : item.Key;
    return (
      <div className="relative">
        <button 
          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === key ? null : key); }}
          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <MoreVertical size={18} />
        </button>
        
        {activeMenu === key && (
          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50">
            {!isFolder && (
              <button onClick={(e) => { e.stopPropagation(); handleDownload(key); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <Download size={16} /> Download
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setMoveDestPath(currentPrefix); setMoveModalOpen({ key, isFolder }); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <MoveRight size={16} /> Move to...
            </button>
            <button onClick={(e) => { e.stopPropagation(); setMoveDestPath(currentPrefix); setMoveModalOpen({ key, isFolder, renameOnly: true }); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <Edit3 size={16} /> Rename
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(key); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div {...getRootProps()} className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col ${isDragActive ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
      <input {...getInputProps()} />
      
      {/* Drag Overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-3xl pointer-events-none">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
            <Cloud size={48} className="text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Drop files to upload</h2>
            <p className="text-gray-500">to /{currentPrefix}</p>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0 w-full md:w-auto hide-scrollbar">
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

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="w-full sm:w-64">
              <input 
                type="text" 
                placeholder="Search in folder..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                <List size={18} />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                <Grid size={18} />
              </button>
            </div>
            <button 
              onClick={() => setIsCreateFolderOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <FolderPlus size={16} /> <span className="hidden sm:inline">New Folder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full p-4 sm:p-6 lg:p-8">
        
        {viewMode === 'list' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-visible">
            <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              
              {currentPrefix && (
                <div onClick={navigateUp} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors group">
                  <Folder size={20} className="text-gray-400 mr-4" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">..</span>
                </div>
              )}

              {filteredFolders.map((folder) => (
                <div key={folder.Prefix} onClick={() => navigateToFolder(folder.Prefix)} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors group">
                  <div className="flex items-center flex-1">
                    <Folder size={20} className="text-blue-500 dark:text-blue-400 mr-4" fill="currentColor" fillOpacity={0.2} />
                    <span className="font-medium text-gray-800 dark:text-gray-200">{folder.Prefix.replace(currentPrefix, "").replace("/", "")}</span>
                  </div>
                  {renderContextMenu(folder, true)}
                </div>
              ))}

              {filteredFiles.map((file) => (
                <div key={file.Key} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group cursor-default">
                  <div className="flex items-center flex-1 min-w-0 pr-4">
                    <File size={20} className="text-gray-400 dark:text-gray-500 mr-4 flex-shrink-0" />
                    <span className="truncate text-gray-700 dark:text-gray-300">{file.Key.replace(currentPrefix, "")}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-24 text-right hidden sm:block">{(file.Size / 1024).toFixed(1)} KB</span>
                    <span className="text-sm text-gray-400 w-28 text-right hidden md:block">{new Date(file.LastModified).toLocaleDateString()}</span>
                    {renderContextMenu(file, false)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {currentPrefix && (
              <div onClick={navigateUp} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md cursor-pointer flex flex-col items-center justify-center gap-2 aspect-square transition-all group">
                <Folder size={48} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">..</span>
              </div>
            )}
            
            {filteredFolders.map((folder) => (
              <div key={folder.Prefix} onClick={() => navigateToFolder(folder.Prefix)} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md cursor-pointer flex flex-col items-center justify-center gap-3 aspect-square transition-all relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {renderContextMenu(folder, true)}
                </div>
                <Folder size={48} className="text-blue-500 dark:text-blue-400" fill="currentColor" fillOpacity={0.2} />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center truncate w-full">{folder.Prefix.replace(currentPrefix, "").replace("/", "")}</span>
              </div>
            ))}

            {filteredFiles.map((file) => (
              <div key={file.Key} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md flex flex-col items-center justify-center gap-3 aspect-square transition-all relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {renderContextMenu(file, false)}
                </div>
                <File size={48} className="text-gray-400 dark:text-gray-500" />
                <div className="w-full text-center">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate w-full" title={file.Key.replace(currentPrefix, "")}>{file.Key.replace(currentPrefix, "")}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.Size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredFiles.length === 0 && filteredFolders.length === 0 && !currentPrefix && (
          <div className="mt-20 flex flex-col items-center justify-center text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
              <Database size={48} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Your bucket is empty</h3>
            <p className="text-gray-500 dark:text-gray-400">Drag and drop files anywhere on this page to upload.</p>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Folder</h2>
            <form onSubmit={handleCreateFolder}>
              <input 
                autoFocus
                required 
                value={newFolderName} 
                onChange={e => setNewFolderName(e.target.value)} 
                placeholder="Folder name" 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-6" 
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateFolderOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move / Rename Modal */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {moveModalOpen.renameOnly ? "Rename" : "Move to..."}
            </h2>
            <p className="text-sm text-gray-500 mb-6 truncate">
              {moveModalOpen.key}
            </p>
            <form onSubmit={handleMove}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {moveModalOpen.renameOnly ? "New Name (Full Path)" : "Destination Path"}
                </label>
                <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                  <span className="text-gray-400 shrink-0">root/</span>
                  <input 
                    autoFocus
                    required 
                    value={moveDestPath} 
                    onChange={e => setMoveDestPath(e.target.value)} 
                    placeholder={moveModalOpen.renameOnly ? "new-name.txt" : "folder/subfolder/"} 
                    className="w-full py-2 bg-transparent text-gray-900 dark:text-white outline-none ml-1" 
                  />
                </div>
                {!moveModalOpen.renameOnly && (
                  <p className="text-xs text-gray-400 mt-1">Leave empty to move to root. Example: `images/`</p>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setMoveModalOpen(null); setMoveDestPath(""); }} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
