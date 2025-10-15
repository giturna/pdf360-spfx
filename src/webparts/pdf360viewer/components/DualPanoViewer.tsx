// DualPanoViewer.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import styles from './Pdf360Viewer.module.scss';
import { attachFovWheelZoom } from './PanoramaViewer';

interface Props {
  leftSrc: string;
  rightSrc: string;
  height?: number;     // px, Standardwert: die Hälfte der Containerbreite
  linkRotations?: boolean; // true: Rotationen synchronisieren
}

function sizeForCover(box: HTMLElement, srcAspect = 2 / 1) {
  const { width: W, height: H } = box.getBoundingClientRect();
  if (!W || !H) return { w: 0, h: 0 };
  if (W / H > srcAspect) {
    return { w: Math.round(W), h: Math.round(W / srcAspect) }; // füllt die Breite aus, schneidet vertikal ab
  } else {
    return { h: Math.round(H), w: Math.round(H * srcAspect) }; // füllt die Höhe aus, schneidet horizontal ab
  }
}

const setupOne = (container: HTMLDivElement, src: string) => {
  // --- COVER + DPR aware ölçülendirme ---
  const computeAndApplySize = (renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) => {
    const { w, h } = sizeForCover(container, 2 / 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);                 // interne Auflösung
    renderer.domElement.style.width  = `${w}px`;   // kein CSS-Zoom
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = w / h || 1;
    camera.updateProjectionMatrix();
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 0, 0.1);

  // erste Größenanpassung
  computeAndApplySize(renderer, camera);

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

  // Resize-Observer – wendet „cover + dpr“ erneut an, wenn sich die Box ändert
  const ro = new ResizeObserver(() => computeAndApplySize(renderer, camera));
  ro.observe(container);

  const dispose = () => {
    cancelAnimationFrame(anim);
    ro.disconnect();
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
    const disposeWheelL = attachFovWheelZoom(L.renderer.domElement, L.camera);
    const disposeWheelR = attachFovWheelZoom(R.renderer.domElement, R.camera);

    if (linkRotations) {
        let leader: 'L' | 'R' | null = null;  // wer zieht gerade?

        const tmpSpherical = new THREE.Spherical();
        const tmpVec = new THREE.Vector3();

        const syncFromTo = (src: any, dst: any) => {
            // 1) das Ziel ausrichten
            if (src.target && dst.target && typeof dst.target.copy === 'function') {
              dst.target.copy(src.target);
            }

            // 2) den Versatz der Quelle relativ zum Ziel erfassen → sphärisch
            tmpVec.copy(src.object.position).sub(src.target);
            tmpSpherical.setFromVector3(tmpVec);

            // 3) die Zielkamera anhand derselben sphärischen Koordinaten + ihres (nun kopierten) Ziels positionieren
            tmpVec.setFromSpherical(tmpSpherical);
            dst.object.position.copy(dst.target).add(tmpVec);

            // 4) die Kamera auf das Ziel ausrichten
            dst.object.lookAt(dst.target);

            if (dst.object && src.object && typeof dst.object.updateProjectionMatrix === 'function') {
              dst.object.fov = src.object.fov;
              dst.object.updateProjectionMatrix();
            }

            // Update aktualisieren
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

    return () => {
      disposeWheelL?.();
      disposeWheelR?.();
      L.dispose();
      R.dispose();
    };
  }, [leftSrc, rightSrc, linkRotations]);

  return (
        <div className={styles.panoRow}>
            <div className={styles.panoBox}      ref={leftRef}  />
            <div className={styles.panoBox}      ref={rightRef} />
        </div>
    );
};
