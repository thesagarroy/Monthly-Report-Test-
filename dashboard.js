let transactions = [];
let salesData = [];
let isSalesLoaded = false;
let pieChartInstance = null;
let barChartInstance = null;
let activeCategory = null;
let categoryRanks = {};
let currentView = 'expenses';

// Basic Configurations
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Outfit', sans-serif";

document.addEventListener('DOMContentLoaded', () => {
    fetchData(); // Expenses
    setupEventListeners();
});

window.switchView = (view) => {
    currentView = view;
    document.getElementById('btnExpenses').classList.toggle('active', view === 'expenses');
    document.getElementById('btnSales').classList.toggle('active', view === 'sales');
    
    document.getElementById('expenses-view').style.display = (view === 'expenses') ? 'flex' : 'none';
    document.getElementById('sales-view').style.display = (view === 'sales') ? 'flex' : 'none';
    document.getElementById('addBtn').style.display = 'flex'; // always show the button now that both support CRUD

    if (view === 'sales' && !isSalesLoaded) {
        fetchSalesData();
    }
};

const fetchSalesData = async () => {
    try {
        const response = await fetch('sales_data.json');
        let rawData = await response.json();
        salesData = rawData.map((s, index) => ({
            ...s,
            id: s.id || `idx_sales_${index}_${Date.now()}`
        }));
        isSalesLoaded = true;
        processSalesAndRender();
    } catch (e) {
        console.error("Error fetching sales data", e);
        alert("Failed to load sales data. Did you run the python script?");
    }
};

