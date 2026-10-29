// ==UserScript==
// @name         Strip Link Trackers 
// @namespace    https://example.local/unified-tracker-stripper
// @version      2.0
// @description  Strips tracking parameters (utm_*, fbclid, gclid, X/Twitter s=&t=, YouTube si=, etc.) from the page URL before page scripts run, from SPA navigations, and from links on hover/click/right-click/drag. Also unwraps Google/Facebook/YouTube redirect links.
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @noframes
// @license      MIT
// @author       Shubh Madhavan
// ==/UserScript==

(function () {
  'use strict';

  // Sites where the script does nothing at all (add hosts that break).
  const DISABLED_HOSTS = [
    // 'example.com',
  ];

  // Removed on EVERY site (compared lowercase).
  const GLOBAL_PARAMS = new Set([
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'msclkid',
    'yclid', 'twclid', 'ttclid', 'li_fat_id', 'igshid', 'igsh',
    '_hsenc', '_hsmi', 'hsctatracking', 'mc_cid', 'mc_eid', 'mkt_tok',
    '_openstat', 'oly_enc_id', 'oly_anon_id', 'rb_clickid', 'vero_id',
    'vero_conv', 'wickedid', 'sccid', 's_cid', 'ncid', 'ocid', 'cmpid',
    'trk_contact', 'trk_msg', 'trk_module', 'trk_sid', 'epik', '_ga', '_gl',
    'zanpid', 'irclickid', 'cjevent', 'ss_source', 'ss_campaign_id',
    'ss_email_id', 'mibextid', 'sref',
  ]);

  // Any param starting with these is removed everywhere (lowercase).
  const GLOBAL_PREFIXES = ['utm_', '__hs', 'pk_', 'mtm_', 'piwik_', 'matomo_'];

  // Per-site rules. `host`: domains (subdomains included).
  // `params`: exact names, `prefixes`: name prefixes, `fn(key, val, ctx)`: custom.
  const SITE_RULES = [
    {
      // X / Twitter share trackers: ?s=19 (Android) ?s=20 (iOS) ?s=46 (web)
      // ?s=21 etc. and ?t=<token>
      host: ['x.com', 'twitter.com', 'fxtwitter.com', 'vxtwitter.com',
             'fixupx.com', 'fixvx.com', 'nitter.net'],
      params: ['ref_src', 'ref_url', 'cxt', 'twclid'],
      fn: (k, v, ctx) => {
        if (k === 's' && /^\d{1,3}$/.test(v)) return true;
        if (k === 't' && (ctx.keys.has('s') || /\/status\//.test(ctx.path))) return true;
        return false;
      },
    },
    {
      host: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
      params: ['si', 'pp', 'feature', 'ab_channel', 'embeds_referring_euri',
               'source_ve_path', 'themeRefresh'],
    },
    {
      host: ['spotify.com', 'spotify.link'],
      params: ['si', 'pt', 'nd', 'dlsi', 'sp_cid', 'go'],
      prefixes: ['_branch_'],
    },
    { host: ['instagram.com'], params: ['igsh', 'igshid', 'img_index'] },
    {
      host: ['tiktok.com'],
      params: ['_r', '_t', 'is_from_webapp', 'sender_device', 'sender_web_id',
               'social_sharing', 'checksum', 'tt_from', 'u_code', 'refer',
               'enter_method', 'enter_from'],
      prefixes: ['share_'],
    },
    {
      host: ['facebook.com', 'fb.com', 'fb.watch', 'm.facebook.com'],
      params: ['mibextid', 'rdid', 'sfnsn', 'ref', '__tn__', 'comment_tracking',
               'notif_id', 'notif_t', 'refsrc', 'hc_ref', 'fref', 'acontext',
               'eav', 'paipv', 'share_url'],
      prefixes: ['__cft__'],
    },
    {
      host: ['reddit.com', 'redd.it'],
      params: ['share_id', 'ref', 'ref_source', 'correlation_id', 'rdt_cid',
               '$deep_link', '$3p', '$original_url', 'context', 'utm_name'],
    },
    {
      host: ['linkedin.com'],
      params: ['trk', 'trkinfo', 'trackingid', 'lipi', 'lici', 'midtoken',
               'midsig', 'eid', 'otptoken', 'refid', 'original_referer',
               'trkemail', 'rcm'],
    },
    {
      host: ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.de', 'amazon.ca',
             'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.co.jp', 'amazon.com.au',
             'amzn.to', 'amzn.in'],
      params: ['tag', 'linkcode', 'linkid', 'ascsubtag', 'content-id', 'qid',
               'sr', 'dib', 'dib_tag', 'crid', 'sprefix', 'ref_', 'ref',
               'pd_rd_i', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 'pf_rd_p', 'pf_rd_r',
               'pf_rd_s', 'pf_rd_t', 'pf_rd_i', 'pf_rd_m', 'smid', 'th_'],
      prefixes: ['pf_rd_', 'pd_rd_'],
    },
    {
      host: ['flipkart.com'],
      params: ['otracker', 'otracker1', 'lid', 'iid', 'ssid', 'srno', 'qh', 'fm',
               'affid', 'affextparam1', 'affextparam2', 'cmpid', 'marketplace'],
      prefixes: ['otracker'],
    },
    {
      host: ['ebay.com', 'ebay.in', 'ebay.co.uk', 'ebay.de'],
      params: ['mkevt', 'mkcid', 'mkrid', 'campid', 'toolid', 'customid',
               'mkscid', 'amdata', '_trkparms', '_trksid', 'itmmeta', 'itmprp',
               'hash', 'var'],
    },
    {
      host: ['google.com', 'google.co.in', 'google.co.uk', 'google.de'],
      params: ['ved', 'ei', 'gs_lcrp', 'gs_lcp', 'sca_esv', 'sxsrf', 'gs_lp',
               'uact', 'oq', 'sclient', 'bih', 'biw', 'iflsig', 'source', 'sa',
               'usg', 'cd', 'rct'],
    },
    {
      host: ['bing.com'],
      params: ['cvid', 'form', 'pq', 'qs', 'sp', 'sk', 'ghsh', 'ghacc', 'ghpl',
               'ntref', 'ssp', 'setlang'],
    },
    { host: ['medium.com'], params: ['source', 'sk', 'gi'] },
    { host: ['substack.com'], params: ['r', 'publication_id', 'post_id', 'isfreemail', 'triedredirect'] },
    { host: ['quora.com'], params: ['share', '__nsrc__', '__ncs__'] },
    { host: ['pinterest.com', 'pin.it'], params: ['invite_code', 'sender', 'sfo'] },
    { host: ['twitch.tv'], params: ['sr', 'tt_content', 'tt_medium'] },
    { host: ['github.com'], params: ['notification_referrer_id', 'notifications_query'] },
  ];

  // Redirect wrappers: [host test, path test, param that holds the real URL]
  const UNWRAPPERS = [
    { host: ['l.facebook.com', 'lm.facebook.com', 'l.messenger.com'], path: /^\/l\.php/, param: 'u' },
    { host: ['google.com', 'google.co.in', 'google.co.uk', 'google.de'], path: /^\/url$/, param: ['q', 'url'] },
    { host: ['youtube.com'], path: /^\/redirect$/, param: 'q' },
    { host: ['out.reddit.com'], path: /^\/.*/, param: 'url' },
    { host: ['steamcommunity.com'], path: /^\/linkfilter/, param: 'u' },
    { host: ['slack-redir.net'], path: /^\/link/, param: 'url' },
  ];

  /* ------------------------------------------------------------------ *
   *  CORE
   * ------------------------------------------------------------------ */

  const hostMatches = (h, list) =>
    list.some((d) => h === d || h.endsWith('.' + d));

  if (hostMatches(location.hostname, DISABLED_HOSTS)) return;

  const safeDecode = (s) => {
    try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s; }
  };

  // Pre-compile site rules into lowercase sets
  const RULES = SITE_RULES.map((r) => ({
    host: r.host,
    params: new Set((r.params || []).map((p) => p.toLowerCase())),
    prefixes: (r.prefixes || []).map((p) => p.toLowerCase()),
    fn: r.fn,
  }));

  function isTracker(key, val, ctx, rules) {
    const k = key.toLowerCase();
    if (GLOBAL_PARAMS.has(k)) return true;
    for (const p of GLOBAL_PREFIXES) if (k.startsWith(p)) return true;
    for (const r of rules) {
      if (r.params.has(k)) return true;
      for (const p of r.prefixes) if (k.startsWith(p)) return true;
      if (r.fn && r.fn(k, val, ctx)) return true;
    }
    return false;
  }

  // Returns a cleaned URL string, or the original string if nothing changed.
  function clean(input, base) {
    let url;
    try { url = new URL(input, base || location.href); } catch (e) { return input; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return input;
    if (!url.search || url.search === '?') return input;

    const host = url.hostname.toLowerCase();
    if (hostMatches(host, DISABLED_HOSTS)) return input;
    const rules = RULES.filter((r) => hostMatches(host, r.host));

    // Work on the RAW query so untouched params are never re-encoded.
    const parts = url.search.slice(1).split('&');
    const parsed = parts.map((p) => {
      const i = p.indexOf('=');
      return {
        raw: p,
        key: safeDecode(i === -1 ? p : p.slice(0, i)),
        val: safeDecode(i === -1 ? '' : p.slice(i + 1)),
      };
    });
    const ctx = {
      path: url.pathname,
      keys: new Set(parsed.map((x) => x.key.toLowerCase())),
    };
    const kept = parsed.filter((x) => x.raw && !isTracker(x.key, x.val, ctx, rules));
    if (kept.length === parts.length) return input;

    url.search = kept.length ? '?' + kept.map((x) => x.raw).join('&') : '';
    return url.href;
  }

  // Unwrap known redirect wrappers (l.facebook.com/l.php?u=..., google /url?q=...)
  function unwrap(input) {
    let url;
    try { url = new URL(input, location.href); } catch (e) { return input; }
    const host = url.hostname.toLowerCase();
    for (const w of UNWRAPPERS) {
      if (!hostMatches(host, w.host) || !w.path.test(url.pathname)) continue;
      const names = Array.isArray(w.param) ? w.param : [w.param];
      for (const n of names) {
        const target = url.searchParams.get(n);
        if (target && /^https?:\/\//i.test(target)) return target;
      }
    }
    return input;
  }

  /* ------------------------------------------------------------------ *
   *  1) Clean the current URL immediately (no reload, no history entry)
   *     Runs at document-start, so page scripts/analytics read a clean URL.
   * ------------------------------------------------------------------ */
  try {
    const cleaned = clean(location.href);
    if (cleaned !== location.href) {
      history.replaceState(history.state, '', cleaned);
    }
  } catch (e) { /* ignore */ }

  /* ------------------------------------------------------------------ *
   *  2) Clean SPA navigations (pushState / replaceState)
   * ------------------------------------------------------------------ */
  function wrapHistory(name) {
    const orig = history[name];
    if (typeof orig !== 'function') return;
    history[name] = function (state, title, url) {
      try {
        if (url != null && url !== '') url = clean(String(url));
      } catch (e) { /* ignore */ }
      return orig.call(this, state, title, url);
    };
  }
  wrapHistory('pushState');
  wrapHistory('replaceState');

  // Back/forward or hash changes that restore a dirty URL
  window.addEventListener('popstate', () => {
    try {
      const c = clean(location.href);
      if (c !== location.href) history.replaceState(history.state, '', c);
    } catch (e) { /* ignore */ }
  }, true);

  /* ------------------------------------------------------------------ *
   *  3) Clean links in the page right before they are used
   *     hover / touch / mousedown / click / middle-click / right-click / drag
   * ------------------------------------------------------------------ */
  function findAnchor(e) {
    const path = e.composedPath ? e.composedPath() : [];
    for (const el of path) {
      if (el && el.tagName === 'A' && el.hasAttribute && el.hasAttribute('href')) return el;
    }
    const t = e.target;
    return t && t.closest ? t.closest('a[href]') : null;
  }

  function scrubAnchor(a) {
    const href = a.href; // absolute
    if (!href) return;
    const next = clean(unwrap(href));
    if (next !== href) {
      try { a.href = next; } catch (e) { /* ignore */ }
    }
  }

  ['mouseover', 'touchstart', 'mousedown', 'click', 'auxclick', 'contextmenu',
   'dragstart', 'focusin', 'keydown'].forEach((type) => {
    window.addEventListener(type, (e) => {
      const a = findAnchor(e);
      if (a) scrubAnchor(a);
    }, { capture: true, passive: true });
  });

  /* ------------------------------------------------------------------ *
   *  4) Clean URLs the user copies via the page's own "share" buttons
   *     (navigator.clipboard.writeText / navigator.share)
   * ------------------------------------------------------------------ */
  // Cleans every http(s) URL found inside a block of text
  // (works for a bare link or a "Check this out: <link>" share message).
  function cleanText(text) {
    return text.replace(/https?:\/\/[^\s"'<>]+/g, (m) => clean(m));
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = (text) =>
        origWrite(typeof text === 'string' ? cleanText(text) : text);
    }

    // Fallback for sites that copy via a hidden textarea + execCommand('copy')
    // or the user pressing Ctrl+C / "Copy link" on selected text.
    document.addEventListener('copy', (e) => {
      try {
        if (!e.clipboardData) return;
        const el = document.activeElement;
        let text = '';
        if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') &&
            typeof el.selectionStart === 'number') {
          text = el.value.slice(el.selectionStart, el.selectionEnd);
        } else {
          text = String(window.getSelection());
        }
        if (!text) return;
        const cleaned = cleanText(text);
        if (cleaned !== text) {
          e.clipboardData.setData('text/plain', cleaned);
          e.preventDefault();
        }
      } catch (err) { /* ignore */ }
    }, true);

    if (navigator.share) {
      const origShare = navigator.share.bind(navigator);
      navigator.share = (data) => {
        if (data && data.url) data = Object.assign({}, data, { url: clean(String(data.url)) });
        return origShare(data);
      };
    }
  } catch (e) { /* ignore */ }
})();
