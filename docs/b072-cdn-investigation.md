# B072 CDN activation investigation

## Scope

This investigation used read-only provider requests on September 14, 2026, between approximately 06:57 and 07:04 UTC.
No purge, publication, deployment, tag change, or provider configuration change ran.
The [captured evidence](b072-cdn-evidence.json) contains response identities and relevant headers.

## Confirmed failure mechanism

The original public CSS URL returns an old response from the Cloudflare cache for `cdn.jsdelivr.net`.
The selected release bytes are present and correct on GitHub and through immutable CDN URLs.
Other CDN hostnames and a different repository-case spelling return the selected release.
The failed verification correctly rejected stale bytes.

| CSS request | Reported release | SHA-256 prefix | Cache result |
| --- | --- | --- | --- |
| `cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css` | `4.0.0` | `351bbf6c1505` | Cloudflare HIT |
| Same URL with the original verification query | `4.0.0` | `351bbf6c1505` | Same age and cached response |
| Same URL with a new diagnostic query | `4.0.0` | `351bbf6c1505` | Same cached response |
| `cdn.jsdelivr.net/gh/marcopoloresearchlab/mpr-ui@latest/mpr-ui.css` | `4.1.0` | `5af6a506dc3c` | Correct bytes |
| Original path on `fastly.jsdelivr.net` | `4.1.0` | `5af6a506dc3c` | Correct bytes |
| Original path on `testingcf.jsdelivr.net` | `4.1.0` | `5af6a506dc3c` | Correct bytes |
| Original repository spelling with `@v4.1.0` | `4.1.0` | `5af6a506dc3c` | Correct immutable bytes |

The stale response digest exactly matches `mpr-ui.css` at Git tag `v4.0.0`.
The correct response digest exactly matches that file at Git tag `v4.1.0`.
The remote tag identifies application commit `a53f949acd86f47520be423c201f61a769ffdac2`.
Requests with identity, gzip, and Brotli encoding all return the same stale decoded bytes through the failed URL.
This excludes a content-encoding-specific mismatch in the observed failure.

The stale response has `CF-Cache-Status: HIT` and `Cache-Control: public, max-age=604800, s-maxage=43200`.
Its `X-Cache: MISS, MISS` header describes the upstream response that Cloudflare cached.
It does not mean that each current request reaches an uncached origin.
The old script's changing query parameters do not bypass this cached response.

## Publication timing and probable trigger

GitHub reports publication of the release at `2026-09-14T05:49:13Z`.
The immutable CSS response reports an estimated origin time of `05:49:38Z` from its Date and Age headers.
The stale mutable CSS response reports an estimated origin time of `05:49:40Z`.
The operator's terminal reports failure at `05:50:35Z`, or `22:50:35` Pacific time on September 13.
The estimate measures response age. It does not prove an exact provider cache-write timestamp.

The old script purges all six URLs before its first immutable asset check.
It then verifies config, CSS, and JavaScript in that order.
It stops at the CSS failure, before JavaScript verification.
The correct mutable JavaScript observed after failure does not prove that the failed command verified that asset.

The leading trigger is a race between new release visibility and the provider's cached version list.
A jsDelivr maintainer describes this exact mechanism in [the provider investigation](https://github.com/jsdelivr/jsdelivr/issues/18376#issuecomment-1047040896).
An immediate purge can precede refresh of the internal version list.
The next asset request can then cache the previous release again for the normal asset lifetime.
The maintainer also states that [the version cache does not receive purge requests](https://github.com/jsdelivr/jsdelivr/issues/18376#issuecomment-1047874071).
Those statements describe provider behavior at their publication dates, not a newly verified internal implementation.

The timing and live responses support this explanation, but do not prove the original purge outcome.
The application discarded every purge response body and request identity.
The retained log cannot establish whether Cloudflare accepted the original invalidation, rejected it, or received a throttled request.
Provider logs for the original requests are necessary to distinguish those triggers conclusively.

## Confirmed application and Gateway defects

The failed application script treated HTTP success as sufficient purge evidence.
It discarded completion status, throttling, and individual provider results.
Its verification loop repeatedly read the same stale cache entry and then omitted the observed identity from the error.
Gateway B566 corrects the shared diagnostic defects. It does not change provider cache behavior.

The current migration also has a public URL identity gap.
The manifest gives Gateway the lowercase repository identity `marcopoloresearchlab/mpr-ui`.
Gateway uses that spelling to construct its delivery URLs.
The README and integration guide advertise `MarcoPoloResearchLab/mpr-ui`.
These spellings identify the same GitHub repository but different CDN cache entries in the observed responses.
A passing Gateway check of the lowercase URL does not establish freshness of the advertised mixed-case URL.

The provider confirms that [each URL updates independently](https://github.com/jsdelivr/jsdelivr/issues/18647#issuecomment-2889002421).
The delivery contract must identify and verify the exact public URLs that consumers use.
Canonical Git repository identity alone is insufficient acceptance evidence for those URLs.
A different spelling or backend that returns fresh content does not repair the original public URL.

## Independent metadata service observation

The public metadata API returns HTTP 500 for the lowercase repository path, with an embedded status 502.
The message is `Couldn't fetch versions for marcopoloresearchlab/mpr-ui.`
The equivalent mixed-case metadata path returns HTTP 200 and lists the selected release.
Control requests for another public GitHub package and an NPM package return HTTP 200.
GitHub's own tag API also returns the selected tag and commit.

This is another observed difference between repository-case spellings in provider requests.
It is not proof that the CDN uses that public metadata endpoint or encountered the same error during publication.
Do not substitute the public metadata API result for verification of the actual delivery URL.

## Why rollback never ran

B073 and Gateway B567 describe a separate transaction defect.
The failed application's Makefile runs the CDN script after Gateway records a successful publication receipt.
The script has no previous accepted release, restoration operation, or restored-state check.
F014 moves CDN verification into Gateway publication, but its failure path still returns without restoration.
The F014 requirements explicitly preserve publication and permit a later retry.
That behavior does not implement the operator's all-or-nothing delivery contract.

Gateway deployment treats the CDN resource as a passive published artifact.
Its desired-state failure path also retains the submitted generation without restoring a previous accepted generation.
Neither path supplies the missing activation transaction.
The provider's purge API clears individual cache entries and has no input that selects a previous accepted release.
The generic correction must control complete release activation and verify restoration after failure.

## Required correction boundaries

- Separate canonical repository identity from the exact public delivery URLs.
- Verify immutable assets before the first mutable provider operation.
- Require native provider completion evidence and verify the actual consumer-facing URLs.
- Account for provider version visibility and asset-cache state as separate boundaries.
- Preserve the original failure evidence through the complete lifecycle.
- Put complete release activation and verified restoration under the generic Gateway transaction.
- Keep B072 and B567 open until those contracts have implementation and acceptance evidence.

Changing URL case, adding query parameters, increasing a fixed delay, or requesting another operator retry is not the contract correction.
