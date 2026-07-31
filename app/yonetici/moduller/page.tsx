'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { moduleShortName } from '@/lib/subgroups';

interface AdminModule {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  wordCount: number;
  groupCount: number;
}

export default function AdminModulesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jsonData, setJsonData] = useState<unknown | null>(null);
  const [fileLabel, setFileLabel] = useState('');
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [appendId, setAppendId] = useState<number | null>(null);
  const [appendJson, setAppendJson] = useState<unknown | null>(null);
  const [appendLabel, setAppendLabel] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/modules');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Liste alınamadı');
      }
      setModules(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.isAdmin) {
      router.replace('/');
      return;
    }
    void refresh();
  }, [session, status, router, refresh]);

  const readJsonFile = (file: File): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result)));
        } catch {
          reject(new Error('Dosya geçerli JSON değil'));
        }
      };
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsText(file);
    });

  const handleFile = async (file: File | null) => {
    if (!file) {
      setJsonData(null);
      setFileLabel('');
      return;
    }
    try {
      const data = await readJsonFile(file);
      setJsonData(data);
      setFileLabel(file.name);
      setError('');
    } catch (e) {
      setJsonData(null);
      setFileLabel('');
      setError(e instanceof Error ? e.message : 'Dosya hatası');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonData) {
      setError('Lütfen bir JSON dosyası seçin');
      return;
    }
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          json: jsonData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Oluşturulamadı');

      setMessage(
        `“${data.module.name}” eklendi · ${data.imported} kelime · ${data.groupCount} grup` +
          (data.skipped ? ` · ${data.skipped} atlandı` : '')
      );
      setName('');
      setDescription('');
      setJsonData(null);
      setFileLabel('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (m: AdminModule) => {
    setEditId(m.id);
    setEditName(m.name);
    setEditDescription(m.description || '');
    setAppendId(null);
    setMessage('');
  };

  const saveEdit = async () => {
    if (editId == null) return;
    setBusyId(editId);
    setError('');
    try {
      const res = await fetch(`/api/admin/modules/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi');
      setMessage(`“${data.name}” güncellendi`);
      setEditId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusyId(null);
    }
  };

  const handleAppendFile = async (file: File | null) => {
    if (!file) {
      setAppendJson(null);
      setAppendLabel('');
      return;
    }
    try {
      const data = await readJsonFile(file);
      setAppendJson(data);
      setAppendLabel(file.name);
      setError('');
    } catch (e) {
      setAppendJson(null);
      setAppendLabel('');
      setError(e instanceof Error ? e.message : 'Dosya hatası');
    }
  };

  const submitAppend = async () => {
    if (appendId == null || !appendJson) {
      setError('JSON dosyası seçin');
      return;
    }
    setBusyId(appendId);
    setError('');
    try {
      const res = await fetch(`/api/admin/modules/${appendId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: appendJson }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İçe aktarılamadı');
      setMessage(
        `${data.imported} kelime eklendi` +
          (data.skipped ? ` · ${data.skipped} yinelenen atlandı` : '') +
          ` · toplam ${data.wordCount}`
      );
      setAppendId(null);
      setAppendJson(null);
      setAppendLabel('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (m: AdminModule) => {
    if (m.slug === 'genel' || m.slug === 'en-sik-cikan') {
      setError('Sistem modülleri silinemez');
      return;
    }
    if (
      !window.confirm(
        `“${m.name}” silinsin mi? İçindeki ${m.wordCount} kelime de silinir.`
      )
    ) {
      return;
    }
    setBusyId(m.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/modules/${m.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Silinemedi');
      setMessage(`“${m.name}” silindi`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusyId(null);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading && modules.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) return null;

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/yonetici" className="text-sm font-medium text-blue-600 hover:underline">
            ← Yönetici paneli
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Modüller</h1>
          <p className="mt-1 text-sm text-gray-600">
            Yeni modül ekleyin, adını düzenleyin veya JSON ile kelime yükleyin. Kartlar / Quiz /
            Ana sayfada Genel ve En Sık ile aynı şekilde çalışır (20’lik gruplar).
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-10 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Yeni modül ekle</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Modül adı</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Akademik Kelimeler"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Açıklama (opsiyonel)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Kelime JSON dosyası</label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          {fileLabel && (
            <p className="mt-1 text-xs text-gray-500">Seçili: {fileLabel}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Desteklenen: {'{ "entries": [{ "word", "turkish" }] }'} veya{' '}
            {'[{ "english", "turkish" }]'}
          </p>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? 'Ekleniyor…' : 'Modülü oluştur'}
        </button>
      </form>

      <h2 className="mb-3 text-lg font-semibold">Mevcut modüller</h2>
      <div className="space-y-4">
        {modules.map((m) => {
          const isSystem = m.slug === 'genel' || m.slug === 'en-sik-cikan';
          return (
            <div
              key={m.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    {moduleShortName(m.name, m.slug)} · {m.wordCount} kelime · {m.groupCount}{' '}
                    grup · <code>{m.slug}</code>
                    {isSystem ? ' · sistem' : ''}
                  </p>
                  {m.description && (
                    <p className="mt-1 text-sm text-gray-600">{m.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAppendId(m.id);
                      setEditId(null);
                      setAppendJson(null);
                      setAppendLabel('');
                    }}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    JSON ekle
                  </button>
                  <button
                    type="button"
                    disabled={isSystem || busyId === m.id}
                    onClick={() => void handleDelete(m)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sil
                  </button>
                </div>
              </div>

              {editId === m.id && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Modül adı"
                  />
                  <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Açıklama"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => void saveEdit()}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}

              {appendId === m.id && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Bu modüle ek kelime yükle (yinelenen İngilizce kelimeler atlanır).
                  </p>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => void handleAppendFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                  {appendLabel && (
                    <p className="text-xs text-gray-500">Seçili: {appendLabel}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === m.id || !appendJson}
                      onClick={() => void submitAppend()}
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Yükle
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppendId(null)}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
