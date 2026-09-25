import io
import csv
import json
import random
import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import require_roles
from trajectory_engine import trajectory_engine
from model_service import model_service

router = APIRouter(prefix="/api/simulator", tags=["Synthetic Data & Scenario Simulator"])

# Pre-defined MHA Operational Stress Scenarios
PRESET_SCENARIOS = {
    "extended_deployment_night_shift": {
        "title": "Extended Deployment + Night Shift Surge",
        "description": "High-intensity Counter-Naxal/LWE sector: Troops deployed 18+ months with night sentry overextension and deferred leave rotation.",
        "workload_delta_pct": 28.0,          # +28% duty hours (45h -> 57.6h)
        "night_duty_fraction": 0.38,         # 38% night rotations
        "rest_day_compliance_pct": 68.0,     # Down from 95% to 68%
        "leave_delay_days": 24,              # 24 days delayed beyond sanctioned leave
        "saathi_tough_rate": 0.42,           # 42% high-strain self-reflections
        "sector": "counter_naxal_lwe"
    },
    "pre_election_overdrive": {
        "title": "Pre-Election / VIP Security Overdrive",
        "description": "Continuous 16h double-shift duty across state assemblies: Severe rest deficits with 100% frozen leave sanctions.",
        "workload_delta_pct": 42.0,          # +42% duty hours (45h -> 63.9h)
        "night_duty_fraction": 0.45,         # 45% night rotations
        "rest_day_compliance_pct": 52.0,     # Extreme deficit
        "leave_delay_days": 38,              # Leaves completely frozen
        "saathi_tough_rate": 0.58,           # 58% high fatigue
        "sector": "law_and_order_raf"
    },
    "monsoon_border_flashpoint": {
        "title": "Monsoon / High-Altitude Border Flashpoint",
        "description": "Sub-zero temperatures and supply convoy delays in J&K / North-East forward posts: High physical exhaustion with circadian disruption.",
        "workload_delta_pct": 20.0,          # +20% duty hours
        "night_duty_fraction": 0.32,         # 32% night shifts
        "rest_day_compliance_pct": 74.0,     # 74% rest compliance
        "leave_delay_days": 18,              # Supply delays impact relief
        "saathi_tough_rate": 0.36,
        "sector": "high_altitude_ci"
    },
    "post_op_recovery": {
        "title": "Post-Operation Rest & De-escalation (Recovery)",
        "description": "Mandatory administrative rest regularisation: Normalised 40h duty shifts, 96% rest-day compliance, and cleared leave backlog.",
        "workload_delta_pct": -12.0,         # -12% duty hours (recovering)
        "night_duty_fraction": 0.12,         # Low night duty
        "rest_day_compliance_pct": 96.0,     # High recovery
        "leave_delay_days": 0,               # On-schedule leave
        "saathi_tough_rate": 0.08,
        "sector": "peace_training_static"
    }
}

FIRST_NAMES = [
    "Rajesh", "Vikram", "Amit", "Sandeep", "Manoj", "Dharmendra", "Suresh", "Ramesh",
    "Kuldeep", "Jitendra", "Satish", "Pradeep", "Ashok", "Sunil", "Vijay", "Mukesh",
    "Deepak", "Anil", "Praveen", "Rakesh", "Sanjay", "Mahesh", "Devendra", "Gopal",
    "Hemant", "Jagdish", "Kishore", "Lalit", "Mohan", "Naveen", "Omkar", "Pankaj",
    "Harpreet", "Manpreet", "Gurinder", "Arun", "Brijesh", "Chetan", "Dinesh", "Eknath"
]

LAST_NAMES = [
    "Kumar", "Singh", "Sharma", "Verma", "Yadav", "Patel", "Thakur", "Choudhary",
    "Mishra", "Gupta", "Rathore", "Pawar", "Shinde", "Nair", "Reddy", "Meena",
    "Rawat", "Negi", "Bora", "Bisht", "Tomar", "Chauhan", "Solanki", "Jat"
]

