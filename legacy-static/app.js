const sermons = [
  { title: "Faith that stands when life shakes", speaker: "Rev. Doc. Kevin Page", topic: "faith", tone: "blue" },
  { title: "When prayer becomes your first response", speaker: "Bull Bay Prayer Team", topic: "prayer", tone: "olive" },
  { title: "Created for a purpose greater than fear", speaker: "Rev. Doc. Kevin Page", topic: "purpose", tone: "pale" },
  { title: "Grace for the next step", speaker: "Guest Minister", topic: "faith", tone: "olive" },
  { title: "A house of worship", speaker: "Rev. Doc. Kevin Page", topic: "prayer", tone: "blue" },
  { title: "Use what God placed in your hands", speaker: "Bull Bay Leadership", topic: "purpose", tone: "pale" }
];

const events = [
  { day: "24", month: "AUG", category: "PRAYER & FASTING", title: "Prayer and Fasting in the Sanctuary", description: "Wednesday • 9:00 AM • Sanctuary" },
  { day: "28", month: "AUG", category: "CHURCH FAMILY", title: "Spring Garden Rally", description: "Friday • 7:00 PM • Men are invited to represent Bull Bay" },
  { day: "30", month: "AUG", category: "SPECIAL SERVICE", title: "Send-Off Service for Rev. Markland & Family", description: "Sunday • 9:50 AM • Worship with us as we celebrate their next season" },
  { day: "05", month: "SEP", category: "YOUTH MINISTRY", title: "Teens Fellowship", description: "Friday • 4:30 PM • A space for teens to grow and connect" }
];

const ministries = [
  { icon: "♫", title: "Worship & Music", text: "Lead people into God's presence through worship.", action: "Join worship" },
  { icon: "✦", title: "Youth Ministry", text: "A faith-filled community for the next generation.", action: "Explore youth" },
  { icon: "♡", title: "Children's Ministry", text: "Helping children discover the love of Jesus.", action: "Learn more" },
  { icon: "⌁", title: "Men's Ministry", text: "Growing strong men of faith, family and purpose.", action: "Connect with men" },
  { icon: "❋", title: "Women's Ministry", text: "Encouraging women to flourish in every season.", action: "Connect with women" },
  { icon: "☀", title: "Community Outreach", text: "Serving Bull Bay with practical love and hope.", action: "Serve with us" }
];

const products = [
  { title: "Bull Bay Heritage Tee", type: "apparel", description: "Comfortable ministry apparel", price: "JMD $2,500" },
  { title: "The Word Still Speaks", type: "resources", description: "Sermon notes and study guide", price: "JMD $850" },
  { title: "Daily Grace Devotional", type: "digital", description: "30-day digital devotional", price: "JMD $1,200" },
  { title: "Faith Over Fear Tee", type: "apparel", description: "Unisex church apparel", price: "JMD $2,500" },
  { title: "Family Prayer Journal", type: "resources", description: "Guided journal for home devotion", price: "JMD $1,500" },
  { title: "Bible Study Toolkit", type: "digital", description: "Downloadable discipleship resources", price: "JMD $1,800" }
];

const displaySermons = (filter = "all", query = "") => {
  const grid = document.querySelector("#sermon-grid");
  if (!grid) return;
  const results = sermons.filter(s => (filter === "all" || s.topic === filter) && `${s.title} ${s.speaker} ${s.topic}`.toLowerCase().includes(query.toLowerCase()));
  grid.innerHTML = results.length ? results.map(s => `<article class="sermon-card"><div class="sermon-thumb ${s.tone}"><span class="tag">${s.topic.toUpperCase()}</span><strong>${s.title}</strong><span>▶ Watch message</span></div><h3>${s.title}</h3><p>${s.speaker} • 42 min</p><button data-view-target="live">Watch now →</button></article>`).join("") : "<p>No messages found. Try another topic.</p>";
};

const eventTemplate = (event) => `<article class="event-row"><div class="event-date"><b>${event.day}</b><small>${event.month}</small></div><div class="event-body"><small>${event.category}</small><h3>${event.title}</h3><p>${event.description}</p></div><button data-view-target="connect" aria-label="Register interest for ${event.title}">→</button></article>`;
const displayEvents = () => document.querySelectorAll('[data-list="events"]').forEach(container => { container.innerHTML = events.map(eventTemplate).join(""); });
const displayMinistries = () => { const grid = document.querySelector("#ministry-grid"); if (grid) grid.innerHTML = ministries.map(m => `<article class="ministry-card"><span>${m.icon}</span><div><h3>${m.title}</h3><p>${m.text}</p></div><button data-view-target="connect">${m.action} →</button></article>`).join(""); };
const displayProducts = (filter = "all") => { const grid = document.querySelector("#shop-grid"); if (!grid) return; const list = products.filter(p => filter === "all" || p.type === filter); grid.innerHTML = list.map((p, i) => `<article class="product-card"><div class="product-thumb ${p.type}">${p.type === "digital" ? "✦" : p.type === "resources" ? "The Word" : "Bull Bay"}</div><h3>${p.title}</h3><p>${p.description}</p><footer><b>${p.price}</b><button data-add-cart="${i}">Add to bag +</button></footer></article>`).join(""); };

