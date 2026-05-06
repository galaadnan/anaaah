import re
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from transformers import pipeline
import os
from openai import OpenAI

# Configure server to serve static files (CSS, JS, Images)
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# ------------------------------------------------
# ⚙️ Dual Model System (Primary + Backup)
# ------------------------------------------------
pipe = None
PRIMARY_MODEL = "raghadddddddd/anahEmotions"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_MODEL_PATH = os.path.join(BASE_DIR, "ai model", "UBC-NLP_MARBERTv2", "checkpoint-1821")

print("⏳ Starting Anah engine...")

try:
    pipe = pipeline("text-classification", model=PRIMARY_MODEL, truncation=True)
    print(f"✅ (Plan A): Fast model loaded successfully from {PRIMARY_MODEL}")
except Exception as e1:
    print(f"⚠️ Failed to connect to the fast model, switching to Plan B... Reason: {e1}")
    try:
        pipe = pipeline("text-classification", model=BACKUP_MODEL_PATH, tokenizer=BACKUP_MODEL_PATH, truncation=True)
        print("✅✅ (Plan B): Heavy backup model loaded successfully!")
    except Exception as e2:
        print(f"❌ Critical Error: Failed to load both models. Check local model path. Reason: {e2}")
# أضيفي هذا السطر تحت سطر الـ pipe = pipeline(...)
print(f"📍 المسار الفعلي للموديل: {pipe.model.config._name_or_path}")
# ------------------------------------------------
# 🧠 Chatbot Memory & Prompt
# ------------------------------------------------
last_emotion_memory = {}

SYSTEM_PROMPT = """
أنت أناه، مساعد دعم عاطفي عربي متزن.
استخدم لغة فصحى محايدة.
اجعل الرد سطرين كحد أقصى.
ابدأ بتفهم موجز، ثم اقترح خطوة عملية بسيطة.
أحياناً اختم بسؤال قصير يعزز الوعي الذاتي.
تجنب المبالغة أو النصائح الطبية.
"""

# ------------------------------------------------
# 🧩 Helper Functions
# ------------------------------------------------
def split_arabic_sentences(text: str):
    sentences = re.split(r'[.؟!،\n]+', text)
    return [s.strip() for s in sentences if len(s.strip()) > 3]

# ------------------------------------------------
# 🌐 Website Routes
# ------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(".", "home.html")

@app.route("/predict", methods=["POST"])
def predict():
    if pipe is None:
        return jsonify({"error": "الموديل غير متاح حالياً، يرجى التحقق من التيرمنال"}), 500

    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "No text provided"}), 400

    sentences = split_arabic_sentences(text)
    if not sentences:
        sentences = [text]

    try:
        results = pipe(sentences)
        
        all_moods = []
        sentence_details = []
        
        # Dictionaries to track frequency and total confidence scores
        mood_counts = {}
        mood_scores = {}

        for i, res in enumerate(results):
            mood = res.get("label", "غير محدد")
            score = float(res.get("score", 0.0))
            
            all_moods.append(mood)
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
            mood_scores[mood] = mood_scores.get(mood, 0.0) + score
            
            sentence_details.append({
                "sentence": sentences[i],
                "mood": mood,
                "score": score
            })

        # Sort moods: First by frequency count, then by total confidence score to break ties
        sorted_moods = sorted(
            mood_counts.keys(), 
            key=lambda k: (mood_counts[k], mood_scores[k]), 
            reverse=True
        )

        primary_mood = sorted_moods[0] if sorted_moods else "غير محدد"
        secondary_mood = sorted_moods[1] if len(sorted_moods) > 1 else None

        # --- Debugging Print Statements ---
        print("\n" + "="*50)
        print(f"📊 Emotion Frequency (Count) : {mood_counts}")
        print(f"🎯 Confidence Scores (Sum)   : {mood_scores}")
        print(f"🥇 Primary Emotion Selected  : {primary_mood}")
        print(f"🥈 Secondary Emotion Selected: {secondary_mood}")
        print("="*50 + "\n")

        return jsonify({
            "finalMood": primary_mood,
            "secondaryMood": secondary_mood,
            "moodCounts": mood_counts,
            "sentencesDetails": sentence_details
        })

    except Exception as e:
        print(f"❌ Error during prediction: {e}")
        return jsonify({"error": "حدث خطأ أثناء تحليل النص"}), 500

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message") or data.get("text") or ""
    user_message = user_message.strip()

    if len(user_message) < 3:
        return jsonify({"reply": "اكتب جملة أوضح قليلاً لأتمكن من مساعدتك."})

    try:
        emotion = "غير محدد"
        if pipe:
            emotion_result = pipe(user_message)[0]
            emotion = emotion_result.get("label", "غير محدد")

        previous_emotion = last_emotion_memory.get("last")
        last_emotion_memory["last"] = emotion

        if previous_emotion and previous_emotion != emotion:
            prompt = f"المستخدم كان يشعر بـ {previous_emotion}.\nالآن يشعر بـ {emotion}.\nرسالة المستخدم: {user_message}"
        else:
            prompt = f"المستخدم يشعر بـ {emotion}.\nرسالة المستخدم: {user_message}"

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=80,
            timeout=5,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ]
        )
        
        bot_reply = response.choices[0].message.content.strip()
        return jsonify({"reply": bot_reply})

    except Exception as e:
        print(f"❌ Error in OpenAI chat: {e}")
        return jsonify({"reply": "خذ لحظة هدوء قصيرة، والتنفس ببطء قد يساعد."})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="127.0.0.1", port=port, debug=False)