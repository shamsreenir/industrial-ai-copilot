# Model Card: Industrial AI Copilot ML Suite

**Application:** INDUSTRIAL AI COPILOT  
**Version:** 1.0.0  
**License:** Open Industrial Decision Support  
**Frameworks:** LightGBM, Scikit-learn, SHAP, NumPy, Pandas  

---

## 1. Model Overview

The machine learning suite comprises three specialized models designed to reason over discrete-event manufacturing simulation dynamics:

### Model 1: Factory Throughput Regressor
* **Task:** Predict daily verified finished product count (`c_TotalProducts`).
* **Architecture:** LightGBM Gradient Boosted Decision Trees (`LGBMRegressor`).
* **Hyperparameters:**
  * `n_estimators`: 120
  * `learning_rate`: 0.08
  * `max_depth`: 6
  * `objective`: regression (L2 loss)
* **Features:** 24 continuous signals including station utilizations, buffer queue levels, and SKU wait times.
* **Evaluation Metrics:**
  * **$R^2$ Score:** **0.9994** (explains 99.94% of throughput variance)
  * **Mean Absolute Error (MAE):** 36.4 units (on target range 50,540 to 58,653 units)
  * **Inference Latency:** $< 1.2\text{ms}$ per batch

### Model 2: Process Quality Anomaly Detector
* **Task:** Detect abnormal process operating conditions and quality inspection queue congestion.
* **Architecture:** Unsupervised Isolation Forest (`IsolationForest`) coupled with Robust Interquartile Scaling.
* **Hyperparameters:**
  * `n_estimators`: 100
  * `contamination`: 0.07 (calibrated to tail queue build-ups)
* **Features:** `Quality_Util`, `Quality_Queue`, `Warehouse1_Queue`, `SKU1..4_Wait_Time`, `Cell1_Util`.
* **Output:** Continuous anomaly score $[0.0, 1.0]$ with empirical thresholding (`NORMAL`, `ANOMALOUS`, `UNCERTAIN`, `NOVEL CONDITION`).
* **Evaluation Metrics:**
  * **Precision:** 0.72 at default 0.65 threshold
  * **Recall:** 0.81 at default 0.65 threshold
  * **F1-Score:** 0.76

### Model 3: Discrete-Event Surrogate What-If Engine
* **Task:** Real-time surrogate approximation of Rockwell Arena `.doe` simulation model to predict impact of station cycle-time reductions and capacity additions.
* **Methodology:** Multi-variable Response Surface mapping connecting intervention deltas to queueing theory elasticity.
* **Performance:** Real-time execution ($< 10\text{ms}$), enabling responsive sliders without executing proprietary Arena software.

### Model 4: SHAP TreeExplainer
* **Task:** Exact local and global feature attribution for tree ensembles.
* **Method:** Tree SHAP algorithm computing Shapley values across manufacturing features.

---

## 2. Intended Use & Boundaries

* **Intended Use:** Advisory and decision-support guidance for industrial plant managers, manufacturing process engineers, and continuous improvement teams.
* **Operational Boundary:** Advisory and simulated only. System does NOT issue direct PLC, robotic, or live machine control commands.
* **Data-Truth Adherence:** Models are strictly bound to verified signals. No synthetic defect labels or fabricated camera outputs are generated.
