/* AniGallery app — 画廊 + Bangumi 推荐 */
(function () {
  "use strict";
  const API = "https://api.bgm.tv/v0";
  const LS_USER = "ag_user_recs";
  const LS_REMOVED = "ag_removed_seeds";
  const LS_NOTES = "ag_notes";
  const LS_CACHE = "ag_live_cache";

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const toast = (msg, isErr) => {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast" + (isErr ? " err" : "");
    t.hidden = false;
    clearTimeout(t._h);
    t._h = setTimeout(() => (t.hidden = true), 2600);
  };
  const loadLS = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
  const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 隐私模式 */ } };

  /* ---------------- 樱花飘落 ---------------- */
  function initPetals() {
    const cv = $("#petals");
    if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    let W, H;
    const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    resize();
    addEventListener("resize", resize);
    const petals = Array.from({ length: 22 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      s: 6 + Math.random() * 9,
      vy: 0.4 + Math.random() * 0.9,
      vx: -0.25 + Math.random() * 0.5,
      a: Math.random() * Math.PI * 2, va: 0.005 + Math.random() * 0.02,
      hue: [330, 335, 340, 200][Math.floor(Math.random() * 4)],
    }));
    (function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of petals) {
        p.y += p.vy; p.x += p.vx + Math.sin(p.a) * 0.35; p.a += p.va;
        if (p.y > H + 16) { p.y = -16; p.x = Math.random() * W; }
        if (p.x > W + 16) p.x = -16;
        if (p.x < -16) p.x = W + 16;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(p.a) * 0.9);
        const s = p.s;
        ctx.fillStyle = `hsla(${p.hue}, 82%, 80%, .55)`;
        ctx.beginPath();
        // 五瓣感的单枚花瓣:两段贝塞尔构成尖头花瓣
        ctx.moveTo(0, -s * 1.25);
        ctx.bezierCurveTo(s * 0.85, -s * 0.55, s * 0.72, s * 0.75, 0, s * 0.72);
        ctx.bezierCurveTo(-s * 0.72, s * 0.75, -s * 0.85, -s * 0.55, 0, -s * 1.25);
        ctx.fill();
        // 花瓣尖端的浅色缺刻
        ctx.fillStyle = `hsla(${p.hue}, 70%, 92%, .35)`;
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.55, s * 0.28, s * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(frame);
    })();
  }

  /* ---------------- 画廊 ---------------- */
  const galleryState = { tag: "全部", list: [] };
  function initGallery() {
    const grid = $("#gallery-grid");
    $("#stat-count").textContent = window.GALLERY.length;
    const items = window.GALLERY.map((g, i) => ({ ...g, idx: i }));

    // 标签统计
    const counts = new Map();
    for (const g of items) for (const t of g.tags) counts.set(t, (counts.get(t) || 0) + 1);
    const tags = ["全部", ...[...counts.keys()].sort((a, b) => (counts.get(b) - counts.get(a)) || a.localeCompare(b))];

    const box = $("#gallery-filters");
    const MAX_SHOWN = 12;
    let expanded = false;
    const renderChips = () => {
      box.textContent = "";
      const visible = expanded ? tags : tags.slice(0, MAX_SHOWN + 1);
      for (const t of visible) {
        const c = el("button", "chip" + (t === galleryState.tag ? " active" : ""), t);
        c.setAttribute("role", "tab");
        if (t !== "全部") c.appendChild(el("span", "cnt", String(counts.get(t))));
        c.onclick = () => {
          galleryState.tag = t;
          renderChips();
          renderGallery();
        };
        box.appendChild(c);
      }
      if (tags.length > MAX_SHOWN + 1) {
        const more = el("button", "chip", expanded ? "收起 ▲" : `更多 ▾ ${tags.length - MAX_SHOWN - 1}`);
        more.onclick = () => { expanded = !expanded; renderChips(); };
        box.appendChild(more);
      }
    };
    renderChips();
    galleryState.list = items;
    renderGallery();
  }
  function renderGallery() {
    const grid = $("#gallery-grid");
    grid.textContent = "";
    const list = galleryState.tag === "全部"
      ? galleryState.list
      : galleryState.list.filter((g) => g.tags.includes(galleryState.tag));
    $("#gallery-empty").hidden = list.length > 0;
    const frag = document.createDocumentFragment();
    for (const g of list) {
      const card = el("figure", "g-card");
      card.tabIndex = 0;
      const img = el("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = g.file;
      img.alt = g.title;
      card.appendChild(img);
      const cap = el("figcaption", "g-cap");
      cap.appendChild(el("h3", null, g.title));
      const tbox = el("div", "tags");
      for (const t of g.tags.slice(0, 5)) tbox.appendChild(el("span", null, t));
      cap.appendChild(tbox);
      card.appendChild(cap);
      card.onclick = () => openLightbox(galleryState.tag === "全部" ? galleryState.list : list, list.indexOf(g));
      card.onkeydown = (e) => { if (e.key === "Enter") card.click(); };
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  }

  /* ---------------- 灯箱 ---------------- */
  const lb = { list: [], i: 0 };
  function openLightbox(list, i) {
    lb.list = list; lb.i = i;
    $("#lightbox").hidden = false;
    document.body.style.overflow = "hidden";
    paintLightbox();
  }
  function paintLightbox() {
    const g = lb.list[lb.i];
    if (!g) return;
    $("#lb-img").src = g.file;
    $("#lb-img").alt = g.title;
    $("#lb-title").textContent = g.title;
    const tbox = $("#lb-tags");
    tbox.textContent = "";
    for (const t of g.tags) tbox.appendChild(el("span", null, t));
    $("#lb-counter").textContent = `${lb.i + 1} / ${lb.list.length}`;
  }
  function closeLightbox() {
    $("#lightbox").hidden = true;
    document.body.style.overflow = "";
  }
  function lbMove(d) {
    lb.i = (lb.i + d + lb.list.length) % lb.list.length;
    paintLightbox();
  }

  /* ---------------- 推荐区 ---------------- */
  const recState = {
    filter: "全部",
    user: loadLS(LS_USER) || [],
    removed: loadLS(LS_REMOVED) || [],
    notes: loadLS(LS_NOTES) || {},
    live: {}, // id -> 实时数据
  };
  function yearOf(r) { return parseInt(String(r.date || "").slice(0, 4)) || 0; }
  function isNew(r) { return yearOf(r) >= 2020; }
  function titleOf(r) { return r.name_cn || r.name || "未命名"; }

  function mergedRecs() {
    const seeds = window.SEED_RECS
      .filter((s) => !recState.removed.includes(s.id))
      .map((s) => ({ ...s, ...(recState.live[s.id] || {}), seed: true }));
    const users = recState.user.map((u) => ({ ...u, seed: false }));
    return seeds.concat(users).filter((r) =>
      recState.filter === "全部" || (recState.filter === "新番" ? isNew(r) : !isNew(r))
    );
  }

  function initRecs() {
    $("#stat-recs").textContent = window.SEED_RECS.length;
    const box = $("#rec-filters");
    for (const t of ["全部", "新番", "老番"]) {
      const c = el("button", "chip" + (t === "全部" ? " active" : ""), t);
      c.onclick = () => {
        box.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
        c.classList.add("active");
        recState.filter = t;
        renderRecs();
      };
      box.appendChild(c);
    }
    renderRecs();
    refreshLive();
  }

  function recCard(r) {
    const card = el("article", "rec-card");
    // cover
    const cover = el("div", "rec-cover");
    const img = el("img");
    img.loading = "lazy"; img.decoding = "async"; img.alt = titleOf(r);
    if (r.cover) {
      img.src = r.cover;
      img.onerror = () => { img.remove(); cover.appendChild(el("div", "cover-fallback", titleOf(r).slice(0, 1))); };
    } else {
      cover.appendChild(el("div", "cover-fallback", titleOf(r).slice(0, 1)));
    }
    cover.appendChild(img);
    const badges = el("div", "badges");
    badges.appendChild(el("span", "badge " + (isNew(r) ? "new" : "old"), isNew(r) ? "新番" : "老番"));
    if (r.platform) badges.appendChild(el("span", "badge", r.platform));
    if (r.score != null) badges.appendChild(el("span", "badge score", "★ " + r.score));
    cover.appendChild(badges);
    const rm = el("button", "rm-btn", "✕");
    rm.title = "从推荐移除";
    rm.onclick = () => {
      if (r.seed) {
        recState.removed.push(r.id);
        saveLS(LS_REMOVED, recState.removed);
      } else {
        recState.user = recState.user.filter((u) => u.id !== r.id);
        saveLS(LS_USER, recState.user);
      }
      renderRecs();
      toast("已移除:" + titleOf(r));
    };
    cover.appendChild(rm);
    card.appendChild(cover);

    // body
    const body = el("div", "rec-body");
    const t = el("div", "t");
    t.appendChild(document.createTextNode(titleOf(r)));
    if (r.name && r.name !== r.name_cn) t.appendChild(el("span", "jp", r.name));
    body.appendChild(t);

    const meta = el("div", "rec-meta");
    if (r.date) meta.appendChild(el("span", null, "📅 " + r.date));
    if (r.rank) meta.appendChild(el("span", "rank", "BGM 排名 #" + r.rank));
    body.appendChild(meta);

    if (r.tags && r.tags.length) {
      const tbox = el("div", "rec-tags");
      for (const tag of r.tags.slice(0, 3)) tbox.appendChild(el("span", null, tag));
      if (r.tags.length > 3) tbox.appendChild(el("span", null, `+${r.tags.length - 3}`));
      body.appendChild(tbox);
    }
    if (r.summary) body.appendChild(el("p", "rec-summary", r.summary));
    if (!r.seed) {
      const nb = el("div", "rec-user-badge", "你添加的推荐");
      body.appendChild(nb);
    }

    // note area
    const noteWrap = el("div");
    noteWrap.hidden = true;
    const note = el("textarea", "rec-note");
    note.placeholder = "写两句安利理由吧…(仅保存在本机浏览器)";
    note.value = recState.notes[r.id] || "";
    const saveNote = () => {
      const v = note.value.trim();
      if (v) recState.notes[r.id] = v; else delete recState.notes[r.id];
      saveLS(LS_NOTES, recState.notes);
      toast("感想已保存 ✨");
    };
    note.onblur = saveNote;
    noteWrap.appendChild(note);
    body.appendChild(noteWrap);

    // footer
    const foot = el("div", "rec-foot");
    const link = el("a", "bgm-link", "↗ 在 Bangumi 查看");
    link.href = "https://bgm.tv/subject/" + r.id;
    link.target = "_blank";
    link.rel = "noopener";
    foot.appendChild(link);
    const nbBtn = el("button", "note-btn", "💭 写感想");
    nbBtn.onclick = () => {
      noteWrap.hidden = !noteWrap.hidden;
      nbBtn.classList.toggle("on", !noteWrap.hidden);
      if (!noteWrap.hidden) note.focus();
    };
    foot.appendChild(nbBtn);
    body.appendChild(foot);
    card.appendChild(body);
    return card;
  }

  function renderRecs() {
    const grid = $("#rec-grid");
    grid.textContent = "";
    const list = mergedRecs();
    const frag = document.createDocumentFragment();
    for (const r of list) frag.appendChild(recCard(r));
    grid.appendChild(frag);
    $("#stat-recs").textContent = window.SEED_RECS.length + recState.user.length;
  }

  /* 实时刷新种子数据(评分/排名等),失败则保留内置快照 */
  async function refreshLive() {
    const status = $("#live-status");
    status.textContent = "○ 连接中…";
    status.className = "live-status";
    const cached = loadLS(LS_CACHE) || {};
    const ids = window.SEED_RECS.map((s) => s.id);
    let ok = 0, fail = 0;
    const jobs = ids.map(async (id) => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 9000);
        const res = await fetch(`${API}/subjects/${id}`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(String(res.status));
        const d = await res.json();
        const patch = {
          name_cn: d.name_cn || d.name,
          date: d.date,
          score: (d.rating || {}).score,
          rank: (d.rating || {}).rank,
          cover: (d.images || {}).large || "",
          summary: d.summary || "",
          tags: (d.tags || []).slice(0, 5).map((x) => x.name),
        };
        recState.live[id] = patch;
        cached[id] = { ...patch, ts: Date.now() };
        ok++;
      } catch {
        // 有快照则复用快照
        if (cached[id]) recState.live[id] = cached[id];
        fail++;
      }
    });
    await Promise.all(jobs);
    saveLS(LS_CACHE, cached);
    if (ok > 0 && fail === 0) { status.textContent = "● 已连接 Bangumi · 实时数据"; status.className = "live-status on"; }
    else if (ok > 0) { status.textContent = "● 部分离线 · 混合快照"; status.className = "live-status off"; }
    else { status.textContent = "○ 离线模式 · 使用内置快照"; status.className = "live-status off"; }
    renderRecs();
  }

  /* 搜索添加 */
  async function doSearch() {
    const input = $("#rec-search");
    const kw = input.value.trim();
    const panel = $("#search-results");
    if (!kw) { panel.hidden = true; return; }
    const btn = $("#rec-search-btn");
    btn.disabled = true;
    btn.textContent = "搜索中…";
    panel.hidden = false;
    panel.textContent = "";
    panel.appendChild(el("p", "sr-hint", "正在向 Bangumi 查询…"));
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`${API}/search/subjects?limit=8`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw, filter: { type: [2] } }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const d = await res.json();
      panel.textContent = "";
      const list = (d.data || []).filter((s) => s.type === 2);
      if (!list.length) {
        panel.appendChild(el("p", "sr-hint", "没有找到相关动画,换个关键词试试?"));
        return;
      }
      for (const s of list) {
        const row = el("div", "sr-row");
        const thumb = el("img");
        if (s.images && s.images.grid) thumb.src = s.images.grid;
        else thumb.alt = s.name;
        row.appendChild(thumb);
        const info = el("div", "sr-info");
        info.appendChild(el("div", "t", s.name_cn || s.name));
        const metaBits = [s.date, s.platform].filter(Boolean).join(" · ");
        if (metaBits) info.appendChild(el("div", "m", metaBits));
        row.appendChild(info);
        if (s.score != null) row.appendChild(el("span", "sr-score", "★ " + s.score));
        const add = el("button", "btn btn-primary btn-sm", "＋ 加入推荐");
        add.onclick = () => {
          const item = {
            id: s.id,
            name: s.name,
            name_cn: s.name_cn || s.name,
            date: s.date || "",
            score: s.score,
            rank: s.rank,
            platform: s.platform,
            cover: (s.images || {}).large || "",
            summary: s.summary || "",
            tags: [],
            addedAt: Date.now(),
          };
          if (recState.user.some((u) => u.id === s.id)) { toast("已经在推荐清单里啦"); return; }
          recState.user.push(item);
          saveLS(LS_USER, recState.user);
          renderRecs();
          toast("已加入推荐:" + titleOf(item) + " ✨");
        };
        row.appendChild(add);
        panel.appendChild(row);
      }
    } catch (e) {
      panel.textContent = "";
      panel.appendChild(el("p", "sr-hint", "无法连接 Bangumi API(需能访问 bgm.tv 的网络/代理)。离线时仍可浏览内置推荐。"));
      console.warn("search failed", e);
    } finally {
      btn.disabled = false;
      btn.textContent = "搜索";
    }
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindEvents() {
    $("#lb-close").onclick = closeLightbox;
    $("#lb-prev").onclick = () => lbMove(-1);
    $("#lb-next").onclick = () => lbMove(1);
    $("#lightbox").onclick = (e) => { if (e.target.id === "lightbox") closeLightbox(); };
    document.addEventListener("keydown", (e) => {
      if ($("#lightbox").hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") lbMove(-1);
      else if (e.key === "ArrowRight") lbMove(1);
    });
    $("#rec-search-btn").onclick = doSearch;
    $("#rec-search").addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
    $("#rec-search").addEventListener("input", (e) => { if (!e.target.value.trim()) $("#search-results").hidden = true; });
  }

  initPetals();
  initGallery();
  initRecs();
  bindEvents();
})();
