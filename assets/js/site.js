/* ===== 郑宇彬的小窝 · NEST ===== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- 壁纸 ---------- */
  const WALLS = [
    { src: 'assets/img/wall-1.jpg', name: '蓝莓微距 · 夜', desc: '水珠 / 暗青蓝 / 侧逆光' },
    { src: 'assets/img/wall-2.jpg', name: '蓝莓果堆 · 俯拍', desc: '层层堆叠 / 深蓝紫 / 漫射光' },
    { src: 'assets/img/wall-3.jpg', name: '蓝莓晨露 · 逆光', desc: '雾气 / 通透叶片 / 光斑' },
  ];

  /* ---------- 偏好 ---------- */
  const KEY = 'nest.prefs.v1';
  const DEFAULTS = { wall: 0, hour24: true, sec: true, glass: 58, auto: false };
  let prefs = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) prefs = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {}
  const savePrefs = () => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
  };

  /* ---------- 壁纸切换 ---------- */
  const wallEls = $$('.wall');
  let wallSlot = 0;
  let currentWall = -1;

  function paintWall(instant) {
    const idx = Math.min(prefs.wall, WALLS.length - 1);
    if (idx === currentWall && !instant) return;
    currentWall = idx;
    const next = wallEls[wallSlot];
    const prev = wallEls[(wallSlot + 1) % 2];
    next.style.backgroundImage = `url("${WALLS[idx].src}")`;
    if (instant) {
      wallEls.forEach((el) => el.classList.remove('on'));
      next.classList.add('on');
    } else {
      next.classList.add('on');
      prev.classList.remove('on');
    }
    wallSlot = (wallSlot + 1) % 2;
    $$('.wcard').forEach((c) => c.classList.toggle('on', +c.dataset.i === idx));
    $$('#setWalls img').forEach((c) => c.classList.toggle('on', +c.dataset.i === idx));
  }

  /* ---------- 翻页时钟 ---------- */
  const clockEl = $('#clock');
  const digits = [];
  const seps = [];

  function buildClock() {
    clockEl.innerHTML = '';
    for (let u = 0; u < 3; u++) {
      const unit = document.createElement('div');
      unit.className = 'clock__unit';
      unit.dataset.unit = u;
      for (let k = 0; k < 2; k++) {
        const d = document.createElement('div');
        d.className = 'digit';
        d.innerHTML =
          '<div class="top"><span></span></div>' +
          '<div class="bottom"><span></span></div>' +
          '<div class="flap flap--top"><span></span></div>' +
          '<div class="flap flap--bot"><span></span></div>';
        unit.appendChild(d);
        digits.push(d);
      }
      clockEl.appendChild(unit);
      if (u < 2) {
        const sep = document.createElement('div');
        sep.className = 'clock__sep';
        sep.innerHTML = '<i></i><i></i>';
        clockEl.appendChild(sep);
        seps.push(sep);
      }
    }
  }

  function setDigit(d, v, first) {
    const top = d.querySelector('.top span');
    const bottom = d.querySelector('.bottom span');
    const ftop = d.querySelector('.flap--top span');
    const fbot = d.querySelector('.flap--bot span');
    if (first || d.dataset.v === v) {
      top.textContent = v;
      bottom.textContent = v;
      d.dataset.v = v;
      return;
    }
    const prev = d.dataset.v;
    d.dataset.v = v;
    top.textContent = v;
    bottom.textContent = prev;
    ftop.textContent = prev;
    fbot.textContent = v;
    d.classList.add('go');
    clearTimeout(d._t);
    d._t = setTimeout(() => {
      d.classList.remove('go');
      bottom.textContent = v;
    }, 700);
  }

  const pad = (n) => String(n).padStart(2, '0');
  let firstTick = true;

  function tick() {
    const now = new Date();
    let h = now.getHours();
    if (!prefs.hour24) h = h % 12 || 12;
    const vals = (pad(h) + pad(now.getMinutes()) + pad(now.getSeconds())).split('');
    vals.forEach((v, i) => setDigit(digits[i], v, firstTick));
    firstTick = false;
  }

  /* ---------- 问候 / 日期 ---------- */
  const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  function paintDate() {
    const now = new Date();
    $('#today').textContent =
      `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 ${WEEK[now.getDay()]}`;
    const h = now.getHours();
    let hi = '夜里好，小窝还亮着灯';
    if (h >= 5 && h < 11) hi = '早上好，今天也慢慢来';
    else if (h >= 11 && h < 14) hi = '中午好，记得先吃饭';
    else if (h >= 14 && h < 18) hi = '下午好，喝点水吧';
    else if (h >= 18 && h < 23) hi = '晚上好，我在小窝里';
    $('#hello').textContent = hi;
  }

  /* ---------- 播放器（浏览器实时合成，不加载任何音频文件） ---------- */
  const TRACKS = [
    { name: '蓝莓之夜', artist: 'NEST · 环境音 / 实时合成', kind: 'pad' },
    { name: '雾中清晨', artist: 'NEST · 环境音 / 实时合成', kind: 'air' },
  ];
  let track = 0;
  let playing = false;
  let muted = false;
  let elapsed = 0;
  const LOOP = 240;
  let ctx = null;
  let nodes = null;
  let timer = null;

  const waveEl = $('#wave');
  const barCount = 22;
  for (let i = 0; i < barCount; i++) {
    const b = document.createElement('span');
    b.style.height = '12%';
    waveEl.appendChild(b);
  }
  const bars = $$('#wave span');
  let barPhase = 0;

  function animateBars() {
    if (!playing) return;
    barPhase += 0.09;
    bars.forEach((b, i) => {
      const v = 18 + Math.abs(Math.sin(barPhase + i * 0.42)) * 62 + Math.random() * 12;
      b.style.height = Math.min(96, v) + '%';
    });
    requestAnimationFrame(animateBars);
  }

  function makeNoise(seconds = 3) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buf;
  }

  function buildNodes(kind) {
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);

    if (kind === 'air') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoise(4);
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1150;
      bp.Q.value = 0.55;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      const g = ctx.createGain();
      g.gain.value = 0.42;
      src.connect(bp).connect(lp).connect(g).connect(out);
      src.start();

      const pad = ctx.createOscillator();
      pad.type = 'sine';
      pad.frequency.value = 196;
      const pg = ctx.createGain();
      pg.gain.value = 0.03;
      pad.connect(pg).connect(out);
      pad.start();
      return { out, stops: [src, pad] };
    }

    const stops = [];
    [104, 156, 232].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = [0.10, 0.045, 0.02][i];
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + i * 0.03;
      const lg = ctx.createGain();
      lg.gain.value = 0.02;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(out);
      o.start();
      lfo.start();
      stops.push(o, lfo);
    });

    const noise = ctx.createBufferSource();
    noise.buffer = makeNoise(4);
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 620;
    const ng = ctx.createGain();
    ng.gain.value = 0.10;
    noise.connect(lp).connect(ng).connect(out);
    noise.start();
    stops.push(noise);

    return { out, stops };
  }

  function startAudio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    nodes = buildNodes(TRACKS[track].kind);
    if (muted) nodes.out.gain.value = 0;
    else nodes.out.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.2);
  }

  function stopAudio() {
    if (!nodes) return;
    const n = nodes;
    nodes = null;
    try {
      n.out.gain.cancelScheduledValues(ctx.currentTime);
      n.out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    } catch (e) {}
    setTimeout(() => {
      n.stops.forEach((s) => { try { s.stop(); } catch (e) {} });
      try { n.out.disconnect(); } catch (e) {}
    }, 600);
  }

  function paintPlayer() {
    $('#trkTitle').textContent = TRACKS[track].name;
    $('#trkArtist').textContent = TRACKS[track].artist;
    document.querySelector('.i-play').style.display = playing ? 'none' : 'block';
    document.querySelector('.i-pause').style.display = playing ? 'block' : 'none';
    $('#btnPlay').setAttribute('aria-label', playing ? '暂停' : '播放');
    $('#time').textContent = '0' + Math.floor(elapsed / 60) + ':' + pad(elapsed % 60);
    $('#progress').style.width = (elapsed / LOOP) * 100 + '%';
    $$('#playlist .trk').forEach((el, i) => el.classList.toggle('on', i === track));
  }

  function buildPlaylist() {
    const list = $('#playlist');
    list.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const el = document.createElement('div');
      el.className = 'trk';
      el.innerHTML =
        `<span class="trk__i">${pad(i + 1)}</span>` +
        `<span class="trk__n">${t.name}</span>` +
        `<span class="trk__e">实时合成</span>`;
      el.addEventListener('click', () => selectTrack(i, true));
      list.appendChild(el);
    });
  }

  function selectTrack(i, play) {
    const wasPlaying = playing;
    track = (i + TRACKS.length) % TRACKS.length;
    elapsed = 0;
    if (playing) {
      stopAudio();
      startAudio();
      playing = true;
    } else if (play) {
      togglePlay(true);
    }
    paintPlayer();
    if (wasPlaying) requestAnimationFrame(animateBars);
  }

  function togglePlay(force) {
    const next = typeof force === 'boolean' ? force : !playing;
    if (next === playing) return;
    playing = next;
    if (playing) {
      startAudio();
      requestAnimationFrame(animateBars);
      clearInterval(timer);
      timer = setInterval(() => {
        elapsed = (elapsed + 1) % LOOP;
        paintPlayer();
      }, 1000);
    } else {
      stopAudio();
      clearInterval(timer);
      bars.forEach((b) => (b.style.height = '12%'));
    }
    paintPlayer();
  }

  $('#btnPlay').addEventListener('click', () => togglePlay());
  $('#btnPrev').addEventListener('click', () => selectTrack(track - 1, playing));
  $('#btnNext').addEventListener('click', () => selectTrack(track + 1, playing));
  $('#btnMute').addEventListener('click', () => {
    muted = !muted;
    if (nodes) {
      nodes.out.gain.cancelScheduledValues(ctx.currentTime);
      nodes.out.gain.linearRampToValueAtTime(muted ? 0 : 0.55, ctx.currentTime + 0.3);
    }
    $('#btnMute').style.opacity = muted ? '.45' : '1';
  });

  /* ---------- 信箱（GitHub Issues 当数据库） ---------- */
  const REPO = 'byuyan/nest';
  const API = `https://api.github.com/repos/${REPO}/issues?state=all&per_page=30`;
  const NEW_ISSUE = `https://github.com/${REPO}/issues/new`;

  function timeAgo(iso) {
    const t = new Date(iso).getTime();
    const d = Math.floor((Date.now() - t) / 1000);
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    if (d < 86400 * 30) return Math.floor(d / 86400) + ' 天前';
    const dt = new Date(iso);
    return `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())}`;
  }

  function renderGuest(items) {
    const list = $('#guestList');
    if (!items.length) {
      list.innerHTML = '<div class="guest__empty">信箱还是空的 —— 第一条留言留给你。</div>';
      return;
    }
    list.innerHTML = '';
    items.forEach((it) => {
      const el = document.createElement('div');
      el.className = 'noteb';
      const body = (it.body || '').trim() || it.title;
      el.innerHTML =
        '<div class="noteb__head">' +
        `<span class="noteb__ava">${(it.user.login || 'G')[0].toUpperCase()}</span>` +
        `<span class="noteb__name">${escapeHtml(it.title || it.user.login)}</span>` +
        `<span class="noteb__time">${timeAgo(it.created_at)}</span>` +
        '</div>' +
        `<p class="noteb__body">${escapeHtml(body).slice(0, 1200)}</p>` +
        '<p class="noteb__foot">来自 GitHub · ' + escapeHtml(it.user.login) + '</p>';
      list.appendChild(el);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function loadGuest() {
    const list = $('#guestList');
    try {
      const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(res.status);
      const items = (await res.json()).filter((i) => !i.pull_request);
      renderGuest(items);
      $('#statNotes').textContent = items.length;
      $('#guestMeta').textContent = `共 ${items.length} 条留言 · 存在 GitHub Issues 里`;
    } catch (e) {
      list.innerHTML = '<div class="guest__empty">暂时读不到留言（可能被 GitHub 限流），过一会儿刷新试试。</div>';
      $('#statNotes').textContent = '—';
      $('#guestMeta').textContent = '读取失败 · 稍后再试';
    }
  }

  function openWrite(text) {
    const body = (text || '').trim();
    const url = NEW_ISSUE + '?title=' + encodeURIComponent(body ? body.slice(0, 40) : '给小窝留句话') +
      (body ? '&body=' + encodeURIComponent(body + '\n\n— 来自小窝') : '');
    window.open(url, '_blank', 'noopener');
  }

  $('#btnWrite').addEventListener('click', () => openWrite($('#quickInput').value));
  $('#quickForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#quickInput').value.trim();
    if (!v) { $('#quickInput').focus(); return; }
    openWrite(v);
  });
  $('#btnCopy').addEventListener('click', async () => {
    const v = $('#quickInput').value.trim() || '（写你想说的话）';
    try {
      await navigator.clipboard.writeText(`给小窝留言：${v}`);
      $('#btnCopy').textContent = '已复制，去 GitHub 粘贴';
      setTimeout(() => ($('#btnCopy').textContent = '复制留言到剪贴板'), 2400);
    } catch (e) {}
  });

  /* ---------- 最近的脚印（真实提交） ---------- */
  async function loadCommits() {
    const el = $('#commits');
    try {
      const res = await fetch('https://api.github.com/repos/byuyan/byuyan.github.io/commits?per_page=3', {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error(res.status);
      const items = await res.json();
      el.innerHTML = '';
      items.forEach((c) => {
        const li = document.createElement('li');
        li.className = 'commit__item';
        li.innerHTML =
          `<p class="commit__msg">${escapeHtml(c.commit.message.split('\n')[0])}</p>` +
          `<p class="commit__time">${timeAgo(c.commit.author.date)}</p>`;
        el.appendChild(li);
      });
    } catch (e) {
      el.innerHTML = '<li class="commit__empty">GitHub 暂时没回应，晚点再看。</li>';
    }
  }

  /* ---------- 壁纸区块 ---------- */
  function buildWallGrid() {
    const grid = $('#wallsgrid');
    WALLS.forEach((w, i) => {
      const el = document.createElement('div');
      el.className = 'wcard';
      el.dataset.i = i;
      el.innerHTML =
        `<img src="${w.src}" alt="${w.name}" loading="lazy">` +
        '<div class="wcard__info">' +
        `<div><p class="wcard__name" style="margin:0">${w.name}</p><p class="wcard__desc" style="margin:0">${w.desc}</p></div>` +
        '<span class="wcard__use">用这张</span></div>';
      el.addEventListener('click', () => {
        prefs.wall = i;
        savePrefs();
        paintWall(false);
      });
      grid.appendChild(el);
    });
  }

  /* ---------- 设置 ---------- */
  const drawer = $('#drawer');
  const openDrawer = (open) => {
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
  };
  $('#btnSettings').addEventListener('click', () => openDrawer(true));
  $$('[data-close]').forEach((el) => el.addEventListener('click', () => openDrawer(false)));

  function buildSettings() {
    const wrap = $('#setWalls');
    WALLS.forEach((w, i) => {
      const img = document.createElement('img');
      img.src = w.src;
      img.alt = w.name;
      img.dataset.i = i;
      img.addEventListener('click', () => {
        prefs.wall = i;
        savePrefs();
        paintWall(false);
      });
      wrap.appendChild(img);
    });

    $('#set24').checked = prefs.hour24;
    $('#setSec').checked = prefs.sec;
    $('#setGlass').value = prefs.glass;
    $('#setAuto').checked = prefs.auto;
    document.documentElement.style.setProperty('--glass', prefs.glass / 100);

    $('#set24').addEventListener('change', (e) => {
      prefs.hour24 = e.target.checked;
      savePrefs();
      firstTick = true;
      tick();
    });
    $('#setSec').addEventListener('change', (e) => {
      prefs.sec = e.target.checked;
      savePrefs();
      applySec();
    });
    $('#setGlass').addEventListener('input', (e) => {
      prefs.glass = +e.target.value;
      document.documentElement.style.setProperty('--glass', prefs.glass / 100);
      savePrefs();
    });
    $('#setAuto').addEventListener('change', (e) => {
      prefs.auto = e.target.checked;
      savePrefs();
      if (prefs.auto) togglePlay(true);
    });
    $('#btnReset').addEventListener('click', () => {
      prefs = { ...DEFAULTS };
      savePrefs();
      document.documentElement.style.setProperty('--glass', prefs.glass / 100);
      $('#set24').checked = true;
      $('#setSec').checked = true;
      $('#setGlass').value = prefs.glass;
      $('#setAuto').checked = false;
      firstTick = true;
      tick();
      applySec();
      paintWall(false);
    });
  }

  function applySec() {
    digits.forEach((d, i) => {
      d.parentElement.style.display = prefs.sec || i < 4 ? '' : 'none';
    });
    seps.forEach((s, i) => (s.style.display = prefs.sec || i < 1 ? '' : 'none'));
  }

  /* ---------- AI 小助手 ---------- */
  const AI = [
    {
      k: ['你是谁', '谁', '介绍'],
      a: '我是这间小窝的看门人。屋子主人叫郑宇彬，武汉理工大学数字经济的大二学生，喜欢把抽象的东西做成看得见的样子。',
    },
    {
      k: ['怎么搭', '怎么做', '技术', '原理', '实现'],
      a: '没用任何框架：翻页时钟是 CSS 3D 一片片转出来的，唱片机里的声音是浏览器实时合成的（所以没有音频文件），留言存在 GitHub Issues 里。',
    },
    {
      k: ['留言', '信箱', '写信'],
      a: '点顶部的「信箱」就能看到所有人写的话。写留言会跳到 GitHub 的留言页，登录一次 GitHub 就能发；不登录也能先看完别人写的。',
    },
    {
      k: ['壁纸', '背景', '换'],
      a: '三张蓝莓微距都是我生成的，暗调、低饱和。右上角齿轮里、或者「壁纸」那一栏点一下就能换，会记住你的选择。',
    },
    {
      k: ['作品', '项目', '简历'],
      a: '完整的作品集在 byuyan.github.io —— 那边是另一套气质：低饱和灰豆绿，还有个会转头的 3D 黏土男孩。',
    },
    {
      k: ['音乐', '歌', '声音'],
      a: '现在是两条实时合成的环境音：一条是夜晚的低频垫音，一条是清晨的雾气声。换成真实歌曲的话，把 mp3 放进 assets 再改一下歌单就行。',
    },
  ];

  const chatEl = $('#aiChat');
  const panel = $('#aiPanel');

  function pushMsg(text, mine) {
    const el = document.createElement('div');
    el.className = 'msg ' + (mine ? 'msg--me' : 'msg--ai');
    el.textContent = text;
    chatEl.appendChild(el);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function answer(text) {
    const q = text.replace(/\s/g, '');
    const hit = AI.find((item) => item.k.some((k) => q.includes(k)));
    if (hit) return hit.a;
    return '这个我还答不上来。你可以去「信箱」留一句话，或者直接去 GitHub 找我 —— 我不太会聊天，但会认真看留言。';
  }

  function buildQuick() {
    const quick = $('#aiQuick');
    ['你是谁', '怎么搭的', '留言在哪看', '壁纸能换吗'].forEach((q) => {
      const b = document.createElement('button');
      b.textContent = q;
      b.addEventListener('click', () => {
        pushMsg(q, true);
        setTimeout(() => pushMsg(answer(q), false), 260);
      });
      quick.appendChild(b);
    });
  }

  $('#aiFab').addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    panel.setAttribute('aria-hidden', String(!open));
    if (open && !chatEl.childElementCount) {
      pushMsg('嗨，这里是小窝。想问这间屋子的什么？', false);
    }
  });
  $('#aiForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#aiInput').value.trim();
    if (!v) return;
    $('#aiInput').value = '';
    pushMsg(v, true);
    setTimeout(() => pushMsg(answer(v), false), 300);
  });

  /* ---------- 滚动高亮 ---------- */
  const navItems = $$('.nav__item');
  const sections = ['home', 'mail', 'walls', 'about'].map((id) => $('#' + id));
  const onScroll = () => {
    const y = window.scrollY + window.innerHeight * 0.35;
    let active = 'home';
    sections.forEach((s) => {
      if (s && s.offsetTop <= y) active = s.id;
    });
    navItems.forEach((n) => n.classList.toggle('on', n.getAttribute('href') === '#' + active));
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 键盘 ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      openDrawer(false);
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  /* ---------- 启动 ---------- */
  buildClock();
  buildPlaylist();
  buildWallGrid();
  buildSettings();
  buildQuick();
  applySec();
  paintWall(true);
  paintDate();
  tick();
  paintPlayer();
  setInterval(() => {
    tick();
    paintDate();
  }, 1000);
  loadGuest();
  loadCommits();
  document.getElementById('statWalls').textContent = WALLS.length;

  // 页面可见时暂停计时器，回来继续
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) togglePlay(false);
  });

  // ?scroll=mail 之类的直链，方便截图与分享锚点
  const jump = new URLSearchParams(location.search).get('scroll');
  if (jump) {
    const target = document.getElementById(jump);
    if (target) {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, target.offsetTop);
      setTimeout(() => (document.documentElement.style.scrollBehavior = ''), 300);
    }
  }
})();
