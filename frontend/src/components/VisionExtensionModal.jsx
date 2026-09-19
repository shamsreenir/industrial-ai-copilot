import React from 'react';
import { Camera, X, CheckCircle2, AlertTriangle, Code, Layers, UploadCloud, Cpu, Sparkles } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';

export default function VisionExtensionModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="hud-panel rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-cyan-500/30 shadow-2xl relative bg-slate-950/95 overflow-hidden">
        {/* Glow corner line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-mono">
              <h2 className="text-base font-bold text-white tracking-tight">Computer Vision Modular Extension Point</h2>
              <StatusBadge status="PLUG & PLAY" variant="amber" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Production-ready hook for camera inspection streams & YOLO / PatchCore inference
            </p>
          </div>
        </div>

        {/* Operational Status */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 text-xs text-slate-300 space-y-1.5 font-sans">
          <div className="font-bold text-white flex items-center gap-1.5 font-mono text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Active Calibrated Vision Pipeline
          </div>
          <p className="leading-relaxed text-slate-400 text-xs">
            The visual inspection system is running live using an Ultralytics YOLO11n defect detector trained on the NEU-DET benchmark (mAP@50: 73.17%), with an empirical validation-calibrated decision threshold (τ* = 0.50). Drag & drop or sample testing is available in the Visual Inspection Studio.
          </p>
        </div>

        {/* Ingestion Specification */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Active Defect Detection Pipeline:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-900/70 rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-cyan-300 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Ultralytics YOLO11n (NEU-DET)
              </div>
              <div className="text-slate-400 font-sans text-[11px] leading-relaxed">Localizes 6 industrial defect classes (crazing, inclusion, patches, pitted surface, rolled-in scale, scratches) with confidence & IoU evaluation.</div>
            </div>
            <div className="p-3 bg-slate-900/70 rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-purple-300 font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Calibrated Uncertainty & Robustness
              </div>
              <div className="text-slate-400 font-sans text-[11px] leading-relaxed">Validation-derived dual thresholding (τ* = 0.50, τ_low = 0.175) and 8 controlled geometric/photometric robustness transformations.</div>
            </div>
          </div>
        </div>

        {/* Integration Code Snippet */}
        <div>
          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5 text-cyan-400" /> Live Backend Vision API
          </div>
          <pre className="p-3.5 bg-slate-950 rounded-xl border border-white/10 font-mono text-[11px] text-cyan-300 overflow-x-auto leading-relaxed">
{`# backend/app/api/endpoints.py (Live YOLO Inspection Endpoint)
@router.post("/vision/inspect")
async def inspect_uploaded_image(
    file: Optional[UploadFile] = File(None),
    threshold: float = Query(0.50),
    sample_id: Optional[str] = Query(None)
):
    # Executes calibrated YOLO11n defect detector
    # Computes IoU against held-out ground truth if sample_id provided
    return VisionInspectionResponse(...)`}
          </pre>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-mono font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-md shadow-cyan-500/20"
          >
            Close Extension Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
