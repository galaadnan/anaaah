import re
import os
import numpy as np
import gdown
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
# ⚙️ Cloud Storage & AI Engine (Google Drive + ONNX)
# ------------------------------------------------
FILE_ID = "1FBS7ZkBoSABvmeKDpNL92o1VWsSTaYpY"
current_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(current_dir, "model.onnx")

def download_model_from_drive():
    if not os.path.exists(MODEL_PATH):
        print("⏳ Downloading Anah Model from Google Drive...")
        url = f'https://drive.google.com/uc?id={FILE_ID}'
        try:
            gdown.download(url, MODEL_PATH, quiet=False)
            print("✅ Download Complete!")
        except Exception as e:
            print(f"❌ Download Failed: {e}")

download_model_from_drive()

print("⏳ Loading Anah ONNX Engine locally...")

try:
    tokenizer = AutoTokenizer.from_pretrained(current_dir)
    onnx_session = ort.InferenceSession(MODEL_PATH)
    
    # تأكدي إن فيه 4 مسافات قبل كلمة LABELS عشان تكون داخل الـ try
    LABELS = ["هادئ", "سعيد", "حزين", "غاضب", "متوتر", "تعبان"]
    
    print("✅ Local Model Loaded Successfully!")
except Exception as e:
    print(f"❌ Critical Error loading ONNX model: {e}")

def query_local_model(text_list):
    results = []
    try:
        for text in text_list:
            inputs = tokenizer(text, return_tensors="np", padding=True, truncation=True)
            ort_inputs = {k: v for k, v in inputs.items()}
            ort_outs = onnx_session.run(None, ort_inputs)
            scores = ort_outs[0][0]
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

last_emotion_memory = {}

SYSTEM_PROMPT = """
أنت أناه، مساعد دعم عاطفي عربي ذكي ومتزن.
التعليمات:
- استخدم لغة عربية فصحى بسيطة وطبيعية.
- ابدأ دائمًا بتفهم شعور المستخدم.
- قدم اقتراح بسيط عند الحاجة.
- تجنب التكرار والردود النمطية.
"""

def split_arabic_sentences(text: str):
    sentences = re.split(r'[.؟!،\n]+', text)
    return [s.strip() for s in sentences if len(s.strip()) > 3]

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
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
