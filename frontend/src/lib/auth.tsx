import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User as FirebaseUser
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveUserProfile } from "@/lib/chats";

type User = { email: string; name: string; uid: string };


type AuthCtxType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, mode: "signin" | "signup") => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthCtxType>({
  user: null,
  loading: true,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

function toUser(fb: FirebaseUser): User {
  return {
    email: fb.email ?? "",
    name: fb.displayName ?? fb.email?.split("@")[0] ?? "User",
    uid: fb.uid,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Firebase keeps the session alive automatically
    const unsub = onAuthStateChanged(auth, (fb) => {
      setUser(fb ? toUser(fb) : null);
      setLoading(false);
    });
    return unsub; // cleanup on unmount
  }, []);
  
const login = async (email: string, password: string, mode: "signin" | "signup") => {
  if (mode === "signup") {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserProfile(cred.user.uid, email.split("@")[0], email);
  } else {
    await signInWithEmailAndPassword(auth, email, password);
  }
};

const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await saveUserProfile(
    cred.user.uid,
    cred.user.displayName ?? cred.user.email?.split("@")[0] ?? "User",
    cred.user.email ?? ""
  );
};

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);