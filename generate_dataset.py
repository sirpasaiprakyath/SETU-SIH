"""
SIH26186 — Synthetic training dataset generator
=================================================
WHY THIS EXISTS
----------------
The official SIH portal describes the kind of data this system would use
(HR/deployment/leave/wellness/workload records) but does not publish an
actual downloadable file for this problem statement — that's expected:
MHA is not going to put real or even realistic personnel psychological
data on a public hackathon portal. So we build our own, and we are
explicit about it being synthetic in every deliverable.

WHAT MAKES THIS DEFENSIBLE (not just "random numbers")
--------------------------------------------------------
1. The FEATURE SCHEMA matches exactly what the MHA brief itself names:
   leave patterns, deployment/posting history, duty schedules, transfer
   frequency, training load, workload trends.
2. The OUTCOME LABEL is deliberately NOT "suicide risk". Given a real
   base rate near 1-in-6,800/year (MHA, Rajya Sabha data), no dataset of
   a few thousand rows could responsibly simulate that outcome. Instead
   the label is a broader, statistically tractable proxy —
   "welfare_review_recommended" — closer to the ~5-8%/year band implied
   by real CAPF attrition/VRS figures (55,555 over 5 years across ~1M
   personnel). This matches the "operational-strain triage, not
   diagnosis" reframing the whole project is built on.
3. The FATIGUE feature is a simplified, openly-labelled proxy "inspired
   by" the U.S. Army's SAFTE-FAST logic (duty hours, night-duty load,
   rest-day compliance -> an effectiveness/fatigue index) — not a claim
   to reproduce that proprietary model.
4. Deliberate NOISE and a deliberate NCO-reporting bias term are baked
   in on purpose, so the dataset doesn't look artificially "too clean" —
   real behavioral data never separates perfectly, and pretending
   otherwise is one of the credibility mistakes this project is trying
   to avoid.

This script is meant to be read, questioned, and edited — every
assumption below is a numbered comment, not a black box.
"""

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)
N = 4000  # synthetic personnel records

def z(x):
    x = np.asarray(x, dtype=float)
    return (x - x.mean()) / (x.std() + 1e-9)

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

# ---------------------------------------------------------------
# 1. Force & rank composition — CRPF only. SIH26186 is sponsored
#    specifically by CRPF, Police-II Division, Ministry of Home
#    Affairs, not a generic pan-CAPF initiative. Earlier drafts of
#    this dataset spread personnel across all CAPFs — corrected here.
# ---------------------------------------------------------------
# Force — this problem statement (SIH26186) is sponsored specifically
# by CRPF, Police-II Division, Ministry of Home Affairs — not a
# generic pan-CAPF initiative. The primary dataset is CRPF-only. Other
# CAPFs are a stated future-scalability point, not part of this data.
forces = np.array(["CRPF"] * N)
rank_tier = RNG.choice(
    ["Constable/GD", "Head Constable", "ASI/SI", "Inspector+"],
    size=N, p=[0.55, 0.25, 0.15, 0.05],
)
tenure_years = np.clip(RNG.gamma(shape=3.2, scale=4.0, size=N), 1, 35).round(1)
married = RNG.random(N) < 0.70

# Family structure — real statistic from Gupta & Barman (2023, IJFMR
# ICMRS'23), a 400-respondent CAPF survey: 72% nuclear family, 28%
# joint family. This is not a flat risk field on its own — see the
# family_separation_load interaction term below, which is where this
# actually does work.
family_structure = np.where(married, RNG.choice(["nuclear", "joint"], size=N, p=[0.72, 0.28]), "n/a")

# ---------------------------------------------------------------
# 2. Posting context — CRPF's actual operational mandate, not a
#    generic CAPF template. CRPF does NOT guard the international
#    border (that's BSF/ITBP/SSB) — it does not belong in this dataset.
#    Real CRPF deployment picture: Counter-Naxal/LWE operations (its
#    largest, most hazardous current commitment — Chhattisgarh,
#    Jharkhand, Odisha), counter-insurgency in J&K/North-East, Law &
#    Order / VIP-VVIP security duty (election deployments, riot
#    control), and peace/training establishment postings.
# ---------------------------------------------------------------
posting_category = RNG.choice(
    ["counter_naxal_lwe", "counter_insurgency_jk_ne", "law_order_vip_duty", "peace_training_static"],
    size=N, p=[0.38, 0.20, 0.22, 0.20],
)
posting_duration_months = np.clip(RNG.exponential(scale=11, size=N), 1, 48).round(1)

