""""This script demonstrates how to use the DentalReportGenerator class to create a dental report based on detected dental conditions and patient information. It initializes the generator with an API key, generates a report from the provided detections and patient info, prints the report text, and saves it to a text file.
"""
from dental_report_generator import DentalReportGenerator

detections = [
    {"class": "tooth_decay", "confidence": 0.81, "region": "upper_jaw", "tooth_number": "26"},
    {"class": "wisdom_tooth", "confidence": 0.91, "region": "lower_jaw", "tooth_number": "48"},
    {"class": "mandibular_nerve", "confidence": 0.88, "region": "lower_jaw"},
]

patient_info = {
    "name": "Ahmed Ben Salah",
    "dob": "1985-03-14",
    "exam_date": "2026-04-24",
    "dentist": "Dr. Hanen Balti",
}

gen = DentalReportGenerator(api_key="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")
report = gen.generate(detections, patient_info)
print(report.text)
report.save_txt("report_patient_42.txt")