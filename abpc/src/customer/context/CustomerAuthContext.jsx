import { useState, useEffect, useCallback, useMemo } from "react";
import { signInAnonymously, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseAuth } from "../../firebase/auth";
import { firestoreDb } from "../../firebase/firestore";
import { getRecord } from "../../utils/firestoreHelpers";
import { CustomerAuthContext } from "./customerAuthState";

const CUSTOMER_SESSION_KEY = "abpc_CUSTOMER_session";

function getSavedSession() {
  try {
    const saved = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore malformed storage
  }
  return null;
}

export function CustomerAuthProvider({ children }) {
  const [session, setSession] = useState(getSavedSession);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync session with local storage
  const saveSession = useCallback((newSession) => {
    setSession(newSession);
    if (newSession) {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(newSession));
    } else {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
      setActiveCustomer(null);
    }
  }, []);

  // Fetch customer details whenever active ID changes
  useEffect(() => {
    if (!session?.activeCustomerId) {
      setActiveCustomer(null);
      return;
    }
    let active = true;
    getRecord("customers", session.activeCustomerId).then((docData) => {
      if (active) setActiveCustomer(docData);
    });
    return () => { active = false; };
  }, [session?.activeCustomerId]);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        saveSession(null);
        setLoading(false);
        return;
      }

      // If signed in anonymously and we have a saved session, ensure session doc exists in Firestore
      if (user.isAnonymous && session?.phone) {
        try {
          const sessionRef = doc(firestoreDb, "customerSessions", user.uid);
          const sessionSnap = await getDoc(sessionRef);
          if (!sessionSnap.exists()) {
            await setDoc(sessionRef, {
              customerId: session.activeCustomerId,
              phone: session.phone,
              createdAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn("Failed to restore customer session doc:", err.message);
        }
      }
      setLoading(false);
    });

    return unsub;
  }, [session, saveSession]);

  const loginCustomer = useCallback(async (customerId, phoneNumber) => {
    setLoading(true);
    try {
      const cleanCustomerId = customerId.trim();
      const cleanPhone = phoneNumber.trim().replace(/\D/g, "");
      if (!cleanCustomerId) {
        throw new Error("Please enter the Customer ID shown on your invoice or quotation.");
      }
      if (cleanPhone.length < 10) {
        throw new Error("Please enter a valid 10-digit phone number.");
      }

      const phoneCandidates = [...new Set([cleanPhone, cleanPhone.slice(-10)])];
      let verifiedPhone = "";
      let customerIds = [];

      const customerDoc = await getRecord("customers", cleanCustomerId);
      const customerPhone = customerDoc?.phone?.replace(/\D/g, "") || "";
      const customerPhoneMatches = customerPhone && phoneCandidates.includes(customerPhone);

      if (customerPhoneMatches) {
        verifiedPhone = cleanPhone;
        customerIds = [cleanCustomerId];
      } else {
        for (const candidate of phoneCandidates) {
          const mappingSnap = await getDoc(doc(firestoreDb, "phoneMappings", candidate));
          const mappedIds = mappingSnap.exists() ? mappingSnap.data().customerIds || [] : [];
          if (mappedIds.includes(cleanCustomerId)) {
            verifiedPhone = candidate;
            customerIds = mappedIds;
            break;
          }
        }
      }

      if (!verifiedPhone) {
        throw new Error("Customer ID and phone number do not match our records.");
      }

      if (firebaseAuth.currentUser) {
        await signOut(firebaseAuth);
      }

      const credential = await signInAnonymously(firebaseAuth);
      const uid = credential.user.uid;

      const sessionRef = doc(firestoreDb, "customerSessions", uid);
      await setDoc(sessionRef, {
        customerId: cleanCustomerId,
        phone: verifiedPhone,
        createdAt: new Date().toISOString()
      });

      saveSession({
        uid,
        phone: verifiedPhone,
        customerIds,
        activeCustomerId: cleanCustomerId
      });

      return true;
    } catch (err) {
      console.error("Login failure:", err);
      if (firebaseAuth.currentUser?.isAnonymous) {
        await signOut(firebaseAuth).catch(() => {});
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [saveSession]);

  const selectCustomer = useCallback(async (customerId) => {
    if (!session) return;
    setLoading(true);
    try {
      const user = firebaseAuth.currentUser;
      if (user) {
        const sessionRef = doc(firestoreDb, "customerSessions", user.uid);
        await setDoc(sessionRef, {
          customerId,
          phone: session.phone,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      saveSession({
        ...session,
        activeCustomerId: customerId
      });
    } catch (err) {
      console.error("Failed to switch property:", err);
    } finally {
      setLoading(false);
    }
  }, [session, saveSession]);

  const logoutCustomer = useCallback(async () => {
    setLoading(true);
    saveSession(null);
    try {
      await signOut(firebaseAuth);
    } catch (err) {
      console.warn("SignOut error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [saveSession]);

  const value = useMemo(() => ({
    isAuthenticated: !!session?.activeCustomerId,
    phone: session?.phone || "",
    customerIds: session?.customerIds || [],
    activeCustomerId: session?.activeCustomerId || "",
    activeCustomer,
    loading,
    loginCustomer,
    selectCustomer,
    logoutCustomer
  }), [session, activeCustomer, loading, loginCustomer, selectCustomer, logoutCustomer]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}
