const datePick = document.getElementById('datePick');
const summaryGrid = document.getElementById('summaryGrid');
const trxList = document.getElementById('trxList');
const topItems = document.getElementById('topItems');

function rupiah(n) { return 'Rp ' + (n || 0).toLocaleString('id-ID'); }
function pad(n) { return String(n).padStart(2, '0'); }
function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
function loadTrx(dateKey) {
    return JSON.parse(localStorage.getItem('wmpk_trx_' + dateKey) || '[]');
}

function render(dateKey) {
    const list = loadTrx(dateKey);
    const totalTrx = list.length;
    const totalPendapatan = list.reduce((s, t) => s + (t.total || 0), 0);
    const totalTunai = list.reduce((s, t) => s + (t.cash || 0), 0);
    const totalKembali = list.reduce((s, t) => s + (t.change || 0), 0);
    const totalItem = list.reduce((s, t) => s + t.items.reduce((a,i)=>a+i.qty,0), 0);
    const rata2 = totalTrx ? Math.round(totalPendapatan / totalTrx) : 0;

    summaryGrid.innerHTML = `
        <div class="sum-card"><span>Total Transaksi</span><strong>${totalTrx}</strong></div>
        <div class="sum-card primary"><span>Total Pendapatan</span><strong>${rupiah(totalPendapatan)}</strong></div>
        <div class="sum-card"><span>Total Item Terjual</span><strong>${totalItem}</strong></div>
        <div class="sum-card"><span>Rata-rata / Transaksi</span><strong>${rupiah(rata2)}</strong></div>
        <div class="sum-card"><span>Total Tunai Diterima</span><strong>${rupiah(totalTunai)}</strong></div>
        <div class="sum-card"><span>Total Kembalian</span><strong>${rupiah(totalKembali)}</strong></div>
    `;

    if (list.length === 0) {
        trxList.innerHTML = '<p class="empty">Belum ada transaksi pada tanggal ini.</p>';
        topItems.innerHTML = '';
        return;
    }

    let rows = '';
    list.forEach((t, i) => {
        const jam = new Date(t.time).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
        const itemsTxt = t.items.map(it => `${it.name} x${it.qty}`).join(', ');
        rows += `
            <tr>
                <td>${i+1}</td>
                <td>${jam}</td>
                <td>${t.customer}</td>
                <td class="cell-items">${itemsTxt}</td>
                <td class="num">${rupiah(t.total)}</td>
                <td class="num">${rupiah(t.cash)}</td>
                <td class="num">${rupiah(t.change)}</td>
            </tr>`;
    });
    trxList.innerHTML = `
        <table class="rekap-table">
            <thead>
                <tr><th>#</th><th>Jam</th><th>Pembeli</th><th>Items</th><th>Total</th><th>Tunai</th><th>Kembali</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;

    // Item terlaris
    const map = {};
    list.forEach(t => t.items.forEach(it => {
        if (!map[it.name]) map[it.name] = { qty: 0, sub: 0 };
        map[it.name].qty += it.qty;
        map[it.name].sub += it.qty * it.price;
    }));
    const sorted = Object.entries(map).sort((a,b)=>b[1].qty-a[1].qty);
    topItems.innerHTML = `
        <table class="rekap-table">
            <thead><tr><th>#</th><th>Nama Item</th><th>Qty Terjual</th><th>Subtotal</th></tr></thead>
            <tbody>${sorted.map(([n,v],i)=>`
                <tr><td>${i+1}</td><td>${n}</td><td class="num">${v.qty}</td><td class="num">${rupiah(v.sub)}</td></tr>
            `).join('')}</tbody>
        </table>`;
}

// Export CSV
document.getElementById('exportBtn').addEventListener('click', () => {
    const dk = datePick.value || todayKey();
    const list = loadTrx(dk);
    if (!list.length) { alert('Tidak ada data untuk diekspor.'); return; }
    let csv = 'No,Jam,Pembeli,Items,Total,Tunai,Kembali\n';
    list.forEach((t,i) => {
        const jam = new Date(t.time).toLocaleTimeString('id-ID');
        const items = t.items.map(it=>`${it.name} x${it.qty}`).join('; ');
        csv += `${i+1},"${jam}","${t.customer}","${items}",${t.total},${t.cash},${t.change}\n`;
    });
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rekap-${dk}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('printRekapBtn').addEventListener('click', () => window.print());

document.getElementById('clearBtn').addEventListener('click', () => {
    const dk = datePick.value || todayKey();
    if (confirm(`Hapus semua transaksi tanggal ${dk}?`)) {
        localStorage.removeItem('wmpk_trx_' + dk);
        render(dk);
    }
});

datePick.addEventListener('change', () => render(datePick.value));

// Init
datePick.value = todayKey();
render(todayKey());
