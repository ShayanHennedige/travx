"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";

/* ─── GLSL Shader Code ───────────────────────────────────────────────── */

const PERIODIC_NOISE_GLSL = /* glsl */ `
  float periodicNoise(vec3 p, float time) {
    float noise = 0.0;
    noise += sin(p.x * 2.0 + time) * cos(p.z * 1.5 + time);
    noise += sin(p.x * 3.2 + time * 2.0) * cos(p.z * 2.1 + time) * 0.6;
    noise += sin(p.x * 1.7 + time) * cos(p.z * 2.8 + time * 3.0) * 0.4;
    noise += sin(p.x * p.z * 0.5 + time * 2.0) * 0.3;
    return noise * 0.3;
  }
`;

const SIM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SIM_FRAGMENT = /* glsl */ `
  uniform sampler2D positions;
  uniform float uTime;
  uniform float uNoiseScale;
  uniform float uNoiseIntensity;
  uniform float uTimeScale;
  uniform float uLoopPeriod;
  varying vec2 vUv;

  ${PERIODIC_NOISE_GLSL}

  void main() {
    vec3 originalPos = texture2D(positions, vUv).rgb;
    float continuousTime = uTime * uTimeScale * (6.28318530718 / uLoopPeriod);
    vec3 noiseInput = originalPos * uNoiseScale;
    float displacementX = periodicNoise(noiseInput + vec3(0.0, 0.0, 0.0), continuousTime);
    float displacementY = periodicNoise(noiseInput + vec3(50.0, 0.0, 0.0), continuousTime + 2.094);
    float displacementZ = periodicNoise(noiseInput + vec3(0.0, 50.0, 0.0), continuousTime + 4.188);
    vec3 distortion = vec3(displacementX, displacementY, displacementZ) * uNoiseIntensity;
    vec3 finalPos = originalPos + distortion;
    gl_FragColor = vec4(finalPos, 1.0);
  }
`;

const POINT_VERTEX = /* glsl */ `
  uniform sampler2D positions;
  uniform sampler2D initialPositions;
  uniform float uTime;
  uniform float uFocus;
  uniform float uFov;
  uniform float uBlur;
  uniform float uPointSize;
  varying float vDistance;
  varying float vPosY;
  varying vec3 vWorldPosition;
  varying vec3 vInitialPosition;
  void main() {
    vec3 pos = texture2D(positions, position.xy).xyz;
    vec3 initialPos = texture2D(initialPositions, position.xy).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vDistance = abs(uFocus - -mvPosition.z);
    vPosY = pos.y;
    vWorldPosition = pos;
    vInitialPosition = initialPos;
    gl_PointSize = max(vDistance * uBlur * uPointSize, 3.0);
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform float uRevealFactor;
  uniform float uRevealProgress;
  uniform float uTime;
  varying float vDistance;
  varying float vPosY;
  varying vec3 vWorldPosition;
  varying vec3 vInitialPosition;

  ${PERIODIC_NOISE_GLSL}

  float sparkleNoise(vec3 seed, float time) {
    float hash = sin(seed.x * 127.1 + seed.y * 311.7 + seed.z * 74.7) * 43758.5453;
    hash = fract(hash);
    float slowTime = time * 1.0;
    float sparkle = 0.0;
    sparkle += sin(slowTime + hash * 6.28318) * 0.5;
    sparkle += sin(slowTime * 1.7 + hash * 12.56636) * 0.3;
    sparkle += sin(slowTime * 0.8 + hash * 18.84954) * 0.2;
    float hash2 = sin(seed.x * 113.5 + seed.y * 271.9 + seed.z * 97.3) * 37849.3241;
    hash2 = fract(hash2);
    float sparkleMask = sin(hash2 * 6.28318) * 0.7;
    sparkleMask += sin(hash2 * 12.56636) * 0.3;
    if (sparkleMask < 0.3) {
      sparkle *= 0.05;
    }
    float normalizedSparkle = (sparkle + 1.0) * 0.5;
    float smoothCurve = pow(normalizedSparkle, 4.0);
    float blendFactor = normalizedSparkle * normalizedSparkle;
    float finalBrightness = mix(normalizedSparkle, smoothCurve, blendFactor);
    return 0.7 + finalBrightness * 1.3;
  }

  float sdCircle(vec2 p, float r) {
    return length(p) - r;
  }

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float sdf = sdCircle(cxy, 0.5);
    if (sdf > 0.0) discard;

    float distanceFromCenter = length(vWorldPosition.xz);
    float noiseValue = periodicNoise(vInitialPosition * 4.0, 0.0);
    float revealThreshold = uRevealFactor + noiseValue * 0.3;
    float revealMask = 1.0 - smoothstep(revealThreshold - 0.2, revealThreshold + 0.1, distanceFromCenter);
    float sparkleBrightness = sparkleNoise(vInitialPosition, uTime);
    float alpha = (1.04 - clamp(vDistance, 0.0, 1.0)) * clamp(smoothstep(-0.5, 0.25, vPosY), 0.0, 1.0) * uOpacity * revealMask * uRevealProgress * sparkleBrightness;

    gl_FragColor = vec4(vec3(1.0), alpha);
  }
`;

