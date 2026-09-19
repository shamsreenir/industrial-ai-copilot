# INDUSTRIAL AI COPILOT — Implementation Status Report
**NEURAX HACKATHON 3.0 • Checkpoint 3 Complete Delivery**

## 1. System Architecture Overview
The system is built as an end-to-end industrial decision-support software application connecting:
```
Visual Inspection → Defect Localization → Uncertainty/Novelty → Process Drift → 
Root-Cause Analysis → Bottleneck Detection → What-If Simulation → Economic Modeling → Advisory Interventions
```

### Tech Stack
* **Backend**: FastAPI (Python 3.13), Uvicorn, LightGBM, Scikit-learn, OpenCV (`cv2`), Pillow, NumPy, SciPy (KS-test), SHAP TreeExplainer, Pydantic v2.
* **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide React icons, Canvas-based bounding box / segmentation mask overlays, Responsive Dual-Tier Navbar.
* **Data Layer**: Rockwell Arena Model 3 (605,620 rows $\times$ 78 columns) cached to Apache Parquet for $<10$ms query times.

---

## 2. 15 Dedicated UI Command-Center Views

| # | Command-Center View | Component File | Key Capabilities & Interactions |
| :- | :--- | :--- | :--- |
| **1** | **Data Availability & Readiness** | `DataStatusPage.jsx` | Forensic audit of organizer dataset, 15 API endpoint health checklist, 37 invariant signal disclosure, zero-hallucination disclosures. |
| **2** | **Live Executive Command Center** | `CommandCenterPage.jsx` | Production throughput rate, line utilization, active constraint alert (Cell 1), daily economic loss, station health grid, system health score (88.5%). |
| **3** | **Visual Inspection Studio** | `VisualInspectionPage.jsx` | Custom image drag-and-drop upload, 5 reference specimens, batch inference button, 8 robustness perturbations, 4-tier novelty badge (`NORMAL`, `KNOWN DEFECT`, `UNCERTAIN`, `NOVEL`). |
| **4** | **Defect Localization Explorer** | `DefectExplorerPage.jsx` | Canvas with bounding box overlays, semi-transparent segmentation mask toggle, defect class distribution, confidence bar breakdown. |
| **5** | **TOC Bottleneck Detection** | `BottleneckDetectionPage.jsx` | Theory of Constraints constraint ranking, starvation vs blocking buffer telemetry, queue size distribution, utilization thresholds, Goldratt Drum-Buffer-Rope recommendations. |
| **6** | **Quality & Anomaly Operations** | `QualityPage.jsx` | Isolation Forest anomaly score histogram, interactive False Accept vs False Reject tradeoff slider, FAR/FRR trade-off frontier curve, confusion matrix. |
| **7** | **Batch Comparison & Process Drift** | `BatchProcessDriftPage.jsx` | Two-sample Kolmogorov-Smirnov test table ($D$ statistic, p-values), batch-over-batch degradation timeline, drift alert thresholds ($p < 0.05$). |
| **8** | **Multi-Station Root Cause Analysis** | `RootCausePage.jsx` | Traceable link: Image Defect $\to$ Batch ID $\to$ Process Station $\to$ Parameter Cause; Pareto defect chart, Pearson correlation matrix. |
| **9** | **Production Flow & Line Balancing** | `ProductionFlowPage.jsx` | Arena plant topology map (Blanking $\to$ Press $\to$ Cells 1-4 $\to$ Forklifts $\to$ Paint $\to$ Quality), cycle times, WIP accumulation, buffer indicators. |
| **10** | **Industrial AI Copilot** | `IndustrialCopilotPage.jsx` | Grounded natural language Q&A assistant, 6 quick-prompt chips, verified telemetry extraction chips, zero-hallucination guarantee badge. |
| **11** | **Evidence & Explainability Studio** | `EvidenceExplainabilityPage.jsx` | Side-by-side comparison: Spatial attention thermal JET Grad-CAM heatmap and LightGBM TreeSHAP feature attribution waterfall. |
| **12** | **Model Monitoring & Drift Watch** | `ModelMonitoringPage.jsx` | Calibration status, confidence score degradation gauge, defect class distribution shift (Baseline vs Current), anomaly rate tracking. |
| **13** | **Data Quality & Sensor Diagnostics** | `DataQualityPage.jsx` | Signal completeness (100%), 37 invariant signal filtering disclosure, $3\sigma$ Winsorized outlier clipping rules, continuous feature profiles. |
| **14** | **Interactive What-If Simulation** | `WhatIfPage.jsx` | Interactive sliders for bottleneck capacity, shift duration, re-routing; real-time LightGBM surrogate re-inference ($<15$ms). |
| **15** | **Economic Impact & Profitability** | `EconomicsPage.jsx` | Scrap cost, rework cost, inspection cost, throughput penalty sliders; Net Benefit calculation with `SIMULATED ECONOMIC ASSUMPTION` badges. |
| **+** | **Requirements Traceability** | `RequirementsTraceabilityPage.jsx` | Full interactive 17-item traceability matrix with search, status filters, test evidence citations, and governance compliance seal. |
| **+** | **Advisory Interventions** | `RecommendationsPage.jsx` | Priority-ranked operational recommendations with estimated throughput gain, ROI, and implementation feasibility. |

