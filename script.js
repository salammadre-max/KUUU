// استيراد Firebase والإعدادات المطلوبة
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, enableIndexedDbPersistence, setDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBFae-ksJsDruvC942kvrnzRkeCk30JTfw",
    authDomain: "fffgrfg-44ae4.firebaseapp.com",
    projectId: "fffgrfg-44ae4",
    storageBucket: "fffgrfg-44ae4.firebasestorage.app",
    messagingSenderId: "859893777413",
    appId: "1:859893777413:web:3552e7b15796c5e0b6486c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تفعيل العمل بدون إنترنت (الأوفلاين والمزامنة التلقائية)
enableIndexedDbPersistence(db).catch((err) => {
    console.log("Offline mode error: ", err.code);
});

// متغيرات PWA و Service Worker
let deferredPrompt;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW failed', err));
}
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPromptModal').style.display = 'block';
});

window.installApp = async function() {
    document.getElementById('installPromptModal').style.display = 'none';
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
    }
}

// القفل بكلمة المرور
window.checkStartupPassword = function() {
    const pwd = document.getElementById('startupPwdInput').value;
    if (pwd === '1001') {
        document.getElementById('startupPasswordModal').style.display = 'none';
    } else {
        alert('كلمة المرور غير صحيحة');
    }
}

// المتغيرات لبيانات التطبيق
let players = [];
let products = [];
let salesHistory = [];
let inventoryItems = [];
let coaches = [];
let employees = [];
let currentCategory = '';
let currentSaleItems = [];

// جلب البيانات من Firebase بشكل لحظي (Realtime)
onSnapshot(collection(db, "players"), (snapshot) => {
    players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderPlayers();
});
onSnapshot(collection(db, "products"), (snapshot) => {
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts();
});
onSnapshot(collection(db, "sales"), (snapshot) => {
    salesHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderSalesHistory();
});
onSnapshot(collection(db, "inventory"), (snapshot) => {
    inventoryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderInventory();
});
onSnapshot(collection(db, "coaches"), (snapshot) => {
    coaches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCoaches();
});
onSnapshot(collection(db, "employees"), (snapshot) => {
    employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderEmployees();
});

// الدوال الأساسية للنوافذ والتبويبات
window.openTab = function(event, tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
}

window.showPlayers = function(categoryName) {
    currentCategory = categoryName;
    document.getElementById('players-list-area').style.display = 'block';
    document.getElementById('selected-category-title').innerText = 'قائمة اللاعبين - ' + categoryName;
    renderPlayers();
}

window.openModal = function(modalId) { document.getElementById(modalId).style.display = 'block'; }
window.closeModal = function(modalId) { document.getElementById(modalId).style.display = 'none'; }
window.toggleElement = function(elementId) {
    const el = document.getElementById(elementId);
    el.style.display = (el.style.display === "none" || el.style.display === "") ? "block" : "none";
}
window.formatCurrency = function(amount) { return Number(amount).toLocaleString('en-US') + ' د.ع'; }

window.onclick = function(event) {
    document.querySelectorAll('.modal').forEach(modal => {
        if (event.target == modal && modal.id !== 'startupPasswordModal') {
            modal.style.display = 'none';
        }
    });
}

// ---------------- قسم المنتجات والبيع ----------------
window.saveProduct = async function() {
    const name = document.getElementById('prodName').value;
    const price = Number(document.getElementById('prodPrice').value);
    const qty = Number(document.getElementById('prodQty').value);
    const editId = document.getElementById('prodEditId').value;

    if (!name || !price || !qty) return alert('يرجى ملء جميع الحقول');

    if (editId) {
        await updateDoc(doc(db, "products", editId), { name, price, qty });
        document.getElementById('prodEditId').value = '';
    } else {
        await addDoc(collection(db, "products"), { name, price, qty });
    }

    document.getElementById('prodName').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodQty').value = '';
    document.getElementById('addProductForm').style.display = 'none';
}

