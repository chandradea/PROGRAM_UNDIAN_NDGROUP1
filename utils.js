/**
 * UNDIAN BERHADIAH - UTILITY FUNCTIONS
 */

const Utils = {
    /**
     * Calculate vouchers based on transaction amount
     * - Every 200,000 = 1 Besar + 1 Sedang
     * - Remaining 100,000+ = 1 Sedang extra
     */
    hitungVoucher(nominal) {
        const kelipatan200 = Math.floor(nominal / 200000);
        const sisaUang = nominal % 200000;
        const kelipatan100 = Math.floor(sisaUang / 100000);

        return {
            besar: kelipatan200,
            sedang: kelipatan200 + kelipatan100
        };
    },

    /**
     * Generate coupon code: {TOKO}-KUPON-XXX
     */
    generateKuponCode(toko) {
        const random = this.randomString(3) + '-' + this.randomString(3);
        return `${toko}-KUPON-${random}`.toUpperCase();
    },

    /**
     * Generate voucher code: {TOKO}-HADIAH-{TIPE}-XXX-XXX-X
     */
    generateVoucherCode(toko, tipe) {
        const r1 = this.randomString(3);
        const r2 = this.randomString(3);
        const r3 = this.randomString(1);
        return `${toko}-HADIAH-${tipe}-${r1}-${r2}-${r3}`.toUpperCase();
    },

    /**
     * Generate random alphanumeric string
     */
    randomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Format number as Indonesian Rupiah
     */
    formatCurrency(number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    },

    /**
     * Format date to Indonesian locale
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format date short (DD/MM/YYYY)
     */
    formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID');
    },

    /**
     * Validate NIK (16 digits)
     */
    validateNIK(nik) {
        return /^\d{16}$/.test(nik);
    },

    /**
     * Validate phone number (Indonesian format)
     */
    validatePhone(phone) {
        return /^(08|628|\+628)\d{8,12}$/.test(phone.replace(/\s/g, ''));
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Show success toast
     */
    success(message) {
        this.showToast(message, 'success');
    },

    /**
     * Show error toast
     */
    error(message) {
        this.showToast(message, 'error');
    },

    /**
     * Open modal by ID
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        const backdrop = document.getElementById('modal-backdrop') || this.createBackdrop();
        if (modal) {
            backdrop.classList.add('active');
            modal.classList.add('active');
        }
    },

    /**
     * Close modal by ID
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        const backdrop = document.getElementById('modal-backdrop');
        if (modal) modal.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
    },

    /**
     * Create modal backdrop
     */
    createBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.id = 'modal-backdrop';
        backdrop.className = 'modal-backdrop';
        backdrop.onclick = () => {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
            backdrop.classList.remove('active');
        };
        document.body.appendChild(backdrop);
        return backdrop;
    },

    /**
     * Confirm dialog
     */
    confirm(message) {
        return window.confirm(message);
    },

    /**
     * Generate QR Code URL using external service
     */
    getQRCodeUrl(text, size = 150) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
    },

    /**
     * Print specific element
     */
    printElement(elementId) {
        const printContent = document.getElementById(elementId);
        if (!printContent) return;

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = printContent.innerHTML;
        }
        window.print();
    },

    /**
     * Export data to CSV
     */
    exportToCSV(data, filename) {
        if (!data.length) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
    },

    /**
     * Export data to Excel using SheetJS with PREMIUM formatting
     * Features: Styled header (Dark Gray), Freeze panes, Borders, Auto-width, Date/Currency/Text formatting, Wrap Text
     * @param {Array} data - Array of objects to export
     * @param {string} filename - Filename without extension
     * @param {Object} options - Formatting options
     * @param {Array} options.dateColumns - Column names containing dates
     * @param {Array} options.currencyColumns - Column names containing currency values
     * @param {Array} options.textColumns - Column names to force as text (NIK, phone)
     * @param {Array} options.wrapColumns - Column names to enable wrap text (alamat)
     */
    exportToExcelStyled(data, filename, options = {}) {
        if (typeof XLSX === 'undefined') {
            this.exportToCSV(data, filename);
            return;
        }

        if (!data.length) return;

        const dateColumns = options.dateColumns || [];
        const currencyColumns = options.currencyColumns || [];
        const textColumns = options.textColumns || [];
        const wrapColumns = options.wrapColumns || [];
        const headers = Object.keys(data[0]);

        // Prepare data with proper formatting
        const formattedData = data.map(row => {
            const newRow = {};
            headers.forEach(h => {
                let value = row[h];

                // Format dates as strings for display
                if (dateColumns.includes(h) && value instanceof Date) {
                    newRow[h] = value.toLocaleDateString('id-ID', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                }
                // Format currency
                else if (currencyColumns.includes(h)) {
                    newRow[h] = typeof value === 'number' ? value : 0;
                }
                // Keep text columns as strings
                else if (textColumns.includes(h)) {
                    newRow[h] = value ? String(value) : '-';
                }
                else {
                    newRow[h] = value;
                }
            });
            return newRow;
        });

        // Create worksheet from formatted data
        const ws = XLSX.utils.json_to_sheet(formattedData);

        // Calculate optimal column widths
        const colWidths = headers.map((h, idx) => {
            const maxDataLen = Math.max(
                h.length,
                ...formattedData.map(row => {
                    const val = row[h];
                    if (val === null || val === undefined) return 0;
                    return String(val).length;
                })
            );
            // Wider columns for date, currency, and wrap columns
            let extraWidth = 2;
            if (dateColumns.includes(h)) extraWidth = 4;
            else if (currencyColumns.includes(h)) extraWidth = 6;
            else if (wrapColumns.includes(h)) extraWidth = 10; // Alamat gets wider column
            return { wch: Math.min(maxDataLen + extraWidth, 50) };
        });
        ws['!cols'] = colWidths;

        // Freeze the header row (first row stays visible when scrolling)
        ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };

        // Also set views for freeze pane compatibility
        if (!ws['!views']) ws['!views'] = [];
        ws['!views'].push({ state: 'frozen', ySplit: 1 });

        // Apply formatting to cells
        const range = XLSX.utils.decode_range(ws['!ref']);

        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellRef];

                if (!cell) continue;

                // Initialize cell style
                if (!cell.s) cell.s = {};

                const colName = headers[C];

                // Header row styling (row 0) - Dark Gray background, White bold text
                if (R === 0) {
                    cell.s = {
                        fill: { fgColor: { rgb: "4A4A4A" } }, // Dark Gray background
                        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 }, // White bold text
                        alignment: { horizontal: "center", vertical: "center", wrapText: true },
                        border: {
                            top: { style: "thin", color: { rgb: "000000" } },
                            bottom: { style: "thin", color: { rgb: "000000" } },
                            left: { style: "thin", color: { rgb: "000000" } },
                            right: { style: "thin", color: { rgb: "000000" } }
                        }
                    };
                } else {
                    // Data rows - add borders and appropriate formatting
                    cell.s = {
                        border: {
                            top: { style: "thin", color: { rgb: "000000" } },
                            bottom: { style: "thin", color: { rgb: "000000" } },
                            left: { style: "thin", color: { rgb: "000000" } },
                            right: { style: "thin", color: { rgb: "000000" } }
                        },
                        alignment: { vertical: "center" }
                    };

                    // Currency formatting
                    if (currencyColumns.includes(colName)) {
                        cell.z = '"Rp "#,##0';
                        cell.s.alignment = { horizontal: "right", vertical: "center" };
                    }

                    // Text columns (NIK, phone, voucher code) - prevent scientific notation
                    if (textColumns.includes(colName)) {
                        cell.t = 's'; // Force string type
                        cell.z = '@'; // Text format
                    }

                    // Wrap text columns (Alamat)
                    if (wrapColumns.includes(colName)) {
                        cell.s.alignment = {
                            vertical: "center",
                            wrapText: true,
                            horizontal: "left"
                        };
                    }
                }
            }
        }

        // Create workbook and add worksheet
        const wb = XLSX.utils.book_new();
        const sheetName = filename.includes('BESAR') ? 'Hadiah Besar' :
            filename.includes('SEDANG') ? 'Hadiah Sedang' : 'Data Voucher';
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Write file with style support
        XLSX.writeFile(wb, `${filename}.xlsx`, { cellStyles: true });
    },

    /**
     * Legacy export function - basic formatting (backwards compatibility)
     */
    exportToExcel(data, filename) {
        // Use new styled export with auto-detected text columns
        this.exportToExcelStyled(data, filename, {
            textColumns: ['NIK', 'No Telepon', 'No WhatsApp / HP', 'Kode Voucher']
        });
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * Check if user is authorized, redirect if not
     * Kasir uses sessionStorage (dies on browser close)
     * Admin uses localStorage (persistent)
     */
    requireAuth(requiredRole = null) {
        // Use kasir-specific session for kasir role
        const session = requiredRole === 'kasir' ? DB.getKasirSession() : DB.getSession();

        if (!session) {
            window.location.href = requiredRole === 'kasir' ? 'login.html' : '../admin/login.html';
            return false;
        }
        if (requiredRole && session.role !== requiredRole) {
            alert('Akses ditolak');
            window.location.href = '/';
            return false;
        }
        return session;
    },

    /**
     * Get URL parameters
     */
    getUrlParams() {
        return Object.fromEntries(new URLSearchParams(window.location.search));
    },

    /**
     * Set URL parameters
     */
    setUrlParam(key, value) {
        const params = new URLSearchParams(window.location.search);
        params.set(key, value);
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }
};