# Family separation probability rises for married personnel in
# operational/border postings without co-located family quarters.
sep_base = np.where(posting_category == "peace_training_static", 0.15, 0.55)
is_separated = married & (RNG.random(N) < sep_base)
family_status = np.where(
    ~married, "not_applicable_unmarried",
    np.where(is_separated, "separated_hardship_posting", "with_family"),
)

# ---------------------------------------------------------------
# KEY INTERACTION TERM: family_separation_load
# Same months away from home should NOT weigh the same for everyone.
# A joint family has in-laws/siblings standing in for the absent
# officer at home; a nuclear family does not — the spouse is alone.
# This is deliberately NOT a flat additive field. It's a multiplier
# applied to posting duration, so two people with identical posting
# length get different separation load depending on whether there's
# a support system at home or not.
# ---------------------------------------------------------------
nuclear_and_separated = is_separated & (family_structure == "nuclear")
joint_and_separated = is_separated & (family_structure == "joint")
family_separation_load = (
    posting_duration_months * (1.6 * nuclear_and_separated + 1.0 * joint_and_separated)
) / 12  # scaled to a manageable range (~0-6)

# ---------------------------------------------------------------
# 3. Leave — entitlement ~constant; utilisation drops under
#    operational load (assumption, not measured).
# ---------------------------------------------------------------
leave_entitled_annual = RNG.integers(28, 33, size=N)
op_load = np.select(
    [posting_category == "counter_naxal_lwe", posting_category == "counter_insurgency_jk_ne",
     posting_category == "law_order_vip_duty"],
    [0.55, 0.60, 0.75], default=0.9,  # default = peace_training_static
)
leave_availed_last_12m = np.clip(
    (leave_entitled_annual * op_load) + RNG.normal(0, 3, size=N), 0, leave_entitled_annual
).round(1)
leave_utilization_ratio = (leave_availed_last_12m / leave_entitled_annual).round(3)

# ---------------------------------------------------------------
# 4. Duty load -> simplified fatigue proxy (SAFTE-FAST inspired, not
#    a reproduction of it). Higher = more fatigued / less "effective".
# ---------------------------------------------------------------
base_hours = np.select(
    [posting_category == "counter_naxal_lwe", posting_category == "counter_insurgency_jk_ne",
     posting_category == "law_order_vip_duty"],
    [62, 58, 52], default=46,  # default = peace_training_static
) + RNG.normal(0, 4, size=N)
avg_weekly_duty_hours_last_90d = np.clip(base_hours, 36, 84).round(1)
night_duty_fraction_last_90d = np.clip(
    np.select(
        [posting_category == "counter_naxal_lwe", posting_category == "counter_insurgency_jk_ne",
         posting_category == "law_order_vip_duty"],
        [0.35, 0.30, 0.22], default=0.12,  # default = peace_training_static
    ) + RNG.normal(0, 0.06, size=N), 0, 0.6
).round(3)
rest_day_compliance_pct_last_90d = np.clip(
    100 - (avg_weekly_duty_hours_last_90d - 40).clip(min=0) * 1.1 - night_duty_fraction_last_90d * 40
    + RNG.normal(0, 6, size=N), 20, 100,
).round(1)

fatigue_index = np.clip(
    0.45 * ((avg_weekly_duty_hours_last_90d - 40) / 44 * 100).clip(min=0)
    + 0.30 * (night_duty_fraction_last_90d * 100)
    + 0.25 * (100 - rest_day_compliance_pct_last_90d)
    + RNG.normal(0, 5, size=N), 0, 100,
).round(1)