const processSalesAndRender = () => {
    let totalSales = 0;
    let totalBoxes = 0;
    let totalPcs = 0;
    
    const customerMap = {};
    const productMap = {};

    salesData.forEach(s => {
        totalSales += s.amount;
        
        // Pcs vs Box logic (20 LTR and 5 LTR are Pcs, rest are Boxes)
        const pName = s.product.toUpperCase();
        if (pName.includes('20 LTR') || pName.includes('5 LTR')) {
            totalPcs += s.quantity;
        } else {
            totalBoxes += s.quantity;
        }

        // Customer aggregate
        let custName = s.customer.trim();
        if (custName.toLowerCase() === 'partha ghosh') {
            custName = 'Priyanshu Mistanno Vander';
        }
        
        if(!customerMap[custName]) customerMap[custName] = 0;
        customerMap[custName] += s.amount;

        // Product aggregate
        if(!productMap[s.product]) productMap[s.product] = { qty: 0, amt: 0 };
        productMap[s.product].qty += s.quantity;
        productMap[s.product].amt += s.amount;
    });

    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

    document.getElementById('total-sales-amount').innerText = formatCurrency(totalSales);
    document.getElementById('total-sales-boxes').innerText = totalBoxes;
    document.getElementById('total-sales-pcs').innerText = totalPcs;

    // Top 15 Customers
    const sortedCustomers = Object.entries(customerMap).sort((a,b) => b[1] - a[1]).slice(0, 15);
    const topCustContainer = document.getElementById('top-customers-list');
    topCustContainer.innerHTML = '';
    
    sortedCustomers.forEach((cust, index) => {
        const item = document.createElement('div');
        item.className = 'customer-rank-item';
        let rankClass = 'rank-other';
        if(index === 0) rankClass = 'rank-1';
        else if(index === 1) rankClass = 'rank-2';
        else if(index === 2) rankClass = 'rank-3';
        
        item.innerHTML = `
            <div class="rank-index ${rankClass}">${index + 1}</div>
            <div class="customer-name">${cust[0]}</div>
            <div class="customer-amount">${formatCurrency(cust[1])}</div>
        `;
        topCustContainer.appendChild(item);
    });

    // Product Wise Table
    // Sort logic based on Volume (ML to LTR)
    const getVol = (name) => {
        const match = name.match(/(\d+)\s*(ML|LTR)/i);
        if (!match) return 0;
        let val = parseInt(match[1]);
        if (match[2].toUpperCase() === 'LTR') val *= 1000;
        return val;
    };

    const sortedProducts = Object.entries(productMap).sort((a,b) => getVol(a[0]) - getVol(b[0]));
    const prodTbody = document.getElementById('product-sales-body');
    prodTbody.innerHTML = '';
    
    const renderBrandGroup = (brandName, icon, color) => {
        const products = sortedProducts.filter(p => p[0].toUpperCase().includes(brandName));
        if (products.length === 0) return;

        const headerTr = document.createElement('tr');
        headerTr.innerHTML = `<td colspan="3" style="font-weight: bold; color: ${color}; padding-top: 1.5rem; padding-bottom: 0.5rem; font-size: 1.1rem; border-bottom: 2px solid var(--border-color);"><i class="${icon}"></i> ${brandName} Water</td>`;
        prodTbody.appendChild(headerTr);

        products.forEach(prod => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding-left: 1.5rem;"><i class="fas fa-caret-right" style="color: var(--text-muted); margin-right: 5px;"></i> ${prod[0]}</td>
                <td style="text-align: center;">${prod[1].qty}</td>
                <td style="text-align: right; color: #fca5a5; font-weight: 500;">${formatCurrency(prod[1].amt)}</td>
            `;
            prodTbody.appendChild(tr);
        });
    };

    renderBrandGroup('BIPRAJ', 'fas fa-tint', '#3b82f6');
    renderBrandGroup('BISLAIM', 'fas fa-bottle-water', '#2ecc71');
    
    // Build Customer dropdown datalist dynamically
    const salesCustomerList = document.getElementById('customerOptions');
    if (salesCustomerList) {
        salesCustomerList.innerHTML = '';
        Object.keys(customerMap).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            salesCustomerList.appendChild(opt);
        });
    }

    // Process and render the Sales Transactions Table
    const salesTableBody = document.getElementById('sales-table-body');
    if (salesTableBody) {
        salesTableBody.innerHTML = '';
        
        // Helper to parse dates securely for sorting
        const parseDate = (dateStr) => {
            const parts = String(dateStr).replace(/[/]/g, '-').split('-');
            if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
            return 0;
        };

        const sortedSales = [...salesData].sort((a, b) => parseDate(b.date) - parseDate(a.date));

        sortedSales.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.date}</td>
                <td><span style="font-weight: 500;">${s.customer}</span></td>
                <td style="color: var(--text-muted);">${s.product}</td>
                <td style="text-align: center;">${s.quantity}</td>
                <td class="amt-cell" style="text-align: right;">${formatCurrency(s.amount)}</td>
                <td style="text-align: center;">
                    <button class="action-btn btn-edit" onclick="openSalesModal('edit', '${s.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn btn-delete" onclick="deleteSale('${s.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            `;
            salesTableBody.appendChild(tr);
        });
    }
    
    // Reattach search filter logic for Sales Table
    const searchSalesInput = document.getElementById('searchSalesInput');
    if(searchSalesInput) {
        searchSalesInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = salesTableBody.getElementsByTagName('tr');
            for(let row of rows) {
                if(row.innerText.toLowerCase().includes(term)) row.style.display = '';
                else row.style.display = 'none';
            }
        });
    }
};

const fetchData = async () => {
    try {
        const response = await fetch('api.php');
        const data = await response.json();
        
        // Add pseudo IDs if they don't have them to make editing easy
        transactions = data.map((t, index) => ({
            ...t,
            id: t.id || `idx_${index}_${Date.now()}`
        }));
        
        processAndRender();
    } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to load data. Ensure api.php and data.json are working.");
    }
};

