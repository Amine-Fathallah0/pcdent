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