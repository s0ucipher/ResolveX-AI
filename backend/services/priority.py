import re
from typing import Dict, List, Optional, Tuple

CRITICAL_SAFETY_KEYWORDS = [
    "sparking", "sparks", "live wire", "bare wire", "exposed wire",
    "electrocution", "electric shock", "short circuit",
    "fire hazard", "on fire", "flames", "burning", "smoke",
    "gas leak", "chemical spill", "toxic", "ceiling collapse",
    "ceiling falling", "explosion", "biohazard", "padlocked emergency exit",
    "locked fire exit", "structural collapse", "sewage backup"
]

MODERATE_SAFETY_KEYWORDS = [
    "broken glass", "deep pothole", "skidding", "slipping", "tripping hazard",
    "loose railing", "dark corridor", "unlit", "open drain", "choked commode",
    "murky water", "contaminated water", "trespasser", "theft", "corroded grill"
]

HIGH_DISRUPTION_KEYWORDS = [
    "entire floor", "entire block", "entire hostel", "campus-wide", "outage",
    "water cut", "zero water", "portal down", "blackout", "exam hall",
    "midterm", "halting lab", "cannot shower", "overflowing", "flooding", "smoke near exit"
]

MODERATE_DISRUPTION_KEYWORDS = [
    "slow internet", "flickering", "leaking tap", "air conditioner", "projector",
    "fan wobbling", "washing machine", "dustbins overflowing", "litter"
]

URGENT_INDICATORS = [
    "urgent", "asap", "emergency", "immediately", "immediate action",
    "repeatedly", "repeated issue", "critical", "danger", "hazardous"
]

_NEGATION_RE = re.compile(
    r"\b(?:no|not|never|without|neither|nor|none|nothing|free\s+of|stopped|resolved|cleared)\b",
    re.IGNORECASE,
)
_CLAUSE_SPLIT_RE = re.compile(r"[.,;!\?\n]+|\b(?:but|however|although|yet|though|while)\b", re.IGNORECASE)


def _split_clauses(text: str) -> List[str]:
    return [c.strip() for c in _CLAUSE_SPLIT_RE.split(text or "") if c.strip()]


def _find_asserted_keyword(clauses: List[str], keywords: List[str]) -> Tuple[Optional[str], List[str]]:
    """
    Returns (first_asserted_keyword, negated_keywords_seen).
    A keyword is considered negated if a negation cue appears earlier in the
    same clause (within the preceding 6 words).
    """
    negated_seen: List[str] = []
    for clause in clauses:
        for kw in keywords:
            pattern = re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE)
            for match in pattern.finditer(clause):
                prefix = clause[: match.start()].strip()
                prefix_tail = " ".join(prefix.split()[-6:])
                if prefix_tail and _NEGATION_RE.search(prefix_tail):
                    if kw not in negated_seen:
                        negated_seen.append(kw)
                else:
                    return kw, negated_seen
    return None, negated_seen


