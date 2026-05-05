"""
dental_report_generator.py
---------------------------
Converts structured detection output from the YOLO-seg model
"""

from __future__ import annotations
import json
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# 1. FIXED REPORT SCHEMA
# ─────────────────────────────────────────────────────────────────────────────

REPORT_SCHEMA = {
    "sections": [
        "patient_info",
        "examination_context",
        "regional_findings",   # upper jaw / lower jaw / general
        "summary",
        "recommendations",
        "disclaimer",
    ],
    "regions": {
        "upper_jaw":  ["maxillary_sinus", "dental_implant", "dental_crown",
                       "dental_filling", "root_canal_treatment", "tooth_decay",
                       "wisdom_tooth"],
        "lower_jaw":  ["mandibular_nerve", "dental_implant", "dental_crown",
                       "dental_filling", "root_canal_treatment", "tooth_decay",
                       "wisdom_tooth", "bone_level_resorption"],
        "general":    ["periodontal_infection", "bone_level_resorption"],
    }
}


# ─────────────────────────────────────────────────────────────────────────────
# 2. CANONICAL CLINICAL SENTENCE TEMPLATES (per detection class)
#    Each template is a tuple: (finding_label, severity_map)
#    severity_map: confidence → clinical phrasing
# ─────────────────────────────────────────────────────────────────────────────

CLASS_TEMPLATES: dict[str, dict] = {

    "tooth_decay": {
        "label": "Dental Caries (Tooth Decay)",
        "region_hint": "upper/lower",
        "high":   "Active carious lesion detected with significant radiolucency, "
                  "suggesting advanced demineralization requiring immediate intervention.",
        "medium": "Suspected carious lesion observed; extent is moderate. "
                  "Clinical probing and possibly CBCT are recommended for confirmation.",
        "low":    "Possible early-stage carious lesion noted with low confidence. "
                  "Routine monitoring and preventive measures are advised.",
    },

    "bone_level_resorption": {
        "label": "Alveolar Bone Level Resorption",
        "region_hint": "lower/general",
        "high":   "Significant alveolar bone loss detected, indicative of advanced "
                  "periodontal disease. Periodontal assessment is urgently recommended.",
        "medium": "Moderate bone resorption observed. Periodontal probing and "
                  "radiographic follow-up are recommended within 3 months.",
        "low":    "Mild bone level variation detected; may represent early resorption "
                  "or normal anatomical variation. Monitoring is advised.",
    },

    "periodontal_infection": {
        "label": "Periodontal Infection",
        "region_hint": "general",
        "high":   "Radiographic signs consistent with active periodontal infection "
                  "detected. Prompt periodontal evaluation and treatment planning required.",
        "medium": "Possible periodontal infection noted. Clinical examination with "
                  "periodontal probing is strongly recommended.",
        "low":    "Subtle signs potentially consistent with periodontal pathology. "
                  "Clinical correlation is needed before conclusions are drawn.",
    },

    "root_canal_treatment": {
        "label": "Root Canal Treatment (Endodontic Therapy)",
        "region_hint": "upper/lower",
        "high":   "Previously performed root canal treatment is clearly visible. "
                  "Assess for periapical pathology and treatment adequacy.",
        "medium": "Root canal filling material appears present. Evaluate fill density "
                  "and periapical status for treatment quality assessment.",
        "low":    "Possible endodontic treatment detected; image quality limits "
                  "definitive assessment. Clinical confirmation is advised.",
    },

    "dental_implant": {
        "label": "Dental Implant",
        "region_hint": "upper/lower",
        "high":   "Osseointegrated dental implant clearly identified. "
                  "Evaluate peri-implant bone levels and prosthetic components.",
        "medium": "Dental implant structure detected. Confirm implant stability "
                  "and peri-implant tissue health clinically.",
        "low":    "Possible implant fixture detected; confirmation via clinical "
                  "palpation and updated radiographs is recommended.",
    },

    "dental_crown": {
        "label": "Dental Crown (Prosthetic Restoration)",
        "region_hint": "upper/lower",
        "high":   "Full-coverage dental crown identified. Assess marginal integrity, "
                  "secondary caries risk, and pulp status.",
        "medium": "Crown restoration detected. Marginal fit and underlying tooth "
                  "health should be evaluated clinically.",
        "low":    "Possible crown or large restoration noted. Clinical examination "
                  "is required for accurate assessment.",
    },

    "dental_filling": {
        "label": "Dental Filling (Restorative Material)",
        "region_hint": "upper/lower",
        "high":   "Existing restoration clearly identified. Check for recurrent caries, "
                  "marginal gaps, or restoration failure.",
        "medium": "Restorative material detected. Evaluate restoration integrity "
                  "and adjacent tooth structure clinically.",
        "low":    "Possible small restoration or dense material observed. "
                  "Clinical probing will clarify.",
    },

    "wisdom_tooth": {
        "label": "Third Molar (Wisdom Tooth)",
        "region_hint": "upper/lower",
        "high":   "Third molar clearly visible. Assess eruption status, angulation, "
                  "impaction risk, and proximity to adjacent structures.",
        "medium": "Wisdom tooth detected. Eruption pathway and potential impaction "
                  "should be evaluated.",
        "low":    "Possible third molar germ or partially visible crown noted. "
                  "Monitoring recommended.",
    },

    "maxillary_sinus": {
        "label": "Maxillary Sinus",
        "region_hint": "upper",
        "high":   "Maxillary sinus clearly delineated. Evaluate sinus floor proximity "
                  "to root apices and any mucosal thickening.",
        "medium": "Maxillary sinus region identified. Assess for sinusitis signs "
                  "or odontogenic involvement.",
        "low":    "Sinus boundary partially visible; anatomy is within expected range.",
    },

    "mandibular_nerve": {
        "label": "Inferior Alveolar Nerve Canal",
        "region_hint": "lower",
        "high":   "Mandibular nerve canal clearly traced. Note proximity to root apices "
                  "and implant planning zones — critical for surgical risk assessment.",
        "medium": "Nerve canal identified. Accurate localization is essential before "
                  "any surgical intervention in the posterior mandible.",
        "low":    "Possible nerve canal outline detected. CBCT is recommended for "
                  "precise localization prior to surgery.",
    },
}


