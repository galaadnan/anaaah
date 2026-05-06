import re
import os
import requests  # ضرورية لإرسال الطلبات لـ Hugging Face
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI

# إعداد السيرفر لخدمة ملفات الموقع
app = Flask(__name__, static_folder='.', static_url_path='')

# تحديث: تفعيل CORS بشكل كامل للسماح للجوال بالاتصال بالسيرفر السحابي
CORS(app, resources={r"/*": {"origins": "*"}}) 

# إعداد عميل OpenAI للشات بوت
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# ------------------------------------------------
# ⚙️ Cloud AI System (Hugging Face Inference)
# ------------------------------------------------
# الرابط الخاص بموديلك على Hugging Face
HF_API_URL = "https://api-inference.huggingface.co/models/gala97/anah-emotions-marbert"
# قراءة التوكن من إعدادات Render لضمان الأمان
HF_TOKEN = os.environ.get("HF_TOKEN")

print("⏳ Starting Anah Cloud Engine...")

def query_hf_model(text_list):
    """دالة لإرسال النص لموديل MARBERT على Hugging Face واستقبال النتائج"""
    if not HF_TOKEN:
        print("❌ Error: HF_TOKEN not found in environment variables")
        return None
        
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    try:
        response = requests.post(HF_API_URL, headers=headers, json={"inputs": text_list}, timeout=10)
        return response.json()
    except Exception as e:
        print(f"❌ Connection Error to Hugging Face: {e}")
        return None

# ------------------------------------------------
# 🧠 Chatbot Memory & Prompt
# ------------------------------------------------
last_emotion_memory = {}

SYSTEM_PROMPT = """
أنت أناه، مساعد دعم عاطفي عربي ذكي ومتزن.
التعليمات:
- استخدم لغة عربية فصحى بسيطة وطبيعية.
- ابدأ دائمًا بتفهم شعور المستخدم.
- قدم اقتراح بسيط عند الحاجة.
- تجنب التكرار والردود النمطية.
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
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "No text provided"}), 400

    sentences = split_arabic_sentences(text)
    if not sentences:
        sentences = [text]

    try:
        results = query_hf_model(sentences)
        
        if results is None or "error" in str(results):
            return jsonify({"error": "الموديل السحابي جاري التحميل، يرجى المحاولة بعد لحظات"}), 503
        
        if isinstance(results, list) and len(results) > 0 and isinstance(results[0], list):
            processed_results = results[0]
        else:
            processed_results = results

        mood_counts = {}
        mood_scores = {}
        sentence_details = []

        for i, res in enumerate(processed_results):
            mood = res.get("label", "غير محدد")
            score = float(res.get("score", 0.0))
            
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
            mood_scores[mood] = mood_scores.get(mood, 0.0) + score
            
            sentence_details.append({
                "sentence": sentences[i],
                "mood": mood,
                "score": score
            })

        sorted_moods = sorted(
            mood_counts.keys(), 
            key=lambda k: (mood_counts[k], mood_scores[k]), 
            reverse=True
        )

        primary_mood = sorted_moods[0] if sorted_moods else "غير محدد"
        secondary_mood = sorted_moods[1] if len(sorted_moods) > 1 else None

        return jsonify({
            "finalMood": primary_mood,
            "secondaryMood": secondary_mood,
            "moodCounts": mood_counts,
            "sentencesDetails": sentence_details
        })

    except Exception as e:
        print(f"❌ Error during prediction: {e}")
        return jsonify({"error": "حدث خطأ أثناء تحليل النص سحابياً"}), 500

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or data.get("text") or "").strip()

    if len(user_message) < 3:
        return jsonify({"reply": "اكتب جملة أوضح قليلاً لأتمكن من مساعدتك."})

    try:
        emotion = "غير محدد"
        hf_res = query_hf_model([user_message])
        if hf_res and isinstance(hf_res, list):
            if isinstance(hf_res[0], list):
                emotion = hf_res[0][0].get("label", "غير محدد")
            else:
                emotion = hf_res.get("label", "غير محدد") if isinstance(hf_res, dict) else hf_res[0].get("label", "غير محدد")

        previous_emotion = last_emotion_memory.get("last")
        last_emotion_memory["last"] = emotion

        prompt = f"المستخدم يشعر بـ {emotion}. رسالة المستخدم: {user_message}"
        if previous_emotion and previous_emotion != emotion:
            prompt = f"المستخدم كان يشعر بـ {previous_emotion} والآن يشعر بـ {emotion}. رسالته: {user_message}"

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=80,
            timeout=10,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ]
        )
        
        bot_reply = response.choices[0].message.content.strip()
        return jsonify({"reply": bot_reply})

    except Exception as e:
        print(f"❌ Error in OpenAI chat: {e}")
        return jsonify({"reply": "أنا هنا لأسمعك، خذ نفساً عميقاً وأخبرني بما يدور في بالك."})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # التشغيل على 0.0.0.0 لاستقبال الطلبات الخارجية في Render
    app.run(host="0.0.0.0", port=port, debug=False)
