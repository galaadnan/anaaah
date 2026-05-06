import re
import os
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import onnxruntime as ort
from transformers import AutoTokenizer

# إعداد السيرفر لخدمة ملفات الموقع
app = Flask(__name__, static_folder='.', static_url_path='')

# تفعيل CORS بشكل كامل لضمان عمل الجوال واللابتوب مع Render
CORS(app, resources={r"/*": {"origins": "*"}}) 

# إعداد عميل OpenAI للشات بوت
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# ------------------------------------------------
# ⚙️ Local AI System (ONNX Engine) - "أناه المستقل"
# ------------------------------------------------
print("⏳ Loading Anah ONNX Engine locally...")

try:
    # تحميل التوكنايزر والموديل من الملفات المحلية التي قمتِ برفعها
    tokenizer = AutoTokenizer.from_pretrained(".")
    # إنشاء جلسة عمل للموديل المحسن ONNX
    # ملاحظة: تأكدي من تسمية الملف model.onnx في مشروعك
    onnx_session = ort.InferenceSession("model.onnx")
    
    # قائمة المشاعر بترتيب الموديل الخاص بكِ
    LABELS = ["هادئ", "سعيد", "حزين", "غاضب", "متوتر", "تعبان"]
    print("✅ Local Model Loaded Successfully!")
except Exception as e:
    print(f"❌ Error loading local ONNX model: {e}")

def query_local_model(text_list):
    """دالة لتحليل النصوص محلياً باستخدام ONNX دون الحاجة لـ Hugging Face"""
    results = []
    try:
        for text in text_list:
            # معالجة النص وتحويله لتنسيق يفهمه الموديل
            inputs = tokenizer(text, return_tensors="np", padding=True, truncation=True)
            ort_inputs = {k: v for k, v in inputs.items()}
            
            # تشغيل الموديل والحصول على النتائج
            ort_outs = onnx_session.run(None, ort_inputs)
            scores = ort_outs[0][0]
            
            # تطبيق Softmax بسيط لتحويل النتائج لنسب مئوية (Scores)
            exp_scores = np.exp(scores - np.max(scores))
            probs = exp_scores / exp_scores.sum()
            
            best_class_idx = np.argmax(probs)
            results.append({
                "label": LABELS[best_class_idx],
                "score": float(probs[best_class_idx])
            })
        return results
    except Exception as e:
        print(f"❌ Analysis Error: {e}")
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
        results = query_local_model(sentences)
        
        if results is None:
            return jsonify({"error": "فشل المحرك المحلي في تحليل النص"}), 500
        
        mood_counts = {}
        mood_scores = {}
        sentence_details = []

        for i, res in enumerate(results):
            if i >= len(sentences): break
            mood = res.get("label", "غير محدد")
            score = res.get("score", 0.0)
            
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
        return jsonify({"error": f"حدث خطأ أثناء تحليل النص: {str(e)}"}), 500

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or data.get("text") or "").strip()

    if len(user_message) < 3:
        return jsonify({"reply": "اكتب جملة أوضح قليلاً لأتمكن من مساعدتك."})

    try:
        # استخدام المحرك المحلي لتحليل عاطفة الرسالة
        hf_res = query_local_model([user_message])
        emotion = hf_res[0].get("label", "غير محدد") if hf_res else "غير محدد"

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
    # هذا السطر سيعمل فقط إذا شغلتِ الملف بـ python app.py
    # أما في Render (عبر Gunicorn) فسيتم تجاهله
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