window.editProduct = function(id) {
    const prod = products.find(p => p.id == id);
    document.getElementById('prodName').value = prod.name;
    document.getElementById('prodPrice').value = prod.price;
    document.getElementById('prodQty').value = prod.qty;
    document.getElementById('prodEditId').value = prod.id;
    document.getElementById('addProductForm').style.display = 'block';
}

window.deleteProduct = async function(id) { await deleteDoc(doc(db, "products", id)); }

function renderProducts() {
    const container = document.getElementById('productsListContainer');
    container.innerHTML = products.length === 0 ? '<p style="text-align:center; grid-column: 1/-1;">لا توجد منتجات حالياً.</p>' : '';
    products.forEach(prod => {
        container.innerHTML += `
            <div class="glass-panel item-card">
                <h3>${prod.name}</h3>
                <p style="color: var(--primary-color); font-weight: bold; font-size: 1.2rem;">${formatCurrency(prod.price)}</p>
                <div style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 5px; margin: 10px 0;">المخزون الباقي: <span>${prod.qty}</span></div>
                <div class="card-actions">
                    <button class="icon-btn edit-btn" onclick="editProduct('${prod.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="icon-btn delete-btn" onclick="deleteProduct('${prod.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
    });
}

window.searchProductForSale = function() {
    const term = document.getElementById('saleSearchInput').value;
    const res = document.getElementById('saleSearchResults');
    res.innerHTML = '';
    if (!term) return;
    products.filter(p => p.name.startsWith(term)).forEach(prod => {
        res.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 10px; margin-bottom: 5px;">
                <div><strong>${prod.name}</strong> - ${formatCurrency(prod.price)}<br><small>المخزون الباقي: ${prod.qty}</small></div>
                <button class="primary-btn" onclick="addItemToCurrentSale('${prod.id}')"><i class="fa-solid fa-plus"></i></button>
            </div>`;
    });
}

window.addItemToCurrentSale = function(prodId) {
    const prod = products.find(p => p.id == prodId);
    if (prod.qty <= 0) return alert('المخزون نفذ!');
    currentSaleItems.push({ docId: prod.id, name: prod.name, price: prod.price });
    document.getElementById('saleSearchInput').value = '';
    document.getElementById('saleSearchResults').innerHTML = '';
    renderCurrentSaleItems();
}

function renderCurrentSaleItems() {
    const container = document.getElementById('currentSaleItems');
    let total = 0;
    container.innerHTML = '';
    currentSaleItems.forEach((item, i) => {
        total += item.price;
        container.innerHTML += `<div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>${item.name}</span><span>${formatCurrency(item.price)} <i class="fa-solid fa-times" style="color:red; cursor:pointer;" onclick="removeCurrentSaleItem(${i})"></i></span>
        </div>`;
    });
    document.getElementById('saleTotalAmount').innerText = 'المجموع الكلي: ' + formatCurrency(total);
}

window.removeCurrentSaleItem = function(index) {
    currentSaleItems.splice(index, 1);
    renderCurrentSaleItems();
}

window.saveSale = async function() {
    const playerName = document.getElementById('salePlayerName').value;
    if (!playerName) return alert('يرجى كتابة اسم اللاعب');
    if (currentSaleItems.length === 0) return alert('يرجى إضافة مواد');

    let totalAmount = 0;
    for (let item of currentSaleItems) {
        totalAmount += item.price;
        const prod = products.find(p => p.id == item.docId);
        if (prod) await updateDoc(doc(db, "products", prod.id), { qty: prod.qty - 1 });
    }

    await addDoc(collection(db, "sales"), {
        player: playerName, items: currentSaleItems.map(i => i.name), total: totalAmount, date: new Date().toLocaleDateString()
    });

    currentSaleItems = [];
    document.getElementById('salePlayerName').value = '';
    document.getElementById('newSaleForm').style.display = 'none';
    renderCurrentSaleItems();
}

