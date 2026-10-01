# FactorGrad-GS project page

Static project page for the anonymous FactorGrad-GS manuscript. The hero figure,
method diagram, qualitative comparison, and paper PDF are synchronized with the
latest manuscript supplied for this task.

Publish this folder as `FACTORGRAD-GS/FACTORGRAD-GS.github.io` with GitHub Pages
set to **Deploy from a branch → main → /(root)**. The resulting project page URL is
`https://factorgrad-gs.github.io/`.

The site uses plain HTML, CSS and JavaScript, with no build step. All asset paths
are relative. The `assets/scenes/` directory contains the 13 supplied 360-degree
GIFs. The `assets/interactive/` directory contains 72 compressed rendered views
for Flowers, Playroom, and Room; the page lets visitors drag through these views,
use the slider, and zoom the canvas. The source orbit frames are 480 px wide, so
the canvas is displayed at native width to avoid enlarging low-resolution frames.
The `assets/interactive3d/` directory
contains compact `.fgs` previews converted from the supplied binary Gaussian PLYs;
`splat-viewer.js` renders them with a dependency-free WebGL Gaussian point shader.
The page presents the free-camera preview and the rendered orbit as two tabs in
one interactive section; browsers without WebGL are switched to the rendered
orbit automatically.

The 3D previews keep positions, an isotropic radius, DC colour, and opacity so
that the page remains small enough for GitHub Pages. Higher-order SH and rotation
fields are omitted from the web preview only. The original PLYs are valid binary
3DGS exports, but the Flowers source is over GitHub's 100 MiB per-file limit, so
the raw files should be published as a Release asset or converted to SOG/SPZ/KSPLAT
if full-fidelity distribution is needed. `tools/convert_ply_to_fgs.py` documents
the deterministic conversion used for the three page previews.

The page also includes an English **Supplementary Experiments** section that
summarizes the reviewer follow-up campaign: P0 multi-seed robustness, IID
sampling control, D-SSIM weight sensitivity, and a 2400px high-resolution subset.
