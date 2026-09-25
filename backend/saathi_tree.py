"""
Saathi Adaptive Question Tree (Up to 10 Questions Deep)

Core rule: 10 is a ceiling for someone who keeps engaging — not a floor everyone must reach.
"Good" and "Rather not say" paths stay short on purpose.
"Rather not say" is a valid, zero-consequence answer at every single node.
Safety Net cuts across every branch, triggers automatically, overrides remaining questions.
"""

import re
from typing import Dict, Any, List, Optional

CRISIS_PATTERNS = [
    r"\bsuicide\b",
    r"\bkill\s+(myself|me)\b",
    r"\bend\s+(it\s+all|my\s+life)\b",
    r"\bhang\s+myself\b",
    r"\bdon'?t\s+want\s+to\s+live\b",
    r"\bcannot\s+go\s+on\b",
    r"\bcan'?t\s+go\s+on\b",
    r"\bno\s+reason\s+to\s+live\b",
    r"\bbetter\s+off\s+dead\b",
    r"\bself\s*harm\b",
    r"\bshoot\s+myself\b",
    r"\bwant\s+to\s+die\b"
]

def check_crisis_text(text: Optional[str]) -> bool:
    if not text:
        return False
    lower = text.lower()
    for pattern in CRISIS_PATTERNS:
        if re.search(pattern, lower):
            return True
    return False

# =============================================================================
# Q1 OPENER GENERATION
# =============================================================================
def get_q1_opener(profile: Any, last_submission: Optional[Any] = None) -> Dict[str, Any]:
    posting_cat = (getattr(profile, "posting_category", "") or "").lower()
    leave_availed = getattr(profile, "leave_availed_last_12m", 0) or 0
    duration_months = getattr(profile, "posting_duration_months", 0) or 0

    # 1. Returning user with prior recorded topic
    last_topic = None
    if last_submission and last_submission.answers_json:
        try:
            import json
            answers = json.loads(last_submission.answers_json)
            for a in answers:
                if a.get("question_id") == "q2_domain_picker":
                    last_topic = a.get("option_label", "").lower()
                    break
        except Exception:
            last_topic = None

    if last_topic and last_topic != "rather not say":
        prompt = f"Last time, {last_topic} was on your mind. How's that now?"
        context_tag = "returning_user"
    # 2. Long stretch, no leave, operational/LWE posting
    elif ("lwe" in posting_cat or "tactical" in posting_cat or "ci" in posting_cat) and duration_months >= 10:
        prompt = "It's been a demanding stretch out here. How are you holding up?"
        context_tag = "operational_long_stretch"
    # 3. Back from leave (e.g., availed leave in past month / high leave availed recently)
    elif leave_availed > 20 and duration_months <= 3:
        prompt = "Settling back in after leave — how's it going?"
        context_tag = "back_from_leave"
    # 4. Peace / static posting
    elif "peace" in posting_cat or "static" in posting_cat or "base" in posting_cat or "hq" in posting_cat:
        prompt = "How's the routine treating you lately?"
        context_tag = "peace_routine"
    # 5. Default / standard weekly opener
    else:
        prompt = "How's this week been for you, overall?"
        context_tag = "standard_weekly"

    return {
        "question_id": "q1_opener",
        "step": 1,
        "title": "Check-In Opening",
        "prompt": prompt,
        "context_tag": context_tag,
        "options": [
            {"key": "good", "label": "Good", "sub": "Feeling steady and in rhythm", "score_val": 5},
            {"key": "okay", "label": "Okay", "sub": "Managing, but some things on my mind", "score_val": 3},
            {"key": "tough", "label": "Tough", "sub": "Things are feeling heavy or strained", "score_val": 1},
            {"key": "rather_not_say", "label": "Rather not say", "sub": "Prefer not to share right now", "score_val": 3, "is_opt_out": True}
        ]
    }

