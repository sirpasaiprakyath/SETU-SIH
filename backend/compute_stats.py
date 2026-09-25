import os
import sys
import pandas as pd
import numpy as np

csv_path = os.path.join("..", "sih26186_synthetic_dataset.csv")
df = pd.read_csv(csv_path)
print(f"Dataset shape: {df.shape}")

# Features
target = "label_welfare_review_recommended"
drop_cols = ["personnel_id", "family_structure", target]
cat_cols = ["force", "rank_tier", "family_status", "posting_category"]

X = df.drop(columns=drop_cols)
X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
X["married"] = X["married"].astype(int)
y = df[target]

print(f"Feature count: {X.shape[1]}")

sick_dev_std = float(round(df["sick_reports_deviation"].std(), 3))
nco_dev_std = float(round(df["nco_observation_deviation"].std(), 3))
leave_deficit = 100 - (df["leave_utilization_ratio"] * 100)
leave_deficit_std = float(round(leave_deficit.std(), 2))
leave_deficit_mean = float(round(leave_deficit.mean(), 2))
saathi_tough_dev_std = float(round(df["saathi_tough_deviation"].std(), 3))

print(f"sick_reports_deviation std: {sick_dev_std}")
print(f"nco_observation_deviation std: {nco_dev_std}")
print(f"leave_deficit std: {leave_deficit_std} (mean: {leave_deficit_mean})")
print(f"saathi_tough_deviation std: {saathi_tough_dev_std}")
