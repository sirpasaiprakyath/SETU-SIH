from __future__ import annotations
import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any, Optional, Union
from config import MODEL_PATH

logger = logging.getLogger("guardian_minds.model_service")

FEATURE_NAMES = [
    "tenure_years", "married", "family_separation_load", "posting_duration_months", "leave_entitled_annual",
    "leave_availed_last_12m", "leave_utilization_ratio", "avg_weekly_duty_hours_last_90d",
    "night_duty_fraction_last_90d", "rest_day_compliance_pct_last_90d", "fatigue_index",
    "sick_reports_last_90d", "sick_reports_personal_baseline_90d", "sick_reports_deviation",
    "nco_observation_current", "nco_observation_baseline", "nco_observation_deviation",
    "transfer_count_last_24m", "saathi_sessions_last_90d", "saathi_sessions_personal_baseline_90d",
    "saathi_engagement_deviation", "saathi_tough_rate_current", "saathi_tough_deviation",
    "saathi_safety_net_triggers_90d", "training_hours_last_12m", "baseline_deviation_composite",
    "rank_tier_Constable/GD", "rank_tier_Head Constable", "rank_tier_Inspector+",
    "family_status_separated_hardship_posting", "family_status_with_family",
    "posting_category_counter_naxal_lwe", "posting_category_law_order_vip_duty", "posting_category_peace_training_static"
]

# Demographic cohort priors for Empirical Bayes cold-start adaptation (<90 days deployment)
COHORT_PRIORS = {
    "counter_naxal_lwe": {
        "sick_dev": 0.35,
        "nco_dev": 0.40,
        "leave_dev": 45.0,
        "saathi_tough_dev": 0.08,
        "name": "Counter-Naxal / LWE High-Tempo Cohort"
    },
    "counter_insurgency_jk_ne": {
        "sick_dev": 0.30,
        "nco_dev": 0.35,
        "leave_dev": 40.0,
        "saathi_tough_dev": 0.07,
        "name": "Counter-Insurgency Sector (J&K/NE) Cohort"
    },
    "law_order_vip_duty": {
        "sick_dev": 0.20,
        "nco_dev": 0.25,
        "leave_dev": 35.0,
        "saathi_tough_dev": 0.05,
        "name": "Public Order & VIP Security Continuous Cohort"
    },
    "peace_training_static": {
        "sick_dev": 0.10,
        "nco_dev": 0.10,
        "leave_dev": 25.0,
        "saathi_tough_dev": 0.02,
        "name": "Peace Station / Static Training Cohort"
    }
}

def anonymize_profile(profile: Any) -> Dict[str, Any]:
    """
    Strict anonymization gate for ML inference and aggregate analytics:
    Ensures personnel are referenced SOLELY by service ID (personnel_id).
    Strips all names, contact info, and PII from the dictionary before feature extraction.
    """
    if hasattr(profile, "__dict__"):
        d = dict(profile.__dict__)
    else:
        d = dict(profile)
    # Strip PII
    for pii_key in ["name", "full_name", "username", "email", "phone", "password", "password_hash"]:
        d.pop(pii_key, None)
    return d