# =============================================================================
# Q2 DOMAIN PICKER
# =============================================================================
def get_q2_domain_picker(is_operational: bool) -> Dict[str, Any]:
    options = [
        {"key": "work", "label": "Work / duty pressure", "sub": "Roster load, shifts, postings, or incident stress"},
        {"key": "family", "label": "Family", "sub": "Domestic worries, separation strain, or family health"},
        {"key": "health", "label": "Health or sleep", "sub": "Sleep disruptions, exhaustion, or physical ailments"},
        {"key": "money", "label": "Money", "sub": "Financial pressure, expenses, or debt worries"},
    ]

    if is_operational:
        options.append({
            "key": "operation",
            "label": "Something from an operation or patrol",
            "sub": "Encounter, tactical ambush, or traumatic field incident"
        })

    options.append({
        "key": "other",
        "label": "Something else",
        "sub": "Personal reflection or private thoughts"
    })

    options.append({
        "key": "rather_not_say",
        "label": "Rather not say",
        "sub": "Prefer not to answer",
        "is_opt_out": True
    })

    return {
        "question_id": "q2_domain_picker",
        "step": 2,
        "title": "Main Pressure Vector",
        "prompt": "What's been the main thing on your mind?",
        "options": options
    }

# =============================================================================
# BRANCH DEFINITIONS (Q3 TO Q10)
# =============================================================================

