"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./dashboard.module.css";
import { Plus, Server, Database, Cloud } from "lucide-react";

export default function DashboardPage() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // New bucket form state
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

  const handleAddBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchBuckets();
        setFormData({ ...formData, name: "", bucketName: "" }); // Reset some fields
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
        <button className={styles.button} onClick={() => setIsModalOpen(true)}>
          <Plus size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
          Add Bucket
        </button>
      </div>

      {buckets.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven't added any S3 buckets yet.</p>
          <button className={styles.button} style={{ marginTop: '1rem' }} onClick={() => setIsModalOpen(true)}>
            Add your first bucket
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {buckets.map((bucket) => (
            <div key={bucket.id} className={styles.card} onClick={() => router.push(`/bucket/${bucket.id}`)}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{bucket.name}</h3>
                <span className={styles.providerBadge}>
                  {getProviderIcon(bucket.provider)} {bucket.provider}
                </span>
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

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.button}>Save Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
