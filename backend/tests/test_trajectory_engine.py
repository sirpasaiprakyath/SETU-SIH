import os
import sys
import unittest

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from trajectory_engine import StressTrajectoryEngine

class TestStressTrajectoryEngine(unittest.TestCase):
    def test_quick_login_priority_profile(self):
        """PID100042 must return 🔴 PRIORITY: Immediate human welfare review."""
        mock_p = {
            "personnel_id": "PID100042",
            "name": "Constable Rajesh Kumar",
            "avg_weekly_duty_hours_last_90d": 59.0,
            "night_duty_fraction_last_90d": 0.35,
            "rest_day_compliance_pct_last_90d": 75.0,
            "fatigue_index": 72.0,
            "leave_utilization_ratio": 0.25,
            "posting_duration_months": 22.0,
            "baseline_deviation_composite": 2.15,
            "saathi_tough_rate_current": 0.45,
            "saathi_tough_deviation": 0.25,
            "saathi_safety_net_triggers_90d": 0
        }
        res = StressTrajectoryEngine.compute_trajectory(mock_p)

        self.assertEqual(res["early_warning_level"], "PRIORITY")
        self.assertEqual(res["early_warning_icon"], "🔴")
        self.assertEqual(res["early_warning_action"], "Immediate human welfare review")
        self.assertEqual(res["risk_level"], "HIGH")
        self.assertEqual(res["risk_direction"], "↑")
        self.assertEqual(res["risk_display"], "HIGH ↑")
        self.assertEqual(res["previous_state"], "Moderate")
        self.assertEqual(res["seven_day_trend_pct"], 24.0)
        self.assertEqual(res["seven_day_trend_display"], "↑ 24%")
        self.assertEqual(res["predicted_trajectory"], "Rising")

        # Verify the 4 main changes
        metrics = {m["metric"]: m["display"] for m in res["main_changes"]}
        self.assertEqual(metrics["Duty hours"], "+31%")
        self.assertEqual(metrics["Sleep consistency"], "−22%")
        self.assertEqual(metrics["Leave gap"], "+18 days")
        self.assertEqual(metrics["Wellness score"], "−15%")

        self.assertFalse(res["is_insufficient_data"])
        # AI Confidence and Data Completeness Telemetry
        self.assertEqual(res["effective_risk_pct"], 81)
        self.assertEqual(res["model_confidence_pct"], 87)
        self.assertEqual(res["data_completeness_pct"], 94)
        self.assertFalse(res["is_low_confidence"])

    def test_low_confidence_human_review_recommended(self):
        """PID100077: Borderline Platt calibration margin triggers low confidence and human review."""
        mock_p = {
            "personnel_id": "PID100077",
            "name": "Head Constable Ramesh Chand",
            "avg_weekly_duty_hours_last_90d": 51.3,
            "night_duty_fraction_last_90d": 0.22,
            "rest_day_compliance_pct_last_90d": 85.0,
            "fatigue_index": 48.0,
            "leave_utilization_ratio": 0.40,
            "posting_duration_months": 11.0,
            "baseline_deviation_composite": 1.05,
            "saathi_tough_rate_current": 0.25,
            "saathi_tough_deviation": 0.10,
            "saathi_sessions_last_90d": 1,
            "saathi_safety_net_triggers_90d": 0
        }
        res = StressTrajectoryEngine.compute_trajectory(mock_p)

        self.assertEqual(res["effective_risk_pct"], 63)
        self.assertEqual(res["model_confidence_pct"], 42)
        self.assertEqual(res["data_completeness_pct"], 58)
        self.assertTrue(res["is_low_confidence"])
        self.assertEqual(res["confidence_advisory"], "Human review recommended")
        self.assertEqual(res["early_warning_level"], "SUPPORT")

    def test_quick_login_normal_profile(self):
        """PID100100 must return 🟢 NORMAL: No intervention."""
        mock_p = {
            "personnel_id": "PID100100",
            "name": "Constable Amit Singh",
            "avg_weekly_duty_hours_last_90d": 44.5,
            "night_duty_fraction_last_90d": 0.12,
            "rest_day_compliance_pct_last_90d": 98.0,
            "fatigue_index": 18.0,
            "leave_utilization_ratio": 0.55,
            "posting_duration_months": 6.0,
            "baseline_deviation_composite": 0.05,
            "saathi_tough_rate_current": 0.10,
            "saathi_tough_deviation": -0.05,
            "saathi_safety_net_triggers_90d": 0
        }
        res = StressTrajectoryEngine.compute_trajectory(mock_p)

        self.assertEqual(res["early_warning_level"], "NORMAL")
        self.assertEqual(res["early_warning_icon"], "🟢")
        self.assertEqual(res["early_warning_action"], "No intervention")
        self.assertEqual(res["risk_level"], "LOW")
        self.assertEqual(res["predicted_trajectory"], "Stable")
        self.assertFalse(res["is_insufficient_data"])
        self.assertEqual(res["effective_risk_pct"], 22)
        self.assertEqual(res["model_confidence_pct"], 91)
        self.assertEqual(res["data_completeness_pct"], 96)
        self.assertFalse(res["is_low_confidence"])

    def test_insufficient_data_responsible_ai(self):
        """PID100088 (newly deployed recruit) must return ⚪ INSUFFICIENT DATA."""
        mock_p = {
            "personnel_id": "PID100088",
            "name": "Constable Vikram Deshmukh",
            "posting_duration_months": 0.1,  # 3-4 days in unit
            "saathi_sessions_last_90d": 0,
            "nco_observation_current": 0.0,
            "is_insufficient_data": True
        }
        res = StressTrajectoryEngine.compute_trajectory(mock_p)

        self.assertEqual(res["early_warning_level"], "INSUFFICIENT_DATA")
        self.assertEqual(res["early_warning_icon"], "⚪")
        self.assertTrue("Risk assessment unavailable" in res["early_warning_action"])
        self.assertTrue(res["is_insufficient_data"])
        self.assertGreater(len(res["data_sufficiency_reasons"]), 0)
        self.assertEqual(res["risk_level"], "UNAVAILABLE")
        self.assertIsNone(res["effective_risk_pct"])
        self.assertIsNone(res["model_confidence_pct"])
        self.assertEqual(res["data_completeness_pct"], 18)

    def test_dynamic_support_and_watch_profiles(self):
        """Verify 🟠 SUPPORT and 🟡 WATCH tiers."""
        # Support profile (moderate score + leave backlog)
        support_p = {
            "personnel_id": "PID999111",
            "avg_weekly_duty_hours_last_90d": 54.0,
            "night_duty_fraction_last_90d": 0.25,
            "rest_day_compliance_pct_last_90d": 82.0,
            "fatigue_index": 52.0,
            "leave_utilization_ratio": 0.20,
            "posting_duration_months": 14.0,
            "baseline_deviation_composite": 1.1,
            "review_likelihood": 0.58,
            "saathi_tough_rate_current": 0.25,
            "saathi_tough_deviation": 0.10,
            "saathi_safety_net_triggers_90d": 0
        }
        res_support = StressTrajectoryEngine.compute_trajectory(support_p)
        self.assertEqual(res_support["early_warning_level"], "SUPPORT")
        self.assertEqual(res_support["early_warning_icon"], "🟠")
        self.assertEqual(res_support["early_warning_action"], "Welfare check recommended")

        # Watch profile (minor drift)
        watch_p = {
            "personnel_id": "PID999222",
            "avg_weekly_duty_hours_last_90d": 48.0,
            "night_duty_fraction_last_90d": 0.18,
            "rest_day_compliance_pct_last_90d": 90.0,
            "fatigue_index": 34.0,
            "leave_utilization_ratio": 0.40,
            "posting_duration_months": 8.0,
            "baseline_deviation_composite": 0.45,
            "review_likelihood": 0.36,
            "saathi_tough_rate_current": 0.15,
            "saathi_tough_deviation": 0.02,
            "saathi_safety_net_triggers_90d": 0
        }
        res_watch = StressTrajectoryEngine.compute_trajectory(watch_p)
        self.assertEqual(res_watch["early_warning_level"], "WATCH")
        self.assertEqual(res_watch["early_warning_icon"], "🟡")
        self.assertEqual(res_watch["early_warning_action"], "Monitor trend")

if __name__ == "__main__":
    unittest.main()
