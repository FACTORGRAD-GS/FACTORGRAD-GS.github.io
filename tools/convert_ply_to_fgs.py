"""Convert a 3DGS binary PLY into a compact FactorGrad-GS web preview.

The web format keeps position, an isotropic Gaussian radius, and the DC colour
plus opacity.  Higher order spherical harmonics and rotations are intentionally
omitted because this is a lightweight interactive preview for the project page.
"""
from __future__ import annotations

import argparse
import struct
from pathlib import Path

import numpy as np

HEADER = struct.Struct("<4sIIII6f")
RECORD_DTYPE = np.dtype([
    ("x", "<f4"), ("y", "<f4"), ("z", "<f4"), ("radius", "<f4"),
    ("r", "u1"), ("g", "u1"), ("b", "u1"), ("a", "u1"), ("pad", "<u4"),
])


def read_gaussians(path: Path):
    with path.open("rb") as fh:
        header_lines = []
        while True:
            line = fh.readline()
            if not line:
                raise ValueError(f"missing end_header in {path}")
            header_lines.append(line)
            if line.strip() == b"end_header":
                break
        header = b"".join(header_lines).decode("ascii")
        if "format binary_little_endian 1.0" not in header:
            raise ValueError(f"{path} is not binary_little_endian PLY")
        vertex_line = next(line for line in header.splitlines() if line.startswith("element vertex "))
        count = int(vertex_line.split()[-1])
        names = [line.split()[-1] for line in header.splitlines() if line.startswith("property float ")]
        if len(names) != 62:
            raise ValueError(f"expected 62 float properties, found {len(names)} in {path}")
        raw = np.fromfile(fh, dtype=np.dtype("<f4"), count=count * len(names)).reshape(count, len(names))

    index = {name: i for i, name in enumerate(names)}
    xyz = raw[:, [index["x"], index["y"], index["z"]]].astype(np.float32, copy=False)
    dc = raw[:, [index["f_dc_0"], index["f_dc_1"], index["f_dc_2"]]]
    # 3DGS stores the DC spherical-harmonic coefficient; C0 is its basis value.
    rgb = np.clip(0.5 + 0.28209479177387814 * dc, 0.0, 1.0)
    opacity = 1.0 / (1.0 + np.exp(-np.clip(raw[:, index["opacity"]], -20.0, 20.0)))
    scale = np.exp(np.clip(raw[:, [index["scale_0"], index["scale_1"], index["scale_2"]]], -12.0, 8.0))
    radius = np.cbrt(np.maximum(scale[:, 0] * scale[:, 1] * scale[:, 2], 1e-18)).astype(np.float32)
    # Give the painter a useful baseline for tiny Gaussians after downsampling.
    radius = np.maximum(radius, np.float32(1e-4))
    return xyz, radius, rgb.astype(np.float32), opacity.astype(np.float32), count


def convert(source: Path, target: Path, max_points: int, seed: int):
    xyz, radius, rgb, opacity, source_count = read_gaussians(source)
    rng = np.random.default_rng(seed)
    if len(xyz) > max_points:
        # Deterministic sampling preserves the whole scene while keeping page loads responsive.
        keep = np.sort(rng.choice(len(xyz), size=max_points, replace=False))
        xyz, radius, rgb, opacity = xyz[keep], radius[keep], rgb[keep], opacity[keep]

    finite = np.isfinite(xyz).all(axis=1) & np.isfinite(radius) & np.isfinite(rgb).all(axis=1) & np.isfinite(opacity)
    xyz, radius, rgb, opacity = xyz[finite], radius[finite], rgb[finite], opacity[finite]
    bbox_min = xyz.min(axis=0).astype(np.float32)
    bbox_max = xyz.max(axis=0).astype(np.float32)
    # Normalize opacity before quantization so transparent tail points stay subtle.
    rgba = np.concatenate([rgb, opacity[:, None]], axis=1)
    rgba = np.clip(np.round(rgba * 255.0), 0, 255).astype(np.uint8)

    records = np.empty(len(xyz), dtype=RECORD_DTYPE)
    records["x"], records["y"], records["z"] = xyz.T
    records["radius"] = radius
    records["r"], records["g"], records["b"], records["a"] = rgba.T
    records["pad"] = 0
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("wb") as fh:
        fh.write(HEADER.pack(b"FGS1", 1, len(records), RECORD_DTYPE.itemsize, 0, *bbox_min, *bbox_max))
        records.tofile(fh)
    print(f"{source.name}: {source_count:,} -> {len(records):,} points; {target.stat().st_size:,} bytes")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--max-points", type=int, default=180_000)
    parser.add_argument("--seed", type=int, default=3407)
    args = parser.parse_args()
    convert(args.source, args.target, args.max_points, args.seed)


if __name__ == "__main__":
    main()
