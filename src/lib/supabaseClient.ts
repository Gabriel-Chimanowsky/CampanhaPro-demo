// ============================================================
// MYSQL BRIDGE CLIENT
// Substitui o Supabase Client para redirecionar todas as chamadas
// para o backend local Express (que usa MySQL)
// ============================================================

const isBrowser = typeof window !== 'undefined';
const baseUrl = (isBrowser && window.location.hostname === 'localhost') ? 'http://127.0.0.1:3005' : '';

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

  select(columns: string = '*') {
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
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for register

    try {
      console.log(`[MySQL Bridge] Requesting register at: ${baseUrl || 'Proxy Origin'} ...`);
      const fetchStart = Date.now();
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      console.log(`[MySQL Bridge] Response received in ${Date.now() - fetchStart}ms. Status: ${response.status}`);
      
      clearTimeout(timeout);
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('[MySQL Bridge] Server returned non-JSON:', text);
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
      console.error('[MySQL Bridge] Register error:', err);
      return { data: null, error: { message: err.name === 'AbortError' ? 'Tempo de resposta esgotado (Timeout)' : err.message } };
    }
  },
  signInWithPassword: async ({ email, password }: any) => {
    console.log(`[MySQL Bridge] Testing connectivity to /api/ping ...`);
    
    try {
      const ping = await fetch(`/api/ping`).then(r => r.json());
      console.log('[MySQL Bridge] Server Ping OK:', ping);
    } catch (e: any) {
      console.warn('[MySQL Bridge] Server Ping FAILED. Server might be down or unreachable.', e.message);
    }

    console.log('[MySQL Bridge] Login attempt for:', email);
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
      
      if (!response.ok) {
        console.error('[MySQL Bridge] Login failed:', result.error);
        return { data: null, error: result };
      }
      
      localStorage.setItem('campanhapro-mysql-token', result.token);
      localStorage.setItem('campanhapro-user', JSON.stringify(result.user));
      
      const session = { access_token: result.token, user: result.user };
      authListeners.forEach(cb => cb('SIGNED_IN', session));
      
      console.log('[MySQL Bridge] Login success!');
      return { data: { user: result.user, session }, error: null };
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('[MySQL Bridge] Login error:', err.message);
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
      upload: async () => ({ data: { path: 'mock-path' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://via.placeholder.com/400' } })
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
