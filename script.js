// ===== Data & Elemen DOM =====
const cart = []; // { name, price, qty }
const cartCountElement = document.getElementById('cartCount');
const totalPriceElement = document.getElementById('totalPrice');
const cartItemsElement = document.getElementById('cartItems');
const checkoutModal = document.getElementById('checkoutModal');
const closeModal = document.querySelector('.close');
const checkoutBtn = document.getElementById('checkoutBtn');
const payBtn = document.getElementById('payBtn');
const receiptContainer = document.getElementById('receiptContainer');
const customerInput = document.getElementById('customerInput');
const cashInput = document.getElementById('cashInput');
const changeAmountEl = document.getElementById('changeAmount');

const cashierName = "Krisna";

// ===== Helper =====
function rupiah(n) {
    return 'Rp ' + (n || 0).toLocaleString('id-ID');
}
function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ===== Tambah ke keranjang =====
document.querySelectorAll('.addToCart').forEach(button => {
    button.addEventListener('click', () => {
        const itemElement = button.parentElement;
        const itemName = itemElement.getAttribute('data-name');
        const itemPrice = parseInt(itemElement.getAttribute('data-price'));
        const existing = cart.find(it => it.name === itemName);
        if (existing) existing.qty += 1;
        else cart.push({ name: itemName, price: itemPrice, qty: 1 });
        updateCart();
    });
});

function getTotal() {
    return cart.reduce((t, it) => t + it.price * it.qty, 0);
}

function updateCart() {
    const totalQty = cart.reduce((t, it) => t + it.qty, 0);
    cartCountElement.textContent = totalQty;
    totalPriceElement.textContent = getTotal().toLocaleString('id-ID');
    renderCartItems();
    updateChange();
}

function renderCartItems() {
    cartItemsElement.innerHTML = '';
    if (cart.length === 0) {
        cartItemsElement.innerHTML = '<p>Keranjang Anda kosong.</p>';
        return;
    }
    cart.forEach((item, idx) => {
        const row = document.createElement('div');
        row.classList.add('receipt-item');
        row.innerHTML = `
            <span>${item.name} x${item.qty}</span>
            <span>${rupiah(item.price * item.qty)}</span>
            <button class="removeItem" data-idx="${idx}" title="Hapus">&times;</button>
        `;
        cartItemsElement.appendChild(row);
    });
    cartItemsElement.querySelectorAll('.removeItem').forEach(btn => {
        btn.addEventListener('click', e => {
            const i = parseInt(e.currentTarget.getAttribute('data-idx'));
            cart.splice(i, 1);
            updateCart();
        });
    });
}

// ===== Hitung kembalian live =====
function updateChange() {
    const cash = parseInt(cashInput.value) || 0;
    const total = getTotal();
    const change = cash - total;
    if (cash === 0) {
        changeAmountEl.textContent = 'Rp 0';
        changeAmountEl.classList.remove('negative', 'positive');
    } else if (change < 0) {
        changeAmountEl.textContent = 'Kurang ' + rupiah(Math.abs(change));
        changeAmountEl.classList.add('negative');
        changeAmountEl.classList.remove('positive');
    } else {
        changeAmountEl.textContent = rupiah(change);
        changeAmountEl.classList.add('positive');
        changeAmountEl.classList.remove('negative');
    }
}
cashInput.addEventListener('input', updateChange);

// Tombol cepat nominal
document.querySelectorAll('.quick-cash button').forEach(b => {
    b.addEventListener('click', () => {
        const v = parseInt(b.getAttribute('data-cash'));
        if (v === 0) cashInput.value = '';
        else cashInput.value = ((parseInt(cashInput.value)||0) + v);
        updateChange();
    });
});

// ===== Modal =====
checkoutBtn.addEventListener('click', () => { checkoutModal.style.display = 'block'; });
closeModal.addEventListener('click', () => { checkoutModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target === checkoutModal) checkoutModal.style.display = 'none';
});

