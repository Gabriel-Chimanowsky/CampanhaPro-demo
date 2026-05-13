// ============================================================
// MYSQL BRIDGE CLIENT
// Substitui o Supabase Client para redirecionar todas as chamadas
// para o backend local Express (que usa MySQL)
// ============================================================


// Em desenvolvimento (Vite), o proxy no vite.config.ts redireciona /api para o backend.
// Em produção, o backend serve o frontend no mesmo domínio.
const baseUrl = '';

class MySQLQueryBuilder {
  private table: string;
  private filters: any = {};
  private orderBy: string | null = null;
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private action: 'select' | 'insert' | 'update' | 'upsert' = 'select';
  private payload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns: string = '*') {
    this.action = 'select';
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  neq(column: string, value: any) {
    this.filters[`${column}!neq`] = value;
    return this;
  }

  not(column: string, operator: string, value: any) {
    this.filters[`${column}!not!${operator}`] = value;
    return this;
  }

  gte(column: string, value: any) {
    this.filters[`${column}!gte`] = value;
    return this;
  }

  lte(column: string, value: any) {
    this.filters[`${column}!lte`] = value;
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    const col = column === 'createdAt' ? 'created_at' : column;
    this.orderBy = `${col}.${ascending ? 'asc' : 'desc'}`;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.payload = data;
    return this;
  }

  upsert(data: any, _options: any = {}) {
    this.action = 'upsert';
    this.payload = data;
    return this;
  }

  async delete() {
    console.log(`[MySQL Bridge] Deleting from ${this.table}...`, this.filters);
    try {
      const token = localStorage.getItem('campanhapro-mysql-token');
      const id = this.filters.id;
      if (!id) throw new Error("Delete requires an ID filter");

      const response = await fetch(`${baseUrl}/api/db/${this.table}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Erro ao deletar: ${response.status}`);
      return { error: null };
    } catch (err: any) {
      console.error(`[MySQL Bridge Error] delete ${this.table}:`, err);
      return { error: { message: err.message } };
    }
  }

  async then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    console.log(`[MySQL Bridge] Querying ${this.table}...`, this.filters);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const token = localStorage.getItem('campanhapro-mysql-token');
      let response;
      
      if (this.action === 'select') {
        const queryParams = Object.entries(this.filters).map(([k, v]) => {
          const snakeKey = k.replace(/([A-Z])/g, "_$1").toLowerCase().replace('!neq', '').replace('!not!eq', '');
          return `${snakeKey}=${encodeURIComponent(v as string)}`;
        }).join('&');

        response = await fetch(`${baseUrl}/api/db/${this.table}?` + 
          queryParams +
          (this.orderBy ? `&order=${this.orderBy.replace(/([A-Z])/g, "_$1").toLowerCase()}` : '') +
          (this.limitCount ? `&limit=${this.limitCount}` : ''), {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
      } else if (this.action === 'insert') {
        response = await fetch(`${baseUrl}/api/db/${this.table}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(this.payload),
          signal: controller.signal
        });
      } else if (this.action === 'update') {
        response = await fetch(`${baseUrl}/api/db/${this.table}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ data: this.payload, filters: this.filters }),
          signal: controller.signal
        });
      } else { // upsert
        response = await fetch(`${baseUrl}/api/db/${this.table}/upsert`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(this.payload),
          signal: controller.signal
        });
      }

      clearTimeout(timeout);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      
      let data = await response.json();
      let error = null;

      if (this.isSingle && this.action === 'select') {
        if (!data || data.length === 0) {
          data = null;
          error = { code: 'PGRST116', message: 'No rows found' };
        } else {
          data = data[0];
        }
      }
      
      const result = { data: this.convertKeysToCamel(data), error };
      return onFulfilled ? onFulfilled(result) : result;
    } catch (err: any) {
      clearTimeout(timeout);
      console.error(`[MySQL Bridge Error] ${this.action} ${this.table}:`, err);
      const result = { data: null, error: { message: err.name === 'AbortError' ? 'Timeout' : err.message } };
      return onRejected ? onRejected(result) : result;
    }
  }

  private convertKeysToCamel(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(v => this.convertKeysToCamel(v));
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      return Object.keys(obj).reduce((acc: any, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = this.convertKeysToCamel(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
}

const authListeners = new Set<(event: string, session: any) => void>();

const mysqlAuth = {
  getSession: async () => {
    const token = localStorage.getItem('campanhapro-mysql-token');
    const userStr = localStorage.getItem('campanhapro-user');
    if (!token || !userStr) return { data: { session: null }, error: null };
    return { 
      data: { 
        session: { 
          access_token: token, 
          user: JSON.parse(userStr) 
        } 
      }, 
      error: null 
    };
  },
  signUp: async (payload: any) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        return { data: null, error: { message: 'Erro interno do servidor (Resposta inválida)' } };
      }

      if (!response.ok) return { data: null, error: result };

      if (result.session) {
        localStorage.setItem('campanhapro-mysql-token', result.session.access_token);
        localStorage.setItem('campanhapro-user', JSON.stringify(result.user));
        authListeners.forEach(cb => cb('SIGNED_IN', result.session));
      }

      return { data: result, error: null };
    } catch (err: any) {
      clearTimeout(timeout);
      return { data: null, error: { message: err.name === 'AbortError' ? 'Timeout' : err.message } };
    }
  },
  signInWithPassword: async ({ email, password }: any) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      const result = await response.json();
      
      if (!response.ok) return { data: null, error: result };
      
      localStorage.setItem('campanhapro-mysql-token', result.token);
      localStorage.setItem('campanhapro-user', JSON.stringify(result.user));
      
      const session = { access_token: result.token, user: result.user };
      authListeners.forEach(cb => cb('SIGNED_IN', session));
      
      return { data: { user: result.user, session }, error: null };
    } catch (err: any) {
      clearTimeout(timeout);
      return { data: null, error: { message: err.name === 'AbortError' ? 'Timeout' : err.message } };
    }
  },
  signOut: async () => {
    localStorage.removeItem('campanhapro-mysql-token');
    localStorage.removeItem('campanhapro-user');
    authListeners.forEach(cb => cb('SIGNED_OUT', null));
    return { error: null };
  },
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    authListeners.add(callback);
    mysqlAuth.getSession().then(({ data }) => {
      callback('INITIAL_SESSION', data.session);
    });
    return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
  }
};

export const supabase: any = {
  from: (table: string) => new MySQLQueryBuilder(table),
  auth: mysqlAuth,
  storage: {
    from: () => ({
      upload: async (_path: string, file: File) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch(`${baseUrl}/api/upload`, {
            method: 'POST',
            body: formData
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          return { data: { path: result.publicUrl }, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: path } })
    })
  },
  channel: () => {
    const mock = {
      on: function() { return mock; },
      subscribe: () => ({ unsubscribe: () => {} })
    };
    return mock;
  },
  removeChannel: () => {}
};

export const rawSupabase = supabase;
