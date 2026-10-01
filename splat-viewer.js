/* Lightweight, dependency-free Gaussian preview for the project page.
 * The .fgs assets contain a deterministic web-sized sample of the supplied
 * 3DGS PLYs.  This keeps the page self-contained and below GitHub's file cap.
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-splat-viewer]');
  if (!root) return;
  const canvas = root.querySelector('[data-splat-canvas]');
  const status = root.querySelector('[data-splat-status]');
  const buttons = [...root.querySelectorAll('[data-splat-scene]')];
  const hint = root.querySelector('[data-splat-hint]');
  const scenes = {
    flowers: { label: 'Flowers', file: 'assets/interactive3d/flowers.fgs' },
    playroom: { label: 'Playroom', file: 'assets/interactive3d/playroom.fgs' },
    room: { label: 'Room', file: 'assets/interactive3d/room.fgs' }
  };
  const gl = canvas.getContext('webgl', { alpha: false, antialias: true, premultipliedAlpha: false });
  if (!gl) {
    status.textContent = 'WebGL is unavailable in this browser.';
    return;
  }

  const vertexSource = `
    attribute vec3 a_position;
    attribute float a_radius;
    attribute vec4 a_color;
    uniform mat4 u_view;
    uniform mat4 u_projection;
    uniform vec2 u_viewport;
    uniform float u_pointScale;
    varying vec4 v_color;
    void main() {
      vec4 viewPosition = u_view * vec4(a_position, 1.0);
      gl_Position = u_projection * viewPosition;
      float pointSize = u_pointScale * a_radius * u_viewport.y / max(0.0001, -viewPosition.z);
      gl_PointSize = clamp(pointSize, 1.0, 64.0);
      v_color = a_color;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec4 v_color;
    void main() {
      vec2 p = gl_PointCoord * 2.0 - 1.0;
      float r2 = dot(p, p);
      if (r2 > 1.0) discard;
      float falloff = exp(-2.6 * r2);
      gl_FragColor = vec4(v_color.rgb, v_color.a * falloff);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const locations = {
    position: gl.getAttribLocation(program, 'a_position'),
    radius: gl.getAttribLocation(program, 'a_radius'),
    color: gl.getAttribLocation(program, 'a_color'),
    view: gl.getUniformLocation(program, 'u_view'),
    projection: gl.getUniformLocation(program, 'u_projection'),
    viewport: gl.getUniformLocation(program, 'u_viewport'),
    pointScale: gl.getUniformLocation(program, 'u_pointScale')
  };
  const positionBuffer = gl.createBuffer();
  const radiusBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();

  const state = {
    key: 'flowers', data: null, count: 0, center: [0, 0, 0], extent: 1,
    yaw: 0.65, pitch: 0.18, distance: 3.0, zoom: 1, dragging: false,
    lastX: 0, lastY: 0, raf: 0
  };

  function identity() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function normalize(v) { const d = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / d, v[1] / d, v[2] / d]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function lookAt(eye, target, up) {
    const z = normalize(subtract(eye, target));
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
      -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
      -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1];
  }
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
  }
  function draw() {
    state.raf = 0;
    resize();
    gl.clearColor(0.035, 0.11, 0.12, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!state.data) return;
    const target = state.center;
    const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
    const eye = [target[0] + state.distance * cp * cy, target[1] + state.distance * sp, target[2] + state.distance * cp * sy];
    const view = lookAt(eye, target, [0, 1, 0]);
    const aspect = canvas.width / Math.max(1, canvas.height);
    const projection = perspective(0.76, aspect, Math.max(0.001, state.extent * 0.003), state.extent * 30);
    gl.useProgram(program);
    gl.uniformMatrix4fv(locations.view, false, new Float32Array(view));
    gl.uniformMatrix4fv(locations.projection, false, new Float32Array(projection));
    gl.uniform2f(locations.viewport, canvas.width, canvas.height);
    gl.uniform1f(locations.pointScale, state.extent * 0.92 * state.zoom);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); gl.enableVertexAttribArray(locations.position); gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 16, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, radiusBuffer); gl.enableVertexAttribArray(locations.radius); gl.vertexAttribPointer(locations.radius, 1, gl.FLOAT, false, 4, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer); gl.enableVertexAttribArray(locations.color); gl.vertexAttribPointer(locations.color, 4, gl.UNSIGNED_BYTE, true, 4, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, state.count);
  }
  function requestDraw() { if (!state.raf) state.raf = requestAnimationFrame(draw); }

  function upload(data) {
    const view = new DataView(data);
    if (view.getUint8(0) !== 70 || view.getUint8(1) !== 71 || view.getUint8(2) !== 83 || view.getUint8(3) !== 49) throw new Error('Invalid FGS preview');
    const count = view.getUint32(8, true), stride = view.getUint32(12, true);
    if (stride !== 24 || data.byteLength < 44 + count * stride) throw new Error('Corrupt FGS preview');
    const min = [view.getFloat32(20, true), view.getFloat32(24, true), view.getFloat32(28, true)];
    const max = [view.getFloat32(32, true), view.getFloat32(36, true), view.getFloat32(40, true)];
    const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    const positions = new Float32Array(count * 4), radii = new Float32Array(count), colors = new Uint8Array(count * 4);
    for (let i = 0; i < count; i += 1) {
      const off = 44 + i * stride, p = i * 4;
      positions[p] = view.getFloat32(off, true) - center[0]; positions[p + 1] = view.getFloat32(off + 4, true) - center[1]; positions[p + 2] = view.getFloat32(off + 8, true) - center[2];
      radii[i] = view.getFloat32(off + 12, true);
      colors[p] = view.getUint8(off + 16); colors[p + 1] = view.getUint8(off + 17); colors[p + 2] = view.getUint8(off + 18); colors[p + 3] = view.getUint8(off + 19);
    }
    state.data = { positions, radii, colors }; state.count = count; state.center = [0, 0, 0]; state.extent = extent; state.distance = extent * 2.25; state.zoom = 1;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, radiusBuffer); gl.bufferData(gl.ARRAY_BUFFER, radii, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer); gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
  }
  async function selectScene(key) {
    if (!scenes[key]) return;
    state.key = key; state.data = null;
    buttons.forEach(button => { const active = button.dataset.splatScene === key; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); });
    status.textContent = `Loading ${scenes[key].label}…`;
    try {
      const response = await fetch(scenes[key].file, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      upload(await response.arrayBuffer());
      status.textContent = `${scenes[key].label} · ${state.count.toLocaleString()} web preview Gaussians`;
      hint.textContent = 'Drag to orbit · Wheel to zoom · Shift + drag to pan';
      requestDraw();
    } catch (error) {
      status.textContent = `${scenes[key].label} could not be loaded.`;
      hint.textContent = 'The compact preview asset is unavailable.';
      console.error(error);
    }
  }
  buttons.forEach(button => button.addEventListener('click', () => selectScene(button.dataset.splatScene)));
  canvas.addEventListener('pointerdown', event => { state.dragging = true; state.lastX = event.clientX; state.lastY = event.clientY; canvas.setPointerCapture(event.pointerId); canvas.classList.add('is-dragging'); });
  canvas.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    const dx = event.clientX - state.lastX, dy = event.clientY - state.lastY; state.lastX = event.clientX; state.lastY = event.clientY;
    if (event.shiftKey) { state.center[0] -= dx * state.extent * 0.001 * state.distance / state.extent; state.center[1] += dy * state.extent * 0.001 * state.distance / state.extent; }
    else { state.yaw += dx * 0.008; state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + dy * 0.008)); }
    requestDraw();
  });
  const stop = event => { state.dragging = false; canvas.classList.remove('is-dragging'); if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };
  canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('wheel', event => { event.preventDefault(); state.distance *= Math.exp(event.deltaY * 0.001); state.distance = Math.max(state.extent * 0.35, Math.min(state.extent * 12, state.distance)); requestDraw(); }, { passive: false });
  window.addEventListener('resize', requestDraw);
  if ('ResizeObserver' in window) new ResizeObserver(requestDraw).observe(canvas);
  selectScene('flowers');
}());
