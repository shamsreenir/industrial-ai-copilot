from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =====================================================================
# DATA & SYSTEM TRANSPARENCY SCHEMAS
# =====================================================================

class DatasetCapability(BaseModel):
    name: str
    status: str # "DIRECTLY SUPPORTED", "DERIVABLE", "REQUIRES ASSUMPTION", "NOT SUPPORTED BY DATA"
    source_signal: Optional[str] = None
    notes: str

class DataStatusResponse(BaseModel):
    primary_dataset: str
    total_rows: int
    total_features: int
    has_image_data: bool
    has_defect_annotations: bool
    has_cost_data: bool
    capabilities: List[DatasetCapability]
    notes: List[str]

# =====================================================================
# OVERVIEW SCHEMAS
# =====================================================================

class StationKPI(BaseModel):
    name: str
    display_name: str
    utilization: float
    queue_length: float
    status: str # "BOTTLENECK", "CONSTRAINED", "OPTIMAL", "UNDERUTILIZED"
    cycle_time_sec: float

class SystemOverviewResponse(BaseModel):
    timestamp: str
    total_products_produced: int
    production_rate_per_hour: float
    line_average_utilization: float
    active_bottleneck: str
    quality_status: str # "NORMAL", "MONITORING", "ANOMALY DETECTED"
    quality_queue_level: float
    quality_utilization: float
    estimated_daily_revenue: float
    estimated_daily_loss: float
    stations: List[StationKPI]
    system_health_score: float # 0 to 100

# =====================================================================
# QUALITY & INSPECTION SCHEMAS
# =====================================================================

class ProcessInspectionRequest(BaseModel):
    sample_index: Optional[int] = None
    feature_overrides: Optional[Dict[str, float]] = None
    decision_threshold: float = Field(default=0.65, ge=0.0, le=1.0)

class AnomalyFactor(BaseModel):
    feature: str
    display_name: str
    actual_value: float
    normal_mean: float
    deviation_sigmas: float
    impact: str # "HIGH", "MEDIUM", "LOW"

class ProcessInspectionResponse(BaseModel):
    sample_id: str
    decision: str # "ACCEPT", "REJECT", "UNCERTAIN / RE-INSPECT"
    condition_classification: str # "NORMAL", "ANOMALOUS", "UNCERTAIN", "NOVEL CONDITION"
    anomaly_score: float # 0.0 to 1.0 (higher = more anomalous)
    confidence: float # 0.0 to 1.0
    uncertainty_margin: float
    threshold_applied: float
    quality_queue: float
    quality_util: float
    contributing_factors: List[AnomalyFactor]
    explanation: str

class ThresholdTradeoffPoint(BaseModel):
    threshold: float
    false_accept_rate: float
    false_reject_rate: float
    precision: float
    recall: float
    f1_score: float
    total_rejected_units: int

class QualityMetricsResponse(BaseModel):
    current_threshold: float
    confusion_matrix: Dict[str, int] # TP, FP, TN, FN
    precision: float
    recall: float
    f1_score: float
    false_accept_rate: float
    false_reject_rate: float
    anomaly_score_distribution: List[Dict[str, Any]]
    tradeoff_curve: List[ThresholdTradeoffPoint]
    total_samples_evaluated: int
    quality_queue_history: List[float]

# =====================================================================
# ROOT CAUSE SCHEMAS
# =====================================================================

class ContributingFactor(BaseModel):
    factor: str
    display_name: str
    association: str # "High", "Medium", "Low"
    correlation_coefficient: float
    shap_importance: float
    evidence_statement: str
    suspected_mechanism: str

class RootCauseResponse(BaseModel):
    target_analyzed: str # "Quality_Queue Anomaly" or "Throughput Drop"
    top_contributing_factors: List[ContributingFactor]
    correlation_matrix: Dict[str, Dict[str, float]]
    shap_summary: List[Dict[str, Any]]
    synthesized_insight: str
    dataset_decoupling_notice: Optional[str] = None

# =====================================================================
# BOTTLENECK & FLOW SCHEMAS
# =====================================================================

class FlowNode(BaseModel):
    id: str
    label: str
    stage: int
    utilization: float
    queue_length: float
    cycle_time_sec: float
    is_bottleneck: bool
    status: str
    upstream_buffer: Optional[float] = None

class FlowConnection(BaseModel):
    from_node: str
    to_node: str
    transfer_method: str # "Conveyor", "Forklift Fleet", "Direct Flow"
    travel_time_sec: float

class BottleneckResponse(BaseModel):
    primary_bottleneck: str
    bottleneck_utilization: float
    bottleneck_queue: float
    estimated_throughput_loss_percent: float
    theory_of_constraints_diagnosis: Optional[str] = None
    stations: Optional[List[Dict[str, Any]]] = None
    recommendations: Optional[List[Dict[str, Any]]] = None
    nodes: List[FlowNode]
    connections: List[FlowConnection]
    constraining_factors: List[str]
    buffer_imbalances: List[Dict[str, Any]]