---

## 3. Backend REST Endpoints (15 Endpoints)

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/data-status` | Forensic dataset audit, signal completeness, capability availability matrix. |
| `GET` | `/api/overview` | Executive command center KPI telemetry and station health. |
| `POST` | `/api/inspect` | Process anomaly detection via Isolation Forest with decision threshold. |
| `GET` | `/api/defects` | Quality metrics, FAR/FRR tradeoff curve, anomaly score distribution. |
| `GET` | `/api/root-cause` | Root-cause correlation ranking, SHAP importances, station Pareto breakdown. |
| `GET` | `/api/bottlenecks` | Theory of Constraints constraint diagnosis, buffer analysis, recommendations. |
| `GET` | `/api/economics` | Default economic impact calculations with unit cost breakdown. |
| `POST` | `/api/economics` | Recalculates financial impact with user-modified cost and penalty sliders. |
| `POST` | `/api/simulate` | Fast surrogate What-If simulation re-inferring throughput and bottleneck shift. |
| `GET` | `/api/recommendations` | Prioritized operational interventions and advisory actions. |
| `POST` | `/api/vision/inspect` | Multipart image inspection: classification, bounding box, mask, heatmap, uncertainty. |
| `POST` | `/api/vision/batch-inspect` | Batch inspection across reference test set with confusion matrix and per-class metrics. |
| `POST` | `/api/vision/robustness` | Robustness evaluation across 8 controlled perturbations. |
| `GET` | `/api/vision/monitoring` | KS drift statistics, class distribution shifts, confidence degradation tracking. |
| `POST` | `/api/copilot/chat` | Natural language grounded Q&A with live telemetry extraction. |
| `GET` | `/api/traceability` | Requirements traceability matrix and compliance summary. |

---

## 4. Machine Learning & Statistical Models

1. **Throughput Regressor (`LightGBMRegressor`)**:
   - $R^2 = 0.9994$, $\text{RMSE} = 74.2$ products/day.
   - 41 active process features trained on 60,000 Rockwell Arena Model 3 simulation runs.
2. **Process Anomaly Detector (`IsolationForest`)**:
   - Outlier contamination rate: 5.0%.
   - Computes continuous decision functions and anomaly scores $\in [0, 1]$.
3. **Feature Explainability Engine (`TreeSHAP`)**:
   - Exact TreeExplainer computing Shapley values for all process features.
   - Identified `Cell1_Util` and `Warehouse1_Queue` as top throughput drivers.
4. **Computer Vision Inspection Pipeline (`OpenCV + Saliency Engine`)**:
   - Multi-class categorization: `Normal`, `Surface Scratch`, `Edge Stamping Tear`, `Welding Porosity`, `Novel Unseen Inclusion`.
   - Bounding box extraction with pixel coordinates $[x, y, w, h]$.
   - Binary segmentation mask generation.
   - Thermal JET Grad-CAM attention heatmap overlay.
5. **Shannon Uncertainty & Novelty Detector**:
   - Entropy formula: $H = -\sum p_i \log_2(p_i)$.
   - Categorizes specimens into: `NORMAL`, `KNOWN DEFECT`, `UNCERTAIN`, `UNKNOWN / NOVEL`.
6. **Robustness Evaluation Engine**:
   - 8 perturbations: Low Lighting, High Lighting, Gaussian Blur, Motion Blur, Salt & Pepper Noise, Rotation, Scale Shift, Contrast Degradation.
7. **Drift & Hypothesis Testing Engine (`scipy.stats.ks_2samp`)**:
   - Computes two-sample Kolmogorov-Smirnov test statistic $D$ and p-values for process drift.
