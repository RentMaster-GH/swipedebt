const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://credibleartisans.com'
).replace(/\/$/, '');

const BASE = `${BACKEND_URL}/public/swipedebt`;

type Filter =
  | { type: 'eq'; col: string; val: any }
  | { type: 'neq'; col: string; val: any }
  | { type: 'in'; col: string; vals: any[] }
  | { type: 'ilike'; col: string; pattern: string };

function fileToCompressedDataUrl(file: File): Promise<string> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

const uploadedEvidenceCache = new Map<string, string>();

class QueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private collection: string;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private filters: Filter[] = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private maxRows: number | null = null;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';

  constructor(collection: string) {
    this.collection = collection;
  }

  select(_cols = '*') {
    if (this.op !== 'insert' && this.op !== 'update' && this.op !== 'delete') {
      this.op = 'select';
    }
    return this;
  }

  insert(rows: any) {
    this.op = 'insert';
    this.payload = rows;
    return this;
  }

  update(updates: Record<string, any>) {
    this.op = 'update';
    this.payload = updates;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ type: 'neq', col, val });
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push({ type: 'in', col, vals });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.filters.push({ type: 'ilike', col, pattern });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }

  limit(n: number) {
    this.maxRows = n;
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  private matches(row: any): boolean {
    for (const f of this.filters) {
      const rv = row?.[f.col];
      if (f.type === 'eq' && rv !== f.val) return false;
      if (f.type === 'neq' && rv === f.val) return false;
      if (f.type === 'in' && !f.vals.includes(rv)) return false;
      if (f.type === 'ilike') {
        const needle = f.pattern.replace(/%/g, '').toLowerCase();
        if (!String(rv || '').toLowerCase().includes(needle)) return false;
      }
    }
    return true;
  }

  private async run(): Promise<{ data: any; error: any }> {
    try {
      if (this.op === 'insert') {
        const res = await fetch(`${BASE}/${this.collection}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.payload),
        });
        const json = await res.json();
        if (!res.ok) return { data: null, error: { message: json.error || 'Insert failed' } };
        const records = json.records || [];
        if (this.singleMode !== 'none') return { data: records[0] || null, error: null };
        return { data: records, error: null };
      }

      const listRes = await fetch(`${BASE}/${this.collection}`, { cache: 'no-store' });
      const listJson = await listRes.json();
      if (!listRes.ok) {
        return { data: null, error: { message: listJson.error || 'Fetch failed' } };
      }
      let rows: any[] = (listJson.records || []).filter((r: any) => this.matches(r));

      if (this.op === 'update') {
        const updated: any[] = [];
        for (const r of rows) {
          const patchRes = await fetch(`${BASE}/${this.collection}/${r.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.payload),
          });
          if (patchRes.ok) updated.push(await patchRes.json());
        }
        if (this.singleMode !== 'none') return { data: updated[0] || null, error: null };
        return { data: updated, error: null };
      }

      if (this.op === 'delete') {
        for (const r of rows) {
          await fetch(`${BASE}/${this.collection}/${r.id}`, { method: 'DELETE' });
        }
        return { data: rows, error: null };
      }

      if (this.orderBy) {
        const { col, ascending } = this.orderBy;
        rows.sort((a, b) => {
          const av = a?.[col] ?? '';
          const bv = b?.[col] ?? '';
          if (av < bv) return ascending ? -1 : 1;
          if (av > bv) return ascending ? 1 : -1;
          return 0;
        });
      }

      if (this.maxRows !== null) {
        rows = rows.slice(0, this.maxRows);
      }

      if (this.singleMode === 'single') {
        if (!rows[0]) return { data: null, error: { message: 'Row not found' } };
        return { data: rows[0], error: null };
      }
      if (this.singleMode === 'maybeSingle') {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err?.message || 'Database error' } };
    }
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export function createClient(_url?: string, _key?: string) {
  return {
    from(collection: string) {
      return new QueryBuilder(collection);
    },
    storage: {
      from(_bucket: string) {
        return {
          async upload(path: string, file: File) {
            try {
              const dataUrl = await fileToCompressedDataUrl(file);
              uploadedEvidenceCache.set(path, dataUrl);
              return { data: { path }, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err?.message || 'Upload failed' } };
            }
          },
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: uploadedEvidenceCache.get(path) || '',
              },
            };
          },
        };
      },
    },
  };
}

export const supabase = createClient();
