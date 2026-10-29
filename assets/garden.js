/* The Infinite Garden — progressive enhancement only · by the ʻohana */
(() => {
  'use strict';

  // Load the official ETHGlobal player only after an explicit play action.
  const facade = document.querySelector('.video-facade[data-video-id]');
  if (facade) {
    facade.addEventListener('click', () => {
      const id = facade.dataset.videoId;
      if (!/^[\w-]{11}$/.test(id)) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = 'How Ethereum Grows Without a Center | Aya Miyaguchi and Tomo Saito at Pragma Tokyo 2026 — ETHGlobal';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      facade.replaceWith(iframe);
    }, { once: true });
  }

  const tabs = Array.from(document.querySelectorAll('.feed-tab[data-tab]'));
  const panels = {
    note: document.getElementById('ftPaneNote'),
    drive: document.getElementById('ftPaneDrive')
  };
  let activeTab = 'note';

  function selectTab(name, moveFocus = false) {
    if (!panels[name]) return;
    activeTab = name;
    tabs.forEach((tab) => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    });
    Object.entries(panels).forEach(([key, panel]) => { panel.hidden = key !== name; });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        event.preventDefault();
        selectTab(tabs[next].dataset.tab, true);
      }
    });
  });

  const API = 'https://pit-intake.shakaverse.workers.dev';
  const PIT = 'gard';
  const form = document.getElementById('garden-form');
  const send = document.getElementById('ftSend');
  const status = document.getElementById('ftStatus');
  const tray = document.getElementById('ftTray');
  const byId = (id) => document.getElementById(id);

  function say(message, bad = false) {
    status.textContent = message;
    status.classList.toggle('bad', bad);
  }

  function safeExternalUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, API);
      if (url.protocol !== 'https:') return null;
      return url.href;
    } catch (_) { return null; }
  }

  function entryCard(entry) {
    const card = document.createElement('article');
    card.className = 'tribute-card';
    const text = entry.note || (entry.type === 'note' ? entry.text : '');
    if (text) {
      const quote = document.createElement('blockquote');
      quote.textContent = text;
      card.appendChild(quote);
    }

    const mediaUrl = safeExternalUrl(entry.driveUrl || entry.previewUrl || entry.url);
    if (entry.type !== 'note' && mediaUrl) {
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open the shared recording ↗';
      card.appendChild(link);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = entry.from || entry.name || 'an anonymous gardener';
    let date = '';
    const parsed = new Date(entry.ts || entry.createdAt || '');
    if (!Number.isNaN(parsed.getTime())) {
      date = ' · ' + new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(parsed);
    }
    meta.textContent = `planted by ${name}${date}`;
    card.appendChild(meta);
    return card;
  }

  async function loadFeed() {
    try {
      const response = await fetch(`${API}/feed?pit=${PIT}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('feed unavailable');
      const data = await response.json();
      if (!data.ok || !Array.isArray(data.entries)) throw new Error('feed unavailable');
      tray.replaceChildren();
      if (!data.entries.length) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = 'Nothing shelved yet — the first flower can be yours.';
        tray.appendChild(empty);
        return;
      }
      data.entries.forEach((entry) => tray.appendChild(entryCard(entry)));
    } catch (_) {
      const quiet = document.createElement('p');
      quiet.className = 'muted';
      quiet.textContent = 'The public tray is quiet right now. The garden door remains open; please check back later.';
      tray.replaceChildren(quiet);
    }
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const from = byId('ftFrom').value.trim();
      let payload;

      if (activeTab === 'drive') {
        const driveUrl = byId('ftUrl').value.trim();
        let parsed;
        try { parsed = new URL(driveUrl); } catch (_) { parsed = null; }
        if (!parsed || parsed.protocol !== 'https:' || parsed.hostname !== 'drive.google.com') {
          say('Please paste a public https://drive.google.com recording link.', true);
          byId('ftUrl').focus();
          return;
        }
        const note = byId('ftNote').value.trim();
        payload = { pit: PIT, type: 'drive', driveUrl, note: note || undefined, from: from || undefined };
      } else {
        const text = byId('ftText').value.trim();
        if (!text) {
          say('Write a few words first — even one sincere sentence is enough.', true);
          byId('ftText').focus();
          return;
        }
        payload = { pit: PIT, type: 'note', text, from: from || undefined };
      }

      send.disabled = true;
      say('The garden is taking it in…');
      try {
        const response = await fetch(`${API}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.hint || data.error || 'The garden gently declined this gift.');
        say('Planted with gratitude. Your tribute is now in the public tray.');
        byId('ftText').value = '';
        byId('ftUrl').value = '';
        byId('ftNote').value = '';
        if (data.entry) tray.prepend(entryCard(data.entry));
        await loadFeed();
      } catch (error) {
        say(error.message || 'The signal dropped. Please try again in a breath.', true);
      } finally {
        send.disabled = false;
      }
    });
    loadFeed();
  }
})();
