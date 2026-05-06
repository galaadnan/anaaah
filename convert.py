from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer
import os
import torch

# المسارات
model_path = "./ai model/UBC-NLP_MARBERTv2"
output_path = "./ai model/UBC-NLP_MARBERTv2/onnx"

print("⏳ جاري التحويل بنمط استهلاك ذاكرة منخفض...")

try:
    # أضفنا low_cpu_mem_usage=True لتجنب خطأ bad allocation
    model = ORTModelForSequenceClassification.from_pretrained(
        model_path, 
        export=True,
        low_cpu_mem_usage=True
    )
    tokenizer = AutoTokenizer.from_pretrained(model_path)

    model.save_pretrained(output_path)
    tokenizer.save_pretrained(output_path)

    old_file = os.path.join(output_path, "model.onnx")
    new_file = os.path.join(output_path, "model_quantized.onnx")
    
    if os.path.exists(old_file):
        if os.path.exists(new_file): os.remove(new_file)
        os.rename(old_file, new_file)
        print("🔄 تم تحديث ملف الموديل بنجاح.")

    print(f"✅ مبروك! تم التحويل بنجاح في: {output_path}")

except Exception as e:
    print(f"❌ حدث خطأ: {e}")