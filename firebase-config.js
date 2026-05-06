// مكتبات فايربيس (نسخة متوافقة وسهلة للمشاريع العادية)
const firebaseConfig = {
  apiKey: "AIzaSyAX-enlW2pyL3dblUHU2ahDXP3LeI6L-EU",
  authDomain: "anah-c8527.firebaseapp.com",
  projectId: "anah-c8527",
  storageBucket: "anah-c8527.firebasestorage.app",
  messagingSenderId: "940042224704",
  appId: "1:940042224704:web:e3aef0083729509bbf8ba5",
  measurementId: "G-3LZKR418BM"
};

// تهيئة فايربيس
firebase.initializeApp(firebaseConfig);

// استدعاء خدمات تسجيل الدخول وقاعدة البيانات عشان نستخدمها في باقي الملفات
const auth = firebase.auth();
const db = firebase.firestore();