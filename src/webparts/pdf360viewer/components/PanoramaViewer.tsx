import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export function attachFovWheelZoom(
  canvasEl: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  opts: { minFov?: number; maxFov?: number; step?: number } = {}
) {
  const minFov = opts.minFov ?? 30;   // Nah-Zoom-Grenze (kleineres FOV = näher)
  const maxFov = opts.maxFov ?? 90;   // Weitwinkelgrenze
  const step   = opts.step   ?? 1.5;  // wie viele Grad sich bei jedem Wheel-„Tick“ ändern sollen

  const onWheel = (e: WheelEvent) => {
    e.preventDefault(); // das Scrollen der Seite verhindern
    const dir = Math.sign(e.deltaY);         // unten (+) / oben (–)
    const next = THREE.MathUtils.clamp(camera.fov + dir * step, minFov, maxFov);
    if (next !== camera.fov) {
      camera.fov = next;
      camera.updateProjectionMatrix();
    }
  };

  canvasEl.addEventListener('wheel', onWheel, { passive: false });

  // cleanup
  return () => {
    canvasEl.removeEventListener('wheel', onWheel as any);
  };
}

interface Props {
  src: string;          // 360 JPEG / PNG (2 : 1)
  height?: string;      // CSS-Höhe – Standard 400 px
}

export const PanoViewer: React.FC<Props> = ({ src }) => {
const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
    if (!ref.current) return;

    // Bestimmt die Größen basierend auf den Maßen des Containers
    const w = ref.current.clientWidth;
    const h = w / 2;    // 2 : 1 Verhältnis ⇒ Höhe = Breite / 2

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    ref.current.appendChild(renderer.domElement);

    // --- Scene & Camera ---
    const scene   = new THREE.Scene();
    const camera  = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom   = true;
    controls.enablePan    = false;
    controls.rotateSpeed  = 0.5;
    controls.zoomSpeed    = 0.6;

    const disposeWheel = attachFovWheelZoom(renderer.domElement, camera, {
      minFov: 30,
      maxFov: 90,
      step: 1.5
    });

    // --- Textur laden & Sphere hinzufügen ---
    let animationId = 0;
    new THREE.TextureLoader().load(src, texture => {
      const geo  = new THREE.SphereGeometry(50, 64, 64);
      geo.scale(-1, 1, 1);                       // Zeigt die Innenfläche an
      const mat  = new THREE.MeshBasicMaterial({ map: texture });
      scene.add(new THREE.Mesh(geo, mat));

      // render schleife
      const renderLoop = (): void => {
        controls.update();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(renderLoop);
      };
      renderLoop();
    });

    // --- Cleanup ---
    return () => {
      disposeWheel?.();
      cancelAnimationFrame(animationId);
      renderer.dispose();
      while (ref.current!.firstChild) {
        ref.current!.removeChild(ref.current!.firstChild);
      }
    };
  }, [src]);

  return <div style={{ width: '100%', height:'100%' }} ref={ref} />;
};