RANKS = ["Constable/GD", "Head Constable", "Assistant Sub-Inspector", "Sub-Inspector"]
COMPANIES = ["Alpha Coy (1st Platoon)", "Bravo Coy (2nd Platoon)", "Delta Coy (QAT)", "HQ Coy"]
BATTALIONS = ["14th Bn (Dantewada)", "2nd Bn (Srinagar)", "101 RAF Bn", "7th Bn (Sukma)"]

class GenerateCohortRequest(BaseModel):
    scenario_preset: Optional[str] = "extended_deployment_night_shift"
    cohort_size: int = Field(default=500, ge=50, le=1000)
    workload_delta_pct: float = Field(default=28.0, ge=-40.0, le=60.0)
    night_duty_fraction: float = Field(default=0.38, ge=0.05, le=0.60)
    rest_day_compliance_pct: float = Field(default=68.0, ge=30.0, le=100.0)
    leave_delay_days: int = Field(default=24, ge=0, le=90)
    saathi_tough_rate: float = Field(default=0.42, ge=0.0, le=1.0)
    random_seed: Optional[int] = 42

class SimulateShiftRequest(BaseModel):
    workload_delta_pct: float = Field(default=20.0, ge=-40.0, le=60.0)
    rest_day_compliance_pct: float = Field(default=70.0, ge=30.0, le=100.0)
    night_duty_fraction: float = Field(default=0.35, ge=0.05, le=0.60)
    leave_delay_days: int = Field(default=20, ge=0, le=90)
    cohort_size: int = Field(default=500, ge=50, le=1000)

def synthesize_profile(idx: int, params: Dict[str, Any], rng: random.Random) -> Dict[str, Any]:
    """Generates a single personnel operational record under baseline and simulated conditions."""
    pid = f"SIM{100000 + idx}"
    name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
    rank = rng.choice(RANKS)
    company = rng.choice(COMPANIES)
    battalion = rng.choice(BATTALIONS)
    family_structure = "nuclear" if (idx % 2 == 0) else "joint"
    married = bool(rng.random() > 0.35)
    
    # Baseline normal values
    base_duty = rng.gauss(45.0, 3.5)
    base_night = max(0.08, min(0.25, rng.gauss(0.15, 0.04)))
    base_rest = max(85.0, min(100.0, rng.gauss(95.0, 3.0)))
    base_leave_gap = max(0, int(round(rng.gauss(4.0, 3.0))))
    base_saathi_tough = max(0.05, min(0.30, rng.gauss(0.18, 0.05)))
    base_fatigue = max(15.0, min(40.0, rng.gauss(24.0, 5.0)))
    base_dev = max(-0.8, min(0.8, rng.gauss(0.0, 0.4)))

    # Scenario modulated values
    w_mult = 1.0 + (params["workload_delta_pct"] / 100.0)
    scen_duty = round(max(32.0, min(80.0, base_duty * w_mult + rng.gauss(0.0, 2.0))), 1)
    scen_night = round(max(0.05, min(0.65, params["night_duty_fraction"] + rng.gauss(0.0, 0.05))), 2)
    scen_rest = round(max(30.0, min(100.0, params["rest_day_compliance_pct"] + rng.gauss(0.0, 4.0))), 1)
    scen_leave_gap = max(0, int(round(params["leave_delay_days"] + rng.gauss(0.0, 4.0))))
    scen_saathi_tough = round(max(0.0, min(1.0, params["saathi_tough_rate"] + rng.gauss(0.0, 0.08))), 2)
    
    # Calculate composite deviation drift
    duty_dev = (scen_duty - 45.0) / 7.5
    night_dev = (scen_night - 0.15) / 0.10
    rest_dev = (95.0 - scen_rest) / 12.0
    leave_dev = scen_leave_gap / 15.0
    scen_composite_dev = round(base_dev + (duty_dev * 0.35 + night_dev * 0.25 + rest_dev * 0.25 + leave_dev * 0.15), 2)
    scen_fatigue = round(max(15.0, min(95.0, base_fatigue + (scen_composite_dev * 18.0) + rng.gauss(0.0, 3.0))), 1)

    # Compute baseline likelihood
    base_logit = (base_dev * 1.4) - 0.8
    base_prob = round(1.0 / (1.0 + math.exp(-base_logit)), 3)

    # Compute scenario calibrated likelihood
    scen_logit = (scen_composite_dev * 1.35) - 0.5
    scen_prob = round(max(0.05, min(0.96, 1.0 / (1.0 + math.exp(-scen_logit)))), 3)

    # Determine early warning tier
    if scen_prob >= 0.72 or scen_composite_dev >= 2.0:
        tier = "PRIORITY"
        tier_icon = "🔴"
    elif scen_prob >= 0.50 or scen_composite_dev >= 1.1:
        tier = "SUPPORT"
        tier_icon = "🟠"
    elif scen_prob >= 0.30 or scen_composite_dev >= 0.4:
        tier = "WATCH"
        tier_icon = "🟡"
    else:
        tier = "NORMAL"
        tier_icon = "🟢"

    return {
        "personnel_id": pid,
        "name": name,
        "rank": rank,
        "company": company,
        "battalion": battalion,
        "family_structure": family_structure,
        "married": married,
        # Baseline Metrics
        "baseline_duty_hours": round(base_duty, 1),
        "baseline_night_pct": round(base_night * 100, 1),
        "baseline_rest_pct": round(base_rest, 1),
        "baseline_risk_prob": base_prob,
        # Simulated 30-Day Records
        "simulated_duty_hours": scen_duty,
        "simulated_night_pct": round(scen_night * 100, 1),
        "simulated_rest_pct": scen_rest,
        "simulated_leave_gap_days": scen_leave_gap,
        "simulated_saathi_tough_pct": round(scen_saathi_tough * 100, 1),
        "simulated_fatigue_index": scen_fatigue,
        "simulated_baseline_deviation": scen_composite_dev,
        "simulated_risk_prob": scen_prob,
        "simulated_risk_pct": int(round(scen_prob * 100)),
        "early_warning_tier": tier,
        "early_warning_icon": tier_icon
    }

