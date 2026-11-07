# GitHub Pages publication

## Addresses

- **Restaurant app:** https://kampalanalf-sudo.github.io/tank-distro/juicy-chicken/
- **Admin:** https://kampalanalf-sudo.github.io/tank-distro/juicy-chicken/#admin
- **Rider GPS:** https://kampalanalf-sudo.github.io/tank-distro/juicy-chicken/#rider
- **Customer tracking:** https://kampalanalf-sudo.github.io/tank-distro/juicy-chicken/#track
- **Preserved original homepage:** https://kampalanalf-sudo.github.io/tank-distro/

The user selected a **new sub-page**, not replacement of the existing homepage. GitHub Pages hosts only one deployment artifact per repository, so the workflow publishes both applications together.

## Build and deployment

`.github/workflows/deploy-pages.yml`:

1. Checks out the current restaurant source.
2. Separately checks out the original homepage's deployed source commit `bc5ffe7537ad2acdaa1e20bd0509cfb482203c9e` into `.legacy-homepage/`. The session's Git branch is not changed.
3. Tests and builds the restaurant using `npm ci`, `npm test` and `npm run build`.
4. Builds the preserved original app using its own dependencies and build command.
5. Copies the original build to the Pages artifact root, and the restaurant build into `juicy-chicken/`.
6. Deploys one artifact containing both sites. Local build directories are ignored by Git.

Vite uses a relative base (`./`), so fonts, food photographs, logo and manifest work under the nested URL. The admin/rider/tracking routes use URL fragments and need no server rewrites. The HTTPS Pages origin supports browser geolocation; the rider must still consent and keep the page visible.

The repository's Pages source must be set to **GitHub Actions**. The old standalone Jekyll workflow is removed/disabled to avoid overwriting the combined artifact. The Pages environment must allow deployments from the active publication branch `arena/40771494-tank-distro`. Pushes to that branch rebuild and republish both applications. A manual workflow run can also be used with that branch selected.

The pinned original homepage remains independent from the restaurant app. To deliberately update the original site's source in the future, change `HOMEPAGE_REF` to the intended original-site commit and redeploy. Never publish only the restaurant artifact to this repository's Pages deployment: that would remove the preserved root homepage.

## Backend and staff sign-in

The restaurant continues to use the dedicated Supabase project documented in [DELIVERY_SETUP.md](DELIVERY_SETUP.md), not GitHub Pages as an API server. Only the publishable key is in the browser bundle. No database passwords, private backend keys, or GitHub credentials are committed.

Supabase's Site URL and allowed confirmation redirect URLs must include the exact restaurant Pages URL above. Preview/local redirects may remain available for development. Staff accounts still require verification and explicit role activation; deployment does not create an admin password or bypass authentication.

Menu/prices remain sample content until confirmed by the restaurant owner. Staff onboarding, production SMTP, anti-abuse protection, and real-device delivery testing remain necessary before public operations.

## One-time settings change required

The connected GitHub integration returned HTTP 403 when updating Pages settings and the environment deployment branch policy. The source and builds are prepared, but these changes must be made by a repository administrator:

1. Open https://github.com/kampalanalf-sudo/tank-distro/settings/pages and set **Build and deployment → Source → GitHub Actions**.
2. Open https://github.com/kampalanalf-sudo/tank-distro/settings/environments, select **github-pages**, and allow **arena/40771494-tank-distro** under deployment branches/tags. To prevent old `main` workflows from replacing the combined site, use this publication branch as the allowed branch. This does not change repository branch protection.
3. Run the **Publish restaurant and existing homepage** workflow with that branch selected, or ask the agent to rerun it after the settings are saved.

The old standalone Jekyll workflow was successfully disabled, but the integration could not change the Pages source or branch rule. Do not claim the new URL is live until its deployment succeeds.
