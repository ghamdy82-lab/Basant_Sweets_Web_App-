let productsData = [];
let cart = JSON.parse(localStorage.getItem('basentCart')) || [];
let orders = JSON.parse(localStorage.getItem('basentOrders')) || [];
let selectedDeliveryType = localStorage.getItem('bDeliveryType') || '';
let currentMainCat = 'western';
let currentSubCat = 'torts_28';

let mainCategories = [];
let dynamicSubCategories = {};

function loadProductsFromFirebase() {
    db.collection("products").onSnapshot((snapshot) => {
        productsData = [];
        snapshot.forEach((doc) => { productsData.push({ id: doc.id, ...doc.data() }); });
        renderProducts();
    });
}

function loadCategoriesFromFirebase() {
    db.collection("categories").orderBy("order").onSnapshot((snapshot) => {
        mainCategories = [];
        dynamicSubCategories = {};
        const sidebarMenu = document.getElementById('sidebarMenu');
        const homeCategoriesView = document.getElementById('homeCategoriesView');
        
        if (!sidebarMenu || !homeCategoriesView) return;
        
        sidebarMenu.innerHTML = '';
        homeCategoriesView.innerHTML = '';

        snapshot.forEach((doc) => {
            const cat = doc.data();
            mainCategories.push(cat);
            dynamicSubCategories[cat.id] = cat.subCats || [];

            let btnClass = cat.id === 'special_offers' ? 'sidebar-btn special-offer-btn-side' : 'sidebar-btn';
            sidebarMenu.innerHTML += `
                <button class="${btnClass}" onclick="setMainCat('${cat.id}', this); toggleSidebar();">
                    <i class="fas ${cat.icon}"></i> ${cat.name}
                </button>
            `;

            if (cat.image) {
                homeCategoriesView.innerHTML += `
                    <div class="home-cat-card" onclick="goToCategory('${cat.id}')">
                        <img src="${cat.image}" alt="${cat.name}">
                        <span>${cat.name}</span>
                    </div>
                `;
            }
        });
    });
}

