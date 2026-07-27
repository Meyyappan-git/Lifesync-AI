import os
import logging
from PIL import Image
import pytesseract

logger = logging.getLogger(__name__)

# Attempt to configure tesseract path on Windows common locations if not in PATH
if os.name == 'nt':
    common_tesseract_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\meyya\AppData\Local\Tesseract-OCR\tesseract.exe"
    ]
    for path in common_tesseract_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break

class AIService:
    @staticmethod
    def extract_text_from_image(image_path: str) -> str:
        """
        Runs OCR on the given image file.
        Falls back to a warning message if OCR library is missing or fails.
        """
        try:
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img)
            return text.strip()
        except Exception as e:
            logger.warning(f"OCR Extraction failed: {e}. Falling back to default raw text.")
            return "Unable to perform OCR analysis on the medical document because Tesseract OCR is not installed or configured on the host system."

    @staticmethod
    def analyze_health_data(report_type: str, raw_text: str = None, manual_data: dict = None) -> tuple[str, str]:
        """
        Analyzes health inputs and returns a tuple: (cautions, remedies).
        Uses OpenAI + LangChain if API key is present, otherwise falls back to a rule-based mock analyzer.
        """
        api_key = os.getenv("OPENAI_API_KEY")
        
        # Prepare content string for analysis
        if report_type == "file":
            input_content = f"Medical Report OCR Content:\n{raw_text}"
        else:
            input_content = (
                f"Manual Health Profile:\n"
                f"- Age: {manual_data.get('age')}\n"
                f"- Gender: {manual_data.get('gender')}\n"
                f"- Symptoms: {manual_data.get('symptoms')}\n"
                f"- Medical History: {manual_data.get('medical_history') or 'None'}\n"
                f"- Lifestyle: {manual_data.get('lifestyle_factors') or 'None'}"
            )

        if api_key:
            try:
                from langchain_openai import ChatOpenAI
                from langchain_core.prompts import ChatPromptTemplate
                from langchain_core.output_parsers import StrOutputParser

                llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=api_key)
                
                # We want clean, parsed outputs
                cautions_prompt = ChatPromptTemplate.from_messages([
                    ("system", "You are an AI Health Advisor. Based on the patient health details, list the future health CAUTIONS, potential risks, and areas of concern. Use clear bullet points and mark critical items with bold text. Do not provide remedies here."),
                    ("user", "{content}")
                ])
                
                remedies_prompt = ChatPromptTemplate.from_messages([
                    ("system", "You are an AI Health Advisor. Based on the patient health details, list the actionable REMEDIES, lifestyle adjustments, preventative measures, and when they should consult a doctor. Use clear bullet points. Do not list cautions/risks."),
                    ("user", "{content}")
                ])

                cautions_chain = cautions_prompt | llm | StrOutputParser()
                remedies_chain = remedies_prompt | llm | StrOutputParser()

                cautions = cautions_chain.invoke({"content": input_content})
                remedies = remedies_chain.invoke({"content": input_content})

                return cautions.strip(), remedies.strip()

            except Exception as e:
                logger.error(f"OpenAI analysis failed: {e}. Falling back to local rule engine.")

        # Local Rule-based fallback
        return AIService._rule_based_analysis(report_type, raw_text, manual_data)

    @staticmethod
    def _rule_based_analysis(report_type: str, raw_text: str = None, manual_data: dict = None) -> tuple[str, str]:
        """
        Rule-based heuristic health analyzer when OpenAI is not available.
        """
        # Extract keywords
        symptoms = ""
        history = ""
        lifestyle = ""
        age = 30
        
        if report_type == "file" and raw_text:
            symptoms = raw_text.lower()
        elif manual_data:
            symptoms = str(manual_data.get("symptoms", "")).lower()
            history = str(manual_data.get("medical_history", "")).lower()
            lifestyle = str(manual_data.get("lifestyle_factors", "")).lower()
            try:
                age = int(manual_data.get("age", 30))
            except:
                pass

        cautions_list = []
        remedies_list = []

        # Heuristics based on indicators
        if "cholesterol" in symptoms or "lipid" in symptoms or "hdl" in symptoms or "ldl" in symptoms:
            cautions_list.append("**Cardiovascular Risk**: Elevated cholesterol levels suggest potential plaque build-up risk in arteries.")
            remedies_list.append("Reduce saturated fats and eliminate trans-fats from your diet. Increase soluble fiber intake.")
            remedies_list.append("Engage in at least 30 minutes of aerobic exercise 5 days a week.")

        if "cough" in symptoms or "fever" in symptoms or "cold" in symptoms:
            cautions_list.append("**Respiratory Infection Concern**: Symptoms suggest active viral or bacterial respiratory response.")
            cautions_list.append("**Dehydration Risk**: Increased body temperature and immune response can drain body fluids.")
            remedies_list.append("Stay hydrated by drinking warm water, herbal teas, or broths.")
            remedies_list.append("Get plenty of bed rest to allow your immune system to recover.")
            remedies_list.append("If fever exceeds 102°F (38.9°C) or cough persists over 10 days, consult a physician.")

        if "chest pain" in symptoms or "angina" in symptoms:
            cautions_list.append("**CRITICAL: Acute Cardiac Caution**: Chest pain requires immediate professional medical evaluation to rule out cardiovascular events.")
            remedies_list.append("Do not engage in physical stress. Seek urgent emergency services or visit the nearest clinic immediately.")

        if "sugar" in symptoms or "diabetes" in symptoms or "glucose" in symptoms or "hba1c" in symptoms:
            cautions_list.append("**Glycemic Control Issue**: Potential risk of diabetic complications or insulin resistance.")
            remedies_list.append("Monitor blood glucose levels daily. Limit refined sugar and processed carbohydrates.")
            remedies_list.append("Consult an endocrinologist for personalized diabetic therapy.")

        if "smok" in lifestyle or "tobacco" in lifestyle:
            cautions_list.append("**Pulmonary & Vascular Health Risk**: Tobacco usage significantly increases risks of chronic bronchitis, lung disease, and cardiovascular events.")
            remedies_list.append("Consider joining a smoking cessation support program. Nicotine replacement therapy may assist in transition.")

        if age > 50:
            cautions_list.append("**Age-Related Bone & Vascular Health**: Regular screenings for bone density and blood pressure are recommended for users over 50.")
            remedies_list.append("Ensure adequate daily calcium (1200mg) and Vitamin D supplementation.")

        # Default cautions/remedies if nothing matches
        if not cautions_list:
            cautions_list.append("**General Wellness Alert**: No critical anomalies detected from the provided inputs. Maintain regular checks.")
            cautions_list.append("**Preventative Vigilance**: Stay observant of sudden changes in sleep quality, energy levels, or weight.")
            
        if not remedies_list:
            remedies_list.append("Maintain a balanced diet rich in leafy greens, lean proteins, and whole grains.")
            remedies_list.append("Ensure 7-8 hours of quality sleep per night and drink at least 2.5 liters of water daily.")
            remedies_list.append("Schedule a routine physical check-up annually.")

        # Format as markdown lists
        cautions_md = "\n".join([f"- {c}" for c in cautions_list])
        remedies_md = "\n".join([f"- {r}" for r in remedies_list])

        # Prepend a mock banner if OpenAI was bypassed
        if not os.getenv("OPENAI_API_KEY"):
            cautions_md = "> [!NOTE]\n> *Using Rule-Based Health Analyzer (configure `OPENAI_API_KEY` for AI predictions)*\n\n" + cautions_md

        return cautions_md, remedies_md
