import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report
from xgboost import XGBClassifier
import shutil

print("[1/4] Loading sih26186_synthetic_dataset.csv...")
df = pd.read_csv("sih26186_synthetic_dataset.csv")

target = "label_welfare_review_recommended"
drop_cols = ["personnel_id", "family_structure", target]
cat_cols = ["force", "rank_tier", "family_status", "posting_category"]

X = df.drop(columns=drop_cols)
X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
X["married"] = X["married"].astype(int)
y = df[target]

feature_names = list(X.columns)
feature_count = len(feature_names)
print(f"Total features: {feature_count}")

# -------------------------------------------------------------
# 2. Compute exact dataset standard deviations and drift stats
# -------------------------------------------------------------
sick_dev_std = float(round(df["sick_reports_deviation"].std(), 3))
nco_dev_std = float(round(df["nco_observation_deviation"].std(), 3))

# Leave deficit = 100 - leave_utilization_ratio * 100
leave_deficit = 100 - (df["leave_utilization_ratio"] * 100)
leave_deficit_std = float(round(leave_deficit.std(), 2))
leave_deficit_mean = float(round(leave_deficit.mean(), 2))

saathi_tough_dev_std = float(round(df["saathi_tough_deviation"].std(), 3))

print(f"Computed Standard Deviations:")
print(f" - sick_reports_deviation std: {sick_dev_std}")
print(f" - nco_observation_deviation std: {nco_dev_std}")
print(f" - leave_deficit std: {leave_deficit_std} (mean: {leave_deficit_mean})")
print(f" - saathi_tough_deviation std: {saathi_tough_dev_std}")

# -------------------------------------------------------------
# 3. Train honest model
# -------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)

spw = (y_train == 0).sum() / (y_train == 1).sum()

model = XGBClassifier(
    n_estimators=300, max_depth=4, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8,
    scale_pos_weight=spw, eval_metric="logloss", random_state=42,
)
print("[2/4] Training XGBoost model...")
model.fit(X_train, y_train)

proba_test = model.predict_proba(X_test)[:, 1]
auc = float(round(roc_auc_score(y_test, proba_test), 3))
pr_auc = float(round(average_precision_score(y_test, proba_test), 3))

print(f"ROC-AUC: {auc:.3f}")
print(f"PR-AUC:  {pr_auc:.3f}")

# Population score percentiles across all 4000 records
proba_all = model.predict_proba(X)[:, 1]
p50 = float(round(np.percentile(proba_all, 50) * 100, 1))
p75 = float(round(np.percentile(proba_all, 75) * 100, 1))
p90 = float(round(np.percentile(proba_all, 90) * 100, 1))
p95 = float(round(np.percentile(proba_all, 95) * 100, 1))
print(f"Score percentiles across population: p50={p50}%, p75={p75}%, p90={p90}%, p95={p95}%")

# Save model
print("[3/4] Saving baseline_model.json...")
model.save_model("baseline_model.json")
shutil.copy("baseline_model.json", "backend/baseline_model.json")

metadata = {
    "model_name": "XGBoost probability estimate (Tree Ensemble)",
    "dataset_records": int(len(df)),
    "feature_count": feature_count,
    "feature_names": feature_names,
    "metrics": {
        "roc_auc": auc,
        "pr_auc": pr_auc,
        "triage_threshold_pct": 50.0
    },
    "drift_denominators": {
        "sick_drift_std": sick_dev_std,
        "nco_drift_std": nco_dev_std,
        "leave_deficit_std": leave_deficit_std,
        "leave_deficit_mean": leave_deficit_mean,
        "saathi_tough_drift_std": saathi_tough_dev_std
    },
    "percentiles": {
        "p50": p50,
        "p75": p75,
        "p90": p90,
        "p95": p95
    },
    "deterministic_override": {
        "signal": "saathi_safety_net_triggers_90d >= 1",
        "description": "Deterministic safety-net override: Any crisis signal in trailing 90 days automatically escalates to Welfare Officer queue regardless of statistical probability estimate."
    }
}

with open("model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

with open("frontend/src/generated_model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("[4/4] Metadata saved successfully!")