function loadOffersFromFirebase() {
    db.collection("banner_offers").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        const bannerDiv = document.getElementById('dynamicOffersBanner');
        const sectionDiv = document.getElementById('mainOffersBannerSection');
        if (!bannerDiv || !sectionDiv) return;

        let offers = [];
        snapshot.forEach((doc) => offers.push(doc.data()));

        if (offers.length === 0) {
            sectionDiv.classList.add('hidden-view');
            return;
        }

        sectionDiv.classList.remove('hidden-view');
        bannerDiv.innerHTML = offers.map(offer => `
            <div class="offer-card" onclick="goToCategory('${offer.link || 'special_offers'}')" style="cursor: pointer;">
                <img src="${offer.image}" alt="${offer.title}">
                <div class="offer-details">${offer.title}<br><span class="offer-price">${offer.price || ''}</span></div>
            </div>
        `).join('');
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastBox');
    const icon = document.getElementById('toastIcon');
    document.getElementById('toastMsg').innerText = message;
    toast.className = 'toast show ' + type;
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function updateNavState(activeId) {
    document.querySelectorAll('.bottom-nav-item').forEach(btn => btn.classList.remove('active'));
    if(activeId) document.getElementById(activeId).classList.add('active');
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    updateNavState('navHome');
}

function goHome() {
    closeModals();
    let homeView = document.getElementById('homeCategoriesView');
    let prodSec = document.getElementById('productsSection');
    if(homeView) homeView.classList.remove('hidden-view');
    if(prodSec) prodSec.classList.add('hidden-view');
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function openAccountModal() {
    closeModals();
    document.getElementById('accountModal').classList.add('active');
    updateNavState('navProfile');
    
    const n = localStorage.getItem('bName') || '';
    const p = localStorage.getItem('bPhone') || '';
    const a = localStorage.getItem('bAddress') || '';
    
    document.getElementById('accName').value = n;
    document.getElementById('accPhone').value = p;
    document.getElementById('accAddress').value = a;
    document.getElementById('accSuccess').classList.add('hidden-view');

    if (n && p) {
        document.getElementById('displayAccName').innerText = n;
        document.getElementById('displayAccPhone').innerText = p;
        document.getElementById('displayAccAddress').innerText = a || 'لم يتم تسجيل عنوان';
        document.getElementById('profileView').classList.remove('hidden-view');
        document.getElementById('editView').classList.add('hidden-view');
        document.getElementById('cancelEditBtn').classList.remove('hidden-view');
    } else {
        document.getElementById('profileView').classList.add('hidden-view');
        document.getElementById('editView').classList.remove('hidden-view');
        document.getElementById('cancelEditBtn').classList.add('hidden-view');
    }
}

function toggleEditMode() {
    const profileView = document.getElementById('profileView');
    const editView = document.getElementById('editView');
    if (editView.classList.contains('hidden-view')) {
        profileView.classList.add('hidden-view');
        editView.classList.remove('hidden-view');
    } else {
        profileView.classList.remove('hidden-view');
        editView.classList.add('hidden-view');
    }
}

async function saveAccountData() {
    const p = document.getElementById('accPhone').value.trim();
    let n = document.getElementById('accName').value.trim();
    let a = document.getElementById('accAddress').value.trim();
    
    if (!p) return showToast("يا فندم لازم نكتب الموبايل على الأقل!", "error");
    
    const btn = document.querySelector('#editView .add-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري التحميل...`;
    btn.disabled = true;

    try {
        const docRef = await db.collection("customers").doc(p).get();
        
        if (docRef.exists) {
            const data = docRef.data();
            n = data.name || n;
            a = data.address || a;
            
            localStorage.setItem('basentTotalPoints', data.points || 0);
            localStorage.setItem('basentLifetimePoints', data.lifetimePoints || 0);
            
            if (data.orders && data.orders.length > 0) {
                orders = data.orders; 
                localStorage.setItem('basentOrders', JSON.stringify(orders));
            }
            showToast("أهلاً بيك مرة تانية! رجعنالك كل بياناتك ونقطك.", "success");
        } else {
            if (!n) {
                btn.innerHTML = originalText;
                btn.disabled = false;
                return showToast("عشان دي أول مرة تنورنا، لازم تكتب اسمك!", "error");
            }
            await db.collection("customers").doc(p).set({
                name: n, phone: p, address: a || "لم يسجل عنوان",
                points: 0, lifetimePoints: 0, orders: [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            localStorage.setItem('basentTotalPoints', 0);
            localStorage.setItem('basentLifetimePoints', 0);
            localStorage.setItem('basentOrders', JSON.stringify([]));
            orders = [];
            showToast("✅ تم حفظ بياناتك بنجاح!", "success");
        }

        localStorage.setItem('bName', n);
        localStorage.setItem('bPhone', p);
        localStorage.setItem('bAddress', a);

        document.getElementById('accSuccess').classList.remove('hidden-view');
        setTimeout(() => { goHome(); }, 1500);

    } catch (e) {
        console.error("خطأ:", e);
        showToast("حصل خطأ في الاتصال بالشبكة!", "error");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

function updateCartCustomerInfo() {
    const n = localStorage.getItem('bName');
    const p = localStorage.getItem('bPhone');
    const infoDiv = document.getElementById('cartCustomerInfo');
    
    if (n && p) {
        infoDiv.innerHTML = `<p class="profile-item-primary">👤 الاسم: ${n}</p><p class="profile-item-text">📱 الموبايل: ${p}</p><button class="edit-data-btn" onclick="openAccountModal()">تعديل بياناتي</button>`;
    } else {
        infoDiv.innerHTML = `<p class="summary-val-danger font-bold mb-10">⚠️ لسه مسجلتش بياناتك!</p><button class="add-btn" onclick="openAccountModal()">تسجيل البيانات الآن</button>`;
    }
}

function openPointsModal() {
    closeModals(); 
    document.getElementById('pointsModal').classList.add('active');
    
    let rewardPoints = parseInt(localStorage.getItem('basentTotalPoints')) || 0;
    let lifetimePoints = parseInt(localStorage.getItem('basentLifetimePoints')) || rewardPoints;
    
    document.getElementById('rewardPointsDisplay').innerText = rewardPoints;
    let lifetimeDisplay = document.getElementById('lifetimePointsDisplay');
    if (lifetimeDisplay) lifetimeDisplay.innerText = lifetimePoints;
}

function updateCartIcon() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const stickyBtn = document.getElementById('stickyCartBtn');
    const stickyBadge = document.getElementById('stickyCartCount');
    if (totalItems > 0) {
        if (stickyBtn) stickyBtn.style.display = 'flex';
        if (stickyBadge) stickyBadge.innerText = totalItems;
    } else {
        if (stickyBtn) stickyBtn.style.display = 'none';
    }
}

function saveCart() {
    localStorage.setItem('basentCart', JSON.stringify(cart));
    updateCartIcon();
    if (document.getElementById('cartModal').classList.contains('active')) renderCart();
}

function openCart() { 
    closeModals(); document.getElementById('cartModal').classList.add('active'); 
    updateNavState('navCart'); updateCartCustomerInfo();
    if (localStorage.getItem('bDeliveryType')) selectDelivery(localStorage.getItem('bDeliveryType'));
    renderCart(); 
}

function renderCart() {
    const itemsDiv = document.getElementById('cartItems');
    const deliveryFeeDisplay = document.getElementById('deliveryFeeDisplay');
    const cartPointsDiv = document.getElementById('cartPoints');
    const pointsValueSpan = document.getElementById('pointsValue');
    
    if (cart.length === 0) {
        itemsDiv.innerHTML = '<p class="text-center mt-15 font-bold">السلة فاضية!</p>';
        document.getElementById('cartSubtotal').innerText = '0 ج';
        document.getElementById('cartGrandTotal').innerText = '0 ج';
        if (deliveryFeeDisplay) deliveryFeeDisplay.classList.add('hidden-view');
        if (cartPointsDiv) cartPointsDiv.classList.add('hidden-view');
        return;
    }

    itemsDiv.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div><div class="product-name">${item.name}</div><div class="product-price">${item.price * item.qty} ج</div></div>
            <div style="display:flex; align-items:center; gap:8px;"><button class="qty-btn" onclick="updateQtyInCart('${item.id}', 1)">+</button><span style="font-weight:bold; min-width:20px; text-align:center;">${item.qty} ${item.isFlexible ? 'كجم' : ''}</span><button class="qty-btn" onclick="updateQtyInCart('${item.id}', -1)">-</button></div>
        </div>
    `).join('');

    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let deliveryFee = 0;
    if (selectedDeliveryType === 'توصيل للمنزل') {
        let areaSelect = document.getElementById('deliveryArea');
        if (areaSelect && areaSelect.value !== "0") deliveryFee = parseInt(areaSelect.value);
    }
    let grandTotal = subtotal + deliveryFee;
    let earnedPoints = Math.floor(subtotal / 10);

    document.getElementById('cartSubtotal').innerText = subtotal + ' ج';
    if (selectedDeliveryType === 'توصيل للمنزل' && deliveryFee > 0 && deliveryFeeDisplay) {
        deliveryFeeDisplay.classList.remove('hidden-view');
        document.getElementById('cartDeliveryFee').innerText = deliveryFee + ' ج';
    } else if (deliveryFeeDisplay) deliveryFeeDisplay.classList.add('hidden-view');
    
    document.getElementById('cartGrandTotal').innerText = grandTotal + ' ج';

    if (earnedPoints > 0 && cartPointsDiv) {
        cartPointsDiv.classList.remove('hidden-view'); pointsValueSpan.innerText = earnedPoints;
    } else if (cartPointsDiv) cartPointsDiv.classList.add('hidden-view');
}

function updateQtyInCart(id, changeDirection) {
    const item = cart.find(i => i.id === id);
    if (item) {
        const step = item.isFlexible ? 0.5 : 1;
        item.qty += (changeDirection * step);
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        saveCart(); renderCart(); renderProducts();
    }
}

function selectDelivery(type) {
    selectedDeliveryType = type;
    document.querySelectorAll('.del-btn').forEach(b => b.classList.remove('selected'));
    const areaGroup = document.getElementById('deliveryAreaGroup');
    
    if (type.includes('توصيل')) {
        document.getElementById('btn-delivery').classList.add('selected');
        if (areaGroup) areaGroup.classList.remove('hidden-view');
    } else {
        document.getElementById('btn-pickup').classList.add('selected');
        if (areaGroup) areaGroup.classList.add('hidden-view');
        document.getElementById('deliveryArea').value = "0";
    }
    renderCart();
}

async function sendOrder() {
    const name = localStorage.getItem('bName');
    const phone = localStorage.getItem('bPhone');
    const address = localStorage.getItem('bAddress');

    if (!name || !phone) { showToast('عشان نكمل الطلب، محتاجين بياناتك الأول!', 'error'); setTimeout(() => openAccountModal(), 1200); return; }
    if (!selectedDeliveryType) return showToast('لازم تختار طريقة التسليم!', 'error');

    let areaName = "", areaValue = "0";
    if (selectedDeliveryType === 'توصيل للمنزل') {
        const areaSelect = document.getElementById('deliveryArea');
        if (!areaSelect || areaSelect.value === "0") return showToast("برجاء اختيار منطقة التوصيل!", "error");
        areaValue = areaSelect.value; areaName = areaSelect.options[areaSelect.selectedIndex].text;
    }

    const notes = document.getElementById('orderNotes') ? document.getElementById('orderNotes').value : "";
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let deliveryFee = (selectedDeliveryType === 'توصيل للمنزل') ? parseInt(areaValue) : 0;
    let grandTotal = subtotal + deliveryFee;
    let earnedPoints = Math.floor(subtotal / 10);

    let currentRewardPoints = 0;
    let currentLifetimePoints = 0;
    try {
        const docRef = await db.collection("customers").doc(phone).get();
        if (docRef.exists) {
            currentRewardPoints = docRef.data().points || 0;
            currentLifetimePoints = docRef.data().lifetimePoints || 0;
        }
    } catch(e) {}

    let newRewardPoints = currentRewardPoints + earnedPoints;
    let newLifetimePoints = currentLifetimePoints + earnedPoints;

    let giftMessage = "";
    if (newRewardPoints >= 200) {
        giftMessage = `\n🎁 *تنبيه لبسنت:* العميل يستحق هدية مجانية!`;
        newRewardPoints -= 200;
    }
    
    localStorage.setItem('basentTotalPoints', newRewardPoints);
    localStorage.setItem('basentLifetimePoints', newLifetimePoints);

    const newOrder = { 
        id: Math.floor(Math.random() * 100000), 
        total: grandTotal, 
        date: new Date().toLocaleDateString('ar-EG'),
        items: cart.map(i => `${i.name} (${i.qty})`).join('، ')
    };
    
    orders.push(newOrder); 
    localStorage.setItem('basentOrders', JSON.stringify(orders));

    try {
        await db.collection("customers").doc(phone).set({
            name: name,
            phone: phone,
            address: address || "بدون",
            points: newRewardPoints,
            lifetimePoints: newLifetimePoints,
            orders: firebase.firestore.FieldValue.arrayUnion(newOrder),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch(err) { console.log(err); }

    let orderText = `🆕 *طلب جديد من بسنت*\n\n👤 الاسم: ${name}\n📱 الموبايل: ${phone}\n`;
    if (selectedDeliveryType === 'توصيل للمنزل') orderText += `📍 العنوان: ${address}\n🏙 المنطقة: ${areaName}\n`;
    else orderText += `📍 استلام من: المعرض\n`;
    orderText += `📦 التسليم: ${selectedDeliveryType}\n`;
    if (notes) orderText += `📝 ملاحظات: ${notes}\n`;

    orderText += `\n📋 *الطلبات:*\n`;
    cart.forEach(item => { orderText += `- ${item.name} (${item.qty} ${item.isFlexible ? 'كجم' : 'قطعة'}) = ${item.price * item.qty} ج\n`; });

    orderText += `\n💵 المنتجات: ${subtotal} ج\n`;
    if (deliveryFee > 0) orderText += `🚚 التوصيل: ${deliveryFee} ج\n`;
    orderText += `💰 *الإجمالي النهائي: ${grandTotal} ج*\n\n⭐ *نقاط الأوردر ده:* ${earnedPoints} نقطة\n🌟 *إجمالي نقاط العميل دلوقتي:* ${newLifetimePoints} نقطة\n`;
    if (giftMessage) orderText += giftMessage;

    cart = []; saveCart(); closeModals();
    window.open(`https://wa.me/201151004546?text=${encodeURIComponent(orderText)}`, '_blank');
}

function openOrders() { 
    closeModals(); document.getElementById('ordersModal').classList.add('active'); updateNavState('navOrders');
    const list = document.getElementById('myOrdersList');
    if (orders.length === 0) list.innerHTML = '<p class="text-center">لا توجد طلبات سابقة.</p>';
    else list.innerHTML = orders.map(o => `<div class="cart-summary-box" style="border-right:4px solid var(--primary); display:flex; flex-direction:column; gap:5px;"><div class="profile-item-primary">طلب #${o.id}</div><div class="summary-val-danger font-bold">الإجمالي: ${o.total} ج</div></div>`).reverse().join('');
}

function updateGridQty(id, name, price, isFlexible, direction) {
    const step = isFlexible ? 0.5 : 1; 
    const existing = cart.find(i => i.id === id);
    if (direction > 0) {
        if (existing) existing.qty += step; else cart.push({ id, name, price, qty: step, isFlexible: isFlexible });
        showToast('🛒 تمت الإضافة للسلة!', 'success');
    } else {
        if (existing) {
            existing.qty -= step;
            if (existing.qty <= 0) { cart = cart.filter(i => i.id !== id); showToast('تمت الإزالة من السلة', 'error'); }
        }
    }
    saveCart(); renderProducts();
}

function renderProducts() {
    const filtered = productsData.filter(p => p.mainCat === currentMainCat && (currentSubCat === 'all' || p.subCat === currentSubCat || !p.subCat));
    renderGridItems(filtered);
}

function renderGridItems(filteredArray) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (filteredArray.length === 0) { grid.innerHTML = '<p class="success-msg summary-val-danger" style="grid-column: 1 / -1;">لا توجد منتجات.</p>'; return; }
    grid.innerHTML = filteredArray.map(p => {
        let priceText = `${p.price} ج` + (p.isFlexible ? ` <span style="font-size:0.7rem; color:#666;">/ كجم</span>` : ``);
        const cartItem = cart.find(i => i.id === p.id);
        let displayQty = cartItem ? cartItem.qty : (p.isFlexible ? "0.5 كجم" : "1");
        return `<div class="product-card">${p.image ? `<img src="${p.image}" class="product-img">` : `<div style="height:5px; background:var(--gold-light);"></div>`}<div class="product-info"><div class="product-name">${p.name}</div><div class="product-price">${priceText}</div><div class="qty-controls-container"><button class="qty-btn-grid" onclick="updateGridQty('${p.id}', '${p.name}', ${p.price}, ${p.isFlexible ? 'true' : 'false'}, 1)">+</button><span class="qty-display-grid">${displayQty}</span><button class="qty-btn-grid" onclick="updateGridQty('${p.id}', '${p.name}', ${p.price}, ${p.isFlexible ? 'true' : 'false'}, -1)">−</button></div></div></div>`;
    }).join('');
}

function setMainCat(catId, btnEl) {
    let homeView = document.getElementById('homeCategoriesView');
    let prodSec = document.getElementById('productsSection');
    if(homeView) homeView.classList.add('hidden-view');
    if(prodSec) prodSec.classList.remove('hidden-view');

    document.getElementById('searchInput').value = ''; 
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    currentMainCat = catId;
    if (btnEl) document.getElementById('catTitle').innerText = btnEl.innerText;
    
    const subTabsDiv = document.getElementById('subTabs');
    if (dynamicSubCategories[catId] && dynamicSubCategories[catId].length > 0) {
        subTabsDiv.classList.add('show-tabs');
        subTabsDiv.innerHTML = dynamicSubCategories[catId].map((sub, i) => `<button class="sub-tab-btn ${i === 0 ? 'active' : ''}" onclick="setSubCat('${sub.id}', this)">${sub.name}</button>`).join('');
        currentSubCat = dynamicSubCategories[catId][0].id;
    } else {
        subTabsDiv.classList.remove('show-tabs'); 
        subTabsDiv.innerHTML = ''; 
        currentSubCat = 'all';
    }
    
    renderProducts(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setSubCat(subId, btnEl) {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active')); btnEl.classList.add('active');
    currentSubCat = subId; renderProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function searchProducts() {
    let term = document.getElementById('searchInput').value.toLowerCase();
    if (term.length > 0) {
        document.getElementById('subTabs').classList.remove('show-tabs'); document.getElementById('catTitle').innerText = "🔍 نتائج البحث";
        renderGridItems(productsData.filter(p => p.name.toLowerCase().includes(term)));
    } else setMainCat(currentMainCat, document.querySelector(`.sidebar-btn.active`));
}

function goToCategory(linkId) { 
    let mainBtn = document.querySelector(`.sidebar-btn[onclick*="${linkId}"]`);
    if (mainBtn) {
        setMainCat(linkId, mainBtn);
        setTimeout(() => { document.getElementById('catTitle').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
        return;
    }
    
    for (let main in dynamicSubCategories) {
        let foundSub = dynamicSubCategories[main].find(s => s.id === linkId);
        if (foundSub) {
            let parentBtn = document.querySelector(`.sidebar-btn[onclick*="${main}"]`);
            if (parentBtn) setMainCat(main, parentBtn);
            setTimeout(() => {
                let subBtn = document.querySelector(`.sub-tab-btn[onclick*="${linkId}"]`);
                if (subBtn) setSubCat(linkId, subBtn);
                document.getElementById('catTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            return;
        }
    }
    
    let fallbackBtn = document.querySelector(`.sidebar-btn[onclick*="special_offers"]`);
    if (fallbackBtn) {
        setMainCat('special_offers', fallbackBtn);
        setTimeout(() => { document.getElementById('catTitle').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
    }
}

async function syncCustomerData() {
    const p = localStorage.getItem('bPhone');
    if (p) {
        try {
            const doc = await db.collection("customers").doc(p).get();
            if (doc.exists) {
                const data = doc.data();
                localStorage.setItem('basentTotalPoints', data.points || 0);
                localStorage.setItem('basentLifetimePoints', data.lifetimePoints || 0);
                if (data.orders) {
                    orders = data.orders;
                    localStorage.setItem('basentOrders', JSON.stringify(orders));
                }
            }
        } catch(e) {}
    }
}

function init() {
    syncCustomerData(); 
    loadCategoriesFromFirebase(); 
    loadProductsFromFirebase(); 
    loadOffersFromFirebase(); 
    updateCartIcon();
    setTimeout(() => { goHome(); }, 500);
}

let reviews = JSON.parse(localStorage.getItem('basentReviews')) || [];
let selectedStars = 5;

function openReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) { modal.classList.add('active'); document.getElementById('reviewSuccess').classList.add('hidden-view'); const savedName = localStorage.getItem('bName'); if (savedName) document.getElementById('reviewName').value = savedName; }
}
function closeReviewModal() { document.getElementById('reviewModal').classList.remove('active'); }

function updateStarDisplay() {
    document.querySelectorAll('.star-rating .star').forEach(star => {
        if (parseInt(star.dataset.value) <= selectedStars) star.classList.add('active'); else star.classList.remove('active');
    });
}

function submitReview() {
    const name = document.getElementById('reviewName').value.trim();
    const text = document.getElementById('reviewText').value.trim();
    const product = document.getElementById('reviewProduct').value.trim();
    const stars = parseInt(document.getElementById('reviewStars').value);
    if (!name || !text) return showToast('الرجاء كتابة اسمك وتعليقك!', 'error');
    reviews.unshift({ id: Date.now(), name: name, text: text, product: product || 'منتجات بسنت', stars: stars, date: new Date().toLocaleDateString('ar-EG') });
    localStorage.setItem('basentReviews', JSON.stringify(reviews)); document.getElementById('reviewSuccess').classList.remove('hidden-view');
    setTimeout(() => { closeReviewModal(); renderReviews(); }, 1200);
}

function renderReviews() {
    const scrollDiv = document.getElementById('reviewsScroll');
    if (!scrollDiv) return;
    scrollDiv.innerHTML = reviews.map(r => `<div class="review-card"><div class="review-header"><div class="review-avatar">${r.name.charAt(0)}</div><div><div class="review-name">${r.name}</div><div class="review-stars">${'⭐'.repeat(r.stars)}</div></div></div><p class="review-text">"${r.text}"</p><div><span class="review-product">${r.product}</span></div></div>`).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    const stars = document.querySelectorAll('.star-rating .star');
    if (stars.length > 0) { stars.forEach(star => { star.addEventListener('click', function() { selectedStars = parseInt(this.dataset.value); document.getElementById('reviewStars').value = selectedStars; updateStarDisplay(); }); }); updateStarDisplay(); }
    renderReviews();
});

window.onload = init;