const VIGNETTE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const VIGNETTE_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float darkness;
  uniform float offset;
  varying vec2 vUv;
  void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    vec2 uv = (vUv - 0.5) * 2.0;
    float dist = dot(uv, uv);
    float vignette = 1.0 - smoothstep(offset, offset + darkness, dist);
    gl_FragColor = vec4(texel.rgb * vignette, texel.a);
  }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function getPlane(count: number, size: number, scale: number) {
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const i4 = i * 4;
    const x = (i % size) / (size - 1);
    const z = Math.floor(i / size) / (size - 1);
    data[i4 + 0] = (x - 0.5) * 2 * scale;
    data[i4 + 1] = 0;
    data[i4 + 2] = (z - 0.5) * 2 * scale;
    data[i4 + 3] = 1.0;
  }
  return data;
}

/* ─── Component ───────────────────────────────────────────────────────── */

export default function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SIZE = 512;
    const SCALE = 10.0;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    /* ── Cameras ── */
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.01,
      300
    );
    camera.position.set(1.26, 2.66, -1.82);
    camera.lookAt(0, 0, 0);

    const simCamera = new THREE.OrthographicCamera(
      -1, 1, 1, -1,
      1 / Math.pow(2, 53), 1
    );

    /* ── Scenes ── */
    const mainScene = new THREE.Scene();
    const simScene = new THREE.Scene();
    const vignetteScene = new THREE.Scene();
    const vignetteCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    /* ── FBO Render Target ── */
    const fbo = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });

    /* ── Main render target (for vignette) ── */
    const mainRT = new THREE.WebGLRenderTarget(
      container.clientWidth * Math.min(window.devicePixelRatio, 2),
      container.clientHeight * Math.min(window.devicePixelRatio, 2)
    );

    /* ── Initial positions texture ── */
    const posData = getPlane(SIZE * SIZE, SIZE, SCALE);
    const positionsTexture = new THREE.DataTexture(
      posData, SIZE, SIZE,
      THREE.RGBAFormat, THREE.FloatType
    );
    positionsTexture.needsUpdate = true;

    /* ── Simulation Material + Mesh ── */
    const simMaterial = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: SIM_FRAGMENT,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uNoiseScale: { value: 0.6 },
        uNoiseIntensity: { value: 0.52 },
        uTimeScale: { value: 1.0 },
        uLoopPeriod: { value: 24.0 },
      },
    });

    const simPositions = new Float32Array([
      -1, -1, 0, 1, -1, 0, 1, 1, 0,
      -1, -1, 0, 1, 1, 0, -1, 1, 0,
    ]);
    const simUvs = new Float32Array([
      0, 1, 1, 1, 1, 0,
      0, 1, 1, 0, 0, 0,
    ]);
    const simGeo = new THREE.BufferGeometry();
    simGeo.setAttribute("position", new THREE.BufferAttribute(simPositions, 3));
    simGeo.setAttribute("uv", new THREE.BufferAttribute(simUvs, 2));
    const simMesh = new THREE.Mesh(simGeo, simMaterial);
    simScene.add(simMesh);

    /* ── Point Material + Points ── */
    const pointMaterial = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      uniforms: {
        positions: { value: fbo.texture },
        initialPositions: { value: positionsTexture },
        uTime: { value: 0 },
        uFocus: { value: 3.8 },
        uFov: { value: 50 },
        uBlur: { value: 1.79 },
        uPointSize: { value: 10.0 },
        uOpacity: { value: 0.8 },
        uRevealFactor: { value: 0.0 },
        uRevealProgress: { value: 0.0 },
      },
      transparent: true,
      depthWrite: false,
    });

    const count = SIZE * SIZE;
    const particleUVs = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      particleUVs[i * 3 + 0] = (i % SIZE) / SIZE;
      particleUVs[i * 3 + 1] = i / SIZE / SIZE;
      particleUVs[i * 3 + 2] = 0;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particleUVs, 3));
    const points = new THREE.Points(particleGeo, pointMaterial);
    mainScene.add(points);

    /* ── Vignette Post-Processing ── */
    const vignetteMaterial = new THREE.ShaderMaterial({
      vertexShader: VIGNETTE_VERTEX,
      fragmentShader: VIGNETTE_FRAGMENT,
      uniforms: {
        tDiffuse: { value: mainRT.texture },
        darkness: { value: 1.5 },
        offset: { value: 0.4 },
      },
    });
    const vignettePositions = new Float32Array([
      -1, -1, 0, 1, -1, 0, 1, 1, 0,
      -1, -1, 0, 1, 1, 0, -1, 1, 0,
    ]);
    const vignetteUvs = new Float32Array([
      0, 0, 1, 0, 1, 1,
      0, 0, 1, 1, 0, 1,
    ]);
    const vignetteGeo = new THREE.BufferGeometry();
    vignetteGeo.setAttribute("position", new THREE.BufferAttribute(vignettePositions, 3));
    vignetteGeo.setAttribute("uv", new THREE.BufferAttribute(vignetteUvs, 2));
    const vignetteMesh = new THREE.Mesh(vignetteGeo, vignetteMaterial);
    vignetteScene.add(vignetteMesh);

    /* ── Animation Loop ── */
    const clock = new THREE.Clock();
    let revealStartTime: number | null = null;
    const revealDuration = 3.5;
    let animationId: number;

    function animate() {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Reveal animation
      if (revealStartTime === null) revealStartTime = elapsed;
      const revealElapsed = elapsed - revealStartTime;
      const revealProgress = Math.min(revealElapsed / revealDuration, 1.0);
      const easedProgress = 1 - Math.pow(1 - revealProgress, 3);
      const revealFactor = easedProgress * 4.0;

      // Update simulation uniforms
      simMaterial.uniforms.uTime.value = elapsed;

      // Pass 1: Render simulation to FBO
      renderer.setRenderTarget(fbo);
      renderer.clear();
      renderer.render(simScene, simCamera);

      // Update point uniforms
      pointMaterial.uniforms.uTime.value = elapsed;
      pointMaterial.uniforms.uRevealFactor.value = revealFactor;
      pointMaterial.uniforms.uRevealProgress.value = easedProgress;

      // Pass 2: Render particles to main render target
      renderer.setRenderTarget(mainRT);
      renderer.clear();
      renderer.render(mainScene, camera);

      // Pass 3: Render vignette to screen
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(vignetteScene, vignetteCamera);
    }

    animate();

    /* ── Resize Handler ── */
    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      mainRT.setSize(w * dpr, h * dpr);
    }
    window.addEventListener("resize", onResize);

    /* ── Cleanup ── */
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      fbo.dispose();
      mainRT.dispose();
      simGeo.dispose();
      particleGeo.dispose();
      vignetteGeo.dispose();
      simMaterial.dispose();
      pointMaterial.dispose();
      vignetteMaterial.dispose();
      positionsTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ background: "#000" }}
    />
  );
}
