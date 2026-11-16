(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
  const clock = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const mins = html => Math.max(1, Math.round(html.replace(/<[^>]+>/g, ' ').split(/\s+/).length / 220));
  const byDate = (a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0);
  const shapes = ['circle', 'square', 'tri', 'half'];
  const shapeFor = (s, i) => shapes[(s.length + i) % 4];
  const inl = x => x.replace(/!\[([^\]]*)\]\(img:([\w-]+)\)/g, (m, alt, id) => `<img src="${imgUrl(id)}" alt="${alt}" data-id="${id}" loading="lazy">`).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  const md = t => esc(t).split(/\n{2,}/).map(b => { b = b.trim(); if (!b) return '';
    if (b.startsWith('## ')) return `<h2>${inl(b.slice(3))}</h2>`;
    if (b.startsWith('&gt; ')) return `<blockquote>${inl(b.slice(5))}</blockquote>`;
    if (/^!\[[^\]]*\]\(img:[\w-]+\)$/.test(b)) return `<figure>${inl(b)}</figure>`;
    return `<p>${inl(b)}</p>`; }).join('');
  const body = p => p.body || md(p.md || '');
  let accent = '', baseAccent = '', previewPalette = null;
  const palette = () => previewPalette || store.settings.palette || {};
  const PRESETS = ['#7fb2ff', '#9fd0ff', '#b8a4ff', '#ffb3d1', '#ffc9a3', '#ffe08a', '#a6f0c6'];
  const okHex = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c.toLowerCase() : '';
  const isDark = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function setAccent(hex) {
    const pal = palette(), st = document.documentElement.style, dk = isDark(), own = okHex(hex), main = own || okHex(pal.main);
    const keys = ['--blue', '--blue2', '--sun', '--link', '--glow', '--glow-sun', '--on-blue'], bg = okHex(dk ? pal.bgDark : pal.bgLight);
    if (bg) st.setProperty('--paper', bg); else st.removeProperty('--paper');
    accent = own; if (!main) return keys.forEach(k => st.removeProperty(k));
    const [r, g, b] = rgbOf(main), R = r / 255, G = g / 255, B = b / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn, l = (mx + mn) / 2; let h = 0, s = 0;
    if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h *= 60; }
    const S = Math.max(45, Math.min(s * 100, 95)), L = l * 100, lite = `hsl(${h} ${S}% ${Math.min(L + 14, 90)}%`;
    st.setProperty('--blue', main); st.setProperty('--blue2', lite + ')'); st.setProperty('--sun', `hsl(${h} ${Math.min(S, 85)}% ${dk ? 82 : 92}%)`);
    st.setProperty('--link', `hsl(${h} ${S}% ${dk ? 78 : 40}%)`); st.setProperty('--glow', `rgb(${r} ${g} ${b} / ${dk ? .42 : .5})`); st.setProperty('--glow-sun', lite + ' / .6)');
    st.setProperty('--on-blue', (.299 * r + .587 * g + .114 * b) > 150 ? '#14142b' : '#ffffff');
    if (!own) { const sec = okHex(pal.second), hi = okHex(pal.highlight);
      if (sec) { st.setProperty('--blue2', sec); st.setProperty('--glow-sun', `rgb(${rgbOf(sec).join(' ')} / .6)`); } if (hi) st.setProperty('--sun', hi); }
  }
  const colorOf = t => okHex((store.settings.tagColors || {})[t]);
  const accentOf = x => { const own = okHex(x.accent); if (own) return own; const t = allTags().find(t => tagsOf(x).includes(t) && colorOf(t)); return t ? colorOf(t) : ''; };
  const acStyle = x => { const c = accentOf(x); return c ? ` style="--ac:${c}"` : ''; };
  const colorPick = (label, tag, presets = PRESETS, key) => `<div class="colorpick"${tag ? ` data-tag="${esc(tag)}"` : ''}${key ? ` data-key="${key}"` : ''}>${label ? `<span class="lbl">${label}</span>` : ''}<div class="swatches">
    ${presets.map(c => `<button type="button" class="sw" data-c="${c}" style="--sw:${c}" aria-label="Colour ${c}" aria-pressed="false"></button>`).join('')}
    <button type="button" class="sw none" data-c="" aria-label="No colour, use the default" aria-pressed="true"></button>
    <label class="sw custom" aria-label="Pick any colour"><input type="color" value="#7fb2ff"></label></div><input type="hidden" name="accent"></div>`;
  function bindColorPick(cp, onchange) {
    const hid = $('input[type=hidden]', cp), cin = $('input[type=color]', cp), custom = $('.custom', cp);
    const set = (hex, fire) => { hex = okHex(hex); hid.value = hex; cp.querySelectorAll('.sw[data-c]').forEach(s => s.setAttribute('aria-pressed', s.dataset.c === hex));
      custom.classList.toggle('on', !!hex && ![...cp.querySelectorAll('.sw[data-c]')].some(s => s.dataset.c === hex)); if (hex) cin.value = hex; if (fire && onchange) onchange(hex); };
    cp.addEventListener('click', e => { const s = e.target.closest('.sw[data-c]'); if (s) set(s.dataset.c, true); });
    cin.addEventListener('change', () => set(cin.value, true));
    return hex => set(hex, false);
  }
  const imgUrls = {};
  const imgUrl = id => (store.mode === 'cloud' ? '/_blob/' + id : imgUrls[id]) || '';
  const imgIds = p => [...(p.md || '').matchAll(/\(img:([\w-]+)\)/g)].map(m => m[1]).concat(p.coverId ? [p.coverId] : []);
  const excerptOf = t => { const s = t.replace(/!\[[^\]]*\]\(img:[\w-]+\)/g, '').replace(/^(## |> )/gm, '').replace(/[*]/g, '').replace(/\s+/g, ' ').trim(); return s.slice(0, 150) + (s.length > 150 ? '...' : ''); };
  const ext = v => v.extId || v.id;
  const htmlToMd = html => { const d = new DOMParser().parseFromString(html, 'text/html');
    const inn = n => [...n.childNodes].map(c => c.nodeType === 3 ? c.textContent : /^(STRONG|B)$/.test(c.nodeName) ? `**${inn(c)}**` : /^(EM|I)$/.test(c.nodeName) ? `*${inn(c)}*` : c.nodeName === 'BR' ? '\n' : inn(c)).join('');
    return [...d.body.children].map(n => n.nodeName === 'H2' ? '## ' + inn(n) : n.nodeName === 'BLOCKQUOTE' ? '> ' + inn(n) : inn(n)).join('\n\n'); };
  function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); } t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 4500); }
  function armed(btn, run, label = 'Confirm delete') { btn.onclick = () => { if (btn.classList.contains('danger')) { clearTimeout(btn._t); return run(); } const old = btn.textContent; btn.textContent = label; btn.classList.add('danger'); btn._t = setTimeout(() => { btn.textContent = old; btn.classList.remove('danger'); }, 4000); }; }
  const tagsOf = x => Array.isArray(x.tags) ? x.tags : (x.tag ? [x.tag] : []);
  const today = () => new Date().toLocaleDateString('en-CA');

  /* ---------------- storage: owner-only writes ---------------- */
  const store = { mode: 'local', canWrite: true, posts: [], edits: [], vposts: [], vedits: [], settings: { hidden: [], tags: [], removed: [], order: [], tagColors: {}, postOrder: [], editOrder: [], text: {} } };
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('ripsulli', 1); r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'key' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('items', mode); const q = fn(t.objectStore('items')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  let cloud = {};
  const blobU = id => id ? '/_blob/' + id : '';
  const mapPost = d => ({ ...d.data(), slug: d.id });
  const mapEdit = d => { const x = d.data(); return { ...x, id: d.id, platform: x.videoId ? 'file' : x.platform, src: x.videoId ? blobU(x.videoId) : x.src, thumb: x.thumbId ? blobU(x.thumbId) : x.thumb }; };
  async function loadLocal() {
    try {
      const rows = (await tx('readonly', s => s.getAll())) || [];
      const P = rows.filter(r => r.kind === 'post').map(r => r.data);
      rows.filter(r => r.kind === 'img').forEach(r => { imgUrls[r.key.slice(4)] = URL.createObjectURL(r.blob); });
      const E = rows.filter(r => r.kind === 'edit').map(r => r.video ? { ...r.data, platform: 'file', src: URL.createObjectURL(r.video), thumb: r.thumb ? URL.createObjectURL(r.thumb) : '' } : { ...r.data });
      store.posts = P.filter(p => !p.private); store.vposts = P.filter(p => p.private);
      store.edits = E.filter(p => !p.private); store.vedits = E.filter(p => p.private);
      const m = rows.find(r => r.key === 'meta'); store.settings = { hidden: [], tags: [], removed: [], order: [], tagColors: {}, postOrder: [], editOrder: [], text: {}, ...(m && m.data) };
    } catch (e) { store.canWrite = false; }
  }
  const timeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
  async function initCloud() {
    if (!window.claude || !claude.use) return false;
    const [db, user, assets] = await Promise.all(['db', 'user', 'assets'].map(n => timeout(claude.use(n).catch(() => null), 5000)));
    if (!db) return false;
    cloud = { db, assets }; store.mode = 'cloud';
    store.canWrite = !!(user && await user.isOwner());
    const sub = (name, key, map) => db.collection(name).onSnapshot(s => { store[key] = s.docs.map(map); refresh(); }, () => {});
    sub('posts', 'posts', mapPost); sub('edits', 'edits', mapEdit);
    db.collection('settings').doc('site').onSnapshot(d => { store.settings = { hidden: [], tags: [], removed: [], order: [], tagColors: {}, postOrder: [], editOrder: [], text: {}, ...(d.data() || {}) }; refresh(); }, () => {});
    if (store.canWrite) { sub('vault_posts', 'vposts', mapPost); sub('vault_edits', 'vedits', mapEdit); }
    return true;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const col = (kind, priv) => cloud.db.collection((priv ? 'vault_' : '') + (kind === 'post' ? 'posts' : 'edits'));
  async function saveSettings(patch) {
    store.settings = { ...store.settings, ...patch };
    if (store.mode === 'cloud') return cloud.db.collection('settings').doc('site').set(store.settings);
    await tx('readwrite', s => s.put({ key: 'meta', data: store.settings }));
  }
  async function savePost(p, priv) {
    if (store.mode === 'cloud') return col('post', priv).doc(p.slug).set(p);
    await tx('readwrite', s => s.put({ key: 'post:' + p.slug, kind: 'post', data: { ...p, private: !!priv } })); await loadLocal();
  }
  async function saveEdit(meta, video, thumb, priv) {
    if (store.mode === 'cloud') {
      const v = video ? await cloud.assets.upload(video) : null, t = thumb ? await cloud.assets.upload(thumb) : null;
      return col('edit', priv).doc(meta.id).set({ ...meta, videoId: v ? v.id : '', thumbId: t ? t.id : '' });
    }
    await tx('readwrite', s => s.put({ key: 'edit:' + meta.id, kind: 'edit', data: { ...meta, private: !!priv }, video, thumb })); await loadLocal();
  }
  async function setPrivate(kind, id, priv) {
    if (store.mode === 'cloud') { const from = col(kind, !priv).doc(id), d = await from.get(); await col(kind, priv).doc(id).set(d.data()); return from.delete(); }
    const row = await tx('readonly', s => s.get(kind + ':' + id));
    await tx('readwrite', s => s.put({ ...row, data: { ...row.data, private: priv } })); await loadLocal();
  }
  const fitImage = (file, square) => new Promise(async (res, rej) => {
    if (/gif|svg/.test(file.type) && !square) return res(file);
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }), W = bmp.width, H = bmp.height;
      const side = Math.min(W, H), sw = square ? side : W, sh = square ? side : H, sx = square ? (W - side) / 2 : 0, sy = square ? (H - side) / 2 : 0;
      const k = Math.min(1, (square ? 800 : 1600) / sw), c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
      c.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
      c.toBlob(b => b ? res(b) : rej(new Error('Could not read that image')), file.type === 'image/png' ? 'image/png' : 'image/jpeg', .86);
    } catch (e) { rej(new Error('Could not read that image')); }
  });
  async function putImage(file, square) {
    const blob = await fitImage(file, square);
    if (store.mode === 'cloud') return (await cloud.assets.upload(blob)).id;
    const id = 'i-' + uid(); await tx('readwrite', s => s.put({ key: 'img:' + id, kind: 'img', blob })); imgUrls[id] = URL.createObjectURL(blob); return id;
  }
  async function putFile(file) {
    if (store.mode === 'cloud') return (await cloud.assets.upload(file)).id;
    const id = 'i-' + uid(); await tx('readwrite', s => s.put({ key: 'img:' + id, kind: 'img', blob: file })); imgUrls[id] = URL.createObjectURL(file); return id;
  }
  async function deleteImages(ids) {
    for (const id of ids) try { if (store.mode === 'cloud') await cloud.assets.delete(id); else { await tx('readwrite', s => s.delete('img:' + id)); delete imgUrls[id]; } } catch (e) {}
  }
  async function removeItem(kind, id, priv, builtin) {
    if (builtin) return saveSettings({ hidden: [...store.settings.hidden, id] });
    const list = kind === 'post' ? (priv ? store.vposts : store.posts) : (priv ? store.vedits : store.edits);
    const it = list.find(x => (kind === 'post' ? x.slug : x.id) === id) || {};
    const gone = kind === 'post' ? imgIds(it) : (store.mode === 'cloud' ? [it.videoId, it.thumbId].filter(Boolean) : []);
    if (store.mode === 'cloud') await col(kind, priv).doc(id).delete(); else { await tx('readwrite', s => s.delete(kind + ':' + id)); await loadLocal(); }
    await deleteImages(gone);
  }
  /* copy a built-in sample into your own content so it can be edited, made private or deleted */
  async function adopt(kind, id) {
    const now = Date.now();
    if (kind === 'post') {
      const p = POSTS.find(x => x.slug === id), item = { slug: p.slug, title: p.title, tags: tagsOf(p), excerpt: p.excerpt, md: htmlToMd(p.body || ''), date: p.date, created: now };
      await savePost(item, false); if (store.mode === 'cloud') store.posts = [...store.posts, item];
      await saveSettings({ hidden: [...store.settings.hidden, id] }); return item.slug;
    }
    const e = EDITS.find(x => (x.id || x.src) === id), nid = 'e-' + uid();
    const meta = { id: nid, title: e.title, tags: tagsOf(e), desc: e.desc || '', duration: e.duration || '', date: e.date, created: now, platform: e.platform, extId: e.platform === 'file' ? '' : e.id, src: e.src || '', thumb: e.thumb || '' };
    await saveEdit(meta, null, null, false); if (store.mode === 'cloud') store.edits = [...store.edits, { ...meta }];
    await saveSettings({ hidden: [...store.settings.hidden, id] }); return nid;
  }
  async function updateItem(kind, id, priv, fields) {
    if (store.mode === 'cloud') return col(kind, priv).doc(id).update(fields);
    const row = await tx('readonly', s => s.get(kind + ':' + id));
    await tx('readwrite', s => s.put({ ...row, data: { ...row.data, ...fields } })); await loadLocal();
  }
  const hid = id => store.settings.hidden.includes(id);
  const rm = x => ({ ...x, tags: tagsOf(x).filter(t => !(store.settings.removed || []).includes(t)) });
  const posts = () => [...POSTS.filter(p => !hid(p.slug)), ...store.posts.filter(vis).map(p => ({ ...p, mine: true, scheduled: pend(p) })), ...(store.canWrite ? store.vposts.map(p => ({ ...p, mine: true, private: true, scheduled: pend(p) })) : [])].map(rm).sort(byDate);
  const edits = () => [...EDITS.filter(e => !hid(e.id || e.src)), ...store.edits.filter(vis).map(e => ({ ...e, mine: true, scheduled: pend(e) })), ...(store.canWrite ? store.vedits.map(e => ({ ...e, mine: true, private: true, scheduled: pend(e) })) : [])].map(rm).sort(byDate);
  const whenMs = (d, t) => { const ms = new Date(`${d}T${t || '00:00'}`).getTime(); return isNaN(ms) ? Date.now() : ms; };
  const fmtWhen = ms => new Date(ms).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const pend = x => !!x.publishAt && x.publishAt > Date.now();
  const vis = x => store.canWrite || !pend(x);
  const idOf = x => x.slug || x.id || x.src;
  const manual = (list, order) => { const at = x => (order || []).indexOf(idOf(x)); return [...list].sort((p, q) => { const i = at(p), j = at(q); return i < 0 && j < 0 ? byDate(p, q) : i < 0 ? -1 : j < 0 ? 1 : i - j; }); };
  const postsOrdered = () => manual(posts(), store.settings.postOrder), editsOrdered = () => manual(edits(), store.settings.editOrder);
  const allTags = () => { const o = store.settings.order || [], at = x => { const i = o.indexOf(x); return i < 0 ? 1e6 : i; };
    return [...new Set([...posts(), ...edits()].flatMap(tagsOf).concat(store.settings.tags))].filter(Boolean).sort((x, y) => at(x) - at(y) || x.localeCompare(y)); };
  const thumb = v => v.thumb || (v.platform === 'youtube' ? `https://i.ytimg.com/vi/${ext(v)}/hqdefault.jpg` : '');
  function isOwnerView() { if (!store.canWrite) return false; if (store.mode === 'cloud') return true; try { return localStorage.getItem('studio') === '1'; } catch (e) { return false; } }
  function applyChrome() {
    const set = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt; };
    $('.logo').innerHTML = esc(T('name')) + '<i>.</i>';
    [['about', 'nav_about'], ['writing', 'nav_articles'], ['edits', 'nav_edits'], ['contact', 'nav_contact']].forEach(([id, k]) => set(`[data-nav=${id}]`, T(k)));
    set('#foot-copy', T('footer_copy') || `© ${new Date().getFullYear()} ${T('name')}`); set('#foot-note', T('footer_note'));
  }
  function syncNav() { $('[data-nav=create]').hidden = !isOwnerView(); applyChrome(); }

  /* ---------------- templates ---------------- */
  const postItem = (p, i) => `
    <a class="post" href="#post-${esc(p.slug)}" data-tags="${esc(tagsOf(p).join('|'))}"${acStyle(p)}>
      ${p.coverId ? `<img class="cover" src="${esc(imgUrl(p.coverId))}" alt="" loading="lazy">` : `<span class="shape ${shapeFor(p.slug, i)}" aria-hidden="true"></span>`}
      <span class="post-body"><span class="meta">${fmt(p.date)} ${tagsOf(p).map(t => `<b>${esc(t)}</b>`).join('')}${p.private ? '<i class="lock">Private</i>' : ''}${p.scheduled ? '<i class="lock sched-b">Scheduled</i>' : ''}</span>
        <h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><span class="cta">${esc(T('articles_cta'))}</span></span>
    </a>`;
  const editCard = v => `
    <button class="vid" data-id="${esc(v.id || v.src)}" data-tags="${esc(tagsOf(v).join('|'))}"${acStyle(v)} aria-label="Play ${esc(v.title)}">
      <span class="thumb">${thumb(v) ? `<img src="${esc(thumb(v))}" alt="" loading="lazy">` : ''}
        <span class="play" aria-hidden="true"></span><span class="dur">${esc(v.duration || '')}</span></span>
      <span class="meta">${fmt(v.date)} ${tagsOf(v).map(t => `<b>${esc(t)}</b>`).join('')}${v.private ? '<i class="lock">Private</i>' : ''}${v.scheduled ? '<i class="lock sched-b">Scheduled</i>' : ''}</span><h3>${esc(v.title)}</h3>${v.desc ? `<span class="vdesc">${esc(v.desc)}</span>` : ''}
    </button>`;
  const chips = list => `<div class="chips" role="group" aria-label="Filter by topic"><button class="chip" aria-pressed="true" data-all>All</button>${allTags().filter(t => list.some(x => tagsOf(x).includes(t))).map(t => `<button class="chip" aria-pressed="false" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}<button class="chip mode" data-mode hidden>Match: any</button></div>`;

  const LIMIT = 6;
  const S = { aboutOpen: false, post: { sel: new Set(), all: false, q: '', open: false }, edit: { sel: new Set(), all: false, q: '', open: false }, g: '' };
  const topicOrder = [];
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  const searchText = x => [x.title, x.excerpt, x.desc, tagsOf(x).join(' '), x.md || (x.body ? x.body.replace(/<[^>]+>/g, ' ') : '')].filter(Boolean).join(' ').toLowerCase();
  const contactData = () => ({ email: T('email_addr'), links: T('contact_links').split('\n').map(s => s.trim()).filter(Boolean).map(s => { const i = s.indexOf(','); return i < 0 ? null : { name: s.slice(0, i).trim(), url: s.slice(i + 1).trim() }; }).filter(l => l && l.name) });
  /* ---------------- homepage text: defaults, overrides, and the map shown in the Create tab ---------------- */
  const DEF = {
    name: SITE.name, nav_about: 'About', nav_articles: 'Articles', nav_edits: 'Edits', nav_contact: 'Contact',
    status: SITE.status, tagline: SITE.tagline, intro: SITE.intro, btn_work: 'View my work', btn_about: 'More about me', hero_b1_label: 'TikTok', hero_b1_url: 'https://tiktok.com/', hero_b2_label: 'Instagram', hero_b2_url: 'https://instagram.com/', btn_email: 'Email', search_ph: 'Search all articles and edits',
    stat1_value: '', stat1_label: 'articles and reviews', stat2_value: '', stat2_label: 'edits, all cut for 9:16', stat3_value: '', stat3_label: 'topics to browse', stat4_value: '', stat4_label: 'latest article or edit',
    about_eyebrow: '// about', about_title: SITE.aboutTitle, about_md: htmlToMd(SITE.about || ''), about_caption: SITE.author && SITE.author !== SITE.name ? SITE.author : '', badge: SITE.badge,
    focus: (SITE.focus || []).map(f => `${f.title}: ${f.text}`).join('\n'),
    latest_eyebrow: '// latest', latest_title: 'Fresh from both sides', latest_articles: 'Articles', latest_articles_link: 'Jump to articles', latest_edits: 'Edits', latest_edits_link: 'Jump to edits',
    articles_eyebrow: '// articles', articles_title: 'Selected articles', articles_search: 'Search articles', articles_cta: 'Read article',
    edits_eyebrow: '// edits', edits_title: 'Selected edits', edits_search: 'Search edits',
    contact_eyebrow: '// contact', contact_title: 'Get in touch', contact_card_title: 'Let’s talk', contact_note: SITE.contactNote || 'Get in touch.',
    contact_name_label: 'Name', contact_email_label: 'Your email', contact_msg_label: 'Message', contact_send: 'Write the email',
    email_addr: SITE.email || '', contact_links: (SITE.socials || []).map(l => `${l.name}, ${l.url}`).join('\n'),
    footer_copy: '', footer_note: 'Made by hand with HTML, CSS and JavaScript.'
  };
  const LEG = { status: 'status', tagline: 'tagline', about_title: 'aboutTitle', about_md: 'aboutMd', badge: 'badge' };
  const T = k => { const t = store.settings.text || {}; if (t[k] != null) return t[k]; const lp = store.settings.profile || {};
    if (LEG[k] && lp[LEG[k]] != null) return lp[LEG[k]]; if (k === 'focus' && lp.focus && lp.focus.length) return lp.focus.map(f => `${f.title}: ${f.text}`).join('\n'); const cc = store.settings.contact;
    if (k === 'email_addr' && cc && cc.email != null) return cc.email;
    if (k === 'contact_links' && cc && cc.links) return cc.links.map(l => `${l.name}, ${l.url}`).join('\n');
    return DEF[k] ?? ''; };
  const photoUrl = () => { const id = (store.settings.profile || {}).photoId; return id ? imgUrl(id) : (SITE.photo || ''); };
  const parseFocus = s => s.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf(':'); return i < 0 ? null : { title: x.slice(0, i).trim(), text: x.slice(i + 1).trim() }; }).filter(f => f && f.title);
  const TEXT_GROUPS = [
    ['grp-top', 'Top bar and site name', 'The bar across the top of every page. The site name is also the big heading at the top of the home page.', '#home', [
      ['name', 'Site name', 'Logo at the left of the top bar, and the big heading in the hero'],
      ['nav_about', 'Menu link 1', 'First link in the top bar (jumps to the About section)'], ['nav_articles', 'Menu link 2', 'Second link (jumps to the articles section)'],
      ['nav_edits', 'Menu link 3', 'Third link (jumps to the edits section)'], ['nav_contact', 'Menu link 4', 'Fourth link (jumps to the contact section)']]],
    ['grp-hero', 'Hero', 'The very first screen: small line, your name, a description, an intro paragraph and the buttons (About, TikTok and Instagram).', '#home', [
      ['status', 'Status line', 'Small line above your name'], ['tagline', 'Description', 'One line directly under your name'],
      ['intro', 'Intro paragraph', 'Paragraph under the description', 'area'], ['btn_work', 'Main button', 'The big filled button (jumps to the articles)'],
      ['btn_about', 'About button', 'The outlined button that opens the About section. It stays hidden until a visitor clicks it (or the About link in the top bar)'],
      ['hero_b1_label', 'Social button 1: name', 'Text on the first outlined social button. The icon changes for Instagram and YouTube'], ['hero_b1_url', 'Social button 1: link', 'Where it goes, starting with https://. Clear it to hide the button'],
      ['hero_b2_label', 'Social button 2: name', 'Text on the second outlined social button'], ['hero_b2_url', 'Social button 2: link', 'Where it goes, starting with https://. Clear it to hide the button'],
      ['search_ph', 'Search box hint', 'Grey text inside the search box under the buttons']]],
    ['grp-stats', 'Number cards', 'The four cards under the hero. Leave a number empty to count it automatically.', '#home', [
      ['stat1_value', 'Card 1 number', 'Big number on the first card (empty = how many articles you have)'], ['stat1_label', 'Card 1 caption', 'Small text under it'],
      ['stat2_value', 'Card 2 number', 'Empty = how many edits'], ['stat2_label', 'Card 2 caption', 'Small text under it'],
      ['stat3_value', 'Card 3 number', 'Empty = how many topics'], ['stat3_label', 'Card 3 caption', 'Small text under it'],
      ['stat4_value', 'Card 4 number', 'Empty = the date of your newest article or edit'], ['stat4_label', 'Card 4 caption', 'Small text under it']]],
    ['grp-about', 'About section', 'The portrait, your story and the four small cards.', '#about', [
      ['about_eyebrow', 'Small label', 'Tiny label above the About heading'], ['about_title', 'Heading', 'Big heading of the About section'],
      ['about_md', 'About text', 'The paragraphs next to your photo. A blank line starts a new paragraph. **bold** and *italic* work.', 'area'],
      ['about_caption', 'Caption under photo', 'Small grey line under your name, beneath the photo'], ['badge', 'Badge', 'The little pill with a glowing dot under your photo'],
      ['focus', 'Four small cards', 'One per line as Title: description. They sit under the About text.', 'area']]],
    ['grp-latest', 'Latest preview', 'The two side-by-side panels after About. They always show your newest work.', '#latest', [
      ['latest_eyebrow', 'Small label', 'Tiny label above the heading'], ['latest_title', 'Heading', 'Heading above the two panels'],
      ['latest_articles', 'Left panel title', 'Title of the articles panel'], ['latest_articles_link', 'Left panel link', 'Link in the articles panel'],
      ['latest_edits', 'Right panel title', 'Title of the edits panel'], ['latest_edits_link', 'Right panel link', 'Link in the edits panel']]],
    ['grp-articles', 'Articles section', 'The full list of your articles with search and topics.', '#writing', [
      ['articles_eyebrow', 'Small label', 'Tiny label above the heading'], ['articles_title', 'Heading', 'Big heading of the section'],
      ['articles_search', 'Search box hint', 'Grey text inside this section’s search box'], ['articles_cta', 'Card link', 'Text at the bottom of each article card']]],
    ['grp-edits', 'Edits section', 'The full library of your edits with search and topics.', '#edits', [
      ['edits_eyebrow', 'Small label', 'Tiny label above the heading'], ['edits_title', 'Heading', 'Big heading of the section'], ['edits_search', 'Search box hint', 'Grey text inside this section’s search box']]],
    ['grp-contact', 'Contact section', 'The last section: a heading, a card with your links on the left and a message form on the right. Your email address and social buttons are here too.', '#contact', [
      ['contact_eyebrow', 'Small label', 'Tiny label above the heading'], ['contact_title', 'Section heading', 'Big heading above the card'], ['contact_card_title', 'Card heading', 'Heading at the top left inside the card'],
      ['contact_note', 'Message', 'Sentence under the card heading', 'area'], ['btn_email', 'Email button: name', 'Text on the Email button in the card'],
      ['email_addr', 'Email button: address', 'Where the Email button and the message form send to. Clear it to hide the Email button'],
      ['contact_links', 'Social buttons', 'One per line as Name, link. They sit next to the Email button in the card. (The two social buttons at the top of the page are in the Hero group.)', 'area'], ['contact_name_label', 'Form label 1', 'Label above the first box'], ['contact_email_label', 'Form label 2', 'Label above the second box'],
      ['contact_msg_label', 'Form label 3', 'Label above the big message box'], ['contact_send', 'Send button', 'The filled button under the form. It opens the visitor’s email app with their message ready to send.']]],
    ['grp-footer', 'Footer', 'The line at the very bottom of the page.', '#contact', [
      ['footer_copy', 'Left text', 'Bottom left. Leave empty for an automatic “© year and site name”'], ['footer_note', 'Right text', 'Bottom right']]]
  ];
  const TEXT_KEYS = TEXT_GROUPS.flatMap(g => g[4].map(f => f[0]));
  const buildTextForm = () => `<form class="composer" id="ftext">${TEXT_GROUPS.map(([id, title, desc, href, fields]) => `<fieldset class="tgroup" id="${id}"><legend>${title}</legend>
      <p class="hint">${desc} <a href="${href}">View on page</a></p>
      ${fields.map(([k, label, where, kind]) => `<label class="tf"><span class="lbl">${label}</span><span class="where">${where}</span>${kind === 'area' ? `<textarea class="field" name="${k}" rows="${k === 'about_md' ? 7 : k === 'focus' ? 5 : 3}"></textarea>` : `<input class="field" name="${k}"${k === 'footer_copy' ? ` placeholder="© ${new Date().getFullYear()} ${esc(SITE.name)}"` : ''}>`}</label>`).join('')}
      ${id === 'grp-about' ? `<div class="tf"><span class="lbl">Portrait photo</span><span class="where">The photo to the left of the About text</span><div class="cover-row"><span class="cover-prev"><img alt="" hidden></span><div><label class="chip filebtn">Choose photo<input type="file" accept="image/*" hidden></label> <button type="button" class="chip" data-rmphoto hidden>Remove</button>
        <p class="hint">Portrait works best, about 800 x 1000 px (4:5). It is cropped from the centre, so keep your face in the middle. Without a photo you get soft shapes.</p></div></div></div>` : ''}
      <div class="acts"><button class="btn" type="submit">Save text</button></div></fieldset>`).join('')}
    <p class="small" role="status"></p><div class="acts"><button type="button" class="chip" data-resettext>Reset all text to defaults</button></div></form>`;
  let pendingGroup = null;
  app.addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) { pendingGroup = b.dataset.edit; location.hash = '#create'; } });
  const editChip = (g, label = 'Edit text') => isOwnerView() ? `<button type="button" class="chip edit-text" data-edit="${g}">${label}</button>` : '';
  const eyebrow = (key, g) => `<div class="eyebrow-row"><p class="eyebrow">${esc(T(key))}</p>${editChip(g)}</div>`;
  const sectionHtml = kind => {
    const isP = kind === 'post', list = isP ? postsOrdered() : editsOrdered(), nm = isP ? 'writing' : 'edits', k = isP ? 'articles' : 'edits';
    return `<section class="block sec" id="${nm}" data-kind="${kind}">${eyebrow(k + '_eyebrow', 'grp-' + k)}<h2 class="sec-title">${esc(T(k + '_title'))}</h2>
      <div class="tools">${chips(list)}<input class="sec-search" type="search" placeholder="${esc(T(k + '_search'))}" aria-label="${esc(T(k + '_search'))}" value="${esc(S[kind].q)}"></div>
      <span class="count"></span><div class="list ${isP ? 'posts' : 'grid'}"></div>
      <div class="more"><p class="empty" hidden>Nothing matches. Try a different word or topic.</p><button class="btn ghost" data-more hidden></button></div></section>`;
  };
  const ICON_MAIL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 8l8 6 8-6"/></svg>';
  const ICON_LINK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  const SVG = p => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const iconFor = name => { const n = String(name).toLowerCase();
    return /insta/.test(n) ? SVG('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".7" fill="currentColor"/>')
      : /youtube/.test(n) ? SVG('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>') : ICON_LINK; };
  const heroArt = () => {
    const g = store.settings.graphic || {}, mode = g.mode || 'shapes'; if (mode === 'none') return '';
    const style = `--gb:${+g.blur >= 0 ? Math.min(+g.blur, 16) : 2}px;--gs:${Math.max(100, Math.min(+g.size || 120, 220)) / 100}`;
    if (mode === 'image' && g.imageId) return `<div class="art art-media" style="${style}" aria-hidden="true"><div class="blob"><img src="${esc(imgUrl(g.imageId))}" alt=""></div></div>`;
    if (mode === 'video' && g.videoId) { const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      return `<div class="art art-media" style="${style}" aria-hidden="true"><div class="blob"><video src="${esc(imgUrl(g.videoId))}" muted loop playsinline preload="metadata" ${still ? '' : 'autoplay'}></video></div></div>`; }
    return '<div class="art" aria-hidden="true"><i class="a-circle"></i><i class="a-square"></i><i class="a-tri"></i><i class="a-half"></i></div>';
  };
  const BG_LIGHT = ['#f4f9ff', '#fbf9ff', '#fff7fb', '#f4fff9', '#fffaf0', '#ffffff'], BG_DARK = ['#0b1424', '#15121f', '#1a1018', '#0d1a16', '#1a150d', '#000000'];
  const buildPaletteForm = () => { const g = store.settings.graphic || {};
    const field = (key, label, where, presets) => `<div class="tf"><span class="lbl">${label}</span><span class="where">${where}</span>${colorPick('', '', presets, key)}</div>`;
    return `<form class="composer" id="fpal"><fieldset class="tgroup" id="grp-colors"><legend>Colours and graphic</legend>
      <p class="hint">Colours preview live as you pick. Press Save to keep them. Article, edit and topic accent colours still take over the page while someone is reading or filtering them.</p>
      ${field('main', 'Main colour', 'Buttons, links, the glow, underlines and the big shape in the graphic')}
      ${field('second', 'Second colour', 'The lighter partner colour in gradients and the second button')}
      ${field('highlight', 'Highlight colour', 'Topic pills, the badge and small accents')}
      ${field('bgLight', 'Background, light mode', 'The page background when the site is in light mode', BG_LIGHT)}
      ${field('bgDark', 'Background, dark mode', 'The page background when the site is in dark mode', BG_DARK)}
      <div class="tf"><span class="lbl">Home page graphic</span><span class="where">The artwork at the top right of the home page. Pictures and videos are softened and fill the empty space beside your intro, fading gently into the text, buttons and cards around them. On small screens it sits faintly behind the text.</span>
        <div class="chips" role="group" aria-label="Graphic style">${[['shapes', 'Shapes'], ['image', 'My image'], ['video', 'My video'], ['none', 'None']].map(([m, l]) => `<button type="button" class="chip" data-gmode="${m}" aria-pressed="${(g.mode || 'shapes') === m}">${l}</button>`).join('')}</div>
        <div class="cover-row" data-for="image"><span class="cover-prev"><img alt="" hidden></span><div><label class="chip filebtn">Choose image<input type="file" accept="image/*" hidden></label> <button type="button" class="chip" data-rm hidden>Remove</button>
          <p class="hint">Square or wide, at least 1000 px across. A PNG with a transparent background works well. The edges fade out, so keep the subject toward the middle right.</p></div></div>
        <div class="cover-row" data-for="video"><span class="cover-prev"><video muted loop playsinline hidden></video></span><div><label class="chip filebtn">Choose video<input type="file" accept="video/*" hidden></label> <button type="button" class="chip" data-rm hidden>Remove</button>
          <p class="hint">A short loop works best: 5 to 15 seconds, square or wide, MP4 or WebM, under 20 MB. It plays muted and on repeat. The edges fade out, so keep the subject toward the middle right.</p></div></div>
        <div class="gtune"><label class="tf"><span class="lbl">Softness</span><span class="where">How blurred the picture is. Higher looks dreamier.</span><input class="rng" type="range" name="gblur" min="0" max="12" step="1" value="${g.blur ?? 2}"></label>
          <label class="tf"><span class="lbl">Size</span><span class="where">How big it is. 100% fills the space beside your intro; larger spills softly behind your text and the cards</span><input class="rng" type="range" name="gsize" min="100" max="220" step="5" value="${Math.max(100, g.size ?? 120)}"></label>
          <div class="art-prev" hidden><div class="blob"><img alt="" hidden><video muted loop playsinline hidden></video></div></div></div></div>
      <div class="acts"><button class="btn" type="submit">Save colours and graphic</button><button type="button" class="chip" data-resetpal>Reset to defaults</button></div><p class="small" role="status"></p></fieldset></form>`; };
  const aboutSection = () => { const photo = photoUrl(), focus = parseFocus(T('focus')); return `<section class="block sec" id="about">${eyebrow('about_eyebrow', 'grp-about')}<h2 class="sec-title">${esc(T('about_title') || 'About')}</h2>
          <div class="about-grid"><aside class="portrait"><div class="ph${photo ? '' : ' empty'}">${photo ? `<img src="${esc(photo)}" alt="Portrait of ${esc(T('name'))}">` : ''}</div>
            <div class="who"><b>${esc(T('name'))}</b>${T('about_caption') ? `<small>${esc(T('about_caption'))}</small>` : ''}${T('badge') ? `<span class="badge">${esc(T('badge'))}</span>` : ''}</div></aside>
            <div><div class="about-text">${md(T('about_md'))}</div>${focus.length ? `<div class="focus">${focus.map(f => `<div class="focus-card"><b>${esc(f.title)}</b><span>${esc(f.text)}</span></div>`).join('')}</div>` : ''}</div></div><div class="about-foot"><button type="button" class="chip" data-close-about>Hide about</button></div></section>`; };
  function openAbout() {
    S.aboutOpen = true; const slot = $('#about-slot'); if (slot && !slot.innerHTML.trim()) { slot.innerHTML = aboutSection(); spy(); }
    requestAnimationFrame(() => scrollToSection('about'));
  }
  function closeAbout() { S.aboutOpen = false; const slot = $('#about-slot'); if (slot) slot.innerHTML = ''; spy(); scrollTo({ top: 0 }); }
  function openMail(url, text) {
    if (window.top === window.self) { location.href = url; return; }
    const addr = decodeURIComponent(url.slice(7).split('?')[0]);
    (navigator.clipboard ? navigator.clipboard.writeText(text || addr) : Promise.reject()).then(() => toast(text ? `Message copied. Paste it into an email to ${addr}.` : `Email address copied: ${addr}`), () => toast(`Email address: ${addr}`));
  }
  app.addEventListener('click', e => { const ml = e.target.closest('a[href^="mailto:"]'); if (ml && window.top !== window.self) { e.preventDefault(); openMail(ml.href); }
    if (e.target.closest('[data-more-about]')) openAbout(); if (e.target.closest('[data-close-about]')) closeAbout(); });
  const views = {
    home() {
      const P = posts().filter(x => !x.scheduled), E = edits().filter(x => !x.scheduled), c = contactData(), links = (c.links || []).filter(l => safeUrl(l.url) && l.name), photo = photoUrl(), focus = parseFocus(T('focus'));
      const trio = [['l', E[1]], ['c', E[0]], ['r', E[2]]].filter(x => x[1]).map(([k, v]) => `<div class="slot ${k}">${editCard(v)}</div>`).join('');
      const newest = [...P, ...E].map(x => x.date).sort().pop();
      const liveTags = new Set([...P, ...E].flatMap(tagsOf)), auto = [P.length, E.length, allTags().filter(t => liveTags.has(t) || store.settings.tags.includes(t)).length, newest ? new Date(newest + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '-'];
      const stats = auto.map((v, i) => [T(`stat${i + 1}_value`) || v, T(`stat${i + 1}_label`)]);
      return `<section class="hero" id="top">
        ${heroArt()}
        <div class="eyebrow-row">${T('status') ? `<p class="status">// status: ${esc(T('status'))}</p>` : ''}${editChip('grp-hero')}${editChip('grp-colors', 'Edit colours and graphic')}</div>
        <h1>${esc(T('name'))}</h1>${T('tagline') ? `<p class="sub">${esc(T('tagline'))}</p>` : ''}${T('intro') ? `<p class="lead">${esc(T('intro'))}</p>` : ''}
        <div class="row"><a class="btn" href="#writing">${esc(T('btn_work'))}</a>
          <button type="button" class="btn tone-b" data-more-about>${esc(T('btn_about'))}</button>
          ${[1, 2].map(i => T('hero_b' + i + '_label') && safeUrl(T('hero_b' + i + '_url')) ? `<a class="btn out" href="${esc(safeUrl(T('hero_b' + i + '_url')))}" target="_blank" rel="noopener noreferrer">${iconFor(T('hero_b' + i + '_label'))}${esc(T('hero_b' + i + '_label'))}</a>` : '').join('')}
        </div>
        <p class="hint-keys">Press <kbd>Ctrl</kbd> <kbd>K</kbd> or <kbd>/</kbd> to search everything.</p>
        <div class="gsearch"><input id="gq" type="search" placeholder="${esc(T('search_ph'))}" aria-label="Search everything" value="${esc(S.g)}"></div></section>
        <section class="block" id="gresults" hidden></section>
        ${isOwnerView() ? `<div class="stats-top">${editChip('grp-stats')}</div>` : ''}<div class="stats">${stats.map(([v, l]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
        <div id="about-slot">${S.aboutOpen ? aboutSection() : ''}</div>
        <section class="block lat" id="latest">${eyebrow('latest_eyebrow', 'grp-latest')}<h2 class="sec-title">${esc(T('latest_title'))}</h2>
          <div class="halves">
            <section class="half half-a" aria-labelledby="ha"><div class="head"><h2 id="ha"><span class="mark circle" aria-hidden="true"></span>${esc(T('latest_articles'))}</h2><a href="#writing">${esc(T('latest_articles_link'))}</a></div><div class="posts">${P.slice(0, 3).map(postItem).join('')}</div></section>
            <section class="half half-b" aria-labelledby="hb"><div class="head"><h2 id="hb"><span class="mark square" aria-hidden="true"></span>${esc(T('latest_edits'))}</h2><a href="#edits">${esc(T('latest_edits_link'))}</a></div><div class="grid3">${trio}</div></section>
          </div></section>
        ${sectionHtml('post')}${sectionHtml('edit')}
        <section class="block sec" id="contact">${eyebrow('contact_eyebrow', 'grp-contact')}<h2 class="sec-title">${esc(T('contact_title'))}</h2>
          <div class="contact-card"><div class="contact-left"><h3>${esc(T('contact_card_title'))}</h3>${T('contact_note') ? `<p class="lead sm">${esc(T('contact_note'))}</p>` : ''}
            <div class="row">${links.map(l => `<a class="btn out" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${iconFor(l.name)}${esc(l.name)}</a>`).join('')}${c.email ? `<a class="btn out" href="mailto:${esc(c.email)}">${ICON_MAIL}${esc(T('btn_email'))}</a>` : ''}</div></div>
            <form class="cform" id="cform" novalidate>
              <label><span>${esc(T('contact_name_label'))}</span><input name="name" autocomplete="name" maxlength="80"></label>
              <label><span>${esc(T('contact_email_label'))}</span><input name="email" type="email" autocomplete="email" maxlength="120"></label>
              <label><span>${esc(T('contact_msg_label'))}</span><textarea name="msg" rows="6" maxlength="2000"></textarea></label>
              <button class="btn" type="submit">${esc(T('contact_send'))}</button><p class="small" role="status"></p></form></div></section>`;
    },
    post(slug) {
      const P = postsOrdered(), i = P.findIndex(p => p.slug === slug);
      if (i < 0) return views.notfound();
      const p = P[i], n = P[i + 1], b = body(p);
      return `<article class="block page narrow"><a class="back" href="#writing">Back to articles</a>
        <span class="meta">${fmt(p.date)} ${tagsOf(p).map(t => `<b>${esc(t)}</b>`).join('')}${p.private ? '<i class="lock">Private</i>' : ''}${p.scheduled ? '<i class="lock sched-b">Scheduled</i>' : ''} ${mins(b)} min read</span><h1>${esc(p.title)}</h1><div class="prose">${b}</div>
        ${n ? `<a class="next" href="#post-${esc(n.slug)}"><span>Next</span><strong>${esc(n.title)}</strong></a>` : ''}</article>`;
    },
    create() {
      const note = store.mode === 'cloud' ? 'Only you can see this page. Everything you publish is visible to viewers unless you mark it private.' : 'Saved in this browser only. To publish for everyone, see the README.';
      const tags = allTags();
      const tagPicker = `<div class="tagpick"><span class="lbl">Topics (pick as many as you like)</span><div class="chips">${tags.map(t => `<button type="button" class="chip" aria-pressed="false" data-pick="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <div class="newtag"><input class="field" placeholder="New topic" maxlength="24" aria-label="New topic name"><button type="button" class="chip" data-addtag>Add topic</button></div><input type="hidden" name="tags"></div>`;
      const date = `<div class="when"><label class="datef"><span class="lbl">Publish date</span><input class="field" type="date" name="date" required value="${today()}"></label><label class="datef"><span class="lbl">Publish time</span><input class="field" type="time" name="time" value="00:00"></label></div><p class="hint sched" aria-live="polite"></p>`;
      const priv = '<label class="check"><input type="checkbox" name="priv"> Keep private (only you can see it)</label>';
      const buttons = t => `<div class="acts"><button class="btn" type="submit">${t}</button><button class="btn ghost" type="button" data-cancel hidden>Cancel edit</button></div><p class="small" role="status"></p>`;
      const accentField = colorPick('Accent colour (optional)') + '<p class="hint">The whole page turns this colour when someone opens it. If you leave it empty, the colour of its first topic is used, if that topic has one.</p>';
      const coverPick = `<div class="coverpick"><span class="lbl">Library icon (optional)</span><div class="cover-row"><span class="cover-prev"><img alt="" hidden></span>
        <div><label class="chip filebtn">Choose image<input type="file" accept="image/*" hidden></label> <button type="button" class="chip" data-rmcover hidden>Remove</button>
        <p class="hint">Square works best, at least 600 x 600 px. It is cropped to a square from the centre and shown at about 72 px, so keep the subject in the middle. Leave it empty to use the default shape.</p></div></div></div>`;
      const editor = `<div class="fmt-bar" role="toolbar" aria-label="Formatting">
          <button type="button" class="chip" data-fmt="h2" aria-pressed="false">Heading</button><button type="button" class="chip" data-fmt="bold" aria-pressed="false" aria-label="Bold"><b>B</b></button><button type="button" class="chip" data-fmt="italic" aria-pressed="false" aria-label="Italic"><i>I</i></button>
          <label class="chip filebtn">Add image<input type="file" accept="image/*" hidden id="imgfile"></label><input class="field alt" placeholder="Describe the next image (optional)" maxlength="120" aria-label="Image description"></div>
        <div class="editor prose" id="editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Article text" data-ph="Start writing. Press Enter for a new paragraph. Paste or drag images straight in."></div>
        <p class="hint">Images sit right where you put them, fill the full width of the article and keep their proportions, so nothing is squashed or cropped. Best: 1600 px wide or more, any landscape shape such as 16:9 or 3:2. JPG, PNG, WebP or GIF. Large photos shrink to 1600 px automatically.</p>`;
      const grip = '<button type="button" class="grip" aria-label="Reorder. Drag, or focus and press the up and down arrow keys."><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.8"/><circle cx="15" cy="6" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="18" r="1.8"/><circle cx="15" cy="18" r="1.8"/></svg></button>';
      const topicRows = tags.length ? tags.map(t => `<div class="mine-row topic-row" data-id="${esc(t)}">${grip}<span class="tname">${esc(t)} <em class="small">${[...posts(), ...edits()].filter(x => tagsOf(x).includes(t)).length} items</em></span>
        <span class="acts"><button class="chip" data-deltag="${esc(t)}">Delete</button></span>${colorPick('', t)}</div>`).join('') : '<p class="note">No topics yet. Add one when you write a post or upload an edit.</p>';
      const row = (kind, id, title, p, builtin, acc, sched) => ({ kind, id, title, p, builtin, acc, sched });
      const wrows = postsOrdered().map(p => row('post', p.slug, p.title, !!p.private, !p.mine, p.accent, p.scheduled ? p.publishAt : 0));
      const erows = editsOrdered().map(e => row('edit', e.id || e.src, e.title, !!e.private, !e.mine, e.accent, e.scheduled ? e.publishAt : 0));
      const d = r => `data-kind="${r.kind}" data-id="${esc(r.id)}" data-private="${r.p}" data-builtin="${!!r.builtin}"`;
      const rowHtml = r => `<div class="mine-row" data-id="${esc(r.id)}">${grip}<span class="tname">${okHex(r.acc) ? `<i class="dot" style="background:${okHex(r.acc)}"></i>` : ''}${esc(r.title)} <em class="small">${[r.builtin ? 'sample' : '', r.p ? 'private' : '', r.sched ? 'scheduled for ' + fmtWhen(r.sched) : ''].filter(Boolean).join(', ')}</em></span>
          <span class="acts"><button class="chip" data-act="edit" ${d(r)}>Edit</button><button class="chip" data-act="priv" ${d(r)}>${r.p ? 'Make public' : 'Make private'}</button><button class="chip" data-act="del" ${d(r)}>Delete</button></span></div>`;
      const textForm = buildTextForm();
      return `<section class="block page narrow create"><h1>Create</h1><p class="note">${note}</p>
        <div class="chips"><button class="chip" data-tab="fw" aria-pressed="true">Write article</button><button class="chip" data-tab="fe" aria-pressed="false">Upload edit</button></div>
        <form class="composer" id="fw">
          <input class="field big" name="title" required maxlength="120" placeholder="Title">${tagPicker}${date}${accentField}${coverPick}${editor}
          ${priv}${buttons('Publish article')}</form>
        <form class="composer" id="fe" hidden>
          <label class="drop" id="drop"><input type="file" accept="video/*" hidden><span class="drop-in"><strong>Choose a vertical video</strong><span>9:16, ideally 1080 x 1920. Tap to browse.</span></span><video muted loop playsinline hidden></video></label>
          <input class="field big" name="title" required maxlength="80" placeholder="Edit title">${tagPicker}${date}${accentField}
          <textarea class="field" name="desc" rows="3" maxlength="300" placeholder="Caption (optional)"></textarea>
          ${priv}${buttons('Publish edit')}</form>
        <div class="mine"><h2>Articles</h2><p class="note">Drag the handle to reorder. This is the order in the Selected articles section. The Latest preview always shows the newest first.</p>
          <div class="sortlist" data-sort="posts">${wrows.length ? wrows.map(rowHtml).join('') : '<p class="note">No articles yet.</p>'}</div>
          <h2 class="gap">Edits</h2><p class="note">Drag the handle to reorder. This is the order in the Selected edits section, left to right. The Latest preview always puts the newest edit in the middle.</p>
          <div class="sortlist" data-sort="edits">${erows.length ? erows.map(rowHtml).join('') : '<p class="note">No edits yet.</p>'}</div>
          <h2 class="gap">Topics</h2><p class="note">Drag to reorder. The order applies to the topic buttons everywhere. The colour makes the page turn that colour when someone filters by the topic.</p>
          <div class="sortlist" data-sort="topics">${topicRows}</div>
          <h2 class="gap">Colours and graphic</h2><p class="note">The look of the home page: its colours and the artwork at the top.</p>${buildPaletteForm()}
          <h2 class="gap">Homepage text</h2><p class="note">Every piece of text on the homepage is here, grouped in the same order as the page. Each box says where it appears. Clear a box to hide that text. On the homepage, the Edit text buttons next to each section bring you straight to its group.</p>${textForm}</div></section>`;
    },
    notfound() { return `<section class="block page narrow"><h1>Page not found</h1><p>That address does not exist. <a href="#home">Go to the home page</a>.</p></section>`; }
  };

  /* ---------------- composer ---------------- */
  let pendingEdit = null;
  function sortable(list, onDone) {
    const rows = () => [...list.querySelectorAll(':scope > .mine-row')], ids = () => rows().map(r => r.dataset.id);
    list.querySelectorAll(':scope > .mine-row > .grip').forEach(g => {
      const row = g.parentElement;
      g.onpointerdown = e => {
        if (e.button) return; e.preventDefault(); row.classList.add('dragging');
        const move = ev => {
          const y = ev.clientY; let before = null;
          for (const r of rows()) { if (r === row) continue; const b = r.getBoundingClientRect(); if (y < b.top + b.height / 2) { before = r; break; } }
          if (before !== row.nextElementSibling) list.insertBefore(row, before);
          if (y < 70) scrollBy(0, -14); else if (y > innerHeight - 70) scrollBy(0, 14);
        };
        const end = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end); row.classList.remove('dragging'); onDone(ids()); };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
      };
      g.onkeydown = e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault();
        const sib = e.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling; if (!sib || !sib.classList.contains('mine-row')) return;
        if (e.key === 'ArrowUp') list.insertBefore(row, sib); else list.insertBefore(sib, row); g.focus(); onDone(ids());
      };
    });
  }
  const FIGX = '<button type="button" class="fig-x" aria-label="Remove image" contenteditable="false"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  function edToMd(ed) {
    const one = c => { if (c.nodeType === 3) return c.textContent.replace(/[\u200b]/g, '').replace(/\u00a0/g, ' ');
      const t = c.nodeName; if (t === 'IMG') return `![${(c.alt || '').replace(/[\[\]]/g, '')}](img:${c.dataset.id})`; if (t === 'BR') return '\n'; if (t === 'BUTTON') return '';
      const s = inn(c); return /^(STRONG|B)$/.test(t) ? (s.trim() ? `**${s}**` : s) : /^(EM|I)$/.test(t) ? (s.trim() ? `*${s}*` : s) : s; };
    const inn = n => [...n.childNodes].map(one).join('');
    const out = []; let buf = ''; const flush = () => { const s = buf.trim(); if (s) out.push(s); buf = ''; };
    for (const n of ed.childNodes) {
      if (n.nodeType === 1 && /^(P|DIV|H[1-6]|BLOCKQUOTE|FIGURE)$/.test(n.nodeName)) {
        flush(); const s = inn(n).trim(); if (!s) continue;
        out.push(/^H[1-6]$/.test(n.nodeName) ? '## ' + s : n.nodeName === 'BLOCKQUOTE' ? '> ' + s : s);
      } else buf += one(n);
    }
    flush(); return out.join('\n\n');
  }
  function bindCreate() {
    const tabs = app.querySelectorAll('[data-tab]');
    tabs.forEach(t => t.onclick = () => tabs.forEach(x => { const on = x === t; x.setAttribute('aria-pressed', on); $('#' + x.dataset.tab).hidden = !on; }));
    const fw = $('#fw'), fe = $('#fe'); if (!fw) return;
    const say = (f, m) => $('.small', f).textContent = m;
    const fail = (f, err) => say(f, 'Could not save: ' + (err.message || err.code || 'try again'));
    const picked = f => ($('input[name=tags]', f).value || '').split('|').filter(Boolean);
    const findItem = (kind, id, priv) => (kind === 'post' ? (priv ? store.vposts : store.posts) : (priv ? store.vedits : store.edits)).find(x => (kind === 'post' ? x.slug : x.id) === id);

    const fpal = $('#fpal'), g0 = store.settings.graphic || {}; let gmode = g0.mode || 'shapes', gfile = null, gvfile = null, gremI = false, gremV = false;
    const blk = k => $(`[data-for=${k}]`, fpal), sb = fpal.elements.namedItem('gblur'), ss = fpal.elements.namedItem('gsize'), apv = $('.art-prev', fpal);
    const prevSrc = { image: g0.imageId ? imgUrl(g0.imageId) : '', video: g0.videoId ? imgUrl(g0.videoId) : '' };
    const updatePrev = () => {
      const k = gmode, src = prevSrc[k] || '', on = (k === 'image' || k === 'video') && src, im = $('img', apv), vd = $('video', apv);
      apv.hidden = !on; im.hidden = k !== 'image'; vd.hidden = k !== 'video'; if (k === 'image') im.src = src; if (k === 'video' && src && vd.getAttribute('src') !== src) { vd.src = src; vd.play().catch(() => {}); }
      apv.style.setProperty('--gb', sb.value + 'px'); apv.style.setProperty('--gs', ss.value / 100);
    };
    const showThumb = k => { const b = blk(k), t = $(k === 'image' ? 'img' : 'video', $('.cover-prev', b)), src = prevSrc[k];
      t.hidden = !src; if (src) { t.src = src; if (k === 'video') t.play().catch(() => {}); } $('[data-rm]', b).hidden = !src; $('.cover-prev', b).classList.toggle('has', !!src); };
    const syncG = () => { fpal.querySelectorAll('[data-gmode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.gmode === gmode)); blk('image').hidden = gmode !== 'image'; blk('video').hidden = gmode !== 'video'; $('.gtune', fpal).hidden = !(gmode === 'image' || gmode === 'video'); updatePrev(); };
    ['image', 'video'].forEach(k => { const inp = $('input[type=file]', blk(k)); showThumb(k);
      inp.onchange = () => { const f = inp.files[0]; if (!f) return; if (k === 'image') { gfile = f; gremI = false; } else { gvfile = f; gremV = false; } prevSrc[k] = URL.createObjectURL(f); showThumb(k); updatePrev(); dirty = true; };
      $('[data-rm]', blk(k)).onclick = () => { if (k === 'image') { gfile = null; gremI = true; } else { gvfile = null; gremV = true; } prevSrc[k] = ''; inp.value = ''; showThumb(k); updatePrev(); }; });
    fpal.querySelectorAll('[data-gmode]').forEach(b => b.onclick = () => { gmode = b.dataset.gmode; syncG(); dirty = true; });
    sb.oninput = ss.oninput = () => { updatePrev(); dirty = true; }; syncG();
    fpal.querySelectorAll('.colorpick[data-key]').forEach(cp => { const k = cp.dataset.key;
      bindColorPick(cp, hex => { previewPalette = { ...palette(), [k]: hex }; setAccent(baseAccent); dirty = true; })(palette()[k] || ''); });
    fpal.onsubmit = async e => {
      e.preventDefault(); const oldI = g0.imageId || '', oldV = g0.videoId || ''; let imageId = gremI ? '' : oldI, videoId = gremV ? '' : oldV;
      try {
        say(fpal, 'Saving...'); if (gfile) imageId = await putImage(gfile, false);
        if (gvfile) { if (store.mode === 'cloud' && gvfile.size > 20 * 1048576) return say(fpal, 'Hosted uploads are limited to 20 MB. Trim or compress the video.'); videoId = await putFile(gvfile); }
        if (gmode === 'image' && !imageId) return say(fpal, 'Choose an image first, or pick another style.'); if (gmode === 'video' && !videoId) return say(fpal, 'Choose a video first, or pick another style.');
        const pal = {}; fpal.querySelectorAll('.colorpick[data-key]').forEach(cp => { const v = okHex($('input[type=hidden]', cp).value); if (v) pal[cp.dataset.key] = v; });
        await saveSettings({ palette: pal, graphic: { mode: gmode, imageId, videoId, blur: +sb.value, size: +ss.value } }); previewPalette = null; setAccent(baseAccent);
        await deleteImages([oldI !== imageId && oldI, oldV !== videoId && oldV].filter(Boolean)); g0.imageId = imageId; g0.videoId = videoId; gfile = gvfile = null; gremI = gremV = false; say(fpal, 'Saved. The changes are live on the page.');
      } catch (err) { fail(fpal, err); }
    };
    armed($('[data-resetpal]', fpal), async () => { try { await saveSettings({ palette: {}, graphic: { mode: 'shapes' } }); await deleteImages([g0.imageId, g0.videoId].filter(Boolean)); } catch (err) { return toast('That did not work: ' + (err.message || err.code || 'try again')); } previewPalette = null; route(true); }, 'Confirm reset');
    const ft = $('#ftext'), el = k => ft.elements.namedItem(k); let photo = { file: null, removed: false };
    TEXT_KEYS.forEach(k => { el(k).value = T(k); });
    const pimg = $('.cover-prev img', ft), prm = $('[data-rmphoto]', ft), pin = $('input[type=file]', ft);
    const showPhoto = src => { pimg.src = src || ''; pimg.hidden = !src; prm.hidden = !src; $('.cover-prev', ft).classList.toggle('has', !!src); }; showPhoto(photoUrl());
    pin.onchange = () => { const f = pin.files[0]; if (f) { photo = { file: f, removed: false }; showPhoto(URL.createObjectURL(f)); } };
    prm.onclick = () => { photo = { file: null, removed: true }; pin.value = ''; showPhoto(''); };
    ft.onsubmit = async e => {
      e.preventDefault(); const old = (store.settings.profile || {}).photoId || ''; let photoId = photo.removed ? '' : old;
      try {
        say(ft, 'Saving...'); if (photo.file) photoId = await putImage(photo.file, false);
        const text = {}; TEXT_KEYS.forEach(k => { const v = el(k).value.trim(); if (v !== (DEF[k] || '').trim()) text[k] = v; });
        await saveSettings({ text, profile: { photoId } });
        if (old && old !== photoId) await deleteImages([old]); photo = { file: null, removed: false }; say(ft, 'Saved. The changes are live on the page.');
      } catch (err) { fail(ft, err); }
    };
    armed($('[data-resettext]', ft), async () => { try { await saveSettings({ text: {}, profile: { photoId: (store.settings.profile || {}).photoId || '' } }); } catch (err) { return toast('That did not work: ' + (err.message || err.code || 'try again')); } route(true); }, 'Confirm reset');
    const updSched = f => { const ms = whenMs(f.elements.date.value || today(), f.elements.time.value), h = $('.sched', f);
      h.textContent = ms > Date.now() ? `Scheduled. It stays hidden from visitors until ${fmtWhen(ms)}, then appears by itself. You will still see it, marked Scheduled. This hides it from the page only, so use Keep private for anything that must stay secret.` : 'Publishes right away. Pick a later date to schedule it. The time defaults to 12:00 AM.'; };
    [fw, fe].forEach(f => { ['date', 'time'].forEach(n => f.elements.namedItem(n).addEventListener('input', () => updSched(f))); updSched(f); });
    /* accent colours: forms preview the colour live, topic rows save straight away */
    const setC = {};
    [fw, fe].forEach(f => { setC[f.id] = bindColorPick($('.colorpick', f), hex => { setAccent(hex); dirty = true; }); });
    app.querySelectorAll('.colorpick[data-tag]').forEach(cp => { const t = cp.dataset.tag;
      const set = bindColorPick(cp, async hex => { const m = { ...(store.settings.tagColors || {}) }; if (hex) m[t] = hex; else delete m[t];
        try { await saveSettings({ tagColors: m }); } catch (err) { toast('That did not work: ' + (err.message || err.code || 'try again')); } });
      set(colorOf(t)); });

    /* cover icon */
    let cover = { file: null, existing: '', removed: false };
    const cp = $('.coverpick', fw), cin = $('input[type=file]', cp), cimg = $('img', cp), crm = $('[data-rmcover]', cp);
    const showCover = src => { cimg.src = src || ''; cimg.hidden = !src; $('.cover-prev', cp).classList.toggle('has', !!src); crm.hidden = !src; };
    cin.onchange = () => { const f = cin.files[0]; if (!f) return; cover.file = f; cover.removed = false; showCover(URL.createObjectURL(f)); };
    crm.onclick = () => { cover = { file: null, existing: cover.existing, removed: true }; cin.value = ''; showCover(''); };

    /* the text editor: images, headings, quotes, bold and italic right in the writing area */
    const ed = $('#editor'), ifile = $('#imgfile'), alt = $('.alt', fw); let lastRange = null;
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    const saveRange = () => { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) lastRange = s.getRangeAt(0).cloneRange(); };
    const fmtBtn = k => fw.querySelector(`[data-fmt=${k}]`);
    const syncFmt = () => { const inEd = getSelection().rangeCount && ed.contains(getSelection().anchorNode);
      const on = (k, v) => fmtBtn(k).setAttribute('aria-pressed', !!(inEd && v));
      try { on('bold', document.queryCommandState('bold')); on('italic', document.queryCommandState('italic')); on('h2', (document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '') === 'h2'); } catch (e) {} };
    ['keyup', 'mouseup', 'focus', 'input'].forEach(ev => ed.addEventListener(ev, () => { saveRange(); syncFmt(); }));
    const onSel = () => { if (!ed.isConnected) return document.removeEventListener('selectionchange', onSel); syncFmt(); };
    document.addEventListener('selectionchange', onSel);
    const loadEditor = t => { ed.innerHTML = t ? md(t) : ''; ed.querySelectorAll('figure').forEach(f => { f.contentEditable = 'false'; f.insertAdjacentHTML('beforeend', FIGX); }); lastRange = null; };
    function insertFigure(id, altText) {
      const fig = document.createElement('figure'); fig.contentEditable = 'false';
      fig.innerHTML = `<img src="${esc(imgUrl(id))}" data-id="${id}" alt="${esc(altText)}">${FIGX}`;
      let node = lastRange && ed.contains(lastRange.startContainer) ? lastRange.startContainer : null;
      if (node === ed) node = ed.childNodes[Math.max(0, lastRange.startOffset - 1)] || null;
      while (node && node.parentNode !== ed) node = node.parentNode;
      const empty = node && node.nodeType === 1 && !node.textContent.trim() && !node.querySelector('img, figure');
      if (!node) ed.append(fig); else if (empty) node.replaceWith(fig); else node.after(fig);
      if (!fig.nextSibling || fig.nextSibling.nodeName === 'FIGURE') { const p = document.createElement('p'); p.innerHTML = '<br>'; fig.after(p); }
      dirty = true;
    }
    async function addImage(file) {
      say(fw, 'Uploading image...');
      try { const id = await putImage(file, false); insertFigure(id, alt.value.trim()); alt.value = ''; say(fw, 'Image added.'); }
      catch (err) { say(fw, 'Image upload failed: ' + (err.message || err.code || 'try again')); }
    }
    ifile.onchange = async () => { const f = ifile.files[0]; ifile.value = ''; if (f) await addImage(f); };
    fw.querySelectorAll('[data-fmt]').forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => {
      ed.focus(); const c = b.dataset.fmt;
      if (c === 'bold' || c === 'italic') document.execCommand(c);
      else { const tag = 'h2', cur = (document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); document.execCommand('formatBlock', false, cur === tag ? 'p' : tag); }
      saveRange(); syncFmt(); dirty = true; }; });
    ed.addEventListener('click', e => { const x = e.target.closest('.fig-x'); if (x) { x.closest('figure').remove(); dirty = true; } });
    ed.addEventListener('paste', async e => {
      e.preventDefault(); const files = [...(e.clipboardData.files || [])].filter(f => f.type.startsWith('image/'));
      if (files.length) { for (const f of files) await addImage(f); return; }
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    ed.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    ed.addEventListener('drop', async e => {
      const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/')); if (!files.length) return; e.preventDefault();
      if (document.caretRangeFromPoint) lastRange = document.caretRangeFromPoint(e.clientX, e.clientY);
      for (const f of files) await addImage(f);
    });

    function startEdit(kind, id, priv) {
      const it = findItem(kind, id, priv); if (!it) return toast('Could not find that item.');
      const f = kind === 'post' ? fw : fe; $(`[data-tab="${f.id}"]`).click();
      f.dataset.editing = id; f.dataset.priv = priv; f.elements.title.value = it.title; f.elements.date.value = it.date || today(); f.elements.time.value = it.time || '00:00'; updSched(f);
      if (kind === 'post') { loadEditor(it.md || ''); cover = { file: null, existing: it.coverId || '', removed: false }; showCover(it.coverId ? imgUrl(it.coverId) : ''); } else f.elements.desc.value = it.desc || '';
      const tp = $('.tagpick', f), want = tagsOf(it), chips = [...tp.querySelectorAll('[data-pick]')];
      chips.forEach(c => c.setAttribute('aria-pressed', want.includes(c.dataset.pick)));
      $('input[name=tags]', tp).value = want.filter(t => chips.some(c => c.dataset.pick === t)).join('|');
      setC[f.id](it.accent || ''); setAccent(it.accent || '');
      $('.check', f).hidden = true; if (kind === 'edit') $('#drop').hidden = true;
      $('button[type=submit]', f).textContent = 'Save changes'; $('[data-cancel]', f).hidden = false; say(f, '');
      f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    app.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => route(true));

    /* manage lists: edit, private, delete (delete asks for a second click) */
    app.querySelectorAll('[data-act]').forEach(b => {
      const { act, kind } = b.dataset, priv = b.dataset.private === 'true', builtin = b.dataset.builtin === 'true'; let id = b.dataset.id;
      const run = async () => {
        try {
          if (builtin && act !== 'del') id = await adopt(kind, id);
          if (act === 'edit') pendingEdit = { kind, id, priv };
          else if (act === 'priv') await setPrivate(kind, id, !priv);
          else await removeItem(kind, id, priv, builtin);
        } catch (err) { return toast('That did not work: ' + (err.message || err.code || 'try again')); }
        route(true);
      };
      if (act === 'del') armed(b, run); else b.onclick = run;
    });
    app.querySelectorAll('[data-deltag]').forEach(b => armed(b, async () => {
      const t = b.dataset.deltag;
      try { await saveSettings({ tags: store.settings.tags.filter(x => x !== t), removed: [...(store.settings.removed || []), t] }); } catch (err) { return toast('That did not work: ' + (err.message || err.code || 'try again')); }
      route(true);
    }));
    const orderKey = { posts: 'postOrder', edits: 'editOrder', topics: 'order' };
    app.querySelectorAll('.sortlist').forEach(list => sortable(list, async ids => {
      try { await saveSettings({ [orderKey[list.dataset.sort]]: ids }); } catch (err) { toast('That did not work: ' + (err.message || err.code || 'try again')); }
    }));

    /* topic picker */
    const chipHtml = t => `<button type="button" class="chip" aria-pressed="false" data-pick="${esc(t)}">${esc(t)}</button>`;
    app.querySelectorAll('.tagpick').forEach(tp => {
      const val = $('input[type=hidden]', tp), inp = $('input.field', tp);
      const sync = () => { val.value = [...tp.querySelectorAll('[data-pick][aria-pressed=true]')].map(x => x.dataset.pick).join('|'); };
      tp.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); sync(); });
      const add = async () => {
        let t = inp.value.replace(/\|/g, '').trim().slice(0, 24); if (!t) return;
        const have = allTags().find(x => x.toLowerCase() === t.toLowerCase());
        if (have) t = have; else { try { await saveSettings({ tags: [...store.settings.tags, t], removed: (store.settings.removed || []).filter(x => x !== t) }); } catch (err) { return; } app.querySelectorAll('.tagpick .chips').forEach(c => c.insertAdjacentHTML('beforeend', chipHtml(t))); }
        inp.value = ''; const c = [...tp.querySelectorAll('[data-pick]')].find(x => x.dataset.pick === t); if (c.getAttribute('aria-pressed') !== 'true') c.click();
      };
      $('[data-addtag]', tp).onclick = add; inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    });

    fw.onsubmit = async e => {
      e.preventDefault(); const f = new FormData(fw), text = edToMd(ed), title = f.get('title').trim(), date = f.get('date') || today(), time = f.get('time') || '00:00', publishAt = whenMs(date, time);
      if (!text) return say(fw, 'Write something first.');
      try {
        say(fw, 'Saving...');
        let coverId = cover.removed ? '' : cover.existing; if (cover.file) coverId = await putImage(cover.file, true);
        const fields = { title, tags: picked(fw), md: text, excerpt: excerptOf(text), date, time, publishAt, coverId: coverId || '', accent: okHex(f.get('accent')) };
        if (fw.dataset.editing) {
          const id = fw.dataset.editing, priv = fw.dataset.priv === 'true', old = findItem('post', id, priv) || {};
          await updateItem('post', id, priv, fields);
          const keep = imgIds(fields); await deleteImages(imgIds(old).filter(x => !keep.includes(x)));
          return route(true);
        }
        const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post') + '-' + uid();
        await savePost({ slug, ...fields, created: Date.now() }, !!f.get('priv')); location.hash = '#post-' + slug;
      } catch (err) { fail(fw, err); }
    };

    let pending = null; const drop = $('#drop'), input = $('input', drop), vid = $('video', drop);
    input.onchange = () => {
      const file = input.files[0]; if (!file) return;
      vid.src = URL.createObjectURL(file); vid.hidden = false; $('.drop-in', drop).hidden = true; drop.classList.add('filled');
      vid.onloadeddata = () => {
        const ok = Math.abs(vid.videoWidth / vid.videoHeight - 9 / 16) < .03;
        pending = { file, dur: clock(vid.duration), thumb: null }; say(fe, ok ? '' : 'This video is not 9:16, so it will be cropped to fit.');
        vid.currentTime = Math.min(1, vid.duration / 2); vid.play().catch(() => {});
      };
      vid.onseeked = () => { if (!pending || pending.thumb) return; const c = document.createElement('canvas'), s = Math.min(1, 720 / vid.videoHeight); c.width = vid.videoWidth * s; c.height = vid.videoHeight * s;
        c.getContext('2d').drawImage(vid, 0, 0, c.width, c.height); c.toBlob(b => pending && (pending.thumb = b), 'image/jpeg', .82); };
    };
    fe.onsubmit = async e => {
      e.preventDefault(); const f = new FormData(fe), btn = $('button[type=submit]', fe), date = f.get('date') || today(), time = f.get('time') || '00:00', publishAt = whenMs(date, time), acc = okHex(f.get('accent'));
      if (fe.dataset.editing) {
        try { await updateItem('edit', fe.dataset.editing, fe.dataset.priv === 'true', { title: f.get('title').trim(), tags: picked(fe), desc: f.get('desc').trim(), date, time, publishAt, accent: acc }); return route(true); }
        catch (err) { return fail(fe, err); }
      }
      if (!pending) return say(fe, 'Choose a video first.');
      if (store.mode === 'cloud' && pending.file.size > 20 * 1048576) return say(fe, 'Hosted uploads are limited to 20 MB. Trim or compress this edit.');
      btn.disabled = true;
      try { say(fe, 'Uploading...'); await saveEdit({ id: 'e-' + uid(), title: f.get('title').trim(), tags: picked(fe), desc: f.get('desc').trim(), duration: pending.dur, date, time, publishAt, accent: acc, created: Date.now() }, pending.file, pending.thumb, !!f.get('priv')); location.hash = '#edits'; }
      catch (err) { btn.disabled = false; say(fe, 'Upload failed: ' + (err.message || err.code || 'try again')); }
    };
    if (pendingEdit) { const p = pendingEdit; pendingEdit = null; startEdit(p.kind, p.id, p.priv); }
    if (pendingGroup) { const g = $('#' + pendingGroup); pendingGroup = null; if (g) { g.scrollIntoView({ block: 'start' }); const f = $('input, textarea', g); if (f) f.focus({ preventScroll: true }); } }
  }

  /* ---------------- routing ---------------- */
  /* ---------------- single page: sections, filters, search ---------------- */
  const applyFilterAccent = () => { baseAccent = colorOf(topicOrder[topicOrder.length - 1] || ''); setAccent(baseAccent); };
  const dropTopic = t => { const i = topicOrder.lastIndexOf(t); if (i >= 0) topicOrder.splice(i, 1); };
  function fillSection(kind) {
    const isP = kind === 'post', st = S[kind], el = $(isP ? '#writing' : '#edits'); if (!el) return;
    const all = isP ? postsOrdered() : editsOrdered(), q = st.q.trim().toLowerCase(), s = [...st.sel];
    const hit = all.filter(x => { const t = tagsOf(x); return (!s.length || (st.all ? s.every(k => t.includes(k)) : s.some(k => t.includes(k)))) && searchText(x).includes(q); });
    const shown = st.open ? hit : hit.slice(0, LIMIT);
    $('.list', el).innerHTML = shown.map(isP ? postItem : editCard).join('');
    $('.count', el).textContent = hit.length ? `Showing ${shown.length} of ${hit.length}` : '';
    const more = $('[data-more]', el); more.hidden = hit.length <= LIMIT; more.textContent = st.open ? 'Show fewer' : `Show all ${hit.length}`;
    $('.empty', el).hidden = hit.length > 0;
    el.querySelectorAll('[data-tag]').forEach(c => c.setAttribute('aria-pressed', st.sel.has(c.dataset.tag)));
    $('[data-all]', el).setAttribute('aria-pressed', !st.sel.size);
    const m = $('[data-mode]', el); m.hidden = st.sel.size < 2; m.textContent = 'Match: ' + (st.all ? 'all' : 'any');
  }
  function renderGlobal() {
    const box = $('#gresults'), q = S.g.trim().toLowerCase(); if (!box) return;
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    const P = postsOrdered().filter(x => searchText(x).includes(q)), E = editsOrdered().filter(x => searchText(x).includes(q));
    box.hidden = false;
    box.innerHTML = `<div class="head"><h2>Results for "${esc(S.g.trim())}"</h2><button class="chip" data-clear>Clear</button></div>` +
      (P.length || E.length ? (P.length ? `<h3 class="rh">Writing (${P.length})</h3><div class="posts">${P.map(postItem).join('')}</div>` : '') + (E.length ? `<h3 class="rh">Edits (${E.length})</h3><div class="grid">${E.map(editCard).join('')}</div>` : '') : '<p class="empty">Nothing found. Try another word.</p>');
    $('[data-clear]', box).onclick = () => { S.g = ''; $('#gq').value = ''; renderGlobal(); };
  }
  let spyIO;
  function spy() {
    if (spyIO) spyIO.disconnect();
    spyIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === e.target.id)); }), { rootMargin: '-35% 0px -55% 0px' });
    ['about', 'writing', 'edits', 'contact'].forEach(id => { const n = $('#' + id); if (n) spyIO.observe(n); });
  }
  function bindHome() {
    ['post', 'edit'].forEach(kind => {
      const el = $(kind === 'post' ? '#writing' : '#edits'), st = S[kind];
      el.querySelectorAll('[data-tag]').forEach(c => c.onclick = () => { const t = c.dataset.tag; if (st.sel.has(t)) { st.sel.delete(t); dropTopic(t); } else { st.sel.add(t); topicOrder.push(t); } fillSection(kind); applyFilterAccent(); });
      $('[data-all]', el).onclick = () => { st.sel.forEach(dropTopic); st.sel.clear(); fillSection(kind); applyFilterAccent(); };
      $('[data-mode]', el).onclick = () => { st.all = !st.all; fillSection(kind); };
      $('[data-more]', el).onclick = () => { st.open = !st.open; fillSection(kind); if (!st.open) el.scrollIntoView(); };
      $('.sec-search', el).oninput = e => { st.q = e.target.value; fillSection(kind); };
      fillSection(kind);
    });
    const gv = $('.art video'); if (gv) { gv.muted = true; gv.play().catch(() => {}); }
    const cf = $('#cform');
    cf.onsubmit = e => {
      e.preventDefault(); const c = contactData(), f = new FormData(cf), say = m => { $('.small', cf).textContent = m; }, msg = String(f.get('msg') || '').trim(), who = String(f.get('name') || '').trim(), from = String(f.get('email') || '').trim();
      if (!c.email) return say('No email address is set up yet.'); if (!msg) return say('Write a message first.');
      const url = `mailto:${c.email}?subject=${encodeURIComponent('Message from ' + (who || 'your site'))}&body=${encodeURIComponent(msg + '\n\n' + who + (from ? ' <' + from + '>' : ''))}`, framed = window.top !== window.self;
      openMail(url, framed ? `To: ${c.email}\n\n${msg}\n\n${who}${from ? ' <' + from + '>' : ''}` : ''); say(framed ? 'Copied. This preview runs inside Claude, so paste it into an email.' : 'Opening your email app...');
    };
    const gq = $('#gq'); gq.oninput = () => { S.g = gq.value; renderGlobal(); }; renderGlobal(); spy();
  }
  const scrollToSection = id => { if (id === 'home') return scrollTo({ top: 0 }); const el = $('#' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  let current = '', dirty = false;
  app.addEventListener('input', () => { dirty = true; });
  function route(keep) {
    let h = decodeURIComponent(location.hash.replace('#', '')); if (h === 'blog') h = 'writing';
    let name = h || 'home', arg, target = '';
    if (h.startsWith('post-')) { name = 'post'; arg = h.slice(5); }
    else if (['about', 'writing', 'edits', 'contact', 'latest'].includes(h)) { name = 'home'; target = h; }
    else if (!['home', 'create'].includes(h) && h) name = 'notfound';
    if (name === 'create') { if (store.mode === 'local' && store.canWrite) try { localStorage.setItem('studio', '1'); } catch (e) {} if (!store.canWrite) name = 'notfound'; }
    if (target === 'about') S.aboutOpen = true;
    if (name === 'home' && current === 'home' && keep === undefined) return target === 'about' ? openAbout() : scrollToSection(target || 'home');
    current = name; if (name !== 'create') previewPalette = null; app.innerHTML = (views[name] || views.notfound)(arg); syncNav();
    const post = name === 'post' ? posts().find(p => p.slug === arg) || {} : null;
    baseAccent = post ? accentOf(post) : name === 'home' ? colorOf(topicOrder[topicOrder.length - 1] || '') : ''; setAccent(baseAccent);
    document.title = (post ? (post.title || 'Post') + ' | ' : '') + T('name');
    document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', (name === 'post' && a.dataset.nav === 'writing') || (name === 'create' && a.dataset.nav === 'create')));
    scrollTo({ top: keep === true ? scrollY : 0, behavior: 'instant' }); dirty = false; bindHover(); armSchedule();
    if (name === 'home') { bindHome(); if (target && keep !== true) requestAnimationFrame(() => scrollToSection(target)); } else if (spyIO) spyIO.disconnect();
    if (name === 'create') bindCreate();
  }
  let schedT;
  function armSchedule() { clearTimeout(schedT); const now = Date.now(), next = [...store.posts, ...store.edits].map(x => x.publishAt || 0).filter(t => t > now).sort((x, y) => x - y)[0];
    if (next && next - now < 2147000000) schedT = setTimeout(() => refresh(), next - now + 800); }
  const refresh = () => { const ae = document.activeElement; if (ae && ae.matches && ae.matches('.sec-search, #gq')) return; if (current !== 'create' || !dirty) route(true); };

  /* ---------------- player + hover preview ---------------- */
  const svg = p => `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="${p}"/></svg>`;
  const ICON = { play: svg('M8 5v14l11-7z'), pause: svg('M7 5h4v14H7zM13 5h4v14h-4z'), vol: svg('M3 9v6h4l5 4V5L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z'), mute: svg('M3 9v6h4l5 4V5L7 9zm13 .6L17.4 8l2.1 2.1L21.6 8 23 9.4l-2.1 2.1L23 13.6 21.6 15l-2.1-2.1L17.4 15 16 13.6l2.1-2.1z') };
  const ytSrc = (id, o) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1${o || ''}`;
  const dlg = $('#player');
  function mountPlayer(box, src) {
    box.innerHTML = `<div class="vp paused"><video src="${esc(src)}" playsinline loop></video><button class="vp-big" aria-label="Play or pause"></button>
      <div class="vp-bar"><button class="vp-btn" data-p aria-label="Play">${ICON.play}</button><input class="vp-range vp-seek" type="range" min="0" max="1000" value="0" aria-label="Seek">
      <span class="vp-time">0:00</span><button class="vp-btn" data-m aria-label="Mute">${ICON.vol}</button><input class="vp-range vp-vol" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"></div></div>`;
    const vp = $('.vp', box), v = $('video', vp), pb = $('[data-p]', vp), mb = $('[data-m]', vp), sk = $('.vp-seek', vp), vl = $('.vp-vol', vp), tm = $('.vp-time', vp);
    const fill = i => i.style.setProperty('--p', (i.value - i.min) / (i.max - i.min) * 100 + '%');
    const toggle = () => v.paused ? v.play().catch(() => {}) : v.pause();
    v.onplay = () => { vp.classList.remove('paused'); pb.innerHTML = ICON.pause; pb.setAttribute('aria-label', 'Pause'); };
    v.onpause = () => { vp.classList.add('paused'); pb.innerHTML = ICON.play; pb.setAttribute('aria-label', 'Play'); };
    v.ontimeupdate = () => { if (v.duration) { sk.value = v.currentTime / v.duration * 1000; fill(sk); tm.textContent = clock(v.currentTime); } };
    v.onvolumechange = () => { mb.innerHTML = v.muted || !v.volume ? ICON.mute : ICON.vol; vl.value = v.muted ? 0 : v.volume; fill(vl); };
    pb.onclick = $('.vp-big', vp).onclick = toggle;
    sk.oninput = () => { if (v.duration) { v.currentTime = sk.value / 1000 * v.duration; fill(sk); } };
    vl.oninput = () => { v.muted = false; v.volume = +vl.value; };
    mb.onclick = () => { v.muted = !v.muted; if (!v.muted && !v.volume) v.volume = .7; };
    fill(sk); fill(vl); v.play().catch(() => {});
  }
  /* controls hide when the pointer leaves the video or after 3 seconds without activity */
  let idleT;
  const wake = () => { dlg.classList.remove('idle'); clearTimeout(idleT); if (!dlg.dataset.file) return;
    idleT = setTimeout(() => { const bar = $('.vp-bar', dlg); if (bar && bar.matches(':hover')) wake(); else dlg.classList.add('idle'); }, 3000); };
  const hideUI = () => { if (dlg.dataset.file) { clearTimeout(idleT); dlg.classList.add('idle'); } };
  dlg.addEventListener('pointermove', e => e.target.closest('#frame, .close') ? wake() : hideUI());
  dlg.addEventListener('pointerdown', wake); dlg.addEventListener('pointerleave', hideUI);
  dlg.addEventListener('keydown', e => { wake(); const v = $('video', dlg); if (e.key === ' ' && v && !e.target.closest('button, input')) { e.preventDefault(); v.paused ? v.play() : v.pause(); } });
  function openEdit(id) {
    const v = edits().find(x => String(x.id || x.src) === id); if (!v) return;
    const box = $('#frame'), x = ext(v);
    if (v.platform === 'file') { dlg.dataset.file = '1'; mountPlayer(box, v.src); }
    else { delete dlg.dataset.file; box.innerHTML = v.platform === 'vimeo'
      ? `<iframe src="https://player.vimeo.com/video/${esc(x)}?autoplay=1" title="${esc(v.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
      : `<iframe class="yt" src="${esc(ytSrc(x))}" title="${esc(v.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`; }
    $('#ptitle').textContent = v.title; $('#pdesc').textContent = v.desc || ''; setAccent(accentOf(v) || baseAccent); dlg.showModal(); wake();
  }
  let hoverBound = false;
  function bindHover() {
    if (hoverBound || !matchMedia('(hover: hover)').matches) return; hoverBound = true;
    const stop = el => { const p = $('.pv', el); if (p) p.remove(); el.classList.remove('previewing'); };
    const start = el => {
      const v = edits().find(x => String(x.id || x.src) === el.dataset.id), t = $('.thumb', el); if (!v || $('.pv', t)) return; let n; const x = ext(v);
      if (v.platform === 'file') { n = document.createElement('video'); n.src = v.src; n.muted = true; n.loop = true; n.playsInline = true; n.play().catch(() => {}); }
      else { n = document.createElement('iframe'); n.tabIndex = -1; n.allow = 'autoplay'; n.src = v.platform === 'vimeo' ? `https://player.vimeo.com/video/${x}?background=1&autoplay=1&muted=1&loop=1` : ytSrc(x, `&mute=1&controls=0&loop=1&playlist=${x}`); if (v.platform !== 'vimeo') n.classList.add('yt'); }
      n.classList.add('pv'); t.insertBefore(n, $('.play', t)); el.classList.add('previewing');
    };
    const over = (f, e) => { const el = e.target.closest('.vid'); if (el && !el.contains(e.relatedTarget)) f(el); };
    app.addEventListener('mouseover', e => over(start, e)); app.addEventListener('mouseout', e => over(stop, e));
    app.addEventListener('focusin', e => { const el = e.target.closest('.vid'); if (el) start(el); }); app.addEventListener('focusout', e => { const el = e.target.closest('.vid'); if (el) stop(el); });
  }
  app.addEventListener('click', e => { const b = e.target.closest('.vid'); if (b) openEdit(b.dataset.id); });
  $('#close').onclick = () => dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { clearTimeout(idleT); dlg.classList.remove('idle'); $('#frame').innerHTML = ''; setAccent(baseAccent); });

  const focusSearch = () => { const go = () => { const q = $('#gq'); if (q) { scrollTo({ top: 0 }); q.focus(); } }; if (current !== 'home') { location.hash = '#home'; setTimeout(go, 200); } else go(); };
  $('#gsearch-btn').onclick = focusSearch;
  $('[data-nav=about]').addEventListener('click', e => { if (current === 'home') { e.preventDefault(); openAbout(); history.replaceState(null, '', '#about'); } });
  document.addEventListener('keydown', e => { const t = e.target, typing = t.matches && t.matches('input, textarea, select, [contenteditable="true"]');
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); focusSearch(); } });
  $('#theme').onclick = () => { const r = document.documentElement; const dark = (r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark'; r.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('theme', r.dataset.theme); } catch (e) {} setAccent(accent); };

  addEventListener('hashchange', () => route());
  route();
  (async () => { if (!(await initCloud().catch(() => false))) await loadLocal(); refresh(); })();
})();
