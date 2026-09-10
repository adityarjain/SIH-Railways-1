"""
Neev model training -- NOT AVAILABLE IN THIS REPOSITORY.

This file is a placeholder. It contains no training code and never has: the
script that fitted `models/neev_failure_risk_model.cbm` and
`models/neev_degradation_30d_model.joblib` was not committed.

What that means in practice:

  * The two model artifacts are genuine fitted models and are present.
  * Their published metrics are real and can be re-derived on demand -- run
    `PYTHONPATH=. python scripts/evaluate_neev.py` from the repository root.
    It recomputes ROC-AUC, precision, recall, F1, MAE, RMSE and R2 (plus PR-AUC
    and a confusion matrix) from `output/neev_predictions_for_optimizer.csv`,
    which carries its own held-out ground truth.
  * Training is NOT reproducible here. Re-fitting would require rewriting this
    script, including the feature engineering that produced `obs_month`,
    `obs_dayofweek` and `obs_hour` -- these are in the model's 29-feature schema
    (`output/model_metadata.json`) but are not columns in `neev_ml_dataset.csv`.

Running this file intentionally exits non-zero rather than pretending to train.

See EVIDENCE.md for the frozen-model evaluation workflow.
"""

import sys

MESSAGE = __doc__


def main() -> int:
    print(MESSAGE)
    print("No training is performed. Use scripts/evaluate_neev.py to verify the "
          "shipped model's metrics.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
