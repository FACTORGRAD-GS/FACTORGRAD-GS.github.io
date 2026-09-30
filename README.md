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
use the slider, and zoom the canvas.

This interaction is a pre-rendered orbit based on the supplied training-camera
outputs. It is a useful visual substitute for the requested mouse-driven scene,
but it is not a free-camera 3D Gaussian Splatting renderer. A true viewer can be
enabled after adding binary Gaussian assets such as PLY, SPLAT, KSPLAT, SPZ, or
SOG files; the current point-cloud files are text pointers rather than model data.
