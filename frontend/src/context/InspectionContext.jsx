import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const InspectionContext = createContext(null);

const DEFAULT_INSPECTION_STATE = {
  id: null,
  source: null, // 'uploaded' | 'sample'
  file: null,
  previewUrl: null,
  metadata: null,
  specimenId: null,
  modelMode: 'primary',
  threshold: 0.85,
  
  // Inference lifecycle
  status: 'IDLE', // 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  error: null,
  
  // Model inference results
  result: null,
  predictedClass: null,
  displayLabel: null,
  calibratedConfidence: null,
  uncalibratedConfidence: null,
  probabilities: null,
  entropy: null,
  margin: null,
  decision: null,
  decisionState: null,
  decisionReason: null,
  thresholdApplied: null,
  timing: null,
  
  // Visual evidence
  originalImageUri: null,
  heatmapUri: null,
  annotatedImageUri: null,
  boundingBoxes: [],
  detections: [],
  
  // Optical robustness testing
  robustnessStatus: 'IDLE', // 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  robustnessResult: null,
  robustnessError: null,
  
  // Operator scrutiny decision
  operatorDecision: null,
};

export function InspectionProvider({ children }) {
  const [inspection, setInspection] = useState(DEFAULT_INSPECTION_STATE);

  // Helper to completely clear stale state when switching images
  const clearInspection = useCallback(() => {
    setInspection(DEFAULT_INSPECTION_STATE);
  }, []);

  // Set a new uploaded file as the active inspection subject
  const selectFile = useCallback((file, modelMode = 'primary', threshold = 0.85) => {
    if (!file) return;
    const inspectionId = `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const url = URL.createObjectURL(file);

    // Initial state with completely cleared stale results
    const newInspection = {
      ...DEFAULT_INSPECTION_STATE,
      id: inspectionId,
      source: 'uploaded',
      file: file,
      previewUrl: url,
      specimenId: file.name,
      modelMode: modelMode,
      threshold: threshold,
      metadata: {
        filename: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        timestamp: new Date().toISOString(),
        dimensions: null
      },
      status: 'IDLE',
    };

    // Attempt to load dimensions asynchronously
    const img = new Image();
    img.onload = () => {
      setInspection(prev => {
        if (prev.id === inspectionId && prev.metadata) {
          return {
            ...prev,
            metadata: {
              ...prev.metadata,
              dimensions: { width: img.naturalWidth, height: img.naturalHeight }
            }
          };
        }
        return prev;
      });
    };
    img.src = url;

    setInspection(newInspection);
  }, []);

  // Set a held-out benchmark specimen as the active inspection subject
  const selectSample = useCallback((specimenId, modelMode = 'primary', threshold = 0.85, previewUri = null) => {
    if (!specimenId) return;
    const inspectionId = `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    setInspection({
      ...DEFAULT_INSPECTION_STATE,
      id: inspectionId,
      source: 'sample',
      file: null,
      previewUrl: previewUri,
      specimenId: specimenId,
      modelMode: modelMode,
      threshold: threshold,
      metadata: {
        filename: specimenId,
        size: null,
        type: 'image/png',
        timestamp: new Date().toISOString(),
        dimensions: null
      },
      status: 'IDLE',
    });
  }, []);

  // Update threshold for active inspection
  const setThreshold = useCallback((newThreshold) => {
    setInspection(prev => ({
      ...prev,
      threshold: newThreshold
    }));
  }, []);

  // Update model mode for active inspection
  const setModelMode = useCallback((newMode) => {
    setInspection(prev => ({
      ...prev,
      modelMode: newMode
    }));
  }, []);

  // Run visual inspection inference against backend
  const runInspection = useCallback(async (customFile = null, customSpecimen = null, customMode = null, customThreshold = null) => {
    let targetFile = customFile;
    let targetSpecimen = customSpecimen;
    let targetMode = customMode;
    let targetThreshold = customThreshold;

    // Use current inspection if arguments are omitted
    setInspection(prev => {
      targetFile = targetFile !== null ? targetFile : prev.file;
      targetSpecimen = targetSpecimen !== null ? targetSpecimen : prev.specimenId;
      targetMode = targetMode !== null ? targetMode : prev.modelMode;
      targetThreshold = targetThreshold !== null ? targetThreshold : prev.threshold;
      
      return {
        ...prev,
        status: 'LOADING',
        error: null,
        // Reset previous execution results on re-run
        result: null,
        predictedClass: null,
        calibratedConfidence: null,
        heatmapUri: null,
        robustnessStatus: 'IDLE',
        robustnessResult: null,
        robustnessError: null,
        operatorDecision: null,
      };
    });

    if (!targetFile && !targetSpecimen) {
      setInspection(prev => ({
        ...prev,
        status: 'ERROR',
        error: 'No image file or benchmark specimen provided for inspection.'
      }));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('model_mode', targetMode || 'primary');
      formData.append('threshold', (targetThreshold ?? 0.85).toString());

      if (targetFile) {
        formData.append('file', targetFile);
      } else if (targetSpecimen) {
        formData.append('specimen_name', targetSpecimen);
      }

      const res = await fetch('/api/vision/inspect', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Inspection failed (HTTP ${res.status})`);
      }

      const data = await res.json();

      // Extract all calibrated and forensic attributes
      const topCls = data.predicted_class || data.prediction?.class || 'unknown';
      const conf = typeof data.confidence === 'number' ? data.confidence : (data.prediction?.confidence ?? 0);
      const uncalConf = data.uncalibrated_confidence ?? conf;
      const probs = data.class_probabilities || data.probabilities || {};
      const entropy = typeof data.entropy === 'number' ? data.entropy : 0;
      const margin = typeof data.margin === 'number' ? data.margin : 0;
      const dec = data.decision || 'ACCEPT';
      const decState = data.decision_state || (dec === 'ACCEPT' ? 'ACCEPTABLE' : (dec === 'REJECT' ? 'DEFECTIVE' : 'HUMAN SCRUTINY'));
      const decReason = data.decision_reason || data.uncertainty_reason || '';
      const heatUri = data.heatmap_uri || data.explanation?.heatmap_uri || null;
      const origUri = data.original_image_uri || data.image_uri || null;
      const annUri = data.annotated_image_uri || null;
      const bboxes = data.bounding_boxes || [];
      const dets = data.detections || [];
      const timing = data.timing || { total_ms: data.latency_ms || 18.4 };

      setInspection(prev => ({
        ...prev,
        status: 'SUCCESS',
        error: null,
        result: data,
        specimenId: data.specimen_id || prev.specimenId,
        predictedClass: topCls,
        displayLabel: topCls.toUpperCase(),
        calibratedConfidence: conf,
        uncalibratedConfidence: uncalConf,
        probabilities: probs,
        entropy: entropy,
        margin: margin,
        decision: dec,
        decisionState: decState,
        decisionReason: decReason,
        thresholdApplied: data.threshold_applied ?? data.threshold ?? targetThreshold,
        timing: timing,
        originalImageUri: origUri,
        heatmapUri: heatUri,
        annotatedImageUri: annUri,
        boundingBoxes: bboxes,
        detections: dets,
        // If previewUrl is not yet set, use original image URI from response
        previewUrl: prev.previewUrl || origUri,
      }));

      return data;
    } catch (err) {
      setInspection(prev => ({
        ...prev,
        status: 'ERROR',
        error: err.message
      }));
      throw err;
    }
  }, []);

  // Run optical robustness testing against active inspection
  const runRobustness = useCallback(async () => {
    let activeFile = null;
    let activeSpecimen = null;
    let activeMode = 'primary';

    setInspection(prev => {
      activeFile = prev.file;
      activeSpecimen = prev.specimenId;
      activeMode = prev.modelMode || 'primary';

      return {
        ...prev,
        robustnessStatus: 'LOADING',
        robustnessError: null,
      };
    });

    if (!activeFile && !activeSpecimen) {
      setInspection(prev => ({
        ...prev,
        robustnessStatus: 'ERROR',
        robustnessError: 'No active specimen available for optical robustness evaluation.'
      }));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('model_mode', activeMode);

      if (activeFile) {
        formData.append('file', activeFile);
      } else {
        formData.append('specimen_name', activeSpecimen);
      }

      const res = await fetch('/api/vision/robustness', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Robustness testing failed (HTTP ${res.status})`);
      }

      const data = await res.json();

      setInspection(prev => ({
        ...prev,
        robustnessStatus: 'SUCCESS',
        robustnessResult: data,
        robustnessError: null
      }));

      return data;
    } catch (err) {
      setInspection(prev => ({
        ...prev,
        robustnessStatus: 'ERROR',
        robustnessError: err.message
      }));
      throw err;
    }
  }, []);

  // Submit human operator triage decision
  const logOperatorDecision = useCallback(async (action, notes = '') => {
    let itemId = null;
    setInspection(prev => {
      itemId = prev.specimenId || (prev.file ? prev.file.name : 'active_specimen');
      return prev;
    });

    try {
      const res = await fetch('/api/vision/operator-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          operator_id: "OP-PRIMARY-042",
          operator_action: action,
          notes: notes || `Operator triage: ${action} for ${itemId}`
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to log operator decision (HTTP ${res.status})`);
      }

      const record = await res.json();
      setInspection(prev => ({
        ...prev,
        operatorDecision: record
      }));
      return record;
    } catch (err) {
      console.error("Operator decision logging error:", err);
      throw err;
    }
  }, []);

  const value = {
    inspection,
    hasActiveInspection: Boolean(inspection.status === 'SUCCESS' && inspection.result),
    hasSelectedSpecimen: Boolean(inspection.file || inspection.specimenId),
    selectFile,
    selectSample,
    clearInspection,
    setThreshold,
    setModelMode,
    runInspection,
    runRobustness,
    logOperatorDecision,
  };

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspection() {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error('useInspection must be used within an InspectionProvider');
  }
  return context;
}
