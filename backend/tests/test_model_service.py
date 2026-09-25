import os
import sys
import unittest

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from model_service import model_service

class TestModelService(unittest.TestCase):
    def test_model_loaded(self):
        """Verify baseline_model.json loads properly."""
        self.assertIsNotNone(model_service.booster, "XGBoost booster should be successfully loaded.")

    def test_prediction_output(self):
        """Verify prediction probability and top-3 plain language reasons."""
        sample_profile = {
            "force": "CRPF",
            "rank_tier": "Constable/GD",
            "tenure_years": 8.0,
            "married": True,
            "family_status": "separated_hardship_posting",
            "posting_category": "operational_lwe",
            "posting_duration_months": 22.0,
            "leave_entitled_annual": 30,
            "leave_availed_last_12m": 6.0,
            "leave_utilization_ratio": 0.20,
            "avg_weekly_duty_hours_last_90d": 66.5,
            "night_duty_fraction_last_90d": 0.35,
            "rest_day_compliance_pct_last_90d": 72.0,
            "fatigue_index": 76.4,
            "sick_reports_last_90d": 5.0,
            "sick_reports_personal_baseline_90d": 1.0,
            "sick_reports_deviation": 4.0,
            "nco_observation_current": 4.0,
            "nco_observation_baseline": 2.0,
            "nco_observation_deviation": 2.0,
            "transfer_count_last_24m": 1,
            "training_hours_last_12m": 25.0,
            "baseline_deviation_composite": 2.35,
        }

        prob, is_flagged, plain_reasons = model_service.predict(sample_profile)

        # Check probability bounds
        self.assertIsInstance(prob, float)
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)

        # Check plain language reasons
        self.assertIsInstance(plain_reasons, list)
        self.assertLessEqual(len(plain_reasons), 3)
        self.assertGreater(len(plain_reasons), 0)

        print(f"\n[Test] Model Prediction: Likelihood={prob*100:.1f}%, Flagged={is_flagged}")
        print(f"[Test] Plain-Language Reasons (SHAP):")
        for r in plain_reasons:
            print(f"  - {r}")

if __name__ == "__main__":
    unittest.main()