function renderSalesHistory() {
    const container = document.getElementById('salesHistoryContainer');
    container.innerHTML = salesHistory.length === 0 ? '<p style="text-align: center; opacity: 0.7;">السجلات</p>' : '';
    salesHistory.forEach(sale => {
        container.innerHTML += `
            <div class="list-item">
                <div><h4>اسم الاعب: ${sale.player}</h4><p>التاريخ: ${sale.date}</p><p>الماده: ${sale.items.join('، ')}</p><p style="color: var(--primary-color);">المجموع الكلي: ${formatCurrency(sale.total)}</p></div>
                <button class="icon-btn delete-btn" onclick="deleteSale('${sale.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>`;
    });
}
window.deleteSale = async function(id) { await deleteDoc(doc(db, "sales", id)); }

// ---------------- قسم المخزن ----------------
window.saveInventoryItem = async function() {
    const name = document.getElementById('invName').value;
    const qty = Number(document.getElementById('invQty').value);
    const editId = document.getElementById('invEditId').value;
    if (!name || !qty) return alert('يرجى ملء الاسم والعدد');

    if (editId) {
        await updateDoc(doc(db, "inventory", editId), { name, qty });
        document.getElementById('invEditId').value = '';
    } else {
        await addDoc(collection(db, "inventory"), { name, qty });
    }
    document.getElementById('invName').value = '';
    document.getElementById('invQty').value = '';
    closeModal('inventoryModal');
}

window.decreaseInventory = async function(id) {
    const item = inventoryItems.find(i => i.id == id);
    if (item && item.qty > 0) await updateDoc(doc(db, "inventory", id), { qty: item.qty - 1 });
}
window.editInventory = function(id) {
    const item = inventoryItems.find(i => i.id == id);
    document.getElementById('invName').value = item.name;
    document.getElementById('invQty').value = item.qty;
    document.getElementById('invEditId').value = item.id;
    openModal('inventoryModal');
}
window.deleteInventory = async function(id) { await deleteDoc(doc(db, "inventory", id)); }

function renderInventory() {
    const container = document.getElementById('inventoryListContainer');
    container.innerHTML = inventoryItems.length === 0 ? '<p style="text-align: center; opacity: 0.7;">المخزن فارغ حالياً.</p>' : '';
    inventoryItems.forEach(item => {
        container.innerHTML += `
            <div class="list-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div><h3 style="margin-bottom: 5px;">${item.name}</h3><div style="font-size: 1.2rem;">المتبقي: <span style="font-weight:bold; color:var(--primary-color);">${item.qty}</span></div>
                    <div class="card-actions" style="justify-content: flex-start; margin-top: 10px;">
                        <button class="icon-btn edit-btn" onclick="editInventory('${item.id}')"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
                        <button class="icon-btn delete-btn" onclick="deleteInventory('${item.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
                    </div>
                </div>
                <button class="large-minus-btn" onclick="decreaseInventory('${item.id}')"><i class="fa-solid fa-minus"></i></button>
            </div>`;
    });
}

// ---------------- قسم المدربين والموظفين (مع ضغط الصور) ----------------
function resizeImageToText(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400; // تقليص دقة الصورة إلى متوسطة
            const MAX_HEIGHT = 400;
            let width = img.width;
            let height = img.height;
            if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
            else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.6)); // تحويل لنص Base64 بدقة 60%
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
}

window.showImagePreview = function(imgSrc) {
    document.getElementById('previewImage').src = imgSrc;
    openModal('imagePreviewModal');
}

