"""
SIH26186 — Baseline model training & validation
=================================================
Goal of this script: prove the PIPELINE works — that a gradient-boosted
classifier can recover the injected risk pattern from the synthetic
data, using honest train/test evaluation and SHAP explainability.

This is NOT a claim that these numbers represent real-world accuracy on
real CRPF personnel. It is a proof that the methodology (personal-
baseline features -> outcome-risk classifier -> explainable output) is
technically sound and ready to be recalibrated on real HRMS data.
"""

import numpy as np
import pandas as pd
import shap
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report, confusion_matrix
from xgboost import XGBClassifier

df = pd.read_csv("sih26186_synthetic_dataset.csv")

target = "label_welfare_review_recommended"
drop_cols = ["personnel_id", "family_structure", target]
cat_cols = ["force", "rank_tier", "family_status", "posting_category"]
X = df.drop(columns=drop_cols)
X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
X["married"] = X["married"].astype(int)
y = df[target]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)

# scale_pos_weight compensates for the ~7-8% positive rate rather than
# letting the model just always predict "no review needed"
spw = (y_train == 0).sum() / (y_train == 1).sum()

model = XGBClassifier(
    n_estimators=300, max_depth=4, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8,
    scale_pos_weight=spw, eval_metric="logloss", random_state=42,
)
model.fit(X_train, y_train)

proba = model.predict_proba(X_test)[:, 1]
pred = (proba >= 0.5).astype(int)

auc = roc_auc_score(y_test, proba)
pr_auc = average_precision_score(y_test, proba)

print("=" * 60)
print("HONEST BASELINE RESULTS (synthetic data, proof of pipeline)")
print("=" * 60)
print(f"Test set size:              {len(y_test)}  (positive rate {y_test.mean():.3f})")
print(f"ROC-AUC:                    {auc:.3f}")
print(f"PR-AUC (average precision): {pr_auc:.3f}")
print()
print(classification_report(y_test, pred, target_names=["No review needed", "Recommend review"]))
print("Confusion matrix [[TN FP][FN TP]]:")
print(confusion_matrix(y_test, pred))

# ---------------------------------------------------------------
# SHAP explainability — this is what turns a bare number into
# "here's why", which is the whole point of the explainability promise
# ---------------------------------------------------------------
explainer = shap.TreeExplainer(model)
shap_values = explainer(X_test)

# Calculate SHAP mean absolute values
mean_abs_shap = pd.Series(np.abs(shap_values.values).mean(axis=0), index=X.columns).sort_values(ascending=False)
print("\nTop 5 features by SHAP importance:")
print(mean_abs_shap.head(5))

importance = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=False).head(12)
print("\nTop 5 features by XGBoost gain importance:")
print(importance.head(5))

if HAS_MATPLOTLIB:
    plt.figure()
    shap.summary_plot(shap_values, X_test, show=False, max_display=12)
    plt.tight_layout()
    plt.savefig("shap_feature_importance.png", dpi=150, bbox_inches="tight")
    plt.close()

    plt.figure(figsize=(7, 5))
    importance.iloc[::-1].plot(kind="barh", color="#1B2A4A")
    plt.title("Top features driving the welfare-review flag (synthetic baseline)")
    plt.xlabel("XGBoost feature importance (gain)")
    plt.tight_layout()
    plt.savefig("feature_importance.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("\nSaved: shap_feature_importance.png, feature_importance.png")

# Save the trained model + a few example flagged/unflagged profiles for the demo
model.save_model("baseline_model.json")

demo = X_test.copy()
demo["personnel_id"] = df.loc[X_test.index, "personnel_id"].values
demo["true_label"] = y_test.values
demo["predicted_probability"] = proba
demo_sorted = demo.sort_values("predicted_probability", ascending=False)
demo_sorted[["personnel_id", "true_label", "predicted_probability"]].head(10).to_csv(
    "demo_top_flagged_profiles.csv", index=False
)
demo_sorted[["personnel_id", "true_label", "predicted_probability"]].tail(5).to_csv(
    "demo_low_risk_profiles.csv", index=False
)
print("Saved: demo_top_flagged_profiles.csv, demo_low_risk_profiles.csv")
