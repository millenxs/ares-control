import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface MarsCanvas3DProps {
  className?: string;
}

function hasWebGLSupport(): boolean {
  if (typeof window === "undefined" || !window.WebGLRenderingContext) {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export function MarsCanvas3D({ className = "" }: MarsCanvas3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) {
      return;
    }

    if (!hasWebGLSupport()) {
      setUseFallback(true);
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId: number | null = null;
    let isDisposed = false;

    try {
      const width = container.clientWidth || 700;
      const height = container.clientHeight || 700;

      const scene = new THREE.Scene();
      // FOV 44 com câmera a z=5.6 enquadra perfeitamente a esfera grande (raio 2.08)
      // preenchendo quase 92% da arena central sem cortar absolutamente nada nas laterais
      const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
      camera.position.z = 5.6;

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);

      const textureLoader = new THREE.TextureLoader();
      const marsTexture = textureLoader.load("/mars_texture.jpg");
      marsTexture.colorSpace = THREE.SRGBColorSpace;

      const sphereGeo = new THREE.SphereGeometry(2.08, 64, 64);
      const marsMaterial = new THREE.MeshStandardMaterial({
        map: marsTexture,
        roughness: 0.9,
        metalness: 0.04,
      });
      const marsMesh = new THREE.Mesh(sphereGeo, marsMaterial);
      marsMesh.rotation.y = 0.8;
      marsMesh.rotation.x = 0.12;
      scene.add(marsMesh);

      const atmosphereGeo = new THREE.SphereGeometry(2.15, 48, 48);
      const atmosphereMat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(0.9, 0.35, 0.16, 1.0) * intensity * 0.85;
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
      });
      const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
      scene.add(atmosphereMesh);

      const sunLight = new THREE.DirectionalLight(0xfff5ea, 3.0);
      sunLight.position.set(5.5, 2.5, 4.5);
      scene.add(sunLight);

      const ambientLight = new THREE.AmbientLight(0x240c06, 0.5);
      scene.add(ambientLight);

      const rimLight = new THREE.DirectionalLight(0xd95327, 0.7);
      rimLight.position.set(-5, -2, -3);
      scene.add(rimLight);

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const animate = () => {
        if (isDisposed) {
          return;
        }
        if (!prefersReducedMotion) {
          marsMesh.rotation.y += 0.001;
        }
        if (renderer) {
          renderer.render(scene, camera);
        }
        animationFrameId = requestAnimationFrame(animate);
      };
      animate();

      const handleResize = () => {
        if (!container || !renderer) {
          return;
        }
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        if (newWidth === 0 || newHeight === 0) {
          return;
        }
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        isDisposed = true;
        window.removeEventListener("resize", handleResize);
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        sphereGeo.dispose();
        atmosphereGeo.dispose();
        marsMaterial.dispose();
        atmosphereMat.dispose();
        marsTexture.dispose();
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement.parentElement === container) {
            container.removeChild(renderer.domElement);
          }
        }
      };
    } catch {
      setUseFallback(true);
      return () => {};
    }
  }, []);

  if (useFallback) {
    return (
      <div
        className={`mars-canvas-container mars-canvas-fallback ${className}`.trim()}
        aria-hidden="true"
      >
        <div className="mars-fallback-sphere" />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`mars-canvas-container ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

export function SpaceOrbitsSvg() {
  return (
    <svg className="space-orbits-svg" viewBox="0 0 680 680">
      <ellipse
        cx="340"
        cy="340"
        rx="325"
        ry="160"
        transform="rotate(-26 340 340)"
        className="orbit-dashed-teal"
      />
      <ellipse
        cx="340"
        cy="340"
        rx="325"
        ry="160"
        transform="rotate(26 340 340)"
        className="orbit-dashed-orange"
      />
      <circle cx="340" cy="20" r="4.5" className="orbit-cyan-node" />
      <circle cx="340" cy="660" r="4.5" className="orbit-cyan-node" />
    </svg>
  );
}