def _confidence_tier(score: float) -> str:
    """Map confidence score to severity tier."""
    if score >= 0.65:
        return "high"
    elif score >= 0.40:
        return "medium"
    return "low"


def _format_detections_for_prompt(detections: list[dict]) -> str:
    """
    Convert raw detection dicts into structured clinical context for the prompt.
    Expected detection format:
        {"class": "tooth_decay", "confidence": 0.82, "region": "upper_jaw",
         "tooth_number": "26",   # optional FDI notation
         "bbox": [x1, y1, x2, y2]}  # optional
    """
    lines = []
    for i, det in enumerate(detections, 1):
        cls = det.get("class", "unknown")
        conf = det.get("confidence", 0.0)
        region = det.get("region", "unspecified")
        tooth = det.get("tooth_number")
        tier = _confidence_tier(conf)
        template = CLASS_TEMPLATES.get(cls, {})

        label = template.get("label", cls.replace("_", " ").title())
        clinical_text = template.get(tier, "Finding detected. Clinical correlation required.")

        tooth_str = f", tooth #{tooth}" if tooth else ""
        lines.append(
            f"  [{i}] {label} | Region: {region}{tooth_str} | "
            f"Confidence: {conf:.0%} ({tier})\n"
            f"      Clinical note: {clinical_text}"
        )

    return "\n".join(lines) if lines else "  No significant findings detected."


# ─────────────────────────────────────────────────────────────────────────────
# 3. SYSTEM PROMPT — enforces fixed structure, clinical tone, consistent style
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a clinical report writing assistant for a dental AI diagnostic system.
Your ONLY job is to convert structured AI detection findings into a formatted clinical dental report.

STRICT RULES:
- You NEVER invent findings. Only use what is explicitly provided in the detection list.
- You NEVER state diagnoses as confirmed facts. Always use hedged clinical language
  (e.g., "findings are consistent with", "radiographic evidence suggests", "clinical correlation advised").
- You ALWAYS follow the exact report structure below. No extra sections, no deviation.
- You write in formal, concise clinical English. No filler sentences.
- Confidence tiers (high/medium/low) are already embedded in the clinical notes — do not repeat or explain them.
- You ALWAYS end with the mandatory AI disclaimer block, verbatim.

REQUIRED REPORT STRUCTURE:
──────────────────────────────────────
PANORAMIC RADIOGRAPH — AI-ASSISTED ANALYSIS REPORT
──────────────────────────────────────
Patient:        [patient_name]
Date of Birth:  [dob]
Examination Date: [exam_date]
Referring Dentist: [dentist_name]
Report Generated: [generation_date]

1. EXAMINATION CONTEXT
[One sentence on image type and AI system used.]

2. REGIONAL FINDINGS
2a. Upper Jaw (Maxilla)
[List findings in the upper jaw region. If none, write "No significant upper jaw findings detected."]

2b. Lower Jaw (Mandible)
[List findings in the lower jaw region. If none, write "No significant lower jaw findings detected."]

2c. General / Bilateral Findings
[List any general or bilateral findings. If none, write "No general findings detected."]

3. SUMMARY
[2–4 sentences synthesizing the most clinically significant findings. Prioritize pathological findings over anatomical landmarks.]

4. RECOMMENDATIONS
[Numbered list of concrete next steps, ordered by clinical urgency. Maximum 5 items.]

