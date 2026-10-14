import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import { cancelRender, continueRender, delayRender, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** Tải bông hồng xuất từ Blender (public/models/rose.glb) – chặn render cho tới khi tải xong. */
function useRose(url: string) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender("Tải mô hình hoa hồng (Blender)"));
  useEffect(() => {
    new GLTFLoader().load(
      url,
      (gltf) => {
        setScene(gltf.scene);
        continueRender(handle);
      },
      undefined,
      (err) => cancelRender(err),
    );
  }, [url, handle]);
  return scene;
}

const Rose: React.FC<{ scene: THREE.Group; position: [number, number, number]; delay: number; spin: number; tilt: number; scale: number }> = ({
  scene,
  position,
  delay,
  spin,
  tilt,
  scale,
}) => {
  const frame = useCurrentFrame();
  const clone = useMemo(() => scene.clone(true), [scene]);
  const enter = interpolate(frame, [delay, delay + 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.4)),
  });
  return (
    <group
      position={[position[0], position[1] - (1 - enter) * 3, position[2]]}
      rotation={[tilt + Math.sin(frame / 40) * 0.05, frame * spin, Math.sin(frame / 55 + delay) * 0.08]}
      scale={scale * Math.max(enter, 0.001)}
    >
      <primitive object={clone} />
    </group>
  );
};

export const Rose3D: React.FC<{ modelUrl: string }> = ({ modelUrl }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const scene = useRose(modelUrl);
  const camY = interpolate(frame, [0, 120], [0.6, 0], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  return (
    <ThreeCanvas width={width} height={height} camera={{ position: [0, camY, 9], fov: 35 }} style={{ position: "absolute", inset: 0 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff1e0" />
      <directionalLight position={[-4, 1, -2]} intensity={1.6} color="#ff8fb1" />
      <pointLight position={[0, -1.5, 2]} intensity={4} color="#ffd36e" />
      {scene ? (
        <>
          <Rose scene={scene} position={[0, -1.85, 0]} delay={10} spin={0.012} tilt={0.25} scale={1.25} />
          <Rose scene={scene} position={[-1.5, -2.2, -0.8]} delay={30} spin={-0.01} tilt={0.35} scale={0.95} />
          <Rose scene={scene} position={[1.5, -2.15, -0.6]} delay={45} spin={0.009} tilt={0.3} scale={1.0} />
        </>
      ) : null}
    </ThreeCanvas>
  );
};