class WelfareModelService:
    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self.booster = None
        self._load_model()

    def anonymize_profile(self, profile: Any) -> Dict[str, Any]:
        """Strip all PII so feature extraction and predictions operate ID-only."""
        return anonymize_profile(profile)

    def _load_model(self):
        """Loads trained XGBoost baseline model."""
        if not os.path.exists(self.model_path):
            logger.warning(f"Model file not found at {self.model_path}. Will check parent paths.")
            alt_path = os.path.join(os.path.dirname(__file__), "..", "baseline_model.json")
            if os.path.exists(alt_path):
                self.model_path = alt_path

        try:
            import xgboost as xgb
            self.booster = xgb.Booster()
            self.booster.load_model(self.model_path)
            logger.info(f"Loaded XGBoost booster from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load XGBoost model: {e}")
            self.booster = None

    def profile_to_features(self, profile: Any) -> pd.DataFrame:
        """Converts a PersonnelProfile model or dict into model feature vector with zero PII."""
        d = anonymize_profile(profile)

        # Base scalar fields
        married_val = bool(d.get("married", False))
        posting_dur = float(d.get("posting_duration_months", 6.0))
        fam_status = d.get("family_status", "with_family")
        fam_struct = d.get("family_structure", "nuclear")

        # Compute family_separation_load interaction feature:
        # posting_duration_months * (1.6 if separated AND nuclear, 1.0 if separated AND joint, 0 if not separated) / 12
        if "family_separation_load" in d and d["family_separation_load"] is not None and float(d["family_separation_load"]) > 0:
            sep_load = float(d["family_separation_load"])
        else:
            is_sep = (fam_status == "separated_hardship_posting") or (married_val and fam_status != "with_family")
            if is_sep and married_val:
                mult = 1.6 if fam_struct == "nuclear" else (1.0 if fam_struct == "joint" else 0.0)
                sep_load = round(float((posting_dur * mult) / 12.0), 3)
            else:
                sep_load = 0.0

        # Saathi features (wired directly to ML risk model)
        saathi_sess_curr = float(d.get("saathi_sessions_last_90d", 2.0))
        saathi_sess_base = float(d.get("saathi_sessions_personal_baseline_90d", 2.0))
        saathi_eng_dev = float(d.get("saathi_engagement_deviation", saathi_sess_curr - saathi_sess_base))
        saathi_tough_curr = float(d.get("saathi_tough_rate_current", 0.20))
        saathi_tough_dev = float(d.get("saathi_tough_deviation", 0.0))
        saathi_safety_net = int(d.get("saathi_safety_net_triggers_90d", 0))

        # Composite baseline deviation with Empirical Bayes Cohort Prior Transfer
        posting_cat = "peace_training_static"
        raw_post = str(d.get("posting_category", "")).lower()
        if "lwe" in raw_post or "naxal" in raw_post:
            posting_cat = "counter_naxal_lwe"
        elif "jk" in raw_post or "insurgency" in raw_post:
            posting_cat = "counter_insurgency_jk_ne"
        elif "vip" in raw_post or "order" in raw_post or "raf" in raw_post:
            posting_cat = "law_order_vip_duty"

        prior = COHORT_PRIORS.get(posting_cat, COHORT_PRIORS["peace_training_static"])
        t_days = max(1.0, posting_dur * 30.0)
        # Adaptation weight w_t: scales from 0.10 (Day 1) to 1.0 (Day 90)
        w_t = min(1.0, max(0.10, t_days / 90.0))
        cohort_weight = 1.0 - w_t

        sick_dev_raw = float(d.get("sick_reports_deviation", 0.0))
        nco_dev_raw = float(d.get("nco_observation_deviation", 0.0))
        leave_dev_raw = float(100 - float(d.get("leave_utilization_ratio", 0.5)) * 100)
        saathi_tough_dev_raw = float(saathi_tough_dev)

        # Empirical Bayes smooth blend: (1 - w_t)*Prior + w_t*Individual
        eff_sick_dev = cohort_weight * prior["sick_dev"] + w_t * sick_dev_raw
        eff_nco_dev = cohort_weight * prior["nco_dev"] + w_t * nco_dev_raw
        eff_leave_dev = cohort_weight * prior["leave_dev"] + w_t * leave_dev_raw
        eff_saathi_dev = cohort_weight * prior["saathi_tough_dev"] + w_t * saathi_tough_dev_raw

        if "baseline_deviation_composite" in d and d["baseline_deviation_composite"] is not None:
            composite = float(d["baseline_deviation_composite"])
        else:
            composite = round(
                0.25 * (eff_sick_dev / 1.5) +
                0.25 * (eff_nco_dev / 1.0) +
                0.20 * ((eff_leave_dev - 35) / 20.0) +
                0.30 * (eff_saathi_dev / 0.15),
                3
            )

        data = {
            "tenure_years": float(d.get("tenure_years", 5.0)),
            "married": 1 if married_val else 0,
            "family_separation_load": float(sep_load),
            "posting_duration_months": posting_dur,
            "leave_entitled_annual": int(d.get("leave_entitled_annual", 30)),
            "leave_availed_last_12m": float(d.get("leave_availed_last_12m", 15.0)),
            "leave_utilization_ratio": float(d.get("leave_utilization_ratio", 0.5)),
            "avg_weekly_duty_hours_last_90d": float(d.get("avg_weekly_duty_hours_last_90d", 45.0)),
            "night_duty_fraction_last_90d": float(d.get("night_duty_fraction_last_90d", 0.15)),
            "rest_day_compliance_pct_last_90d": float(d.get("rest_day_compliance_pct_last_90d", 95.0)),
            "fatigue_index": float(d.get("fatigue_index", 25.0)),
            "sick_reports_last_90d": float(d.get("sick_reports_last_90d", 1.0)),
            "sick_reports_personal_baseline_90d": float(d.get("sick_reports_personal_baseline_90d", 1.0)),
            "sick_reports_deviation": float(d.get("sick_reports_deviation", 0.0)),
            "nco_observation_current": float(d.get("nco_observation_current", 2.0)),
            "nco_observation_baseline": float(d.get("nco_observation_baseline", 2.0)),
            "nco_observation_deviation": float(d.get("nco_observation_deviation", 0.0)),
            "transfer_count_last_24m": int(d.get("transfer_count_last_24m", 0)),
            "saathi_sessions_last_90d": saathi_sess_curr,
            "saathi_sessions_personal_baseline_90d": saathi_sess_base,
            "saathi_engagement_deviation": saathi_eng_dev,
            "saathi_tough_rate_current": saathi_tough_curr,
            "saathi_tough_deviation": saathi_tough_dev,
            "saathi_safety_net_triggers_90d": saathi_safety_net,
            "training_hours_last_12m": float(d.get("training_hours_last_12m", 40.0)),
            "baseline_deviation_composite": composite,
            # Keep family_structure in dict for reason generator
            "_family_structure": fam_struct
        }

        # One-hot categorical encodings matching train_baseline.py (drop_first=True)
        rank = d.get("rank_tier", "Constable/GD")
        for r in ["Constable/GD", "Head Constable", "Inspector+"]:
            data[f"rank_tier_{r}"] = 1 if rank == r else 0

        fam = d.get("family_status", "with_family")
        data["family_status_separated_hardship_posting"] = 1 if fam == "separated_hardship_posting" else 0
        data["family_status_with_family"] = 1 if fam == "with_family" else 0

        # CRPF Operational Posting Categories:
        # counter_insurgency_jk_ne is the dropped first reference category
        raw_posting = str(d.get("posting_category", "peace_training_static")).lower()
        if "lwe" in raw_posting or "naxal" in raw_posting or raw_posting == "operational_lwe":
            posting = "counter_naxal_lwe"
        elif "vip" in raw_posting or "order" in raw_posting or "raf" in raw_posting or raw_posting == "vvip_security":
            posting = "law_order_vip_duty"
        elif "peace" in raw_posting or "static" in raw_posting or "training" in raw_posting or raw_posting == "peace_station":
            posting = "peace_training_static"
        else:
            posting = "counter_insurgency_jk_ne"

        data["posting_category_counter_naxal_lwe"] = 1 if posting == "counter_naxal_lwe" else 0
        data["posting_category_law_order_vip_duty"] = 1 if posting == "law_order_vip_duty" else 0
        data["posting_category_peace_training_static"] = 1 if posting == "peace_training_static" else 0

        df = pd.DataFrame([data], columns=FEATURE_NAMES)
        return df

    def predict(self, profile: Any) -> Tuple[float, bool, List[str]]:
        """
        Runs model prediction and returns:
        1. Likelihood person would benefit from welfare check-in (0.0 to 1.0)
        2. Recommended review flag (True/False, threshold >= 0.50)
        3. Top 3 plain-language contributing reasons derived from SHAP/feature contribution
        """
        if self.booster is None:
            self._load_model()

        df_feat = self.profile_to_features(profile)
        
        # If booster failed to load, calculate from composite formula
        if self.booster is None:
            comp = float(df_feat["baseline_deviation_composite"].iloc[0])
            prob = 1 / (1 + np.exp(-(comp * 1.2 - 0.5)))
            # Lowered triage threshold to 40% (Task 7): favors catching welfare risk over false negatives
            flag = prob >= 0.40
            reasons = self._generate_fallback_reasons(df_feat)
            return round(float(prob), 3), bool(flag), reasons

        import xgboost as xgb
        dmat = xgb.DMatrix(df_feat)
        
        # Probability prediction
        raw_prob = self.booster.predict(dmat)[0]
        prob = round(float(raw_prob), 3)
        # Lowered triage threshold to 40% (Task 7): favors catching welfare risk over false negatives
        flag = prob >= 0.40

        # Feature contributions via native SHAP TreeExplainer in XGBoost
        # pred_contribs returns [feature_contrib_1, ..., feature_contrib_k, bias]
        contribs = self.booster.predict(dmat, pred_contribs=True)[0][:-1]
        
        # Sort features by highest positive push towards review
        feat_order = np.argsort(contribs)[::-1]
        top_features = [FEATURE_NAMES[idx] for idx in feat_order if contribs[idx] > 0][:3]
        if not top_features:
            top_features = [FEATURE_NAMES[idx] for idx in feat_order[:3]]

        reasons = self._format_plain_reasons(top_features, df_feat)

        # =====================================================================
        # NON-COMPENSATORY WELFARE ESCALATION RULE (TASK 3)
        # Any individual sub-signal crossing a critical risk threshold unconditionally
        # escalates the case to 'needs review'. Calm scores on other signals CANNOT
        # average out or mask an acute risk alert.
        # =====================================================================
        d = df_feat.iloc[0].to_dict()
        escalations = []

        # 1. Frontline NCO Structured Observation Alert
        nco_curr = float(d.get("nco_observation_current", 2.0))
        nco_dev = float(d.get("nco_observation_deviation", 0.0))
        if nco_curr >= 4.0 or nco_dev >= 1.5:
            escalations.append(f"Frontline NCO logged critical behavioral alert ({nco_curr:.1f}/5.0, deviation {nco_dev:+.1f}).")

        # 2. Saathi Crisis or High-Distress Trigger
        safety_net = int(d.get("saathi_safety_net_triggers_90d", 0))
        tough_rate = float(d.get("saathi_tough_rate_current", 0.20))
        if safety_net > 0:
            escalations.append("Confidential Saathi crisis safety-net bridge was activated.")
        elif tough_rate >= 0.60:
            escalations.append(f"High self-reported strain density in Saathi ({tough_rate*100:.0f}% tough sessions).")

        # 3. Severe Operational Duty Overload
        duty_hours = float(d.get("avg_weekly_duty_hours_last_90d", 45.0))
        rest_comp = float(d.get("rest_day_compliance_pct_last_90d", 95.0))
        if duty_hours >= 70.0 or rest_comp < 60.0:
            escalations.append(f"Severe operational duty overload ({duty_hours:.1f}h/wk, rest compliance {rest_comp:.1f}%).")

        # 4. Dhvani Vocal Acoustic Telemetry (Weighted by Trend Depth)
        vocal_score = float(d.get("vocal_strain_score") or d.get("dhvani_strain_score") or 0.0)
        vocal_checks = int(d.get("dhvani_checks_count") or d.get("vocal_checks_count") or 1)
        vocal_drift = float(d.get("dhvani_drift") or 0.0)

        if vocal_score > 0:
            if vocal_checks >= 3:
                # Multi-reading longitudinal trend (Full Weight)
                if vocal_score >= 55.0 or vocal_drift >= 15.0:
                    escalations.append(f"Persistent longitudinal vocal acoustic strain ({vocal_score:.0f}%, baseline drift +{vocal_drift:.1f}%).")
            else:
                # Provisional single reading (Lower Weight — requires acute spike >= 75% to escalate solo)
                if vocal_score >= 75.0:
                    escalations.append(f"Acute vocal acoustic tension spike on recent check-in ({vocal_score:.0f}%, provisional single reading).")

        if escalations:
            flag = True
            prob = max(prob, 0.74)
            reasons = escalations + [r for r in reasons if r not in escalations]
            reasons = reasons[:3]

        return prob, flag, reasons

    def predict_trajectory(self, profile: Any, case: Optional[Any] = None) -> Dict[str, Any]:
        """
        Invokes the Stress Trajectory Engine to compute velocity, 4 primary drivers,
        and forward predictive trajectory.
        """
        from trajectory_engine import trajectory_engine
        return trajectory_engine.compute_trajectory(profile, case)

    def _format_plain_reasons(self, top_features: List[str], df: pd.DataFrame) -> List[str]:
        """Translates top contributing features into human-readable, plain-language statements."""
        reasons = []
        d = df.iloc[0].to_dict()

        for feat in top_features:
            if feat == "baseline_deviation_composite":
                val = d.get("baseline_deviation_composite", 0.0)
                reasons.append(f"Composite behavioural pattern shifted {val:+.2f} std dev from this person's own historical baseline.")
            elif feat == "saathi_safety_net_triggers_90d":
                val = d.get("saathi_safety_net_triggers_90d", 0)
                reasons.append(f"Crisis safety net support activated ({int(val)} recent trigger{'' if int(val) == 1 else 's'}).")
            elif feat == "saathi_tough_deviation":
                val = d.get("saathi_tough_deviation", 0)
                reasons.append("Significant personal shift in self-reported strain (elevated 'Tough' check-ins vs own baseline normal).")
            elif feat == "saathi_engagement_deviation":
                val = d.get("saathi_engagement_deviation", 0)
                reasons.append(f"Uncharacteristic surge in Saathi companion check-ins ({val:+.0f} sessions vs personal baseline).")
            elif feat == "saathi_tough_rate_current":
                val = d.get("saathi_tough_rate_current", 0)
                reasons.append(f"Recent Saathi check-in answers indicate high stress frequency ({val*100:.0f}% 'Tough' sessions).")
            elif feat == "sick_reports_deviation":
                curr = d.get("sick_reports_last_90d", 0)
                base = d.get("sick_reports_personal_baseline_90d", 0)
                reasons.append(f"Sick-report frequency ({curr:.0f} in trailing 90 days) is up sharply from personal average ({base:.0f}).")
            elif feat == "nco_observation_deviation":
                curr = d.get("nco_observation_current", 0)
                base = d.get("nco_observation_baseline", 0)
                reasons.append(f"Daily section muster concern score ({curr:.0f}/5) elevated compared to historical normal ({base:.0f}/5).")
            elif feat == "fatigue_index":
                val = d.get("fatigue_index", 0)
                reasons.append(f"Elevated fatigue index proxy ({val:.1f}/100) reflecting high sustained operational tempo.")
            elif feat == "leave_utilization_ratio":
                val = d.get("leave_utilization_ratio", 0)
                reasons.append(f"Leave utilisation low ({val*100:.0f}%) despite ongoing deployment load.")
            elif feat == "posting_duration_months":
                val = d.get("posting_duration_months", 0)
                reasons.append(f"Posting duration in high-tempo sector has reached {val:.0f} months without adequate rest rotation.")
            elif feat == "avg_weekly_duty_hours_last_90d":
                val = d.get("avg_weekly_duty_hours_last_90d", 0)
                reasons.append(f"Average duty load elevated to {val:.1f} hours/week over the last 90 days.")
            elif feat == "night_duty_fraction_last_90d":
                val = d.get("night_duty_fraction_last_90d", 0)
                reasons.append(f"Night-duty assignment fraction is high ({val*100:.0f}% of duties) over the past quarter.")
            elif feat == "rest_day_compliance_pct_last_90d":
                val = d.get("rest_day_compliance_pct_last_90d", 0)
                reasons.append(f"Rest-day compliance declined to {val:.1f}% during active operational roster.")
            elif feat == "family_separation_load":
                dur = d.get("posting_duration_months", 0)
                struct = d.get("_family_structure", "nuclear")
                if struct == "nuclear":
                    reasons.append("Extended separation from family, nuclear household with no local support")
                else:
                    reasons.append(f"Prolonged separation from family ({dur:.0f} months) with joint family domestic support load")
            elif feat == "family_status_separated_hardship_posting":
                struct = d.get("_family_structure", "nuclear")
                if struct == "nuclear":
                    reasons.append("Extended separation from family, nuclear household with no local support")
                else:
                    reasons.append("Family separation during prolonged hardship deployment zone.")
            elif feat == "posting_category_counter_naxal_lwe":
                reasons.append("Active deployment in high-hazard Counter-Naxal / Left-Wing Extremism (LWE) operational grid.")
            elif feat == "posting_category_law_order_vip_duty":
                reasons.append("Continuous high-mobility Law & Order, election deployment, or VIP/VVIP security duty.")
            elif feat == "posting_category_peace_training_static":
                reasons.append("Static training establishment or Group Centre posting.")
            elif feat == "posting_category_counter_insurgency_jk_ne":
                reasons.append("Active Counter-Insurgency deployment in J&K / North-East theatre.")
            elif feat == "transfer_count_last_24m":
                val = d.get("transfer_count_last_24m", 0)
                reasons.append(f"Multiple station transfers ({val:.0f} in past 24 months) disrupting personal settling.")
            else:
                reasons.append(f"Administrative duty pattern for {feat.replace('_', ' ')} drifted from regular profile.")

        return reasons

    def _generate_fallback_reasons(self, df: pd.DataFrame) -> List[str]:
        d = df.iloc[0].to_dict()
        reasons = [
            f"Composite behavioural pattern shifted {d.get('baseline_deviation_composite', 0.0):+.2f} std dev from personal baseline.",
            f"Sick-report frequency ({d.get('sick_reports_last_90d', 0):.0f}) elevated above trailing average ({d.get('sick_reports_personal_baseline_90d', 0):.0f}).",
        ]
        if d.get("family_separation_load", 0) >= 0.8:
            if d.get("_family_structure") == "nuclear":
                reasons.append("Extended separation from family, nuclear household with no local support")
            else:
                reasons.append(f"Prolonged separation from family ({d.get('posting_duration_months', 0):.0f} months) with domestic support load")
        else:
            reasons.append(f"Operational fatigue proxy at {d.get('fatigue_index', 0):.1f}/100 under current posting conditions.")
        return reasons

    def get_cold_start_metadata(self, profile: Any) -> Dict[str, Any]:
        """
        Returns Empirical Bayes cold-start adaptation metrics for newly arrived troops (<90 days).
        Ensures transparency and explains prior-to-posterior transition weights.
        """
        d = anonymize_profile(profile)
        posting_dur = float(d.get("posting_duration_months", 6.0))
        t_days = max(1.0, posting_dur * 30.0)
        is_cold_start = posting_dur < 3.0
        w_t = min(1.0, max(0.10, t_days / 90.0))
        cohort_weight = 1.0 - w_t

        posting_cat = "peace_training_static"
        raw_post = str(d.get("posting_category", "")).lower()
        if "lwe" in raw_post or "naxal" in raw_post:
            posting_cat = "counter_naxal_lwe"
        elif "jk" in raw_post or "insurgency" in raw_post:
            posting_cat = "counter_insurgency_jk_ne"
        elif "vip" in raw_post or "order" in raw_post or "raf" in raw_post:
            posting_cat = "law_order_vip_duty"

        prior = COHORT_PRIORS.get(posting_cat, COHORT_PRIORS["peace_training_static"])
        return {
            "is_cold_start": is_cold_start,
            "posting_duration_months": posting_dur,
            "days_in_posting": round(t_days, 1),
            "adaptation_weight_individual_pct": round(w_t * 100, 1),
            "cohort_prior_weight_pct": round(cohort_weight * 100, 1) if is_cold_start else 0.0,
            "cohort_category": posting_cat,
            "cohort_name": prior["name"],
            "methodology": "Empirical Bayes Hierarchical Cohort Prior (Prior-to-Posterior Transfer)",
            "guidance_note": (
                f"Active Adaptation: {round(cohort_weight * 100)}% weight assigned to {prior['name']} "
                f"baseline, smoothly transitioning to pure individual moving baseline over 90 days."
                if is_cold_start else "Standard 90-day personal longitudinal baseline fully established."
            )
        }