const processAndRender = () => {
    // Helper to parse dates securely for sorting (format DD/MM/YYYY or DD-MM-YYYY)
    const parseDate = (dateStr) => {
        const parts = String(dateStr).replace(/[/]/g, '-').split('-');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
        }
        return 0; // fallback
    };

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => parseDate(b.date) - parseDate(a.date));

    // Calculate KPIs precisely avoiding Float bugs
    let totalAmount = 0;
    const categoryMap = {};
    const dateMap = {};

    transactions.forEach(t => {
        const amt = parseFloat(t.amount) || 0; // robust parsing
        totalAmount += amt;

        if (!categoryMap[t.category]) categoryMap[t.category] = 0;
        categoryMap[t.category] += amt;

        const d = t.date;
        if (!dateMap[d]) dateMap[d] = 0;
        dateMap[d] += amt;
    });

    // Top Category & Populate Ranks
    const sortedCats = Object.keys(categoryMap).sort((a,b) => categoryMap[b] - categoryMap[a]);
    categoryRanks = {};
    sortedCats.forEach((cat, index) => {
        categoryRanks[cat] = index + 1;
    });

    let topCategory = sortedCats.length > 0 ? sortedCats[0] : "-";

    // Peak Day
    let peakDay = "-"; let maxDayVal = 0;
    for (const [day, val] of Object.entries(dateMap)) {
        if (val > maxDayVal) { maxDayVal = val; peakDay = day; }
    }

    // Update UI Elements securely
    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    
    document.getElementById('total-amount').innerText = formatCurrency(totalAmount);
    document.getElementById('total-transactions').innerText = transactions.length;
    document.getElementById('top-category').innerText = topCategory;
    document.getElementById('peak-day').innerText = peakDay;

    renderCharts(categoryMap, dateMap);
    renderChipsAndTable(categoryMap);
};

const renderCharts = (categoryMap, dateMap) => {
    if (pieChartInstance) pieChartInstance.destroy();
    if (barChartInstance) barChartInstance.destroy();

    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

    // PIE CHART
    const catLabels = Object.keys(categoryMap).sort((a,b) => categoryMap[b] - categoryMap[a]);
    const catData = catLabels.map(l => categoryMap[l]);
    const bgColors = ['rgba(59, 130, 246, 0.8)', 'rgba(155, 89, 182, 0.8)', 'rgba(46, 204, 113, 0.8)', 'rgba(231, 76, 60, 0.8)', 'rgba(241, 196, 15, 0.8)', 'rgba(26, 188, 156, 0.8)', 'rgba(230, 126, 34, 0.8)', 'rgba(52, 73, 94, 0.8)'];

    pieChartInstance = new Chart(document.getElementById('categoryChart').getContext('2d'), {
        type: 'doughnut',
        data: { labels: catLabels.slice(0, 10), datasets: [{ data: catData.slice(0, 10), backgroundColor: bgColors, borderWidth: 0, hoverOffset: 10 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 15 } }, tooltip: { callbacks: { label: function(context) { return ' ' + formatCurrency(context.raw); } } } } }
    });

    // BAR CHART
    const timelineLabels = Object.keys(dateMap).sort((a, b) => {
        const p1 = a.split('-'), p2 = b.split('-');
        if(p1.length==3 && p2.length==3) return new Date(p1[2], p1[1]-1, p1[0]) - new Date(p2[2], p2[1]-1, p2[0]);
        return a.localeCompare(b);
    });
    const timelineData = timelineLabels.map(l => dateMap[l]);
    const ctxBar = document.getElementById('timelineChart').getContext('2d');
    let gradient = ctxBar.createLinearGradient(0, 0, 0, 400); gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: { labels: timelineLabels, datasets: [{ label: 'Daily Expense', data: timelineData, backgroundColor: gradient, borderRadius: 4, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { callback: function(value) { return '₹' + (value / 1000) + 'k'; } } }, x: { grid: { display: false, drawBorder: false }, ticks: { maxRotation: 45, minRotation: 45 } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return ' ' + formatCurrency(context.raw); } } } } }
    });
};

const renderChipsAndTable = (categoryMap) => {
    const filterContainer = document.getElementById('category-filters');
    
    // Sort categories by total amount descending
    const categories = Object.keys(categoryMap).sort((a,b) => categoryMap[b] - categoryMap[a]);
    
    // Update Datalist for Form Dropdown
    const dataList = document.getElementById('categoryOptions');
    if(dataList) {
        dataList.innerHTML = '';
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            dataList.appendChild(opt);
        });
    }

    const renderLocalChips = () => {
        filterContainer.innerHTML = '';
        const allChip = document.createElement('div');
        allChip.className = `filter-chip ${activeCategory === null ? 'active' : ''}`;
        allChip.innerText = 'All Expenses';
        allChip.addEventListener('click', () => { activeCategory = null; renderLocalChips(); applyFilters(); });
        filterContainer.appendChild(allChip);

        categories.forEach((cat) => {
            const chip = document.createElement('div');
            chip.className = `filter-chip ${activeCategory === cat ? 'active' : ''}`;
            const rank = categoryRanks[cat] || 0;
            chip.innerText = `${rank}. ${cat}`;
            chip.addEventListener('click', () => { activeCategory = cat; renderLocalChips(); applyFilters(); });
            filterContainer.appendChild(chip);
        });
    };
    renderLocalChips();
    applyFilters();
};

