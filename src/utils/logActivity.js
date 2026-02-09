import { db, auth } from '../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';

export const logActivity = async (action) => {
  const user = auth.currentUser;
  if (!user) return;

  let adminName = user.email;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      adminName = userDocSnap.data().kementerian || userDocSnap.data().namaTampilan || user.email;
    }
  } catch (error) {
    console.error("Gagal mengambil profil admin untuk log:", error);
  }

  try {
    const historiCollectionRef = collection(db, 'histori');
    await addDoc(historiCollectionRef, {
      action: action,
      oleh: adminName,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Gagal mencatat aktivitas:", error);
  }
};
