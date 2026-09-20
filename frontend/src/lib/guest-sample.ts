export const guestFolders = [
  { id: 1, name: "Health", description: "AI-organized health records", document_count: 8 },
  { id: 2, name: "Finance", description: "Payment, insurance, and billing history", document_count: 5 },
  { id: 3, name: "Travel", description: "Risk alerts for upcoming trips", document_count: 3 },
  { id: 4, name: "Emergency", description: "Critical records and instructions", document_count: 2 },
];

export const guestAlerts = [
  {
    id: 1,
    title: "Dehydration Risk",
    risk_level: "Moderate",
    reason: "Weather forecast indicates heat exposure",
    recommended_action: "Increase water intake and avoid midday sun.",
    deadline: "2026-08-05T08:00:00Z",
  },
  {
    id: 2,
    title: "Medication Reminder",
    risk_level: "Low",
    reason: "Missed your daily medication window.",
    recommended_action: "Take prescribed medication and update schedule.",
    deadline: "2026-08-03T18:00:00Z",
  },
];

export const guestReminders = [
  {
    id: 1,
    title: "Schedule annual checkup",
    message: "Book an appointment with your primary care provider.",
    trigger_time: "2026-08-07T10:00:00Z",
  },
  {
    id: 2,
    title: "Upload lab results",
    message: "Add your latest blood test report for better insights.",
    trigger_time: "2026-08-06T15:00:00Z",
  },
];

export const guestActivity = [
  {
    id: 1,
    action: "Guest preview started",
    details: "Explore the LifeSync AI interface without logging in.",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    action: "AI health alert generated",
    details: "Detected a moderate dehydration signal from your profile.",
    created_at: new Date().toISOString(),
  },
];

export const guestInsights = {
  alerts: guestAlerts,
  reminders: guestReminders,
  document_count: 16,
};

export const guestEmergencyProfile = {
  blood_group: "O+",
  medical_conditions: "Asthma, Seasonal allergies",
  emergency_contact_name: "Jordan Smith",
  emergency_contact_phone: "+1 (555) 123-4567",
  trusted_contacts_json: { primary: "Jordan Smith", secondary: "Alex Lee" },
};

export const guestReportSample = {
  id: 1,
  report_type: "manual",
  created_at: new Date().toISOString(),
  cautions:
    "- **General Wellness Alert**: No critical anomalies detected from the sample input.\n- **Preventative Vigilance**: Stay observant of sudden changes in sleep quality or energy levels.",
  remedies:
    "- Maintain a balanced diet rich in leafy greens, lean proteins, and whole grains.\n- Ensure 7-8 hours of quality sleep per night and drink at least 2.5 liters of water daily.",
  raw_content: "Sample guest report data is available only after registration.",
  manual_data: {
    age: 32,
    gender: "female",
    symptoms: "Mild fatigue and occasional headaches",
    medical_history: "Seasonal allergies",
    lifestyle_factors: "Light exercise, moderate caffeine intake",
  },
};
