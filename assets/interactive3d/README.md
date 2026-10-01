# Compact 3D scene previews

These `.fgs` files are page assets generated from the supplied binary 3DGS PLYs
with `tools/convert_ply_to_fgs.py`.

| Scene | Source PLY | Source Gaussians | Web preview Gaussians |
| --- | --- | ---: | ---: |
| Flowers | `flowers/FactorGrad-GS_Full_20260901.ply` | 491,270 | 180,000 |
| Playroom | `playroom/FactorGrad-GS_Full_20260901.ply` | 198,696 | 150,000 |
| Room | `room/FactorGrad-GS_Full_20260901.ply` | 210,193 | 150,000 |

The preview format keeps position, an isotropic radius, DC colour, and opacity.
It intentionally leaves out higher-order SH and rotation fields to keep the
static page small and responsive. The original PLYs are the full-fidelity source
artifacts and should be distributed separately (for example as Release assets or
SOG/SPZ/KSPLAT conversions).
