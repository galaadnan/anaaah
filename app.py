import re
import os
import json
import numpy as np
import gdown
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import onnxruntime as ort
from transformers import AutoTokenizer

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}}) 

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# ------------------------------------------------
# ⚙️ Cloud Storage & AI Engine
# ------------------------------------------------
FILE_ID = "1FBS7ZkBoSABvmeKDpNL92o1VWsSTaYpY"
current_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(current_dir, "model.onnx")
CONFIG_PATH = os.path.join(current_dir, "config.json")

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

# 💡 استخراج الترتيب الصحيح مباشرة من ملف الإعدادات
try:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config_data = json.load(f)
        id2label = config_data.get("id2label", {})
        # ترتيب القائمة بناءً على المفاتيح (0, 1, 2...)
        LABELS = [id2label[str(i)] for i in range(len(id2label))]
    print(f"✅ Dynamic Labels Loaded: {LABELS}")
except Exception as e:
    LABELS = ["هادئ", "سعيد", "حزين", "غاضب", "متوتر", "تعبان"]
    print(f"⚠️ Warning: Could not read config.json, using fallback. Error: {e}")

try:
    tokenizer = AutoTokenizer.from_pretrained(current_dir)
    onnx_session = ort.InferenceSession(MODEL_PATH)
    print("✅ Local Model & Tokenizer Loaded Successfully!")
except Exception as e:
    print(f"❌ Critical Error: {e}")

def query_local_model(text_list):
    results = []
    try:
        for text in text_list:
            # 💡 تحسين: إضافة padding و truncation لضمان استقرار الموديل
            inputs = tokenizer(text, return_tensors="np", padding='max_length', max_length=128, truncation=True)
            
            # 💡 تحويل النوع لـ int64 لضمان التوافق مع ONNX
            ort_inputs = {k: v.astype(np.int64) for k, v in inputs.items()}
            
            ort_outs = onnx_session.run(None, ort_inputs)
            scores = ort_outs[0][0]
            
            # تطبيق Softmax
            exp_scores = np.exp(scores - np.max(scores))
            probs = exp_scores / exp_scores.sum()
            
            # طباعة الاحتمالات للتشخيص في Render Logs
            print(f"🔍 Text: '{text}' | Probs: {list(zip(LABELS, probs.round(3)))}")
            
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
# 🌐 Website Routes
# ------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(".", "home.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text: return jsonify({"error": "No text"}), 400

    # تقسيم الجمل لضمان تحليل أدق
    sentences = [s.strip() for s in re.split(r'[.؟!،\n]+', text) if len(s.strip()) > 3] or [text]
    
    try:
        results = query_local_model(sentences)
        if not results: return jsonify({"error": "Analysis failed"}), 500
        
        mood_counts = {}
        mood_scores = {}
        for r in results:
            m = r['label']
            mood_counts[m] = mood_counts.get(m, 0) + 1
            mood_scores[m] = mood_scores.get(m, 0.0) + r['score']
            
        sorted_moods = sorted(mood_counts.keys(), key=lambda k: (mood_counts[k], mood_scores[k]), reverse=True)
        
        return jsonify({
            "finalMood": sorted_moods[0],
            "moodCounts": mood_counts,
            "sentencesDetails": [{"sentence": sentences[i], "mood": results[i]['label'], "score": results[i]['score']} for i in range(len(results))]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    if not user_message: return jsonify({"reply": "تكلم معي، أنا أسمعك."})
    
    hf_res = query_local_model([user_message])
    emotion = hf_res[0].get("label", "غير محدد") if hf_res else "غير محدد"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "أنت أناه، مساعد دعم عاطفي عربي ذكي."},
            {"role": "user", "content": f"المستخدم يشعر بـ {emotion}. رسالة المستخدم: {user_message}"}
        ]
    )
    return jsonify({"reply": response.choices[0].message.content})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
