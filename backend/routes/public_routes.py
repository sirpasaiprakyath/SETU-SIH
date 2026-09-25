from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/public", tags=["Public Responsible AI Disclosure"])

@router.get("/responsible-ai")
def get_responsible_ai_statement():
    """
    Publicly accessible endpoint (no login required) stating the operational,
    ethical, and institutional boundaries of the SETU system.
    """
    return {
        "system_name": "SETU (सेतु) — SIH26186",
        "team_name": "Team Guardian Minds",
        "sponsor": "Central Reserve Police Force (CRPF), Police-II Division, Ministry of Home Affairs (MHA), Government of India",
        "target_forces": "Central Reserve Police Force (CRPF) [Primary Scope; Pan-CAPF Architecture Scalable to BSF, CISF, ITBP, SSB, AR, NSG]",
        "core_thesis": "Compare each person only to their own normal. Never to a fixed scale, and never to anyone else.",
        "ethical_charter": [
            {
                "title": "No Prediction of Suicide or Self-Harm",
                "statement": "This system does NOT predict suicide or self-harm. No published computational system anywhere in the world reliably does that at the individual level. The target outcome is strictly an administrative triage trigger: 'recommended for welfare review' (base rate ~7%)."
            },
            {
                "title": "Drift from Personal Baseline",
                "statement": "There is no universal 'stress score'. A calm individual and an anxious individual are both 'normal' for themselves. The system looks for an individual drifting, over weeks, away from where they themselves usually sit in duty load, leave availing, and muster observations."
            },
            {
                "title": "Mandatory Human Review",
                "statement": "Every flag requires human review by a qualified Welfare Officer before any action is taken. The system never auto-triggers counselling mandates, weapon-access changes, or disciplinary actions."
            },
            {
                "title": "Absolute Dignity & Zero-Record Declines",
                "statement": "When a pattern change is noticed, personnel receive an optional, low-key invitation for an informal chat. Declining an invitation creates NO record, note, or flag anywhere in the system."
            },
            {
                "title": "Strict Command Boundary",
                "statement": "Command and unit leadership screens are strictly aggregate-only. Absolutely no individual names, IDs, or flags can be viewed by disciplinary or operational command roles."
            }
        ],
        "fatigue_methodology": "The fatigue proxy index is a simplified metric inspired by the U.S. Army's SAFTE-FAST framework (duty hours, night duties, rest compliance), not a proprietary reproduction.",
        "institutional_readiness_statement": "Before this touches real personnel data, it requires a CERT-In empanelled security audit (VAPT), GIGW 3.0 / STQC certification, and hosting on NIC/MeghRaj government infrastructure — not a generic commercial cloud host. This prototype demonstrates the architecture and workflow; formal certification follows institutional adoption."
    }