window.saveCoach = async function() {
    const name = document.getElementById('coachName').value;
    const cert = document.getElementById('coachCert').value;
    const date = document.getElementById('coachDate').value;
    const amount = document.getElementById('coachAmount').value;
    const equip = document.getElementById('coachEquip').value;
    const category = document.getElementById('coachCategory').value;
    const editId = document.getElementById('coachEditId').value;
    const imageInput = document.getElementById('coachImage');
    if (!name) return alert('يرجى إدخال اسم المدرب');

    const saveData = async (imgBase64) => {
        const coachData = { name, cert, date, amount, equip, category };
        if (imgBase64) coachData.image = imgBase64;

        if (editId) {
            await updateDoc(doc(db, "coaches", editId), coachData);
            document.getElementById('coachEditId').value = '';
        } else {
            await addDoc(collection(db, "coaches"), coachData);
        }
        closeModal('coachModal');
        document.getElementById('coachName').value = '';
        document.getElementById('coachImage').value = '';
    };

    if (imageInput.files && imageInput.files[0]) {
        resizeImageToText(imageInput.files[0], saveData);
    } else {
        saveData(null);
    }
}

function renderCoaches() {
    const container = document.getElementById('coachesListContainer');
    container.innerHTML = coaches.length === 0 ? '<p style="text-align: center; opacity: 0.7;">لا يوجد مدربين</p>' : '';
    coaches.forEach(coach => {
        let imgHtml = coach.image ? `<img src="${coach.image}" class="coach-img" onclick="showImagePreview('${coach.image}')">` : `<div class="coach-img-placeholder"><i class="fa-solid fa-user"></i></div>`;
        container.innerHTML += `
            <div class="list-item" style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                ${imgHtml}
                <div style="flex: 1; min-width: 150px;">
                    <h4>${coach.name}</h4><p>تاريخ الانضمام: ${coach.date}</p><p>الفئة: ${coach.category}</p>
                </div>
                <div class="card-actions">
                    <button class="icon-btn edit-btn" onclick="editCoach('${coach.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="icon-btn delete-btn" onclick="askDeleteCoach('${coach.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
    });
}
window.editCoach = function(id) {
    const c = coaches.find(x => x.id == id);
    document.getElementById('coachName').value = c.name;
    document.getElementById('coachCategory').value = c.category;
    document.getElementById('coachEditId').value = c.id;
    openModal('coachModal');
}
window.askDeleteCoach = function(id) {
    document.getElementById('deleteTargetId').value = id;
    document.getElementById('deletePasswordInput').value = '';
    openModal('deletePasswordModal');
}
window.confirmDeleteCoach = async function() {
    if (document.getElementById('deletePasswordInput').value === '1001') {
        await deleteDoc(doc(db, "coaches", document.getElementById('deleteTargetId').value));
        closeModal('deletePasswordModal');
    } else alert('كلمة المرور خاطئة!');
}

// ---------------- قسم الموظفين ----------------
window.saveEmployee = async function() {
    const name = document.getElementById('empName').value;
    const role = document.getElementById('empRole').value;
    const edu = document.getElementById('empEdu').value;
    const amount = document.getElementById('empAmount').value;
    const equip = document.getElementById('empEquip').value;
    const editId = document.getElementById('empEditId').value;
    const imageInput = document.getElementById('empImage');
    
    if (!name) return alert('يرجى إدخال اسم الموظف');

    const saveData = async (imgBase64) => {
        const empData = { name, role, edu, amount, equip };
        if (imgBase64) empData.image = imgBase64;

        if (editId) {
            await updateDoc(doc(db, "employees", editId), empData);
            document.getElementById('empEditId').value = '';
        } else {
            await addDoc(collection(db, "employees"), empData);
        }
        closeModal('employeeModal');
        document.getElementById('empName').value = '';
        document.getElementById('empRole').value = '';
        document.getElementById('empEdu').value = '';
        document.getElementById('empAmount').value = '';
        document.getElementById('empEquip').value = '';
        document.getElementById('empImage').value = '';
    };

    if (imageInput.files && imageInput.files[0]) {
        resizeImageToText(imageInput.files[0], saveData);
    } else {
        saveData(null);
    }
}

function renderEmployees() {
    const container = document.getElementById('employeesListContainer');
    container.innerHTML = employees.length === 0 ? '<p style="text-align: center; opacity: 0.7;">لا يوجد موظفين مضافين حتى الآن.</p>' : '';
    employees.forEach(emp => {
        let imgHtml = emp.image ? `<img src="${emp.image}" class="coach-img" onclick="showImagePreview('${emp.image}')">` : `<div class="coach-img-placeholder"><i class="fa-solid fa-user"></i></div>`;
        container.innerHTML += `
            <div class="list-item" style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                ${imgHtml}
                <div style="flex: 1; min-width: 150px;">
                    <h4>${emp.name}</h4>
                    <p>الصفة: ${emp.role || ''}</p>
                    <p>التحصيل الدراسي: ${emp.edu || ''}</p>
                    <p>المبلغ المستلم: ${emp.amount || ''}</p>
                    <p>التجهيز المستلم: ${emp.equip || ''}</p>
                </div>
                <div class="card-actions">
                    <button class="icon-btn edit-btn" onclick="editEmployee('${emp.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="icon-btn delete-btn" onclick="deleteEmployee('${emp.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
    });
}

window.editEmployee = function(id) {
    const e = employees.find(x => x.id == id);
    document.getElementById('empName').value = e.name || '';
    document.getElementById('empRole').value = e.role || '';
    document.getElementById('empEdu').value = e.edu || '';
    document.getElementById('empAmount').value = e.amount || '';
    document.getElementById('empEquip').value = e.equip || '';
    document.getElementById('empEditId').value = e.id;
    openModal('employeeModal');
}

window.deleteEmployee = async function(id) {
    await deleteDoc(doc(db, "employees", id));
}

// ---------------- قسم اللاعبين ----------------
window.savePlayer = async function() {
    const name = document.getElementById('playerName').value;
    const subEndDate = document.getElementById('playerSubEndDate').value;
    if (!name) return alert('يرجى إدخال اسم اللاعب');

    await addDoc(collection(db, "players"), {
        name, subEndDate, category: currentCategory,
        dob: document.getElementById('playerDob').value,
        address: document.getElementById('playerAddress').value
    });
    closeModal('playerModal');
}

function renderPlayers() {
    const container = document.getElementById('playersListContainer');
    const catPlayers = players.filter(p => p.category === currentCategory);
    container.innerHTML = catPlayers.length === 0 ? '<p style="text-align: center;">لا يوجد لاعبين حالياً.</p>' : '';
    
    catPlayers.forEach((player, index) => {
        let daysLeft = 0;
        if(player.subEndDate) {
             const end = new Date(player.subEndDate); end.setHours(0,0,0,0);
             const today = new Date(); today.setHours(0,0,0,0);
             daysLeft = Math.ceil((end - today) / (1000*60*60*24));
        }
        const isExpired = daysLeft <= 0;
        let nHtml = isExpired ? `<span class="expired-name"><i class="fa-solid fa-circle-exclamation warning-icon"></i> ${player.name}</span>` : player.name;
        let btnHtml = isExpired ? `<button class="pay-btn" onclick="openPaymentModal('${player.id}')">تسديد</button>` : '';

        container.innerHTML += `
            <div class="list-item">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background-color: white; color: black; font-weight: bold; padding: 5px 12px; border-radius: 10px; font-size: 1.1rem;">${index + 1}-</div>
                    <div><h4>${nHtml}</h4><p>باقي من الاشتراك: ${daysLeft} يوم</p></div>
                </div>
                <div class="card-actions" style="align-items: center;">${btnHtml}</div>
            </div>`;
    });
}
window.openPaymentModal = function(id) {
    document.getElementById('payPlayerId').value = id;
    openModal('paymentModal');
}
window.savePayment = async function() {
    const id = document.getElementById('payPlayerId').value;
    const endDate = document.getElementById('payEndDate').value;
    if (!endDate) return alert('حدد تاريخ الانتهاء');
    await updateDoc(doc(db, "players", id), { subEndDate: endDate });
    closeModal('paymentModal');
}
