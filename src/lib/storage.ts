import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, auth } from "./firebase";

export const uploadWealthImage = async (wealthId: string, file: File): Promise<string> => {
  const user = auth.currentUser;

  // Validations
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formato inválido. Use JPG, PNG ou WEBP.");
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("Arquivo muito grande. O limite é 5MB.");
  }

  if (user) {
    try {
      const storageRef = ref(storage, `users/${user.uid}/wealth/${wealthId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (e) {
      console.warn("Notice: Storage upload failed, falling back to local base64:", e);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const deleteWealthImage = async (imageUrl: string) => {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error("Erro ao deletar imagem:", error);
  }
};
