/**
 * UNDIAN BERHADIAH - DATABASE MANAGER
 * LocalStorage-based data persistence
 */

const DB = {
    KEYS: {
        USERS: 'undian_users',
        TRANSACTIONS: 'undian_transactions',
        CUSTOMERS: 'undian_customers',
        VOUCHERS: 'undian_vouchers',
        SESSION: 'undian_session'
    },

    init() {
        if (!this.getAll('users').length) {
            this.insert('users', {
                username: 'admin',
                password: this.hashPassword('admin123'),
                role: 'admin',
                toko_name: null,
                nama: 'Super Administrator',
                is_super: true // Super Admin - cannot be deleted
            });
        }
    },

    // Check if user is Super Admin
    isSuperAdmin(userId) {
        const user = this.getById('users', userId);
        return user && user.is_super === true;
    },

    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = ((hash << 5) - hash) + password.charCodeAt(i);
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(16);
    },

    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    _getKey(entity) {
        return {
            users: this.KEYS.USERS, transactions: this.KEYS.TRANSACTIONS,
            customers: this.KEYS.CUSTOMERS, vouchers: this.KEYS.VOUCHERS
        }[entity];
    },

    getAll(entity) {
        try {
            const data = localStorage.getItem(this._getKey(entity));
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    getById(entity, id) {
        return this.getAll(entity).find(r => r.id === id) || null;
    },

    findBy(entity, field, value) {
        return this.getAll(entity).filter(r => r[field] === value);
    },

    findOneBy(entity, field, value) {
        return this.getAll(entity).find(r => r[field] === value) || null;
    },

    insert(entity, data) {
        const key = this._getKey(entity);
        if (!key) return null;
        const records = this.getAll(entity);
        const newRecord = { id: this.generateId(), ...data, created_at: new Date().toISOString() };
        records.push(newRecord);
        localStorage.setItem(key, JSON.stringify(records));
        return newRecord;
    },

    update(entity, id, data) {
        const key = this._getKey(entity);
        const records = this.getAll(entity);
        const index = records.findIndex(r => r.id === id);
        if (index === -1) return false;
        records[index] = { ...records[index], ...data, updated_at: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(records));
        return records[index];
    },

    delete(entity, id) {
        const key = this._getKey(entity);
        const records = this.getAll(entity);
        const filtered = records.filter(r => r.id !== id);
        if (filtered.length === records.length) return false;
        localStorage.setItem(key, JSON.stringify(filtered));
        return true;
    },

    search(entity, criteria) {
        return this.getAll(entity).filter(record => {
            return Object.entries(criteria).every(([field, value]) => {
                if (!value) return true;
                const rv = record[field];
                if (typeof value === 'string' && typeof rv === 'string') {
                    return rv.toLowerCase().includes(value.toLowerCase());
                }
                return rv === value;
            });
        });
    },

    // Session Management (Admin) - uses sessionStorage, clears on browser close
    setSession(user) {
        const session = {
            id: user.id, username: user.username, role: user.role,
            toko_name: user.toko_name, logged_in_at: new Date().toISOString()
        };
        sessionStorage.setItem(this.KEYS.SESSION, JSON.stringify(session));
        return session;
    },

    getSession() {
        try {
            const data = sessionStorage.getItem(this.KEYS.SESSION);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    },

    clearSession() { sessionStorage.removeItem(this.KEYS.SESSION); },
    isLoggedIn() { return this.getSession() !== null; },
    hasRole(role) { const s = this.getSession(); return s && s.role === role; },

    login(username, password, requiredRole = null) {
        const user = this.findOneBy('users', 'username', username);
        if (!user) return { success: false, error: 'Username tidak ditemukan' };
        if (!this.verifyPassword(password, user.password)) return { success: false, error: 'Password salah' };
        if (requiredRole && user.role !== requiredRole) return { success: false, error: 'Akses ditolak' };
        return { success: true, user: this.setSession(user) };
    },

    logout() { this.clearSession(); },

    /**
     * Login with store validation for kasir
     * Validates credentials AND verifies kasir is assigned to selected store
     * @param {string} username - Username
     * @param {string} password - Password
     * @param {string} selectedStore - Store name selected by kasir
     * @returns {Object} {success: boolean, error?: string, user?: Object}
     */
    loginWithStoreValidation(username, password, selectedStore) {
        const user = this.findOneBy('users', 'username', username);

        // Step 1: Check if user exists
        if (!user) return { success: false, error: 'Username tidak ditemukan' };

        // Step 2: Verify password
        if (!this.verifyPassword(password, user.password)) {
            return { success: false, error: 'Password salah' };
        }

        // Step 3: Verify role is kasir
        if (user.role !== 'kasir') {
            return { success: false, error: 'Akses ditolak untuk role ini' };
        }

        // Step 4: DOUBLE CHECK - Validate store assignment
        if (user.toko_name !== selectedStore) {
            return {
                success: false,
                error: 'Akses Ditolak: Akun Anda tidak terdaftar untuk beroperasi di toko ini. Silakan pilih toko yang sesuai penugasan Anda.'
            };
        }

        // All checks passed - create KASIR session (sessionStorage - dies on browser close)
        return { success: true, user: this.setKasirSession(user) };
    },

    /**
     * Kasir-specific session using sessionStorage
     * Session clears when browser/tab is closed - requires login again
     */
    setKasirSession(user) {
        const session = {
            id: user.id,
            username: user.username,
            role: user.role,
            toko_name: user.toko_name,
            logged_in_at: new Date().toISOString()
        };
        sessionStorage.setItem('kasir_session', JSON.stringify(session));
        return session;
    },

    getKasirSession() {
        try {
            const data = sessionStorage.getItem('kasir_session');
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    },

    clearKasirSession() {
        sessionStorage.removeItem('kasir_session');
    },

    isKasirLoggedIn() {
        return this.getKasirSession() !== null;
    },

    hasKasirRole() {
        const s = this.getKasirSession();
        return s && s.role === 'kasir';
    },

    logoutKasir() {
        this.clearKasirSession();
    },

    /**
     * Get list of active stores from kasir users
     * @returns {Array} Sorted list of unique store names
     */
    getActiveStores() {
        const kasirs = this.findBy('users', 'role', 'kasir');
        return [...new Set(kasirs.map(k => k.toko_name).filter(Boolean))].sort();
    },

    // Statistics
    getStats() {
        const today = new Date().toISOString().split('T')[0];
        const transactions = this.getAll('transactions');
        const vouchers = this.getAll('vouchers');
        const customers = this.getAll('customers');

        return {
            totalTransactions: transactions.length,
            todayTransactions: transactions.filter(t => t.created_at?.startsWith(today)).length,
            claimedCoupons: transactions.filter(t => t.is_claimed).length,
            totalVouchers: vouchers.length,
            activeVouchers: vouchers.filter(v => v.status === 'active').length,
            voucherBesar: vouchers.filter(v => v.tipe_hadiah === 'BESAR').length,
            voucherSedang: vouchers.filter(v => v.tipe_hadiah === 'SEDANG').length,
            totalCustomers: customers.length,
            totalNominal: transactions.reduce((sum, t) => sum + (t.nominal || 0), 0)
        };
    },

    /**
     * Export vouchers for Excel with store-specific filtering and premium formatting
     * 10 Columns: No, Tanggal & Jam, No. Transaksi, Nama Lengkap, NIK, No. Telepon/WA, Alamat Lengkap, Nominal Belanja, Kode Voucher, Toko Asal
     * @param {Object} options - Export options
     * @param {string} options.type - Type of voucher (BESAR/SEDANG), optional for all
     * @param {string} options.tokoName - Store name to filter by (null for all stores)
     * @returns {Object} {data: Array, tokoName: string, columnTypes: Object}
     */
    exportVouchersForStore(options = {}) {
        const session = this.getSession();
        // Use provided tokoName, or null for all stores (admin view)
        const tokoName = options.tokoName !== undefined ? options.tokoName : session?.toko_name;

        let vouchers = this.getAll('vouchers');

        // Filter by type if specified
        if (options.type) {
            vouchers = vouchers.filter(v => v.tipe_hadiah === options.type.toUpperCase());
        }

        // Filter by store if tokoName is specified (not null/empty)
        if (tokoName) {
            vouchers = vouchers.filter(v => v.toko_name === tokoName);
        }

        // Only export active (claimed) vouchers
        vouchers = vouchers.filter(v => v.status === 'active');

        // Sort by date descending
        vouchers.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

        const data = vouchers.map((v, index) => {
            const customer = v.customer_id ? this.getById('customers', v.customer_id) : null;
            const transaction = v.transaction_id ? this.getById('transactions', v.transaction_id) : null;
            const claimDate = v.updated_at || v.created_at;

            return {
                'No': index + 1,
                'Tanggal & Jam': claimDate ? new Date(claimDate) : null,
                'No. Transaksi': transaction?.no_transaksi || '-',
                'Nama Lengkap': customer?.nama || '-',
                'NIK': customer?.nik || '-',
                'No. Telepon / WA': customer?.no_telepon || '-',
                'Alamat Lengkap': customer?.alamat || '-',
                'Nominal Belanja': transaction?.nominal || 0,
                'Kode Voucher': v.kode_voucher,
                'Toko Asal': v.toko_name || '-'
            };
        });

        return {
            data,
            tokoName: tokoName || 'Semua_Toko',
            columnTypes: {
                dateColumns: ['Tanggal & Jam'],
                currencyColumns: ['Nominal Belanja'],
                textColumns: ['NIK', 'No. Telepon / WA', 'Kode Voucher', 'No. Transaksi'],
                wrapColumns: ['Alamat Lengkap']
            }
        };
    },

    /**
     * Legacy export function - kept for backwards compatibility
     * @deprecated Use exportVouchersForStore instead
     */
    exportVouchers(type) {
        const result = this.exportVouchersForStore({ type });
        return result.data;
    }
};

DB.init();
