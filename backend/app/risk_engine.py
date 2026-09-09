"""
risk_engine.py

Converts a model's raw probability into a risk score (0-100), a
LOW/MEDIUM/HIGH risk level, and a plain-English recommendation.

This is a prototype risk score, not a certified measure of fraud
probability -- it exists to make the model's output actionable.
"""

LOW_THRESHOLD = 30
MEDIUM_THRESHOLD = 70


def compute_risk(synthetic_probability: float) -> dict:
    """
    synthetic_probability: float between 0.0 and 1.0, the model's
    estimated probability that the audio is AI-generated/synthetic.

    Returns a dict with risk_score (0-100 int), risk_level, and
    a recommendation string.
    """
    risk_score = round(synthetic_probability * 100)

    if risk_score <= LOW_THRESHOLD:
        risk_level = "LOW"
        recommendation = "No significant indicators of synthetic audio detected."
    elif risk_score <= MEDIUM_THRESHOLD:
        risk_level = "MEDIUM"
        recommendation = "Some indicators present. Manual review recommended before relying on this audio."
    else:
        risk_level = "HIGH"
        recommendation = "Strong indicators of synthetic audio. Do not trust this voice alone -- require additional verification."

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "recommendation": recommendation,
    }


if __name__ == "__main__":
    test_cases = [0.02, 0.25, 0.5, 0.72, 0.95]
    for prob in test_cases:
        result = compute_risk(prob)
        print(f"probability={prob:.2f} -> {result}")