const applyFilters = () => {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = transactions.filter(t => {
        const matchSearch = String(t.name).toLowerCase().includes(term) || String(t.category).toLowerCase().includes(term) || String(t.date).toLowerCase().includes(term);
        const matchCat = activeCategory === null || t.category === activeCategory;
        return matchSearch && matchCat;
    });
    renderTable(filtered);
};

const renderTable = (dataToRender) => {
    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    dataToRender.forEach(t => {
        const tr = document.createElement('tr');
        let strHash = 0; for(let i=0; i<t.category.length; i++) strHash = t.category.charCodeAt(i) + ((strHash << 5) - strHash);
        const hue = Math.abs(strHash % 360);
        
        const rank = categoryRanks[t.category] || 0;
        tr.innerHTML = `
            <td>${t.date}</td>
            <td><span class="cat-badge" style="background: hsla(${hue}, 70%, 50%, 0.15); color: hsla(${hue}, 80%, 75%, 1);" onclick="setCategoryAndFilter('${t.category}')">${rank}. ${t.category}</span></td>
            <td>${t.name}</td>
            <td class="amt-cell">${formatCurrency(t.amount)}</td>
            <td style="text-align: center;">
                <button class="action-btn btn-edit" onclick="openModal('edit', '${t.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" onclick="deleteExpense('${t.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
};

window.setCategoryAndFilter = (cat) => {
    activeCategory = cat;
    processAndRender(); 
};

window.openCurrentModal = () => {
    if (currentView === 'expenses') {
        openModal('add');
    } else {
        openSalesModal('add');
    }
};

// --- CRUD MODAL LOGIC & POST API FOR EXPENSES ---
const setupEventListeners = () => {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('expenseForm').addEventListener('submit', saveExpense);
    const sf = document.getElementById('salesForm');
    if(sf) sf.addEventListener('submit', saveSale);
};

window.openModal = (mode, id = null) => {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    form.reset();
    document.getElementById('editIndex').value = '';
    
    if (mode === 'add') {
        document.getElementById('modalTitle').innerText = 'Add Expense';
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
        document.getElementById('dateInput').value = localISOTime;
    } else if (mode === 'edit') {
        document.getElementById('modalTitle').innerText = 'Edit Expense';
        const t = transactions.find(x => x.id === id);
        if (t) {
            document.getElementById('editIndex').value = id;
            document.getElementById('categoryInput').value = t.category;
            document.getElementById('nameInput').value = t.name;
            document.getElementById('amountInput').value = parseFloat(t.amount);
            
            // Try formatting date
            let dateVal = t.date;
            try {
                const parts = dateVal.replace(/[/]/g, '-').split('-');
                if(parts.length === 3) dateVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } catch(e){}
            document.getElementById('dateInput').value = dateVal;
        }
    }
    
    modal.classList.add('active');
};

window.closeModal = () => {
    document.getElementById('expenseModal').classList.remove('active');
};

window.deleteExpense = async (id) => {
    if (confirm("Are you sure you want to delete this expense?")) {
        // Save previous reference in case server fails
        const prevTransactions = [...transactions]; 
        transactions = transactions.filter(t => t.id !== id);
        const success = await saveToServer();
        if(!success) transactions = prevTransactions;
    }
};

const saveExpense = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editIndex').value;
    const rawDate = document.getElementById('dateInput').value;
    const parts = rawDate.split('-');
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    const category = document.getElementById('categoryInput').value.trim();
    const name = document.getElementById('nameInput').value.trim();
    const amount = parseFloat(document.getElementById('amountInput').value).toFixed(2);
    
    const expenseObj = { date: formattedDate, category, name, amount };
    
    const prevTransactions = [...transactions];

    if (id) {
        const idx = transactions.findIndex(t => t.id === id);
        if (idx > -1) {
            transactions[idx] = { ...transactions[idx], ...expenseObj }; // retain existing ID
        }
    } else {
        expenseObj.id = `idx_new_${Date.now()}`;
        transactions.push(expenseObj);
    }
    
    closeModal();
    const success = await saveToServer();
    if(!success) {
        transactions = prevTransactions; // rollback on fail
        processAndRender();
    }
};

const saveToServer = async () => {
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactions)
        });
        const result = await response.json();
        if(result.status === 'success') {
            processAndRender();
            return true;
        } else {
            alert('Failed to save to server: ' + result.message);
            return false;
        }
    } catch (e) {
        console.error(e);
        alert('Server connection error. Could not save.');
        return false;
    }
};

// --- CRUD MODAL LOGIC FOR SALES ---

window.openSalesModal = (mode, id = null) => {
    const modal = document.getElementById('salesModal');
    const form = document.getElementById('salesForm');
    form.reset();
    document.getElementById('editSalesIndex').value = '';
    
    if (mode === 'add') {
        document.getElementById('salesModalTitle').innerText = 'Add Sale';
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
        document.getElementById('salesDateInput').value = localISOTime;
    } else if (mode === 'edit') {
        document.getElementById('salesModalTitle').innerText = 'Edit Sale';
        const s = salesData.find(x => x.id === id);
        if (s) {
            document.getElementById('editSalesIndex').value = id;
            document.getElementById('salesCustomerInput').value = s.customer;
            document.getElementById('salesProductInput').value = s.product;
            document.getElementById('salesQtyInput').value = s.quantity;
            document.getElementById('salesAmountInput').value = parseFloat(s.amount);
            
            // Format Date safely
            let dateVal = s.date;
            try {
                const parts = dateVal.replace(/[/]/g, '-').split('-');
                if(parts.length === 3) dateVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } catch(e){}
            document.getElementById('salesDateInput').value = dateVal;
        }
    }
    
    modal.classList.add('active');
};

window.closeSalesModal = () => {
    document.getElementById('salesModal').classList.remove('active');
};

window.deleteSale = async (id) => {
    if (confirm("Are you sure you want to delete this sales record?")) {
        const prevSales = [...salesData]; 
        salesData = salesData.filter(s => s.id !== id);
        const success = await saveSalesToServer();
        if(!success) {
            salesData = prevSales;
        } else {
            processSalesAndRender();
        }
    }
};

const saveSale = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editSalesIndex').value;
    const rawDate = document.getElementById('salesDateInput').value;
    const parts = rawDate.split('-');
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    
    const customer = document.getElementById('salesCustomerInput').value.trim();
    const product = document.getElementById('salesProductInput').value;
    const quantity = parseFloat(document.getElementById('salesQtyInput').value);
    const amount = parseFloat(document.getElementById('salesAmountInput').value);
    
    const saleObj = { date: formattedDate, customer, product, quantity, amount };
    
    const prevSales = [...salesData];

    if (id) {
        const idx = salesData.findIndex(s => s.id === id);
        if (idx > -1) {
            salesData[idx] = { ...salesData[idx], ...saleObj };
        }
    } else {
        saleObj.id = `idx_sales_new_${Date.now()}`;
        salesData.push(saleObj);
    }
    
    closeSalesModal();
    const success = await saveSalesToServer();
    if(!success) {
        salesData = prevSales;
    }
    processSalesAndRender();
};

const saveSalesToServer = async () => {
    try {
        const response = await fetch('api.php?type=sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(salesData, null, 2)
        });
        const result = await response.json();
        if(result.status === 'success') {
            return true;
        } else {
            alert('Failed to save to server: ' + result.message);
            return false;
        }
    } catch (e) {
        console.error(e);
        alert('Server connection error. Could not save.');
        return false;
    }
};
