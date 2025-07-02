import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Props {
  src: string;          // 360 JPEG / PNG (2 : 1)
  height?: string;      // CSS height – default 400 px
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

    // --- Load texture & add sphere ---
    let animationId = 0;
    new THREE.TextureLoader().load(src, texture => {
      const geo  = new THREE.SphereGeometry(50, 64, 64);
      geo.scale(-1, 1, 1);                       // Zeigt die Innenfläche an
      const mat  = new THREE.MeshBasicMaterial({ map: texture });
      scene.add(new THREE.Mesh(geo, mat));

      // render loop
      const renderLoop = (): void => {
        controls.update();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(renderLoop);
      };
      renderLoop();
    });

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      while (ref.current!.firstChild) {
        ref.current!.removeChild(ref.current!.firstChild);
      }
    };
  }, [src]);

  return <div style={{ width: '100%', height:'100%' }} ref={ref} />;
};