# Global singleton for baseline model
model_service = WelfareModelService()

class SaathiModelService:
    """
    Dedicated verification model engine for Saathi adaptive check-ins.
    Evaluates multi-factor operational parameters, adaptive questionnaire responses,
    and psychological resilience indicators.
    """
    def __init__(self, model_file: str = "saathi_model.json"):
        self.model_file = model_file
        self.model_data = None
        self._load_model()

    def _load_model(self):
        curr_dir = os.path.dirname(__file__)
        path = os.path.join(curr_dir, self.model_file)
        if not os.path.exists(path):
            alt_path = os.path.join(curr_dir, "..", "saathi_model.json")
            if os.path.exists(alt_path):
                path = alt_path

        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    self.model_data = json.load(f)
                logger.info(f"Loaded Saathi ML verification model from {path}")
            except Exception as e:
                logger.error(f"Failed to load Saathi model json: {e}")
                self.model_data = None
        else:
            logger.warning(f"Saathi model file not found at {path}. Using internal weights.")

    def verify_checkin(
        self,
        duty_category: str,
        profile_stats: Dict[str, Any],
        answers_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Runs ML evaluation on the Saathi check-in answers + duty context.
        Returns:
          - verification_score (0.0 to 1.0)
          - strain_tier ('Optimal', 'Mild Strain', 'Elevated Strain')
          - verification_summary (Human-friendly summary)
          - recommendations (List of helpful, supportive suggestions)
        """
        # Extract numerical scores (1-5) from answers
        sleep_score = float(answers_dict.get("sleep_score", 4))
        shift_load_score = float(answers_dict.get("shift_load_score", 4))
        family_score = float(answers_dict.get("family_score", 4))
        camaraderie_score = float(answers_dict.get("camaraderie_score", 4))
        coping_resilience = float(answers_dict.get("coping_resilience", 4))

        duty_hours = float(profile_stats.get("avg_weekly_duty_hours_last_90d", 48.0))
        night_fraction = float(profile_stats.get("night_duty_fraction_last_90d", 0.20))

        # Weights from trained model
        w = self.model_data.get("weights", {}) if self.model_data else {}
        w_sleep = w.get("sleep_score", 0.28)
        w_shift = w.get("shift_load_score", 0.22)
        w_family = w.get("family_score", 0.20)
        w_camaraderie = w.get("camaraderie_score", 0.15)
        w_coping = w.get("coping_resilience", 0.15)

        base_resilience = (
            sleep_score * w_sleep +
            shift_load_score * w_shift +
            family_score * w_family +
            camaraderie_score * w_camaraderie +
            coping_resilience * w_coping
        ) / 5.0

        # Adjust for high operational load or high night shifts
        penalty = 0.0
        if duty_hours > 60:
            penalty += (duty_hours - 60) * 0.003
        if night_fraction > 0.35:
            penalty += (night_fraction - 0.35) * 0.15
        
        final_score = round(float(np.clip(base_resilience - penalty, 0.10, 0.98)), 2)

        # Classification
        if final_score >= 0.70:
            strain_tier = "Optimal"
            summary = "Steady duty rhythm and high personal resilience. Coping capacity is well-aligned with operational station tempo."
            recs = [
                "Maintain your regular sleep discipline and hydration on duty shifts.",
                "Continue peer buddy interactions during off-duty recreation hours.",
                "Keep your steady personal rhythm intact."
            ]
        elif final_score >= 0.45:
            strain_tier = "Mild Strain"
            summary = "Noticeable operational fatigue or shift disruption detected. Fatigue index indicates moderate cumulative load."
            recs = [
                "Prioritize uninterrupted sleep recovery during rest blocks between shifts.",
                "Consider a brief phone call back home to maintain connection with family.",
                "Take advantage of off-duty sports or yoga sessions at the battalion mess."
            ]
        else:
            strain_tier = "Elevated Strain"
            summary = "Elevated operational duty fatigue or substantial domestic strain reported across multiple check-in vectors."
            recs = [
                "Your welfare cell is a standing confidential resource—consider an informal chat over tea.",
                "Look into planning upcoming leave balance if eligible.",
                "Discuss duty rotation adjustment with your section commander if night shift load is heavy."
            ]

        return {
            "verification_score": final_score,
            "strain_tier": strain_tier,
            "verification_summary": summary,
            "recommendations": recs,
            "model_metadata": {
                "model_version": self.model_data.get("model_version", "saathi-v2.0-adaptive") if self.model_data else "saathi-v2.0-adaptive",
                "verified": True,
                "verified_at": "Just now"
            }
        }

# Global singleton for Saathi
saathi_model_service = SaathiModelService()