BRANCH_WORK = {
    3: {
        "question_id": "work_q3",
        "title": "Workload vs Location",
        "prompt": "Is it more the workload and hours, or something about the posting itself?",
        "options": [
            {"key": "workload_hours", "label": "Workload / hours", "sub": "Shift lengths, night watches, and turnarounds"},
            {"key": "posting_location", "label": "The posting or location", "sub": "Outpost isolation, terrain, or climate"},
            {"key": "specific_incident", "label": "A specific incident", "sub": "A particular operational or duty event", "is_safety_net": True},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    4: {
        "question_id": "work_q4",
        "title": "Gradual Build-up vs Recent Event",
        "prompt": "Has this been building up gradually, or did something recently make it worse?",
        "options": [
            {"key": "gradual", "label": "Gradual", "sub": "Cumulative fatigue over weeks or months"},
            {"key": "recent", "label": "Something recent", "sub": "A recent change or roster trigger"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    5: {
        "question_id": "work_q5",
        "title": "Scheduled Rest Days",
        "prompt": "Are your scheduled rest days actually happening, or getting missed often?",
        "options": [
            {"key": "happening", "label": "Happening", "sub": "Getting standard weekly rest"},
            {"key": "often_missed", "label": "Often missed", "sub": "Cancelled or postponed frequently"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    6: {
        "question_id": "work_q6",
        "title": "Sleep Recovery",
        "prompt": "How's your sleep been through this stretch?",
        "options": [
            {"key": "fine", "label": "Fine", "sub": "Able to get enough restful sleep"},
            {"key": "disturbed", "label": "Disturbed", "sub": "Broken sleep, waking up tired"},
            {"key": "barely_sleeping", "label": "Barely sleeping", "sub": "Severe insomnia or distress"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    7: {
        "question_id": "work_q7",
        "title": "Personal vs Visible Strain",
        "prompt": "Is this something you feel mostly when you're alone with it, or does it show around the rest of your section too?",
        "options": [
            {"key": "mostly_alone", "label": "Mostly alone", "sub": "Internalized when off duty or at night"},
            {"key": "shows_others", "label": "Shows around others too", "sub": "Affecting patience, communication, or barracks mood"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    8: {
        "question_id": "work_q8",
        "title": "Buddy / Informal Support",
        "prompt": "Is there someone nearby you'd feel okay mentioning this to, even informally?",
        "options": [
            {"key": "yes", "label": "Yes", "sub": "A buddy, saathi, or colleague in the unit"},
            {"key": "not_really", "label": "Not really", "sub": "Prefer not to bring it up locally"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    9: {
        "question_id": "work_q9",
        "title": "Commander Awareness",
        "prompt": "Would it help if your section commander knew, informally — or would you rather keep this to yourself for now?",
        "options": [
            {"key": "let_them_know", "label": "Let them know", "sub": "Quiet word to adjust pacing if possible"},
            {"key": "keep_to_myself", "label": "Keep it to myself", "sub": "Keep strictly off-record for now"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    10: {
        "question_id": "work_q10",
        "title": "Closing Reflection",
        "prompt": "Anything else you'd want to note, or shall we leave it here for now?",
        "options": [
            {"key": "add_note", "label": "Add a private note", "sub": "Write optional reflection in your personal sandbox"},
            {"key": "leave_here", "label": "Leave it here", "sub": "Complete check-in now"}
        ],
        "is_closing": True
    }
}

BRANCH_FAMILY = {
    3: {
        "question_id": "family_q3",
        "title": "Missing Them vs Specific Issue",
        "prompt": "Is it more just missing them, or something specific going on back home?",
        "options": [
            {"key": "just_missing", "label": "Just missing them", "sub": "Standard separation weight", "is_skip_to_q9": True},
            {"key": "something_specific", "label": "Something specific", "sub": "Health, legal, property, or children matters"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    4: {
        "question_id": "family_q4",
        "title": "Immediate vs Extended Family",
        "prompt": "Is it more about your spouse or kids, or the wider family?",
        "options": [
            {"key": "spouse_kids", "label": "Spouse / kids", "sub": "Nuclear household concerns"},
            {"key": "wider_family", "label": "Wider family", "sub": "Parents, siblings, or elders in village"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    5: {
        "question_id": "family_q5",
        "title": "Domestic Support at Home",
        "prompt": "Do they have people around them to lean on while you're away, or are they mostly managing alone?",
        "options": [
            {"key": "people_around", "label": "People around them", "sub": "Joint family or relatives nearby"},
            {"key": "mostly_alone", "label": "Mostly alone", "sub": "Managing household and emergencies independently"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    6: {
        "question_id": "family_q6",
        "title": "Communication Frequency",
        "prompt": "How often are you actually able to talk to them?",
        "options": [
            {"key": "often", "label": "Often", "sub": "Daily or almost daily calls"},
            {"key": "not_as_much", "label": "Not as much as I'd like", "sub": "Network issues or duty clash"},
            {"key": "rarely", "label": "Rarely", "sub": "Infrequent or strained contact"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    7: {
        "question_id": "family_q7",
        "title": "Specific Worry vs General Burden",
        "prompt": "Is it a specific worry, or more the general weight of being away?",
        "options": [
            {"key": "specific_worry", "label": "A specific worry", "sub": "An acute situation or date deadline"},
            {"key": "general_weight", "label": "General weight", "sub": "Cumulative separation from milestones"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    8: {
        "question_id": "family_q8",
        "title": "Unit Family Welfare Check",
        "prompt": "Would it help if the unit's family welfare contact quietly checked in with them?",
        "options": [
            {"key": "yes_please", "label": "Yes, please", "sub": "Request quiet family cell outreach"},
            {"key": "no_not_needed", "label": "No, not needed", "sub": "Prefer to handle privately"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    9: {
        "question_id": "family_q9",
        "title": "Upcoming Leave Timeline",
        "prompt": "Is your next leave coming up soon, or still a while off?",
        "options": [
            {"key": "coming_soon", "label": "Coming up soon", "sub": "Within the next 2-4 weeks"},
            {"key": "while_off", "label": "A while off", "sub": "Several months away"},
            {"key": "not_sure", "label": "Not sure", "sub": "Awaiting roster approval"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    10: {
        "question_id": "family_q10",
        "title": "Closing Reflection",
        "prompt": "Anything else to note, or shall we leave it here?",
        "options": [
            {"key": "add_note", "label": "Add a note", "sub": "Write reflection for your own log"},
            {"key": "leave_here", "label": "Leave it here", "sub": "Complete check-in now"}
        ],
        "is_closing": True
    }
}

BRANCH_HEALTH = {
    3: {
        "question_id": "health_q3",
        "title": "Sleep vs Physical Health",
        "prompt": "Is it mostly sleep, or how you're feeling physically?",
        "options": [
            {"key": "sleep", "label": "Sleep", "sub": "Trouble falling asleep or staying asleep"},
            {"key": "physical", "label": "Physical health", "sub": "Aches, joint pain, digestion, or fatigue"},
            {"key": "both", "label": "Both", "sub": "Physical wear combined with sleep strain"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    4: {
        "question_id": "health_q4",
        "title": "Weekly Rest Patterns",
        "prompt": "Roughly how many nights this past week would you say you slept properly?",
        "options": [
            {"key": "most_nights", "label": "Most nights", "sub": "5-7 restful nights"},
            {"key": "some_nights", "label": "Some nights", "sub": "3-4 nights with broken rest"},
            {"key": "barely_any", "label": "Barely any", "sub": "Severe sleep debt (0-2 nights)"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    5: {
        "question_id": "health_q5",
        "title": "Sleep Disruption Driver",
        "prompt": "Is something specific keeping you up, or does it just not come easily?",
        "options": [
            {"key": "specific", "label": "Something specific", "sub": "Thoughts, noise, weather, or phone alerts"},
            {"key": "not_easy", "label": "Just doesn't come easily", "sub": "Restless mind or body rhythm"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    6: {
        "question_id": "health_q6",
        "title": "Physical Symptoms",
        "prompt": "Any physical symptoms lately — headaches, appetite change, low energy?",
        "options": [
            {"key": "not_really", "label": "Not really", "sub": "No major physical symptoms"},
            {"key": "yes_some", "label": "Yes, some", "sub": "Noticed physical changes or low energy"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    7: {
        "question_id": "health_q7",
        "title": "Medical Camp Check",
        "prompt": "Have you mentioned this at a medical camp yet?",
        "options": [
            {"key": "yes", "label": "Yes", "sub": "Discussed with medical officer"},
            {"key": "not_yet", "label": "Not yet", "sub": "Haven't brought it up yet"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    8: {
        "question_id": "health_q8",
        "title": "Camp Reminder",
        "prompt": "Would a reminder ahead of your next camp check-in be useful?",
        "options": [
            {"key": "yes", "label": "Yes", "sub": "Flag a quiet reminder on my dashboard"},
            {"key": "not_needed", "label": "Not needed", "sub": "I know my schedule"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    9: {
        "question_id": "health_q9",
        "title": "Duration of Strain",
        "prompt": "Is this fairly new, or has it been going on a while?",
        "options": [
            {"key": "fairly_new", "label": "Fairly new", "sub": "Started in the past couple of weeks"},
            {"key": "a_while", "label": "A while", "sub": "Ongoing for a month or longer"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    10: {
        "question_id": "health_q10",
        "title": "Closing Reflection",
        "prompt": "Anything else on this, or shall we leave it here?",
        "options": [
            {"key": "add_note", "label": "Add a note", "sub": "Record private health notes"},
            {"key": "leave_here", "label": "Leave it here", "sub": "Complete check-in now"}
        ],
        "is_closing": True
    }
}

BRANCH_MONEY = {
    3: {
        "question_id": "money_q3",
        "title": "Support Options vs Personal Note",
        "prompt": "Would it help to see support options, or are you just noting it for now?",
        "options": [
            {"key": "show_options", "label": "Show me options", "sub": "Welfare loans and emergency relief"},
            {"key": "just_noting", "label": "Just noting it", "sub": "Just logging thoughts for myself"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    4: {
        "question_id": "money_q4",
        "title": "One-Off vs Ongoing",
        "prompt": "Is it more a one-off expense, or an ongoing worry?",
        "options": [
            {"key": "one_off", "label": "One-off", "sub": "Medical emergency, house repair, or travel"},
            {"key": "ongoing", "label": "Ongoing", "sub": "Loans, family commitments, or recurring strain"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    5: {
        "question_id": "money_q5",
        "title": "Family vs Personal Concern",
        "prompt": "Is it connected to something back home, or more personal?",
        "options": [
            {"key": "family_connected", "label": "Connected to family", "sub": "Village expenses, medical needs, or marriage"},
            {"key": "personal", "label": "More personal", "sub": "Personal debt or unexpected cost"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    6: {
        "question_id": "money_q6",
        "title": "Department Welfare Funds",
        "prompt": "Have you looked into any of the department's existing welfare-fund options?",
        "options": [
            {"key": "yes", "label": "Yes", "sub": "Aware or already applied"},
            {"key": "not_yet", "label": "Not yet", "sub": "Haven't looked into it"},
            {"key": "didnt_know", "label": "Didn't know these existed", "sub": "Unaware of welfare grant provisions"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    7: {
        "question_id": "money_q7",
        "title": "Confidential Welfare Cell Bridge",
        "prompt": "Want a private note sent to the welfare cell about available support schemes — no details required from you?",
        "options": [
            {"key": "yes", "label": "Yes", "sub": "Share available scheme details on my desk"},
            {"key": "no", "label": "No", "sub": "I will handle it myself"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    8: {
        "question_id": "money_q8",
        "title": "Impact on Sleep & Focus",
        "prompt": "Is this affecting your sleep or focus on duty at all?",
        "options": [
            {"key": "a_little", "label": "A little", "sub": "Occasional worry during watches"},
            {"key": "not_really", "label": "Not really", "sub": "Duty focus is unaffected"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    9: {
        "question_id": "money_q9",
        "title": "Financial Timeline",
        "prompt": "Does this have a rough timeline, or is it ongoing?",
        "options": [
            {"key": "has_timeline", "label": "Has a timeline", "sub": "Will settle in coming weeks / months"},
            {"key": "ongoing", "label": "Ongoing", "sub": "Long-term commitment"},
            {"key": "rather_not_say", "label": "Rather not say", "is_opt_out": True}
        ]
    },
    10: {
        "question_id": "money_q10",
        "title": "Closing Reflection",
        "prompt": "Anything else to note, or shall we leave it here?",
        "options": [
            {"key": "add_note", "label": "Add a note", "sub": "Private reflection note"},
            {"key": "leave_here", "label": "Leave it here", "sub": "Complete check-in now"}
        ],
        "is_closing": True
    }
}

BRANCH_OPERATION = {
    3: {
        "question_id": "operation_q3",
        "title": "Field Event Flag",
        "prompt": "Do you want to note anything about it, or just flag that something happened?",
        "options": [
            {"key": "add_note", "label": "Free text note (optional)", "sub": "Write optional details in your private sandbox"},
            {"key": "just_flag", "label": "Just flag that something happened", "sub": "A tough patrol or tactical incident"},
            {"key": "rather_not_say", "label": "Rather not say", "sub": "Prefer not to detail it"}
        ],
        "is_short_branch": True
    },
    4: {
        "question_id": "operation_q4",
        "title": "Safety Net Bridge",
        "prompt": "Go straight to safety net",
        "is_safety_net": True
    }
}

BRANCH_OTHER = {
    3: {
        "question_id": "other_q3",
        "title": "Private Reflection Sandbox",
        "prompt": "This stays private. Only you can choose to share it — nobody else sees this by default.",
        "is_free_text_only": True,
        "is_closing": True
    }
}

# =============================================================================
# NEXT QUESTION ROUTING LOGIC
# =============================================================================
def get_adaptive_next_node(
    current_step: int,
    answers: List[Dict[str, Any]],
    duty_category: str,
    is_operational: bool,
    profile: Any = None
) -> Dict[str, Any]:
    last_ans = answers[-1] if answers else {}
    last_key = last_ans.get("option_key", "")
    last_qid = last_ans.get("question_id", "")
    free_text = last_ans.get("free_text", "") or last_ans.get("note", "")

    # Check immediate crisis patterns on any free text
    if check_crisis_text(free_text):
        return {
            "step": current_step + 1,
            "is_final_step": True,
            "is_safety_net": True,
            "safety_net_message": "It sounds like things are genuinely hard right now. You don't have to carry this alone.",
            "question": None
        }

    # STEP 1 -> STEP 2
    if current_step == 1:
        # Option: Rather not say -> Skip Question 1 and advance to Step 2 (Domain Picker)
        if last_key == "rather_not_say":
            return {
                "step": 2,
                "is_final_step": False,
                "question": get_q2_domain_picker(is_operational)
            }
        # Option: Good -> Light follow up
        elif last_key == "good":
            return {
                "step": 2,
                "is_final_step": False,
                "question": {
                    "question_id": "q2_good_check",
                    "step": 2,
                    "title": "Follow-Up Check",
                    "prompt": "Good to hear. Anything at all you'd want to flag, even something small?",
                    "options": [
                        {"key": "nothing", "label": "Nothing", "sub": "All good out here, thank you", "is_closing": True},
                        {"key": "something_small", "label": "Something small", "sub": "A minor thought on my mind"},
                        {"key": "rather_not_say", "label": "Rather not say", "sub": "Skip this question", "is_opt_out": True}
                    ]
                }
            }
        # Option: Okay or Tough -> Domain Picker
        else:
            return {
                "step": 2,
                "is_final_step": False,
                "question": get_q2_domain_picker(is_operational)
            }

    # STEP 2 HANDLERS
    if current_step == 2:
        if last_qid == "q2_good_check":
            if last_key == "nothing":
                return {
                    "step": 3,
                    "is_final_step": True,
                    "exit_message": "Glad things are going well. Take care of yourself out there.",
                    "question": None
                }
            elif last_key in ["something_small", "rather_not_say"]:
                # Go to domain picker
                return {
                    "step": 2,
                    "is_final_step": False,
                    "question": get_q2_domain_picker(is_operational)
                }

        elif last_qid == "q2_domain_picker":
            if last_key == "rather_not_say":
                # Skip domain selection -> Route directly to general health/rest check Q3
                return {
                    "step": 3,
                    "is_final_step": False,
                    "domain": "health",
                    "question": BRANCH_HEALTH[3]
                }
            # Route to domain Q3
            domain = last_key
            if domain == "work":
                return {"step": 3, "is_final_step": False, "domain": "work", "question": BRANCH_WORK[3]}
            elif domain == "family":
                return {"step": 3, "is_final_step": False, "domain": "family", "question": BRANCH_FAMILY[3]}
            elif domain == "health":
                return {"step": 3, "is_final_step": False, "domain": "health", "question": BRANCH_HEALTH[3]}
            elif domain == "money":
                return {"step": 3, "is_final_step": False, "domain": "money", "question": BRANCH_MONEY[3]}
            elif domain == "operation":
                return {"step": 3, "is_final_step": False, "domain": "operation", "question": BRANCH_OPERATION[3]}
            elif domain == "other":
                return {"step": 3, "is_final_step": False, "domain": "other", "question": BRANCH_OTHER[3]}
            else:
                return {"step": 3, "is_final_step": False, "domain": "health", "question": BRANCH_HEALTH[3]}

    # Check which domain is active from answers
    active_domain = None
    for a in answers:
        if a.get("question_id") == "q2_domain_picker":
            opt = a.get("option_key")
            if opt and opt != "rather_not_say":
                active_domain = opt
            break
    if not active_domain:
        active_domain = "health"

    # WORK BRANCH ROUTING
    if active_domain == "work":
        if last_key == "specific_incident":
            # Safety Net Triggered
            return {
                "step": current_step + 1,
                "is_final_step": True,
                "is_safety_net": True,
                "safety_net_message": "It sounds like things are genuinely hard right now. You don't have to carry this alone.",
                "question": None
            }
        next_step = current_step + 1
        if next_step in BRANCH_WORK:
            q = BRANCH_WORK[next_step]
            return {"step": next_step, "is_final_step": q.get("is_closing", False), "domain": "work", "question": q}

    # FAMILY BRANCH ROUTING
    elif active_domain == "family":
        # Skip logic: Q3 "just_missing" skips straight to Q9
        if last_qid == "family_q3" and last_key == "just_missing":
            return {"step": 9, "is_final_step": False, "domain": "family", "question": BRANCH_FAMILY[9]}
        
        next_step = current_step + 1
        if next_step in BRANCH_FAMILY:
            q = BRANCH_FAMILY[next_step]
            return {"step": next_step, "is_final_step": q.get("is_closing", False), "domain": "family", "question": q}

    # HEALTH BRANCH ROUTING
    elif active_domain == "health":
        next_step = current_step + 1
        if next_step in BRANCH_HEALTH:
            q = BRANCH_HEALTH[next_step]
            return {"step": next_step, "is_final_step": q.get("is_closing", False), "domain": "health", "question": q}

    # MONEY BRANCH ROUTING
    elif active_domain == "money":
        next_step = current_step + 1
        if next_step in BRANCH_MONEY:
            q = BRANCH_MONEY[next_step]
            return {"step": next_step, "is_final_step": q.get("is_closing", False), "domain": "money", "question": q}

    # OPERATION BRANCH ROUTING (Short branch -> Always Safety Net at Q4)
    elif active_domain == "operation":
        if current_step >= 3:
            return {
                "step": 4,
                "is_final_step": True,
                "is_safety_net": True,
                "safety_net_message": "It sounds like things are genuinely hard right now. You don't have to carry this alone.",
                "question": None
            }

    # SOMETHING ELSE BRANCH
    elif active_domain == "other":
        return {
            "step": 4,
            "is_final_step": True,
            "exit_message": "Your private notes have been safely recorded in your personal device sandbox.",
            "question": None
        }

    # Default Fallback (At or beyond Q10)
    return {
        "step": current_step + 1,
        "is_final_step": True,
        "exit_message": "Thank you for reflecting with Saathi today. Your check-in is complete.",
        "question": None
    }