// ===== Pembayaran =====
payBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert("Keranjang Anda kosong! Silakan tambahkan item sebelum membayar.");
        return;
    }
    const customerName = (customerInput.value || '').trim();
    if (!customerName) {
        alert("Nama pembeli tidak boleh kosong!");
        customerInput.focus();
        return;
    }
    const total = getTotal();
    const cash = parseInt(cashInput.value) || 0;
    if (cash < total) {
        alert("Uang yang dibayarkan kurang dari total. Mohon periksa kembali.");
        cashInput.focus();
        return;
    }
    const change = cash - total;

    // Simpan ke rekap harian (localStorage)
    saveTransaction({
        time: new Date().toISOString(),
        customer: customerName,
        items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        total, cash, change
    });

    generateReceipt({ total, cash, change, customerName });
    checkoutModal.style.display = 'none';
    receiptContainer.scrollIntoView({ behavior: 'smooth' });
});

// ===== Simpan transaksi ke localStorage =====
function saveTransaction(trx) {
    const key = 'wmpk_trx_' + todayKey();
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push(trx);
    localStorage.setItem(key, JSON.stringify(list));
}

// ===== Buat Nota =====
function generateReceipt({ total, cash, change, customerName }) {
    const now = new Date();
    const tanggal = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const noNota = 'WMK-' + now.getTime().toString().slice(-6);

    const itemsHTML = cart.map(item => `
        <tr>
            <td class="r-name">${item.name}</td>
            <td class="r-qty">${item.qty}</td>
            <td class="r-price">${rupiah(item.price)}</td>
            <td class="r-sub">${rupiah(item.price * item.qty)}</td>
        </tr>
    `).join('');

    receiptContainer.innerHTML = `
        <div class="receipt-paper" id="receiptPaper">
            <div class="r-head">
                <h2>WARUNG MAKAN PAK KRIS</h2>
                <p>Jl. Enak Pol No. 1 — Telp. 0812-3456-7890</p>
                <hr>
            </div>
            <div class="r-meta">
                <div><span>No. Nota</span><span>: ${noNota}</span></div>
                <div><span>Tanggal</span><span>: ${tanggal} ${jam}</span></div>
                <div><span>Kasir</span><span>: ${cashierName}</span></div>
                <div><span>Pembeli</span><span>: ${customerName}</span></div>
            </div>
            <hr>
            <table class="r-table">
                <thead>
                    <tr><th class="r-name">Item</th><th class="r-qty">Qty</th><th class="r-price">Harga</th><th class="r-sub">Subtotal</th></tr>
                </thead>
                <tbody>${itemsHTML}</tbody>
            </table>
            <hr>
            <div class="r-total"><span>TOTAL</span><span>${rupiah(total)}</span></div>
            <div class="r-pay"><span>TUNAI</span><span>${rupiah(cash)}</span></div>
            <div class="r-change"><span>KEMBALI</span><span>${rupiah(change)}</span></div>
            <hr>
            <div class="r-foot">
                <p>~ Terima Kasih Atas Kunjungan Anda ~</p>
                <p class="r-small">Enake Pollll 🍽️</p>
            </div>
        </div>
        <div class="receipt-actions no-print">
            <button id="printReceipt">🖨️ Cetak Nota</button>
            <button id="newOrder" class="secondary">Pesanan Baru</button>
            <a href="rekap.html" class="link-btn">📊 Lihat Rekap Harian</a>
        </div>
    `;

    document.getElementById('printReceipt').addEventListener('click', printReceipt);
    document.getElementById('newOrder').addEventListener('click', () => {
        cart.length = 0;
        cashInput.value = '';
        customerInput.value = '';
        updateCart();
        receiptContainer.innerHTML = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== Cetak =====
function printReceipt() {
    document.body.classList.add('printing');
    window.print();
    setTimeout(() => document.body.classList.remove('printing'), 500);
}
window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing');
});
