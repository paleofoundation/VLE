# F16 targeted dependency patches

The first commit records two failing installed/lockfile version checks. This patch pins Next and its matching ESLint configuration to 16.4.1 and overrides every Sharp consumer to 0.35.5, replacing the old Miniflare-only 0.35.4 override. Next's matching env/SWC/plugin packages and Sharp's native/libvips artifacts change with their parent releases. No unrelated package versions change.

Primary advisory basis:

- [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) identifies a conditional remote-code-execution issue in Next App Router Cache Components returning multiple typed arrays, with 16.4.1 as the patched release.
- [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) identifies an upstream image memory-safety issue with possible remote code execution on glibc Linux. It lists Next 16.4.1 and Sharp at least 0.35.5 as fixes.

VLE builds a Vinext Cloudflare Worker. Source inspection found no use-cache functions or direct Next image/server or Sharp imports in application source. That limits what can be inferred about exposure: these checks prove patched versions and compatibility, not a reproduced application exploit or a blanket dependency-security PASS. No production runtime was probed.

The shared node_modules symlink was removed before installation. A fresh npm ci in this isolated clone, including optional/dev dependencies with lifecycle scripts disabled, succeeds. installed-tree.txt shows Next 16.4.1 and Sharp 0.35.5 used by Next and Miniflare. All locked copies and the installed runtime pass regression floors. A synthetic 2 by 2 image proves the patched native Sharp runtime still loads and produces PNG data.

The production build, every VLE test file and focused lint pass. All database/storage fixtures are disposable and all provider/mail requests are intercepted. No production data, migration, deployment, merge, real issuance or message. Receiver remains OFF. Evidence: red.txt, green.txt, install.txt, installed-tree.txt, build.txt, suite.txt and lint.txt.