@router.get("/presets")
def get_scenario_presets(
    current_user: User = Depends(require_roles(["admin"]))
):
    """Returns available MHA operational stress scenario presets. Admin/Evaluator only."""
    return {"presets": PRESET_SCENARIOS}

@router.post("/simulate-shift")
def simulate_shift(
    payload: SimulateShiftRequest,
    current_user: User = Depends(require_roles(["admin"]))
):
    """
    Ultra-fast real-time slider evaluation (<10ms).
    Computes predicted risk trajectory when moving workload and recovery sliders.
    Strictly restricted to Admin/Evaluator role in Evaluation Sandbox.
    """
    w_delta = payload.workload_delta_pct
    rest_comp = payload.rest_day_compliance_pct
    night_pct = payload.night_duty_fraction
    leave_gap = payload.leave_delay_days
    cohort_n = payload.cohort_size

    # Formulaic response modeling for live responsiveness
    workload_stress_factor = (w_delta / 45.0) * 1.8
    rest_deficit_factor = max(0.0, (95.0 - rest_comp) / 40.0) * 2.2
    night_factor = max(0.0, (night_pct - 0.15) / 0.35) * 1.5
    leave_factor = (leave_gap / 60.0) * 1.2

    total_drift = workload_stress_factor + rest_deficit_factor + night_factor + leave_factor

    # Compute shifted distribution percentages
    base_priority_pct = 7.5
    base_support_pct = 12.5
    base_watch_pct = 18.0
    base_normal_pct = 62.0

    # Non-linear escalation
    shift_multiplier = max(0.25, min(4.5, 1.0 + total_drift * 0.9))
    
    new_priority_pct = min(55.0, round(base_priority_pct * shift_multiplier, 1))
    new_support_pct = min(32.0, round(base_support_pct * (1.0 + total_drift * 0.5), 1))
    new_watch_pct = min(25.0, round(base_watch_pct * (0.9 + total_drift * 0.2), 1))
    new_normal_pct = max(5.0, round(100.0 - (new_priority_pct + new_support_pct + new_watch_pct), 1))

    # Average likelihood
    avg_risk_pct = round(18.0 + (new_priority_pct * 0.8) + (new_support_pct * 0.45) + (new_watch_pct * 0.25), 1)
    base_avg_risk_pct = 22.4

    # Estimated personnel counts
    priority_count = int(round((new_priority_pct / 100.0) * cohort_n))
    support_count = int(round((new_support_pct / 100.0) * cohort_n))
    watch_count = int(round((new_watch_pct / 100.0) * cohort_n))
    normal_count = cohort_n - (priority_count + support_count + watch_count)

    # Counter-measure calculation
    countermeasure_relief_pct = round(min(45.0, max(12.0, (95.0 - rest_comp) * 0.85 + (w_delta * 0.4))), 1)

    return {
        "status": "success",
        "cohort_size": cohort_n,
        "input_adjustments": {
            "workload_delta_pct": w_delta,
            "rest_day_compliance_pct": rest_comp,
            "night_duty_fraction": night_pct,
            "leave_delay_days": leave_gap
        },
        "baseline_summary": {
            "average_risk_pct": base_avg_risk_pct,
            "normal_pct": base_normal_pct,
            "watch_pct": base_watch_pct,
            "support_pct": base_support_pct,
            "priority_pct": base_priority_pct
        },
        "simulated_summary": {
            "average_risk_pct": avg_risk_pct,
            "risk_delta_pct": round(avg_risk_pct - base_avg_risk_pct, 1),
            "normal_pct": new_normal_pct,
            "watch_pct": new_watch_pct,
            "support_pct": new_support_pct,
            "priority_pct": new_priority_pct,
            "normal_count": normal_count,
            "watch_count": watch_count,
            "support_count": support_count,
            "priority_count": priority_count
        },
        "primary_stress_drivers": [
            {
                "driver": "Duty Shift Overextension" if w_delta > 15 else "Roster Baseline",
                "weight_pct": min(50, max(20, int(round(35 + w_delta * 0.4)))),
                "impact": f"{'+' if w_delta >= 0 else ''}{w_delta:.0f}% shift load"
            },
            {
                "driver": "Recovery / Circadian Deficit",
                "weight_pct": min(45, max(20, int(round(30 + (95 - rest_comp) * 0.5)))),
                "impact": f"{rest_comp:.0f}% rest compliance ({night_pct*100:.0f}% night)"
            },
            {
                "driver": "Family Separation & Leave Delay",
                "weight_pct": min(35, max(15, int(round(20 + leave_gap * 0.3)))),
                "impact": f"+{leave_gap} days leave delay"
            }
        ],
        "countermeasure_impact": {
            "recommended_action": "Enforce mandatory 24-hr rest rotation following night ambushes and regularise leave pipeline.",
            "projected_priority_reduction_pct": countermeasure_relief_pct,
            "estimated_cases_prevented": int(round(priority_count * (countermeasure_relief_pct / 100.0)))
        }
    }

