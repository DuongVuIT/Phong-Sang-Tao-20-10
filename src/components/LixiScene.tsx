import { ContactShadows, Environment, Float, Lightformer, Sparkles, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const BASE = import.meta.env.BASE_URL;
const LIXI_URL = `${BASE}models/lixi.glb`;
const ROSE_URL = `${BASE}models/rose.glb`;
useGLTF.preload(LIXI_URL);
useGLTF.preload(ROSE_URL);

const damp = THREE.MathUtils.damp;

/** Mặt thiệp: vẽ chữ bằng canvas để in lên tấm thiệp 3D trong bao. */
function useCardTexture(name: string, amount: string, color: string) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let alive = true;
    const draw = async () => {
      await Promise.all([document.fonts.load("700 80px 'Be Vietnam Pro'"), document.fonts.load("700 80px 'Dancing Script'")]).catch(() => {});
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 950;
      const g = c.getContext("2d")!;
      const bg = g.createLinearGradient(0, 0, 0, c.height);
      bg.addColorStop(0, "#fffaf0");
      bg.addColorStop(1, "#ffeede");
      g.fillStyle = bg;
      g.fillRect(0, 0, c.width, c.height);
      g.textAlign = "center";
      g.fillStyle = color;
      g.font = "700 64px 'Dancing Script', cursive";
      g.fillText(`Gửi ${name}`, 320, 190);
      g.fillStyle = "#8f0a1f";
      g.font = "400 34px 'Be Vietnam Pro', sans-serif";
      g.fillText("Lì xì 20 · 10", 320, 290);
      const gold = g.createLinearGradient(0, 380, 0, 520);
      gold.addColorStop(0, "#f7c548");
      gold.addColorStop(0.5, "#c98a12");
      gold.addColorStop(1, "#f2b631");
      g.fillStyle = gold;
      g.font = "700 118px 'Be Vietnam Pro', sans-serif";
      g.fillText(amount, 320, 500);
      g.fillStyle = "#c8102e";
      g.font = "700 54px 'Dancing Script', cursive";
      g.fillText("Luôn xinh đẹp", 320, 660);
      g.fillText("& hạnh phúc nha! 💖", 320, 735);
      g.font = "64px serif";
      g.fillText("🌹 🌸 🌷", 320, 860);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      if (alive) setTex(t);
    };
    draw();
    return () => {
      alive = false;
    };
  }, [name, amount, color]);
  return tex;
}

function Envelope({ opened, onOpen, name, amount, color }: { opened: boolean; onOpen: () => void; name: string; amount: string; color: string }) {
  const { scene } = useGLTF(LIXI_URL);
  const root = useMemo(() => {
    const r = scene.clone(true);
    r.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat?.name === "Gold") {
        mat.metalness = 0.85;
        mat.roughness = 0.28;
      }
    });
    return r;
  }, [scene]);
  const flap = useMemo(() => root.getObjectByName("Flap")!, [root]);
  const card = useMemo(() => root.getObjectByName("Card")!, [root]);
  const cardHome = useMemo(() => card.position.clone(), [card]);
  const group = useRef<THREE.Group>(null);
  const openedAt = useRef<number | null>(null);
  const [hover, setHover] = useState(false);
  const tex = useCardTexture(name, amount, color);

  useEffect(() => {
    if (!tex) return;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.72), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
    face.position.z = 0.0075;
    card.add(face);
    return () => {
      card.remove(face);
    };
  }, [card, tex]);

  useEffect(() => {
    document.body.style.cursor = hover && !opened ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover, opened]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (opened && openedAt.current === null) openedAt.current = t;
    const since = openedAt.current === null ? -1 : t - openedAt.current;
    const g = group.current!;

    if (since < 0) {
      // lắc nhẹ mời gọi
      g.rotation.z = Math.sin(t * 2.2) * 0.04 * (hover ? 2.2 : 1);
      g.rotation.y = damp(g.rotation.y, hover ? 0.25 : Math.sin(t * 0.6) * 0.18, 4, dt);
      const s = hover ? 1.05 : 1;
      g.scale.setScalar(damp(g.scale.x, s, 6, dt));
      return;
    }
    g.rotation.z = damp(g.rotation.z, 0, 4, dt);
    g.rotation.y = damp(g.rotation.y, 0, 3, dt);
    g.scale.setScalar(damp(g.scale.x, 1, 4, dt));
    // 1) nắp mở
    flap.rotation.x = damp(flap.rotation.x, -2.75, 5, dt);
    // 2) thiệp trượt lên, 3) bay ra phía trước
    if (since > 0.35) card.position.y = damp(card.position.y, cardHome.y + (since > 1.2 ? 0.55 : 1.5), 4, dt);
    if (since > 1.2) {
      card.position.z = damp(card.position.z, cardHome.z + 0.9, 4, dt);
      card.scale.setScalar(damp(card.scale.x, 1.12, 4, dt));
    }
  });

  return (
    <group
      ref={group}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (!opened) onOpen();
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <primitive object={root} />
    </group>
  );
}

function Rose({ position, rotation, speed }: { position: [number, number, number]; rotation: number; speed: number }) {
  const { scene } = useGLTF(ROSE_URL);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return (
    <Float speed={1.6} rotationIntensity={0.4} floatIntensity={0.8}>
      <group ref={ref} position={position} rotation={[0.25, rotation, rotation * 0.3]} scale={0.8}>
        <primitive object={clone} />
      </group>
    </Float>
  );
}

export function LixiScene(props: { opened: boolean; onOpen: () => void; name: string; amount: string; color: string }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.2, 5.2], fov: 40 }} gl={{ antialias: true, alpha: true }} className="lixi-canvas">
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff1e0" />
      <pointLight position={[-3, -1, 3]} intensity={30} color="#ff6f9c" />
      <Suspense fallback={null}>
        <Float speed={2} rotationIntensity={0.15} floatIntensity={props.opened ? 0.2 : 0.6}>
          <Envelope {...props} />
        </Float>
        <Rose position={[-1.75, -0.5, -0.6]} rotation={0.6} speed={0.35} />
        <Rose position={[1.8, -0.3, -0.8]} rotation={-0.5} speed={-0.3} />
        <Sparkles count={90} scale={[6, 4, 3]} size={3.5} speed={0.4} color="#ffd36e" />
        <ContactShadows position={[0, -1.6, 0]} opacity={0.45} scale={8} blur={2.6} far={3} color="#3a0b1e" />
        {/* môi trường ánh sáng dựng tại chỗ (không tải HDR từ mạng) cho vàng kim loại lấp lánh */}
        <Environment resolution={256}>
          <color attach="background" args={["#6b3326"]} />
          <Lightformer intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} color="#fff3d6" />
          <Lightformer intensity={2} position={[-4, 0, 2]} scale={[2, 6, 1]} color="#ff9fbe" />
          <Lightformer intensity={2} position={[4, 1, 2]} scale={[2, 6, 1]} color="#ffd36e" />
          <Lightformer intensity={0.6} position={[0, -3, -2]} scale={[10, 2, 1]} color="#7a1a3d" />
        </Environment>
      </Suspense>
    </Canvas>
  );
}
