"""
Core statistical drift detectors.
PSI, KL Divergence, Jensen-Shannon Distance — all in one place.
"""

import numpy as np
import pandas as pd
from scipy.spatial.distance import jensenshannon
from scipy.stats import chi2_contingency, ks_2samp
from typing import Dict, Any


# ─── PSI ──────────────────────────────────────────────────────────────────────

def calculate_psi(
    reference: pd.Series,
    current: pd.Series,
    bins: int = 10
) -> float:
    """
    Population Stability Index.
    Industry standard for detecting distribution shift in numerical features.

    Interpretation:
        PSI < 0.10  → No significant shift (green)
        PSI < 0.20  → Moderate shift — monitor (yellow)
        PSI >= 0.20 → Significant shift — action needed (red)
    """
    reference = reference.dropna()
    current = current.dropna()

    if len(reference) == 0 or len(current) == 0:
        return 0.0

    # Auto-adjust bins for stability with small batches
    if len(current) < 100:
        actual_bins = min(5, max(3, len(current) // 10))
    else:
        actual_bins = min(bins, max(5, len(current) // 20))

    # Quantile-based binning on reference is much more stable than linear binning
    try:
        # Use quantiles for reference, and then apply those edges to both
        _, bins_edges = pd.qcut(reference, actual_bins, retbins=True, duplicates='drop')
        
        # Ensure the edges cover the current data as well
        bins_edges = list(bins_edges)
        bins_edges[0] = min(bins_edges[0], current.min())
        bins_edges[-1] = max(bins_edges[-1], current.max())
        breakpoints = np.array(bins_edges)
    except Exception:
        # Fallback to linear if qcut fails (e.g., if ref is constant)
        breakpoints = np.linspace(
            min(reference.min(), current.min()),
            max(reference.max(), current.max()),
            actual_bins + 1
        )

    ref_counts, _ = np.histogram(reference, bins=breakpoints)
    cur_counts, _ = np.histogram(current, bins=breakpoints)

    # Laplace smoothing to eliminate the infinite penalty of empty bins on generic logs
    ref_pct = (ref_counts + 0.5) / (len(reference) + actual_bins * 0.5)
    cur_pct = (cur_counts + 0.5) / (len(current) + actual_bins * 0.5)

    psi = np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct))
    return float(round(psi, 6))


def psi_severity(psi: float) -> str:
    if psi < 0.10:
        return "stable"
    elif psi < 0.25:
        return "warning"
    else:
        return "critical"


# ─── KL DIVERGENCE ────────────────────────────────────────────────────────────

def calculate_kl_divergence(
    reference: pd.Series,
    current: pd.Series,
    bins: int = 10
) -> float:
    """
    KL Divergence (Kullback-Leibler).
    Measures how much information is lost when using reference to approximate current.
    NOT symmetric — direction matters.

    Interpretation:
        KL = 0      → Identical distributions
        KL < 0.1    → Minor drift
        KL >= 0.1   → Notable drift
    """
    reference = reference.dropna()
    current = current.dropna()

    if len(reference) == 0 or len(current) == 0:
        return 0.0

    actual_bins = min(bins, max(3, len(current) // 4))

    breakpoints = np.linspace(
        min(reference.min(), current.min()),
        max(reference.max(), current.max()),
        actual_bins + 1
    )

    ref_counts, _ = np.histogram(reference, bins=breakpoints)
    cur_counts, _ = np.histogram(current, bins=breakpoints)
    
    # Laplace smoothing to handle tiny batches with empty bins
    ref_pct = (ref_counts + 0.5) / (len(reference) + actual_bins * 0.5)
    cur_pct = (cur_counts + 0.5) / (len(current) + actual_bins * 0.5)

    kl = np.sum(cur_pct * np.log(cur_pct / ref_pct))
    return float(round(kl, 6))


# ─── JENSEN-SHANNON DISTANCE ──────────────────────────────────────────────────

def calculate_js_distance(
    reference: pd.Series,
    current: pd.Series,
    bins: int = 10
) -> float:
    """
    Jensen-Shannon Distance.
    Symmetric, bounded [0, 1] version of KL — better for dashboards.

    Interpretation:
        JS = 0.0    → Identical distributions
        JS < 0.1    → Stable
        JS < 0.2    → Warning
        JS >= 0.2   → Critical drift
    """
    reference = reference.dropna()
    current = current.dropna()

    if len(reference) == 0 or len(current) == 0:
        return 0.0

    actual_bins = min(bins, max(3, len(current) // 4))

    breakpoints = np.linspace(
        min(reference.min(), current.min()),
        max(reference.max(), current.max()),
        actual_bins + 1
    )

    ref_counts, _ = np.histogram(reference, bins=breakpoints)
    cur_counts, _ = np.histogram(current, bins=breakpoints)

    # Laplace
    ref_pct = (ref_counts + 0.5) / (len(reference) + actual_bins * 0.5)
    cur_pct = (cur_counts + 0.5) / (len(current) + actual_bins * 0.5)

    js = jensenshannon(ref_pct, cur_pct)
    return float(round(js, 6))


# ─── KS TEST (for numerical) ──────────────────────────────────────────────────

def calculate_ks_test(
    reference: pd.Series,
    current: pd.Series
) -> Dict[str, Any]:
    """
    Kolmogorov-Smirnov test.
    Non-parametric — doesn't assume any distribution shape.
    Returns statistic and p-value.

    p-value < 0.05 → distributions are statistically different
    """
    reference = reference.dropna()
    current = current.dropna()

    if len(reference) == 0 or len(current) == 0:
        return {"statistic": 0.0, "p_value": 1.0, "drifted": False}

    stat, p_value = ks_2samp(reference, current)
    return {
        "statistic": float(round(stat, 6)),
        "p_value": float(round(p_value, 6)),
        "drifted": bool(p_value < 0.05)
    }


# ─── CHI-SQUARED (for categorical) ────────────────────────────────────────────

def calculate_chi_squared(
    reference: pd.Series,
    current: pd.Series
) -> Dict[str, Any]:
    """
    Chi-squared test for categorical feature drift.
    Compares value frequency distributions between reference and current.

    p-value < 0.05 → category distribution has shifted
    """
    reference = reference.dropna().astype(str)
    current = current.dropna().astype(str)

    if len(reference) == 0 or len(current) == 0:
        return {"statistic": 0.0, "p_value": 1.0, "drifted": False}

    all_categories = set(reference.unique()) | set(current.unique())

    ref_counts = reference.value_counts()
    cur_counts = current.value_counts()

    ref_freq = [ref_counts.get(cat, 0) for cat in all_categories]
    cur_freq = [cur_counts.get(cat, 0) for cat in all_categories]

    contingency = np.array([ref_freq, cur_freq])

    # Need at least 2 categories and non-zero counts
    if contingency.shape[1] < 2 or contingency.sum() == 0:
        return {"statistic": 0.0, "p_value": 1.0, "drifted": False}

    try:
        stat, p_value, _, _ = chi2_contingency(contingency)
        return {
            "statistic": float(round(stat, 6)),
            "p_value": float(round(p_value, 6)),
            "drifted": bool(p_value < 0.05)
        }
    except Exception:
        return {"statistic": 0.0, "p_value": 1.0, "drifted": False}