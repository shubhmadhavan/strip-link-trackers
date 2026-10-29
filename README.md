# Strip Link Trackers

A single userscript that removes tracking parameters from URLs on every website: from the address bar, from links on the page, and from anything you copy or share.

It runs at `document-start`, so the page's own scripts and analytics see a clean URL from the very first moment. There is no reload and no extra history entry.

## Features

- **Cleans the current page URL** immediately using `history.replaceState` (no redirect, no second page load).
- **Cleans single-page-app navigation** by wrapping `history.pushState` / `history.replaceState` and handling `popstate`.
- **Cleans links before you use them**: on hover, touch, click, middle-click, right-click, drag and keyboard focus, so "Copy link address" and "Open in new tab" give clean URLs.
- **Cleans copied and shared links**: hooks `navigator.clipboard.writeText`, `navigator.share`, and the `copy` event (Ctrl+C, hidden-textarea copy buttons). Every URL inside copied text is cleaned, not just bare links.
- **Unwraps redirect links** (Google `/url?q=`, `l.facebook.com/l.php?u=`, YouTube `/redirect`, Reddit `out.reddit.com`, Steam linkfilter, Slack redirect) so you go straight to the real destination.
- **Leaves everything else untouched**: it edits the raw query string, so parameters it keeps are never re-encoded.

## Install

1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open `tracker-stripper.user.js` in your browser (or create a new script in the manager and paste the contents).
3. Confirm the install. The script is active on all `http(s)` sites immediately.

> Tip: in Tampermonkey, make sure the script is set to run at `document-start` (it is by default via the metadata block).

## What gets removed

### On every site

- Prefixes: `utm_*`, `__hs*`, `pk_*`, `mtm_*`, `piwik_*`, `matomo_*`
- Click IDs: `fbclid`, `gclid`, `gclsrc`, `dclid`, `gbraid`, `wbraid`, `msclkid`, `yclid`, `twclid`, `ttclid`, `li_fat_id`, `igshid`, `igsh`, `epik`, `irclickid`, `cjevent`, `zanpid`
- Email/marketing: `mc_cid`, `mc_eid`, `mkt_tok`, `_hsenc`, `_hsmi`, `vero_id`, `vero_conv`, `oly_enc_id`, `oly_anon_id`, `rb_clickid`, `wickedid`
- Other: `_openstat`, `_ga`, `_gl`, `ncid`, `ocid`, `cmpid`, `mibextid`, `sref`

### Site-specific

| Site | Parameters removed |
|---|---|
| X / Twitter (also fxtwitter, vxtwitter, fixupx, nitter) | `s` (numeric share-source code: 19 = Android, 20 = iPhone, 21, 46 = web), `t` (share token, only on `/status/` links or alongside `s`), `ref_src`, `ref_url`, `cxt` |
| YouTube | `si`, `pp`, `feature`, `ab_channel`, `embeds_referring_euri`, `source_ve_path` |
| Spotify (`open.spotify.com`, `spotify.link`) | `si`, `pt`, `nd`, `dlsi`, `sp_cid`, `go`, `_branch_*` (e.g. `_branch_match_id`, `_branch_referrer`) |
| Instagram | `igsh`, `igshid`, `img_index` |
| TikTok | `_r`, `_t`, `is_from_webapp`, `sender_device`, `sender_web_id`, `share_*`, `social_sharing`, `checksum`, `tt_from`, `u_code`, `refer`, `enter_method`, `enter_from` |
| Facebook | `mibextid`, `rdid`, `sfnsn`, `ref`, `__tn__`, `__cft__*`, `comment_tracking`, `notif_id`, `notif_t`, `refsrc`, `hc_ref`, `fref`, `acontext` |
| Reddit | `share_id`, `ref`, `ref_source`, `correlation_id`, `rdt_cid`, `$deep_link`, `$3p`, `$original_url`, `context` |
| LinkedIn | `trk`, `trkInfo`, `trackingId`, `lipi`, `lici`, `midToken`, `midSig`, `eid`, `otpToken`, `refId`, `original_referer` |
| Amazon (many regional domains) | `tag`, `linkCode`, `linkId`, `ascsubtag`, `content-id`, `qid`, `sr`, `crid`, `sprefix`, `ref`, `pd_rd_*`, `pf_rd_*`, `smid` |
| Flipkart | `otracker*`, `lid`, `iid`, `ssid`, `srno`, `qH`, `fm`, `affid`, `affExtParam1/2`, `cmpid` |
| eBay | `mkevt`, `mkcid`, `mkrid`, `campid`, `toolid`, `customid`, `mkscid`, `amdata`, `_trkparms`, `_trksid`, `itmmeta`, `itmprp` |
| Google | `ved`, `ei`, `gs_lcrp`, `gs_lcp`, `sca_esv`, `sxsrf`, `gs_lp`, `uact`, `oq`, `sclient`, `bih`, `biw`, `iflsig`, `source`, `sa`, `usg`, `cd`, `rct` |
| Bing | `cvid`, `form`, `pq`, `qs`, `sp`, `sk`, `ghsh`, `ghacc`, `ghpl`, `ntref` |
| Medium | `source`, `sk`, `gi` |
| Substack | `r`, `publication_id`, `post_id`, `isfreemail`, `triedredirect` |
| Quora | `share`, `__nsrc__`, `__ncs__` |
| Pinterest | `invite_code`, `sender`, `sfo` |
| Twitch | `sr`, `tt_content`, `tt_medium` |
| GitHub | `notification_referrer_id`, `notifications_query` |

Parameter names are matched case-insensitively.

## Customize

Open the script and edit the config block at the top:

- `GLOBAL_PARAMS`: exact parameter names removed everywhere.
- `GLOBAL_PREFIXES`: any parameter starting with one of these is removed everywhere.
- `SITE_RULES`: per-site rules. Each entry takes `host` (domains, subdomains included), `params` (exact names), `prefixes`, and an optional `fn(key, value, ctx)` for custom logic.
- `UNWRAPPERS`: redirect-wrapper links to unwrap.
- `DISABLED_HOSTS`: sites where the script does nothing. Add a hostname here if the script breaks a site.

Some per-site entries are aggressive (for example Amazon's `qid`/`sr`, or Google's `source`/`sa`/`oq`). If a site behaves oddly, trim those entries first.

## Limitations

- **It cannot stop the first request.** The browser has already sent the original URL, trackers included, to the server before any userscript runs. The script prevents page scripts and analytics from seeing the trackers, and stops them spreading through links, copying and sharing.
- **Browsers only.** It does not work in native apps such as the Spotify desktop/mobile app. For the Spotify desktop app, use a Spicetify extension instead.
- **Some clipboard paths may not be intercepted** (for example a site that copies through an unusual API). The address-bar and link cleaning still apply.
- **Trackers in the hash (`#...`) or path** are not touched.

### For true pre-request blocking

Use a browser-level feature alongside this script:

- Firefox: Query Parameter Stripping
- Brave: built-in URL parameter filtering
- [ClearURLs](https://clearurls.xyz/) extension
- uBlock Origin `removeparam` filters, for example:

```
||x.com^$removeparam=/^(s|t)$/,doc
```

## License

MIT
