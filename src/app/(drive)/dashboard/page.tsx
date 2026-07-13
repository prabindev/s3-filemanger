"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Server, Database, Cloud, Edit2, Play, CheckCircle, XCircle, LogOut, Folder, MoreVertical, Trash2 } from "lucide-react";
import { signOut } from "next-auth/react";

export default function DashboardPage() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // New bucket form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle'|'testing'|'success'|'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: "",
    provider: "AWS",
    endpoint: "",
    region: "",
    accessKey: "",
    secretKey: "",
    bucketName: "",
  });

  const fetchBuckets = async () => {
    try {
      const res = await fetch("/api/buckets");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setBuckets(data.buckets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  const handleOpenEdit = (bucket: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(bucket.id);
    setFormData({
      name: bucket.name,
      provider: bucket.provider,
      endpoint: bucket.endpoint || "",
      region: bucket.region,
      accessKey: bucket.accessKey,
      secretKey: bucket.secretKey,
      bucketName: bucket.bucketName,
    });
    setTestStatus('idle');
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: "", provider: "AWS", endpoint: "", region: "",
      accessKey: "", secretKey: "", bucketName: ""
    });
    setTestStatus('idle');
    setIsModalOpen(true);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const res = await fetch("/api/buckets/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus('success');
        setTestMessage(data.message);
      } else {
        setTestStatus('error');
        setTestMessage(data.error || "Connection failed.");
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage("Network error during test.");
    }
  };

  const handleAddOrEditBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/buckets", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: editingId }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchBuckets();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "AWS": return <Cloud size={16} />;
      case "Cloudflare": return <Server size={16} />;
      default: return <Database size={16} />;
    }
  };

  if (loading) return <div className="min-h-full flex items-center justify-center text-[#444746]">Loading...</div>;

  return (
    <div className="p-4 md:p-6 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-6 border-b border-[#E0E0E0] dark:border-[#444746] pb-3">
        <h1 className="text-[22px] font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">My Buckets</h1>
        
        {/* Drive Layout handles the global Sign Out, so we just keep the Add Bucket here as a fallback or extra action */}
        <button 
          onClick={handleOpenAdd}
          className="flex items-center px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] dark:bg-[#A8C7FA] dark:text-[#062E6F] dark:hover:bg-[#D3E3FD] text-white font-medium rounded-full shadow-sm transition-colors text-sm"
        >
          <Plus size={18} className="mr-2" />
          Add Bucket
        </button>
      </div>

      {buckets.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <img src="https://ssl.gstatic.com/docs/doclist/images/empty_state_my_drive_v3.svg" alt="Empty Drive" className="w-64 mb-6 opacity-80" />
          <h2 className="text-xl font-medium text-[#1F1F1F] dark:text-[#E3E3E3] mb-2">A place for all your buckets</h2>
          <p className="text-[#444746] dark:text-[#C4C7C5] mb-6">Connect an S3 bucket to get started.</p>
          <button 
            onClick={handleOpenAdd}
            className="px-6 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-medium rounded-full shadow-sm transition-colors"
          >
            New Bucket
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-[14px] font-medium text-[#444746] dark:text-[#E3E3E3] mb-3">Folders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {buckets.map((bucket) => (
              <div 
                key={bucket.id} 
                onClick={() => router.push(`/bucket/${bucket.id}`)}
                className="bg-[#F2F6FC] dark:bg-[#282A2C] rounded-[12px] p-3 flex items-center justify-between cursor-pointer hover:bg-[#E9EEF6] dark:hover:bg-[#303134] transition-colors group"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <Folder size={24} className="text-[#444746] dark:text-[#C4C7C5] mr-3 fill-current opacity-80" />
                  <span className="text-[14px] font-medium text-[#1F1F1F] dark:text-[#E3E3E3] truncate pr-2">{bucket.name}</span>
                </div>
                
                {/* 3-dots Menu for bucket */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => setActiveMenu(activeMenu === bucket.id ? null : bucket.id)}
                    className="p-1.5 text-[#444746] dark:text-[#C4C7C5] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {activeMenu === bucket.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#282A2C] rounded-lg shadow-[0_4px_6px_0_rgba(60,64,67,0.3)] dark:shadow-none border border-[#E0E0E0] dark:border-[#444746] py-1 z-50">
                      <button onClick={(e) => { handleOpenEdit(bucket, e); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#F1F3F4] dark:hover:bg-[#3C4043] flex items-center gap-3">
                        <Edit2 size={16} className="text-[#444746] dark:text-[#C4C7C5]" /> Edit Connection
                      </button>
                      <button onClick={() => { handleDelete(bucket.id); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#F1F3F4] dark:hover:bg-[#3C4043] flex items-center gap-3">
                        <Trash2 size={16} className="text-[#444746] dark:text-[#C4C7C5]" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Bucket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#00000080] flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#282A2C] rounded-[24px] max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-[#E0E0E0] dark:border-[#444746]">
              <h2 className="text-xl font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">{editingId ? "Edit Configuration" : "Add S3 Configuration"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#444746] dark:text-[#C4C7C5] hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-full"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleAddOrEditBucket} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#444746] dark:text-[#C4C7C5] mb-1">Connection Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-[8px] border border-[#747775] dark:border-[#8E918F] bg-transparent text-[#1F1F1F] dark:text-[#E3E3E3] outline-none focus:border-[#0B57D0] focus:border-2 transition-all" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#444746] dark:text-[#C4C7C5] mb-1">Provider</label>
                  <select value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} className="w-full px-4 py-2 rounded-[8px] border border-[#747775] dark:border-[#8E918F] bg-transparent text-[#1F1F1F] dark:text-[#E3E3E3] outline-none focus:border-[#0B57D0] focus:border-2 transition-all">
                    <option value="AWS">AWS</option>
                    <option value="Cloudflare">Cloudflare R2</option>
                    <option value="Custom">Custom S3 Compatible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#444746] dark:text-[#C4C7C5] mb-1">Endpoint URL (Leave empty for AWS)</label>
                  <input type="text" value={formData.endpoint} onChange={e => setFormData({...formData, endpoint: e.target.value})} className="w-full px-4 py-2 rounded-[8px] border border-[#747775] dark:border-[#8E918F] bg-transparent text-[#1F1F1F] dark:text-[#E3E3E3] outline-none focus:border-[#0B57D0] focus:border-2 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444746] dark:text-[#C4C7C5] mb-1">Region</label>
                    <input required type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full px-4 py-2 rounded-[8px] border border-[#747775] dark:border-[#8E918F] bg-transparent text-[#1F1F1F] dark:text-[#E3E3E3] outline-none focus:border-[#0B57D0] focus:border-2 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444746] dark:text-[#C4C7C5] mb-1">Bucket Name</label>
                    <input required type="text" value={formData.bucketName} onChange={e => setFormData({...formData, bucketName: e.target.value})} className="w-full px-4 py-2 rounded-[8px] border border-[#747775] dark:border-[#8E918F] bg-transparent text-[#1F1F1F] dark:text-[#E3E3E3] outline-none focus:border-[#0B57D0] focus:border-2 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#444746] dark:text-[#C4C7C5] mb-1">Access Key</label>
                  <input required type="password" value={formData.accessKey} onChange={e => setFormData({...formData, accessKey: e.target.value})} className="w-full px-4 py-2 rounded-[8px] border border-[#747775] dark:border-[#8E918F] bg-transparent text-[#1F1F1F] dark:text-[#E3E3E3] outline-none focus:border-[#0B57D0] focus:border-2 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#444746] dark:text-[#C4C7C5] mb-1">Secret Key</label>
                  <input required type="password" value={formData.secretKey} onChange={e => setFormData({...formData, secretKey: e.target.value})} className="w-full px-4 py-2 rounded-[8px] border border-[#747775] dark:border-[#8E918F] bg-transparent text-[#1F1F1F] dark:text-[#E3E3E3] outline-none focus:border-[#0B57D0] focus:border-2 transition-all" />
                </div>
              </div>

              {testStatus !== 'idle' && (
                <div className={`mt-4 p-3 rounded-[8px] flex items-center gap-2 text-sm ${
                  testStatus === 'success' ? 'bg-[#D3E3FD] text-[#062E6F] dark:bg-green-900/30 dark:text-green-400' : 
                  testStatus === 'error' ? 'bg-[#FAD2CF] text-[#B3261E] dark:bg-red-900/30 dark:text-red-400' :
                  'bg-[#E9EEF6] text-[#1F1F1F] dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {testStatus === 'success' ? <CheckCircle size={16} /> : testStatus === 'error' ? <XCircle size={16} /> : <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
                  {testStatus === 'testing' ? 'Testing connection...' : testMessage}
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-medium text-[#0B57D0] dark:text-[#A8C7FA] hover:bg-[#0B57D0]/5 dark:hover:bg-[#A8C7FA]/10 rounded-full transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleTestConnection} disabled={testStatus === 'testing'} className="flex items-center px-5 py-2 text-sm font-medium border border-[#747775] dark:border-[#8E918F] text-[#0B57D0] dark:text-[#A8C7FA] hover:bg-[#0B57D0]/5 dark:hover:bg-[#A8C7FA]/10 rounded-full transition-colors disabled:opacity-50">
                  <Play size={16} className="mr-2" />
                  Test Connection
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-medium bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-full transition-colors">
                  {editingId ? 'Save Changes' : 'Add Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
