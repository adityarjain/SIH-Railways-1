"""
Recomputes Neev's published evaluation metrics from the shipped predictions.

The predictions file carries its own ground truth (`actual_failure_within_30d`,
`actual_degradation_30d`) for the 30,000-row held-out test split, so every
headline metric can be re-derived without the model binaries and without
retraining. That makes the numbers in NEEV_ML_REPORT.txt checkable rather than
asserted.

    PYTHONPATH=. python scripts/evaluate_neev.py

Writes benchmarks/neev_eval_metrics.json and prints a comparison against the
published values.

Scope note: this evaluates a FROZEN model artifact. Training is not reproducible
from this repository -- see EVIDENCE.md. This script does not train anything.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)

PREDICTIONS = Path("NEEV_FINAL_MODULE/output/neev_predictions_for_optimizer.csv")
REPORT = Path("NEEV_FINAL_MODULE/output/NEEV_ML_REPORT.txt")
OUT = Path("benchmarks/neev_eval_metrics.json")

#: Published in NEEV_ML_REPORT.txt / model_metadata.json. Recomputed values are
#: compared against these so drift is visible rather than silent.
PUBLISHED = {
    "roc_auc": 0.8841,
    "accuracy": 0.8129,
    "precision": 0.7919,
    "recall": 0.6934,
    "f1": 0.7393,
    "degradation_mae": 7.1189,
    "degradation_r2": 0.6459,
}

#: The classifier threshold the published metrics were computed at.
THRESHOLD = 0.5


def main() -> int:
    if not PREDICTIONS.exists():
        print(f"Predictions not found: {PREDICTIONS}")
        return 1

    df = pd.read_csv(PREDICTIONS)
    required = {
        "failure_probability_30d",
        "actual_failure_within_30d",
        "forecast_30d_degradation",
        "actual_degradation_30d",
        "risk_score",
        "risk_level",
    }
    missing = required - set(df.columns)
    if missing:
        print(f"Predictions file is missing required columns: {sorted(missing)}")
        return 1

    y_true = df["actual_failure_within_30d"].astype(int)
    y_prob = df["failure_probability_30d"].astype(float)
    y_pred = (y_prob >= THRESHOLD).astype(int)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()

    metrics = {
        "scope": "NEEV_HELD_OUT_TEST_SPLIT",
        "rows_evaluated": int(len(df)),
        "positives": int(y_true.sum()),
        "negatives": int((1 - y_true).sum()),
        "threshold": THRESHOLD,
        "classification": {
            "roc_auc": round(float(roc_auc_score(y_true, y_prob)), 4),
            # Not in the published report; PR-AUC is the more informative summary
            # on an imbalanced target and is added here rather than assumed.
            "pr_auc_average_precision": round(float(average_precision_score(y_true, y_prob)), 4),
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision": round(float(precision_score(y_true, y_pred)), 4),
            "recall": round(float(recall_score(y_true, y_pred)), 4),
            "f1": round(float(f1_score(y_true, y_pred)), 4),
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp),
            },
        },
        "regression_degradation_30d": {
            "mae": round(float(mean_absolute_error(df["actual_degradation_30d"], df["forecast_30d_degradation"])), 4),
            "rmse": round(
                float(np.sqrt(np.mean((df["actual_degradation_30d"] - df["forecast_30d_degradation"]) ** 2))), 4
            ),
            "r2": round(float(r2_score(df["actual_degradation_30d"], df["forecast_30d_degradation"])), 4),
        },
        "internal_consistency": {
            # risk_score is the optimizer's priority input, so its relationship to
            # the model output is asserted rather than trusted.
            "risk_score_equals_probability_x100": bool(
                np.allclose(df["risk_score"], df["failure_probability_30d"] * 100, atol=0.05)
            ),
            "risk_level_distribution": df["risk_level"].value_counts().to_dict(),
        },
        "provenance": {
            "predictions_artifact": str(PREDICTIONS),
            "published_report": str(REPORT),
            "model_training": "NOT REPRODUCIBLE from this repository (no training script). Frozen artifact evaluation only.",
            "command": "PYTHONPATH=. python scripts/evaluate_neev.py",
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(metrics, indent=2))

    c = metrics["classification"]
    r = metrics["regression_degradation_30d"]
    recomputed = {
        "roc_auc": c["roc_auc"], "accuracy": c["accuracy"], "precision": c["precision"],
        "recall": c["recall"], "f1": c["f1"],
        "degradation_mae": r["mae"], "degradation_r2": r["r2"],
    }

    print(f"Evaluated {len(df):,} held-out rows at threshold {THRESHOLD}\n")
    print(f"{'metric':<20}{'published':>12}{'recomputed':>12}{'delta':>10}")
    print("-" * 54)
    worst = 0.0
    for name, published in PUBLISHED.items():
        got = recomputed[name]
        delta = abs(got - published)
        worst = max(worst, delta)
        print(f"{name:<20}{published:>12.4f}{got:>12.4f}{delta:>10.4f}")
    print("-" * 54)
    print(f"{'PR-AUC (new)':<20}{'-':>12}{c['pr_auc_average_precision']:>12.4f}")
    print(f"\nconfusion matrix: TP={c['confusion_matrix']['true_positive']} "
          f"FP={c['confusion_matrix']['false_positive']} "
          f"FN={c['confusion_matrix']['false_negative']} "
          f"TN={c['confusion_matrix']['true_negative']}")
    print(f"\nmax deviation from published: {worst:.4f}")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