# =====================================================================
# ECONOMIC SCHEMAS
# =====================================================================

class EconomicParameters(BaseModel):
    unit_sale_price: float = 120.0
    unit_material_cost: float = 45.0
    scrap_cost_per_unit: float = 35.0
    rework_cost_per_unit: float = 18.0
    downtime_cost_per_hour: float = 4500.0
    daily_operating_hours: float = 24.0

class EconomicAnalysisResponse(BaseModel):
    is_simulated_assumption: bool = True
    parameters_used: EconomicParameters
    daily_gross_production_units: int
    daily_verified_good_units: int
    daily_scrap_units: int
    daily_rework_units: int
    daily_potential_revenue: float
    daily_actual_revenue: float
    daily_scrap_cost: float
    daily_rework_cost: float
    daily_downtime_cost: float
    total_daily_loss: float
    net_operating_margin: float
    profitability_impact_percent: float
    formula_trace: List[Dict[str, str]]

# =====================================================================
# WHAT-IF SIMULATION SCHEMAS
# =====================================================================

class SimulationIntervention(BaseModel):
    station_name: str # e.g. "Cell 1", "Blanking", "Forklift Fleet"
    parameter_modified: str # "cycle_time", "capacity", "batch_weight"
    percent_change: float # e.g. -15.0 for 15% reduction

class SimulationRequest(BaseModel):
    interventions: List[SimulationIntervention]
    economic_params: Optional[EconomicParameters] = None

class MetricDelta(BaseModel):
    baseline: float
    simulated: float
    delta: float
    percent_change: float
    unit: str

class SimulationResponse(BaseModel):
    status: str
    simulation_method: str
    interventions_applied: List[SimulationIntervention]
    throughput: MetricDelta
    cell1_utilization: MetricDelta
    warehouse1_queue: MetricDelta
    quality_queue: MetricDelta
    estimated_profit: MetricDelta
    confidence: str # "High", "Medium", "Low"
    traceability_note: str

# =====================================================================
# RECOMMENDATION SCHEMAS
# =====================================================================

class RecommendationItem(BaseModel):
    id: str
    title: str
    priority: str # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    problem: str
    evidence: List[str]
    suggested_intervention: str
    expected_impact: Dict[str, str]
    confidence: str
    assumptions: str
    what_if_action: Optional[SimulationRequest] = None

class RecommendationsResponse(BaseModel):
    recommendations: List[RecommendationItem]
    executive_summary: str

# =====================================================================
# CHECKPOINT 3: VISION & LOCALIZATION SCHEMAS
# =====================================================================

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    label: str
    confidence: float

class VisionInspectionResponse(BaseModel):
    status: str # "defective", "acceptable", "uncertain"
    decision: str # "ACCEPT", "REJECT", or "SECONDARY REVIEW"
    decision_reason: str
    detections: List[Dict[str, Any]]
    image_width: int
    image_height: int
    threshold: float
    model: str = "NEU-DET YOLO"
    specimen_id: str
    is_demo_sample: bool
    data_grounding_notice: str
    prediction: str # "DEFECT" or "ACCEPTABLE"
    predicted_class: str
    confidence: float
    anomaly_score: float
    threshold_applied: float
    novelty_status: str # "NORMAL", "KNOWN DEFECT", "UNCERTAIN"
    uncertainty_reason: str
    entropy: float
    bounding_boxes: List[BoundingBox]
    class_probabilities: Dict[str, float]
    original_image_uri: str
    annotated_image_uri: str
    gt_annotated_image_uri: Optional[str] = None
    heatmap_uri: str
    segmentation_overlay_uri: str
    ground_truth_comparison: Optional[Dict[str, Any]] = None
    linked_process_batch: Optional[Dict[str, Any]] = None

class VisionBatchInspectionResponse(BaseModel):
    total_inspected: int
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    specificity: float
    false_accept_rate: float
    false_reject_rate: float
    confusion_matrix: Dict[str, Any]
    per_class_metrics: List[Dict[str, Any]]
    inspected_samples: List[VisionInspectionResponse]
    data_required_notice: str
    test_box_map50: Optional[float] = None
    far_sweep: Optional[List[Dict[str, Any]]] = None

# =====================================================================
# CHECKPOINT 3: ROBUSTNESS SCHEMAS
# =====================================================================

class PerturbationEvaluation(BaseModel):
    condition: str
    baseline_class: str
    perturbed_class: str
    baseline_confidence: float
    perturbed_confidence: float
    confidence_delta: float
    performance_status: str
    is_failure: bool

class RobustnessEvaluationResponse(BaseModel):
    overall_robustness_score: float
    total_perturbation_tests: int
    failure_count: int
    perturbation_evaluations: List[PerturbationEvaluation]
    summary: str

# =====================================================================
# CHECKPOINT 3: MODEL MONITORING SCHEMAS
# =====================================================================

