// DualPanoViewer.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Props {
  leftSrc: string;
  rightSrc: string;
  height?: number;     // px, default: half of container width
  linkRotations?: boolean; // true: sync rotations
}

const setupOne = (container: HTMLDivElement, src: string) => {
  const w = container.clientWidth;
  const h = Math.floor(w / 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
  camera.position.set(0, 0, 0.1);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom  = true;
  controls.enablePan   = false;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed   = 0.6;

  let mesh: THREE.Mesh | null = null;
  let anim = 0;

  const texLoader = new THREE.TextureLoader();
  texLoader.load(src, (texture) => {
    const geo = new THREE.SphereGeometry(50, 64, 64);
    geo.scale(-1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: texture });
    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      anim = requestAnimationFrame(loop);
    };
    loop();
  });

  const dispose = () => {
    cancelAnimationFrame(anim);
    renderer.dispose();
    while (container.firstChild) container.removeChild(container.firstChild);
    if (mesh) {
      (mesh.material as THREE.Material).dispose?.();
      (mesh.geometry as THREE.BufferGeometry).dispose?.();
    }
  };

  return { renderer, scene, camera, controls, dispose };
};

export const DualPanoViewer: React.FC<Props> = ({ leftSrc, rightSrc, linkRotations = true }) => {
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return;

    const L = setupOne(leftRef.current, leftSrc);
    const R = setupOne(rightRef.current, rightSrc);

    //let syncing = false;

    if (linkRotations) {
        let leader: 'L' | 'R' | null = null;  // şu an kim sürüklüyor?

        const tmpSpherical = new THREE.Spherical();
        const tmpVec = new THREE.Vector3();

        const syncFromTo = (src: any, dst: any) => {
            // 1) target'ı hizala
            if (src.target && dst.target && typeof dst.target.copy === 'function') {
            dst.target.copy(src.target);
            }

            // 2) src kameranın target'a göre offset'ini al → spherical
            tmpVec.copy(src.object.position).sub(src.target);
            tmpSpherical.setFromVector3(tmpVec);

            // 3) dst kamerayı aynı spherical + kendi (artık kopyalanmış) target'a göre konumlandır
            tmpVec.setFromSpherical(tmpSpherical);
            dst.object.position.copy(dst.target).add(tmpVec);

            // 4) kamerayı hedefe baktır ve kontrolü güncelle
            dst.object.lookAt(dst.target);
            dst.update?.();
        };

        const onStartL = () => (leader = 'L');
        const onStartR = () => (leader = 'R');
        const onEnd = () => (leader = null);

        const onChangeL = () => {
            if (leader !== 'L') return;
            syncFromTo(L.controls as any, R.controls as any);
        };
        const onChangeR = () => {
            if (leader !== 'R') return;
            syncFromTo(R.controls as any, L.controls as any);
        };

        // damping açıksa change sık gelir; sorun değil, lider filtresi var
        L.controls.addEventListener('start', onStartL);
        L.controls.addEventListener('end', onEnd);
        L.controls.addEventListener('change', onChangeL);

        R.controls.addEventListener('start', onStartR);
        R.controls.addEventListener('end', onEnd);
        R.controls.addEventListener('change', onChangeR);

        return () => {
            L.controls.removeEventListener('start', onStartL);
            L.controls.removeEventListener('end', onEnd);
            L.controls.removeEventListener('change', onChangeL);

            R.controls.removeEventListener('start', onStartR);
            R.controls.removeEventListener('end', onEnd);
            R.controls.removeEventListener('change', onChangeR);

            L.dispose();
            R.dispose();
        };
        }

    return () => { L.dispose(); R.dispose(); };
  }, [leftSrc, rightSrc, linkRotations]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
      <div ref={leftRef} style={{ width: '100%' }} />
      <div ref={rightRef} style={{ width: '100%' }} />
    </div>
  );
};
