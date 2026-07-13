"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./dashboard.module.css";
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
      case "AWS": return <Cloud size={20} />;
      case "Cloudflare": return <Server size={20} />;
      default: return <Database size={20} />;
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your Buckets</h1>
        <button className={styles.button} onClick={handleOpenAdd}>
          <Plus size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
          Add Bucket
        </button>
      </div>

      {buckets.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven't added any S3 buckets yet.</p>
          <button className={styles.button} style={{ marginTop: '1rem' }} onClick={handleOpenAdd}>
            Add your first bucket
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {buckets.map((bucket) => (
            <div key={bucket.id} className={styles.card} onClick={() => router.push(`/bucket/${bucket.id}`)}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{bucket.name}</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={styles.providerBadge}>
                    {getProviderIcon(bucket.provider)} {bucket.provider}
                  </span>
                  <button 
                    onClick={(e) => handleOpenEdit(bucket, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                    title="Edit bucket"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
              <div className={styles.cardDetails}>
                <p>Bucket: {bucket.bucketName}</p>
                <p>Region: {bucket.region}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Add S3 Configuration</h2>
            <form onSubmit={handleAddBucket}>
              <div className={styles.formGroup}>
                <label>Connection Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Production Assets" />
              </div>
              <div className={styles.formGroup}>
                <label>Provider</label>
                <select required value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})}>
                  <option value="AWS">Amazon S3</option>
                  <option value="Cloudflare">Cloudflare R2</option>
                  <option value="GCP">Google Cloud Storage</option>
                  <option value="MinIO">MinIO / Custom</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Endpoint URL (Leave empty for default AWS)</label>
                <input value={formData.endpoint} onChange={e => setFormData({...formData, endpoint: e.target.value})} placeholder="https://..." />
              </div>
              <div className={styles.formGroup}>
                <label>Region</label>
                <input required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} placeholder="us-east-1" />
              </div>
              <div className={styles.formGroup}>
                <label>Access Key</label>
                <input required type="password" value={formData.accessKey} onChange={e => setFormData({...formData, accessKey: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Secret Key</label>
                <input required type="password" value={formData.secretKey} onChange={e => setFormData({...formData, secretKey: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Target Bucket Name</label>
                <input required value={formData.bucketName} onChange={e => setFormData({...formData, bucketName: e.target.value})} />
              </div>

              {testStatus !== 'idle' && (
                <div style={{ 
                  padding: '10px', 
                  borderRadius: '6px', 
                  marginBottom: '15px', 
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: testStatus === 'success' ? '#def7ec' : testStatus === 'error' ? '#fde8e8' : '#e5edff',
                  color: testStatus === 'success' ? '#03543f' : testStatus === 'error' ? '#9b1c1c' : '#1e429f' 
                }}>
                  {testStatus === 'success' && <CheckCircle size={16} />}
                  {testStatus === 'error' && <XCircle size={16} />}
                  {testStatus === 'testing' && <Play size={16} />}
                  {testStatus === 'testing' ? "Testing connection..." : testMessage}
                </div>
              )}

              <div className={styles.modalActions} style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button 
                  type="button" 
                  style={{ padding: '0.5rem 1rem', background: '#4b5563', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} 
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                >
                  <Play size={16} /> Test Connection
                </button>
                <button type="submit" className={styles.button}>{editingId ? 'Save Changes' : 'Add Configuration'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
