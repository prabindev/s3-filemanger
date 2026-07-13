"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Server, Database, Cloud, Edit2, Play, CheckCircle, XCircle } from "lucide-react";

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Buckets</h1>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Add Bucket
          </button>
        </div>

        {buckets.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't added any S3 buckets yet.</p>
            <button 
              onClick={handleOpenAdd}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              Add your first bucket
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buckets.map((bucket) => (
              <div 
                key={bucket.id} 
                onClick={() => router.push(`/bucket/${bucket.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate pr-2">{bucket.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {getProviderIcon(bucket.provider)} {bucket.provider}
                    </span>
                    <button 
                      onClick={(e) => handleOpenEdit(bucket, e)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      title="Edit bucket"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <p><span className="font-medium">Bucket:</span> {bucket.bucketName}</p>
                  <p><span className="font-medium">Region:</span> {bucket.region}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {editingId ? 'Edit Configuration' : 'Add S3 Configuration'}
                </h2>
                
                <form onSubmit={handleAddOrEditBucket} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Connection Name</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Production Assets" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
                    <select required value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="AWS">Amazon S3</option>
                      <option value="Cloudflare">Cloudflare R2</option>
                      <option value="GCP">Google Cloud Storage</option>
                      <option value="MinIO">MinIO / Custom</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Endpoint URL (Leave empty for AWS)</label>
                    <input value={formData.endpoint} onChange={e => setFormData({...formData, endpoint: e.target.value})} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Region</label>
                      <input required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} placeholder="us-east-1" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bucket Name</label>
                      <input required value={formData.bucketName} onChange={e => setFormData({...formData, bucketName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Access Key</label>
                    <input required type="password" value={formData.accessKey} onChange={e => setFormData({...formData, accessKey: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Secret Key</label>
                    <input required type="password" value={formData.secretKey} onChange={e => setFormData({...formData, secretKey: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  {testStatus !== 'idle' && (
                    <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                      testStatus === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                      testStatus === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                      'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {testStatus === 'success' && <CheckCircle size={16} />}
                      {testStatus === 'error' && <XCircle size={16} />}
                      {testStatus === 'testing' && <Play size={16} className="animate-pulse" />}
                      {testStatus === 'testing' ? "Testing connection..." : testMessage}
                    </div>
                  )}

                  <div className="pt-6 flex justify-end gap-3">
                    <button 
                      type="button" 
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium" 
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                      onClick={handleTestConnection}
                      disabled={testStatus === 'testing'}
                    >
                      <Play size={16} /> Test Connection
                    </button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                      {editingId ? 'Save Changes' : 'Add Configuration'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