──────────────────────────────────────
⚠ AI-GENERATED REPORT — PENDING CLINICIAN VALIDATION
This report was produced by an AI-assisted image analysis system and is NOT a clinical diagnosis.
All findings must be reviewed and validated by a licensed dental professional before any clinical
decision is made. The AI system may produce false positives or false negatives.
Treating this report as a definitive diagnosis without clinician review is contraindicated.
──────────────────────────────────────
"""


def _build_user_message(patient_info: dict, detections: list[dict]) -> str:
    exam_date = patient_info.get("exam_date", date.today().isoformat())
    gen_date = date.today().isoformat()

    return f"""Generate the clinical dental report for the following patient and findings.

PATIENT INFORMATION:
  Name:             {patient_info.get('name', 'Anonymous')}
  Date of Birth:    {patient_info.get('dob', 'N/A')}
  Examination Date: {exam_date}
  Referring Dentist:{patient_info.get('dentist', 'N/A')}
  Report Date:      {gen_date}

AI DETECTION FINDINGS ({len(detections)} finding(s) detected):
{_format_detections_for_prompt(detections)}

Now generate the full structured report following the required format exactly."""


# ─────────────────────────────────────────────────────────────────────────────
# 4. REPORT OUTPUT + DISCLAIMER WRAPPER
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class DentalReport:
    text: str
    patient_name: str
    exam_date: str
    detections: list[dict]
    raw_detections_json: str = field(init=False)

    def __post_init__(self):
        self.raw_detections_json = json.dumps(self.detections, indent=2)

    def save_txt(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.text)
        print(f"Report saved: {path}")

    def __str__(self) -> str:
        return self.text


class DentalReportGenerator:
    """
    Main entry point. Pass in raw detection dicts from your A4/YOLO model output.
    Uses Google Gemini free API — no paid plan required.
    """


    def __init__(self, api_key: Optional[str] = None):
        if not api_key:
            raise ValueError(
                "Gemini API key required. Get one free at "
                "https://aistudio.google.com/app/apikey"
            )
        self.api_key = api_key

    # In dental_report_generator.py, replace _call_gemini with this:

    GEMINI_URL = "https://openrouter.ai/api/v1/chat/completions"
    MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

    def _call_gemini(self, system: str, user: str) -> str:
        payload = json.dumps({
            "model": self.MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user}
            ],
            "max_tokens": 2048,
            "temperature": 0.2,
        }).encode("utf-8")

        req = urllib.request.Request(
            self.GEMINI_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            raise RuntimeError(f"OpenRouter error {e.code}: {body}") from e

    def generate(
        self,
        detections: list[dict],
        patient_info: Optional[dict] = None,
    ) -> DentalReport:
        """
        Args:
            detections: List of detection dicts from your model.
                        Each dict: {"class": str, "confidence": float,
                                    "region": str, "tooth_number": str (opt)}
            patient_info: {"name": str, "dob": str, "exam_date": str, "dentist": str}

        Returns:
            DentalReport object with .text and .save_txt()
        """
        if patient_info is None:
            patient_info = {}

        user_msg = _build_user_message(patient_info, detections)
        report_text = self._call_gemini(SYSTEM_PROMPT, user_msg)

        return DentalReport(
            text=report_text,
            patient_name=patient_info.get("name", "Anonymous"),
            exam_date=patient_info.get("exam_date", date.today().isoformat()),
            detections=detections,
        )


# ─────────────────────────────────────────────────────────────────────────────
# QUICK TEST (run directly: python dental_report_generator.py)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os

    sample_detections = [
        {"class": "tooth_decay",           "confidence": 0.81, "region": "upper_jaw", "tooth_number": "26"},
        {"class": "bone_level_resorption", "confidence": 0.57, "region": "lower_jaw"},
        {"class": "wisdom_tooth",          "confidence": 0.91, "region": "lower_jaw", "tooth_number": "48"},
        {"class": "root_canal_treatment",  "confidence": 0.76, "region": "upper_jaw", "tooth_number": "11"},
        {"class": "mandibular_nerve",      "confidence": 0.88, "region": "lower_jaw"},
        {"class": "maxillary_sinus",       "confidence": 0.93, "region": "upper_jaw"},
        {"class": "dental_filling",        "confidence": 0.44, "region": "lower_jaw", "tooth_number": "36"},
    ]

    sample_patient = {
        "name": "Ahmed Ben Salah",
        "dob": "1985-03-14",
        "exam_date": "2026-04-24",
        "dentist": "Dr. Hanen Balti",
    }

    # Get your free key at https://aistudio.google.com/app/apikey
    gen = DentalReportGenerator(api_key=os.getenv("GEMINI_API_KEY"))
    report = gen.generate(sample_detections, sample_patient)
    print(report)
    report.save_txt("sample_report.txt")