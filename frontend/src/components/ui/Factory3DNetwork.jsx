import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Layers, Eye, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';

export default function Factory3DNetwork({ onSelectStation = null }) {
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'

  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 700;
    const height = 280;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3, 9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Subtle ambient & directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Factory Stations Nodes Definition
    const stations = [
      { id: 'raw', name: 'Raw Material Feed', x: -4.5, y: 0, z: 0, color: 0x06b6d4, status: 'FEEDER', util: '100%', q: '0' },
      { id: 'blanking', name: 'Blanking Line', x: -2.2, y: 0.3, z: -0.4, color: 0xf59e0b, status: 'CONSTRAINED', util: '85.3%', q: '62.5' },
      { id: 'cell1', name: 'Assembly Cell 1', x: 0.1, y: -0.2, z: 0.3, color: 0xf43f5e, status: 'BOTTLENECK', util: '86.7%', q: '190.8' },
      { id: 'paint', name: 'Paint Conveyor', x: 2.3, y: 0.4, z: -0.3, color: 0x10b981, status: 'OPTIMAL', util: '48.3%', q: '0.0' },
      { id: 'quality', name: 'Quality Inspection', x: 4.5, y: 0, z: 0, color: 0x22d3ee, status: 'EXIT POINT', util: '43.6%', q: '47.9' }
    ];

    const meshes = [];

    // Create 3D Station Nodes
    stations.forEach(st => {
      const group = new THREE.Group();
      group.position.set(st.x, st.y, st.z);

      // Node core cylinder/puck
      const geom = new THREE.CylinderGeometry(0.42, 0.46, 0.28, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: st.color,
        roughness: 0.3,
        metalness: 0.8,
        emissive: st.color,
        emissiveIntensity: st.status === 'BOTTLENECK' ? 0.6 : 0.25
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData = st;
      group.add(mesh);
      meshes.push(mesh);

      // Glowing Aura Ring around node
      const ringGeom = new THREE.RingGeometry(0.55, 0.62, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: st.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      scene.add(group);
    });

    // Connecting Tubing & Animated Flow Packets
    const curvePoints = stations.map(s => new THREE.Vector3(s.x, s.y, s.z));
    const curve = new THREE.CatmullRomCurve3(curvePoints);

    // Conduit Tube
    const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.04, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15
    });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    scene.add(tube);

    // Animated packet spheres travelling along the line
    const packetCount = 8;
    const packetGeom = new THREE.SphereGeometry(0.08, 12, 12);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const packets = Array.from({ length: packetCount }, (_, i) => {
      const p = new THREE.Mesh(packetGeom, packetMat);
      p.userData = { t: i / packetCount };
      scene.add(p);
      return p;
    });

    // Raycaster for hover interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0 && onSelectStation) {
        onSelectStation(intersects[0].object.userData.id);
      }
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClick);

    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Subtle scene floating rotation
      scene.rotation.y = Math.sin(elapsed * 0.3) * 0.08;

      // Animate flowing packets along curve
      packets.forEach(p => {
        p.userData.t = (p.userData.t + 0.003) % 1;
        const pt = curve.getPointAt(p.userData.t);
        p.position.copy(pt);
      });

      // Raycast hover check
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        setHoveredNode(intersects[0].object.userData);
      } else {
        setHoveredNode(null);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onClick);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [viewMode, onSelectStation]);

  return (
    <div className="hud-panel rounded-xl border border-white/10 p-4 relative overflow-hidden bg-slate-950/70">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-white uppercase tracking-wider">
            Factory Digital Twin • Discrete-Event Flow
          </span>
          <span className="text-slate-500 text-[10px] hidden sm:inline">
            (Live Material Conduit)
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setViewMode('3d')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
              viewMode === '3d' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            3D WebGL
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
              viewMode === '2d' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D Schematic
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      {viewMode === '3d' ? (
        <div className="relative w-full h-[280px]">
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Interactive Hover Tooltip Card */}
          {hoveredNode && (
            <div className="absolute top-2 left-2 p-3 bg-slate-950/90 backdrop-blur-md rounded-lg border border-cyan-500/40 shadow-xl font-mono text-xs space-y-1 animate-fadeIn pointer-events-none">
              <div className="flex items-center justify-between gap-4 font-bold text-white">
                <span>{hoveredNode.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                  hoveredNode.status === 'BOTTLENECK' 
                    ? 'bg-rose-950 text-rose-300 border-rose-700' 
                    : hoveredNode.status === 'CONSTRAINED'
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}>
                  {hoveredNode.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between gap-4">
                <span>Utilization:</span>
                <span className="text-cyan-300 font-bold">{hoveredNode.util}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between gap-4">
                <span>WIP Buffer:</span>
                <span className="text-white">{hoveredNode.q} parts</span>
              </div>
            </div>
          )}

          {/* Bottom legend */}
          <div className="absolute bottom-2 right-2 flex items-center gap-3 text-[10px] font-mono bg-slate-950/80 px-2.5 py-1 rounded border border-white/10 text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Normal</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Constrained</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Cell 1 Constraint</span>
          </div>
        </div>
      ) : (
        /* 2D Schematic Fallback */
        <div className="grid grid-cols-5 gap-2 py-8 px-2 font-mono text-xs">
          {[
            { name: 'Raw Material Feed', util: '100%', q: '0.0', status: 'FEEDER', color: 'border-cyan-500/50 bg-cyan-950/20' },
            { name: 'Blanking Line', util: '85.3%', q: '62.5', status: 'CONSTRAINED', color: 'border-amber-500/50 bg-amber-950/20' },
            { name: 'Assembly Cell 1', util: '86.7%', q: '190.8', status: 'BOTTLENECK', color: 'border-rose-500 bg-rose-950/40 glow-rose' },
            { name: 'Paint Conveyor', util: '48.3%', q: '0.0', status: 'OPTIMAL', color: 'border-emerald-500/50 bg-emerald-950/20' },
            { name: 'Quality Check', util: '43.6%', q: '47.9', status: 'EXIT', color: 'border-cyan-500/50 bg-cyan-950/20' }
          ].map((st, i) => (
            <div key={i} className={`p-3 rounded-lg border ${st.color} text-center space-y-1`}>
              <div className="text-[10px] text-slate-400 truncate font-semibold">{st.name}</div>
              <div className="text-base font-bold text-white">{st.util}</div>
              <div className="text-[10px] text-slate-500">{st.q} queue</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