# ---------------------------------------------------------------
# 5. Behavioural proxies, each with a PERSONAL BASELINE and a
#    CURRENT value — this is the "compare to your own normal" logic
#    that is the actual key idea of the project.
# ---------------------------------------------------------------
personal_sick_rate = np.clip(RNG.gamma(1.4, 0.9, size=N), 0.1, 6)  # each person's own long-run average
sick_reports_personal_baseline_90d = RNG.poisson(personal_sick_rate).astype(float)
fatigue_pressure = z(fatigue_index) * 0.5 + z(100 - leave_utilization_ratio * 100) * 0.4
current_sick_lambda = np.clip(personal_sick_rate * (1 + 0.35 * fatigue_pressure.clip(min=0)), 0.05, 10)
sick_reports_last_90d = RNG.poisson(current_sick_lambda).astype(float)
sick_reports_deviation = sick_reports_last_90d - sick_reports_personal_baseline_90d

# NCO structured observation (1 = no concern .. 5 = high concern).
# A "reporting leniency" bias is added per synthetic unit to model the
# real "don't flag your own man" under-reporting risk discussed in the
# review — some units systematically score lower regardless of the
# true underlying signal.
unit_id = RNG.integers(1, 260, size=N)  # ~260 synthetic sub-units
unit_leniency = {u: RNG.normal(0, 0.6) for u in np.unique(unit_id)}
leniency = np.array([unit_leniency[u] for u in unit_id])

true_concern = 1 + 3.2 * sigmoid(0.9 * z(fatigue_index) + 0.7 * z(sick_reports_deviation)
                                  + 0.5 * (family_status == "separated_hardship_posting"))
nco_observation_current = np.clip(np.round(true_concern - leniency + RNG.normal(0, 0.4, size=N)), 1, 5)
nco_observation_baseline = np.clip(
    np.round(2 + RNG.normal(0, 0.7, size=N) - leniency * 0.5), 1, 5
)
nco_observation_deviation = nco_observation_current - nco_observation_baseline

transfer_count_last_24m = RNG.poisson(0.6, size=N)
training_hours_last_12m = np.clip(RNG.normal(40, 15, size=N), 0, 120).round(1)

# ---------------------------------------------------------------
# 5b. SAATHI structured-signal features (fixes the gap where Saathi
# was designed but never actually wired into the model). This uses
# ONLY structured answers a person selects (Good/Okay/Tough, domain
# picks, whether the safety-net branch triggered) — never free-text
# content, which stays private per the design rule. Same
# personal-baseline logic as everything else: compare current period
# to that person's own historical pattern, not a population norm.
# ---------------------------------------------------------------
personal_saathi_rate = np.clip(RNG.gamma(1.6, 1.1, size=N), 0.2, 8)
saathi_sessions_personal_baseline_90d = RNG.poisson(personal_saathi_rate).astype(float)
saathi_sessions_last_90d = RNG.poisson(
    np.clip(personal_saathi_rate * (1 + 0.25 * fatigue_pressure.clip(min=0)), 0.1, 12)
).astype(float)
saathi_engagement_deviation = saathi_sessions_last_90d - saathi_sessions_personal_baseline_90d

personal_tough_rate = np.clip(RNG.beta(1.5, 4, size=N), 0.02, 0.9)  # each person's own typical "Tough" rate
saathi_tough_rate_current = np.clip(
    personal_tough_rate + 0.15 * fatigue_pressure.clip(min=0) + RNG.normal(0, 0.08, size=N), 0, 1
)
saathi_tough_deviation = saathi_tough_rate_current - personal_tough_rate

# Safety-net trigger: rare, and a genuinely strong signal when it fires —
# this is a structured branch-reached event, not analysed free text.
safety_net_prob = sigmoid(-3.2 + 1.4 * z(saathi_tough_deviation) + 0.8 * z(fatigue_index))
saathi_safety_net_triggers_90d = RNG.poisson(np.clip(safety_net_prob * 3, 0.01, 3)).astype(int)

# ---------------------------------------------------------------
# 6. The KEY FEATURE: composite personal-baseline deviation — a
#    single z-scored blend of "how far is this person from their OWN
#    normal right now", not from anyone else's.
# ---------------------------------------------------------------
baseline_deviation_composite = (
    0.25 * z(sick_reports_deviation)
    + 0.25 * z(nco_observation_deviation)
    + 0.20 * z(100 - leave_utilization_ratio * 100)
    + 0.30 * z(saathi_tough_deviation)
).round(3)

