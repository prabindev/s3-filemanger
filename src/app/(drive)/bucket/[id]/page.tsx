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
    <div {...getRootProps()} className={`min-h-full flex flex-col relative ${isDragActive ? 'bg-[#0B57D0]/5 dark:bg-[#A8C7FA]/5' : ''}`}>
      <input {...getInputProps()} />
      
      {/* Drag Overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-[#1E1F20]/80 backdrop-blur-sm border-[3px] border-[#0B57D0] dark:border-[#A8C7FA] border-dashed m-2 rounded-[20px] pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-white dark:bg-[#282A2C] px-8 py-6 rounded-2xl shadow-xl">
            <Cloud size={48} className="text-[#0B57D0] dark:text-[#A8C7FA]" />
            <h2 className="text-xl font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">Drop files to upload</h2>
            <p className="text-sm text-[#444746] dark:text-[#C4C7C5]">to {currentPrefix ? `/${currentPrefix}` : 'root'}</p>
          </div>
        </div>
      )}

      {/* Drive Action Bar & Breadcrumbs */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#1E1F20] px-4 md:px-6 pt-4 pb-2 border-b border-[#E0E0E0] dark:border-[#444746] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-[18px] sm:text-[22px] text-[#1F1F1F] dark:text-[#E3E3E3] overflow-x-auto hide-scrollbar whitespace-nowrap">
          <Link href="/dashboard" className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors mr-1">
            <ArrowLeft size={24} className="text-[#444746] dark:text-[#E3E3E3]" />
          </Link>
          <button onClick={() => fetchContents("")} className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors font-medium">
            My Drive
          </button>
          
          {currentPrefix.split("/").filter(Boolean).map((part, idx, arr) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-[#747775] dark:text-[#8E918F] font-light">&rsaquo;</span>
              <button 
                onClick={() => navigateToFolder(arr.slice(0, idx+1).join("/") + "/")}
                className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors font-medium"
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex bg-[#E9EEF6] dark:bg-[#282A2C] rounded-full p-0.5">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#37393B] shadow-sm text-[#1F1F1F] dark:text-[#E3E3E3]' : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-white/50 dark:hover:bg-[#37393B]/50'}`}>
              <List size={20} />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#37393B] shadow-sm text-[#1F1F1F] dark:text-[#E3E3E3]' : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-white/50 dark:hover:bg-[#37393B]/50'}`}>
              <Grid size={20} />
            </button>
          </div>
          <div className="w-px h-6 bg-[#E0E0E0] dark:bg-[#444746] mx-1"></div>
          <button 
            onClick={() => setIsCreateFolderOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#37393B] border border-[#747775] dark:border-[#8E918F] hover:bg-[#F8F9FA] dark:hover:bg-[#474A4D] text-[#0B57D0] dark:text-[#A8C7FA] text-sm font-medium rounded-full transition-colors whitespace-nowrap"
          >
            <FolderPlus size={18} /> <span className="hidden sm:inline">New folder</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full p-4 md:p-6 lg:p-8 min-h-[50vh]">
        
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-6 w-6 border-2 border-[#0B57D0] dark:border-[#A8C7FA] border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && filteredFolders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[14px] font-medium text-[#444746] dark:text-[#E3E3E3] mb-3">Folders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentPrefix && (
                <div onClick={navigateUp} className="bg-[#F2F6FC] dark:bg-[#282A2C] rounded-[12px] p-3 flex items-center cursor-pointer hover:bg-[#E9EEF6] dark:hover:bg-[#303134] transition-colors group">
                  <Folder size={24} className="text-[#444746] dark:text-[#C4C7C5] mr-3" />
                  <span className="text-[14px] font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">..</span>
                </div>
              )}
              {filteredFolders.map((folder) => (
                <div key={folder.Prefix} onClick={() => navigateToFolder(folder.Prefix)} className="bg-[#F2F6FC] dark:bg-[#282A2C] rounded-[12px] p-3 flex items-center justify-between cursor-pointer hover:bg-[#E9EEF6] dark:hover:bg-[#303134] transition-colors group">
                  <div className="flex items-center flex-1 min-w-0">
                    <Folder size={24} className="text-[#444746] dark:text-[#C4C7C5] mr-3 fill-current opacity-80" />
                    <span className="text-[14px] font-medium text-[#1F1F1F] dark:text-[#E3E3E3] truncate pr-2">{folder.Prefix.replace(currentPrefix, "").replace("/", "")}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {renderContextMenu(folder, true)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && filteredFiles.length > 0 && (
          <div>
            <h2 className="text-[14px] font-medium text-[#444746] dark:text-[#E3E3E3] mb-3">Files</h2>
            {viewMode === 'list' ? (
              <div className="border border-[#E0E0E0] dark:border-[#444746] rounded-xl overflow-hidden bg-white dark:bg-[#282A2C]">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-3 border-b border-[#E0E0E0] dark:border-[#444746] bg-[#F8F9FA] dark:bg-[#131314] text-[13px] font-medium text-[#444746] dark:text-[#C4C7C5]">
                  <div>Name</div>
                  <div className="w-24 text-right hidden sm:block">File size</div>
                  <div className="w-32 text-right hidden md:block">Last modified</div>
                  <div className="w-8"></div>
                </div>
                <div className="divide-y divide-[#E0E0E0] dark:divide-[#444746]">
                  {filteredFiles.map((file) => (
                    <div key={file.Key} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-3 items-center hover:bg-[#F2F6FC] dark:hover:bg-[#303134] transition-colors group cursor-default">
                      <div className="flex items-center min-w-0">
                        <File size={20} className="text-[#0B57D0] dark:text-[#A8C7FA] mr-3 shrink-0" />
                        <span className="text-[14px] text-[#1F1F1F] dark:text-[#E3E3E3] truncate">{file.Key.replace(currentPrefix, "")}</span>
                      </div>
                      <div className="w-24 text-[13px] text-[#444746] dark:text-[#C4C7C5] text-right hidden sm:block">{(file.Size / 1024).toFixed(1)} KB</div>
                      <div className="w-32 text-[13px] text-[#444746] dark:text-[#C4C7C5] text-right hidden md:block">{new Date(file.LastModified).toLocaleDateString()}</div>
                      <div className="w-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {renderContextMenu(file, false)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredFiles.map((file) => (
                  <div key={file.Key} className="bg-[#F2F6FC] dark:bg-[#282A2C] rounded-[12px] border border-transparent hover:border-[#E0E0E0] dark:hover:border-[#444746] hover:bg-[#E9EEF6] dark:hover:bg-[#303134] flex flex-col items-center justify-between p-3 aspect-square transition-all relative group cursor-default shadow-sm">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {renderContextMenu(file, false)}
                    </div>
                    <div className="flex-1 w-full flex items-center justify-center bg-white dark:bg-[#1E1F20] rounded-lg mt-1 mb-3">
                      <File size={48} className="text-[#0B57D0] dark:text-[#A8C7FA] opacity-50" />
                    </div>
                    <div className="w-full flex items-center gap-2">
                      <File size={16} className="text-[#0B57D0] dark:text-[#A8C7FA] shrink-0" />
                      <p className="text-[13px] font-medium text-[#1F1F1F] dark:text-[#E3E3E3] truncate w-full" title={file.Key.replace(currentPrefix, "")}>{file.Key.replace(currentPrefix, "")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && filteredFiles.length === 0 && filteredFolders.length === 0 && !currentPrefix && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <img src="https://ssl.gstatic.com/docs/doclist/images/empty_state_my_drive_v3.svg" alt="Empty Folder" className="w-64 mb-6 opacity-80" />
            <h3 className="text-[22px] text-[#1F1F1F] dark:text-[#E3E3E3] mb-2 font-medium">A place for all of your files</h3>
            <p className="text-[14px] text-[#444746] dark:text-[#C4C7C5]">Drag and drop files or folders here to upload them to your S3 bucket.</p>
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