def calculate_priority(
    title: str,
    description: str,
    location: Optional[str] = None,
    affected_count: Optional[int] = None,
    duration_days: Optional[int] = None
) -> Dict:
    combined_text = f"{title} {description} {location or ''}".lower()
    clauses = _split_clauses(combined_text)

    # 1. Safety Risk Scoring (0 - 40 pts)
    safety_score = 0
    safety_reason = "No acute physical or biological safety hazard asserted."
    is_emergency = False

    crit_kw, crit_negated = _find_asserted_keyword(clauses, CRITICAL_SAFETY_KEYWORDS)
    if crit_kw:
        safety_score = 40
        safety_reason = f"Critical safety risk identified: asserts '{crit_kw}' requiring immediate emergency intervention."
        is_emergency = True
    else:
        mod_kw, mod_negated = _find_asserted_keyword(clauses, MODERATE_SAFETY_KEYWORDS)
        if mod_kw:
            safety_score = 25
            safety_reason = f"Moderate safety concern identified: asserts '{mod_kw}' which may lead to physical injury or sanitation risk."
        else:
            minor_kw, _ = _find_asserted_keyword(clauses, ["broken", "cracked", "stuck", "smell", "loose"])
            if minor_kw:
                safety_score = 10
                safety_reason = f"Minor safety or structural risk indicated ('{minor_kw}')."
            elif crit_negated or mod_negated:
                neg_list = ", ".join(crit_negated + mod_negated)
                safety_reason = f"Hazard terms were negated ({neg_list}); no active safety hazard asserted."

    # 2. Service Disruption Severity (0 - 25 pts)
    disruption_score = 8
    disruption_reason = "Localized issue affecting individual apparatus or isolated setting (baseline 8 pts)."

    high_disrupt_kw, _ = _find_asserted_keyword(clauses, HIGH_DISRUPTION_KEYWORDS)
    if high_disrupt_kw:
        disruption_score = 24
        disruption_reason = f"Major operational impact: '{high_disrupt_kw}' severely interrupts academic or residential activities."
    else:
        mod_disrupt_kw, _ = _find_asserted_keyword(clauses, MODERATE_DISRUPTION_KEYWORDS)
        if mod_disrupt_kw:
            disruption_score = 15
            disruption_reason = f"Noticeable service impairment: '{mod_disrupt_kw}' causes daily inconvenience to users."

    # 3. People Affected (0 - 20 pts)
    if affected_count is not None:
        if affected_count >= 100:
            people_score = 20
            people_reason = f"Large community impact: explicitly affects {affected_count}+ individuals."
        elif affected_count >= 30:
            people_score = 15
            people_reason = f"Substantial group impact: explicitly affects {affected_count} people."
        elif affected_count >= 5:
            people_score = 10
            people_reason = f"Multiple individuals affected ({affected_count} people)."
        else:
            people_score = 4
            people_reason = f"Limited individual impact ({affected_count} person)."
    else:
        major_venue_kw, _ = _find_asserted_keyword(
            clauses, ["entire hostel", "academic block", "auditorium", "dining hall", "cafeteria", "library"]
        )
        shared_venue_kw, _ = _find_asserted_keyword(
            clauses, ["classroom", "lab", "washroom", "corridor", "hallway", "floor"]
        )
        if major_venue_kw:
            people_score = 14
            people_reason = f"Impacts a major shared campus facility ('{major_venue_kw}') with high daily footfall."
        elif shared_venue_kw:
            people_score = 8
            people_reason = f"Affects a communal room or corridor ('{shared_venue_kw}') used by groups of students."
        else:
            people_score = 4
            people_reason = "Isolated room or individual workstation impact (baseline 4 pts)."

    # 4. Duration & Urgency (0 - 15 pts)
    urgency_score = 0
    urgency_reason = ""

    if duration_days is not None:
        if duration_days >= 7:
            urgency_score += 10
            urgency_reason = f"Prolonged persistence: unresolved for {duration_days} days."
        elif duration_days >= 3:
            urgency_score += 6
            urgency_reason = f"Ongoing issue unresolved for {duration_days} days."
        else:
            urgency_score += 3
            urgency_reason = f"Recent issue reported within {duration_days} day(s)."

    urgent_kw, _ = _find_asserted_keyword(clauses, URGENT_INDICATORS)
    if urgent_kw:
        urgency_score = min(15, urgency_score + 5)
        urgency_reason = (urgency_reason + f" Express urgency flag present ('{urgent_kw}').").strip()

    if urgency_score == 0:
        urgency_score = 3
        urgency_reason = "Standard baseline priority timeline (baseline 3 pts)."

    base_score = safety_score + disruption_score + people_score + urgency_score

    factors = [
        {"factor": "Safety & Hazard Risk", "points": safety_score, "max_points": 40, "reason": safety_reason},
        {"factor": "Service Disruption", "points": disruption_score, "max_points": 25, "reason": disruption_reason},
        {"factor": "People Affected", "points": people_score, "max_points": 20, "reason": people_reason},
        {"factor": "Duration & Urgency", "points": urgency_score, "max_points": 15, "reason": urgency_reason},
    ]

    # Policy Override: acute emergencies enforce a minimum policy floor of 82 (Critical band)
    policy_adjustment = 0
    if is_emergency and base_score < 82:
        policy_adjustment = 82 - base_score
        total_score = 82
        factors.append({
            "factor": "Emergency Policy Floor Adjustment",
            "points": policy_adjustment,
            "max_points": 82,
            "reason": f"Acute safety hazard policy enforces a minimum score of 82 (base sum {base_score} + {policy_adjustment} adjustment)."
        })
    else:
        total_score = min(100, base_score)

    if is_emergency or total_score >= 80:
        recommended_priority = "Critical"
    elif total_score >= 60:
        recommended_priority = "High"
    elif total_score >= 35:
        recommended_priority = "Medium"
    else:
        recommended_priority = "Low"

    breakdown_parts = [f"{f['factor']}: {f['points']} pts" for f in factors if f["points"] > 0]
    active_reasons = [f["reason"] for f in factors if f["points"] > 0]
    summary_text = (
        f"{recommended_priority} priority recommended (Final Score: {total_score}/100; "
        f"Base Sum: {base_score}/100"
        + (f", Policy Adjustment: +{policy_adjustment}" if policy_adjustment > 0 else "")
        + f"; Breakdown: {', '.join(breakdown_parts)}). "
        + " ".join(active_reasons)
    )

    return {
        "recommended_priority": recommended_priority,
        "score": total_score,
        "factors": factors,
        "reasoning": summary_text,
        "requires_immediate_review": (recommended_priority == "Critical")
    }