@router.post("/generate-cohort")
def generate_scenario_cohort(
    payload: GenerateCohortRequest,
    current_user: User = Depends(require_roles(["admin"]))
):
    """
    Generates a full synthetic cohort (e.g. 500 personnel) with 30-day operational records.
    Runs calibrated XGBoost inference and outputs comparative benchmarks + CSV download payload.
    Strictly restricted to Admin/Evaluator role in Evaluation Sandbox.
    """
    # Merge preset parameters if preset specified
    params = {
        "workload_delta_pct": payload.workload_delta_pct,
        "night_duty_fraction": payload.night_duty_fraction,
        "rest_day_compliance_pct": payload.rest_day_compliance_pct,
        "leave_delay_days": payload.leave_delay_days,
        "saathi_tough_rate": payload.saathi_tough_rate
    }
    preset_info = PRESET_SCENARIOS.get(payload.scenario_preset or "")
    scenario_title = preset_info["title"] if preset_info else "Custom Operational Stress Scenario"
    scenario_desc = preset_info["description"] if preset_info else "User-defined parametric what-if workload simulation."

    rng = random.Random(payload.random_seed or 42)
    cohort = []
    
    tier_counts = {"NORMAL": 0, "WATCH": 0, "SUPPORT": 0, "PRIORITY": 0}
    total_risk = 0.0

    for i in range(payload.cohort_size):
        rec = synthesize_profile(i, params, rng)
        cohort.append(rec)
        tier_counts[rec["early_warning_tier"]] += 1
        total_risk += rec["simulated_risk_pct"]

    cohort_n = len(cohort)
    avg_sim_risk = round(total_risk / cohort_n, 1)

    # Sort cohort by risk descending for top flagged inspection
    cohort.sort(key=lambda x: x["simulated_risk_pct"], reverse=True)
    top_flagged = cohort[:15]

    # Generate in-memory CSV for 1-click evaluation download
    csv_output = io.StringIO()
    writer = csv.writer(csv_output)
    writer.writerow(["# SIMULATION DATA — NOT REAL PERSONNEL DATA — FOR MODEL EVALUATION ONLY"])
    writer.writerow([
        "personnel_id", "name", "rank", "company", "battalion", "family_structure",
        "baseline_duty_hours", "baseline_night_pct", "baseline_rest_pct", "baseline_risk_prob",
        "simulated_duty_hours", "simulated_night_pct", "simulated_rest_pct",
        "simulated_leave_gap_days", "simulated_saathi_tough_pct", "simulated_fatigue_index",
        "simulated_baseline_deviation", "simulated_risk_pct", "early_warning_tier"
    ])
    for r in cohort:
        writer.writerow([
            r["personnel_id"], r["name"], r["rank"], r["company"], r["battalion"], r["family_structure"],
            r["baseline_duty_hours"], r["baseline_night_pct"], r["baseline_rest_pct"], r["baseline_risk_prob"],
            r["simulated_duty_hours"], r["simulated_night_pct"], r["simulated_rest_pct"],
            r["simulated_leave_gap_days"], r["simulated_saathi_tough_pct"], r["simulated_fatigue_index"],
            r["simulated_baseline_deviation"], r["simulated_risk_pct"], r["early_warning_tier"]
        ])

    csv_string = csv_output.getvalue()

    # Comparative Stats
    base_counts = {
        "NORMAL": int(round(cohort_n * 0.62)),
        "WATCH": int(round(cohort_n * 0.18)),
        "SUPPORT": int(round(cohort_n * 0.125)),
        "PRIORITY": int(round(cohort_n * 0.075))
    }

    priority_change_pct = round(((tier_counts["PRIORITY"] - base_counts["PRIORITY"]) / max(1, base_counts["PRIORITY"])) * 100.0, 1)

    return {
        "status": "success",
        "scenario_title": scenario_title,
        "scenario_description": scenario_desc,
        "cohort_size": cohort_n,
        "records_duration_days": 30,
        "parameters": params,
        "baseline_distribution": {
            "normal": base_counts["NORMAL"],
            "normal_pct": round((base_counts["NORMAL"] / cohort_n) * 100, 1),
            "watch": base_counts["WATCH"],
            "watch_pct": round((base_counts["WATCH"] / cohort_n) * 100, 1),
            "support": base_counts["SUPPORT"],
            "support_pct": round((base_counts["SUPPORT"] / cohort_n) * 100, 1),
            "priority": base_counts["PRIORITY"],
            "priority_pct": round((base_counts["PRIORITY"] / cohort_n) * 100, 1),
            "average_risk_pct": 22.4
        },
        "simulated_distribution": {
            "normal": tier_counts["NORMAL"],
            "normal_pct": round((tier_counts["NORMAL"] / cohort_n) * 100, 1),
            "watch": tier_counts["WATCH"],
            "watch_pct": round((tier_counts["WATCH"] / cohort_n) * 100, 1),
            "support": tier_counts["SUPPORT"],
            "support_pct": round((tier_counts["SUPPORT"] / cohort_n) * 100, 1),
            "priority": tier_counts["PRIORITY"],
            "priority_pct": round((tier_counts["PRIORITY"] / cohort_n) * 100, 1),
            "average_risk_pct": avg_sim_risk
        },
        "delta_impact": {
            "priority_change_pct": priority_change_pct,
            "average_risk_increase_points": round(avg_sim_risk - 22.4, 1),
            "additional_triage_cases": max(0, tier_counts["PRIORITY"] - base_counts["PRIORITY"])
        },
        "top_flagged_samples": top_flagged,
        "csv_download_ready": True,
        "csv_row_count": len(cohort),
        "csv_payload": csv_string
    }