class DriftFeature(BaseModel):
    feature: str
    reference_mean: float
    live_mean: float
    ks_statistic: float
    p_value: float
    drift_detected: bool
    status: str

class ModelMonitoringResponse(BaseModel):
    model_version: str
    training_dataset_version: str
    last_inference_timestamp: str
    total_inferences_served: int
    system_drift_index: float
    drift_alert_level: str
    drift_features: List[DriftFeature]
    class_distribution: List[Dict[str, Any]]
    confidence_distribution: List[Dict[str, Any]]
    anomaly_distribution: List[Dict[str, Any]]
    active_threshold: float

# =====================================================================
# CHECKPOINT 3: COPILOT & TRACEABILITY SCHEMAS
# =====================================================================

class CopilotChatRequest(BaseModel):
    query: str

class CopilotChatResponse(BaseModel):
    query: str
    answer: str
    data_points: List[Dict[str, Any]]
    traceability_source: str
    is_grounded: bool

class TraceabilityItem(BaseModel):
    requirement_id: str
    requirement: str
    status: str # "IMPLEMENTED", "PARTIAL", "SIMULATED", "DATA REQUIRED", "NOT SUPPORTED"
    frontend_component: str
    backend_endpoint: str
    ml_service_function: str
    dataset_evidence: str
    test_evidence: str
    limitations: str

class TraceabilityResponse(BaseModel):
    matrix: List[TraceabilityItem]
    compliance_summary: Dict[str, int]

# =====================================================================
# ORGANIZER VISUAL CLASSIFIER & WORKSTATION SCHEMAS
# =====================================================================

class SingleInspectionEvidenceResponse(BaseModel):
    status: str # "acceptable", "defective", "uncertain"
    decision: str # "ACCEPTABLE", "DEFECTIVE", "HUMAN SCRUTINY"
    decision_reason: str
    confidence_state: str # "HIGH", "MARGINAL", "LOW"
    human_review_required: bool
    prediction: Dict[str, Any] # {"class": "scratch", "confidence": 0.942}
    probabilities: Dict[str, float] # {"crack": 0.012, ...}
    thresholds: Dict[str, float]
    calibration: Optional[Dict[str, Any]] = None
    timing: Optional[Dict[str, float]] = None
    explanation: Dict[str, Any] # {"method": "Grad-CAM", "heatmap_uri": "...", "evidence_note": "..."}
    model: Dict[str, str]
    image_uri: str
    specimen_id: Optional[str] = None
    entropy: float
    margin: float
    top_2: Optional[Dict[str, Any]] = None
    top_2_class: Optional[str] = None
    top_2_margin: Optional[float] = None
    ground_truth: Optional[Dict[str, Any]] = None
    linked_process_evidence: Optional[Dict[str, Any]] = None

class BatchInspectionRecord(BaseModel):
    id: str
    filename: str
    predicted_class: str
    confidence: float
    decision: str # "ACCEPTABLE", "DEFECTIVE", "HUMAN SCRUTINY"
    human_review_required: bool
    decision_reason: str
    top_alternatives: List[Dict[str, Any]]
    image_uri: str
    heatmap_uri: Optional[str] = None
    entropy: float
    margin: float

class BatchInspectionSummaryResponse(BaseModel):
    total_inspected: int
    acceptable_count: int
    defective_count: int
    human_scrutiny_count: int
    defect_distribution: Dict[str, int]
    inspected_items: List[BatchInspectionRecord]
    human_scrutiny_queue: List[BatchInspectionRecord]

class DatasetAuditResponse(BaseModel):
    dataset_path: str
    is_valid: bool
    is_labeled: bool = True
    dataset_type: str = "labeled" # "labeled" or "unlabeled"
    classes_detected: List[str] = []
    supported_classes: List[str] = ["crack", "hole", "normal", "rust", "scratch"]
    unsupported_classes: List[str] = []
    has_unsupported_classes: bool = False
    total_images: int
    class_distribution: Dict[str, int] = {}
    invalid_files_count: int = 0
    invalid_files: List[str] = []
    ready_for_evaluation: bool
    notice: str

class DatasetEvaluationJobResponse(BaseModel):
    job_id: str
    status: str # "pending", "running", "completed", "failed", "cancelled"
    dataset_source: str
    total_images: int
    processed_images: int
    progress_percent: float
    elapsed_seconds: float
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class OperatorDecisionRequest(BaseModel):
    item_id: str
    operator_id: str = "OP-01"
    operator_action: str # "ACCEPT", "REJECT", "NEEDS_REVIEW"
    notes: Optional[str] = None

class OperatorDecisionRecord(BaseModel):
    decision_id: str
    item_id: str
    operator_id: str
    operator_action: str
    original_model_decision: str = "HUMAN SCRUTINY"
    original_model_class: str = "UNSPECIFIED"
    timestamp: str
    notes: Optional[str] = None