function showView(target) {
  const view = document.getElementById(target);
  if (!view) return;
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v === view));
  document.querySelectorAll("[data-view-target]").forEach(button => button.classList.toggle("active", button.dataset.viewTarget === target && button.closest(".main-nav")));
  document.querySelector(".main-nav")?.classList.remove("open");
  document.querySelector(".menu-button")?.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", `#${target}`);
}

let cartCount = 0;
let toastTimer;
function toast(message) { const element = document.querySelector(".toast"); element.textContent = message; element.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove("show"), 3800); }

function runSearch(term) {
  const result = document.querySelector("#search-results");
  const all = [
    ...sermons.map(item => ({ type: "Sermon", title: item.title, target: "sermons" })),
    ...ministries.map(item => ({ type: "Ministry", title: item.title, target: "ministries" })),
    ...events.map(item => ({ type: "Event", title: item.title, target: "events" })),
    ...products.map(item => ({ type: "Shop", title: item.title, target: "shop" })),
    { type: "Page", title: "Plan Your Visit", target: "visit" }, { type: "Page", title: "Prayer Request", target: "prayer" }, { type: "Page", title: "Online Giving", target: "giving" }
  ];
  const matches = all.filter(item => item.title.toLowerCase().includes(term.toLowerCase())).slice(0, 6);
  result.innerHTML = term ? (matches.length ? matches.map(item => `<div class="search-result"><span><b>${item.title}</b><br><small>${item.type}</small></span><button data-view-target="${item.target}">Open →</button></div>`).join("") : "<p>No result found. Try a different word.</p>") : "<p>Search sermons, ministries, events and shop resources.</p>";
}

document.addEventListener("click", event => {
  const target = event.target.closest("[data-view-target]");
  if (target) { event.preventDefault(); showView(target.dataset.viewTarget); }
  const demo = event.target.closest("[data-demo-message]"); if (demo) toast(demo.dataset.demoMessage);
  const add = event.target.closest("[data-add-cart]"); if (add) { cartCount += 1; document.querySelector("#cart-count").textContent = cartCount; toast(`${products[add.dataset.addCart].title} added to your bag.`); }
  const amount = event.target.closest("[data-amount]"); if (amount) { document.querySelectorAll("[data-amount]").forEach(item => item.classList.remove("selected")); amount.classList.add("selected"); document.querySelector('[name="amount"]').value = amount.dataset.amount; }
  const sermonFilter = event.target.closest("[data-sermon-filter]"); if (sermonFilter) { document.querySelectorAll("[data-sermon-filter]").forEach(item => item.classList.toggle("active", item === sermonFilter)); displaySermons(sermonFilter.dataset.sermonFilter); }
  const shopFilter = event.target.closest("[data-shop-filter]"); if (shopFilter) { document.querySelectorAll("[data-shop-filter]").forEach(item => item.classList.toggle("active", item === shopFilter)); displayProducts(shopFilter.dataset.shopFilter); }
});

document.querySelector(".menu-button")?.addEventListener("click", event => { const nav = document.querySelector(".main-nav"); const isOpen = nav.classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded", isOpen); });
document.querySelector(".search-trigger")?.addEventListener("click", () => document.querySelector(".search-dialog").showModal());
document.querySelector(".close-dialog")?.addEventListener("click", () => document.querySelector(".search-dialog").close());
document.querySelector("#global-search")?.addEventListener("input", event => runSearch(event.target.value));
document.querySelector("#sermon-filter")?.addEventListener("input", event => { const active = document.querySelector("[data-sermon-filter].active")?.dataset.sermonFilter || "all"; displaySermons(active, event.target.value); });
document.querySelectorAll("form[data-form]").forEach(form => form.addEventListener("submit", event => { event.preventDefault(); const name = form.dataset.form; form.reset(); toast(`${name} received. It is ready to connect to your secure Supabase workflow.`); }));
document.querySelector("#year").textContent = new Date().getFullYear();
displaySermons(); displayEvents(); displayMinistries(); displayProducts();
const startView = location.hash.slice(1); if (startView && document.getElementById(startView)) showView(startView);