# ---------------------------------------------------------------
# 7. Outcome label — deliberately a BROAD "worth a human look" event,
#    not a suicide/self-harm label. Base rate tuned to ~7%, in line
#    with the tractable end of real CAPF attrition-adjacent rates,
#    NOT the ~0.015%/year real suicide base rate (Franklin et al. 2017
#    and the real MHA figures both say individual-level prediction of
#    the rare, catastrophic outcome is not something a hackathon
#    dataset — or arguably any dataset — can honestly claim to do).
# ---------------------------------------------------------------
logit = (
    -2.55
    + 0.85 * z(fatigue_index)
    + 1.05 * z(baseline_deviation_composite)
    + 0.60 * z(family_separation_load)  # interaction term, not a flat family_status flag
    + 0.35 * (posting_duration_months > 18)
    + 0.45 * z(sick_reports_deviation)
    + 0.70 * np.minimum(saathi_safety_net_triggers_90d, 2)  # a real, strong signal when it fires
    + RNG.normal(0, 0.9, size=N)  # irreducible noise — keeps this honest, not perfectly separable
)

# Calibrate the intercept shift so the realised base rate lands near the
# intended ~7-8% band (bisection on E[sigmoid(logit+delta)] = target).
target_rate = 0.075
lo, hi = -5.0, 5.0
for _ in range(60):
    mid = (lo + hi) / 2
    if sigmoid(logit + mid).mean() < target_rate:
        lo = mid
    else:
        hi = mid
logit = logit + mid

prob_review = sigmoid(logit)
label_welfare_review_recommended = (RNG.random(N) < prob_review).astype(int)

# ---------------------------------------------------------------
# Assemble
# ---------------------------------------------------------------
df = pd.DataFrame({
    "personnel_id": [f"PID{100000+i}" for i in range(N)],
    "force": forces,
    "rank_tier": rank_tier,
    "tenure_years": tenure_years,
    "married": married,
    "family_status": family_status,
    "family_structure": family_structure,
    "family_separation_load": family_separation_load.round(3),
    "posting_category": posting_category,
    "posting_duration_months": posting_duration_months,
    "leave_entitled_annual": leave_entitled_annual,
    "leave_availed_last_12m": leave_availed_last_12m,
    "leave_utilization_ratio": leave_utilization_ratio,
    "avg_weekly_duty_hours_last_90d": avg_weekly_duty_hours_last_90d,
    "night_duty_fraction_last_90d": night_duty_fraction_last_90d,
    "rest_day_compliance_pct_last_90d": rest_day_compliance_pct_last_90d,
    "fatigue_index": fatigue_index,
    "sick_reports_last_90d": sick_reports_last_90d,
    "sick_reports_personal_baseline_90d": sick_reports_personal_baseline_90d,
    "sick_reports_deviation": sick_reports_deviation,
    "nco_observation_current": nco_observation_current,
    "nco_observation_baseline": nco_observation_baseline,
    "nco_observation_deviation": nco_observation_deviation,
    "transfer_count_last_24m": transfer_count_last_24m,
    "saathi_sessions_last_90d": saathi_sessions_last_90d,
    "saathi_sessions_personal_baseline_90d": saathi_sessions_personal_baseline_90d,
    "saathi_engagement_deviation": saathi_engagement_deviation,
    "saathi_tough_rate_current": saathi_tough_rate_current.round(3),
    "saathi_tough_deviation": saathi_tough_deviation.round(3),
    "saathi_safety_net_triggers_90d": saathi_safety_net_triggers_90d,
    "training_hours_last_12m": training_hours_last_12m,
    "baseline_deviation_composite": baseline_deviation_composite,
    "label_welfare_review_recommended": label_welfare_review_recommended,
})

df.to_csv("sih26186_synthetic_dataset.csv", index=False)
print("rows:", len(df))
print("positive rate:", df["label_welfare_review_recommended"].mean().round(4))
print(df.head(3).T)
