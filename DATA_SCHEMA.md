# Data Schema: Industrial AI Copilot

**Primary Dataset:** Model 3 (`Model_3.csv`)  
**Simulation Platform:** Rockwell Arena v15  
**Observation Horizon:** 24-Hour Manufacturing Operating Horizon  
**Total Records:** 605,620  
**Total Columns:** 78 (77 Manufacturing Signals + `Time_Now`)  

---

## 1. Taxonomic Classification of Features

| Category | Count | Description |
| :--- | :--- | :--- |
| **Utilization Variables** | 13 | Fractional capacity utilization of manufacturing and material handling resources ($0.0 \le \text{Util} \le 1.0$). |
| **Queue Length Variables** | 21 | Backlog and buffer WIP (Work-In-Progress) awaiting processing or material transfer. |
| **Production & Routing Counters**| 21 | Cumulative batch completions, dynamic cell routing counts, and verified finished goods output. |
| **Time & Duration Metrics** | 20 | Value-Added (VA), Non-Value-Added (NVA), Transit, and Queue Waiting times per SKU variant (in hours). |
| **Metadata & Operating State** | 2 | Simulation epoch markers and trailing export columns. |

---

## 2. Complete Column Data Dictionary (Model 3)

| Index | Column Name | Type | Unit | Mean | Min / Max | Description & Manufacturing Concept |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | `Time_Now` | int64 | Hours | 24.0 | 24.0 / 24.0 | Simulation run duration horizon (24 hours). |
| 1 | `Blanking_Util` | float64 | Ratio | 0.8526 | 0.8276 / 0.8778 | Utilization of coil-cutting blanking station (Cap: 6). |
| 2 | `Blanking_SKU1_Queue`| float64 | Parts | 0.0470 | 0.0179 / 0.0836 | Arrival queue for SKU 1 raw blanks. |
| 3 | `Blanking_SKU2_Queue`| float64 | Parts | 0.0470 | 0.0191 / 0.0860 | Arrival queue for SKU 2 raw blanks. |
| 4 | `Blanking_SKU3_Queue`| float64 | Parts | 0.0470 | 0.0186 / 0.0785 | Arrival queue for SKU 3 raw blanks. |
| 5 | `Blanking_SKU4_Queue`| float64 | Parts | 0.0470 | 0.0198 / 0.0813 | Arrival queue for SKU 4 raw blanks. |
| 6 | `Press1_Util` | float64 | Ratio | 0.4355 | 0.2434 / 0.6818 | Utilization of hydraulic press type 1 (SKU 1). |
| 7 | `Press2_Util` | float64 | Ratio | 0.4360 | 0.2329 / 0.6963 | Utilization of hydraulic press type 2 (SKU 2). |
| 8 | `Press3_Util` | float64 | Ratio | 0.4368 | 0.2201 / 0.6948 | Utilization of hydraulic press type 3 (SKU 3). |
| 9 | `Press4_Util` | float64 | Ratio | 0.4367 | 0.2339 / 0.6836 | Utilization of hydraulic press type 4 (SKU 4). |
| 10 | `Press1_Queue` | float64 | Parts | 72.30 | 25.93 / 297.82 | Parts waiting for Press 1. |
| 11 | `Press2_Queue` | float64 | Parts | 62.92 | 24.26 / 225.59 | Parts waiting for Press 2. |
| 12 | `Press3_Queue` | float64 | Parts | 54.24 | 19.56 / 221.39 | Parts waiting for Press 3. |
| 13 | `Press4_Queue` | float64 | Parts | 52.24 | 19.46 / 290.66 | Parts waiting for Press 4. |
| 14 | `Cell1_Util` | float64 | Ratio | **0.8669** | 0.7313 / **0.9620** | **Assembly Cell 1 Utilization (Critical Bottleneck).** |
| 15 | `Cell2_Util` | float64 | Ratio | 0.7002 | 0.5429 / 0.8420 | Assembly Cell 2 Utilization (Flexible SKU 2 & 4). |
| 16 | `Cell3_Util` | float64 | Ratio | 0.6638 | 0.4411 / 0.9096 | Assembly Cell 3 Utilization (Flexible SKU 2 & 3). |
| 17 | `Cell4_Util` | float64 | Ratio | 0.8137 | 0.6550 / 0.9554 | Assembly Cell 4 Utilization (Flexible SKU 3 & 4). |
| 18 | `Cell1_Queue` | float64 | Parts | 0.00 | 0.00 / 0.00 | Queue at Cell 1 (Held in upstream Warehouse 1). |
| 19 | `Cell2_Queue` | float64 | Parts | 0.00 | 0.00 / 0.00 | Queue at Cell 2 (Held in upstream Warehouse 2). |
| 20 | `Cell3_Queue` | float64 | Parts | 0.00 | 0.00 / 0.00 | Queue at Cell 3 (Held in upstream Warehouse 3). |
| 21 | `Cell4_Queue` | float64 | Parts | 0.00 | 0.00 / 0.00 | Queue at Cell 4 (Held in upstream Warehouse 4). |
| 22 | `Warehouse1_Queue` | float64 | Parts | **190.77** | 41.23 / **1828.13**| **Upstream WIP Buffer before Cell 1 (Severe congestion).**|
| 23 | `Warehouse_2_Queue`| float64 | Parts | 18.55 | 8.47 / 33.58 | Upstream WIP Buffer before Cell 2. |
| 24 | `Warehouse_3_Queue`| float64 | Parts | 70.85 | 19.98 / 811.64 | Upstream WIP Buffer before Cell 3. |
| 25 | `Warehouse_4_Queue`| float64 | Parts | 77.41 | 28.90 / 510.51 | Upstream WIP Buffer before Cell 4. |
| 26 | `c_Cycle1` | int64 | Cycles | 23,362 | 13,572 / 32,138 | Batch production cycle counter for SKU 1. |
| 27 | `c_Cycle2` | int64 | Cycles | 15,663 | 8,618 / 24,813 | Batch production cycle counter for SKU 2. |
| 28 | `c_Cycle3` | int64 | Cycles | 14,655 | 7,268 / 23,630 | Batch production cycle counter for SKU 3. |
| 29 | `c_Cycle4` | int64 | Cycles | 40,078 | 25,167 / 51,919 | Batch production cycle counter for SKU 4. |
| 30 | `c_Cell1_SKU1` | int64 | Parts | 14,698 | 8,251 / 21,299 | Cumulative SKU 1 units assembled in Cell 1. |
| 31 | `c_Cell1__SKU2` | int64 | Parts | 10,941 | 6,011 / 17,355 | Cumulative SKU 2 units assembled in Cell 1. |
| 32 | `c_Cell1__SKU3` | int64 | Parts | 0.0 | 0.0 / 0.0 | Routing constraint: SKU 3 not routed to Cell 1. |
| 33 | `c_Cell1__SKU4` | int64 | Parts | 3,973 | 0.0 / 10,114 | Cumulative SKU 4 units assembled in Cell 1. |
| 34 | `c_Cell2__SKU1` | int64 | Parts | 0.0 | 0.0 / 0.0 | Routing constraint: SKU 1 only routed to Cell 1. |
| 35 | `c_Cell2__SKU2` | int64 | Parts | 2,866 | 1,574 / 4,483 | Cumulative SKU 2 units assembled in Cell 2. |
| 36 | `c_Cell2__SKU3` | int64 | Parts | 0.0 | 0.0 / 0.0 | Routing constraint: SKU 3 not routed to Cell 2. |
| 37 | `c_Cell2__SKU4` | int64 | Parts | 4,588 | 2,454 / 6,762 | Cumulative SKU 4 units assembled in Cell 2. |
| 38 | `c_Cell3__SKU1` | int64 | Parts | 0.0 | 0.0 / 0.0 | Routing constraint: SKU 1 only routed to Cell 1. |
| 39 | `c_Cell3__SKU2` | int64 | Parts | 1,102 | 88.0 / 2,473 | Cumulative SKU 2 units assembled in Cell 3. |
| 40 | `c_Cell3__SKU3` | int64 | Parts | 4,268 | 2,140 / 6,776 | Cumulative SKU 3 units assembled in Cell 3. |
| 41 | `c_Cell3__SKU4` | int64 | Parts | 0.0 | 0.0 / 0.0 | Routing constraint: SKU 4 not routed to Cell 3. |
| 42 | `c_Cell4__SKU1` | int64 | Parts | 0.0 | 0.0 / 0.0 | Routing constraint: SKU 1 only routed to Cell 1. |
| 43 | `c_Cell4__SKU2` | int64 | Parts | 0.0 | 0.0 / 0.0 | Routing constraint: SKU 2 not routed to Cell 4. |
| 44 | `c_Cell4__SKU3` | int64 | Parts | 10,616 | 5,314 / 16,917 | Cumulative SKU 3 units assembled in Cell 4. |
| 45 | `c_Cell4__SKU4` | int64 | Parts | 6,311 | 1,387 / 11,935 | Cumulative SKU 4 units assembled in Cell 4. |
| 46 | `Paint1_Util` | float64 | Ratio | 0.4831 | 0.4450 / 0.5189 | Utilization of Paint Conveyor 1. |
| 47 | `Paint2_Util` | float64 | Ratio | 0.5028 | 0.4625 / 0.5419 | Utilization of Paint Conveyor 2. |
| 48 | `Quality_Util` | float64 | Ratio | 0.4358 | 0.4024 / 0.4672 | Utilization of Quality Inspection station. |
| 49 | `Paint1_Queue` | float64 | Parts | 0.00 | 0.00 / 0.00 | Paint 1 queue (Conveyor capacity = 3600). |
| 50 | `Paint2_Queue` | float64 | Parts | 0.00 | 0.00 / 0.00 | Paint 2 queue (Conveyor capacity = 3600). |
| 51 | `Quality_Queue` | float64 | Parts | 47.86 | 40.83 / 54.53 | **Queue awaiting Quality Inspection.** |
| 52 | `Forklift_Util` | float64 | Ratio | 0.6084 | 0.5231 / 0.6906 | Fleet utilization of 8 material handling forklifts. |
| 53 | `Forklift_Blanking_Queue` | float64 | Parts | 155.62 | 131.77 / 181.87| Batches waiting for forklift pickup at Blanking. |
| 54 | `Forklift_Press_Queue` | float64 | Parts | 140.83 | 122.70 / 163.04| Batches waiting for forklift pickup at Pressing. |
| 55 | `Forklift_Assembly_Queue` | float64 | Parts | 138.11 | 117.89 / 157.91| Batches waiting for forklift pickup at Assembly. |
| 56 | `c_TotalProducts` | int64 | Parts | **54,747** | 50,540 / **58,653** | **Finished Goods Verified Output (Ground Truth).** |
| 57 | `SKU1_VA_Time` | float64 | Hours | 1.5256 | 1.5254 / 1.5258 | Value-added cycle time for SKU 1 (~91.5 min). |
| 58 | `SKU1_NVA_Time` | int64 | Hours | 0.0 | 0.0 / 0.0 | Non-value-added time for SKU 1. |
| 59 | `SKU1_Transport_Time` | float64 | Hours | 0.5361 | 0.5256 / 0.5475 | Total forklift transit time for SKU 1 (~32.2 min). |
| 60 | `SKU1_Wait_Time` | float64 | Hours | 0.7245 | 0.4644 / 2.5741 | In-line queue waiting time for SKU 1. |
| 61 | `SKU1_Other_Time` | int64 | Hours | 0.0 | 0.0 / 0.0 | Unclassified delay time for SKU 1. |
| 62 | `SKU2_VA_Time` | float64 | Hours | 1.5228 | 1.5227 / 1.5230 | Value-added cycle time for SKU 2. |
| 63 | `SKU2_NVA_Time` | int64 | Hours | 0.0 | 0.0 / 0.0 | Non-value-added time for SKU 2. |
| 64 | `SKU2_Transport_Time` | float64 | Hours | 0.5361 | 0.5257 / 0.5475 | Transit time for SKU 2. |
| 65 | `SKU2_Wait_Time` | float64 | Hours | 0.4231 | 0.3593 / 0.5911 | Waiting time for SKU 2. |
| 66 | `SKU2_Other_Time` | int64 | Hours | 0.0 | 0.0 / 0.0 | Unclassified delay time for SKU 2. |
| 67 | `SKU3_VA_Time` | float64 | Hours | 1.5250 | 1.5249 / 1.5252 | Value-added cycle time for SKU 3. |
| 68 | `SKU3_NVA_Time` | int64 | Hours | 0.0 | 0.0 / 0.0 | Non-value-added time for SKU 3. |
| 69 | `SKU3_Transport_Time` | float64 | Hours | 0.5361 | 0.5270 / 0.5455 | Transit time for SKU 3. |
| 70 | `SKU3_Wait_Time` | float64 | Hours | 0.4654 | 0.3707 / 1.3236 | Waiting time for SKU 3. |
| 71 | `SKU3_Other_Time` | int64 | Hours | 0.0 | 0.0 / 0.0 | Unclassified delay time for SKU 3. |
| 72 | `SKU4_VA_Time` | float64 | Hours | 1.5234 | 1.5232 / 1.5236 | Value-added cycle time for SKU 4. |
| 73 | `SKU4_NVA_Time` | int64 | Hours | 0.0 | 0.0 / 0.0 | Non-value-added time for SKU 4. |
| 74 | `SKU4_Transport_Time` | float64 | Hours | 0.5361 | 0.5268 / 0.5462 | Transit time for SKU 4. |
| 75 | `SKU4_Wait_Time` | float64 | Hours | 0.4600 | 0.3771 / 1.0699 | Waiting time for SKU 4. |
| 76 | `SKU4_Other_Time` | int64 | Hours | 0.0 | 0.0 / 0.0 | Unclassified delay time for SKU 4. |
| 77 | `Blanking_Queue` | float64 | Parts | 62.54 | 50.00 / 78.61 | Raw coil backlog awaiting Blanking operation. |
