# Compact 3D scene previews

These `.fgs` files are page assets generated from the supplied binary 3DGS PLYs
with `tools/convert_ply_to_fgs.py`.

| Scene | Source PLY | Source Gaussians | Web preview Gaussians |
| --- | --- | ---: | ---: |
| Flowers | `flowers/FactorGrad-GS_Full_20260901.ply` | 491,270 | 491,270 |
| Playroom | `playroom/FactorGrad-GS_Full_20260901.ply` | 198,696 | 198,696 |
| Room | `room/FactorGrad-GS_Full_20260901.ply` | 210,193 | 210,193 |

The preview format keeps every Gaussian's position, an isotropic radius, DC colour,
and opacity. It intentionally leaves out higher-order SH and rotation fields while
remaining small enough for a responsive static page. The original PLYs are the
full-fidelity source artifacts and should be distributed separately (for example as
Release assets or SOG/SPZ/KSPLAT conversions).
