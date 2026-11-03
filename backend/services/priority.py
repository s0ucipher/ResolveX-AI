import re
from typing import Dict, List, Optional

CRITICAL_SAFETY_KEYWORDS = [
    "sparking", "live wire", "bare wire", "electrocution", "electric shock",
    "fire hazard", "smoke", "gas leak", "chemical spill", "toxic", "ceiling collapse",
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

def calculate_priority(
    title: str,
    description: str,
    location: Optional[str] = None,
    affected_count: Optional[int] = None,
    duration_days: Optional[int] = None
) -> Dict:
    combined_text = f"{title} {description} {location or ''}".lower()
    
    # 1. Safety Risk Scoring (0 - 40 pts)
    safety_score = 0
    safety_reason = "No acute physical or biological safety hazard detected."
    is_emergency = False

    for kw in CRITICAL_SAFETY_KEYWORDS:
        if kw in combined_text:
            safety_score = 40
            safety_reason = f"Critical safety risk identified: reports '{kw}' requiring immediate emergency intervention."
            is_emergency = True
            break

    if not is_emergency:
        for kw in MODERATE_SAFETY_KEYWORDS:
            if kw in combined_text:
                safety_score = 25
                safety_reason = f"Moderate safety concern identified: mentions '{kw}' which may lead to physical injury or sanitation risk."
                break

    if safety_score == 0 and any(w in combined_text for w in ["broken", "cracked", "stuck", "smell", "loose"]):
        safety_score = 10
        safety_reason = "Minor safety or structural risk indicated."

    # 2. Service Disruption Severity (0 - 25 pts)
    disruption_score = 0
    disruption_reason = "Normal operational issue with low service disruption."

    for kw in HIGH_DISRUPTION_KEYWORDS:
        if kw in combined_text:
            disruption_score = 24
            disruption_reason = f"Major operational impact: '{kw}' severely interrupts academic or residential activities."
            break

    if disruption_score == 0:
        for kw in MODERATE_DISRUPTION_KEYWORDS:
            if kw in combined_text:
                disruption_score = 15
                disruption_reason = f"Noticeable service impairment: '{kw}' causes daily inconvenience to users."
                break

    if disruption_score == 0:
        disruption_score = 8
        disruption_reason = "Localized issue affecting individual apparatus or isolated setting."

    # 3. People Affected (0 - 20 pts)
    people_score = 0
    people_reason = "Individual or localized impact reported."

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
        # Contextual inference from public venues
        if any(w in combined_text for w in ["entire hostel", "academic block", "auditorium", "dining hall", "cafeteria", "library"]):
            people_score = 14
            people_reason = "Impacts a major shared campus facility with high daily footfall."
        elif any(w in combined_text for w in ["classroom", "lab", "washroom", "corridor", "hallway", "floor"]):
            people_score = 8
            people_reason = "Affects a communal room or corridor used by groups of students."
        else:
            people_score = 4
            people_reason = "Isolated room or individual workstation impact."

    # 4. Duration & Urgency (0 - 15 pts)
    urgency_score = 0
    urgency_reason = "Standard resolution timeframe."

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

    # Keyword urgency boost
    for kw in URGENT_INDICATORS:
        if kw in combined_text:
            urgency_score = min(15, urgency_score + 5)
            urgency_reason += f" Express urgency flags present ('{kw}')."
            break

    if urgency_score == 0:
        urgency_score = 3
        urgency_reason = "Standard baseline priority timeline."

    calculated_sum = safety_score + disruption_score + people_score + urgency_score

    # Policy Override: immediate acute emergencies enforce a minimum policy score floor of 80 (Critical band)
    if is_emergency:
        total_score = min(100, max(82, calculated_sum))
    else:
        total_score = min(100, calculated_sum)

    # Determine Priority Band
    if is_emergency or total_score >= 80:
        recommended_priority = "Critical"
    elif total_score >= 60:
        recommended_priority = "High"
    elif total_score >= 35:
        recommended_priority = "Medium"
    else:
        recommended_priority = "Low"

    # Formulate Reasoning Summary
    reasons = []
    if safety_score >= 25:
        reasons.append(safety_reason)
    if disruption_score >= 15:
        reasons.append(disruption_reason)
    if people_score >= 10:
        reasons.append(people_reason)
    if urgency_score >= 6:
        reasons.append(urgency_reason)

    if not reasons:
        reasons.append("Standard priority assigned based on routine operational metrics.")

    summary_text = (
        f"{recommended_priority} priority recommended (Score: {total_score}/100). "
        + " ".join(reasons)
    )

    factors = [
        {"factor": "Safety & Hazard Risk", "points": safety_score, "max_points": 40, "reason": safety_reason},
        {"factor": "Service Disruption", "points": disruption_score, "max_points": 25, "reason": disruption_reason},
        {"factor": "People Affected", "points": people_score, "max_points": 20, "reason": people_reason},
        {"factor": "Duration & Urgency", "points": urgency_score, "max_points": 15, "reason": urgency_reason},
    ]

    return {
        "recommended_priority": recommended_priority,
        "score": total_score,
        "factors": factors,
        "reasoning": summary_text,
        "requires_immediate_review": (recommended_priority == "Critical")
    }
