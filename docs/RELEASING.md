# Releasing MDora

End-to-end procedure to ship a new MDora version. Follow it linearly. Every command assumes the working directory is `~/workspace/mdora`.

## Prerequisites

One-time setup, already done on the maintainer's machine:

- `gh` CLI authenticated against `Greg-Klein/MDora` (`gh auth status` to verify).
- `.env.signing.local` at the repo root, exporting the Apple Developer ID credentials consumed by `npm run build:signed`. Not in git.
- Apple Developer ID Application certificate installed in the login keychain (`Developer ID Application: Gregory Klein (M8Y4R5QV9X)`).
- Notarization credentials (Apple ID + app-specific password, or notarytool keychain profile) reachable from the same env file.

If `npm run build:signed` cannot find the identity or fails to notarize, fix that before continuing. Don't ship an unsigned DMG.

## Branching model

Git flow. `master` is production, `develop` is integration. Releases always come out of a `master` tag.

- Day-to-day work lands on `develop`.
- A release merges `develop` into `master` with a no-fast-forward commit, tags `master`, then fast-forwards `develop` back to `master`.
- Hotfixes are the same flow but start from a `hotfix/x.y.z` branch off `master`.

Never tag `develop`. Never push directly to `master` outside the release flow.

## Version scheme

SemVer. Patch bump for a single shipped feature or fix (`0.2.3` → `0.2.4`). Minor bump when a release groups multiple features or breaks something user-facing in a meaningful way. No major bump until 1.0.

The version string lives in **four** files. All four must move together:

- `package.json` (`version`)
- `src-tauri/tauri.conf.json` (`version`)
- `src-tauri/Cargo.toml` (`[package].version`)
- `src-tauri/Cargo.lock` (the `mdora` package entry, _not_ the unrelated crates that may share the same number)

## Step-by-step

Replace `0.2.4` below with the actual target version.

### 1. Confirm `develop` is green and synced

```bash
git checkout develop
git pull origin develop
npm test
npx tsc --noEmit
```

Tests must pass. Type check must pass. If you touched user-facing behavior, also run `npm run tauri dev` and exercise it manually.

### 2. Update README and the Obsidian note

Per the workspace rule, every shipped change updates both:

- `README.md` (the Features bullet list at minimum)
- `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault/Projects/MDora/Features.md` (detailed write-up under "Post-v0.1")

If you forgot during the original feature commit, add the doc commit on `develop` now.

### 3. Bump the version

Edit the four files listed in "Version scheme" and set them all to the new number. For `Cargo.lock`, locate the entry whose `name = "mdora"` (multiple unrelated crates may legitimately have a `version = "0.2.x"` line for their own version, leave those alone).

Commit with the established message style:

```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "bump version to 0.2.4"
git push origin develop
```

### 4. Merge `develop` into `master`

```bash
git checkout master
git pull origin master
git merge --no-ff develop -m "merge develop: <one-line summary> (v0.2.4)"
git push origin master
```

`--no-ff` is required: it preserves the release boundary in the history. Don't squash.

### 5. Tag and push the tag

```bash
git tag -a v0.2.4 -m "v0.2.4: <one-line summary>"
git push origin v0.2.4
```

Tag prefix is always `v`. Annotated tag, never lightweight.

### 6. Create the GitHub release

```bash
gh release create v0.2.4 --title "v0.2.4" --notes "$(cat <<'EOF'
## What's new

- <one bullet per user-visible change, plain English, no jargon>

## Install

Download `MDora_0.2.4_aarch64.dmg` below.
EOF
)"
```

The release is created without assets at this point. The update-detection feature on the client only surfaces a release once it has a strictly greater `tag_name`, drafts and prereleases ignored, so existing users will see the banner as soon as this command returns. They will see "Download" before the DMG is uploaded if you stop here. Don't stop here.

### 7. Build the signed DMG

```bash
npm run build:signed
```

This sources `.env.signing.local`, runs `npm run tauri build`, signs the `.app` and `.dmg` with the Developer ID identity, and runs notarytool. Takes ~3 minutes on Apple Silicon. The artifact lands at:

```
src-tauri/target/release/bundle/dmg/MDora_0.2.4_aarch64.dmg
```

The build produces a single arm64 DMG. Intel and Linux builds are not part of the standard release flow; advise users to build from source if needed.

### 8. Upload the DMG to the release

```bash
gh release upload v0.2.4 src-tauri/target/release/bundle/dmg/MDora_0.2.4_aarch64.dmg
```

Verify:

```bash
gh release view v0.2.4 --json assets
```

You should see one asset, `MDora_0.2.4_aarch64.dmg`, content type `application/x-apple-diskimage`, size around 5–6 MB.

### 9. Sync `develop` back to `master`

```bash
git checkout develop
git merge master --ff-only
git push origin develop
```

This brings the version-bump and merge commits onto `develop` so the next feature branches off the right base.

### 10. Update the Obsidian release log

Append a new section at the top of:

```
~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault/Projects/MDora/Releases.md
```

Format follows the existing entries: `## vX.Y.Z — YYYY-MM-DD`, then a one-line summary, the `### Features` / `### Bugfix` / `### Security` blocks copied from the GitHub release, and a `### Notes locales` block linking to the matching `[[Features#...]]` heading.

## Smoke test (optional but recommended)

After the DMG is uploaded:

```bash
open src-tauri/target/release/bundle/dmg/MDora_0.2.4_aarch64.dmg
```

Drag MDora to a scratch location (not `/Applications` if that one is already running an older copy), launch it, open a markdown file, exercise the new feature. The update banner should _not_ appear (you're running the latest). Quit, then mount-test the DMG once more from `~/Downloads` after a fresh `gh release download v0.2.4` to confirm the published artifact actually opens on a clean Gatekeeper path.

## Rollback

If something is wrong with a published release:

1. Delete the GitHub release: `gh release delete v0.2.4 --yes` (this also clears the asset).
2. Delete the tag locally and on the remote: `git tag -d v0.2.4 && git push origin :refs/tags/v0.2.4`.
3. Revert the merge commit on `master` if the code itself is bad: `git revert -m 1 <merge-sha>` then push, then re-sync `develop`.

The update-detection client uses semver strict-greater comparison and has a per-version localStorage dismissal key, so a deleted bad release does not poison anyone who already saw the banner; they will see the next good release normally.

## Quick reference

```bash
# from a clean develop with the new version committed
git checkout master && git pull origin master
git merge --no-ff develop -m "merge develop: <summary> (vX.Y.Z)"
git push origin master
git tag -a vX.Y.Z -m "vX.Y.Z: <summary>"
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file release-notes.md
npm run build:signed
gh release upload vX.Y.Z src-tauri/target/release/bundle/dmg/MDora_X.Y.Z_aarch64.dmg
git checkout develop && git merge master --ff-only && git push origin develop
```
